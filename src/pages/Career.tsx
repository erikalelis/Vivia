import { useState } from 'react';
import { Empty, ErrorBox, Field, fmtDate, Loading, Modal } from '@/components/ui';
import TaskList from '@/components/TaskList';
import { useLoad } from '@/hooks/useLoad';
import { careerRepo, friendly } from '@/services/api';
import type { CareerItem } from '@/types';

// Estados sugeridos; el campo admite cualquier texto, así que son configurables.
const STATES = ['postulado', 'en contacto', 'entrevista', 'prueba técnica', 'oferta', 'rechazado', 'descartado'];
const KINDS = [{ v: 'postulacion', l: 'Postulación' }, { v: 'recruiter', l: 'Recruiter / contacto' }, { v: 'curso', l: 'Curso' }, { v: 'habilidad', l: 'Habilidad' }, { v: 'objetivo', l: 'Objetivo' }, { v: 'documento', l: 'CV / LinkedIn' }];

export default function Career() {
  const { data, loading, error, reload } = useLoad(() => careerRepo.list());
  const [tab, setTab] = useState<'items' | 'tareas'>('items');
  const [editing, setEditing] = useState<Partial<CareerItem> | null>(null);
  const [kind, setKind] = useState('todas');

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const list = (data ?? []).filter((c) => kind === 'todas' || c.kind === kind);

  return (
    <div>
      <h1 className="page-title">Mi carrera</h1>
      <div className="mb-3 flex gap-2">
        <button className={`chip !px-3 !py-1.5 text-sm ${tab === 'items' ? 'bg-salvia text-white' : 'bg-white text-suave'}`} onClick={() => setTab('items')}>Postulaciones y más</button>
        <button className={`chip !px-3 !py-1.5 text-sm ${tab === 'tareas' ? 'bg-salvia text-white' : 'bg-white text-suave'}`} onClick={() => setTab('tareas')}>Tareas profesionales</button>
      </div>
      {tab === 'tareas' ? <TaskList module="carrera" /> : (
        <>
          <div className="mb-3 flex gap-2">
            <button className="btn-primary" onClick={() => setEditing({ kind: 'postulacion', status: 'postulado' })}>+ Agregar</button>
            <select className="!w-auto" value={kind} onChange={(e) => setKind(e.target.value)}><option value="todas">Todo</option>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select>
          </div>
          {list.length === 0 ? <Empty>Todavía no cargaste nada acá.</Empty> : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {list.map((c) => (
                <li key={c.id}><button className="card w-full text-left" onClick={() => setEditing(c)}>
                  <p className="text-lg">{c.position || c.company || 'Sin título'}</p>
                  <p className="text-sm text-suave">{[c.company, c.modality, c.location].filter(Boolean).join(' · ')}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5"><span className="chip bg-salvia-soft text-salvia-dark">{c.status}</span>
                    {c.applied_on && <span className="chip bg-arena text-suave">{fmtDate(c.applied_on)}</span>}</div>
                  {c.next_action && <p className="mt-1 text-sm">➡️ {c.next_action}</p>}
                </button></li>
              ))}
            </ul>
          )}
        </>
      )}
      {editing && <Form initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function Form({ initial, onClose, onSaved }: { initial: Partial<CareerItem>; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<CareerItem>>(initial);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<CareerItem>) => setV((c) => ({ ...c, ...p }));
  const text = (k: keyof CareerItem, label: string) => <Field label={label}><input value={(v[k] as string) ?? ''} onChange={(e) => set({ [k]: e.target.value } as Partial<CareerItem>)} /></Field>;

  async function save() {
    if (!v.company?.trim() && !v.position?.trim()) { setErr('Completá al menos la empresa o el puesto.'); return; }
    try {
      const { id, user_id, ...rest } = v as CareerItem;
      const payload = { ...rest, applied_on: rest.applied_on || null } as Partial<CareerItem>;
      if (v.id) await careerRepo.update(v.id, payload); else await careerRepo.create(payload);
      onSaved();
    } catch (e) { setErr(friendly(e)); }
  }

  return (
    <Modal title={v.id ? 'Editar' : 'Agregar'} onClose={onClose}>
      <Field label="Tipo"><select value={v.kind ?? 'postulacion'} onChange={(e) => set({ kind: e.target.value })}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</select></Field>
      {text('company', 'Empresa')}
      {text('position', 'Puesto')}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" value={v.applied_on ?? ''} onChange={(e) => set({ applied_on: e.target.value })} /></Field>
        <Field label="Estado"><input list="career-states" value={v.status ?? ''} onChange={(e) => set({ status: e.target.value })} /><datalist id="career-states">{STATES.map((s) => <option key={s} value={s} />)}</datalist></Field>
        {text('salary', 'Salario')}
        {text('modality', 'Modalidad')}
      </div>
      {text('location', 'Ubicación')}
      {text('contact', 'Contacto / recruiter')}
      {text('next_action', 'Próxima acción')}
      <Field label="Notas"><textarea rows={3} value={v.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      {err && <p className="mb-2 text-terracota" role="alert">{err}</p>}
      <div className="flex gap-2">
        {v.id && <button className="btn-danger" onClick={async () => { if (confirm('¿Eliminar?')) { await careerRepo.remove(v.id!); onSaved(); } }}>Eliminar</button>}
        <button className="btn-primary flex-1" onClick={save}>Guardar</button>
      </div>
    </Modal>
  );
}
