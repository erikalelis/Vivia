import { useState, type FormEvent } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { VivMark } from '@/components/Icon';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        if (password.length < 8) throw new Error('short');
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: 'Te enviamos un correo para confirmar tu cuenta. Después podés ingresar.' });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}restablecer` });
        if (error) throw error;
        setMsg({ ok: true, text: 'Si el correo existe, te enviamos un enlace para crear una contraseña nueva.' });
      }
    } catch (err) {
      const m = (err as Error).message;
      setMsg({ ok: false, text:
        m === 'short' ? 'La contraseña debe tener al menos 8 caracteres.' :
        /Invalid login/i.test(m) ? 'El correo o la contraseña no son correctos.' :
        /already registered/i.test(m) ? 'Ese correo ya tiene una cuenta. Probá ingresar.' :
        'No pude completar la acción. Revisá los datos e intentá de nuevo.' });
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-full items-center justify-center overflow-y-auto bg-mist px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <VivMark size={80} tile className="mx-auto mb-3" />
          <h1 className="text-5xl text-ink">Vivia</h1>
          <p className="text-muted">Tu asistente profesional con IA.</p>
        </div>
        {!isConfigured && (
          <div className="card mb-4 border border-terracota-soft text-sm text-terracota">
            Falta conectar la base de datos. Completá <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code> (ver README).
          </div>
        )}
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="text-xl">{mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}</h2>
          <div><label htmlFor="email">Correo</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== 'forgot' && (
            <div><label htmlFor="pw">Contraseña</label><input id="pw" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="mt-1 text-sm text-suave underline" onClick={() => setShow((v) => !v)}>{show ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button></div>
          )}
          {msg && <p className={msg.ok ? 'text-salvia-dark' : 'text-terracota'} role="alert">{msg.text}</p>}
          <button className="btn-primary w-full" disabled={busy || !isConfigured}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-suave">
            {mode !== 'login' && <button type="button" className="underline" onClick={() => { setMode('login'); setMsg(null); }}>Ya tengo cuenta</button>}
            {mode === 'login' && <button type="button" className="underline" onClick={() => { setMode('register'); setMsg(null); }}>Crear cuenta</button>}
            {mode === 'login' && <button type="button" className="underline" onClick={() => { setMode('forgot'); setMsg(null); }}>Olvidé mi contraseña</button>}
          </div>
        </form>
        <p className="mt-6 text-center text-[11px] text-muted">Hecho por Bluvia</p>
      </div>
    </div>
  );
}

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setMsg('La contraseña debe tener al menos 8 caracteres.'); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) setMsg('No pude cambiar la contraseña. El enlace puede haber vencido: pedí uno nuevo.');
    else onDone();
  }
  return (
    <div className="flex min-h-full items-center justify-center p-5">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h2 className="text-xl">Nueva contraseña</h2>
        <input type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" />
        <button type="button" className="text-sm text-suave underline" onClick={() => setShow((v) => !v)}>{show ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
        {msg && <p className="text-terracota" role="alert">{msg}</p>}
        <button className="btn-primary w-full">Guardar</button>
      </form>
    </div>
  );
}
