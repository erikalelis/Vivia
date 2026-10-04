// Audio en vivo para el modo entrevista: corta lo que se escucha en frases completas (cada pausa larga cierra una frase)
// y las convierte a WAV liviano para mandarlas a la IA. Lógica pura: se prueba sin navegador.

export const TARGET_RATE = 16000;

export function rms(chunk: Float32Array): number {
  if (chunk.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
  return Math.sqrt(sum / chunk.length);
}

/** Reduce la frecuencia de muestreo (interpolación lineal). */
export function resample(input: Float32Array, from: number, to = TARGET_RATE): Float32Array {
  if (from === to) return input.slice();
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio, i0 = Math.floor(pos), i1 = Math.min(i0 + 1, input.length - 1), f = pos - i0;
    out[i] = input[i0] * (1 - f) + input[i1] * f;
  }
  return out;
}

/** WAV mono de 16 bits. */
export function encodeWav(samples: Float32Array, rate = TARGET_RATE): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

export interface SegmenterOptions { silenceSec?: number; maxSec?: number; minVoiceSec?: number; prerollSec?: number }

/**
 * Detecta cuándo alguien habla y cuándo termina la frase (pausa larga). Se adapta al ruido de fondo.
 * Entrega cada frase ya a 16 kHz.
 */
export class Segmenter {
  private readonly sr: number;
  private readonly onUtterance: (pcm: Float32Array) => void;
  private readonly silenceSamples: number;
  private readonly maxSamples: number;
  private readonly minVoiceSamples: number;
  private readonly prerollSamples: number;
  private noise = 0.004;
  private preroll: Float32Array[] = [];
  private prerollLen = 0;
  private cur: Float32Array[] = [];
  private curLen = 0;
  private voiced = 0;
  private quiet = 0;
  private hot = 0;
  private speaking = false;

  constructor(sampleRate: number, onUtterance: (pcm: Float32Array) => void, o: SegmenterOptions = {}) {
    this.sr = sampleRate; this.onUtterance = onUtterance;
    this.silenceSamples = Math.round(sampleRate * (o.silenceSec ?? 1.1));
    this.maxSamples = Math.round(sampleRate * (o.maxSec ?? 25));
    this.minVoiceSamples = Math.round(sampleRate * (o.minVoiceSec ?? 0.7));
    this.prerollSamples = Math.round(sampleRate * (o.prerollSec ?? 0.5));
  }

  get isSpeaking(): boolean { return this.speaking; }

  feed(chunk: Float32Array): void {
    const level = rms(chunk);
    const threshold = Math.max(0.012, this.noise * 3);
    const loud = level > threshold;
    if (!this.speaking) {
      if (!loud) this.noise = this.noise * 0.95 + level * 0.05;
      this.preroll.push(chunk); this.prerollLen += chunk.length;
      while (this.prerollLen - (this.preroll[0]?.length ?? 0) >= this.prerollSamples) { this.prerollLen -= this.preroll.shift()!.length; }
      this.hot = loud ? this.hot + 1 : 0;
      if (this.hot >= 2) {
        this.speaking = true; this.cur = [...this.preroll]; this.curLen = this.prerollLen;
        this.preroll = []; this.prerollLen = 0; this.voiced = chunk.length * this.hot; this.quiet = 0;
      }
      return;
    }
    this.cur.push(chunk); this.curLen += chunk.length;
    if (loud) { this.voiced += chunk.length; this.quiet = 0; } else this.quiet += chunk.length;
    if (this.quiet >= this.silenceSamples || this.curLen >= this.maxSamples) this.close();
  }

  /** Cierra la frase en curso (por ejemplo al terminar la sesión). */
  flush(): void { if (this.speaking) this.close(); }

  private close(): void {
    const enough = this.voiced >= this.minVoiceSamples;
    const all = new Float32Array(this.curLen);
    let o = 0; for (const c of this.cur) { all.set(c, o); o += c.length; }
    this.cur = []; this.curLen = 0; this.voiced = 0; this.quiet = 0; this.hot = 0; this.speaking = false;
    if (enough) this.onUtterance(resample(all, this.sr));
  }
}
