export type TaskStatus = 'pendiente' | 'en_curso' | 'vencida' | 'pospuesta' | 'completada' | 'cancelada';

export interface TaskLike {
  status: TaskStatus;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM[:SS]
}

export const CLOSED: TaskStatus[] = ['completada', 'cancelada'];
export const isClosed = (t: Pick<TaskLike, 'status'>) => CLOSED.includes(t.status);

/** Fecha y hora "de pared" en Buenos Aires. */
export function nowInBuenosAires(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/**
 * Estado que se MUESTRA. "Vencida" se calcula: una tarea abierta cuya fecha ya pasó
 * (o cuya hora de hoy ya pasó) sigue en la lista, marcada como vencida. Nunca se borra.
 */
export function effectiveStatus(t: TaskLike, now: Date = new Date()): TaskStatus {
  if (isClosed(t)) return t.status;
  if (!t.due_date) return t.status === 'vencida' ? 'pendiente' : t.status;
  const { date, time } = nowInBuenosAires(now);
  const overdue =
    t.due_date < date || (t.due_date === date && !!t.due_time && t.due_time.slice(0, 5) < time);
  return overdue ? 'vencida' : t.status === 'vencida' ? 'pendiente' : t.status;
}

export type TaskFilter = 'hoy' | 'proximas' | 'vencidas' | 'semana' | 'todas' | 'cerradas';

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function filterTasks<T extends TaskLike>(tasks: T[], filter: TaskFilter, now: Date = new Date()): T[] {
  const { date: today } = nowInBuenosAires(now);
  const weekEnd = addDays(today, 7);
  const active = tasks.filter((t) => !isClosed(t));
  switch (filter) {
    case 'hoy': return active.filter((t) => t.due_date === today && effectiveStatus(t, now) !== 'vencida');
    case 'proximas': return active.filter((t) => !!t.due_date && t.due_date > today);
    case 'vencidas': return active.filter((t) => effectiveStatus(t, now) === 'vencida');
    case 'semana': return active.filter((t) => !!t.due_date && t.due_date >= today && t.due_date <= weekEnd);
    case 'cerradas': return tasks.filter(isClosed);
    case 'todas': return active; // todas las ACTIVAS: incluye vencidas
  }
}

export type OverdueAction =
  | { type: 'mantener' }
  | { type: 'reprogramar'; due_date: string; due_time?: string | null }
  | { type: 'completar' }
  | { type: 'cancelar' };

/** Cambios a guardar según lo que elija la persona frente a una tarea vencida. */
export function resolveOverdue(action: OverdueAction, now: Date = new Date()) {
  switch (action.type) {
    case 'mantener': return { status: 'pendiente' as TaskStatus };
    case 'reprogramar': return { status: 'pospuesta' as TaskStatus, due_date: action.due_date, due_time: action.due_time ?? null };
    case 'completar': return { status: 'completada' as TaskStatus, completed_at: now.toISOString() };
    case 'cancelar': return { status: 'cancelada' as TaskStatus };
  }
}

export type Recurrence = 'diaria' | 'semanal' | 'mensual';

/** Próxima fecha de una tarea recurrente (YYYY-MM-DD). Mensual conserva el día, ajustando a fin de mes. */
export function nextOccurrence(date: string, rec: Recurrence): string {
  if (rec === 'diaria') return addDays(date, 1);
  if (rec === 'semanal') return addDays(date, 7);
  const [y, m, d] = date.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
