export type ItemKind = 'tarea' | 'evento' | 'nota';
export type Module = 'general' | 'mia' | 'carrera' | 'proyectos' | 'documentos';
export type Priority = 'baja' | 'media' | 'alta';

export interface InterpretedItem {
  kind: ItemKind;
  title: string;
  module: Module;
  date: string | null;        // YYYY-MM-DD
  time: string | null;        // HH:MM
  priority: Priority;
  person: string | null;
  description: string | null;
  reminderDate: string | null; // YYYY-MM-DD
  recurrence: string | null;
}

export interface Clarification { itemIndex: number; question: string; options: string[] }

export interface InterpretResult {
  items: InterpretedItem[];
  clarifications: Clarification[];
  /** Mensajes para mostrar si algo del resultado de la IA no era válido. */
  problems: string[];
}

const KINDS: ItemKind[] = ['tarea', 'evento', 'nota'];
const MODULES: Module[] = ['general', 'mia', 'carrera', 'proyectos', 'documentos'];
const PRIORITIES: Priority[] = ['baja', 'media', 'alta'];
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * Valida lo que devolvió la IA ANTES de guardar nada. Lo inválido se descarta o se corrige
 * a un valor seguro, y se informa; no se inventan datos.
 */
export function validateInterpretation(raw: unknown): InterpretResult {
  const out: InterpretResult = { items: [], clarifications: [], problems: [] };
  const obj = (raw ?? {}) as { items?: unknown; clarifications?: unknown };
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  rawItems.forEach((r: any, idx: number) => {
    const title = str(r?.title);
    if (!title) { out.problems.push(`El ítem ${idx + 1} no tiene un título claro.`); return; }
    let date = r?.date ?? null;
    let time = r?.time ?? null;
    let reminderDate = r?.reminder_date ?? null;
    if (date !== null && !isDate(date)) { out.problems.push(`La fecha de «${title}» no es válida.`); date = null; }
    if (time !== null && !isTime(time)) { out.problems.push(`La hora de «${title}» no es válida.`); time = null; }
    if (reminderDate !== null && !isDate(reminderDate)) reminderDate = null;
    out.items.push({
      kind: KINDS.includes(r?.kind) ? r.kind : 'tarea',
      title,
      module: MODULES.includes(r?.module) ? r.module : 'general',
      date, time,
      priority: PRIORITIES.includes(r?.priority) ? r.priority : 'media',
      person: str(r?.person),
      description: str(r?.description),
      reminderDate,
      recurrence: str(r?.recurrence)
    });
  });

  const rawQs = Array.isArray(obj.clarifications) ? obj.clarifications : [];
  for (const q of rawQs as any[]) {
    const question = str(q?.question);
    if (!question) continue;
    out.clarifications.push({
      itemIndex: Number.isInteger(q?.item_index) ? q.item_index : 0,
      question,
      options: Array.isArray(q?.options) ? q.options.filter((o: unknown) => typeof o === 'string') : []
    });
  }
  return out;
}

/** Un evento sin fecha no se puede guardar en la agenda: hay que preguntar. */
export function missingForSave(item: InterpretedItem): string | null {
  if (item.kind === 'evento' && !item.date) return 'Falta la fecha del evento.';
  return null;
}
