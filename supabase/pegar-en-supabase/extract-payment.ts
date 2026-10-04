import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// extract-payment — versión de un solo archivo para pegar en el editor de Supabase.
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

// Edge Function: lee el PDF de una cuota y devuelve los datos tal como están impresos.
// Los importes se devuelven como TEXTO (tal cual figuran); el cliente los convierte a centavos.

const SYSTEM = `Leés comprobantes de cuota escolar argentinos. Extraé los datos EXACTAMENTE como figuran impresos.
Reglas críticas:
- "declared_total" es el TOTAL FINAL A PAGAR que indica el documento (puede decir "Total a pagar", "Importe total", "Total"). NO es el primer importe que veas ni la cuota base. Si el documento muestra varios vencimientos con recargos, usá el total del PRIMER vencimiento y mencioná los demás en "notes".
- "lines" son los conceptos facturados (matrícula, cuota, comedor, materiales, actividades, descuentos, recargos). Los descuentos se copian tal cual y se marcan con kind="descuento"; los recargos con kind="recargo".
- Copiá los importes como texto, con el formato original (ej. "$317.510,00"). No hagas cuentas, no redondees.
- Si un dato no está en el documento, devolvé null. No inventes nada.
- "month" es el número de mes del período facturado (1-12).`;

const TOOL = {
  name: 'registrar_cuota',
  description: 'Datos de la cuota leídos del PDF.',
  input_schema: {
    type: 'object',
    properties: {
      institution: { type: ['string', 'null'] },
      student: { type: ['string', 'null'] },
      concept: { type: ['string', 'null'] },
      month: { type: ['integer', 'null'] },
      year: { type: ['integer', 'null'] },
      due_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            concept: { type: 'string' },
            amount: { type: 'string' },
            kind: { type: 'string', enum: ['cargo', 'descuento', 'recargo'] }
          },
          required: ['concept', 'amount']
        }
      },
      declared_total: { type: ['string', 'null'] },
      notes: { type: ['string', 'null'] }
    },
    required: ['lines', 'declared_total']
  }
};

const toBase64 = (buf: ArrayBuffer) => {
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { storage_path } = await req.json();
    if (typeof storage_path !== 'string' || !storage_path) throw new HttpError(400, 'Falta el archivo.');

    // Se descarga con el JWT de la usuaria: las políticas de Storage garantizan que solo lea sus archivos.
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    });
    const { data: file, error } = await supabase.storage.from('documents').download(storage_path);
    if (error || !file) throw new HttpError(404, 'No encontré ese archivo.');
    const buf = await file.arrayBuffer();
    if (buf.byteLength > 20 * 1024 * 1024) throw new HttpError(413, 'El PDF es demasiado grande (máximo 20 MB).');

    const result = await callAi({
      system: SYSTEM,
      tool: TOOL,
      maxTokens: 3000,
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: toBase64(buf) } },
        { type: 'text', text: 'Extraé los datos de esta cuota.' }
      ]
    });
    return json(result);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
