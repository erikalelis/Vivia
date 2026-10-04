import test from 'node:test';
import assert from 'node:assert/strict';
import { topMistakes, validateEnglishTurn, validateTranslation } from './language.ts';

test('validateTranslation exige idiomas válidos y descarta alternativa repetida', () => {
  assert.equal(validateTranslation({ detected: 'fr', target: 'en', translation: 'x' }), null);
  const t = validateTranslation({ detected: 'es', target: 'en', translation: 'Hello', alternative: 'Hello', note: '' });
  assert.equal(t!.alternative, null);
  assert.equal(t!.note, null);
});

test('validateEnglishTurn descarta correcciones sin cambio y limita a 3', () => {
  const t = validateEnglishTurn({ reply: 'Nice!', reply_es: 'Bien', corrections: [
    { wrong: 'I am agree', right: 'I agree', why: 'sin to be' }, { wrong: 'ok', right: 'OK', why: '' },
    { wrong: 'a', right: 'b', why: '' }, { wrong: 'c', right: 'd', why: '' }, { wrong: 'e', right: 'f', why: '' }] });
  assert.equal(t!.corrections.length, 3);
  assert.equal(validateEnglishTurn({}), null);
});

test('topMistakes cuenta repeticiones', () => {
  const r = topMistakes([{ wrong: 'I am agree', right: 'I agree', why: null }, { wrong: 'i am agree', right: 'I agree', why: null }, { wrong: 'x', right: 'y', why: null }]);
  assert.equal(r[0].count, 2);
});
