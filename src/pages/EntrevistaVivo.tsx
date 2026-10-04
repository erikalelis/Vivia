import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { CaptureError, startLiveCapture, systemAudioSupported, type LiveCapture, type LiveSource } from '@/live/capture';
import { listenSegment, loadProfileText } from '@/services/interview';
import { ProfileError } from '@/services/profile';
import type { ListenResult } from '@/domain/interview';

interface Entry { id: number; r: ListenResult }

/**
 * Entrevista en vivo, sin tocar nada: escucha, detecta cuando le hacen una pregunta y muestra la respuesta
 * en letra grande. Silencioso (sin sonido ni vibración) y con la pantalla oscura para no distraer.
 */
export default function EntrevistaVivo({ vacancy }: { vacancy: string }) {
  const [source, setSource] = useState<LiveSource>(systemAudioSupported() ? 'sistema' : 'microfono');
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [heard, setHeard] = useState('');
  const [pending, setPending] = useState(0);
  const [level, setLevel] = useState(0);
  const cap = useRef<LiveCapture | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const profile = useRef('');
  const context = useRef('');
  const nextId = useRef(1);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => () => { cap.current?.stop(); void lock.current?.release().catch(() => undefined); }, []);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setLevel(cap.current?.level() ?? 0), 300);
    const onVis = () => { if (document.visibilityState === 'visible') void navigator.wakeLock?.request('screen').then((l) => { lock.current = l; }).catch(() => undefined); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [running]);

  function handleUtterance(pcm: Float32Array) {
    setPending((n) => n + 1);
    // Se atienden de a una, en orden, para que las respuestas no se mezclen.
    queue.current = queue.current.then(async () => {
      try {
        const r = await listenSegment(pcm, profile.current, vacancy, context.current);
        setWarn(null);
        if (!r) return;
        context.current = `${context.current}\n${r.isQuestion ? 'Entrevistador (pregunta)' : 'Se escuchó'}: ${r.heard}`.slice(-3000);
        setHeard(r.heard);
        if (r.isQuestion) setEntries((p) => [{ id: nextId.current++, r }, ...p].slice(0, 6));
      } catch (e) {
        setWarn(e instanceof Error && e.message ? e.message : 'Se cortó la conexión un momento.');
      } finally {
        setPending((n) => Math.max(0, n - 1));
      }
    });
  }

  async function start() {
    setErr(null);
    try {
      profile.current = await loadProfileText();
      if (!profile.current) throw new ProfileError('Primero cargá tu CV en Mi perfil, así las respuestas salen con tu experiencia real.');
      cap.current = await startLiveCapture(source, handleUtterance, () => { setRunning(false); setErr('Se dejó de compartir el audio.'); });
      try { lock.current = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* sin bloqueo de pantalla */ }
      setEntries([]); setHeard(''); context.current = '';
      setRunning(true);
    } catch (e) {
      setErr(e instanceof CaptureError || e instanceof ProfileError ? e.message : 'No pude empezar a escuchar.');
    }
  }

  function stop() {
    cap.current?.stop(); cap.current = null;
    void lock.current?.release().catch(() => undefined); lock.current = null;
    setRunning(false);
  }

  if (!running) {
    return (
      <div className="flex flex-col gap-4">
        <div className="card flex flex-col gap-3">
          <p className="font-bold">Entrevista en vivo, sin tocar nada</p>
          <p className="text-[15px] text-muted">Vivia escucha la entrevista, detecta cuándo te hacen una pregunta y te muestra la respuesta en letra grande. Todo en silencio, sin sonidos ni vibración.</p>
          <p className="text-sm font-semibold">¿Qué escucha?</p>
          <div className="flex flex-col gap-2">
            <button className={`card !p-3 text-left ${source === 'sistema' ? '!border-berry' : ''}`} disabled={!systemAudioSupported()} aria-pressed={source === 'sistema'} onClick={() => setSource('sistema')}>
              <span className="font-bold">El audio de la videollamada (recomendado)</span>
              <span className="block text-sm text-muted">{systemAudioSupported() ? 'Solo se escucha a la otra persona, no tu voz. Desde la computadora, con Chrome o Edge.' : 'No disponible en este dispositivo: funciona desde una computadora con Chrome o Edge.'}</span>
            </button>
            <button className={`card !p-3 text-left ${source === 'microfono' ? '!border-berry' : ''}`} aria-pressed={source === 'microfono'} onClick={() => setSource('microfono')}>
              <span className="font-bold">El micrófono</span>
              <span className="block text-sm text-muted">Escucha lo que suena cerca. También escucha tu voz, pero solo responde a preguntas del entrevistador.</span>
            </button>
          </div>
          {source === 'sistema' && <p className="rounded-2xl bg-mist p-3 text-sm text-muted">Al empezar, el navegador te pide qué compartir: elegí la <strong>pestaña o ventana de la videollamada</strong> y marcá <strong>“Compartir audio”</strong>.</p>}
          {err && <p className="rounded-2xl bg-terracota-soft px-4 py-3 text-sm font-semibold text-terracota" role="alert">{err}</p>}
          <button className="btn-primary !min-h-[56px]" onClick={() => void start()}><Icon name="mic" size={22} />Empezar a escuchar</button>
        </div>
        <p className="px-1 text-xs text-muted">Hacé una prueba antes de la entrevista real. La respuesta aparece 3 a 6 segundos después de que termina la pregunta y necesita internet. No se guarda ningún audio. Bajá el brillo del teléfono antes de empezar.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0B0A10] text-[#E9E4EE]">
      <div className="flex items-center justify-between px-5 pt-4 text-xs text-[#8C8598]">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#6FD3C9]" style={{ opacity: 0.35 + Math.min(level * 12, 0.65) }} />
          {pending > 0 ? 'Pensando la respuesta…' : 'Escuchando'}
        </span>
        <button className="min-h-[36px] px-2 text-[#8C8598]" onClick={stop}>Terminar</button>
      </div>
      {warn && <p className="px-5 pt-1 text-xs text-[#E7A0A0]">{warn}</p>}
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {entries.length === 0 && <p className="mt-10 text-center text-lg text-[#8C8598]">Esperando la primera pregunta…</p>}
        {entries.map((e, i) => (
          <div key={e.id} className={`mb-8 ${i > 0 ? 'opacity-45' : ''}`}>
            <p className="mb-2 text-base text-[#8C8598]">{e.r.question}</p>
            <p className={`font-semibold leading-snug ${i === 0 ? 'text-[2.4rem]' : 'text-2xl'}`}>{e.r.short}</p>
            {i === 0 && e.r.full !== e.r.short && <p className="mt-4 text-[1.4rem] leading-relaxed text-[#C9C2D2]">{e.r.full}</p>}
          </div>
        ))}
      </div>
      {heard && <p className="truncate px-5 pb-4 text-xs text-[#6B6480]">Se escuchó: {heard}</p>}
    </div>
  );
}
