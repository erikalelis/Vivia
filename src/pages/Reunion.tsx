import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { friendly } from '@/services/api';
import { AiNotAvailableError } from '@/services/ai';
import { ProfileError } from '@/services/profile';
import { analyzeMeeting, pickRecorderMime } from '@/services/meeting';
import { translate } from '@/services/language';
import { formatClock, formatMinutes, type MeetingResult } from '@/domain/meeting';
import { LANG_NAME, type Lang } from '@/domain/language';

const errorText = (e: unknown) => (e instanceof ProfileError || e instanceof AiNotAvailableError ? e.message : friendly(e));
type Phase = 'idle' | 'recording' | 'paused' | 'working' | 'done';

export default function Reunion() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [lastAudio, setLastAudio] = useState<Blob | null>(null);
  const [showText, setShowText] = useState(false);
  const [translated, setTranslated] = useState<{ lang: Lang; text: string } | null>(null);
  const [busyTr, setBusyTr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lockOk, setLockOk] = useState(true);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function acquireLock() {
    try { if ('wakeLock' in navigator) { lock.current = await navigator.wakeLock.request('screen'); setLockOk(true); } else setLockOk(false); }
    catch { setLockOk(false); }
  }
  function releaseLock() { void lock.current?.release().catch(() => undefined); lock.current = null; }

  useEffect(() => {
    // Si la pantalla se apagó o cambió de app, el bloqueo se pierde: se recupera al volver.
    const onVis = () => { if (document.visibilityState === 'visible' && (phase === 'recording')) void acquireLock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    releaseLock();
  }, []);

  async function start() {
    setErr(null); setResult(null); setTranslated(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setErr('Este navegador no puede grabar audio. Usá "Subir un audio".'); return; }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    } catch { setErr('Necesito permiso para usar el micrófono. Habilitalo en el navegador.'); return; }
    chunks.current = [];
    const mime = pickRecorderMime();
    const r = new MediaRecorder(stream.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
    r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    r.onstop = () => { void finish(new Blob(chunks.current, { type: r.mimeType || mime || 'audio/webm' })); };
    r.start(10000);
    rec.current = r;
    setSeconds(0);
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    await acquireLock();
    setPhase('recording');
  }

  function pause() { rec.current?.pause(); setPhase('paused'); if (timer.current) { window.clearInterval(timer.current); timer.current = null; } }
  function resume() { rec.current?.resume(); setPhase('recording'); timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000); void acquireLock(); }
  function stop() {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null; }
    releaseLock();
    rec.current?.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
  }

  async function finish(blob: Blob) {
    setLastAudio(blob); setPhase('working'); setErr(null);
    try { setResult(await analyzeMeeting(blob)); setPhase('done'); }
    catch (e) { setErr(errorText(e)); setPhase('idle'); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setResult(null); setTranslated(null);
    await finish(f);
    if (fileRef.current) fileRef.current.value = '';
  }

  function saveAudio() {
    if (!lastAudio) return;
    const url = URL.createObjectURL(lastAudio);
    const a = document.createElement('a');
    a.href = url; a.download = `reunion.${lastAudio.type.includes('mp4') ? 'm4a' : 'webm'}`; a.click();
    URL.revokeObjectURL(url);
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sin portapapeles */ }
  }

  async function doTranslate(lang: Lang) {
    if (!result) return;
    setBusyTr(true); setErr(null);
    try { const t = await translate(formatMinutes(result), lang); setTranslated({ lang, text: t.translation }); }
    catch (e) { setErr(errorText(e)); }
    finally { setBusyTr(false); }
  }

  // --- Pantalla de grabación: oscura y sencilla (se puede dejar el teléfono boca abajo con la pantalla encendida)
  if (phase === 'recording' || phase === 'paused') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-ink px-6 text-white">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <span className={`h-3.5 w-3.5 rounded-full bg-rec ${phase === 'recording' ? 'animate-pulse' : 'opacity-40'}`} />
          {phase === 'recording' ? 'Grabando' : 'En pausa'}
        </p>
        <p className="font-display text-6xl font-bold tabular-nums">{formatClock(seconds)}</p>
        <p className="max-w-xs text-center text-sm text-white/70">
          Podés dejar el teléfono boca abajo: mientras esta pantalla esté encendida, la grabación sigue.
          {!lockOk && ' Este navegador no permite mantener la pantalla encendida: desactivá el bloqueo automático mientras grabás.'}
        </p>
        <div className="flex w-full max-w-xs gap-3">
          <button className="btn flex-1 bg-white/15 text-white" onClick={phase === 'recording' ? pause : resume}>{phase === 'recording' ? 'Pausar' : 'Seguir'}</button>
          <button className="btn flex-1 bg-rec text-white" onClick={stop}>Terminar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={() => navigate('/')} aria-label="Volver al inicio"><Icon name="back" /></button>
        <h1 className="text-2xl md:text-3xl">Reunión</h1>
      </div>

      {phase === 'working' && <p className="rounded-2xl bg-lake-soft px-4 py-3 text-sm font-semibold text-lake-dark" role="status">Escuchando la reunión y armando el resumen… puede tardar un minuto.</p>}
      {err && (
        <div className="flex flex-col gap-2 rounded-2xl bg-terracota-soft px-4 py-3" role="alert">
          <p className="text-sm font-semibold text-terracota">{err}</p>
          {lastAudio && <button className="btn-outline !min-h-[44px] self-start" onClick={saveAudio}>Guardar el audio en mi dispositivo</button>}
        </div>
      )}

      {phase !== 'working' && (
        <div className="card flex flex-col gap-3">
          <button className="btn-primary !min-h-[60px] text-lg" onClick={() => void start()}><Icon name="mic" size={24} />Grabar una reunión</button>
          <button className="btn-outline" onClick={() => fileRef.current?.click()}>Subir un audio</button>
          <input ref={fileRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac,.webm" className="hidden" aria-label="Archivo de audio" onChange={(e) => void onFile(e.target.files?.[0])} />
          <p className="text-sm text-muted">Podés grabar con Vivia o subir el audio de la grabadora de tu teléfono. El audio se usa solo para armar el resumen y no se guarda. Entran hasta unos 13 MB (cerca de 1 hora grabada con Vivia).</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-2">
            <p className="text-sm font-bold text-berry">Resumen · {LANG_NAME[result.language]}</p>
            <p className="whitespace-pre-line text-[16px] leading-relaxed">{result.summary}</p>
          </div>
          {result.decisions.length > 0 && (
            <div className="card flex flex-col gap-2"><p className="font-bold">Decisiones</p>
              <ul className="flex flex-col gap-1.5 text-[15px]">{result.decisions.map((d) => <li key={d}>• {d}</li>)}</ul></div>
          )}
          {result.tasks.length > 0 && (
            <div className="card flex flex-col gap-2"><p className="font-bold">Tareas</p>
              <ul className="flex flex-col gap-2 text-[15px]">{result.tasks.map((t) => (
                <li key={t.task} className="rounded-2xl bg-mist px-3 py-2"><span className="font-semibold">{t.task}</span>
                  {(t.owner || t.due) && <span className="block text-sm text-muted">{[t.owner, t.due].filter(Boolean).join(' · ')}</span>}</li>
              ))}</ul></div>
          )}
          {result.dates.length > 0 && (
            <div className="card flex flex-col gap-2"><p className="font-bold">Fechas</p>
              <ul className="flex flex-col gap-1.5 text-[15px]">{result.dates.map((d) => <li key={d}>• {d}</li>)}</ul></div>
          )}
          {result.openQuestions.length > 0 && (
            <div className="card flex flex-col gap-2"><p className="font-bold">Quedó pendiente</p>
              <ul className="flex flex-col gap-1.5 text-[15px]">{result.openQuestions.map((d) => <li key={d}>• {d}</li>)}</ul></div>
          )}

          <div className="card flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button className="btn-soft !px-4" onClick={() => void copy(formatMinutes(result))}>{copied ? 'Copiado' : 'Copiar resumen'}</button>
              {lastAudio && <button className="btn-outline !px-4" onClick={saveAudio}>Guardar audio</button>}
            </div>
            <p className="text-sm font-semibold">Traducir el resumen a:</p>
            <div className="flex gap-2">
              {(['es', 'en', 'pt'] as Lang[]).filter((l) => l !== result.language).map((l) => (
                <button key={l} className="chip min-h-[40px]" disabled={busyTr} onClick={() => void doTranslate(l)}>{LANG_NAME[l]}</button>
              ))}
            </div>
            {busyTr && <p className="text-sm text-muted">Traduciendo…</p>}
            {translated && <p className="whitespace-pre-line rounded-2xl bg-mist p-3 text-[15px]">{translated.text}</p>}
          </div>

          {result.transcript && (
            <div className="card flex flex-col gap-2">
              <button className="btn-ghost self-start !px-0 text-berry" onClick={() => setShowText(!showText)} aria-expanded={showText}>{showText ? 'Ocultar transcripción' : 'Ver transcripción completa'}</button>
              {showText && <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">{result.transcript}</p>}
            </div>
          )}
          <p className="px-1 text-xs text-muted">Este resultado no se guarda: copialo o guardalo antes de salir de esta pantalla.</p>
        </div>
      )}
    </div>
  );
}
