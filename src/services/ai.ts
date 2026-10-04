import { supabase } from '@/lib/supabase';
import { validateInterpretation, type InterpretResult } from '@/domain/interpret';
import { parseMoneyToCents } from '@/domain/money';
import type { PaymentExtraction } from '@/domain/payments';
import { nowInBuenosAires } from '@/domain/tasks';

/**
 * Capa de IA desacoplada: la app solo conoce esta interfaz.
 * Para usar otro proveedor (OpenAI, un modelo local…) se crea otra clase que la implemente
 * y se cambia `ai` al final de este archivo. Ver docs/ARCHITECTURE.md.
 */
export interface AiProvider {
  interpretText(text: string): Promise<InterpretResult>;
  extractTuitionPdf(storagePath: string): Promise<PaymentExtraction & { concept?: string | null; notes?: string | null }>;
  /** Estructura un CV (PDF en base64) o un texto en elementos del perfil profesional. Devuelve la respuesta cruda: se valida en domain/profile. */
  extractProfile(input: { text?: string; pdfBase64?: string }): Promise<unknown>;
}

export class AiNotAvailableError extends Error {}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // Las funciones devuelven { error: "mensaje legible" } con un código HTTP.
    let message = 'No pude conectarme con la IA.';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) message = ctx.error; } catch { /* sin detalle */ }
    throw new AiNotAvailableError(message);
  }
  return data as T;
}

/** Implementación a través de Edge Functions de Supabase (Gemini gratis o Claude, según la clave del servidor). */
class ClaudeEdgeProvider implements AiProvider {
  async interpretText(text: string): Promise<InterpretResult> {
    const now = new Date();
    const { date } = nowInBuenosAires(now);
    const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(now);
    const raw = await invoke<unknown>('interpret', { text, today: date, weekday, timezone: 'America/Argentina/Buenos_Aires' });
    return validateInterpretation(raw);
  }

  async extractProfile(input: { text?: string; pdfBase64?: string }): Promise<unknown> {
    return invoke<unknown>('profile-extract', { text: input.text, pdf_base64: input.pdfBase64 });
  }

  async extractTuitionPdf(storagePath: string) {
    const r = await invoke<any>('extract-payment', { storage_path: storagePath });
    const lines = Array.isArray(r?.lines) ? r.lines : [];
    return {
      institution: r?.institution ?? null,
      student: r?.student ?? null,
      concept: r?.concept ?? null,
      month: Number.isInteger(r?.month) && r.month >= 1 && r.month <= 12 ? r.month : null,
      year: Number.isInteger(r?.year) ? r.year : null,
      dueDate: typeof r?.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.due_date) ? r.due_date : null,
      lines: lines.flatMap((l: any) => {
        const parsed = parseMoneyToCents(String(l?.amount ?? ''));
        if (parsed === null) return [];
        // el descuento se guarda en negativo aunque el PDF lo imprima en positivo
        const signed = l?.kind === 'descuento' && parsed > 0n ? -parsed : parsed;
        return [{ concept: String(l?.concept ?? ''), amountCents: signed }];
      }),
      declaredTotalCents: r?.declared_total ? parseMoneyToCents(String(r.declared_total)) : null,
      notes: r?.notes ?? null
    };
  }
}

export const ai: AiProvider = new ClaudeEdgeProvider();
