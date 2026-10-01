import { useCallback, useEffect, useRef, useState } from 'react';

// Dictado del navegador (Web Speech API). Funciona en Chrome/Edge/Safari; no en todos los navegadores.
type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null };

export function useVoice(onFinal: (text: string) => void) {
  const SR = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) as (new () => Rec) | false;
  const supported = Boolean(SR);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    if (!SR) return;
    setError(null); setInterim('');
    const r = new SR();
    r.lang = 'es-AR'; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => {
      let fin = ''; let tmp = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else tmp += t;
      }
      setInterim(tmp);
      if (fin) cb.current(fin.trim());
    };
    r.onerror = (e: any) => {
      setError(e.error === 'not-allowed' ? 'Necesito permiso para usar el micrófono. Habilitalo en el navegador.' : 'No pude escucharte. Probá de nuevo o escribilo.');
      setListening(false);
    };
    r.onend = () => { setListening(false); setInterim(''); };
    rec.current = r; r.start(); setListening(true);
  }, [SR]);

  useEffect(() => () => rec.current?.stop(), []);
  return { supported, listening, interim, error, start, stop };
}
