import { useState } from 'react';
import { Empty, ErrorBox, Field, fmtDate, Loading, Modal, PRIORITY_STYLE } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { friendly, projectsRepo, tasksRepo } from '@/services/api';
import type { Project } from '@/types';

const STATES: { v: Project['status']; l: string }[] = [
  { v: 'idea', l: 'Idea' }, { v: 'planificado', l: 'Planificado' }, { v: 'en_desarrollo', l: 'En desarrollo' },
  { v: 'prueba', l: 'Prueba' }, { v: 'publicado', l: 'Publicado' }, { v: 'pausado', l: 'Pausado' }, { v: 'finalizado', l: 'Finalizado' }
];

export default function Projects() {
  const { data, loading, error, reload } = useLoad(async () => ({ projects: await projectsRepo.list(), tasks: await tasksRepo.list() }));
  const [editing, setEditing] = useState<Partial<Project> | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'No pude cargar los proyectos.'} onRetry={reload} />;

  return (
    <div>
      <h1 className="page-title">Mis proyectos</h1>
      <button className="btn-primary mb-3" onClick={() => setEditing({ status: 'idea', priority: 'media', links: [] })}>+ Nuevo proyecto</button>
      {data.projects.length === 0 ? <Empty>Todavía no tenés proyectos. Empezá con una idea.</Empty> : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.projects.map((p) => {
            const mine = data.tasks.filter((t) => t.project_id === p.id);
            const done = mine.filter((t) => t.status === 'completada').length;
            return (
              <li key={p.id}><button className="card w-full text-left" onClick={() => setEditing(p)}>
                <p className="text-lg">{p.name}</p>
                <div className="my-1 flex flex-wrap gap-1.5">
                  <span className="chip bg-salvia-soft text-salvia-dark">{STATES.find((s) => s.v === p.status)?.l}</span>
                  <span className={`chip ${PRIORITY_STYLE[p.priority]}`}>{p.priority}</span>
                  {p.due_date && <span className="chip bg-arena text-suave">{fmtDate(p.due_date)}</span>}
                </div>
                {p.next_steps && <p className="text-sm">➡️ {p.next_steps}</p>}
                {mine.length > 0 && <p className="text-xs text-suave">{done}/{mine.length} tareas completadas</p>}
              </button></li>
            );
          })}
        </ul>
      )}
      {editing && <Form initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function Form({ initial, onClose, onSaved }: { initial: Partial<Project>; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Project>>(initial);
  const [links, setLinks] = useState((initial.links ?? []).map((l) => `${l.label ? l.label + ' | ' : ''}${l.url}`).join('\n'));
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Project>) => setV((c) => ({ ...c, ...p }));

  async function save() {
    if (!v.name?.trim()) { setErr('Ponele un nombre al proyecto.'); return; }
    const parsed = links.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, b] = l.split('|').map((x) => x.trim()); return b ? { label: a, url: b } : { label: '', url: a }; });
    if (parsed.some((l) => !/^https?:\/\//i.test(l.url))) { setErr('Los links deben empezar con http:// o https://'); return; }
    try {
      const payload = { name: v.name.trim(), description: v.description ?? null, status: v.status ?? 'idea', priority: v.priority ?? 'media', due_date: v.due_date || null, links: parsed, notes: v.notes ?? null, next_steps: v.next_steps ?? null };
      if (v.id) await projectsRepo.update(v.id, payload); else await projectsRepo.create(payload);
      onSaved();
    } catch (e) { setErr(friendly(e)); }
  }

  return (
    <Modal title={v.id ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <Field label="Nombre"><input value={v.name ?? ''} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
      <Field label="Descripción"><textarea rows={2} value={v.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado"><select value={v.status} onChange={(e) => set({ status: e.target.value as Project['status'] })}>{STATES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></Field>
        <Field label="Prioridad"><select value={v.priority} onChange={(e) => set({ priority: e.target.value as Project['priority'] })}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></Field>
      </div>
      <Field label="Fecha objetivo"><input type="date" value={v.due_date ?? ''} onChange={(e) => set({ due_date: e.target.value })} /></Field>
      <Field label="Próximos pasos"><textarea rows={2} value={v.next_steps ?? ''} onChange={(e) => set({ next_steps: e.target.value })} /></Field>
      <Field label="Links (uno por línea: «Nombre | https://…»)"><textarea rows={2} value={links} onChange={(e) => setLinks(e.target.value)} /></Field>
      <Field label="Notas"><textarea rows={3} value={v.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      {err && <p className="mb-2 text-terracota" role="alert">{err}</p>}
      <div className="flex gap-2">
        {v.id && <button className="btn-danger" onClick={async () => { if (confirm('¿Eliminar este proyecto?')) { await projectsRepo.remove(v.id!); onSaved(); } }}>Eliminar</button>}
        <button className="btn-primary flex-1" onClick={save}>Guardar</button>
      </div>
    </Modal>
  );
}
