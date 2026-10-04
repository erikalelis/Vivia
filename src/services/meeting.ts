import { ai } from '@/services/ai';
import { MAX_AUDIO_BYTES, validateMeeting, type MeetingResult } from '@/domain/meeting';
import { ProfileError } from '@/services/profile';

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new ProfileError('No pude leer el audio.'));
    reader.readAsDataURL(blob);
  });
}

/** Envía el audio a la IA (no se guarda en ningún lado) y devuelve la reunión ya ordenada. */
export async function analyzeMeeting(audio: Blob): Promise<MeetingResult> {
  if (audio.size < 2000) throw new ProfileError('El audio es muy corto o está vacío.');
  if (audio.size > MAX_AUDIO_BYTES) throw new ProfileError('El audio es demasiado largo para procesarlo de una vez (máximo 13 MB, cerca de 1 hora grabada desde Vivia). Guardá la grabación y dividila en partes.');
  const r = validateMeeting(await ai.meeting({ audio_base64: await toBase64(audio), mime: audio.type || 'audio/webm' }));
  if (!r) throw new ProfileError('No pude entender el audio. Probá con una grabación más clara.');
  return r;
}

/** Mejor formato disponible para grabar: liviano para que entre una hora en el límite. */
export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m));
}
