// interpret — versión de un solo archivo para pegar en el editor de Supabase.
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

// Edge Function: "Hablale a VIVIA" → interpreta texto libre y devuelve ítems estructurados.
// Requiere sesión (JWT de Supabase). El cliente valida el resultado antes de guardar.

const SYSTEM = `Sos el motor de comprensión de VIVIA, la asistente personal de Érika (Buenos Aires, español rioplatense).
Recibís lo que ella dijo o escribió y lo convertís en ítems separados: tareas, eventos de agenda o notas.
Reglas:
- Separá cada acción distinta en su propio ítem.
- Resolvé fechas relativas ("el viernes", "mañana") usando la fecha de hoy y la zona horaria que se te indican. Formato YYYY-MM-DD y HH:MM (24 h).
- "module": "mia" si se trata de su hija Mia o del colegio de Mia; "carrera" si es búsqueda de empleo; "proyectos" para proyectos; si no, "general".
- Si pide que le recuerden algo otro día, completá reminder_date.
- NO inventes datos. Si falta algo importante o hay ambigüedad real (por ejemplo "tengo reunión" sin saber si es evento de agenda o pendiente, o un evento sin día), dejá el campo en null y agregá una aclaración en "clarifications" con opciones cortas.
- Si no entendés nada accionable, devolvé items vacío y una aclaración preguntando qué quiere hacer.`;

const TOOL = {
  name: 'registrar_items',
  description: 'Devuelve los ítems detectados y las aclaraciones necesarias.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['tarea', 'evento', 'nota'] },
            title: { type: 'string' },
            module: { type: 'string', enum: ['general', 'mia', 'carrera', 'proyectos', 'documentos'] },
            date: { type: ['string', 'null'] },
            time: { type: ['string', 'null'] },
            priority: { type: 'string', enum: ['baja', 'media', 'alta'] },
            person: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            reminder_date: { type: ['string', 'null'] },
            recurrence: { type: ['string', 'null'] }
          },
          required: ['kind', 'title']
        }
      },
      clarifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_index: { type: 'integer' },
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } }
          },
          required: ['question']
        }
      }
    },
    required: ['items']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { text, today, weekday, timezone } = await req.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new HttpError(400, 'El texto está vacío o es demasiado largo.');
    const result = await callAi({
      system: SYSTEM,
      tool: TOOL,
      content: [{ type: 'text', text: `Hoy es ${weekday ?? ''} ${today} (zona ${timezone ?? 'America/Argentina/Buenos_Aires'}).\n\nLo que dijo Érika:\n"""${text}"""` }]
    });
    return json(result);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
