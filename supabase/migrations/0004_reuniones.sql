-- Vivia 2.0 · Reuniones guardadas. Migración ADITIVA (solo agrega una tabla).
-- El audio NO se guarda: solo el resumen, las decisiones, las tareas y (si la persona lo elige) la transcripción.
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists meetings_user_idx on meetings(user_id, created_at desc);
alter table meetings enable row level security;
drop policy if exists "meetings_owner" on meetings;
create policy "meetings_owner" on meetings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
