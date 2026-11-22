-- Uniluva · Agenda familiar y personal
--
-- Familias con perfiles (con o sin cuenta: niños, abuelos, mascotas), eventos personales y
-- familiares con repetición, responsables por evento, pedidos de relevo, tareas hechas y
-- suscripción de calendario (ICS) para ver la agenda en Google/Apple Calendar.
--
-- Seguridad: RLS en todas las tablas. Los eventos "privado" solo los ve quien los creó; los
-- "ocupado" los ve la familia como un bloque sin detalles (se leen vía funciones que enmascaran).

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Limpieza del módulo anterior de comunidades (no hace nada en una base nueva)
-- ─────────────────────────────────────────────────────────────
drop policy if exists "uniluva: leer archivos" on storage.objects;
drop policy if exists "uniluva: subir archivos" on storage.objects;
drop policy if exists "uniluva: borrar archivos" on storage.objects;

drop table if exists
  public.trade_recommendations, public.tradespeople, public.trade_categories,
  public.ticket_votes, public.ticket_comments, public.tickets, public.announcements,
  public.documents, public.meeting_rsvps, public.meetings, public.unit_charges,
  public.expense_periods, public.memberships, public.units, public.communities
cascade;

drop function if exists
  public.is_member(uuid), public.can_manage(uuid), public.has_membership(uuid), public.is_admin(uuid),
  public.my_unit_ids(uuid), public.shares_community(uuid), public.can_see_ticket(uuid), public.my_comunas(),
  public.create_community(text, public.community_kind, text, text, text, text[], text),
  public.community_by_code(text), public.join_community(text, uuid, text, public.member_relation),
  public.report_payment(uuid, text), public.rotate_invite_code(uuid), public.zone_tradespeople(uuid),
  public.member_directory(uuid), public.storage_community(text), public.my_profile(),
  public.keep_one_admin(), public.guard_membership_update(), public.touch_updated_at()
cascade;

drop type if exists
  public.community_kind, public.member_role, public.member_status, public.member_relation,
  public.charge_status, public.ticket_kind, public.ticket_status, public.document_category
cascade;

-- ─────────────────────────────────────────────────────────────
-- Perfiles (uno por cuenta)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  phone       text check (char_length(phone) <= 30),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────
create type public.member_kind      as enum ('adulto', 'nino', 'adulto_mayor', 'mascota');
create type public.family_role      as enum ('admin', 'miembro');
create type public.event_visibility as enum ('familia', 'privado', 'ocupado');
create type public.event_category   as enum ('salud', 'colegio', 'hogar', 'compras', 'tramites', 'transporte', 'celebracion', 'mascotas', 'trabajo', 'otro');
create type public.recurrence       as enum ('none', 'diaria', 'dias_habiles', 'semanal', 'mensual', 'anual');
create type public.relief_status    as enum ('abierto', 'tomado', 'cancelado');

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────
create table public.families (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 60),
  invite_code  text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Personas de la familia. user_id es null para perfiles sin cuenta (niños, abuelos, mascotas).
create table public.family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 40),
  kind        public.member_kind not null default 'adulto',
  color       text not null default 'violeta' check (color in ('violeta', 'coral', 'verde', 'azul', 'ambar', 'rosa', 'turquesa', 'gris')),
  role        public.family_role not null default 'miembro',
  phone       text check (char_length(phone) <= 30),
  created_at  timestamptz not null default now(),
  unique (family_id, user_id)
);
create index on public.family_members (user_id);

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  created_by      uuid references auth.users (id) on delete set null,
  title           text not null check (char_length(title) between 1 and 120),
  notes           text check (char_length(notes) <= 2000),
  location        text check (char_length(location) <= 160),
  category        public.event_category not null default 'otro',
  starts_at       timestamptz not null,
  ends_at         timestamptz check (ends_at is null or ends_at >= starts_at),
  all_day         boolean not null default false,
  visibility      public.event_visibility not null default 'familia',
  recurrence      public.recurrence not null default 'none',
  recur_interval  smallint not null default 1 check (recur_interval between 1 and 52),
  recur_until     date,
  -- Quién se encarga (por defecto, para todas las repeticiones).
  responsible_id  uuid references public.family_members (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.events (family_id, starts_at);

-- Para quién es el evento (ej.: "Dentista" es para la Sofi; se encarga el papá).
create table public.event_participants (
  event_id   uuid not null references public.events (id) on delete cascade,
  member_id  uuid not null references public.family_members (id) on delete cascade,
  primary key (event_id, member_id)
);
create index on public.event_participants (member_id);

-- Pedidos de relevo. Un relevo "tomado" reemplaza al responsable de ESA repetición.
-- También se usa (con requested_by null) cuando alguien toma una repetición sin responsable.
create table public.relief_requests (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  family_id         uuid not null references public.families (id) on delete cascade,
  occurrence_start  timestamptz not null,
  requested_by      uuid references public.family_members (id) on delete set null,
  reason            text check (char_length(reason) <= 300),
  status            public.relief_status not null default 'abierto',
  taken_by          uuid references public.family_members (id) on delete set null,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);
create index on public.relief_requests (family_id, status);
create index on public.relief_requests (event_id, occurrence_start);
-- Solo un relevo vigente (abierto o tomado) por repetición.
create unique index relief_one_active on public.relief_requests (event_id, occurrence_start) where status <> 'cancelado';

create table public.event_completions (
  event_id          uuid not null references public.events (id) on delete cascade,
  occurrence_start  timestamptz not null,
  family_id         uuid not null references public.families (id) on delete cascade,
  completed_by      uuid references public.family_members (id) on delete set null,
  completed_at      timestamptz not null default now(),
  primary key (event_id, occurrence_start)
);

-- Repeticiones eliminadas de una serie ("eliminar solo este día").
create table public.event_skips (
  event_id          uuid not null references public.events (id) on delete cascade,
  occurrence_start  timestamptz not null,
  primary key (event_id, occurrence_start)
);

-- Enlace secreto para suscribirse a la agenda desde Google/Apple Calendar.
create table public.calendar_tokens (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Funciones de permisos
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_family_member(fid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = fid and m.user_id = auth.uid());
$$;

create or replace function public.is_family_admin(fid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = fid and m.user_id = auth.uid() and m.role = 'admin');
$$;

create or replace function public.my_member_id(fid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.family_members m where m.family_id = fid and m.user_id = auth.uid();
$$;

-- ¿Puede el usuario actual ver/editar este evento? (familia, o privado/ocupado propio)
create or replace function public.can_edit_event(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    where e.id = eid and public.is_family_member(e.family_id)
      and (e.visibility = 'familia' or e.created_by = auth.uid())
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- Responsables y participantes deben ser de la misma familia que el evento.
create or replace function public.check_event_members()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.responsible_id is not null and not exists (
    select 1 from public.family_members m where m.id = new.responsible_id and m.family_id = new.family_id) then
    raise exception 'El responsable no pertenece a la familia';
  end if;
  if tg_op = 'UPDATE' and new.family_id <> old.family_id then
    raise exception 'No se puede mover un evento a otra familia';
  end if;
  return new;
end;
$$;

create trigger events_check_members before insert or update on public.events
  for each row execute function public.check_event_members();

create or replace function public.check_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.events e join public.family_members m on m.family_id = e.family_id
    where e.id = new.event_id and m.id = new.member_id) then
    raise exception 'El participante no pertenece a la familia';
  end if;
  return new;
end;
$$;

create trigger participants_check before insert or update on public.event_participants
  for each row execute function public.check_participant();

-- Nadie puede vincular un perfil a otra cuenta ni moverlo de familia; solo un admin cambia roles.
-- Siempre debe quedar al menos un admin con cuenta.
create or replace function public.guard_member_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.family_id <> old.family_id then raise exception 'No se puede mover a otra familia'; end if;
    if new.user_id is distinct from old.user_id and auth.uid() is not null
       and coalesce(current_setting('uniluva.joining', true), '') <> '1' then
      raise exception 'Para vincular una cuenta usa el enlace de invitación';
    end if;
    if new.role <> old.role and auth.uid() is not null and not public.is_family_admin(old.family_id) then
      raise exception 'Solo un administrador puede cambiar roles';
    end if;
  end if;

  if old.role = 'admin' and old.user_id is not null
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.user_id is null)
     and not exists (select 1 from public.family_members m
                     where m.family_id = old.family_id and m.role = 'admin' and m.user_id is not null and m.id <> old.id)
     and exists (select 1 from public.families f where f.id = old.family_id)
     and exists (select 1 from auth.users u where u.id = old.user_id) then
    -- Si es el único adulto con cuenta, puede salir (la familia queda sin cuentas y se borra abajo).
    if tg_op = 'DELETE' and not exists (select 1 from public.family_members m
                                        where m.family_id = old.family_id and m.user_id is not null and m.id <> old.id) then
      return old;
    end if;
    raise exception 'La familia debe tener al menos un administrador. Nombra a otra persona antes.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger members_guard before update or delete on public.family_members
  for each row execute function public.guard_member_update();

-- Si la última cuenta sale de la familia, la familia se elimina.
create or replace function public.delete_orphan_family()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is not null and not exists (
    select 1 from public.family_members m where m.family_id = old.family_id and m.user_id is not null) then
    delete from public.families where id = old.family_id;
  end if;
  return null;
end;
$$;

create trigger members_delete_orphan after delete on public.family_members
  for each row execute function public.delete_orphan_family();

-- ─────────────────────────────────────────────────────────────
-- RPC
-- ─────────────────────────────────────────────────────────────

-- Crea una familia con el usuario como admin y, opcionalmente, otros perfiles sin cuenta.
-- p_members: [{"name": "Sofi", "kind": "nino", "color": "coral"}, ...]
create or replace function public.create_family(
  p_name text, p_my_name text, p_my_color text default 'violeta', p_members jsonb default '[]'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  m jsonb;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  insert into public.families (name, created_by) values (trim(p_name), auth.uid()) returning id into fid;

  insert into public.family_members (family_id, user_id, name, kind, color, role)
  values (fid, auth.uid(), trim(p_my_name), 'adulto', coalesce(nullif(p_my_color, ''), 'violeta'), 'admin');

  for m in select * from jsonb_array_elements(coalesce(p_members, '[]')) loop
    if nullif(trim(m ->> 'name'), '') is not null then
      insert into public.family_members (family_id, name, kind, color)
      values (fid, left(trim(m ->> 'name'), 40),
              coalesce((m ->> 'kind')::public.member_kind, 'adulto'),
              coalesce(nullif(m ->> 'color', ''), 'gris'));
    end if;
  end loop;

  return fid;
end;
$$;

-- Vista previa de la familia a partir del código: nombre y perfiles sin cuenta que se pueden reclamar.
create or replace function public.family_by_code(p_code text)
returns table (id uuid, name text, open_members jsonb)
language sql stable security definer set search_path = '' as $$
  select f.id, f.name,
    coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'kind', m.kind) order by m.name)
              from public.family_members m
              where m.family_id = f.id and m.user_id is null and m.kind in ('adulto', 'adulto_mayor', 'nino')), '[]'::jsonb)
  from public.families f
  where auth.uid() is not null and f.invite_code = upper(trim(p_code));
$$;

-- Se une a la familia: reclama un perfil existente sin cuenta o crea uno nuevo.
create or replace function public.join_family(p_code text, p_member_id uuid default null, p_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  claimed int;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select f.id into fid from public.families f where f.invite_code = upper(trim(p_code));
  if fid is null then raise exception 'Código de invitación no válido'; end if;
  if exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid()) then
    return fid;
  end if;

  if p_member_id is not null then
    perform set_config('uniluva.joining', '1', true);
    update public.family_members set user_id = auth.uid()
    where id = p_member_id and family_id = fid and user_id is null;
    get diagnostics claimed = row_count;
    perform set_config('uniluva.joining', '', true);
    if claimed = 0 then raise exception 'Ese perfil ya no está disponible'; end if;
  else
    if nullif(trim(p_name), '') is null then raise exception 'Escribe tu nombre'; end if;
    insert into public.family_members (family_id, user_id, name, kind, color)
    values (fid, auth.uid(), left(trim(p_name), 40), 'adulto', 'azul');
  end if;
  return fid;
end;
$$;

create or replace function public.rotate_family_code(fid uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  code text;
begin
  if not public.is_family_admin(fid) then raise exception 'Solo un administrador puede hacerlo'; end if;
  code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  update public.families set invite_code = code where id = fid;
  return code;
end;
$$;

-- Toma un relevo abierto (o una repetición sin responsable si p_relief_id es null).
create or replace function public.take_relief(p_relief_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.relief_requests;
  me uuid;
begin
  select * into r from public.relief_requests where id = p_relief_id;
  if r.id is null or not public.is_family_member(r.family_id) then raise exception 'Relevo no encontrado'; end if;
  if r.status <> 'abierto' then raise exception 'Este relevo ya fue tomado o cancelado'; end if;
  me := public.my_member_id(r.family_id);
  update public.relief_requests set status = 'tomado', taken_by = me, resolved_at = now() where id = r.id;
end;
$$;

-- Eventos visibles para un usuario en una familia y un rango. Los "ocupado" ajenos vienen enmascarados.
create or replace function public.visible_events(uid uuid, fid uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, created_by uuid, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  visibility public.event_visibility, recurrence public.recurrence, recur_interval smallint, recur_until date,
  responsible_id uuid, participant_ids uuid[], masked boolean
) language sql stable security definer set search_path = '' as $$
  select e.id, e.family_id, e.created_by,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then 'Ocupado' else e.title end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then null else e.notes end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then null else e.location end,
    case when e.visibility = 'ocupado' and e.created_by is distinct from uid then 'otro'::public.event_category else e.category end,
    e.starts_at, e.ends_at, e.all_day, e.visibility, e.recurrence, e.recur_interval, e.recur_until,
    e.responsible_id,
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

-- Versión para la app (usuario de la sesión).
create or replace function public.agenda_events(fid uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, created_by uuid, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  visibility public.event_visibility, recurrence public.recurrence, recur_interval smallint, recur_until date,
  responsible_id uuid, participant_ids uuid[], masked boolean
) language sql stable security definer set search_path = '' as $$
  select * from public.visible_events(auth.uid(), fid, p_from, p_to);
$$;

-- Suscripción ICS: la llama el servidor sin sesión, con el token secreto del usuario.
create or replace function public.calendar_feed(p_token text, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, family_id uuid, family_name text, title text, notes text, location text,
  category public.event_category, starts_at timestamptz, ends_at timestamptz, all_day boolean,
  recurrence public.recurrence, recur_interval smallint, recur_until date,
  responsible_name text, skipped timestamptz[], overrides jsonb
) language sql stable security definer set search_path = '' as $$
  with u as (select t.user_id from public.calendar_tokens t where t.token = p_token and length(p_token) >= 32)
  select v.id, v.family_id, f.name, v.title, v.notes, v.location, v.category, v.starts_at, v.ends_at, v.all_day,
    v.recurrence, v.recur_interval, v.recur_until,
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

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.families           enable row level security;
alter table public.family_members     enable row level security;
alter table public.events             enable row level security;
alter table public.event_participants enable row level security;
alter table public.relief_requests    enable row level security;
alter table public.event_completions  enable row level security;
alter table public.event_skips        enable row level security;
alter table public.calendar_tokens    enable row level security;

-- profiles
drop policy if exists "perfil propio o de vecinos" on public.profiles;
drop policy if exists "editar perfil propio" on public.profiles;
drop policy if exists "perfil propio" on public.profiles;
create policy "perfil propio" on public.profiles for select to authenticated using (id = auth.uid());
create policy "editar perfil propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- families
create policy "ver mi familia" on public.families for select to authenticated using (public.is_family_member(id));
create policy "admin edita familia" on public.families for update to authenticated
  using (public.is_family_admin(id)) with check (public.is_family_admin(id));
create policy "admin elimina familia" on public.families for delete to authenticated using (public.is_family_admin(id));

-- family_members: cualquier adulto con cuenta agrega o edita perfiles; quitar: admin, o uno mismo (salir).
create policy "ver integrantes" on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy "agregar perfil sin cuenta" on public.family_members for insert to authenticated
  with check (public.is_family_member(family_id) and user_id is null and role = 'miembro');
create policy "editar integrantes" on public.family_members for update to authenticated
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
create policy "quitar integrantes" on public.family_members for delete to authenticated
  using (user_id = auth.uid() or (public.is_family_member(family_id) and user_id is null) or public.is_family_admin(family_id));

-- events (las lecturas de la app pasan por agenda_events; esta política protege el acceso directo)
create policy "ver eventos" on public.events for select to authenticated
  using (public.is_family_member(family_id) and (visibility = 'familia' or created_by = auth.uid()));
create policy "crear eventos" on public.events for insert to authenticated
  with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "editar eventos" on public.events for update to authenticated
  using (public.is_family_member(family_id) and (visibility = 'familia' or created_by = auth.uid()))
  with check (public.is_family_member(family_id) and (visibility = 'familia' or created_by = auth.uid()));
create policy "borrar eventos" on public.events for delete to authenticated
  using (public.is_family_member(family_id) and (visibility = 'familia' or created_by = auth.uid()));

-- event_participants
create policy "ver participantes" on public.event_participants for select to authenticated using (public.can_edit_event(event_id));
create policy "gestionar participantes" on public.event_participants for all to authenticated
  using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));

-- relief_requests (tomar un relevo: RPC take_relief)
create policy "ver relevos" on public.relief_requests for select to authenticated using (public.is_family_member(family_id));
create policy "pedir relevo" on public.relief_requests for insert to authenticated
  with check (public.is_family_member(family_id) and public.can_edit_event(event_id)
              and exists (select 1 from public.events e where e.id = event_id and e.family_id = relief_requests.family_id)
              and (requested_by is null or requested_by = public.my_member_id(family_id))
              and (taken_by is null or taken_by = public.my_member_id(family_id)));
create policy "cancelar relevo" on public.relief_requests for update to authenticated
  using (public.is_family_member(family_id) and (requested_by = public.my_member_id(family_id) or taken_by = public.my_member_id(family_id) or public.is_family_admin(family_id)))
  with check (public.is_family_member(family_id) and status = 'cancelado');

-- event_completions
create policy "ver hechos" on public.event_completions for select to authenticated using (public.is_family_member(family_id));
create policy "marcar hecho" on public.event_completions for insert to authenticated
  with check (public.can_edit_event(event_id) and public.is_family_member(family_id)
              and exists (select 1 from public.events e where e.id = event_id and e.family_id = event_completions.family_id));
create policy "desmarcar hecho" on public.event_completions for delete to authenticated using (public.can_edit_event(event_id));

-- event_skips
create policy "ver omitidos" on public.event_skips for select to authenticated using (public.can_edit_event(event_id));
create policy "omitir repetición" on public.event_skips for insert to authenticated with check (public.can_edit_event(event_id));
create policy "restaurar repetición" on public.event_skips for delete to authenticated using (public.can_edit_event(event_id));

-- calendar_tokens
create policy "mi token" on public.calendar_tokens for select to authenticated using (user_id = auth.uid());
create policy "crear mi token" on public.calendar_tokens for insert to authenticated with check (user_id = auth.uid());
create policy "renovar mi token" on public.calendar_tokens for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Privilegios
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
revoke all on
  public.families, public.family_members, public.events, public.event_participants,
  public.relief_requests, public.event_completions, public.event_skips, public.calendar_tokens
from anon;
grant select, insert, update, delete on
  public.families, public.family_members, public.events, public.event_participants,
  public.relief_requests, public.event_completions, public.event_skips, public.calendar_tokens
to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, phone, created_at), update (full_name, phone) on public.profiles to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_family_member(uuid), public.is_family_admin(uuid), public.my_member_id(uuid), public.can_edit_event(uuid),
  public.create_family(text, text, text, jsonb), public.family_by_code(text), public.join_family(text, uuid, text),
  public.rotate_family_code(uuid), public.take_relief(uuid), public.agenda_events(uuid, timestamptz, timestamptz)
to authenticated;
-- La suscripción de calendario se consulta sin sesión; está protegida por el token secreto.
grant execute on function public.calendar_feed(text, timestamptz, timestamptz) to anon, authenticated;
