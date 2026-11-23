-- Uniluva · Invitar a una actividad con un enlace
--
-- Quien puede editar la actividad crea un enlace (share_token) y lo comparte, por ejemplo por WhatsApp.
-- Quien lo abre ve la actividad sin cuenta y puede dejar su correo para quedar como invitado
-- (recibe la invitación y los avisos de cambios y cancelación). El enlace se puede desactivar.

alter table public.events add column if not exists share_token text unique
  check (share_token is null or share_token ~ '^[a-f0-9]{40}$');

-- Con enlace pueden sumarse más personas: hasta 50 invitados por actividad.
create or replace function public.check_guest_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.event_guests g where g.event_id = new.event_id) >= 50 then
    raise exception 'Máximo 50 invitados por actividad';
  end if;
  return new;
end;
$$;

-- La actividad vista desde el enlace compartido (mismas columnas que guest_event, sin correo).
create or replace function public.shared_event(p_token text)
returns table (
  email text, muted boolean, inviter text, family_name text,
  event_id uuid, title text, notes text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date, skipped timestamptz[]
) language sql stable security definer set search_path = '' as $$
  select null::text, false, nullif(split_part(p.full_name, ' ', 1), ''),
    case when f.is_personal then null else f.name end,
    e.id, e.title, e.notes, e.location, e.category, e.starts_at, e.ends_at, e.all_day,
    e.recurrence, e.recur_interval, e.recur_until,
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = e.id), '{}')
  from public.events e
  join public.families f on f.id = e.family_id
  left join public.profiles p on p.id = e.created_by
  where p_token is not null and length(p_token) = 40 and e.share_token = p_token;
$$;

-- Sumarse como invitado desde el enlace. Devuelve el enlace personal (token) solo si el correo es nuevo;
-- si ya estaba invitado, devuelve null (así nadie obtiene el enlace personal de otra persona).
create or replace function public.join_shared_event(p_token text, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  e public.events;
  t text;
begin
  if p_token is null or length(p_token) <> 40 then raise exception 'Enlace no válido'; end if;
  select * into e from public.events where share_token = p_token;
  if e.id is null then raise exception 'Enlace no válido'; end if;
  if p_email is null or char_length(p_email) > 254 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo no válido';
  end if;
  insert into public.event_guests (event_id, email, invited_by)
  values (e.id, lower(p_email), e.created_by)
  on conflict (event_id, lower(email)) do nothing
  returning token into t;
  return t;
end;
$$;

revoke execute on function public.shared_event(text) from public;
revoke execute on function public.join_shared_event(text, text) from public;
grant execute on function public.shared_event(text) to anon, authenticated;
grant execute on function public.join_shared_event(text, text) to anon, authenticated;
