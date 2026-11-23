-- Uniluva · Avisos de relevo por correo
--
-- Cuando alguien pide relevo, se avisa a la familia (usa event_notify_recipients).
-- Cuando alguien lo toma, se avisa solo a quien lo pidió: esta función entrega su correo,
-- con el mismo secreto del resumen diario (CRON_SECRET). Respeta "Avisos de cambios" en Mi perfil.

create or replace function public.member_contact(p_secret text, p_member_id uuid)
returns table (email text, full_name text, email_token text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or length(p_secret) < 32
     or p_secret is distinct from (select c.value from private.config c where c.key = 'cron_secret') then
    raise exception 'No autorizado';
  end if;

  return query
  select u.email::text, p.full_name, p.email_token
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  join public.profiles p on p.id = u.id and p.change_email
  where fm.id = p_member_id and u.email is not null and u.email_confirmed_at is not null;
end;
$$;

revoke execute on function public.member_contact(text, uuid) from public;
grant execute on function public.member_contact(text, uuid) to anon, authenticated;
