/**
 * Dinero en CENTAVOS enteros (bigint). Nunca se usa punto flotante para importes.
 */
export type Cents = bigint;

/** Interpreta "$317.510,00", "317510", "1.234,5", "-$5.000,00", "(5.000,00)". Devuelve null si no es un importe. */
export function parseMoneyToCents(input: string): Cents | null {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { negative = true; s = s.slice(1); }
  s = s.replace(/[^\d.,]/g, '');
  if (!s || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let intPart: string;
  let decPart = '';

  if (lastDot !== -1 && lastComma !== -1) {
    const decIdx = Math.max(lastDot, lastComma);
    intPart = s.slice(0, decIdx);
    decPart = s.slice(decIdx + 1);
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    const multiple = s.indexOf(',') !== lastComma;
    if (!multiple && after >= 1 && after <= 2) { intPart = s.slice(0, lastComma); decPart = s.slice(lastComma + 1); }
    else { intPart = s; }
  } else if (lastDot !== -1) {
    const after = s.length - lastDot - 1;
    const multiple = s.indexOf('.') !== lastDot;
    // "317.510" = miles (formato argentino); "317.51" = decimales
    if (!multiple && after >= 1 && after <= 2) { intPart = s.slice(0, lastDot); decPart = s.slice(lastDot + 1); }
    else { intPart = s; }
  } else {
    intPart = s;
  }

  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart) || decPart.length > 2) return null;
  if (intPart === '' && decPart === '') return null;
  const cents = BigInt(intPart || '0') * 100n + BigInt((decPart + '00').slice(0, 2));
  return negative ? -cents : cents;
}

/** Formato argentino: 31751000n → "$317.510,00" */
export function formatCents(cents: Cents, symbol = '$'): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${symbol}${whole},${frac}`;
}

/** Porcentaje (hasta 2 decimales) → puntos básicos enteros. 50 → 5000, 33.33 → 3333 */
export function percentToBasisPoints(percent: number | string): number {
  const n = typeof percent === 'string' ? Number(percent.replace(',', '.')) : percent;
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('El porcentaje debe estar entre 0 y 100.');
  return Math.round(n * 100);
}

/** total × porcentaje, redondeado al centavo (mitad hacia arriba). */
export function shareOfCents(total: Cents, percent: number | string): Cents {
  const bp = BigInt(percentToBasisPoints(percent));
  const product = total * bp;
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  return sign * ((abs + 5000n) / 10000n);
}
