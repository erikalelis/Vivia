-- SOLO PARA DESARROLLO. Nunca lo ejecutes en producción.
-- Carga datos de ejemplo para la cuenta con este correo (la cuenta debe existir):
--   1) Cambiá el correo de abajo.  2) Pegá el archivo en el SQL Editor de Supabase de tu proyecto DE PRUEBA.
do $$
declare
  uid uuid := (select id from auth.users where email = 'CAMBIAR@correo.com');
  mia uuid;
begin
  if uid is null then raise exception 'No existe un usuario con ese correo'; end if;

  insert into people(user_id, name, relation) values (uid, 'Mia', 'hija') returning id into mia;

  insert into tasks(user_id, title, status, module, due_date, person_id, priority) values
    (uid, '[DEMO] Comprar regalo para Mia',        'pendiente',  'mia',     current_date - 1, mia, 'alta'),      -- vencida
    (uid, '[DEMO] Llamar al colegio',               'completada', 'mia',     current_date - 3, mia, 'media'),     -- completada
    (uid, '[DEMO] Renovar CV',                      'pospuesta',  'carrera', current_date + 5, null, 'media'),    -- reprogramada
    (uid, '[DEMO] Revisar autorización de salida',  'pendiente',  'mia',     current_date + 1, mia, 'media');

  insert into events(user_id, title, kind, module, starts_at, person_id) values
    (uid, '[DEMO] Reunión del colegio', 'reunión', 'mia', (current_date + 2)::timestamp + time '18:00' at time zone 'America/Argentina/Buenos_Aires', mia);

  insert into school_payments(user_id, institution, student, period_month, period_year, line_items, total_cents, share_percent, share_cents, payer_name, status)
  values (uid, '[DEMO] Colegio', 'Mia', 9, extract(year from current_date)::int,
          '[{"concept":"Cuota","amount_cents":"31751000"}]', 31751000, 50, 15875500, 'Ale', 'listo_para_enviar');
end $$;
