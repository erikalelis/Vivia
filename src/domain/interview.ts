// Lógica pura de entrevistas: valida lo que devuelve la IA (nunca confía en la forma).

export interface QA { q: string; short: string; full: string }
export interface Gap { gap: string; how: string }
export interface InterviewPrep { role: string; company: string | null; summary: string; strengths: string[]; gaps: Gap[]; questions: QA[] }
export interface InterviewAnswer { short: string; full: string; bridge: string[] }

const txt = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').trim().slice(0, max) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function validatePrep(raw: unknown): InterviewPrep | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const questions = arr(r.questions).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const q = txt(o.q, 300), short = txt(o.short, 400), full = txt(o.full, 1800);
    return q && (short || full) ? [{ q, short: short || full, full: full || short }] : [];
  }).slice(0, 15);
  if (questions.length === 0) return null;
  return {
    role: txt(r.role, 120) || 'Puesto',
    company: txt(r.company, 120) || null,
    summary: txt(r.summary, 900),
    strengths: arr(r.strengths).map((s) => txt(s, 200)).filter(Boolean).slice(0, 8),
    gaps: arr(r.gaps).flatMap((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const gap = txt(o.gap, 200), how = txt(o.how, 600);
      return gap ? [{ gap, how }] : [];
    }).slice(0, 8),
    questions
  };
}

export function validateAnswer(raw: unknown): InterviewAnswer | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const short = txt(r.short, 500), full = txt(r.full, 2200);
  if (!short && !full) return null;
  return { short: short || full, full: full || short, bridge: arr(r.bridge).map((s) => txt(s, 160)).filter(Boolean).slice(0, 4) };
}

export interface ListenResult { heard: string; isQuestion: boolean; question: string; short: string; full: string }

/** Resultado de escuchar un tramo de la entrevista en vivo. */
export function validateListen(raw: unknown): ListenResult | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const heard = txt(r.heard, 1500);
  const short = txt(r.short, 500), full = txt(r.full, 2200);
  const isQuestion = r.is_question === true && Boolean(short || full);
  if (!heard && !isQuestion) return null;
  return { heard, isQuestion, question: txt(r.question, 400) || heard, short: short || full, full: full || short };
}
