import { supabase } from '@/lib/supabase';
import { ai } from '@/services/ai';
import { validateProfileExtraction, type ProfileDraft, type ProfileSection } from '@/domain/profile';

export type ProfileSource = 'cv' | 'manual' | 'voz';
export interface ProfileItem { id: string; section: ProfileSection; title: string; detail: string | null; source: ProfileSource; created_at: string }

/** Error con un mensaje listo para mostrar. */
export class ProfileError extends Error {}

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 20000;

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not authenticated');
  return data.user.id;
}

export async function listProfile(): Promise<ProfileItem[]> {
  const { data, error } = await supabase.from('profile_items').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProfileItem[];
}

export async function addItems(drafts: ProfileDraft[], source: ProfileSource): Promise<void> {
  if (drafts.length === 0) return;
  const user_id = await uid();
  const { error } = await supabase.from('profile_items').insert(drafts.map((d) => ({ ...d, source, user_id })));
  if (error) throw error;
}

export async function removeItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('profile_items').delete().in('id', ids);
  if (error) throw error;
}

export async function removeBySource(source: ProfileSource): Promise<void> {
  const { error } = await supabase.from('profile_items').delete().eq('source', source);
  if (error) throw error;
}

export async function removeAllProfile(): Promise<void> {
  const { error } = await supabase.from('profile_items').delete().not('id', 'is', null);
  if (error) throw error;
}

// ---- Qué secciones puede usar Vivia -----------------------------------------------------
export async function getOffSections(): Promise<string[]> {
  const { data, error } = await supabase.from('settings').select('profile_sections_off').single();
  if (error) throw error;
  return ((data as { profile_sections_off?: string[] | null } | null)?.profile_sections_off ?? []) as string[];
}

export async function setSectionEnabled(section: ProfileSection, enabled: boolean): Promise<void> {
  const current = await getOffSections();
  const next = enabled ? current.filter((s) => s !== section) : Array.from(new Set([...current, section]));
  const { error } = await supabase.from('settings').update({ profile_sections_off: next }).eq('user_id', await uid());
  if (error) throw error;
}

// ---- Lectura de CV y de texto -------------------------------------------------------------
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new ProfileError('No pude leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/** Lee un documento (PDF, Word o texto) y devuelve su contenido listo para la IA. El archivo NO se guarda. */
export async function readDocument(file: File): Promise<{ text?: string; pdfBase64?: string }> {
  if (file.size > MAX_BYTES) throw new ProfileError('El archivo es demasiado grande (máximo 10 MB).');
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return { pdfBase64: await toBase64(file) };
  if (name.endsWith('.docx')) {
    const mod: any = await import('mammoth/mammoth.browser');
    const mammoth = mod.default ?? mod;
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!String(value).trim()) throw new ProfileError('No encontré texto en ese documento de Word.');
    return { text: String(value).slice(0, MAX_TEXT * 2) };
  }
  if (file.type.startsWith('text/') || name.endsWith('.txt')) return { text: (await file.text()).slice(0, MAX_TEXT * 2) };
  throw new ProfileError('Usá un archivo PDF, Word (.docx) o de texto.');
}

/** Lee un CV (PDF, Word o texto) y devuelve los elementos del perfil. */
export async function extractFromFile(file: File): Promise<ProfileDraft[]> {
  return validateProfileExtraction(await ai.extractProfile(await readDocument(file)));
}

/**
 * Importa un CV. Si ya había datos de un CV anterior, se reemplazan SOLO cuando el nuevo se leyó bien;
 * lo que la usuaria agregó escribiendo o hablando nunca se toca.
 */
export async function importFromFile(file: File, previousCvIds: string[]): Promise<number> {
  const drafts = await extractFromFile(file);
  if (drafts.length === 0) return 0;
  await addItems(drafts, 'cv');
  await removeItems(previousCvIds);
  return drafts.length;
}

export async function importFromText(text: string, source: 'manual' | 'voz'): Promise<number> {
  const clean = text.trim().slice(0, MAX_TEXT);
  if (clean.length < 10) throw new ProfileError('Contame un poco más para poder guardarlo.');
  const drafts = validateProfileExtraction(await ai.extractProfile({ text: clean }));
  await addItems(drafts, source);
  return drafts.length;
}

export async function exportProfileJson(): Promise<string> {
  const items = await listProfile();
  return JSON.stringify(
    { exportado: new Date().toISOString(), perfil: items.map(({ section, title, detail, source, created_at }) => ({ section, title, detail, source, created_at })) },
    null,
    2
  );
}
