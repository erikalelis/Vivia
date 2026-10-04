-- Vivia 2.0 · Mi perfil profesional.
-- Migración ADITIVA: solo agrega una tabla y una columna. No borra ni modifica nada existente,
-- así que la versión anterior de la app sigue funcionando mientras se actualiza.

create table if not exists profile_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('experiencia','herramientas','proyectos','logros','idiomas','conocimientos','situaciones','fortalezas')),
  title text not null,
  detail text,
  source text not null default 'manual' check (source in ('cv','manual','voz')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profile_items_user_idx on profile_items(user_id, section);

drop trigger if exists profile_items_updated on profile_items;
create trigger profile_items_updated before update on profile_items for each row execute function set_updated_at();

-- Seguridad por fila: cada usuaria solo ve y modifica lo suyo.
alter table profile_items enable row level security;
drop policy if exists "profile_items_owner" on profile_items;
create policy "profile_items_owner" on profile_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Secciones del perfil que la usuaria decidió NO dejar usar a Vivia (entrevistas, inglés, etc.).
alter table settings add column if not exists profile_sections_off text[] not null default '{}';
