import type { Cents } from './money.ts';

export interface ExtractedLine {
  concept: string;
  /** Con signo: los descuentos son negativos. */
  amountCents: Cents;
}

export interface PaymentExtraction {
  institution?: string | null;
  student?: string | null;
  month?: number | null; // 1-12
  year?: number | null;
  dueDate?: string | null; // YYYY-MM-DD
  lines: ExtractedLine[];
  /** "TOTAL A PAGAR" declarado por el documento, si se encontró. */
  declaredTotalCents: Cents | null;
}

export interface ResolvedTotal {
  totalCents: Cents | null;
  needsReview: boolean;
  reasons: string[];
  linesSumCents: Cents | null;
}

/**
 * Decide cuál es el TOTAL FINAL A PAGAR sin asumir que el primer importe es el total.
 * - Total declarado + renglones que coinciden → confiable.
 * - Total declarado que NO coincide con la suma → se usa el declarado, pero se pide revisión.
 * - Sin total declarado → se propone la suma de renglones, pero se pide revisión.
 * - Sin nada → no hay total; se pide revisión.
 */
export function resolveTotal(ex: PaymentExtraction): ResolvedTotal {
  const reasons: string[] = [];
  const hasLines = ex.lines.length > 0;
  const linesSum = hasLines ? ex.lines.reduce((acc, l) => acc + l.amountCents, 0n) : null;

  if (ex.declaredTotalCents !== null) {
    if (ex.declaredTotalCents <= 0n) {
      reasons.push('El total detectado no es un importe positivo.');
      return { totalCents: ex.declaredTotalCents, needsReview: true, reasons, linesSumCents: linesSum };
    }
    if (linesSum !== null && linesSum !== ex.declaredTotalCents) {
      reasons.push('El total del documento no coincide con la suma de los conceptos.');
      return { totalCents: ex.declaredTotalCents, needsReview: true, reasons, linesSumCents: linesSum };
    }
    return { totalCents: ex.declaredTotalCents, needsReview: false, reasons, linesSumCents: linesSum };
  }

  if (linesSum !== null && linesSum > 0n) {
    reasons.push('El documento no indica un total claro; se sumaron los conceptos.');
    return { totalCents: linesSum, needsReview: true, reasons, linesSumCents: linesSum };
  }

  reasons.push('No pude identificar el total de esta cuota.');
  return { totalCents: null, needsReview: true, reasons, linesSumCents: linesSum };
}
