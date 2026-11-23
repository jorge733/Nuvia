-- Uniluva · Avisos por correo cuando alguien agrega o cambia una actividad familiar
--
-- El servidor pide los destinatarios con el mismo secreto del resumen diario (CRON_SECRET),
-- así nadie puede leer los correos de su familia desde el navegador.
-- Solo se avisa de actividades visibles para la familia ("familia"), nunca de las privadas
-- ni de los bloques "ocupado", y nunca a quien hizo el cambio.

alter table public.profiles add column if not exists change_email boolean not null default true;
grant select (change_email), update (change_email) on public.profiles to authenticated;

create or replace function public.event_notify_recipients(p_secret text, p_event_id uuid, p_actor uuid)
returns table (email text, full_name text, email_token text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or length(p_secret) < 32
     or p_secret is distinct from (select c.value from private.config c where c.key = 'cron_secret') then
    raise exception 'No autorizado';
  end if;

  return query
  select u.email::text, p.full_name, p.email_token
  from public.events e
  join public.families f on f.id = e.family_id and not f.is_personal
  join public.family_members fm on fm.family_id = e.family_id and fm.user_id is not null
  join auth.users u on u.id = fm.user_id
  join public.profiles p on p.id = u.id and p.change_email
  where e.id = p_event_id
    and e.visibility = 'familia'
    and fm.user_id is distinct from p_actor
    -- Quien hizo el cambio debe ser de la familia.
    and exists (select 1 from public.family_members a where a.family_id = e.family_id and a.user_id = p_actor)
    and u.email is not null and u.email_confirmed_at is not null;
end;
$$;

-- Dejar de recibir estos avisos con un clic desde el correo.
create or replace function public.unsubscribe_changes(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  update public.profiles set change_email = false where email_token = p_token;
  return found;
end;
$$;

revoke execute on function public.event_notify_recipients(text, uuid, uuid) from public;
revoke execute on function public.unsubscribe_changes(text) from public;
grant execute on function public.event_notify_recipients(text, uuid, uuid) to anon, authenticated;
grant execute on function public.unsubscribe_changes(text) to anon, authenticated;
