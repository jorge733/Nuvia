-- Uniluva · Resumen diario por correo
--
-- Cada mañana, un trabajo programado (Vercel Cron) pide los datos del día con un secreto
-- guardado en un esquema privado, y envía "Tu día en Uniluva" a cada persona.
-- Nadie más puede leer esos datos: la función exige el secreto.

-- Preferencias de correo en el perfil
alter table public.profiles add column if not exists daily_email boolean not null default true;
alter table public.profiles add column if not exists email_token text unique default encode(extensions.gen_random_bytes(18), 'hex');
update public.profiles set email_token = encode(extensions.gen_random_bytes(18), 'hex') where email_token is null;
grant select (daily_email) , update (daily_email) on public.profiles to authenticated;

-- Configuración privada (no expuesta por la API)
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.config (key text primary key, value text not null);
insert into private.config (key, value)
values ('cron_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- Datos del resumen: eventos visibles de cada persona con resumen activado.
create or replace function public.digest_feed(p_secret text, p_from timestamptz, p_to timestamptz)
returns table (
  user_id uuid, email text, full_name text, email_token text,
  family_id uuid, family_name text, is_personal boolean, my_member_id uuid,
  event_id uuid, title text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean, visibility public.event_visibility,
  recurrence public.recurrence, recur_interval smallint, recur_until date,
  created_by uuid, responsible_id uuid, participant_ids uuid[],
  skipped timestamptz[], completed timestamptz[], reliefs jsonb
) language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or length(p_secret) < 32
     or p_secret is distinct from (select c.value from private.config c where c.key = 'cron_secret') then
    raise exception 'No autorizado';
  end if;

  return query
  select u.id, u.email::text, p.full_name, p.email_token,
    f.id, f.name, f.is_personal, fm.id,
    v.id, v.title, v.location, v.category, v.starts_at, v.ends_at, v.all_day, v.visibility,
    v.recurrence, v.recur_interval, v.recur_until, v.created_by, v.responsible_id, v.participant_ids,
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = v.id), '{}'),
    coalesce((select array_agg(c.occurrence_start) from public.event_completions c where c.event_id = v.id
              and c.occurrence_start between p_from - interval '1 day' and p_to), '{}'),
    coalesce((select jsonb_agg(jsonb_build_object(
                'at', to_char(r.occurrence_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                'status', r.status, 'taken_by', r.taken_by, 'requested_by', r.requested_by))
              from public.relief_requests r where r.event_id = v.id and r.status <> 'cancelado'
                and r.occurrence_start between p_from - interval '1 day' and p_to), '[]'::jsonb)
  from auth.users u
  join public.profiles p on p.id = u.id and p.daily_email
  join public.family_members fm on fm.user_id = u.id
  join public.families f on f.id = fm.family_id
  cross join lateral public.visible_events(u.id, f.id, p_from, p_to) v
  where u.email is not null and u.email_confirmed_at is not null and not v.masked;
end;
$$;

-- Darse de baja con un clic desde el correo.
create or replace function public.unsubscribe_digest(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update public.profiles set daily_email = false where email_token = p_token;
  return found;
end;
$$;

revoke execute on function public.digest_feed(text, timestamptz, timestamptz) from public;
revoke execute on function public.unsubscribe_digest(text) from public;
grant execute on function public.digest_feed(text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.unsubscribe_digest(text) to anon, authenticated;

-- Muestra el secreto una sola vez para copiarlo en Vercel (variable CRON_SECRET).
select value as cron_secret_para_vercel from private.config where key = 'cron_secret';
