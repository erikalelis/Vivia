import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useVoice } from '@/hooks/useVoice';
import { friendly } from '@/services/api';
import { AiNotAvailableError } from '@/services/ai';
import { ProfileError } from '@/services/profile';
import { speak, translate } from '@/services/language';
import { LANG_NAME, LANG_VOICE, type Lang, type Translation } from '@/domain/language';

const errorText = (e: unknown) => (e instanceof ProfileError || e instanceof AiNotAvailableError ? e.message : friendly(e));
const TARGETS: ('auto' | Lang)[] = ['auto', 'es', 'en', 'pt'];

export default function Traducir() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [target, setTarget] = useState<'auto' | Lang>('auto');
  const [res, setRes] = useState<Translation | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const v = useVoice((t) => setText((p) => (p ? `${p} ${t}` : t)));

  async function go() {
    v.stop(); setBusy(true); setErr(null); setRes(null);
    try { setRes(await translate(text, target)); }
    catch (e) { setErr(errorText(e)); }
    finally { setBusy(false); }
  }

  async function copy(t: string) {
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sin portapapeles */ }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={() => navigate('/')} aria-label="Volver al inicio"><Icon name="back" /></button>
        <h1 className="text-2xl md:text-3xl">Traducir</h1>
      </div>

      <div className="card flex flex-col gap-3">
        <label htmlFor="tx" className="font-bold">Texto <span className="font-normal text-muted">(Vivia detecta el idioma)</span></label>
        <textarea id="tx" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí, pegá o dictá…" />
        {v.interim && <p className="text-sm text-muted">{v.interim}</p>}
        {v.error && <p className="text-sm text-terracota" role="alert">{v.error}</p>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Traducir a">
          {TARGETS.map((t) => (
            <button key={t} className={`chip min-h-[40px] ${target === t ? '!bg-berry !text-white' : ''}`} aria-pressed={target === t} onClick={() => setTarget(t)}>
              {t === 'auto' ? 'Automático' : LANG_NAME[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {v.supported && (
            <button className={v.listening ? 'btn-primary' : 'btn-outline'} onClick={() => (v.listening ? v.stop() : v.start())} aria-pressed={v.listening}>
              <Icon name="mic" size={20} />{v.listening ? 'Escuchando…' : 'Dictar'}
            </button>
          )}
          <button className="btn-primary flex-1" disabled={busy || text.trim().length < 1} onClick={() => void go()}>{busy ? 'Traduciendo…' : 'Traducir'}</button>
        </div>
      </div>

      {err && <p className="rounded-2xl bg-terracota-soft px-4 py-3 text-sm font-semibold text-terracota" role="alert">{err}</p>}

      {res && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-bold text-berry">{LANG_NAME[res.detected]} → {LANG_NAME[res.target]}</p>
          <p className="whitespace-pre-line text-[1.25rem] font-semibold leading-snug">{res.translation}</p>
          <div className="flex gap-3">
            <button className="btn-soft !px-4" onClick={() => void copy(res.translation)}>{copied ? 'Copiado' : 'Copiar'}</button>
            <button className="btn-outline !px-4" onClick={() => speak(res.translation, LANG_VOICE[res.target])}>Escuchar</button>
          </div>
          {res.alternative && <div className="rounded-2xl bg-mist p-3"><p className="text-xs font-bold text-muted">Otra forma natural</p><p className="text-[15px]">{res.alternative}</p></div>}
          {res.note && <p className="text-sm text-muted">{res.note}</p>}
        </div>
      )}
    </div>
  );
}
