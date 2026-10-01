import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCents, parseMoneyToCents, shareOfCents } from './money.ts';
import { resolveTotal } from './payments.ts';
import { buildTuitionMessage, buildWhatsAppUrl, DEFAULT_TEMPLATE, renderTemplate } from './message.ts';

test('parseo de importes en formato argentino', () => {
  assert.equal(parseMoneyToCents('$317.510,00'), 31751000n);
  assert.equal(parseMoneyToCents('317510'), 31751000n);
  assert.equal(parseMoneyToCents('317.510'), 31751000n);
  assert.equal(parseMoneyToCents('1.234,5'), 123450n);
  assert.equal(parseMoneyToCents('1,234.50'), 123450n);
  assert.equal(parseMoneyToCents('-$5.000,00'), -500000n);
  assert.equal(parseMoneyToCents('(5.000,00)'), -500000n);
  assert.equal(parseMoneyToCents('abc'), null);
});

test('317510 → 158755 (50%)', () => {
  const total = parseMoneyToCents('$317.510,00')!;
  const share = shareOfCents(total, 50);
  assert.equal(share, 15875500n);
  assert.equal(formatCents(share), '$158.755,00');
});

test('50% de importes distintos, sin errores de redondeo', () => {
  assert.equal(shareOfCents(10001n, 50), 5001n); // 50,005 → 50,01 (mitad hacia arriba)
  assert.equal(shareOfCents(100n, 50), 50n);
  assert.equal(shareOfCents(0n, 50), 0n);
  assert.equal(shareOfCents(30000n, 33.33), 9999n);
  assert.equal(formatCents(shareOfCents(parseMoneyToCents('0,10')! * 3n, 50)), '$0,15');
  assert.throws(() => shareOfCents(100n, 120));
});

test('con descuentos y múltiples conceptos: usa el total declarado', () => {
  const r = resolveTotal({
    lines: [
      { concept: 'Cuota', amountCents: 30000000n },
      { concept: 'Comedor', amountCents: 5000000n },
      { concept: 'Descuento hermanos', amountCents: -3249000n }
    ],
    declaredTotalCents: 31751000n
  });
  assert.equal(r.totalCents, 31751000n);
  assert.equal(r.needsReview, false);
});

test('valores ambiguos: total no coincide con los conceptos → pide revisión', () => {
  const r = resolveTotal({
    lines: [{ concept: 'Cuota', amountCents: 30000000n }, { concept: 'Comedor', amountCents: 5000000n }],
    declaredTotalCents: 30000000n
  });
  assert.equal(r.totalCents, 30000000n);
  assert.equal(r.needsReview, true);
  assert.ok(r.reasons.length > 0);
});

test('sin total declarado: propone la suma pero pide confirmación; sin nada: no inventa', () => {
  const sum = resolveTotal({ lines: [{ concept: 'Cuota', amountCents: 100000n }], declaredTotalCents: null });
  assert.equal(sum.totalCents, 100000n);
  assert.equal(sum.needsReview, true);
  const none = resolveTotal({ lines: [], declaredTotalCents: null });
  assert.equal(none.totalCents, null);
  assert.equal(none.needsReview, true);
});

test('mensaje de WhatsApp con mes, total y porcentaje', () => {
  const m = buildTuitionMessage({ template: DEFAULT_TEMPLATE, payerName: 'Ale', percent: 50, month: 9, totalCents: 31751000n });
  assert.equal(m.missing.length, 0);
  assert.match(m.text, /^Hola Ale,/);
  assert.match(m.text, /\(septiembre\)/);
  assert.match(m.text, /Total: \$317\.510,00/);
  assert.match(m.text, /A pagar \(50%\): \$158\.755,00/);
});

test('plantilla con clave desconocida se informa, no se envía rota en silencio', () => {
  assert.deepEqual(renderTemplate('Hola {{x}}', {}).missing, ['x']);
});

test('enlace de WhatsApp: abre el chat con el texto, sin enviar', () => {
  const url = buildWhatsAppUrl('+54 9 11 1234-5678', 'Hola\nChau');
  assert.equal(url, 'https://wa.me/5491112345678?text=Hola%0AChau');
  assert.equal(buildWhatsAppUrl(null, 'Hola'), 'https://wa.me/?text=Hola');
});
