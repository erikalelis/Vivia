// Lógica pura de idiomas: valida lo que devuelve la IA.

export type Lang = 'es' | 'en' | 'pt';
export const LANG_NAME: Record<Lang, string> = { es: 'Español', en: 'Inglés', pt: 'Portugués' };
/** Código de voz/dictado de cada idioma. */
export const LANG_VOICE: Record<Lang, string> = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' };
const isLang = (v: unknown): v is Lang => v === 'es' || v === 'en' || v === 'pt';
const txt = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface Translation { detected: Lang; target: Lang; translation: string; alternative: string | null; note: string | null }

export function validateTranslation(raw: unknown): Translation | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const translation = txt(r.translation, 7000);
  if (!translation || !isLang(r.detected) || !isLang(r.target)) return null;
  const alt = txt(r.alternative, 7000);
  return { detected: r.detected, target: r.target, translation, alternative: alt && alt !== translation ? alt : null, note: txt(r.note, 400) || null };
}

export interface Correction { wrong: string; right: string; why: string }
export interface EnglishTurn { reply: string; replyEs: string; corrections: Correction[]; better: string | null }

export function validateEnglishTurn(raw: unknown): EnglishTurn | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const reply = txt(r.reply, 900);
  if (!reply) return null;
  const corrections = (Array.isArray(r.corrections) ? r.corrections : []).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const wrong = txt(o.wrong, 200), right = txt(o.right, 200);
    return wrong && right && wrong.toLowerCase() !== right.toLowerCase() ? [{ wrong, right, why: txt(o.why, 300) }] : [];
  }).slice(0, 3);
  return { reply, replyEs: txt(r.reply_es, 900), corrections, better: txt(r.better, 400) || null };
}

/** Agrupa errores repetidos (misma corrección) para mostrar los más frecuentes. */
export function topMistakes(list: { wrong: string; right: string; why: string | null }[], limit = 5) {
  const map = new Map<string, { wrong: string; right: string; why: string | null; count: number }>();
  for (const m of list) {
    const key = m.right.trim().toLowerCase();
    const cur = map.get(key);
    if (cur) cur.count++; else map.set(key, { ...m, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
