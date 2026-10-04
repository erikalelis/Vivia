import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  translate: <path d="M4 6h9M8.5 4v2M6 6c.6 3 2.6 5.4 5.5 6.8M11 6c-.6 3-3 5.8-7 7M13 20l4-9 4 9M14.4 17h5.2" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  logout: <path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" />
};

export default function Icon({ name, size = 22, className = '' }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/** Símbolo de Vivia: globo de conversación con una V que sube y termina en un punto de luz. */
export function VivMark({ size = 36, tile = false, className = '' }: { size?: number; tile?: boolean; className?: string }) {
  if (tile) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Vivia">
        <rect width="120" height="120" rx="28" fill="#A8245E" />
        <g transform="translate(24 22) scale(.64)">
          <path d="M32 18h56a16 16 0 0 1 16 16v38a16 16 0 0 1-16 16H66L44 108V88H32a16 16 0 0 1-16-16V34a16 16 0 0 1 16-16z" fill="#fff" />
          <path d="M40 40l17 26 21-31" fill="none" stroke="#A8245E" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="80" cy="33" r="7.5" fill="#2A7A80" />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Vivia">
      <path d="M32 18h56a16 16 0 0 1 16 16v38a16 16 0 0 1-16 16H66L44 108V88H32a16 16 0 0 1-16-16V34a16 16 0 0 1 16-16z" fill="#A8245E" />
      <path d="M40 40l17 26 21-31" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="33" r="7.5" fill="#9BE3DC" />
    </svg>
  );
}
