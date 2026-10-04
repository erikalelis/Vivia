import type { MouseEvent, ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon, { VivMark } from '@/components/Icon';

export const NAV = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/entrevista', label: 'Entrevista', icon: 'chat', end: false },
  { to: '/reunion', label: 'Reunión', icon: 'mic', end: false },
  { to: '/ingles', label: 'Inglés', icon: 'globe', end: false },
  { to: '/perfil', label: 'Perfil', icon: 'user', end: false }
];

const trim = (v: string) => v.replace(/\/+$/, '');
/** True si la app se abrió en Inicio (lo normal): entonces "Inicio" puede volver al principio del historial. */
const OPENED_AT_HOME = typeof window !== 'undefined' && trim(window.location.pathname) === trim(import.meta.env.BASE_URL);

/**
 * Menú sin acumular historial: desde Inicio se entra a una sección (un paso); entre secciones se reemplaza;
 * y "Inicio" vuelve atrás al principio del historial. Así la flecha del teléfono siempre vuelve al Inicio
 * y recién ahí sale de la app.
 */
function useTabClick() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const atHome = pathname === '/' || pathname === '';
    if (to === pathname) return;
    if (to === '/') {
      if (idx > 0 && OPENED_AT_HOME) navigate(-idx);
      else if (idx > 0) navigate('/', { replace: true });
      else navigate('/');
      return;
    }
    navigate(to, { replace: !atHome });
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  const tab = useTabClick();
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Computadora y tablet: menú lateral */}
      <aside className="hidden w-[268px] shrink-0 flex-col gap-1.5 border-r border-line bg-white px-5 py-8 md:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <VivMark size={40} />
          <span className="font-display text-3xl font-bold tracking-tight">Vivia</span>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={tab(n.to)}
            className={({ isActive }) =>
              `flex h-12 items-center gap-3 rounded-2xl px-4 text-[15px] transition ${isActive ? 'bg-berry-soft font-bold text-berry' : 'font-medium text-muted hover:bg-mist'}`
            }
          >
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <p className="pt-2 text-center text-[11px] text-muted">Hecho por Bluvia</p>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-5xl px-5 pt-6 md:px-14 md:pt-12">{children}</div>
        <p className="py-6 text-center text-[11px] text-muted md:hidden">Hecho por Bluvia</p>
      </main>

      {/* Celular: navegación inferior */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white px-2 pt-2 md:hidden" aria-label="Navegación principal">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={tab(n.to)}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 pb-2 text-[11px] ${isActive ? 'font-bold text-berry' : 'font-medium text-muted'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-[30px] w-[52px] items-center justify-center rounded-full transition ${isActive ? 'bg-berry-soft' : ''}`}>
                  <Icon name={n.icon} size={22} />
                </span>
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
