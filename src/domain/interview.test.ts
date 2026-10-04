import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnswer, validateListen, validatePrep } from './interview.ts';

test('validatePrep descarta preguntas vacías y completa campos', () => {
  const p = validatePrep({ role: 'Analista', summary: 'x', strengths: ['a', '', 3], gaps: [{ gap: 'Inglés', how: 'Ser honesta' }, { how: 'sin gap' }],
    questions: [{ q: 'Contame de vos', short: 'Soy analista.', full: '' }, { q: '', short: 'x', full: 'y' }, { q: 'Sin respuesta' }] });
  assert.ok(p);
  assert.equal(p!.questions.length, 1);
  assert.equal(p!.questions[0].full, 'Soy analista.');
  assert.deepEqual(p!.strengths, ['a']);
  assert.equal(p!.gaps.length, 1);
  assert.equal(p!.company, null);
});

test('validatePrep devuelve null si no hay preguntas ni forma válida', () => {
  assert.equal(validatePrep(null), null);
  assert.equal(validatePrep({ questions: 'no' }), null);
});

test('validateAnswer exige al menos una respuesta y limita las frases puente', () => {
  assert.equal(validateAnswer({}), null);
  const a = validateAnswer({ short: 'Corta', bridge: ['1', '2', '3', '4', '5'] });
  assert.equal(a!.full, 'Corta');
  assert.equal(a!.bridge.length, 4);
});

test('validateListen solo marca pregunta si hay respuesta', () => {
  assert.equal(validateListen({}), null);
  assert.equal(validateListen({ heard: 'Hola, buen día', is_question: false })!.isQuestion, false);
  assert.equal(validateListen({ heard: 'Contame de vos', is_question: true })!.isQuestion, false);
  const q = validateListen({ heard: 'Contame de vos', is_question: true, question: 'Contame de vos', short: 'Soy analista.', full: '' });
  assert.equal(q!.isQuestion, true);
  assert.equal(q!.full, 'Soy analista.');
});
