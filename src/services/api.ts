import { supabase } from '@/lib/supabase';
import type { AppEvent, AutomationRun, CareerItem, DocumentRow, Person, Project, SchoolPayment, Settings, Task } from '@/types';

/** Convierte errores técnicos en mensajes comprensibles. */
export function friendly(error: unknown): string {
  const msg = (error as { message?: string })?.message ?? '';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.';
  if (/JWT|not authenticated|401/i.test(msg)) return 'Tu sesión venció. Volvé a ingresar.';
  return 'No pude completar la acción. Intentá de nuevo en un momento.';
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not authenticated');
  return data.user.id;
}

type TableName = 'tasks' | 'events' | 'people' | 'projects' | 'career_items' | 'documents' | 'school_payments' | 'reminders' | 'automations' | 'automation_runs' | 'mia_items';

/** Acceso a datos genérico. Cada fila queda ligada al usuario; la base además lo exige con RLS. */
function repo<T extends { id: string }>(table: TableName, order: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false }) {
  return {
    async list(): Promise<T[]> {
      const { data, error } = await supabase.from(table).select('*').order(order.column, { ascending: order.ascending ?? false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
    async create(values: Partial<T>): Promise<T> {
      const user_id = await uid();
      const { data, error } = await supabase.from(table).insert({ ...values, user_id } as never).select().single();
      if (error) throw error;
      return data as T;
    },
    async update(id: string, values: Partial<T>): Promise<T> {
      const { data, error } = await supabase.from(table).update(values as never).eq('id', id).select().single();
      if (error) throw error;
      return data as T;
    },
    async remove(id: string): Promise<void> {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  };
}

export const tasksRepo = repo<Task>('tasks', { column: 'due_date', ascending: true });
export const eventsRepo = repo<AppEvent>('events', { column: 'starts_at', ascending: true });
export const peopleRepo = repo<Person>('people');
export const projectsRepo = repo<Project>('projects');
export const careerRepo = repo<CareerItem>('career_items');
export const documentsRepo = repo<DocumentRow>('documents');
export const paymentsRepo = repo<SchoolPayment>('school_payments', { column: 'created_at', ascending: false });
export const runsRepo = repo<AutomationRun & { automation_id: string }>('automation_runs');

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').single();
  if (error) throw error;
  return data as Settings;
}
export async function saveSettings(values: Partial<Settings>): Promise<void> {
  const { error } = await supabase.from('settings').update(values).eq('user_id', await uid());
  if (error) throw error;
}

export async function getTemplate(key: string): Promise<string | null> {
  const { data } = await supabase.from('message_templates').select('body').eq('key', key).maybeSingle();
  return (data?.body as string | undefined) ?? null;
}
export async function saveTemplate(key: string, body: string): Promise<void> {
  const { error } = await supabase.from('message_templates').upsert({ user_id: await uid(), key, body }, { onConflict: 'user_id,key' });
  if (error) throw error;
}

/** Guarda una automatización por defecto si no existe, y devuelve su id. */
export async function ensureAutomation(def: { key: string; name: string; description: string; trigger: string; actions: string[] }): Promise<string> {
  const user_id = await uid();
  const { data: found } = await supabase.from('automations').select('id').eq('key', def.key).maybeSingle();
  if (found) return found.id as string;
  const { data, error } = await supabase.from('automations').insert({ ...def, user_id }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

// ---- Documentos (Storage privado, carpeta por usuario) -------------------------------
export async function uploadDocument(file: File, meta: { module: DocumentRow['module']; category?: string; related_type?: string; related_id?: string; metadata?: Record<string, unknown> }): Promise<DocumentRow> {
  const user_id = await uid();
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${user_id}/${Date.now()}_${safe}`;
  const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type || undefined });
  if (upErr) throw upErr;
  try {
    return await documentsRepo.create({
      name: file.name, storage_path: path, mime_type: file.type || null, size_bytes: file.size,
      module: meta.module, category: meta.category ?? null,
      related_type: meta.related_type ?? null, related_id: meta.related_id ?? null, metadata: meta.metadata ?? {}
    });
  } catch (e) {
    await supabase.storage.from('documents').remove([path]); // no dejar archivos huérfanos
    throw e;
  }
}
export async function documentUrl(storage_path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(storage_path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function deleteDocument(doc: DocumentRow): Promise<void> {
  await supabase.storage.from('documents').remove([doc.storage_path]);
  await documentsRepo.remove(doc.id);
}

// ---- Búsqueda global ------------------------------------------------------------
export interface SearchHit { type: 'Tarea' | 'Evento' | 'Documento' | 'Persona' | 'Cuota' | 'Proyecto' | 'Postulación'; id: string; title: string; subtitle?: string; to: string }

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export async function globalSearch(q: string): Promise<SearchHit[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const [tasks, events, docs, people, pays, projects, career] = await Promise.all([
    tasksRepo.list(), eventsRepo.list(), documentsRepo.list(), peopleRepo.list(), paymentsRepo.list(), projectsRepo.list(), careerRepo.list()
  ]);
  const has = (...v: (string | null | undefined)[]) => v.some((x) => x?.toLowerCase().includes(term));
  const hits: SearchHit[] = [];
  tasks.filter((t) => has(t.title, t.description, t.notes, t.tags.join(' '))).forEach((t) => hits.push({ type: 'Tarea', id: t.id, title: t.title, subtitle: t.due_date ?? undefined, to: '/pendientes' }));
  events.filter((e) => has(e.title, e.description, e.location)).forEach((e) => hits.push({ type: 'Evento', id: e.id, title: e.title, subtitle: e.starts_at.slice(0, 10), to: '/agenda' }));
  docs.filter((d) => has(d.name, d.category)).forEach((d) => hits.push({ type: 'Documento', id: d.id, title: d.name, to: '/documentos' }));
  people.filter((p) => has(p.name, p.relation, p.notes)).forEach((p) => hits.push({ type: 'Persona', id: p.id, title: p.name, subtitle: p.relation ?? undefined, to: '/mia' }));
  pays.filter((p) => has(p.institution, p.message, p.payer_name, p.period_month ? MONTHS[p.period_month - 1] : null, String(p.period_year ?? ''))).forEach((p) =>
    hits.push({ type: 'Cuota', id: p.id, title: `Cuota ${p.period_month ? MONTHS[p.period_month - 1] : ''} ${p.period_year ?? ''}`.trim(), subtitle: p.status, to: '/mia' }));
  projects.filter((p) => has(p.name, p.description, p.notes, p.next_steps)).forEach((p) => hits.push({ type: 'Proyecto', id: p.id, title: p.name, subtitle: p.status, to: '/proyectos' }));
  career.filter((c) => has(c.company, c.position, c.notes, c.contact)).forEach((c) => hits.push({ type: 'Postulación', id: c.id, title: `${c.position ?? ''} · ${c.company ?? ''}`, subtitle: c.status, to: '/carrera' }));
  return hits;
}
