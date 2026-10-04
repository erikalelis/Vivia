// Edge Function: arma el perfil profesional estructurado a partir del CV (PDF o texto) o de lo que la persona cuenta.
// No guarda nada: devuelve los elementos y la app los guarda en la base de la usuaria.
import { callAi, cors, HttpError, json } from '../_shared/ai.ts';

const SECTIONS = ['experiencia', 'herramientas', 'proyectos', 'logros', 'idiomas', 'conocimientos', 'situaciones', 'fortalezas'];

const SYSTEM = `Armás el perfil profesional estructurado de una persona a partir de su CV o de lo que ella cuenta.
Reglas críticas:
- Usá SOLO lo que dice el texto. No inventes empresas, cargos, fechas, herramientas, cifras ni logros. Si algo no está, no lo incluyas.
- Escribí en español, con frases cortas y concretas. Conservá tal cual los nombres propios, siglas, sistemas e idiomas.
- Cada elemento tiene un "title" corto (máximo 80 caracteres) y un "detail" opcional con el contexto necesario (máximo 400 caracteres).
- Secciones: experiencia (cargos, empresas, períodos y responsabilidades), herramientas (sistemas y software), proyectos (proyectos y automatizaciones), logros (logros y resultados; cifras solo si están en el texto), idiomas (con nivel solo si se indica), conocimientos (conocimientos y procesos, incluidos los financieros), situaciones (situaciones difíciles resueltas, solo si el texto las describe), fortalezas (habilidades y fortalezas).
- No repitas un mismo dato en varias secciones salvo que sea imprescindible.
- Si el texto no tiene información profesional, devolvé "items" vacío.`;

const TOOL = {
  name: 'registrar_perfil',
  description: 'Elementos del perfil profesional extraídos del texto.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section: { type: 'string', enum: SECTIONS },
            title: { type: 'string' },
            detail: { type: ['string', 'null'] }
          },
          required: ['section', 'title']
        }
      }
    },
    required: ['items']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { text, pdf_base64 } = await req.json();
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasPdf = typeof pdf_base64 === 'string' && pdf_base64.length > 0;
    if (!hasText && !hasPdf) throw new HttpError(400, 'Falta el texto o el archivo.');
    if (hasText && text.length > 60000) throw new HttpError(413, 'El texto es demasiado largo.');
    if (hasPdf && pdf_base64.length > 14_000_000) throw new HttpError(413, 'El PDF es demasiado grande (máximo 10 MB).');

    const content: unknown[] = [];
    if (hasPdf) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } });
    content.push({ type: 'text', text: hasText ? `Texto de la persona:\n\n${text}` : 'Extraé el perfil profesional de este CV.' });

    const result = await callAi({ system: SYSTEM, tool: TOOL, maxTokens: 6000, content });
    return json(result);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
