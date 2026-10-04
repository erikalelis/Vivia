import { useRegisterSW } from 'virtual:pwa-register/react';

declare const __APP_VERSION__: string;

/**
 * Aviso de nueva versión. El service worker nuevo se descarga en segundo plano y queda
 * "en espera"; recién al tocar el botón se activa y se recarga la app. Los datos están en
 * Supabase (no en la caché), así que actualizar nunca los borra.
 */
export default function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Busca versiones nuevas cada hora y cada vez que se vuelve a abrir la app.
      if (!reg) return;
      setInterval(() => reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
    }
  });

  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl2 bg-tinta px-4 py-3 text-white shadow-calma">
      <span className="text-sm">Hay una nueva versión de Vivia.</span>
      <button className="btn-primary !py-1.5 text-sm" onClick={() => updateServiceWorker(true)}>Actualizar ahora</button>
    </div>
  );
}

export const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
