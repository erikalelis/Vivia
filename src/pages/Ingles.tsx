import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useVoice } from '@/hooks/useVoice';
import { friendly } from '@/services/api';
import { AiNotAvailableError } from '@/services/ai';
import { ProfileError } from '@/services/profile';
import { clearMistakes, englishTurn, listMistakes, saveMistakes, speak } from '@/services/language';
import { topMistakes, type EnglishTurn } from '@/domain/language';

const errorText = (e: unknown) => (e instanceof ProfileError || e instanceof AiNotAvailableError ? e.message : friendly(e));

const SCENARIOS = [
  { id: 'entrevista', label: 'Entrevista de trabajo', text: 'una entrevista de trabajo para un puesto de analista; la IA hace de entrevistadora' },
  { id: 'reunion', label: 'Reunión con un cliente', text: 'una reunión de trabajo con un cliente; la IA hace de cliente' },
  { id: 'correo', label: 'Escribir un correo', text: 'redactar y hablar sobre un correo profesional corto' },
  { id: 'presentarme', label: 'Presentarme', text: 'presentarse a sí misma y su experiencia profesional ante un equipo nuevo' }
];

interface Turn { user: string; ai: EnglishTurn }

export default function Ingles() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number] | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<Awaited<ReturnType<typeof listMistakes>>>(null);
  const [saved, setSaved] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const v = useVoice((t) => setInput((p) => (p ? `${p} ${t}` : t)), 'en-US');

  useEffect(() => { void listMistakes().then(setMistakes); }, [turns.length]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns.length]);

  async function send() {
    if (!scenario || !input.trim()) return;
    v.stop(); setBusy(true); setErr(null);
    const message = input.trim();
    try {
      const history = turns.flatMap((t) => [{ role: 'user' as const, text: t.user }, { role: 'ai' as const, text: t.ai.reply }]);
      const ai = await englishTurn(message, scenario.text, history);
      setTurns((p) => [...p, { user: message, ai }]);
      setInput('');
      setSaved(await saveMistakes(ai.corrections));
    } catch (e) { setErr(errorText(e)); }
    finally { setBusy(false); }
  }

  const top = mistakes ? topMistakes(mistakes) : [];

  if (!scenario) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button className="btn-ghost !min-h-[44px] !px-3" onClick={() => navigate('/')} aria-label="Volver al inicio"><Icon name="back" /></button>
          <h1 className="text-2xl md:text-3xl">Practicar inglés</h1>
        </div>
        <p className="px-1 text-[15px] text-muted">Elegí una situación. Hablás o escribís en inglés, Vivia te responde simple y te corrige con cariño. Si no sabés cómo decir algo, escribilo en español.</p>
        <div className="flex flex-col gap-3">
          {SCENARIOS.map((s) => (
            <button key={s.id} className="card flex min-h-[64px] items-center gap-3 text-left" onClick={() => setScenario(s)}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lake-soft text-lake"><Icon name="globe" /></span>
              <span className="flex-1 font-bold">{s.label}</span>
              <Icon name="chevron" size={20} className="text-muted" />
            </button>
          ))}
        </div>
        {mistakes === null ? (
          <p className="px-1 text-sm text-muted">Para guardar tus errores frecuentes y ver tu progreso falta activar una tabla en tu base de datos. La práctica funciona igual.</p>
        ) : top.length > 0 && (
          <div className="card flex flex-col gap-3">
            <p className="font-bold">Tus errores más frecuentes</p>
            {top.map((m) => (
              <div key={m.right}><p className="text-[15px]"><span className="text-muted line-through">{m.wrong}</span> → <strong>{m.right}</strong> <span className="text-sm text-muted">({m.count}×)</span></p>{m.why && <p className="text-sm text-muted">{m.why}</p>}</div>
            ))}
            <button className="btn-ghost self-start !px-0 text-sm text-muted" onClick={() => { if (window.confirm('¿Borrar tu historial de errores?')) void clearMistakes().then(() => listMistakes().then(setMistakes)); }}>Borrar historial</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={() => { v.stop(); setScenario(null); setTurns([]); }} aria-label="Cambiar de situación"><Icon name="back" /></button>
        <h1 className="text-xl md:text-2xl">{scenario.label}</h1>
      </div>

      {turns.length === 0 && <p className="px-1 text-[15px] text-muted">Empezá con un saludo o presentándote, por ejemplo: “Hello, my name is…”.</p>}

      {turns.map((t, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className="ml-10 self-end rounded-2xl rounded-br-md bg-berry px-4 py-2.5 text-[15px] text-white">{t.user}</p>
          {t.ai.corrections.length > 0 && (
            <div className="mr-6 rounded-2xl bg-berry-soft p-3 text-sm">
              {t.ai.corrections.map((c) => (
                <p key={c.wrong} className="mb-1.5 last:mb-0"><span className="text-muted line-through">{c.wrong}</span> → <strong>{c.right}</strong><br /><span className="text-muted">{c.why}</span></p>
              ))}
            </div>
          )}
          {t.ai.better && <p className="mr-6 rounded-2xl bg-lake-soft p-3 text-sm text-lake-dark">Más natural: <strong>{t.ai.better}</strong></p>}
          <div className="mr-10 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-2.5">
            <p className="text-[15px] font-semibold">{t.ai.reply}</p>
            <p className="text-sm text-muted">{t.ai.replyEs}</p>
            <button className="btn-ghost !min-h-[36px] !px-0 text-sm text-berry" onClick={() => speak(t.ai.reply, 'en-US')}>Escuchar</button>
          </div>
        </div>
      ))}
      <div ref={endRef} />

      {err && <p className="rounded-2xl bg-terracota-soft px-4 py-3 text-sm font-semibold text-terracota" role="alert">{err}</p>}
      {!saved && <p className="px-1 text-xs text-muted">Tus errores no se están guardando todavía (falta activar la tabla).</p>}

      <div className="sticky bottom-20 flex flex-col gap-2 rounded-xl2 border border-line bg-white p-3 shadow-lift md:bottom-4">
        <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} aria-label="Tu mensaje" placeholder="Hablá o escribí en inglés…" />
        {v.interim && <p className="text-sm text-muted">{v.interim}</p>}
        {v.error && <p className="text-sm text-terracota" role="alert">{v.error}</p>}
        <div className="flex gap-3">
          {v.supported && (
            <button className={v.listening ? 'btn-primary' : 'btn-outline'} onClick={() => (v.listening ? v.stop() : v.start())} aria-pressed={v.listening}>
              <Icon name="mic" size={20} />{v.listening ? 'Escuchando…' : 'Hablar'}
            </button>
          )}
          <button className="btn-primary flex-1" disabled={busy || !input.trim()} onClick={() => void send()}>{busy ? 'Un momento…' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  );
}
