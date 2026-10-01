import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anon && !url.includes('TU-PROYECTO'));

// Solo se usa la clave ANON (pública). La seguridad real está en las políticas RLS de la base.
export const supabase = createClient(url ?? 'http://localhost', anon ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
