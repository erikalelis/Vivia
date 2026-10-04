import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupBySection, profileForAi, validateProfileExtraction } from './profile.ts';

test('la respuesta de la IA se limpia: secciones inválidas, vacíos y repetidos se descartan', () => {
  const r = validateProfileExtraction({
    items: [
      { section: 'experiencia', title: '  Analista   de facturación ', detail: 'Controles\nmensuales' },
      { section: 'experiencia', title: 'analista de facturación', detail: null },
      { section: 'inventada', title: 'No debería entrar' },
      { section: 'herramientas', title: '' },
      { section: 'herramientas', title: 'Excel', detail: '   ' },
      null,
      { section: 'idiomas' }
    ]
  });
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'Analista de facturación');
  assert.equal(r[0].detail, 'Controles mensuales');
  assert.equal(r[1].detail, null);
});

test('una respuesta que no tiene la forma esperada no rompe nada', () => {
  assert.deepEqual(validateProfileExtraction(null), []);
  assert.deepEqual(validateProfileExtraction({ items: 'x' }), []);
  assert.deepEqual(validateProfileExtraction(undefined), []);
});

test('los textos largos se recortan', () => {
  const r = validateProfileExtraction({ items: [{ section: 'logros', title: 'a'.repeat(500), detail: 'b'.repeat(2000) }] });
  assert.equal(r[0].title.length, 120);
  assert.equal(r[0].detail?.length, 600);
});

test('agrupar por sección incluye todas las secciones, aunque estén vacías', () => {
  const g = groupBySection([{ section: 'logros' as const, title: 'x' }]);
  assert.equal(g.logros.length, 1);
  assert.equal(g.idiomas.length, 0);
});

test('Vivia solo usa las secciones que la usuaria dejó habilitadas', () => {
  const items = [
    { section: 'experiencia' as const, title: 'Facturación', detail: 'Controles' },
    { section: 'situaciones' as const, title: 'Cierre atrasado', detail: null }
  ];
  const all = profileForAi(items, []);
  assert.match(all, /Facturación: Controles/);
  assert.match(all, /Cierre atrasado/);
  const some = profileForAi(items, ['situaciones']);
  assert.match(some, /Facturación/);
  assert.doesNotMatch(some, /Cierre atrasado/);
});
