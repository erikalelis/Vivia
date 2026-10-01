import { useState } from 'react';
import { Empty, ErrorBox, Field, fmtDate, Loading, Modal, PRIORITY_STYLE } from '@/components/ui';
import { effectiveStatus, filterTasks, nextOccurrence, resolveOverdue, type Recurrence, type TaskFilter } from '@/domain/tasks';
import { useLoad } from '@/hooks/useLoad';
import { friendly, tasksRepo, uploadDocument } from '@/services/api';
import type { ModuleName, Task } from '@/types';

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'hoy', label: 'Hoy' }, { key: 'proximas', label: 'Próximas' }, { key: 'vencidas', label: 'Vencidas' },
  { key: 'semana', label: 'Esta semana' }, { key: 'todas', label: 'Todas' }, { key: 'cerradas', label: 'Cerradas' }
];
const STATUS_LABEL: Record<string, string> = { pendiente: 'Pendiente', en_curso: 'En curso', vencida: '🔴 Vencida', pospuesta: 'Pospuesta', completada: 'Completada', cancelada: 'Cancelada' };

export default function TaskList({ module }: { module?: ModuleName }) {
  const { data, loading, error, reload } = useLoad(async () => {
    const all = await tasksRepo.list();
    return module ? all.filter((t) => t.module === module) : all;
  }, [module]);
  const [filter, setFilter] = useState<TaskFilter>('todas');
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [rescheduling, setRescheduling] = useState<Task | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(friendly(e)); }
  };

  const complete = (t: Task) => run(async () => {
    await tasksRepo.update(t.id, resolveOverdue({ type: 'completar' }) as Partial<Task>);
    // Si es recurrente, se crea la próxima ocurrencia en lugar de perderla.
    if (t.recurrence && t.due_date && ['diaria', 'semanal', 'mensual'].includes(t.recurrence)) {
      const { id, user_id, created_at, completed_at, ...rest } = t;
      await tasksRepo.create({ ...rest, status: 'pendiente', due_date: nextOccurrence(t.due_date, t.recurrence as Recurrence) });
    }
  });

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const tasks = filterTasks(data ?? [], filter);
  const counts = (f: TaskFilter) => filterTasks(data ?? [], f).length;

  return (
    <div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`chip shrink-0 !px-3 !py-1.5 text-sm ${filter === f.key ? 'bg-salvia text-white' : 'bg-white text-suave'}`}>
            {f.label} {f.key === 'vencidas' && counts('vencidas') > 0 && <span className="ml-1 rounded-full bg-terracota px-1.5 text-white">{counts('vencidas')}</span>}
          </button>
        ))}
      </div>
      <button className="btn-primary mb-3 w-full md:w-auto" onClick={() => setEditing({ module: module ?? 'general', priority: 'media' })}>+ Nuevo pendiente</button>
      {actionError && <p className="mb-2 text-terracota" role="alert">{actionError}</p>}

      {tasks.length === 0 ? <Empty>No hay nada en esta lista.</Empty> : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const st = effectiveStatus(t);
            const overdue = st === 'vencida';
            return (
              <li key={t.id} className={`card ${overdue ? 'border-l-4 border-terracota' : ''}`}>
                <div className="flex items-start gap-3">
                  {t.status !== 'completada' && t.status !== 'cancelada' && (
                    <button className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-salvia" aria-label={`Completar ${t.title}`} onClick={() => complete(t)} />
                  )}
                  <div className="min-w-0 flex-1">
                    <button className="text-left text-lg" onClick={() => setEditing(t)}>{t.title}</button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${overdue ? 'bg-terracota-soft text-terracota' : 'bg-arena text-suave'}`}>{STATUS_LABEL[st]}</span>
                      {t.due_date && <span className="chip bg-arena text-suave">{fmtDate(t.due_date)}{t.due_time ? ` ${t.due_time.slice(0, 5)}` : ''}</span>}
                      <span className={`chip ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                      {t.recurrence && <span className="chip bg-arena text-suave">🔁 {t.recurrence}</span>}
                      {t.tags.map((g) => <span key={g} className="chip bg-salvia-soft text-salvia-dark">#{g}</span>)}
                    </div>
                  </div>
                </div>
                {overdue && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-soft !py-1.5 text-sm" onClick={() => run(() => tasksRepo.update(t.id, resolveOverdue({ type: 'mantener' }) as Partial<Task>))}>Mantener pendiente</button>
                    <button className="btn-soft !py-1.5 text-sm" onClick={() => setRescheduling(t)}>Reprogramar</button>
                    <button className="btn-soft !py-1.5 text-sm" onClick={() => complete(t)}>Completada</button>
                    <button className="btn-danger !py-1.5 text-sm" onClick={() => run(() => tasksRepo.update(t.id, resolveOverdue({ type: 'cancelar' }) as Partial<Task>))}>Cancelar</button>
                  </div>
                )}
                {(t.status === 'completada' || t.status === 'cancelada') && (
                  <button className="btn-ghost mt-2 !py-1 text-sm" onClick={() => run(() => tasksRepo.update(t.id, { status: 'pendiente', completed_at: null } as Partial<Task>))}>Reabrir</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && <TaskForm initial={editing} fixedModule={module} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {rescheduling && (
        <Modal title="Reprogramar" onClose={() => setRescheduling(null)}>
          <RescheduleForm onSubmit={(date, time) => run(async () => { await tasksRepo.update(rescheduling.id, resolveOverdue({ type: 'reprogramar', due_date: date, due_time: time }) as Partial<Task>); setRescheduling(null); })} />
        </Modal>
      )}
    </div>
  );
}

function RescheduleForm({ onSubmit }: { onSubmit: (date: string, time: string | null) => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (date) onSubmit(date, time || null); }}>
      <Field label="Nueva fecha"><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Hora (opcional)"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      <button className="btn-primary w-full">Reprogramar</button>
    </form>
  );
}

function TaskForm({ initial, fixedModule, onClose, onSaved }: { initial: Partial<Task>; fixedModule?: ModuleName; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Task>>(initial);
  const [tags, setTags] = useState((initial.tags ?? []).join(', '));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Task>) => setV((c) => ({ ...c, ...p }));

  async function save() {
    if (!v.title?.trim()) { setErr('Escribí un título.'); return; }
    setBusy(true); setErr(null);
    try {
      const payload: Partial<Task> = {
        title: v.title.trim(), description: v.description ?? null, notes: v.notes ?? null, priority: v.priority ?? 'media',
        module: fixedModule ?? v.module ?? 'general', due_date: v.due_date || null, due_time: v.due_time || null,
        recurrence: v.recurrence || null, status: v.status ?? 'pendiente',
        tags: tags.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean)
      };
      const saved = v.id ? await tasksRepo.update(v.id, payload) : await tasksRepo.create(payload);
      if (file) await uploadDocument(file, { module: payload.module!, category: 'adjunto', related_type: 'task', related_id: saved.id });
      onSaved();
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }

  return (
    <Modal title={v.id ? 'Editar pendiente' : 'Nuevo pendiente'} onClose={onClose}>
      <Field label="¿Qué hay que hacer?"><input value={v.title ?? ''} onChange={(e) => set({ title: e.target.value })} autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input type="date" value={v.due_date ?? ''} onChange={(e) => set({ due_date: e.target.value })} /></Field>
        <Field label="Hora"><input type="time" value={v.due_time?.slice(0, 5) ?? ''} onChange={(e) => set({ due_time: e.target.value })} /></Field>
        <Field label="Prioridad">
          <select value={v.priority ?? 'media'} onChange={(e) => set({ priority: e.target.value as Task['priority'] })}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select>
        </Field>
        <Field label="Se repite">
          <select value={v.recurrence ?? ''} onChange={(e) => set({ recurrence: e.target.value || null })}><option value="">No</option><option value="diaria">Todos los días</option><option value="semanal">Cada semana</option><option value="mensual">Cada mes</option></select>
        </Field>
      </div>
      {!fixedModule && (
        <Field label="Módulo">
          <select value={v.module ?? 'general'} onChange={(e) => set({ module: e.target.value as ModuleName })}><option value="general">General</option><option value="mia">Mia</option><option value="carrera">Carrera</option><option value="proyectos">Proyectos</option></select>
        </Field>
      )}
      <Field label="Etiquetas (separadas por coma)"><input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
      <Field label="Notas"><textarea rows={3} value={v.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
      <Field label="Adjuntar archivo"><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      {err && <p className="mb-2 text-terracota" role="alert">{err}</p>}
      <div className="flex gap-2">
        {v.id && <button className="btn-danger" disabled={busy} onClick={async () => { if (confirm('¿Eliminar este pendiente definitivamente?')) { await tasksRepo.remove(v.id!); onSaved(); } }}>Eliminar</button>}
        <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}
