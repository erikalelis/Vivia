// Edge Function: reunión. Recibe el audio (base64), lo transcribe y arma resumen, decisiones, tareas y fechas.
// No guarda nada: devuelve el resultado y la app decide qué mostrar.
import { callAi, cors, HttpError, json } from '../_shared/ai.ts';

const SYSTEM = `Sos el asistente de una persona que grabó una reunión de trabajo. Recibís el audio.
Reglas críticas:
- Transcribí lo que se dice, fiel y completo, en el idioma original (español, inglés o portugués). Si hay varias personas, marcalas como "Persona 1:", "Persona 2:" cuando se note el cambio de voz. No inventes lo que no se escucha; si algo no se entiende, escribí "[inaudible]".
- Todo lo demás (resumen, decisiones, tareas) en español rioplatense, usando SOLO lo que se dijo en la reunión.
- "summary": 3 a 6 frases con lo importante. "decisions": decisiones concretas que se tomaron. "tasks": tareas asignadas o acordadas, con "owner" (quién, o null si no se dijo) y "due" (cuándo, tal como se dijo, o null). "dates": fechas o plazos mencionados con su contexto. "open_questions": cosas que quedaron sin resolver.
- Si el audio no tiene voz o no se entiende, devolvé transcript vacío y summary "No se escucha una conversación en el audio."`;

const TOOL = {
  name: 'registrar_reunion',
  description: 'Resultado de la reunión.',
  input_schema: {
    type: 'object',
    properties: {
      language: { type: 'string', enum: ['es', 'en', 'pt'] },
      transcript: { type: 'string' },
      summary: { type: 'string' },
      decisions: { type: 'array', items: { type: 'string' } },
      tasks: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, owner: { type: ['string', 'null'] }, due: { type: ['string', 'null'] } }, required: ['task'] } },
      dates: { type: 'array', items: { type: 'string' } },
      open_questions: { type: 'array', items: { type: 'string' } }
    },
    required: ['language', 'transcript', 'summary', 'decisions', 'tasks']
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    const audio = typeof b.audio_base64 === 'string' ? b.audio_base64 : '';
    const mime = typeof b.mime === 'string' && /^audio\//.test(b.mime) ? b.mime.split(';')[0] : 'audio/webm';
    if (!audio) throw new HttpError(400, 'Falta el audio.');
    if (audio.length > 18_000_000) throw new HttpError(413, 'El audio es demasiado largo para procesarlo de una vez.');
    const content = [
      { type: 'document', source: { type: 'base64', media_type: mime, data: audio } },
      { type: 'text', text: 'Transcribí esta reunión y armá el resumen, las decisiones, las tareas y las fechas.' }
    ];
    return json(await callAi({ system: SYSTEM, tool: TOOL, maxTokens: 12000, content }));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof HttpError ? e.message : 'Ocurrió un error inesperado.' }, status);
  }
});
