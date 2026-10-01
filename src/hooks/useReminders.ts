import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Recordatorios mientras VIVIA está abierta (o en segundo plano en el celular).
 * Un recordatorio NUNCA se borra por haber pasado: queda visible hasta que se descarta a mano.
 * Notificaciones con la app CERRADA requieren Web Push (servidor + claves VAPID): ver docs/ARCHITECTURE.md.
 */
export function useReminderNotifications(enabled: boolean) {
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined') return;
    const check = async () => {
      if (Notification.permission !== 'granted') return;
      const { data } = await supabase.from('reminders').select('id, message, remind_at').is('dismissed_at', null).lte('remind_at', new Date().toISOString());
      for (const r of data ?? []) {
        if (shown.current.has(r.id)) continue;
        shown.current.add(r.id);
        new Notification('VIVIA', { body: r.message ?? 'Tenés un recordatorio', icon: '/icon.svg', tag: r.id });
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [enabled]);
}

export async function askNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}
