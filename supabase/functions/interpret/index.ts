// Edge Function: "Hablale a VIVIA" → interpreta texto libre y devuelve ítems estructurados.
// Requiere sesión (JWT de Supabase). El cliente valida el resultado antes de guardar.
import { callAi, cors, HttpError, json } from '../_shared/ai.ts';

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
