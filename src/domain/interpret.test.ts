import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingForSave, validateInterpretation } from './interpret.ts';

test('dos acciones en una frase se separan y clasifican', () => {
  const r = validateInterpretation({
    items: [
      { kind: 'tarea', title: 'Llamar al colegio', module: 'mia', date: '2026-10-02' },
      { kind: 'tarea', title: 'Comprar regalo de Mia', module: 'mia', date: '2026-10-03', priority: 'alta' }
    ],
    clarifications: []
  });
  assert.equal(r.items.length, 2);
  assert.equal(r.items[1].priority, 'alta');
  assert.equal(r.items[0].module, 'mia');
});

test('datos inválidos de la IA se descartan o corrigen, y se informa', () => {
  const r = validateInterpretation({
    items: [
      { title: '   ' },
      { kind: 'raro', title: 'Algo', module: 'xyz', date: '31/02/2026', time: '25:99', priority: 'urgente' }
    ]
  });
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].kind, 'tarea');
  assert.equal(r.items[0].module, 'general');
  assert.equal(r.items[0].priority, 'media');
  assert.equal(r.items[0].date, null);
  assert.equal(r.items[0].time, null);
  assert.ok(r.problems.length >= 3);
});

test('respuesta vacía o rota no explota', () => {
  assert.deepEqual(validateInterpretation(null).items, []);
  assert.deepEqual(validateInterpretation('basura').items, []);
});

test('ambigüedad: se conserva la pregunta para la usuaria', () => {
  const r = validateInterpretation({
    items: [{ title: 'Reunión', date: '2026-10-02' }],
    clarifications: [{ item_index: 0, question: '¿Evento de agenda o pendiente?', options: ['Evento', 'Pendiente'] }]
  });
  assert.equal(r.clarifications.length, 1);
  assert.deepEqual(r.clarifications[0].options, ['Evento', 'Pendiente']);
});

test('un evento sin fecha no se guarda sin preguntar', () => {
  const [item] = validateInterpretation({ items: [{ kind: 'evento', title: 'Turno' }] }).items;
  assert.ok(missingForSave(item));
});
