import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import BrainDump from '@/components/BrainDump';
import Icon, { FlowerMark } from '@/components/Icon';

const MAIN = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/pendientes', label: 'Pendientes', icon: 'check' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/mia', label: 'Mia', icon: 'flower' }
];
const MORE = [
  { to: '/carrera', label: 'Mi carrera', icon: 'briefcase' },
  { to: '/proyectos', label: 'Mis proyectos', icon: 'layers' },
  { to: '/documentos', label: 'Documentos', icon: 'file' },
  { to: '/automatizaciones', label: 'Automatizaciones', icon: 'zap' },
  { to: '/ajustes', label: 'Ajustes', icon: 'sliders' }
];

export default function Layout({ children, refreshKey, onChanged }: { children: ReactNode; refreshKey: number; onChanged: () => void }) {
  const [dump, setDump] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${isActive ? 'bg-gradient-to-r from-salvia-soft to-white text-salvia-dark font-semibold shadow-sm' : 'text-suave hover:bg-salvia-soft/60'}`;

  const search = (
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/buscar?q=${encodeURIComponent(q.trim())}`); }} className="relative">
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en todo…" aria-label="Búsqueda global" className="!pl-10" />
    </form>
  );

  return (
    <div className="flex h-full">
      {/* Escritorio: barra lateral */}
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-arena bg-white/70 p-4 backdrop-blur md:flex">
        <div className="mb-4 flex items-center gap-3 px-2">
          <FlowerMark size={40} />
          <div><h1 className="text-2xl leading-none text-salvia-dark">VIVIA</h1><p className="mt-1 text-xs text-suave">Tu vida, en un solo lugar.</p></div>
        </div>
        <div className="mb-2">{search}</div>
        <button className="btn-primary mb-3" onClick={() => setDump(true)}><Icon name="mic" size={20} />Despejar la cabeza</button>
        {[...MAIN, ...MORE].map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}><Icon name={n.icon} />{n.label}</NavLink>)}
      </aside>

      <main key={refreshKey} className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <div className="mb-4 md:hidden">{search}</div>
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Móvil: botón de voz siempre visible + navegación inferior */}
      <button className="btn-primary fixed bottom-20 right-4 z-30 !h-14 !w-14 !rounded-full !p-0 md:hidden" onClick={() => setDump(true)} aria-label="Despejar la cabeza"><Icon name="mic" size={26} /></button>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-arena bg-white/95 backdrop-blur md:hidden" aria-label="Navegación principal">
        {[...MAIN, { to: '/mas', label: 'Más', icon: 'menu' }].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${isActive ? 'text-salvia-dark font-semibold' : 'text-suave'}`}>
            <Icon name={n.icon} size={24} />{n.label}
          </NavLink>
        ))}
      </nav>

      {dump && <BrainDump onClose={() => setDump(false)} onSaved={onChanged} />}
    </div>
  );
}

export function MorePage() {
  return (
    <div>
      <h1 className="page-title">Más</h1>
      <div className="grid gap-3">
        {MORE.map((n) => <NavLink key={n.to} to={n.to} className="card flex items-center gap-3 text-lg"><span className="text-salvia"><Icon name={n.icon} /></span>{n.label}</NavLink>)}
      </div>
    </div>
  );
}
