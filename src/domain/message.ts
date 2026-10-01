import { formatCents, shareOfCents, type Cents } from './money.ts';

export const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const DEFAULT_TEMPLATE =
  'Hola {{nombre}},\n\n¿Cómo estás?\n\nTe paso el valor de la escuela de este mes ({{mes}}):\n\nTotal: {{total}}\nA pagar ({{porcentaje}}%): {{importe}}\n\nGracias.';

/** Reemplaza {{clave}}. Si falta una clave, lo informa en lugar de enviar un mensaje roto. */
export function renderTemplate(template: string, values: Record<string, string>): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    if (key in values) return values[key];
    missing.push(key);
    return `{{${key}}}`;
  });
  return { text, missing };
}

export interface TuitionMessageInput {
  template: string;
  payerName: string;
  percent: number | string;
  month: number; // 1-12
  totalCents: Cents;
}

export function buildTuitionMessage(i: TuitionMessageInput) {
  const share = shareOfCents(i.totalCents, i.percent);
  const pct = Number(i.percent);
  const { text, missing } = renderTemplate(i.template, {
    nombre: i.payerName,
    mes: MONTHS_ES[i.month - 1] ?? '',
    total: formatCents(i.totalCents),
    porcentaje: Number.isInteger(pct) ? String(pct) : String(pct).replace('.', ','),
    importe: formatCents(share)
  });
  return { text, missing, shareCents: share };
}

/** Enlace que ABRE WhatsApp con el mensaje escrito. No envía nada: la persona toca "Enviar". */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
