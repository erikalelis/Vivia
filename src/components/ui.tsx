import type { ReactNode } from 'react';

export function Loading() { return <p className="py-8 text-center text-suave">Cargando…</p>; }

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border border-terracota-soft text-center">
      <p className="text-terracota">{message}</p>
      {onRetry && <button className="btn-soft mt-3" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) { return <p className="py-6 text-center text-suave">{children}</p>; }

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 md:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-xl2 bg-crema p-5 pb-safe md:max-w-lg md:rounded-xl2" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">{title}</h2>
          <button className="btn-ghost !px-3" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mb-3"><label>{label}</label>{children}</div>;
}

export const PRIORITY_STYLE: Record<string, string> = {
  alta: 'bg-terracota-soft text-terracota', media: 'bg-arena text-suave', baja: 'bg-salvia-soft text-salvia-dark'
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};
