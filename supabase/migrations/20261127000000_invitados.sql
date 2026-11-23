-- Uniluva · Invitados a una actividad
--
-- Se puede invitar por correo a cualquier persona (aunque no tenga cuenta ni sea de la familia).
-- El invitado recibe un correo con un enlace personal (token) para ver la actividad, agregarla a
-- su calendario y dejar de recibir avisos. Le llegan correos cuando la actividad cambia o se cancela.

create table if not exists public.event_guests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  email       text not null check (char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token       text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  -- El invitado pidió no recibir más avisos de esta actividad.
  muted       boolean not null default false,
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists event_guests_event_email on public.event_guests (event_id, lower(email));

-- Máximo 20 invitados por actividad.
create or replace function public.check_guest_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.event_guests g where g.event_id = new.event_id) >= 20 then
    raise exception 'Máximo 20 invitados por actividad';
  end if;
  return new;
end;
$$;
drop trigger if exists guest_limit on public.event_guests;
create trigger guest_limit before insert on public.event_guests for each row execute function public.check_guest_limit();

alter table public.event_guests enable row level security;
drop policy if exists "ver invitados" on public.event_guests;
drop policy if exists "invitar" on public.event_guests;
drop policy if exists "editar invitados" on public.event_guests;
drop policy if exists "quitar invitados" on public.event_guests;
create policy "ver invitados" on public.event_guests for select to authenticated using (public.can_edit_event(event_id));
create policy "invitar" on public.event_guests for insert to authenticated
  with check (public.can_edit_event(event_id) and invited_by = auth.uid());
create policy "editar invitados" on public.event_guests for update to authenticated
  using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));
create policy "quitar invitados" on public.event_guests for delete to authenticated using (public.can_edit_event(event_id));

-- La invitación vista por el invitado (sin cuenta), con su enlace personal.
create or replace function public.guest_event(p_token text)
returns table (
  email text, muted boolean, inviter text, family_name text,
  event_id uuid, title text, notes text, location text, category public.event_category,
  starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date, skipped timestamptz[]
) language sql stable security definer set search_path = '' as $$
  select g.email, g.muted, nullif(split_part(p.full_name, ' ', 1), ''),
    case when f.is_personal then null else f.name end,
    e.id, e.title, e.notes, e.location, e.category, e.starts_at, e.ends_at, e.all_day,
    e.recurrence, e.recur_interval, e.recur_until,
    coalesce((select array_agg(s.occurrence_start) from public.event_skips s where s.event_id = e.id), '{}')
  from public.event_guests g
  join public.events e on e.id = g.event_id
  join public.families f on f.id = e.family_id
  left join public.profiles p on p.id = g.invited_by
  where p_token is not null and length(p_token) >= 32 and g.token = p_token;
$$;

-- Dejar de recibir avisos de esa actividad (desde el correo o la página de la invitación).
create or replace function public.unsubscribe_guest(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update public.event_guests set muted = true where token = p_token;
  return found;
end;
$$;

revoke execute on function public.guest_event(text) from public;
revoke execute on function public.unsubscribe_guest(text) from public;
grant execute on function public.guest_event(text) to anon, authenticated;
grant execute on function public.unsubscribe_guest(text) to anon, authenticated;
