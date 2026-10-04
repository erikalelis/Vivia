import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, resample, rms, Segmenter } from './live.ts';

const SR = 16000;
const tone = (sec: number, amp = 0.2) => Float32Array.from({ length: Math.round(SR * sec) }, (_, i) => amp * Math.sin(i / 8));
const quiet = (sec: number) => new Float32Array(Math.round(SR * sec));
function feedAll(seg: Segmenter, sig: Float32Array, step = 1024) { for (let i = 0; i < sig.length; i += step) seg.feed(sig.subarray(i, i + step)); }
const cat = (...a: Float32Array[]) => { const o = new Float32Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

test('corta una frase después de una pausa larga', () => {
  const got: Float32Array[] = [];
  const seg = new Segmenter(SR, (p) => got.push(p));
  feedAll(seg, cat(quiet(1), tone(2), quiet(2)));
  assert.equal(got.length, 1);
  assert.ok(got[0].length > SR * 2 && got[0].length < SR * 4);
});

test('separa dos frases y descarta ruidos muy cortos', () => {
  const got: Float32Array[] = [];
  const seg = new Segmenter(SR, (p) => got.push(p));
  feedAll(seg, cat(quiet(1), tone(0.1), quiet(2), tone(1.5), quiet(1.5), tone(1.2), quiet(1.5)));
  assert.equal(got.length, 2);
});

test('una frase muy larga se corta sola', () => {
  const got: Float32Array[] = [];
  const seg = new Segmenter(SR, (p) => got.push(p), { maxSec: 5 });
  feedAll(seg, cat(quiet(0.5), tone(12), quiet(2)));
  assert.ok(got.length >= 2);
});

test('flush entrega la frase en curso', () => {
  const got: Float32Array[] = [];
  const seg = new Segmenter(SR, (p) => got.push(p));
  feedAll(seg, cat(quiet(0.5), tone(2)));
  seg.flush();
  assert.equal(got.length, 1);
});

test('resample, rms y WAV', () => {
  assert.equal(resample(new Float32Array(48000), 48000).length, 16000);
  assert.ok(Math.abs(rms(tone(1, 0.2)) - 0.2 / Math.SQRT2) < 0.01);
  const wav = encodeWav(tone(0.5));
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(wav.length, 44 + SR * 0.5 * 2);
});
