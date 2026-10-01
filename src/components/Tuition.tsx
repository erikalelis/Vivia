import { useState } from 'react';
import { Empty, ErrorBox, Field, fmtDate, Loading, Modal } from '@/components/ui';
import { formatCents, parseMoneyToCents } from '@/domain/money';
import { buildWhatsAppUrl, MONTHS_ES } from '@/domain/message';
import { useLoad } from '@/hooks/useLoad';
import { documentsRepo, documentUrl, friendly, getSettings, paymentsRepo } from '@/services/api';
import { confirmPayment, markSent, processTuitionPdf, saveMessage } from '@/services/tuition';
import type { SchoolPayment, Settings } from '@/types';

const cents = (n: number | null) => (n === null ? '—' : formatCents(BigInt(n)));
const monthName = (m: number | null) => (m ? MONTHS_ES[m - 1][0].toUpperCase() + MONTHS_ES[m - 1].slice(1) : 'Sin mes');
const STATUS = { pendiente: { l: 'Pendiente', c: 'bg-arena text-suave' }, listo_para_enviar: { l: 'Lista para enviar', c: 'bg-salvia-soft text-salvia-dark' }, enviado: { l: '🟢 Enviado', c: 'bg-salvia text-white' } };

export default function Tuition() {
  const { data, loading, error, reload } = useLoad(async () => ({ pays: await paymentsRepo.list(), settings: await getSettings() }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<SchoolPayment | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setNotice(null);
    if (f.type !== 'application/pdf') { setNotice('Elegí un archivo PDF.'); return; }
    if (f.size > 20 * 1024 * 1024) { setNotice('El PDF supera los 20 MB.'); return; }
    setBusy(true);
    try {
      const { payment, reasons } = await processTuitionPdf(f);
      if (reasons.length) setNotice(reasons.join(' ') + ' Revisá los datos antes de continuar.');
      await reload();
      setOpen(payment);
    } catch (e) { setNotice(friendly(e)); } finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'No pude cargar las cuotas.'} onRetry={reload} />;
  const { pays, settings } = data;
  const current = open ? pays.find((p) => p.id === open.id) ?? open : null;

  return (
    <div>
      <label className={`btn-primary mb-3 w-full cursor-pointer md:w-auto ${busy ? 'opacity-60' : ''}`}>
        {busy ? 'Leyendo la cuota…' : '+ Cargar cuota'}
        <input type="file" accept="application/pdf" className="hidden" disabled={busy} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {notice && <p className="mb-3 rounded-xl bg-terracota-soft p-3 text-terracota" role="alert">{notice}</p>}

      {pays.length === 0 ? <Empty>Todavía no cargaste ninguna cuota. Subí el PDF y VIVIA hace el resto.</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left">
            <thead className="text-sm text-suave"><tr><th className="p-3">Mes</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">{settings.payer_percent}%</th><th className="p-3">Estado</th></tr></thead>
            <tbody>
              {pays.map((p) => (
                <tr key={p.id} className="cursor-pointer border-t border-arena hover:bg-crema" onClick={() => setOpen(p)}>
                  <td className="p-3">{monthName(p.period_month)} {p.period_year ?? ''}{p.needs_review && <span className="ml-2 chip bg-terracota-soft text-terracota">Revisar</span>}</td>
                  <td className="p-3 text-right">{cents(p.total_cents)}</td>
                  <td className="p-3 text-right">{cents(p.share_cents)}</td>
                  <td className="p-3"><span className={`chip ${STATUS[p.status].c}`}>{STATUS[p.status].l}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {current && <PaymentModal p={current} settings={settings} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

function PaymentModal({ p, settings, onClose, onChanged }: { p: SchoolPayment; settings: Settings; onClose: () => void; onChanged: () => void }) {
  const [total, setTotal] = useState(p.total_cents === null ? '' : formatCents(BigInt(p.total_cents), ''));
  const [month, setMonth] = useState(p.period_month ?? new Date().getMonth() + 1);
  const [year, setYear] = useState(p.period_year ?? new Date().getFullYear());
  const [percent, setPercent] = useState(String(p.share_percent ?? settings.payer_percent));
  const [payer, setPayer] = useState(p.payer_name ?? settings.payer_name);
  const [message, setMessage] = useState(p.message ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingData, setEditingData] = useState(p.needs_review || p.total_cents === null);
  const [asked, setAsked] = useState(false);

  async function run(fn: () => Promise<unknown>) { setBusy(true); setErr(null); try { await fn(); await onChanged(); } catch (e) { setErr(friendly(e)); } finally { setBusy(false); } }

  const preview = (() => { const c = parseMoneyToCents(total); return c && c > 0n ? c : null; })();

  async function confirmData() {
    if (preview === null) { setErr('El total no es un importe válido.'); return; }
    const pct = Number(percent.replace(',', '.'));
    if (!(pct >= 0 && pct <= 100)) { setErr('El porcentaje debe estar entre 0 y 100.'); return; }
    await run(async () => {
      const upd = await confirmPayment(p, { totalCents: preview, month, year, percent: pct, payerName: payer });
      setMessage(upd.message ?? ''); setEditingData(false);
    });
  }

  const wa = buildWhatsAppUrl(settings.payer_phone, message);
  const pdfOpen = async () => { try { if (!p.document_id) return; const docs = await documentsRepo.list(); const d = docs.find((x) => x.id === p.document_id); if (d) window.open(await documentUrl(d.storage_path), '_blank', 'noopener'); } catch (e) { setErr(friendly(e)); } };

  return (
    <Modal title={`Cuota ${monthName(p.period_month)} ${p.period_year ?? ''}`} onClose={onClose}>
      {p.institution && <p className="text-sm text-suave">{p.institution}{p.student ? ` · ${p.student}` : ''}{p.due_date ? ` · vence ${fmtDate(p.due_date)}` : ''}</p>}

      {p.line_items.length > 0 && (
        <ul className="my-3 rounded-xl bg-white p-3 text-sm">
          {p.line_items.map((l, i) => <li key={i} className="flex justify-between"><span>{l.concept}</span><span>{formatCents(BigInt(l.amount_cents))}</span></li>)}
        </ul>
      )}

      {editingData ? (
        <div className="my-3 rounded-xl border border-terracota-soft p-3">
          <p className="mb-2 text-sm text-terracota">{p.total_cents === null ? 'No pude identificar correctamente el total de esta cuota. Completalo vos:' : 'Revisá y confirmá los datos detectados:'}</p>
          <Field label="TOTAL FINAL a pagar"><input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="317.510,00" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mes"><select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{MONTHS_ES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
            <Field label="Año"><input inputMode="numeric" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
            <Field label="Responsable"><input value={payer} onChange={(e) => setPayer(e.target.value)} /></Field>
            <Field label="Porcentaje (%)"><input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>
          </div>
          <button className="btn-primary w-full" disabled={busy} onClick={confirmData}>Confirmar datos</button>
        </div>
      ) : (
        <div className="my-3 grid grid-cols-2 gap-3 text-center">
          <div className="card !bg-crema"><p className="text-sm text-suave">Total de la cuota</p><p className="text-2xl">{cents(p.total_cents)}</p></div>
          <div className="card !bg-salvia-soft"><p className="text-sm text-suave">A pagar por {p.payer_name} — {p.share_percent}%</p><p className="text-2xl">{cents(p.share_cents)}</p></div>
          <button className="btn-ghost col-span-2 text-sm" onClick={() => setEditingData(true)}>Corregir datos</button>
        </div>
      )}

      {!editingData && p.total_cents !== null && (
        <>
          <Field label="Mensaje (podés editarlo antes de enviar)"><textarea rows={9} value={message} onChange={(e) => setMessage(e.target.value)} onBlur={() => message !== (p.message ?? '') && saveMessage(p, message)} /></Field>
          {!settings.payer_phone && <p className="mb-2 text-xs text-suave">Sin número configurado: WhatsApp te va a pedir elegir el contacto. Podés guardarlo en Ajustes.</p>}
          <a className="btn-primary mb-2 w-full" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => setAsked(true)}>💬 Abrir WhatsApp</a>
          <p className="mb-2 text-xs text-suave">VIVIA no envía nada sola: revisá el mensaje en WhatsApp y tocá Enviar.</p>
          {p.status !== 'enviado'
            ? <button className="btn-soft w-full" disabled={busy} onClick={() => run(async () => { await saveMessage(p, message); await markSent(p); })}>{asked ? '🟢 Ya lo envié' : 'Marcar como enviado'}</button>
            : <p className="text-center text-salvia-dark">🟢 Enviado el {fmtDate(p.sent_at)} a las {p.sent_at ? new Date(p.sent_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : ''} a {p.payer_name}</p>}
        </>
      )}
      {err && <p className="mt-2 text-terracota" role="alert">{err}</p>}
      <div className="mt-3 flex gap-2">
        {p.document_id && <button className="btn-ghost flex-1" onClick={pdfOpen}>Abrir PDF original</button>}
        <button className="btn-danger" onClick={async () => { if (confirm('¿Eliminar este registro de cuota? El PDF se conserva en Documentos.')) { await paymentsRepo.remove(p.id); onClose(); onChanged(); } }}>Eliminar</button>
      </div>
    </Modal>
  );
}
