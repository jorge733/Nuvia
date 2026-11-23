-- Repetición personalizada: "cada N semanas, los lunes y miércoles".
-- recur_days: días de la semana (0 = domingo … 6 = sábado) para repeticiones semanales.
-- Vacío o null: se repite el mismo día de la semana que la fecha de inicio.

alter table public.events
  add column if not exists recur_days smallint[]
  check (recur_days is null or (recur_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(recur_days) between 1 and 7));

-- Las funciones que devuelven eventos suman la columna (cambia su tipo de retorno, por eso se recrean).
drop function if exists public.calendar_feed(text, timestamptz, timestamptz);
drop function if exists public.digest_feed(text, timestamptz, timestamptz);
drop function if exists public.agenda_events(uuid, timestamptz, timestamptz);
drop function if exists public.visible_events(uuid, uuid, timestamptz, timestamptz);
drop function if exists public.guest_event(text);
drop function if exists public.shared_event(text);

create function public.visible_events(uid uuid, fid uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, created_by uuid, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  visibility public.event_visibility, recurrence public.recurrence, recur_interval smallint, recur_until date,
  recur_days smallint[], responsible_id uuid, participant_ids uuid[], masked boolean
) language sql stable security definer set search_path = '' as $$
  select e.id, e.family_id, e.created_by,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then 'Ocupado' else e.title end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then null else e.notes end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then null else e.location end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then 'otro'::public.event_category else e.category end,
    e.starts_at, e.ends_at, e.all_day, e.visibility, e.recurrence, e.recur_interval, e.recur_until,
    e.recur_days, e.responsible_id,
    coalesce((select array_agg(p.member_id) from public.event_participants p where p.event_id = e.id), '{}'),
    e.visibility = 'ocupado' and e.created_by is distinct from uid
  from public.events e
  where e.family_id = fid
    and exists (select 1 from public.family_members m where m.family_id = fid and m.user_id = uid)
    and (e.visibility <> 'privado' or e.created_by = uid)
    and e.starts_at <= p_to
    and (
      (e.recurrence = 'none' and coalesce(e.ends_at, e.starts_at) >= p_from)
      or (e.recurrence <> 'none' and (e.recur_until is null or e.recur_until >= (p_from at time zone 'America/Santiago')::date - 1))
    );
$$;

create function public.agenda_events(fid uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, created_by uuid, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  visibility public.event_visibility, recurrence public.recurrence, recur_interval smallint, recur_until date,
  recur_days smallint[], responsible_id uuid, participant_ids uuid[], masked boolean
) language sql stable security definer set search_path = '' as $$
  select * from public.visible_events(auth.uid(), fid, p_from, p_to);
$$;

create function public.calendar_feed(p_token text, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, family_name text, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date, recur_days smallint[],
  responsible_name text, skipped timestamptz[], overrides jsonb
) language sql stable security definer set search_path = '' as $$
  with u as (select t.user_id from public.calendar_tokens t where t.token = p_token and length(p_token) >= 32)
  select v.id, v.family_id, f.name, v.title, v.notes, v.location, v.category, v.starts_at, v.ends_at, v.all_day,
    v.recurrence, v.recur_interval, v.recur_until, v.recur_days,
    (select m.name from public.family_members m where m.id = v.responsible_id),
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = v.id), '{}'),
    coalesce((select jsonb_object_agg(to_char(r.occurrence_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), m.name)
              from public.relief_requests r join public.family_members m on m.id = r.taken_by
              where r.event_id = v.id and r.status = 'tomado'), '{}'::jsonb)
  from u
  join public.family_members fm on fm.user_id = u.user_id
  join public.families f on f.id = fm.family_id
  cross join lateral public.visible_events(u.user_id, fm.family_id, p_from, p_to) v;
$$;

create function public.digest_feed(p_secret text, p_from timestamptz, p_to timestamptz)
returns table (
  user_id uuid, email text, full_name text, email_token text,
  family_id uuid, family_name text, is_personal boolean, my_member_id uuid,
  event_id uuid, title text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean, visibility public.event_visibility,
  recurrence public.recurrence, recur_interval smallint, recur_until date, recur_days smallint[],
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
    v.recurrence, v.recur_interval, v.recur_until, v.recur_days, v.created_by, v.responsible_id, v.participant_ids,
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

create function public.guest_event(p_token text)
returns table (
  email text, muted boolean, inviter text, family_name text,
  event_id uuid, title text, notes text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date, recur_days smallint[], skipped timestamptz[]
) language sql stable security definer set search_path = '' as $$
  select g.email, g.muted, nullif(split_part(p.full_name, ' ', 1), ''),
    case when f.is_personal then null else f.name end,
    e.id, e.title, e.notes, e.location, e.category, e.starts_at, e.ends_at, e.all_day,
    e.recurrence, e.recur_interval, e.recur_until, e.recur_days,
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = e.id), '{}')
  from public.event_guests g
  join public.events e on e.id = g.event_id
  join public.families f on f.id = e.family_id
  left join public.profiles p on p.id = g.invited_by
  where p_token is not null and length(p_token) >= 32 and g.token = p_token;
$$;

create function public.shared_event(p_token text)
returns table (
  email text, muted boolean, inviter text, family_name text,
  event_id uuid, title text, notes text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date, recur_days smallint[], skipped timestamptz[]
) language sql stable security definer set search_path = '' as $$
  select null::text, false, nullif(split_part(p.full_name, ' ', 1), ''),
    case when f.is_personal then null else f.name end,
    e.id, e.title, e.notes, e.location, e.category, e.starts_at, e.ends_at, e.all_day,
    e.recurrence, e.recur_interval, e.recur_until, e.recur_days,
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = e.id), '{}')
  from public.events e
  join public.families f on f.id = e.family_id
  left join public.profiles p on p.id = e.created_by
  where p_token is not null and length(p_token) = 40 and e.share_token = p_token;
$$;

-- Mismos permisos que antes.
revoke execute on function
  public.visible_events(uuid, uuid, timestamptz, timestamptz), public.agenda_events(uuid, timestamptz, timestamptz),
  public.calendar_feed(text, timestamptz, timestamptz), public.digest_feed(text, timestamptz, timestamptz),
  public.guest_event(text), public.shared_event(text)
from public, anon;
-- visible_events recibe el usuario como parámetro: solo la usan las otras funciones, nunca directo.
revoke execute on function public.visible_events(uuid, uuid, timestamptz, timestamptz) from authenticated;
grant execute on function public.agenda_events(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function
  public.calendar_feed(text, timestamptz, timestamptz), public.digest_feed(text, timestamptz, timestamptz),
  public.guest_event(text), public.shared_event(text)
to anon, authenticated;
