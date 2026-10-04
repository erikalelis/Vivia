import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useBack } from '@/hooks/useBack';
import { useVoice } from '@/hooks/useVoice';
import { friendly } from '@/services/api';
import { AiNotAvailableError } from '@/services/ai';
import { ProfileError } from '@/services/profile';
import { answerQuestion, prepareInterview } from '@/services/interview';
import type { InterviewAnswer, InterviewPrep } from '@/domain/interview';
import EntrevistaVivo from '@/pages/EntrevistaVivo';

const errorText = (e: unknown) => (e instanceof ProfileError || e instanceof AiNotAvailableError ? e.message : friendly(e));

function AnswerCard({ a, title }: { a: { short: string; full: string }; title?: string }) {
  const [more, setMore] = useState(false);
  return (
    <div className="card flex flex-col gap-3">
      {title && <p className="text-sm font-bold text-berry">{title}</p>}
      <p className="text-[1.35rem] font-semibold leading-snug text-ink">{a.short}</p>
      {a.full !== a.short && (
        <>
          <button className="btn-ghost self-start !px-0 text-berry" onClick={() => setMore(!more)} aria-expanded={more}>{more ? 'Ver menos' : 'Ver respuesta completa'}</button>
          {more && <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">{a.full}</p>}
        </>
      )}
    </div>
  );
}

export default function Entrevista() {
  const goBack = useBack();
  const [tab, setTab] = useState<'preparar' | 'pregunta' | 'vivo'>('preparar');
  const [vacancy, setVacancy] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<InterviewAnswer | null>(null);
  const [blank, setBlank] = useState(false);
  const v = useVoice((t) => setQuestion((p) => (p ? `${p} ${t}` : t)));

  async function doPrep() {
    setBusy('Analizando la vacante con tu perfil…'); setErr(null);
    try { setPrep(await prepareInterview(vacancy, file)); }
    catch (e) { setErr(errorText(e)); }
    finally { setBusy(null); }
  }

  async function doAnswer(isBlank: boolean) {
    v.stop(); setBusy('Armando tu respuesta…'); setErr(null); setBlank(isBlank);
    try { setAnswer(await answerQuestion(question, vacancy, isBlank)); }
    catch (e) { setErr(errorText(e)); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" onClick={goBack} aria-label="Volver al inicio"><Icon name="back" /></button>
        <h1 className="text-2xl md:text-3xl">Entrevista</h1>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-line p-1" role="tablist">
        {([['preparar', 'Preparar'], ['pregunta', 'Pregunta'], ['vivo', 'En vivo']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-[44px] rounded-full px-3 text-sm font-bold transition ${tab === k ? 'bg-white text-berry shadow-calma' : 'text-muted'}`}>{label}</button>
        ))}
      </div>

      {busy && <p className="rounded-2xl bg-lake-soft px-4 py-3 text-sm font-semibold text-lake-dark" role="status">{busy}</p>}
      {err && (
        <p className="rounded-2xl bg-terracota-soft px-4 py-3 text-sm font-semibold text-terracota" role="alert">
          {err} {/CV|perfil/i.test(err) && <Link to="/perfil" className="underline">Ir a Mi perfil</Link>}
        </p>
      )}

      {tab === 'preparar' && (
        <>
          <div className="card flex flex-col gap-3">
            <label htmlFor="vac" className="font-bold">La vacante</label>
            <textarea id="vac" rows={6} value={vacancy} onChange={(e) => setVacancy(e.target.value)} placeholder="Pegá acá el aviso del puesto…" />
            <div className="flex items-center gap-3">
              <button className="btn-outline !min-h-[44px]" onClick={() => fileRef.current?.click()}>{file ? 'Cambiar archivo' : 'O subir un archivo'}</button>
              {file && <span className="truncate text-sm text-muted">{file.name}</span>}
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" aria-label="Archivo de la vacante" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <button className="btn-primary" disabled={busy !== null || (!vacancy.trim() && !file)} onClick={() => void doPrep()}>Preparar mi entrevista</button>
          </div>

          {prep && (
            <div className="flex flex-col gap-5">
              <div className="card flex flex-col gap-2">
                <p className="text-sm font-bold text-berry">{prep.company ? `${prep.role} · ${prep.company}` : prep.role}</p>
                <p className="text-[15px] text-muted">{prep.summary}</p>
              </div>
              {prep.strengths.length > 0 && (
                <div className="card flex flex-col gap-2">
                  <p className="font-bold">Lo tuyo que encaja</p>
                  <ul className="flex flex-col gap-1.5 text-[15px] text-muted">{prep.strengths.map((s) => <li key={s}>✓ {s}</li>)}</ul>
                </div>
              )}
              {prep.gaps.length > 0 && (
                <div className="card flex flex-col gap-3">
                  <p className="font-bold">Lo que pueden preguntarte y cómo manejarlo</p>
                  {prep.gaps.map((g) => (
                    <div key={g.gap}><p className="text-[15px] font-semibold">{g.gap}</p><p className="text-sm text-muted">{g.how}</p></div>
                  ))}
                </div>
              )}
              <h2 className="px-1 text-lg">Preguntas probables</h2>
              {prep.questions.map((q) => <AnswerCard key={q.q} title={q.q} a={q} />)}
            </div>
          )}
        </>
      )}

      {tab === 'pregunta' && (
        <>
          <div className="card flex flex-col gap-3">
            <label htmlFor="preg" className="font-bold">La pregunta que te hicieron</label>
            <textarea id="preg" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Escribila o dictala…" />
            {v.interim && <p className="text-sm text-muted">{v.interim}</p>}
            {v.error && <p className="text-sm text-terracota" role="alert">{v.error}</p>}
            <div className="flex gap-3">
              {v.supported && (
                <button className={v.listening ? 'btn-primary' : 'btn-outline'} onClick={() => (v.listening ? v.stop() : v.start())} aria-pressed={v.listening}>
                  <Icon name="mic" size={20} />{v.listening ? 'Escuchando…' : 'Dictar'}
                </button>
              )}
              <button className="btn-primary flex-1" disabled={busy !== null || question.trim().length < 3} onClick={() => void doAnswer(false)}>Responder</button>
            </div>
            <button className="btn-soft" disabled={busy !== null || question.trim().length < 3} onClick={() => void doAnswer(true)}>Me quedé en blanco</button>
          </div>
          {vacancy.trim() === '' && <p className="px-1 text-sm text-muted">Tip: si antes pegás la vacante en “Preparar”, las respuestas se adaptan al puesto.</p>}
          {answer && (
            <div className="flex flex-col gap-4">
              {blank && answer.bridge.length > 0 && (
                <div className="card flex flex-col gap-2 !bg-lake-soft">
                  <p className="text-sm font-bold text-lake-dark">Para ganar unos segundos, decí:</p>
                  {answer.bridge.map((b) => <p key={b} className="text-lg font-semibold text-lake-dark">“{b}”</p>)}
                </div>
              )}
              <AnswerCard a={answer} />
            </div>
          )}
        </>
      )}
      {tab === 'vivo' && <EntrevistaVivo vacancy={vacancy} />}
      <p className="px-1 text-xs text-muted">Las respuestas se arman con tu perfil real. Revisalas y decilas con tus palabras.</p>
    </div>
  );
}
