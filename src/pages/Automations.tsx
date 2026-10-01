import { useState } from 'react';
import { Empty, ErrorBox, fmtDate, Loading } from '@/components/ui';
import { useLoad } from '@/hooks/useLoad';
import { ensureAutomation, friendly } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { TUITION_AUTOMATION } from '@/services/tuition';
import type { Automation, AutomationRun } from '@/types';

const RUN_LABEL = { ok: '🟢 Completada', revision: '🟠 Necesitó revisión', error: '🔴 Con error' };

export default function Automations({ onlyKey }: { onlyKey?: string }) {
  const { data, loading, error, reload } = useLoad(async () => {
    await ensureAutomation(TUITION_AUTOMATION); // la automatización principal siempre existe
    const [a, r] = await Promise.all([
      supabase.from('automations').select('*').order('created_at'),
      supabase.from('automation_runs').select('*').order('created_at', { ascending: false }).limit(100)
    ]);
    if (a.error) throw a.error;
    if (r.error) throw r.error;
    return { automations: (a.data ?? []) as Automation[], runs: (r.data ?? []) as AutomationRun[] };
  });
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'No pude cargar los atajos.'} onRetry={reload} />;
  const list = onlyKey ? data.automations.filter((a) => a.key === onlyKey) : data.automations;

  async function toggle(a: Automation) {
    const { error: e } = await supabase.from('automations').update({ enabled: !a.enabled }).eq('id', a.id);
    if (e) setMsg(friendly(e)); else reload();
  }

  return (
    <div>
      {!onlyKey && <h1 className="page-title">Atajos</h1>}
      {msg && <p className="mb-2 text-terracota" role="alert">{msg}</p>}
      {list.length === 0 ? <Empty>No hay atajos.</Empty> : list.map((a) => {
        const runs = data.runs.filter((r) => r.automation_id === a.id);
        return (
          <section key={a.id} className="card mb-4">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl">{a.name}</h2><p className="text-sm text-suave">{a.description}</p></div>
              <button className={a.enabled ? 'btn-soft' : 'btn-ghost'} onClick={() => toggle(a)}>{a.enabled ? 'Activa' : 'Pausada'}</button>
            </div>
            <p className="mt-3 text-sm"><b>Se activa:</b> {a.trigger}</p>
            <ol className="mt-2 list-inside list-decimal text-sm text-suave">{a.actions.map((x) => <li key={x}>{x}</li>)}</ol>
            <h3 className="mb-1 mt-4 text-sm text-suave">Historial</h3>
            {runs.length === 0 ? <p className="text-sm text-suave">Todavía no se ejecutó.</p> : (
              <ul className="space-y-1 text-sm">{runs.slice(0, 10).map((r) => (
                <li key={r.id} className="flex justify-between gap-2"><span>{RUN_LABEL[r.status]} {typeof r.detail?.document === 'string' ? `· ${r.detail.document}` : ''}</span><span className="text-suave">{fmtDate(r.created_at)}</span></li>
              ))}</ul>
            )}
          </section>
        );
      })}
      {!onlyKey && <p className="text-xs text-suave">Por ahora solo existe el atajo de la cuota escolar. Nuevos atajos se agregan en el código (ver docs/ARCHITECTURE.md).</p>}
    </div>
  );
}
