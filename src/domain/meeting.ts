// Lógica pura de reuniones: valida lo que devuelve la IA y arma el texto para copiar.
import type { Lang } from './language.ts';

export interface MeetingTask { task: string; owner: string | null; due: string | null }
export interface MeetingResult { language: Lang; transcript: string; summary: string; decisions: string[]; tasks: MeetingTask[]; dates: string[]; openQuestions: string[] }

const txt = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown, max = 400, n = 20): string[] => (Array.isArray(v) ? v.map((x) => txt(x, max)).filter(Boolean).slice(0, n) : []);

export function validateMeeting(raw: unknown): MeetingResult | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const summary = txt(r.summary, 3000);
  const transcript = txt(r.transcript, 200000);
  if (!summary && !transcript) return null;
  const tasks = (Array.isArray(r.tasks) ? r.tasks : []).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const task = txt(o.task, 400);
    return task ? [{ task, owner: txt(o.owner, 80) || null, due: txt(o.due, 80) || null }] : [];
  }).slice(0, 30);
  const language: Lang = r.language === 'en' || r.language === 'pt' ? r.language : 'es';
  return { language, transcript, summary, decisions: strs(r.decisions), tasks, dates: strs(r.dates), openQuestions: strs(r.open_questions) };
}

export function formatMinutes(m: MeetingResult): string {
  const lines: string[] = ['RESUMEN', m.summary];
  if (m.decisions.length) lines.push('', 'DECISIONES', ...m.decisions.map((d) => `- ${d}`));
  if (m.tasks.length) lines.push('', 'TAREAS', ...m.tasks.map((t) => `- ${t.task}${t.owner ? ` (${t.owner})` : ''}${t.due ? ` — ${t.due}` : ''}`));
  if (m.dates.length) lines.push('', 'FECHAS', ...m.dates.map((d) => `- ${d}`));
  if (m.openQuestions.length) lines.push('', 'PENDIENTES', ...m.openQuestions.map((d) => `- ${d}`));
  return lines.join('\n');
}

export const MAX_AUDIO_BYTES = 13 * 1024 * 1024;

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Título corto para la lista de reuniones guardadas. */
export function meetingTitle(m: MeetingResult, date: Date): string {
  const first = m.summary.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
  const when = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(date);
  const head = first.length > 60 ? `${first.slice(0, 57)}…` : first;
  return head ? `${when} · ${head}` : `Reunión del ${when}`;
}
