// Función profile-extract (archivo único para pegar en el editor de Supabase).
// Cliente de IA para Edge Functions (Deno). Usa Gemini (gratis) o Claude, según la clave que exista.
// Las claves viven SOLO en los secretos de Supabase; nunca llegan al navegador.

export interface ToolCallOptions {
  system: string;
  content: unknown[]; // bloques: { type:'text', text } o { type:'document', source:{ media_type, data } }
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
  maxTokens?: number;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'content-type': 'application/json'
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

type Block = { type: string; text?: string; source?: { media_type: string; data: string } };

// ---------- Gemini ----------
// Convierte un esquema JSON al subconjunto que acepta Gemini (["string","null"] -> nullable, sin additionalProperties).
function toGeminiSchema(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const out: any = {};
  let type = s.type;
  if (Array.isArray(type)) {
    const nonNull = type.filter((t: string) => t !== 'null');
    if (nonNull.length < type.length) out.nullable = true;
    type = nonNull[0];
  }
  if (type) out.type = String(type).toUpperCase();
  if (s.enum) out.enum = s.enum;
  if (s.description) out.description = s.description;
  if (s.required) out.required = s.required;
  if (s.properties) out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
  if (s.items) out.items = toGeminiSchema(s.items);
  return out;
}

async function callGemini(apiKey: string, o: ToolCallOptions): Promise<unknown> {
  const parts = (o.content as Block[]).map((b) =>
    b.type === 'document' && b.source ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } } : { text: b.text ?? '' });
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: o.system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: Math.max(o.maxTokens ?? 2000, 4000),
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(o.tool.input_schema)
    }
  });
  const models = [Deno.env.get('GEMINI_MODEL'), 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean) as string[];
  let lastStatus = 0;
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      try { return JSON.parse(text); } catch { throw new HttpError(502, 'La IA no devolvió una respuesta utilizable.'); }
    }
    lastStatus = res.status;
    console.error('Gemini error', model, res.status, await res.text());
    if (res.status !== 404 && res.status !== 503) break; // probamos el siguiente modelo si este no existe o está saturado
  }
  throw new HttpError(lastStatus === 429 ? 429 : 502, lastStatus === 429
    ? 'Se alcanzó el límite gratuito de la IA por ahora. Probá de nuevo en un rato.'
    : 'No pude consultar a la IA en este momento.');
}

// ---------- Claude ----------
async function callClaude(apiKey: string, o: ToolCallOptions): Promise<unknown> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: o.maxTokens ?? 2000,
      system: o.system,
      tools: [o.tool],
      tool_choice: { type: 'tool', name: o.tool.name },
      messages: [{ role: 'user', content: o.content }]
    })
  });
  if (!res.ok) {
    console.error('Anthropic error', res.status, await res.text());
    throw new HttpError(502, 'No pude consultar a la IA en este momento.');
  }
  const data = await res.json();
  const block = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use');
  if (!block) throw new HttpError(502, 'La IA no devolvió una respuesta utilizable.');
  return block.input;
}

export async function callAi(o: ToolCallOptions): Promise<unknown> {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) return callGemini(gemini, o);
  const claude = Deno.env.get('ANTHROPIC_API_KEY');
  if (claude) return callClaude(claude, o);
  throw new HttpError(503, 'La IA todavía no está configurada (falta la clave en el servidor).');
}


// Edge Function: arma el perfil profesional estructurado a partir del CV (PDF o texto) o de lo que la persona cuenta.
// No guarda nada: devuelve los elementos y la app los guarda en la base de la usuaria.

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
