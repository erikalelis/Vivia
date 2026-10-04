import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/Icon';
import { ErrorBox, Loading, Modal } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLoad } from '@/hooks/useLoad';
import { useVoice } from '@/hooks/useVoice';
import { friendly } from '@/services/api';
import { AiNotAvailableError } from '@/services/ai';
import { PROFILE_SECTIONS, SECTION_LABEL, groupBySection, type ProfileSection } from '@/domain/profile';
import { getOffSections, importFromFile, importFromText, listProfile, ProfileError, removeItems, setSectionEnabled } from '@/services/profile';

type Msg = { ok: boolean; text: string };
const errorText = (e: unknown) => (e instanceof ProfileError || e instanceof AiNotAvailableError ? e.message : friendly(e));

export default function Perfil() {
  const { session, signOut } = useAuth();
  const items = useLoad(listProfile);
  const off = useLoad(getOffSections);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [open, setOpen] = useState<ProfileSection | null>(null);
  const [adding, setAdding] = useState<null | 'escribir' | 'hablar'>(null);

  const list = items.data ?? [];
  const grouped = groupBySection(list);
  const cvItems = list.filter((i) => i.source === 'cv');
  const hasOwn = list.some((i) => i.source !== 'cv');
  const offList = off.data ?? [];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy('Leyendo tu CV…'); setMsg(null);
    try {
      const n = await importFromFile(file, cvItems.map((i) => i.id));
      await items.reload();
      setMsg(n > 0 ? { ok: true, text: `Listo: sumé ${n} datos a tu perfil.` } : { ok: false, text: 'No encontré información profesional en ese archivo.' });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function toggle(section: ProfileSection, enabled: boolean) {
    try { await setSectionEnabled(section, enabled); await off.reload(); }
    catch (e) { setMsg({ ok: false, text: errorText(e) }); }
  }

  async function remove(id: string) {
    try { await removeItems([id]); await items.reload(); }
    catch (e) { setMsg({ ok: false, text: errorText(e) }); }
  }

  if (items.loading) return <Loading />;
  if (items.error) return <ErrorBox message={items.error} onRetry={items.reload} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-berry-soft font-display text-2xl font-bold text-berry" aria-hidden="true">
          {(session?.user.email?.[0] ?? 'V').toUpperCase()}
        </div>
        <div>
          <h1 className="text-[1.65rem] leading-tight md:text-3xl">Mi perfil profesional</h1>
          <p className="text-sm text-muted">{session?.user.email}</p>
        </div>
      </div>

      {busy && <p className="rounded-2xl bg-lake-soft px-4 py-3 text-sm font-semibold text-lake-dark" role="status">{busy}</p>}
      {msg && <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-lake-soft text-lake-dark' : 'bg-terracota-soft text-terracota'}`} role="alert">{msg.text}</p>}

      <div className="card flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lake-soft text-lake"><Icon name="file" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{cvItems.length > 0 ? 'CV cargado' : 'Cargá tu CV'}</p>
          <p className="text-sm text-muted">PDF, Word o texto. No se guarda el archivo, solo lo que Vivia entiende de él.</p>
        </div>
        <button className="btn-soft shrink-0 !px-4" disabled={busy !== null} onClick={() => fileRef.current?.click()}>{cvItems.length > 0 ? 'Actualizar' : 'Elegir archivo'}</button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" aria-label="Archivo del CV" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>

      {cvItems.length > 0 && !hasOwn && (
        <div className="flex flex-col gap-3 rounded-xl2 bg-berry-soft p-5">
          <p className="text-base font-semibold text-ink">Hay información profesional que no aparece en tu CV. ¿Querés agregarla?</p>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={() => setAdding('hablar')}><Icon name="mic" size={20} />Hablar</button>
            <button className="btn-outline flex-1" onClick={() => setAdding('escribir')}>Escribir</button>
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="flex gap-3">
          <button className="btn-outline flex-1" onClick={() => setAdding('escribir')}>Escribir mi experiencia</button>
          <button className="btn-outline flex-1" onClick={() => setAdding('hablar')}><Icon name="mic" size={20} />Contarla hablando</button>
        </div>
      )}

      <div>
        <h2 className="mb-2 px-1 text-lg">Lo que Vivia puede usar</h2>
        <div className="overflow-hidden rounded-xl2 border border-line bg-white">
          {PROFILE_SECTIONS.map((s, idx) => {
            const enabled = !offList.includes(s);
            const rows = grouped[s];
            return (
              <div key={s} className={idx > 0 ? 'border-t border-line' : ''}>
                <div className="flex min-h-[56px] items-center gap-3 px-4">
                  <button className="flex min-h-[44px] flex-1 items-center gap-2 text-left" onClick={() => setOpen(open === s ? null : s)} aria-expanded={open === s}>
                    <span className="flex-1 text-[15px] font-semibold">{SECTION_LABEL[s]}</span>
                    <span className="text-sm text-muted">{rows.length}</span>
                    <Icon name="chevron" size={18} className={`text-muted transition ${open === s ? 'rotate-90' : ''}`} />
                  </button>
                  <button
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Dejar que Vivia use: ${SECTION_LABEL[s]}`}
                    onClick={() => void toggle(s, !enabled)}
                    className={`relative h-7 w-[46px] shrink-0 rounded-full transition ${enabled ? 'bg-berry' : 'bg-[#D9CCD4]'}`}
                  >
                    <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all ${enabled ? 'left-[21px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                {open === s && (
                  <ul className="flex flex-col gap-2 px-4 pb-4">
                    {rows.length === 0 && <li className="text-sm text-muted">Todavía no hay nada acá.</li>}
                    {rows.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 rounded-2xl bg-mist px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold">{i.title}</p>
                          {i.detail && <p className="text-sm text-muted">{i.detail}</p>}
                        </div>
                        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-line" onClick={() => void remove(i.id)} aria-label={`Quitar ${i.title}`}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {list.length > 0 && (
        <div className="flex gap-3">
          <button className="btn-outline flex-1" onClick={() => setAdding('escribir')}>Agregar escribiendo</button>
          <button className="btn-outline flex-1" onClick={() => setAdding('hablar')}><Icon name="mic" size={20} />Agregar hablando</button>
        </div>
      )}

      <Link to="/privacidad" className="card flex min-h-[56px] items-center gap-3 !py-2">
        <span className="text-muted"><Icon name="lock" size={20} /></span>
        <span className="flex-1 text-[15px] font-semibold">Privacidad y datos</span>
        <span className="text-muted"><Icon name="chevron" size={20} /></span>
      </Link>

      <button className="btn-ghost self-start" onClick={() => void signOut()}><Icon name="logout" size={20} />Cerrar sesión</button>

      {adding && (
        <AddPanel
          voice={adding === 'hablar'}
          onClose={() => setAdding(null)}
          onDone={async (m) => { setAdding(null); setMsg(m); await items.reload(); }}
        />
      )}
    </div>
  );
}

function AddPanel({ voice, onClose, onDone }: { voice: boolean; onClose: () => void; onDone: (m: Msg) => Promise<void> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dictated, setDictated] = useState(false);
  const v = useVoice((t) => { setDictated(true); setText((prev) => (prev ? `${prev} ${t}` : t)); });

  useEffect(() => { if (voice && v.supported) v.start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    setBusy(true); setErr(null);
    try {
      v.stop();
      const n = await importFromText(text, dictated ? 'voz' : 'manual');
      await onDone(n > 0 ? { ok: true, text: `Listo: sumé ${n} datos a tu perfil.` } : { ok: false, text: 'No encontré información profesional en lo que contaste.' });
    } catch (e) {
      setErr(errorText(e)); setBusy(false);
    }
  }

  return (
    <Modal title="Sumá a tu perfil" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">Contá tu experiencia, herramientas, proyectos, logros o situaciones difíciles que resolviste. Vivia lo ordena por vos. Para ordenarlo, el texto se envía a la IA.</p>
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label="Lo que querés agregar" placeholder="Por ejemplo: automaticé el control mensual de facturación con una planilla…" />
      {v.interim && <p className="mt-2 text-sm text-muted">{v.interim}</p>}
      {v.error && <p className="mt-2 text-sm text-terracota" role="alert">{v.error}</p>}
      {!v.supported && <p className="mt-2 text-sm text-muted">Este navegador no permite dictar. Escribí el texto.</p>}
      {err && <p className="mt-2 text-sm text-terracota" role="alert">{err}</p>}
      <div className="mt-4 flex gap-3">
        {v.supported && (
          <button className={v.listening ? 'btn-primary' : 'btn-outline'} onClick={() => (v.listening ? v.stop() : v.start())} aria-pressed={v.listening}>
            <Icon name="mic" size={20} />{v.listening ? 'Escuchando…' : 'Hablar'}
          </button>
        )}
        <button className="btn-primary flex-1" disabled={busy || text.trim().length < 10} onClick={() => void save()}>{busy ? 'Un momento…' : 'Agregar a mi perfil'}</button>
      </div>
    </Modal>
  );
}
