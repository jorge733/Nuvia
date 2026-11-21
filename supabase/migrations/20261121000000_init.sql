-- Uniluva — esquema inicial
-- Principio: el valor de tus aportes importa más que tu popularidad.
--  * No hay contadores públicos de reacciones ni seguidores.
--  * Las reacciones son cualitativas y solo las ve el autor del aporte.
--  * El feed "Útiles" ordena por utilidad (reacciones ponderadas + conversación), no por popularidad bruta.

-- ─────────────────────────────────────────────────────────────
-- Perfiles
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio          text check (char_length(bio) <= 280),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), ''),
    '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base) < 3 then
    base := base || 'luva';
  end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                  candidate), 60)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Comunidades
-- ─────────────────────────────────────────────────────────────
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name        text not null check (char_length(name) between 3 and 60),
  description text check (char_length(description) <= 300),
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  role         text not null default 'member' check (role in ('member', 'admin')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

-- Quien crea una comunidad queda como admin.
create function public.handle_new_community()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.community_members (community_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_community_created
  after insert on public.communities
  for each row execute function public.handle_new_community();

-- ─────────────────────────────────────────────────────────────
-- Aportes, comentarios y reacciones
-- ─────────────────────────────────────────────────────────────
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  community_id uuid references public.communities (id) on delete set null,
  body         text not null check (char_length(body) between 1 and 5000),
  link_url     text check (link_url ~* '^https?://' and char_length(link_url) <= 500),
  image_path   text,
  created_at   timestamptz not null default now()
);
create index posts_created_idx   on public.posts (created_at desc);
create index posts_community_idx on public.posts (community_id, created_at desc);
create index posts_author_idx    on public.posts (author_id, created_at desc);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  kind       text not null check (kind in ('aprendi', 'ayudo', 'inspiro')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);
create index reactions_user_idx on public.reactions (user_id);

-- Peso de cada reacción para utilidad y reputación.
create function public.reaction_weight(kind text)
returns int
language sql
immutable
as $$
  select case kind when 'ayudo' then 3 when 'aprendi' then 2 else 1 end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Notificaciones (las crean solo los triggers)
-- ─────────────────────────────────────────────────────────────
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  actor_id      uuid references public.profiles (id) on delete cascade,
  type          text not null check (type in ('comment', 'reaction')),
  post_id       uuid references public.posts (id) on delete cascade,
  reaction_kind text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id and not exists (
    select 1 from public.notifications
    where user_id = owner and actor_id = new.user_id and post_id = new.post_id
      and type = 'reaction' and reaction_kind = new.kind
  ) then
    insert into public.notifications (user_id, actor_id, type, post_id, reaction_kind)
    values (owner, new.user_id, 'reaction', new.post_id, new.kind);
  end if;
  return new;
end;
$$;

create trigger on_reaction_created
  after insert on public.reactions
  for each row execute function public.notify_on_reaction();

-- ─────────────────────────────────────────────────────────────
-- Feed y reputación
-- Las reacciones individuales son privadas; estas funciones solo exponen
-- el orden del feed y un puntaje agregado de reputación.
-- ─────────────────────────────────────────────────────────────
create function public.feed(
  p_mode      text default 'utiles',
  p_community uuid default null,
  p_limit     int  default 20,
  p_offset    int  default 0
)
returns setof public.posts
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.posts p
  left join lateral (
    select coalesce(sum(public.reaction_weight(r.kind)), 0) as pts
    from public.reactions r
    where r.post_id = p.id
  ) s on true
  left join lateral (
    select count(distinct c.author_id) as voices
    from public.comments c
    where c.post_id = p.id and c.author_id <> p.author_id
  ) cm on true
  where p_community is null or p.community_id = p_community
  order by
    case when p_mode = 'utiles' then
      (s.pts + cm.voices * 2 + 1)
        / power(extract(epoch from (now() - p.created_at)) / 3600 + 2, 1.3)
    end desc nulls last,
    p.created_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

create function public.reputation(p_user uuid)
returns table (community_id uuid, community_name text, community_slug text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.slug, sum(public.reaction_weight(r.kind))::bigint
  from public.reactions r
  join public.posts p on p.id = r.post_id
  left join public.communities c on c.id = p.community_id
  where p.author_id = p_user
  group by c.id, c.name, c.slug
  order by 4 desc;
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.communities       enable row level security;
alter table public.community_members enable row level security;
alter table public.posts             enable row level security;
alter table public.comments          enable row level security;
alter table public.reactions         enable row level security;
alter table public.notifications     enable row level security;

-- Perfiles: lectura pública, edición propia.
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Comunidades
create policy "communities_select" on public.communities for select using (true);
create policy "communities_insert" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "communities_update" on public.communities for update to authenticated
  using (exists (
    select 1 from public.community_members m
    where m.community_id = communities.id and m.user_id = (select auth.uid()) and m.role = 'admin'
  ));

-- Membresías: cualquiera se une o se va por sí mismo.
create policy "members_select" on public.community_members for select using (true);
create policy "members_insert" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member');
create policy "members_delete" on public.community_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Aportes: lectura pública; para publicar en una comunidad hay que ser miembro.
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      community_id is null
      or exists (
        select 1 from public.community_members m
        where m.community_id = posts.community_id and m.user_id = (select auth.uid())
      )
    )
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );
create policy "posts_delete" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

-- Comentarios
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "comments_delete" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Reacciones: privadas. Las ve quien reaccionó y el autor del aporte.
-- No se puede reaccionar a los aportes propios.
create policy "reactions_select" on public.reactions for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );
create policy "reactions_insert" on public.reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );
create policy "reactions_delete" on public.reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Notificaciones: solo las propias.
create policy "notifications_select" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications_delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Storage: bucket público "media", cada usuario escribe solo en su carpeta.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─────────────────────────────────────────────────────────────
-- Permisos de la Data API (explícitos, por si el proyecto no los
-- concede automáticamente). RLS sigue decidiendo qué filas se ven.
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.feed(text, uuid, int, int) to anon, authenticated;
grant execute on function public.reputation(uuid) to anon, authenticated;
