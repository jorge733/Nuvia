-- Uniluva · esquema inicial
-- Comunidades (edificios, condominios, pasajes, vecindarios), gastos comunes, reuniones,
-- documentos, reclamos/sugerencias, avisos y oficios recomendados por vecinos.
--
-- Seguridad: todas las tablas tienen RLS. Un vecino solo ve datos de las comunidades
-- donde su membresía está ACTIVA (aprobada). Las acciones sensibles pasan por funciones
-- SECURITY DEFINER que validan permisos explícitamente.

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────
create type public.community_kind as enum ('edificio', 'condominio', 'pasaje', 'vecindario');
create type public.member_role    as enum ('admin', 'comite', 'residente');
create type public.member_status  as enum ('pendiente', 'activo', 'rechazado');
create type public.member_relation as enum ('propietario', 'arrendatario', 'otro');
create type public.charge_status  as enum ('pendiente', 'informado', 'pagado');
create type public.ticket_kind    as enum ('reclamo', 'sugerencia', 'consulta_admin');
create type public.ticket_status  as enum ('abierto', 'en_revision', 'resuelto', 'cerrado');
create type public.document_category as enum ('reglamento', 'actas', 'presupuestos', 'contratos', 'seguros', 'otros');

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  phone       text check (char_length(phone) <= 30),
  created_at  timestamptz not null default now()
);

create table public.communities (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 2 and 80),
  kind                public.community_kind not null default 'edificio',
  address             text check (char_length(address) <= 160),
  comuna              text not null check (char_length(comuna) between 2 and 60),
  region              text check (char_length(region) <= 60),
  whatsapp_url        text check (whatsapp_url is null or whatsapp_url ~ '^https://(chat\.whatsapp\.com|wa\.me)/'),
  sales_whatsapp_url  text check (sales_whatsapp_url is null or sales_whatsapp_url ~ '^https://(chat\.whatsapp\.com|wa\.me)/'),
  admin_name          text check (char_length(admin_name) <= 80),
  admin_email         text check (char_length(admin_email) <= 120),
  admin_phone         text check (char_length(admin_phone) <= 30),
  invite_code         text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

create table public.units (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  label         text not null check (char_length(label) between 1 and 30),
  -- Prorrateo en % (opcional). Si todas las unidades lo tienen, el gasto común se reparte según él.
  share         numeric(7, 4) check (share is null or (share >= 0 and share <= 100)),
  created_at    timestamptz not null default now(),
  unique (community_id, label)
);

create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  unit_id       uuid references public.units (id) on delete set null,
  role          public.member_role not null default 'residente',
  status        public.member_status not null default 'pendiente',
  relation      public.member_relation not null default 'propietario',
  created_at    timestamptz not null default now(),
  unique (community_id, user_id)
);
create index on public.memberships (user_id);
create index on public.memberships (unit_id);

create table public.expense_periods (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid not null references public.communities (id) on delete cascade,
  period         date not null check (extract(day from period) = 1),
  total_amount   numeric(14, 0) not null check (total_amount >= 0),
  due_date       date,
  notes          text check (char_length(notes) <= 2000),
  document_path  text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (community_id, period)
);

create table public.unit_charges (
  id            uuid primary key default gen_random_uuid(),
  period_id     uuid not null references public.expense_periods (id) on delete cascade,
  community_id  uuid not null references public.communities (id) on delete cascade,
  unit_id       uuid not null references public.units (id) on delete cascade,
  amount        numeric(14, 0) not null check (amount >= 0),
  status        public.charge_status not null default 'pendiente',
  receipt_path  text,
  reported_at   timestamptz,
  paid_at       timestamptz,
  unique (period_id, unit_id)
);
create index on public.unit_charges (unit_id);
create index on public.unit_charges (community_id);

create table public.meetings (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 120),
  starts_at     timestamptz not null,
  location      text check (char_length(location) <= 160),
  online_url    text check (online_url is null or online_url ~ '^https://'),
  agenda        text check (char_length(agenda) <= 4000),
  minutes_path  text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.meetings (community_id, starts_at);

create table public.meeting_rsvps (
  meeting_id  uuid not null references public.meetings (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  attending   boolean not null,
  updated_at  timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  category      public.document_category not null default 'otros',
  title         text not null check (char_length(title) between 2 and 120),
  file_path     text not null,
  uploaded_by   uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.documents (community_id, category);

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 120),
  body          text not null check (char_length(body) <= 4000),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.announcements (community_id, created_at desc);

create table public.tickets (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities (id) on delete cascade,
  author_id     uuid references auth.users (id) on delete set null,
  kind          public.ticket_kind not null,
  title         text not null check (char_length(title) between 3 and 120),
  body          text not null check (char_length(body) between 1 and 4000),
  status        public.ticket_status not null default 'abierto',
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Las consultas al administrador son siempre privadas.
  check (kind <> 'consulta_admin' or not is_public)
);
create index on public.tickets (community_id, created_at desc);

create table public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index on public.ticket_comments (ticket_id, created_at);

create table public.ticket_votes (
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  primary key (ticket_id, user_id)
);

-- Oficios
create table public.trade_categories (
  slug  text primary key,
  name  text not null
);

create table public.tradespeople (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 80),
  category           text not null references public.trade_categories (slug),
  phone              text not null check (phone ~ '^\+?[0-9 ]{8,16}$'),
  comuna             text not null check (char_length(comuna) between 2 and 60),
  description        text check (char_length(description) <= 500),
  -- Quien lo agrega declara que el maestro autorizó compartir su contacto (Ley 21.719).
  consent_confirmed  boolean not null check (consent_confirmed),
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index on public.tradespeople (comuna, category);

create table public.trade_recommendations (
  id               uuid primary key default gen_random_uuid(),
  tradesperson_id  uuid not null references public.tradespeople (id) on delete cascade,
  community_id     uuid not null references public.communities (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  comment          text check (char_length(comment) <= 500),
  created_at       timestamptz not null default now(),
  unique (tradesperson_id, user_id)
);
create index on public.trade_recommendations (community_id);

-- ─────────────────────────────────────────────────────────────
-- Funciones de permisos (SECURITY DEFINER para evitar recursión en RLS)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.community_id = cid and m.user_id = auth.uid() and m.status = 'activo'
  );
$$;

create or replace function public.can_manage(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.community_id = cid and m.user_id = auth.uid()
      and m.status = 'activo' and m.role in ('admin', 'comite')
  );
$$;

-- Cualquier membresía (incluida pendiente): para ver el nombre de la comunidad mientras se espera aprobación.
create or replace function public.has_membership(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.community_id = cid and m.user_id = auth.uid()
                 and m.status <> 'rechazado');
$$;

create or replace function public.is_admin(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.community_id = cid and m.user_id = auth.uid()
                 and m.status = 'activo' and m.role = 'admin');
$$;

create or replace function public.my_unit_ids(cid uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.unit_id from public.memberships m
  where m.community_id = cid and m.user_id = auth.uid()
    and m.status = 'activo' and m.unit_id is not null;
$$;

create or replace function public.shares_community(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.community_id = a.community_id
    where a.user_id = auth.uid() and a.status = 'activo'
      and b.user_id = other and b.status in ('activo', 'pendiente')
  );
$$;

create or replace function public.can_see_ticket(tid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = tid
      and public.is_member(t.community_id)
      and (t.is_public or t.author_id = auth.uid() or public.can_manage(t.community_id))
  );
$$;

-- Comunas donde el usuario es miembro activo (para ver oficios de su zona).
create or replace function public.my_comunas()
returns setof text language sql stable security definer set search_path = '' as $$
  select distinct lower(c.comuna)
  from public.communities c
  join public.memberships m on m.community_id = c.id
  where m.user_id = auth.uid() and m.status = 'activo';
$$;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles para usuarios que ya existían antes de esta migración.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();

-- Un administrador no puede quitarse a sí mismo el último rol de admin.
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  remaining int;
begin
  if (tg_op = 'DELETE' and old.role = 'admin' and old.status = 'activo')
     or (tg_op = 'UPDATE' and old.role = 'admin' and old.status = 'activo'
         and (new.role <> 'admin' or new.status <> 'activo')) then
    select count(*) into remaining from public.memberships
    where community_id = old.community_id and role = 'admin' and status = 'activo' and id <> old.id;
    if remaining = 0 then
      -- Permitir el borrado en cascada cuando se elimina la comunidad o la cuenta del usuario.
      if tg_op = 'DELETE' and (
           not exists (select 1 from public.communities where id = old.community_id)
           or not exists (select 1 from auth.users where id = old.user_id)) then
        return old;
      end if;
      raise exception 'La comunidad debe tener al menos un administrador activo';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger memberships_keep_admin before update or delete on public.memberships
  for each row execute function public.keep_one_admin();

-- Solo un administrador puede cambiar roles; nadie puede mover una membresía a otra comunidad o usuario.
create or replace function public.guard_membership_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.community_id <> old.community_id or new.user_id <> old.user_id then
    raise exception 'No se puede reasignar una membresía';
  end if;
  if new.role <> old.role and auth.uid() is not null and not public.is_admin(old.community_id) then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end;
$$;

create trigger memberships_guard before update on public.memberships
  for each row execute function public.guard_membership_update();

-- ─────────────────────────────────────────────────────────────
-- RPC (acciones con validación propia)
-- ─────────────────────────────────────────────────────────────

-- Crea una comunidad y deja al creador como administrador activo.
create or replace function public.create_community(
  p_name text, p_kind public.community_kind, p_comuna text,
  p_address text default null, p_region text default null,
  p_unit_labels text[] default '{}', p_my_unit text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  my_unit uuid;
  lbl text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  insert into public.communities (name, kind, comuna, address, region, created_by)
  values (trim(p_name), p_kind, trim(p_comuna), nullif(trim(p_address), ''), nullif(trim(p_region), ''), auth.uid())
  returning id into cid;

  foreach lbl in array coalesce(p_unit_labels, '{}') loop
    if nullif(trim(lbl), '') is not null then
      insert into public.units (community_id, label) values (cid, trim(lbl))
      on conflict (community_id, label) do nothing;
    end if;
  end loop;

  if nullif(trim(p_my_unit), '') is not null then
    insert into public.units (community_id, label) values (cid, trim(p_my_unit))
    on conflict (community_id, label) do update set label = excluded.label
    returning id into my_unit;
  end if;

  insert into public.memberships (community_id, user_id, unit_id, role, status)
  values (cid, auth.uid(), my_unit, 'admin', 'activo');

  return cid;
end;
$$;

-- Vista previa pública mínima de una comunidad a partir del código de invitación.
create or replace function public.community_by_code(p_code text)
returns table (id uuid, name text, kind public.community_kind, comuna text, units jsonb)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.kind, c.comuna,
    coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'label', u.label) order by u.label)
              from public.units u where u.community_id = c.id), '[]'::jsonb)
  from public.communities c
  where auth.uid() is not null and c.invite_code = upper(trim(p_code));
$$;

-- Solicita unirse a una comunidad (queda pendiente hasta que un admin apruebe).
create or replace function public.join_community(
  p_code text, p_unit_id uuid default null, p_unit_label text default null,
  p_relation public.member_relation default 'propietario'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  uid uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;

  select c.id into cid from public.communities c where c.invite_code = upper(trim(p_code));
  if cid is null then raise exception 'Código de invitación no válido'; end if;

  if p_unit_id is not null then
    select u.id into uid from public.units u where u.id = p_unit_id and u.community_id = cid;
    if uid is null then raise exception 'La unidad no pertenece a esta comunidad'; end if;
  elsif nullif(trim(p_unit_label), '') is not null then
    insert into public.units (community_id, label) values (cid, trim(p_unit_label))
    on conflict (community_id, label) do update set label = excluded.label
    returning id into uid;
  end if;

  insert into public.memberships (community_id, user_id, unit_id, relation, status)
  values (cid, auth.uid(), uid, p_relation, 'pendiente')
  on conflict (community_id, user_id) do update
    set unit_id = excluded.unit_id, relation = excluded.relation,
        status = case when public.memberships.status = 'activo' then 'activo'::public.member_status
                      else 'pendiente'::public.member_status end;

  return cid;
end;
$$;

-- El vecino informa que pagó su gasto común (el admin luego lo confirma).
create or replace function public.report_payment(p_charge_id uuid, p_receipt_path text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ch public.unit_charges;
begin
  select * into ch from public.unit_charges where id = p_charge_id;
  if ch.id is null or ch.unit_id not in (select public.my_unit_ids(ch.community_id)) then
    raise exception 'No puedes informar el pago de esta unidad';
  end if;
  if ch.status = 'pagado' then return; end if;
  if p_receipt_path is not null and p_receipt_path not like ch.community_id::text || '/comprobantes/' || auth.uid()::text || '/%' then
    raise exception 'Ruta de comprobante no válida';
  end if;
  update public.unit_charges
  set status = 'informado', reported_at = now(), receipt_path = coalesce(p_receipt_path, receipt_path)
  where id = p_charge_id;
end;
$$;

-- Nuevo código de invitación (por si el anterior se filtró).
create or replace function public.rotate_invite_code(cid uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  code text;
begin
  if not public.can_manage(cid) then raise exception 'Sin permisos'; end if;
  code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  update public.communities set invite_code = code where id = cid;
  return code;
end;
$$;

-- Oficios recomendados en la zona (comuna) de una comunidad, con resumen de recomendaciones.
-- Los comentarios de otras comunidades no se exponen: solo cantidad y promedio.
create or replace function public.zone_tradespeople(cid uuid)
returns table (
  id uuid, name text, category text, category_name text, phone text, comuna text, description text,
  recommendations bigint, communities bigint, avg_rating numeric, recommended_here boolean, recommended_by_me boolean
) language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.category, tc.name, t.phone, t.comuna, t.description,
    count(r.id), count(distinct r.community_id), round(avg(r.rating), 1),
    bool_or(r.community_id = cid), bool_or(r.user_id = auth.uid())
  from public.tradespeople t
  join public.trade_categories tc on tc.slug = t.category
  join public.trade_recommendations r on r.tradesperson_id = t.id
  join public.communities c on c.id = cid
  where public.is_member(cid)
    and (lower(t.comuna) = lower(c.comuna) or r.community_id = cid)
  group by t.id, tc.name
  order by bool_or(r.community_id = cid) desc, count(r.id) desc, avg(r.rating) desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.communities           enable row level security;
alter table public.units                 enable row level security;
alter table public.memberships           enable row level security;
alter table public.expense_periods       enable row level security;
alter table public.unit_charges          enable row level security;
alter table public.meetings              enable row level security;
alter table public.meeting_rsvps         enable row level security;
alter table public.documents             enable row level security;
alter table public.announcements         enable row level security;
alter table public.tickets               enable row level security;
alter table public.ticket_comments       enable row level security;
alter table public.ticket_votes          enable row level security;
alter table public.trade_categories      enable row level security;
alter table public.tradespeople          enable row level security;
alter table public.trade_recommendations enable row level security;

-- profiles
create policy "perfil propio o de vecinos" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_community(id));
create policy "editar perfil propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- communities (se crean solo vía create_community)
create policy "ver mis comunidades" on public.communities for select to authenticated
  using (public.has_membership(id));
create policy "admin edita comunidad" on public.communities for update to authenticated
  using (public.can_manage(id)) with check (public.can_manage(id));
create policy "admin elimina comunidad" on public.communities for delete to authenticated
  using (public.is_admin(id));

-- units
create policy "miembros ven unidades" on public.units for select to authenticated
  using (public.is_member(community_id));
create policy "admin gestiona unidades" on public.units for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- memberships
create policy "ver membresías" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_member(community_id));
create policy "admin gestiona membresías" on public.memberships for update to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));
create policy "salir o expulsar" on public.memberships for delete to authenticated
  using (user_id = auth.uid() or public.can_manage(community_id));

-- expense_periods
create policy "miembros ven periodos" on public.expense_periods for select to authenticated
  using (public.is_member(community_id));
create policy "admin gestiona periodos" on public.expense_periods for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- unit_charges: cada vecino ve solo los de su unidad; la directiva ve todos.
create policy "ver cobros" on public.unit_charges for select to authenticated
  using (public.can_manage(community_id) or unit_id in (select public.my_unit_ids(community_id)));
create policy "admin gestiona cobros" on public.unit_charges for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- meetings
create policy "miembros ven reuniones" on public.meetings for select to authenticated
  using (public.is_member(community_id));
create policy "admin gestiona reuniones" on public.meetings for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- meeting_rsvps
create policy "ver asistencia" on public.meeting_rsvps for select to authenticated
  using (exists (select 1 from public.meetings mt where mt.id = meeting_id and public.is_member(mt.community_id)));
create policy "confirmar asistencia" on public.meeting_rsvps for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.meetings mt where mt.id = meeting_id and public.is_member(mt.community_id)));
create policy "cambiar asistencia" on public.meeting_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "quitar asistencia" on public.meeting_rsvps for delete to authenticated
  using (user_id = auth.uid());

-- documents
create policy "miembros ven documentos" on public.documents for select to authenticated
  using (public.is_member(community_id));
create policy "admin gestiona documentos" on public.documents for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- announcements
create policy "miembros ven avisos" on public.announcements for select to authenticated
  using (public.is_member(community_id));
create policy "admin gestiona avisos" on public.announcements for all to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));

-- tickets
create policy "ver tickets" on public.tickets for select to authenticated
  using (public.is_member(community_id)
         and (is_public or author_id = auth.uid() or public.can_manage(community_id)));
create policy "crear ticket" on public.tickets for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(community_id) and status = 'abierto');
create policy "admin actualiza tickets" on public.tickets for update to authenticated
  using (public.can_manage(community_id)) with check (public.can_manage(community_id));
create policy "borrar ticket" on public.tickets for delete to authenticated
  using (author_id = auth.uid() or public.can_manage(community_id));

-- ticket_comments
create policy "ver comentarios" on public.ticket_comments for select to authenticated
  using (public.can_see_ticket(ticket_id));
create policy "comentar" on public.ticket_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_ticket(ticket_id));
create policy "borrar comentario propio" on public.ticket_comments for delete to authenticated
  using (author_id = auth.uid());

-- ticket_votes (solo en tickets visibles)
create policy "ver votos" on public.ticket_votes for select to authenticated
  using (public.can_see_ticket(ticket_id));
create policy "votar" on public.ticket_votes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_ticket(ticket_id));
create policy "quitar voto" on public.ticket_votes for delete to authenticated
  using (user_id = auth.uid());

-- trade_categories
create policy "ver categorías" on public.trade_categories for select to authenticated using (true);

-- tradespeople: visibles para quienes viven en la misma comuna o en una comunidad que los recomienda.
create policy "ver maestros de mi zona" on public.tradespeople for select to authenticated
  using (created_by = auth.uid()
         or lower(comuna) in (select public.my_comunas())
         or exists (select 1 from public.trade_recommendations r
                    where r.tradesperson_id = tradespeople.id and public.is_member(r.community_id)));
create policy "agregar maestro" on public.tradespeople for insert to authenticated
  with check (created_by = auth.uid() and lower(comuna) in (select public.my_comunas()));
create policy "editar maestro propio" on public.tradespeople for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- trade_recommendations: los comentarios solo se ven dentro de la comunidad.
create policy "ver recomendaciones de mi comunidad" on public.trade_recommendations for select to authenticated
  using (public.is_member(community_id));
create policy "recomendar" on public.trade_recommendations for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(community_id));
create policy "editar recomendación propia" on public.trade_recommendations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(community_id));
create policy "borrar recomendación" on public.trade_recommendations for delete to authenticated
  using (user_id = auth.uid() or public.can_manage(community_id));

-- El teléfono del perfil no es visible para los vecinos: solo para el propio usuario y la directiva.
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, created_at) on public.profiles to authenticated;

create or replace function public.my_profile()
returns table (full_name text, phone text) language sql stable security definer set search_path = '' as $$
  select p.full_name, p.phone from public.profiles p where p.id = auth.uid();
$$;

-- Directorio de miembros para la directiva (incluye teléfono y correo).
create or replace function public.member_directory(cid uuid)
returns table (membership_id uuid, user_id uuid, full_name text, phone text, email text, role public.member_role,
               status public.member_status, relation public.member_relation, unit_id uuid, unit_label text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id, p.full_name, p.phone, u.email::text, m.role, m.status, m.relation, m.unit_id, un.label, m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  left join public.units un on un.id = m.unit_id
  where m.community_id = cid and public.can_manage(cid)
  order by (m.status = 'pendiente') desc, un.label nulls last, p.full_name;
$$;

-- ─────────────────────────────────────────────────────────────
-- Permisos de ejecución
-- ─────────────────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_member(uuid), public.can_manage(uuid), public.has_membership(uuid), public.is_admin(uuid), public.my_unit_ids(uuid), public.shares_community(uuid),
  public.can_see_ticket(uuid), public.my_comunas(),
  public.create_community(text, public.community_kind, text, text, text, text[], text),
  public.community_by_code(text), public.join_community(text, uuid, text, public.member_relation),
  public.report_payment(uuid, text), public.rotate_invite_code(uuid), public.zone_tradespeople(uuid),
  public.my_profile(), public.member_directory(uuid)
to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Datos base
-- ─────────────────────────────────────────────────────────────
insert into public.trade_categories (slug, name) values
  ('gasfiter', 'Gásfiter'),
  ('electricista', 'Electricista'),
  ('cerrajero', 'Cerrajero'),
  ('pintor', 'Pintor'),
  ('carpintero', 'Carpintero'),
  ('maestro', 'Maestro de obras'),
  ('jardinero', 'Jardinero'),
  ('aseo', 'Aseo y limpieza'),
  ('climatizacion', 'Climatización y calefont'),
  ('electrodomesticos', 'Técnico en electrodomésticos'),
  ('vidriero', 'Vidriero'),
  ('techumbre', 'Techumbre y canaletas'),
  ('fumigacion', 'Fumigación y control de plagas'),
  ('mudanzas', 'Mudanzas y fletes'),
  ('computacion', 'Computación y redes'),
  ('otro', 'Otro oficio')
on conflict (slug) do nothing;
