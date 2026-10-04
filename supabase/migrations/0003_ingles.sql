-- Vivia 2.0 · Practicar inglés: errores frecuentes. Migración ADITIVA (solo agrega una tabla).
create table if not exists english_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wrong text not null,
  "right" text not null,
  why text,
  created_at timestamptz not null default now()
);
create index if not exists english_mistakes_user_idx on english_mistakes(user_id, created_at desc);
alter table english_mistakes enable row level security;
drop policy if exists "english_mistakes_owner" on english_mistakes;
create policy "english_mistakes_owner" on english_mistakes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
