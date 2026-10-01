// Cliente mínimo de la API de Anthropic para Edge Functions (Deno).
// La clave vive SOLO en los secretos de Supabase; nunca llega al navegador.

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
