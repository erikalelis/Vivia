import { supabase } from '@/lib/supabase';
import { ai } from '@/services/ai';
import { validateEnglishTurn, validateTranslation, type Correction, type EnglishTurn, type Lang, type Translation } from '@/domain/language';
import { ProfileError } from '@/services/profile';

export async function translate(text: string, target: Lang | 'auto'): Promise<Translation> {
  const t = validateTranslation(await ai.language({ action: 'translate', text, target }));
  if (!t) throw new ProfileError('No pude traducir ese texto. Probá de nuevo.');
  return t;
}

export async function englishTurn(message: string, scenario: string, history: { role: 'user' | 'ai'; text: string }[]): Promise<EnglishTurn> {
  const t = validateEnglishTurn(await ai.language({ action: 'english', message, scenario, history }));
  if (!t) throw new ProfileError('No pude responder. Probá de nuevo.');
  return t;
}

// ---- Errores frecuentes (tabla english_mistakes; si todavía no existe, la práctica sigue funcionando) ----
export interface MistakeRow { wrong: string; right: string; why: string | null; created_at: string }

export async function saveMistakes(list: Correction[]): Promise<boolean> {
  if (list.length === 0) return true;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { error } = await supabase.from('english_mistakes').insert(list.map((c) => ({ ...c, user_id: data.user!.id })));
    return !error;
  } catch { return false; }
}

/** Devuelve null si la tabla todavía no está creada. */
export async function listMistakes(): Promise<MistakeRow[] | null> {
  try {
    const { data, error } = await supabase.from('english_mistakes').select('wrong,right,why,created_at').order('created_at', { ascending: false }).limit(300);
    if (error) return null;
    return (data ?? []) as MistakeRow[];
  } catch { return null; }
}

export async function clearMistakes(): Promise<void> {
  const { error } = await supabase.from('english_mistakes').delete().not('id', 'is', null);
  if (error) throw error;
}

/** Lee un texto en voz alta con la voz del dispositivo (solo si la persona toca "Escuchar"). */
export function speak(text: string, voice: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice; u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}
