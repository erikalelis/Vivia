import { useState } from 'react';
import { ErrorBox, Field, Loading } from '@/components/ui';
import { DEFAULT_TEMPLATE } from '@/domain/message';
import { useAuth } from '@/hooks/useAuth';
import { useLoad } from '@/hooks/useLoad';
import { askNotificationPermission } from '@/hooks/useReminders';
import { friendly, getSettings, getTemplate, saveSettings, saveTemplate } from '@/services/api';
import { appVersion } from '@/pwa/UpdatePrompt';
import type { Settings } from '@/types';

export default function SettingsPage() {
  const { signOut, session } = useAuth();
  const { data, loading, error, reload } = useLoad(async () => ({ s: await getSettings(), t: (await getTemplate('cuota_escuela')) ?? DEFAULT_TEMPLATE }));
  const [s, setS] = useState<Settings | null>(null);
  const [t, setT] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'No pude cargar los ajustes.'} onRetry={reload} />;
  const cur = s ?? data.s;
  const tpl = t ?? data.t;

  async function save() {
    setMsg(null);
    const pct = Number(cur.payer_percent);
    if (!(pct >= 0 && pct <= 100)) { setMsg('El porcentaje debe estar entre 0 y 100.'); return; }
    try {
      await saveSettings({ display_name: cur.display_name, payer_name: cur.payer_name, payer_percent: pct, payer_phone: cur.payer_phone, payer_channel: 'whatsapp' });
      await saveTemplate('cuota_escuela', tpl);
      setMsg('Guardado ✓');
    } catch (e) { setMsg(friendly(e)); }
  }

  return (
    <div className="max-w-xl">
      <h1 className="page-title">Ajustes</h1>
      <section className="card mb-4">
        <h2 className="mb-3 text-xl">Mi perfil</h2>
        <Field label="Cómo te llamo"><input value={cur.display_name ?? ''} onChange={(e) => setS({ ...cur, display_name: e.target.value })} /></Field>
        <p className="text-sm text-suave">{session?.user.email}</p>
      </section>

      <section className="card mb-4">
        <h2 className="mb-1 text-xl">Responsable de pago de la cuota</h2>
        <p className="mb-3 text-sm text-suave">Es a quien le llega el mensaje con su parte de la cuota de Mia.</p>
        <Field label="Nombre"><input value={cur.payer_name} onChange={(e) => setS({ ...cur, payer_name: e.target.value })} /></Field>
        <Field label="Porcentaje que le corresponde (%)"><input inputMode="decimal" value={cur.payer_percent} onChange={(e) => setS({ ...cur, payer_percent: e.target.value as unknown as number })} /></Field>
        <Field label="WhatsApp (con código de país, ej. +54 9 11 1234 5678)"><input inputMode="tel" value={cur.payer_phone ?? ''} onChange={(e) => setS({ ...cur, payer_phone: e.target.value })} /></Field>
        <Field label="Plantilla del mensaje">
          <textarea rows={9} value={tpl} onChange={(e) => setT(e.target.value)} />
        </Field>
        <p className="mb-2 text-xs text-suave">Podés usar: {'{{nombre}} {{mes}} {{total}} {{porcentaje}} {{importe}}'}</p>
        <button className="btn-soft mb-3" onClick={() => setT(DEFAULT_TEMPLATE)}>Restaurar plantilla original</button>
        <button className="btn-primary w-full" onClick={save}>Guardar cambios</button>
        {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl">Recordatorios</h2>
        {perm === 'granted' ? <p>🔔 Activados en este dispositivo.</p> : perm === 'unsupported' ? <p className="text-suave">Este navegador no admite notificaciones.</p> : (
          <button className="btn-soft" onClick={async () => setPerm(await askNotificationPermission())}>Activar notificaciones</button>
        )}
        <p className="mt-2 text-xs text-suave">Los avisos llegan mientras VIVIA está abierta. Para avisos con la app cerrada hace falta configurar notificaciones push (ver documentación).</p>
      </section>

      <section className="card">
        <p className="mb-3 text-sm text-suave">VIVIA versión {appVersion}</p>
        <button className="btn-danger w-full" onClick={signOut}>Cerrar sesión</button>
      </section>
    </div>
  );
}
