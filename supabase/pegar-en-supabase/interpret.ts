// interpret — versión de un solo archivo para pegar en el editor de Supabase.

const API_URL = 'https://api.anthropic.com/v1/messages';

export interface ToolCallOptions {
  system: string;
  content: unknown[]; // bloques de contenido (texto, documento PDF, etc.)
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
  maxTokens?: number;
}

export async function callClaudeTool({ system, content, tool, maxTokens = 2000 }: ToolCallOptions): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new HttpError(503, 'La IA todavía no está configurada (falta ANTHROPIC_API_KEY en el servidor).');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content }]
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

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'content-type': 'application/json'
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

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
    const result = await callClaudeTool({
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
