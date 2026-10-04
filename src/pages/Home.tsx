import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { VivMark } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { getSettings } from '@/services/api';

/** Nombre para el saludo: se usa solo si la persona lo cargó (no el que sale del correo). */
function greetingName(display: string | null | undefined, email: string | undefined): string {
  const d = (display ?? '').trim();
  const local = (email ?? '').split('@')[0] ?? '';
  if (!d || d.toLowerCase() === local.toLowerCase() || /[._\d@]/.test(d)) return '';
  return d.split(' ')[0] ?? '';
}

const CARDS = [
  { to: '/traducir', icon: 'translate', title: 'Traducir', text: 'Entendé y respondé en otro idioma.', tone: 'lake' },
  { to: '/reunion', icon: 'mic', title: 'Reunión', text: 'Grabá y convertí todo en tareas.', tone: 'berry' },
  { to: '/ingles', icon: 'globe', title: 'Practicar inglés', text: 'Conversá por voz sobre tu trabajo.', tone: 'berry' },
  { to: '/perfil', icon: 'user', title: 'Mi perfil profesional', text: 'CV, experiencia y logros.', tone: 'lake' }
];

export default function Home() {
  const { session } = useAuth();
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((s) => { if (alive) setName(greetingName(s.display_name, session?.user.email)); })
      .catch(() => { /* sin nombre: el saludo queda genérico */ });
    return () => { alive = false; };
  }, [session?.user.email]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex items-center justify-between md:hidden">
        <VivMark size={36} />
      </header>

      <div className="flex flex-col gap-1.5">
        <p className="text-base text-muted md:text-lg">{name ? `Hola, ${name}` : 'Hola'}</p>
        <h1 className="text-[2.2rem] leading-[1.08] md:text-5xl">¿Qué necesitás hacer hoy?</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        <Link
          to="/entrevista"
          className="col-span-2 flex min-h-[190px] flex-col justify-between gap-4 rounded-xl3 bg-berry p-5 text-white transition active:scale-[0.99] md:min-h-[200px] md:p-8"
        >
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/20"><Icon name="chat" size={24} /></span>
          <span className="flex flex-col gap-1">
            <span className="font-display text-[1.65rem] font-bold md:text-3xl">Entrevista</span>
            <span className="max-w-md text-[15px] leading-snug text-berry-soft md:text-[17px]">Prepará tu próxima entrevista con respuestas basadas en tu experiencia real.</span>
          </span>
        </Link>

        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="flex min-h-[112px] flex-col justify-between gap-3 rounded-xl2 border border-line bg-white p-4 shadow-calma transition active:scale-[0.99] md:min-h-[200px] md:rounded-xl3 md:p-8"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full md:h-[52px] md:w-[52px] ${c.tone === 'lake' ? 'bg-lake-soft text-lake' : 'bg-berry-soft text-berry'}`}>
              <Icon name={c.icon} size={22} />
            </span>
            <span>
              <span className="block text-base font-bold md:text-xl">{c.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted md:text-[15px]">{c.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
