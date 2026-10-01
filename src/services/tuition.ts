import { buildTuitionMessage, DEFAULT_TEMPLATE } from '@/domain/message';
import { resolveTotal } from '@/domain/payments';
import { ai } from '@/services/ai';
import { documentsRepo, ensureAutomation, getSettings, getTemplate, paymentsRepo, runsRepo, uploadDocument } from '@/services/api';
import type { SchoolPayment } from '@/types';

export const TUITION_AUTOMATION = {
  key: 'cuota_escolar_mia',
  name: 'Cuota escolar de Mia',
  description: 'Al subir el PDF de la cuota: lo lee, calcula la parte que corresponde y prepara el mensaje de WhatsApp.',
  trigger: 'Subir PDF de cuota',
  actions: ['Leer documento', 'Identificar mes', 'Identificar total', 'Calcular porcentaje', 'Generar mensaje', 'Asociar documento', 'Preparar WhatsApp', 'Registrar resultado']
};

export interface TuitionOutcome { payment: SchoolPayment; reasons: string[] }

/** Automatización principal: PDF → extracción → cálculo → mensaje → registro. No envía nada. */
export async function processTuitionPdf(file: File): Promise<TuitionOutcome> {
  const automationId = await ensureAutomation(TUITION_AUTOMATION);
  const doc = await uploadDocument(file, { module: 'mia', category: 'cuota' });

  let extraction;
  try {
    extraction = await ai.extractTuitionPdf(doc.storage_path);
  } catch (e) {
    // El PDF queda guardado y se crea un registro para completar a mano: no se pierde nada.
    const payment = await paymentsRepo.create({ document_id: doc.id, needs_review: true, status: 'pendiente' } as Partial<SchoolPayment>);
    await runsRepo.create({ automation_id: automationId, status: 'error', detail: { document: doc.name, error: (e as Error).message } } as never);
    return { payment, reasons: [(e as Error).message || 'No pude leer el PDF automáticamente. Podés completar los datos a mano.'] };
  }

  const resolved = resolveTotal(extraction);
  const settings = await getSettings();
  const template = (await getTemplate('cuota_escuela')) ?? DEFAULT_TEMPLATE;

  let message: string | null = null;
  let shareCents: bigint | null = null;
  if (resolved.totalCents !== null && resolved.totalCents > 0n && extraction.month) {
    const built = buildTuitionMessage({ template, payerName: settings.payer_name, percent: settings.payer_percent, month: extraction.month, totalCents: resolved.totalCents });
    message = built.text;
    shareCents = built.shareCents;
  } else if (!extraction.month) {
    resolved.needsReview = true;
    resolved.reasons.push('No pude identificar el mes de la cuota.');
  }

  const payment = await paymentsRepo.create({
    document_id: doc.id,
    institution: extraction.institution ?? null,
    student: extraction.student ?? null,
    period_month: extraction.month ?? null,
    period_year: extraction.year ?? new Date().getFullYear(),
    due_date: extraction.dueDate ?? null,
    line_items: extraction.lines.map((l) => ({ concept: l.concept, amount_cents: l.amountCents.toString() })),
    total_cents: resolved.totalCents === null ? null : Number(resolved.totalCents),
    share_percent: settings.payer_percent,
    share_cents: shareCents === null ? null : Number(shareCents),
    payer_name: settings.payer_name,
    message,
    needs_review: resolved.needsReview,
    status: resolved.needsReview || !message ? 'pendiente' : 'listo_para_enviar'
  } as Partial<SchoolPayment>);

  await documentsRepo.update(doc.id, { related_type: 'school_payment', related_id: payment.id, metadata: { month: extraction.month, year: extraction.year } } as never);
  await runsRepo.create({ automation_id: automationId, status: resolved.needsReview ? 'revision' : 'ok', detail: { payment_id: payment.id, document: doc.name, reasons: resolved.reasons } } as never);
  return { payment, reasons: resolved.reasons };
}

/** La usuaria confirma o corrige los datos detectados; se recalcula el mensaje. */
export async function confirmPayment(p: SchoolPayment, fix: { totalCents: bigint; month: number; year: number; percent: number; payerName: string }): Promise<SchoolPayment> {
  const template = (await getTemplate('cuota_escuela')) ?? DEFAULT_TEMPLATE;
  const built = buildTuitionMessage({ template, payerName: fix.payerName, percent: fix.percent, month: fix.month, totalCents: fix.totalCents });
  return paymentsRepo.update(p.id, {
    period_month: fix.month, period_year: fix.year, total_cents: Number(fix.totalCents), share_percent: fix.percent,
    share_cents: Number(built.shareCents), payer_name: fix.payerName, message: built.text, needs_review: false, status: 'listo_para_enviar'
  } as Partial<SchoolPayment>);
}

export const saveMessage = (p: SchoolPayment, message: string) => paymentsRepo.update(p.id, { message } as Partial<SchoolPayment>);

/** Solo la persona marca "Enviado", después de haber tocado Enviar en WhatsApp. */
export const markSent = (p: SchoolPayment) => paymentsRepo.update(p.id, { status: 'enviado', sent_at: new Date().toISOString() } as Partial<SchoolPayment>);
