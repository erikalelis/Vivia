// Captura de audio en vivo del navegador (micrófono o audio de la pestaña/ventana de la videollamada).
import { Segmenter } from '@/domain/live';

export type LiveSource = 'sistema' | 'microfono';

export class CaptureError extends Error {}

export function systemAudioSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function'
    && !/Android|iPhone|iPad/i.test(navigator.userAgent);
}

export interface LiveCapture { stop: () => void; level: () => number }

/**
 * Empieza a escuchar. Cada frase completa (con pausa al final) llega a onUtterance como audio a 16 kHz.
 * - "sistema": el sonido que sale por la computadora (solo se escucha al entrevistador, no tu voz).
 * - "microfono": el micrófono del dispositivo.
 */
export async function startLiveCapture(source: LiveSource, onUtterance: (pcm: Float32Array) => void, onEnded: () => void): Promise<LiveCapture> {
  let stream: MediaStream;
  if (source === 'sistema') {
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch { throw new CaptureError('No se eligió qué compartir. Volvé a intentar y elegí la pestaña o ventana de la videollamada.'); }
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new CaptureError('No se compartió el audio. Elegí la pestaña de la videollamada y marcá “Compartir audio de la pestaña”.');
    }
    stream.getVideoTracks().forEach((t) => t.stop()); // el video no hace falta
  } else {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    } catch { throw new CaptureError('Necesito permiso para usar el micrófono. Habilitalo en el navegador.'); }
  }

  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC();
  await ctx.resume();
  const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain(); mute.gain.value = 0; // nada suena: solo se analiza
  const seg = new Segmenter(ctx.sampleRate, onUtterance);
  let lvl = 0;
  proc.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    let s = 0; for (let i = 0; i < data.length; i += 16) s += data[i] * data[i];
    lvl = Math.sqrt(s / (data.length / 16));
    seg.feed(new Float32Array(data));
  };
  src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
  stream.getAudioTracks()[0].addEventListener('ended', onEnded);

  return {
    level: () => lvl,
    stop: () => {
      try { seg.flush(); } catch { /* ya cerrado */ }
      proc.disconnect(); src.disconnect(); mute.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    }
  };
}
