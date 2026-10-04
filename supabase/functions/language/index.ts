// Edge Function: idiomas.
//  - action "translate": detecta el idioma y traduce de forma natural (español, inglés, portugués).
//  - action "english":   conversación de práctica de inglés profesional con correcciones.
// No guarda nada: la app guarda lo que corresponda en la base de la usuaria.
import { callAi, cors, HttpError, json } from '../_shared/ai.ts';

const LANGS = ['es', 'en', 'pt'];

const TRANSLATE_TOOL = {
  name: 'traducir',
  description: 'Traducción natural con idioma detectado.',
  input_schema: {
    type: 'object',
    properties: {
      detected: { type: 'string', enum: LANGS },
      target: { type: 'string', enum: LANGS },
      translation: { type: 'string' },
      alternative: { type: ['string', 'null'] },
      note: { type: ['string', 'null'] }
    },
    required: ['detected', 'target', 'translation']
  }
};

const ENGLISH_TOOL = {
  name: 'practicar_ingles',
  description: 'Respuesta de la conversación de práctica con correcciones.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      reply_es: { type: 'string' },
      corrections: { type: 'array', items: { type: 'object', properties: { wrong: { type: 'string' }, right: { type: 'string' }, why: { type: 'string' } }, required: ['wrong', 'right', 'why'] } },
      better: { type: ['string', 'null'] }
    },
    required: ['reply', 'reply_es', 'corrections']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();

    if (b.action === 'translate') {
      const text = typeof b.text === 'string' ? b.text.trim().slice(0, 6000) : '';
      if (!text) throw new HttpError(400, 'Falta el texto.');
      const target = LANGS.includes(b.target) ? b.target : 'auto';
      const system = `Sos traductor profesional entre español rioplatense, inglés y portugués de Brasil. Detectás el idioma del texto y lo traducís de forma natural y fiel, con el tono del original (formal o informal). No agregues ni quites información.
Si el destino es "auto": si el texto está en español, traducí al inglés; si está en inglés o portugués, traducí al español.
"alternative" es una segunda forma natural de decirlo (o null). "note" es una aclaración corta solo si hay un modismo o matiz importante (o null).`;
      return json(await callAi({ system, tool: TRANSLATE_TOOL, maxTokens: 3000, content: [{ type: 'text', text: `Destino: ${target}\n\nTexto:\n${text}` }] }));
    }

    if (b.action === 'english') {
      const message = typeof b.message === 'string' ? b.message.trim().slice(0, 1500) : '';
      if (!message) throw new HttpError(400, 'Falta el mensaje.');
      const scenario = typeof b.scenario === 'string' ? b.scenario.slice(0, 300) : 'una conversación de trabajo';
      const history = Array.isArray(b.history) ? b.history.slice(-10).map((h: any) => `${h?.role === 'user' ? 'Persona' : 'Vos'}: ${String(h?.text ?? '').slice(0, 600)}`).join('\n') : '';
      const system = `Sos una profesora de inglés profesional amable. La persona habla español, tiene nivel básico de inglés y practica para el trabajo. Escenario: ${scenario}.
Reglas:
- "reply": tu respuesta en inglés MUY simple (1 a 3 frases cortas, vocabulario básico), que siga la conversación y termine con una pregunta fácil para que ella siga hablando.
- "reply_es": la traducción al español de "reply".
- "corrections": errores reales de lo que ella escribió en inglés (gramática, palabra equivocada, preposición, orden). Cada uno con "wrong" (lo que dijo), "right" (cómo se dice) y "why" (explicación en español, una frase simple). Máximo 3, los más importantes. Si no hay errores, lista vacía. Si ella escribió en español, ayudala: en "better" poné cómo decir su idea en inglés y seguí la conversación.
- "better": la frase de ella dicha de forma más natural en inglés (o null si ya estaba bien).`;
      const content = [{ type: 'text', text: `${history ? `Conversación hasta ahora:\n${history}\n\n` : ''}Ahora la persona dijo:\n${message}` }];
      return json(await callAi({ system, tool: ENGLISH_TOOL, maxTokens: 2500, content }));
    }

    throw new HttpError(400, 'Acción no válida.');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
