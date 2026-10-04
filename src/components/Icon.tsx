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
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  logout: <path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" />
};

export default function Icon({ name, size = 22, className = '' }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/** Símbolo de Vivia: dos hojas (frambuesa y lago) que brotan juntas formando una V. */
export function VivMark({ size = 36, tile = false, className = '' }: { size?: number; tile?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Vivia">
      {tile && <rect width="120" height="120" rx="28" fill="#FBF7F9" />}
      <g transform="translate(60 90)">
        <path transform="rotate(-32)" d="M0.0 -0.0 L1.3 -1.6 L2.6 -3.1 L3.9 -4.6 L5.2 -6.2 L6.4 -7.8 L7.5 -9.3 L8.6 -10.8 L9.7 -12.4 L10.7 -14.0 L11.6 -15.5 L12.4 -17.1 L13.1 -18.6 L13.8 -20.2 L14.4 -21.7 L14.8 -23.2 L15.2 -24.8 L15.5 -26.3 L15.7 -27.9 L15.7 -29.4 L15.7 -31.0 L15.6 -32.6 L15.4 -34.1 L15.1 -35.6 L14.7 -37.2 L14.2 -38.8 L13.7 -40.3 L13.0 -41.9 L12.3 -43.4 L11.5 -44.9 L10.7 -46.5 L9.8 -48.1 L8.8 -49.6 L7.8 -51.1 L6.7 -52.7 L5.7 -54.2 L4.5 -55.8 L3.4 -57.4 L2.3 -58.9 L1.1 -60.4 L0.0 -62.0 L-0.0 -62.0 L-1.1 -60.4 L-2.3 -58.9 L-3.4 -57.4 L-4.5 -55.8 L-5.7 -54.2 L-6.7 -52.7 L-7.8 -51.1 L-8.8 -49.6 L-9.8 -48.1 L-10.7 -46.5 L-11.5 -44.9 L-12.3 -43.4 L-13.0 -41.9 L-13.7 -40.3 L-14.2 -38.8 L-14.7 -37.2 L-15.1 -35.6 L-15.4 -34.1 L-15.6 -32.6 L-15.7 -31.0 L-15.7 -29.4 L-15.7 -27.9 L-15.5 -26.3 L-15.2 -24.8 L-14.8 -23.2 L-14.4 -21.7 L-13.8 -20.2 L-13.1 -18.6 L-12.4 -17.1 L-11.6 -15.5 L-10.7 -14.0 L-9.7 -12.4 L-8.6 -10.8 L-7.5 -9.3 L-6.4 -7.8 L-5.2 -6.2 L-3.9 -4.6 L-2.6 -3.1 L-1.3 -1.6 L-0.0 -0.0Z" fill="#C42F7F" />
        <path transform="rotate(32)" d="M0.0 -0.0 L1.3 -1.6 L2.6 -3.1 L3.9 -4.6 L5.2 -6.2 L6.4 -7.8 L7.5 -9.3 L8.6 -10.8 L9.7 -12.4 L10.7 -14.0 L11.6 -15.5 L12.4 -17.1 L13.1 -18.6 L13.8 -20.2 L14.4 -21.7 L14.8 -23.2 L15.2 -24.8 L15.5 -26.3 L15.7 -27.9 L15.7 -29.4 L15.7 -31.0 L15.6 -32.6 L15.4 -34.1 L15.1 -35.6 L14.7 -37.2 L14.2 -38.8 L13.7 -40.3 L13.0 -41.9 L12.3 -43.4 L11.5 -44.9 L10.7 -46.5 L9.8 -48.1 L8.8 -49.6 L7.8 -51.1 L6.7 -52.7 L5.7 -54.2 L4.5 -55.8 L3.4 -57.4 L2.3 -58.9 L1.1 -60.4 L0.0 -62.0 L-0.0 -62.0 L-1.1 -60.4 L-2.3 -58.9 L-3.4 -57.4 L-4.5 -55.8 L-5.7 -54.2 L-6.7 -52.7 L-7.8 -51.1 L-8.8 -49.6 L-9.8 -48.1 L-10.7 -46.5 L-11.5 -44.9 L-12.3 -43.4 L-13.0 -41.9 L-13.7 -40.3 L-14.2 -38.8 L-14.7 -37.2 L-15.1 -35.6 L-15.4 -34.1 L-15.6 -32.6 L-15.7 -31.0 L-15.7 -29.4 L-15.7 -27.9 L-15.5 -26.3 L-15.2 -24.8 L-14.8 -23.2 L-14.4 -21.7 L-13.8 -20.2 L-13.1 -18.6 L-12.4 -17.1 L-11.6 -15.5 L-10.7 -14.0 L-9.7 -12.4 L-8.6 -10.8 L-7.5 -9.3 L-6.4 -7.8 L-5.2 -6.2 L-3.9 -4.6 L-2.6 -3.1 L-1.3 -1.6 L-0.0 -0.0Z" fill="#2A9AA1" />
        <circle r="4" fill="#7A1646" />
      </g>
    </svg>
  );
}
