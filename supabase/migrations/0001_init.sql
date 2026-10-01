-- VIVIA · esquema inicial. Aislamiento por usuario con Row Level Security (RLS).
create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------
create type task_status as enum ('pendiente','en_curso','vencida','pospuesta','completada','cancelada');
create type task_priority as enum ('baja','media','alta');
create type module_name as enum ('general','mia','carrera','proyectos','documentos');
create type payment_status as enum ('pendiente','listo_para_enviar','enviado');
create type project_status as enum ('idea','planificado','en_desarrollo','prueba','publicado','pausado','finalizado');

-- Utilidad: updated_at ---------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- people -------------------------------------------------------------------
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- projects -----------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'idea',
  priority task_priority not null default 'media',
  due_date date,
  links jsonb not null default '[]',
  notes text,
  next_steps text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- documents (metadatos; el archivo vive en Storage, bucket "documents") ------
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  module module_name not null default 'general',
  category text,
  related_type text,
  related_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- tasks ---------------------------------------------------------------------
-- Una tarea nunca se borra por fecha: "vencida" se calcula (ver src/domain/tasks.ts).
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'pendiente',
  priority task_priority not null default 'media',
  module module_name not null default 'general',
  person_id uuid references people(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  due_date date,
  due_time time,
  recurrence text,
  tags text[] not null default '{}',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_status_idx on tasks(user_id, status, due_date);

-- events --------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'evento',
  module module_name not null default 'general',
  person_id uuid references people(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  recurrence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_user_start_idx on events(user_id, starts_at);

-- reminders -----------------------------------------------------------------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  remind_at timestamptz not null,
  message text,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);
create index reminders_user_idx on reminders(user_id, remind_at);

-- mia_items -------------------------------------------------------------------
create table mia_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('agenda','pendientes','documentos','automatizaciones')),
  title text not null,
  details text,
  task_id uuid references tasks(id) on delete set null,
  event_id uuid references events(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- message_templates -----------------------------------------------------------
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- school_payments (importes en CENTAVOS enteros: sin errores de punto flotante) --
create table school_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  institution text,
  student text,
  period_month int check (period_month between 1 and 12),
  period_year int,
  due_date date,
  line_items jsonb not null default '[]',
  total_cents bigint,
  share_percent numeric(5,2) not null default 50,
  share_cents bigint,
  payer_name text,
  message text,
  status payment_status not null default 'pendiente',
  sent_at timestamptz,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- career_items ------------------------------------------------------------------
create table career_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'postulacion',
  company text,
  position text,
  applied_on date,
  salary text,
  modality text,
  location text,
  contact text,
  status text not null default 'postulado',
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- automations / automation_runs --------------------------------------------------
create table automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  trigger text not null,
  actions jsonb not null default '[]',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  automation_id uuid not null references automations(id) on delete cascade,
  status text not null check (status in ('ok','revision','error')),
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- settings (una fila por usuario) --------------------------------------------------
create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  payer_name text not null default 'Ale',
  payer_percent numeric(5,2) not null default 50,
  payer_phone text,
  payer_channel text not null default 'whatsapp',
  updated_at timestamptz not null default now()
);

-- updated_at triggers ----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['people','projects','documents','tasks','events','mia_items',
    'message_templates','school_payments','career_items','automations','settings']
  loop
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- Row Level Security: cada usuario solo ve y modifica lo suyo --------------------------
do $$
declare t text;
begin
  foreach t in array array['people','projects','documents','tasks','events','reminders','mia_items',
    'message_templates','school_payments','career_items','automations','automation_runs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s_owner" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end $$;
alter table settings enable row level security;
create policy "settings_owner" on settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Alta automática de ajustes al registrarse -----------------------------------------------
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into settings(user_id, display_name) values (new.id, split_part(new.email,'@',1));
  insert into message_templates(user_id, key, body) values (new.id, 'cuota_escuela',
    E'Hola {{nombre}},\n\n¿Cómo estás?\n\nTe paso el valor de la escuela de este mes ({{mes}}):\n\nTotal: {{total}}\nA pagar ({{porcentaje}}%): {{importe}}\n\nGracias.');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Storage: bucket privado, cada usuario solo accede a su carpeta <user_id>/... ---------------
insert into storage.buckets (id, name, public) values ('documents','documents', false) on conflict do nothing;
create policy "documents_storage_owner" on storage.objects for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
