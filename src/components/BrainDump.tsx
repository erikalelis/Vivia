import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui';
import { missingForSave, type Clarification, type InterpretedItem } from '@/domain/interpret';
import { useVoice } from '@/hooks/useVoice';
import { ai, AiNotAvailableError } from '@/services/ai';
import { saveInterpretedItems } from '@/services/brain';

/** "Contale a VIVIA": escribir o hablar → la IA ordena → la persona confirma → se guarda. */
export default function BrainDump({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InterpretedItem[] | null>(null);
  const [questions, setQuestions] = useState<Clarification[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const textRef = useRef(text);
  textRef.current = text;

  const voice = useVoice((t) => setText((prev) => (prev ? `${prev} ${t}` : t)));
  useEffect(() => { if (voice.error) setError(voice.error); }, [voice.error]);

  async function interpret() {
    if (!text.trim()) return;
    voice.stop();
    setBusy(true); setError(null);
    try {
      const r = await ai.interpretText(text);
      if (r.items.length === 0) {
        setError(r.clarifications[0]?.question ?? 'No estoy segura de qué querés hacer. ¿Querés crear una tarea, un evento o guardar una nota?');
        return;
      }
      setItems(r.items); setQuestions(r.clarifications); setProblems(r.problems);
    } catch (e) {
      setError(e instanceof AiNotAvailableError ? e.message : 'No pude interpretar lo que escribiste. Intentá de nuevo.');
    } finally { setBusy(false); }
  }

  const answer = (q: Clarification, option: string) => {
    setItems((cur) => cur && cur.map((it, i) => {
      if (i !== q.itemIndex) return it;
      const o = option.toLowerCase();
      if (o.includes('evento') || o.includes('agenda')) return { ...it, kind: 'evento' };
      if (o.includes('pendiente') || o.includes('tarea')) return { ...it, kind: 'tarea' };
      if (o.includes('nota')) return { ...it, kind: 'nota' };
      return it;
    }));
    setQuestions((qs) => qs.filter((x) => x !== q));
  };

  const update = (i: number, patch: Partial<InterpretedItem>) => setItems((cur) => cur && cur.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const blocking = items?.map(missingForSave) ?? [];
  const canSave = items && questions.length === 0 && blocking.every((b) => !b);

  async function save() {
    if (!items) return;
    setBusy(true); setError(null);
    try { await saveInterpretedItems(items); onSaved(); onClose(); }
    catch { setError('No pude guardar. Tu texto sigue acá: intentá de nuevo.'); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Contale a VIVIA" onClose={onClose}>
      {!items ? (
        <>
          <p className="mb-2 text-sm text-suave">Contame lo que tenés en mente, escribiendo o hablando. Yo lo ordeno por vos.</p>
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: El viernes tengo que llamar al colegio y el sábado comprar el regalo de Mia." />
          {voice.interim && <p className="mt-1 text-sm italic text-suave">{voice.interim}…</p>}
          {error && <p className="mt-2 text-terracota" role="alert">{error}</p>}
          <div className="mt-3 flex gap-2">
            {voice.supported ? (
              <button className={voice.listening ? 'btn-danger flex-1' : 'btn-soft flex-1'} onClick={voice.listening ? voice.stop : voice.start}>
                {voice.listening ? 'Detener' : 'Hablar'}
              </button>
            ) : <p className="flex-1 self-center text-xs text-suave">Tu navegador no permite dictado por voz; podés escribir.</p>}
            <button className="btn-primary flex-1" disabled={busy || !text.trim()} onClick={interpret}>{busy ? 'Ordenando…' : 'Ordenar'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm text-suave">Esto es lo que entendí. Revisalo y confirmá.</p>
          {problems.length > 0 && <p className="mb-2 text-xs text-terracota">{problems.join(' ')}</p>}
          <ul className="space-y-3">
            {items.map((it, i) => (
              <li key={i} className="card">
                <input value={it.title} onChange={(e) => update(i, { title: e.target.value })} aria-label="Título" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select value={it.kind} onChange={(e) => update(i, { kind: e.target.value as InterpretedItem['kind'] })} aria-label="Tipo">
                    <option value="tarea">Pendiente</option><option value="evento">Evento de agenda</option><option value="nota">Nota</option>
                  </select>
                  <select value={it.module} onChange={(e) => update(i, { module: e.target.value as InterpretedItem['module'] })} aria-label="Módulo">
                    <option value="general">General</option><option value="mia">Mia</option><option value="carrera">Carrera</option><option value="proyectos">Proyectos</option>
                  </select>
                  <input type="date" value={it.date ?? ''} onChange={(e) => update(i, { date: e.target.value || null })} aria-label="Fecha" />
                  <input type="time" value={it.time ?? ''} onChange={(e) => update(i, { time: e.target.value || null })} aria-label="Hora" />
                </div>
                {it.reminderDate && <p className="mt-1 text-xs text-suave">🔔 Recordatorio: {it.reminderDate}</p>}
                {blocking[i] && <p className="mt-1 text-xs text-terracota">{blocking[i]}</p>}
              </li>
            ))}
          </ul>
          {questions.map((q, k) => (
            <div key={k} className="card mt-3 border border-salvia-soft">
              <p className="mb-2">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {(q.options.length ? q.options : ['Evento de agenda', 'Pendiente']).map((o) => <button key={o} className="btn-soft" onClick={() => answer(q, o)}>{o}</button>)}
              </div>
            </div>
          ))}
          {error && <p className="mt-2 text-terracota" role="alert">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setItems(null)}>Volver</button>
            <button className="btn-primary flex-1" disabled={!canSave || busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar todo'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
