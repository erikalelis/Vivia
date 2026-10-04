import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, formatMinutes, validateMeeting } from './meeting.ts';

test('validateMeeting limpia tareas y exige contenido', () => {
  assert.equal(validateMeeting({}), null);
  const m = validateMeeting({ language: 'pt', summary: 'Se habló del cierre.', transcript: 'x', decisions: ['Cerrar el viernes', ''], tasks: [{ task: 'Enviar reporte', owner: 'Ana' }, { owner: 'sin tarea' }] });
  assert.equal(m!.language, 'pt');
  assert.deepEqual(m!.decisions, ['Cerrar el viernes']);
  assert.equal(m!.tasks.length, 1);
  assert.equal(m!.tasks[0].due, null);
});

test('formatMinutes incluye solo las secciones con datos', () => {
  const t = formatMinutes({ language: 'es', transcript: '', summary: 'Resumen', decisions: [], tasks: [{ task: 'Llamar', owner: 'Eri', due: 'lunes' }], dates: [], openQuestions: [] });
  assert.match(t, /TAREAS/);
  assert.match(t, /Llamar \(Eri\) — lunes/);
  assert.doesNotMatch(t, /DECISIONES/);
});

test('formatClock', () => {
  assert.equal(formatClock(65), '01:05');
  assert.equal(formatClock(3725), '1:02:05');
});

import { meetingTitle } from './meeting.ts';
test('meetingTitle usa la primera frase del resumen y la acorta', () => {
  const base = { language: 'es' as const, transcript: '', decisions: [], tasks: [], dates: [], openQuestions: [] };
  assert.match(meetingTitle({ ...base, summary: 'Se revisó el cierre del mes. Otra frase.' }, new Date('2026-10-04T15:00:00Z')), /Se revisó el cierre del mes\./);
  assert.ok(meetingTitle({ ...base, summary: 'x'.repeat(200) }, new Date()).length < 90);
  assert.match(meetingTitle({ ...base, summary: '' }, new Date('2026-10-04T15:00:00Z')), /^Reunión del/);
});
