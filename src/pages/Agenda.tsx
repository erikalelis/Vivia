import { useMemo, useState } from 'react';
import { Empty, ErrorBox, Field, Loading, Modal } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { eventsRepo, friendly } from '@/services/api';
import type { AppEvent, ModuleName } from '@/types';

type View = 'dia' | 'semana' | 'mes';
const TZ = 'America/Argentina/Buenos_Aires';
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const timeOf = (e: AppEvent) => e.all_day ? 'Todo el día' : new Date(e.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const KINDS = ['evento', 'turno', 'reunión', 'cumpleaños', 'actividad', 'fecha escolar', 'recordatorio'];

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Agenda({ module }: { module?: ModuleName }) {
  const { data, loading, error, reload } = useLoad(async () => {
    const all = await eventsRepo.list();
    return module ? all.filter((e) => e.module === module) : all;
  }, [module]);
  const [view, setView] = useState<View>('semana');
  const [cursor, setCursor] = useState(() => new Date());
  const [editing, setEditing] = useState<Partial<AppEvent> | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, AppEvent[]>();
    (data ?? []).forEach((e) => { const k = dayKey(e.starts_at); m.set(k, [...(m.get(k) ?? []), e]); });
    return m;
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const todayKey = ymd(new Date());
  const range: Date[] = (() => {
    if (view === 'dia') return [cursor];
    if (view === 'semana') { const start = addDays(cursor, -((cursor.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  })();
  const step = (dir: number) => setCursor((c) => view === 'mes' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (view === 'semana' ? 7 : 1)));
  const title = cursor.toLocaleDateString('es-AR', view === 'dia' ? { weekday: 'long', day: 'numeric', month: 'long' } : { month: 'long', year: 'numeric' });
  const newAt = (d: Date) => setEditing({ module: module ?? 'general', kind: 'evento', starts_at: new Date(`${ymd(d)}T09:00:00-03:00`).toISOString(), all_day: false });

  const evList = (d: Date) => (
    <ul className="space-y-1">
      {(byDay.get(ymd(d)) ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map((e) => (
        <li key={e.id}><button className="w-full rounded-lg bg-salvia-soft px-2 py-1 text-left text-sm text-salvia-dark" onClick={() => setEditing(e)}>
          <span className="text-xs text-suave">{timeOf(e)} </span>{e.title}</button></li>
      ))}
    </ul>
  );

  return (
    <div>
      {!module && <h1 className="page-title">Agenda</h1>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">{(['dia', 'semana', 'mes'] as View[]).map((v) => (
          <button key={v} className={`chip !px-3 !py-1.5 text-sm ${view === v ? 'bg-salvia text-white' : 'bg-white text-suave'}`} onClick={() => setView(v)}>{v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}</button>
        ))}</div>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost !px-3" onClick={() => step(-1)} aria-label="Anterior">‹</button>
          <button className="btn-ghost !px-3" onClick={() => setCursor(new Date())}>Hoy</button>
          <button className="btn-ghost !px-3" onClick={() => step(1)} aria-label="Siguiente">›</button>
        </div>
      </div>
      <p className="mb-3 text-lg capitalize">{title}</p>
      <button className="btn-primary mb-3 w-full md:w-auto" onClick={() => newAt(cursor)}>+ Nuevo evento</button>

      {view === 'mes' ? (
        <div className="grid grid-cols-7 gap-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-center text-xs text-suave">{d}</div>)}
          {range.map((d) => {
            const k = ymd(d); const items = byDay.get(k) ?? [];
            return (
              <button key={k} onClick={() => { setCursor(d); setView('dia'); }}
                className={`min-h-[3.5rem] rounded-lg p-1 text-left text-xs md:min-h-[5.5rem] ${d.getMonth() !== cursor.getMonth() ? 'opacity-40' : ''} ${k === todayKey ? 'bg-salvia-soft' : 'bg-white'}`}>
                <span className="font-medium">{d.getDate()}</span>
                {items.slice(0, 2).map((e) => <span key={e.id} className="mt-0.5 hidden truncate rounded bg-salvia/20 px-1 md:block">{e.title}</span>)}
                {items.length > 0 && <span className="mt-0.5 block h-1.5 w-1.5 rounded-full bg-salvia md:hidden" />}
                {items.length > 2 && <span className="hidden text-suave md:block">+{items.length - 2}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={view === 'semana' ? 'grid gap-2 md:grid-cols-7' : ''}>
          {range.map((d) => (
            <div key={ymd(d)} className={`card ${ymd(d) === todayKey ? 'ring-2 ring-salvia-soft' : ''}`}>
              <p className="mb-1 text-sm capitalize text-suave">{d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}</p>
              {(byDay.get(ymd(d)) ?? []).length === 0 ? <p className="text-xs text-suave">—</p> : evList(d)}
            </div>
          ))}
        </div>
      )}
      {data?.length === 0 && <Empty>Todavía no hay eventos. Creá uno o decíselo a VIVIA con el botón del micrófono.</Empty>}

      {editing && <EventForm initial={editing} fixedModule={module} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function EventForm({ initial, fixedModule, onClose, onSaved }: { initial: Partial<AppEvent>; fixedModule?: ModuleName; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Partial<AppEvent>>(initial);
  const [err, setErr] = useState<string | null>(null);
  const local = (iso?: string | null) => iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 16) : '';
  const set = (p: Partial<AppEvent>) => setV((c) => ({ ...c, ...p }));

  async function save() {
    if (!v.title?.trim() || !v.starts_at) { setErr('Completá el título y la fecha.'); return; }
    try {
      const payload = { title: v.title.trim(), description: v.description ?? null, kind: v.kind ?? 'evento', module: fixedModule ?? v.module ?? 'general', starts_at: v.starts_at, ends_at: v.ends_at ?? null, all_day: v.all_day ?? false, location: v.location ?? null, recurrence: v.recurrence ?? null };
      if (v.id) await eventsRepo.update(v.id, payload); else await eventsRepo.create(payload);
      onSaved();
    } catch (e) { setErr(friendly(e)); }
  }

  return (
    <Modal title={v.id ? 'Editar evento' : 'Nuevo evento'} onClose={onClose}>
      <Field label="Título"><input value={v.title ?? ''} onChange={(e) => set({ title: e.target.value })} autoFocus /></Field>
      <Field label="Tipo"><select value={v.kind ?? 'evento'} onChange={(e) => set({ kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
      <Field label="Cuándo"><input type="datetime-local" value={local(v.starts_at)} onChange={(e) => e.target.value && set({ starts_at: new Date(`${e.target.value}:00-03:00`).toISOString() })} /></Field>
      <label className="mb-3 flex items-center gap-2 text-tinta"><input type="checkbox" className="!w-auto" checked={v.all_day ?? false} onChange={(e) => set({ all_day: e.target.checked })} /> Todo el día</label>
      <Field label="Lugar"><input value={v.location ?? ''} onChange={(e) => set({ location: e.target.value })} /></Field>
      <Field label="Notas"><textarea rows={2} value={v.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></Field>
      {err && <p className="mb-2 text-terracota" role="alert">{err}</p>}
      <div className="flex gap-2">
        {v.id && <button className="btn-danger" onClick={async () => { if (confirm('¿Eliminar este evento?')) { await eventsRepo.remove(v.id!); onSaved(); } }}>Eliminar</button>}
        <button className="btn-primary flex-1" onClick={save}>Guardar</button>
      </div>
    </Modal>
  );
}
