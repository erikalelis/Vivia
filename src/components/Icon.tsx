import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5L15.5 9.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  flower: <><circle cx="12" cy="12" r="2.2" /><circle cx="12" cy="6" r="2.8" /><circle cx="17.7" cy="10.2" r="2.8" /><circle cx="15.5" cy="17" r="2.8" /><circle cx="8.5" cy="17" r="2.8" /><circle cx="6.3" cy="10.2" r="2.8" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></>,
  layers: <path d="m12 3-9 5 9 5 9-5-9-5ZM3 13l9 5 9-5" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  sliders: <><path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  mic: <><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" /><path d="M19 11a7 7 0 0 1-14 0M12 18v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" />,
  whatsapp: <path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8zM9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-.8-.4-1.6-1.2-2-2l.8-1-1-2z" />
};

export default function Icon({ name, size = 22, className = '' }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

export function FlowerMark({ size = 28 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={size} height={size} className="inline-block rounded-lg" />;
}
