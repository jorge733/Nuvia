-- Uniluva · Mi agenda (espacio personal)
--
-- Cada cuenta tiene un espacio personal: una "familia" de una sola persona marcada con
-- is_personal. Reutiliza eventos, repeticiones, hechos y calendario, pero nadie más puede
-- unirse ni ser agregado.

alter table public.families add column if not exists is_personal boolean not null default false;
create unique index if not exists families_one_personal on public.families (created_by) where is_personal;

-- Crea (si no existe) y devuelve el espacio personal del usuario.
create or replace function public.ensure_personal_space()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  my_name text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select f.id into fid from public.families f where f.created_by = auth.uid() and f.is_personal;
  if fid is not null then return fid; end if;

  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Yo') into my_name from public.profiles p where p.id = auth.uid();
  insert into public.families (name, created_by, is_personal) values ('Mi agenda', auth.uid(), true)
  on conflict do nothing
  returning id into fid;
  if fid is null then
    select f.id into fid from public.families f where f.created_by = auth.uid() and f.is_personal;
    return fid;
  end if;
  insert into public.family_members (family_id, user_id, name, kind, color, role)
  values (fid, auth.uid(), left(coalesce(my_name, 'Yo'), 40), 'adulto', 'violeta', 'admin');
  return fid;
end;
$$;

-- El espacio personal no acepta invitaciones.
create or replace function public.family_by_code(p_code text)
returns table (id uuid, name text, open_members jsonb)
language sql stable security definer set search_path = '' as $$
  select f.id, f.name,
    coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'kind', m.kind) order by m.name)
              from public.family_members m
              where m.family_id = f.id and m.user_id is null and m.kind in ('adulto', 'adulto_mayor', 'nino')), '[]'::jsonb)
  from public.families f
  where auth.uid() is not null and f.invite_code = upper(trim(p_code)) and not f.is_personal;
$$;

create or replace function public.join_family(p_code text, p_member_id uuid default null, p_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
  claimed int;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select f.id into fid from public.families f where f.invite_code = upper(trim(p_code)) and not f.is_personal;
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

-- No se pueden agregar perfiles al espacio personal.
drop policy if exists "agregar perfil sin cuenta" on public.family_members;
create policy "agregar perfil sin cuenta" on public.family_members for insert to authenticated
  with check (public.is_family_member(family_id) and user_id is null and role = 'miembro'
              and not exists (select 1 from public.families f where f.id = family_id and f.is_personal));

grant execute on function public.ensure_personal_space() to authenticated;
