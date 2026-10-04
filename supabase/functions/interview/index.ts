// Edge Function: ayuda para entrevistas de trabajo.
//  - action "prep":   analiza una vacante contra el perfil y arma preguntas probables con respuestas.
//  - action "answer": responde UNA pregunta (la que le hicieron en la entrevista), corto primero.
// No guarda nada. Usa solo el perfil que manda la app (ya filtrado por lo que la usuaria dejó habilitado).
import { callAi, cors, HttpError, json } from '../_shared/ai.ts';

const BASE = `Sos el asistente de una persona que va a una entrevista de trabajo. Hablás con ella en español rioplatense (voseo) y le armás lo que va a decir.
Reglas críticas:
- Las respuestas son EN PRIMERA PERSONA, listas para decir en voz alta, naturales y sin sonar a libreto.
- Basate SOLO en su perfil profesional. No inventes empresas, cargos, cifras, herramientas ni experiencias. Si el perfil no tiene lo que la pregunta pide, armá la mejor respuesta honesta con lo que sí tiene (cosas parecidas, cómo lo aprendería, qué haría) y no afirmes lo que no está.
- Sus respuestas tienen que sonar a una persona real: frases cortas, sin muletillas, sin palabras rebuscadas.
- "short" es lo primero que lee: 1 o 2 frases (máximo 35 palabras) que ya contestan la pregunta. "full" es la versión completa de 4 a 7 frases, con un ejemplo concreto del perfil cuando lo haya.
- Si el perfil dice que no tiene inglés u otro idioma, no lo ocultes ni lo inventes: ayudala a responder con honestidad y seguridad.`;

const PREP_TOOL = {
  name: 'preparar_entrevista',
  description: 'Análisis de la vacante contra el perfil y preguntas probables.',
  input_schema: {
    type: 'object',
    properties: {
      role: { type: 'string' },
      company: { type: ['string', 'null'] },
      summary: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' } },
      gaps: { type: 'array', items: { type: 'object', properties: { gap: { type: 'string' }, how: { type: 'string' } }, required: ['gap', 'how'] } },
      questions: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, short: { type: 'string' }, full: { type: 'string' } }, required: ['q', 'short', 'full'] } }
    },
    required: ['role', 'summary', 'strengths', 'gaps', 'questions']
  }
};

const ANSWER_TOOL = {
  name: 'responder_pregunta',
  description: 'Respuesta para una pregunta de entrevista.',
  input_schema: {
    type: 'object',
    properties: {
      short: { type: 'string' },
      full: { type: 'string' },
      bridge: { type: 'array', items: { type: 'string' } }
    },
    required: ['short', 'full']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    const profile = typeof b.profile === 'string' ? b.profile.slice(0, 20000) : '';
    const vacancy = typeof b.vacancy === 'string' ? b.vacancy.slice(0, 30000) : '';
    const pdf = typeof b.vacancy_pdf_base64 === 'string' ? b.vacancy_pdf_base64 : '';
    if (pdf.length > 14_000_000) throw new HttpError(413, 'El PDF es demasiado grande (máximo 10 MB).');

    if (b.action === 'prep') {
      if (!vacancy.trim() && !pdf) throw new HttpError(400, 'Falta la vacante.');
      const content: unknown[] = [];
      if (pdf) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } });
      content.push({ type: 'text', text: `PERFIL PROFESIONAL:\n${profile || '(vacío)'}\n\nVACANTE:\n${vacancy || '(ver documento adjunto)'}\n\nArmá: el puesto y la empresa si figuran; un resumen de qué busca la vacante (3 frases); las fortalezas de la persona que encajan (máximo 6); lo que le falta o puede preguntarle el entrevistador y cómo manejarlo con honestidad (máximo 5); y 10 preguntas probables de ESTA entrevista (mezcla de presentación, experiencia, técnicas de la vacante, comportamiento y las incómodas), cada una con respuesta corta y completa.` });
      return json(await callAi({ system: BASE, tool: PREP_TOOL, maxTokens: 8000, content }));
    }

    if (b.action === 'answer') {
      const question = typeof b.question === 'string' ? b.question.trim().slice(0, 1500) : '';
      if (!question) throw new HttpError(400, 'Falta la pregunta.');
      const blank = b.blank === true;
      const text = `PERFIL PROFESIONAL:\n${profile || '(vacío)'}\n\n${vacancy ? `VACANTE:\n${vacancy}\n\n` : ''}${b.context ? `LO QUE VENÍAN HABLANDO:\n${String(b.context).slice(0, 3000)}\n\n` : ''}PREGUNTA DEL ENTREVISTADOR:\n${question}\n\n${blank ? 'La persona se quedó en blanco. Además de la respuesta, dale en "bridge" 3 frases cortas y naturales para ganar unos segundos antes de contestar (por ejemplo repetir la pregunta con otras palabras o decir que lo piensa un instante).' : ''}`;
      return json(await callAi({ system: BASE, tool: ANSWER_TOOL, maxTokens: 3000, content: [{ type: 'text', text }] }));
    }

    throw new HttpError(400, 'Acción no válida.');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
