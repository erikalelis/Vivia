import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveStatus, filterTasks, resolveOverdue, type TaskLike } from './tasks.ts';

// 2026-10-01 12:00 hora de Buenos Aires = 15:00 UTC
const NOW = new Date('2026-10-01T15:00:00Z');
const mk = (o: Partial<TaskLike> & { id?: string }): TaskLike & { id?: string } =>
  ({ status: 'pendiente', due_date: null, due_time: null, ...o });

test('una tarea vencida NO desaparece: sigue en "Todas" y "Vencidas"', () => {
  const t = mk({ id: 'regalo', due_date: '2026-09-30' });
  assert.equal(effectiveStatus(t, NOW), 'vencida');
  assert.ok(filterTasks([t], 'vencidas', NOW).includes(t));
  assert.ok(filterTasks([t], 'todas', NOW).includes(t));
  assert.ok(!filterTasks([t], 'hoy', NOW).includes(t));
});

test('vencida también si hoy y la hora ya pasó; no si todavía falta', () => {
  assert.equal(effectiveStatus(mk({ due_date: '2026-10-01', due_time: '09:00' }), NOW), 'vencida');
  assert.equal(effectiveStatus(mk({ due_date: '2026-10-01', due_time: '18:00' }), NOW), 'pendiente');
  assert.equal(effectiveStatus(mk({ due_date: '2026-10-01' }), NOW), 'pendiente');
});

test('solo sale de la lista activa al completar o cancelar', () => {
  const done = mk({ status: 'completada', due_date: '2026-09-01' });
  const canceled = mk({ status: 'cancelada', due_date: '2026-09-01' });
  const open = mk({ status: 'pospuesta', due_date: '2026-09-01' });
  const all = filterTasks([done, canceled, open], 'todas', NOW);
  assert.deepEqual(all, [open]);
  assert.equal(filterTasks([done, canceled, open], 'cerradas', NOW).length, 2);
});

test('tarea completada o cancelada nunca pasa a vencida', () => {
  assert.equal(effectiveStatus(mk({ status: 'completada', due_date: '2020-01-01' }), NOW), 'completada');
});

test('reprogramar deja la tarea pospuesta con nueva fecha (y deja de estar vencida)', () => {
  const patch = resolveOverdue({ type: 'reprogramar', due_date: '2026-10-05' }, NOW);
  assert.equal(patch.status, 'pospuesta');
  const t = mk({ ...patch });
  assert.equal(effectiveStatus(t, NOW), 'pospuesta');
});

test('acciones sobre vencidas: completar, cancelar, mantener', () => {
  assert.equal(resolveOverdue({ type: 'completar' }, NOW).status, 'completada');
  assert.equal(resolveOverdue({ type: 'cancelar' }, NOW).status, 'cancelada');
  assert.equal(resolveOverdue({ type: 'mantener' }, NOW).status, 'pendiente');
});

test('filtros hoy / próximas / esta semana', () => {
  const hoy = mk({ due_date: '2026-10-01', due_time: '20:00' });
  const manana = mk({ due_date: '2026-10-02' });
  const lejos = mk({ due_date: '2026-11-20' });
  assert.deepEqual(filterTasks([hoy, manana, lejos], 'hoy', NOW), [hoy]);
  assert.deepEqual(filterTasks([hoy, manana, lejos], 'proximas', NOW), [manana, lejos]);
  assert.deepEqual(filterTasks([hoy, manana, lejos], 'semana', NOW), [hoy, manana]);
});

import { nextOccurrence } from './tasks.ts';
test('recurrencia: diaria, semanal y mensual (con fin de mes)', () => {
  assert.equal(nextOccurrence('2026-10-01', 'diaria'), '2026-10-02');
  assert.equal(nextOccurrence('2026-10-30', 'semanal'), '2026-11-06');
  assert.equal(nextOccurrence('2026-01-31', 'mensual'), '2026-02-28');
  assert.equal(nextOccurrence('2026-12-15', 'mensual'), '2027-01-15');
});
