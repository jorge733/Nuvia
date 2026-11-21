-- Reportes de aportes y eliminación de cuenta.

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  reason      text not null check (char_length(reason) between 3 and 500),
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.reports enable row level security;

-- Cualquiera con cuenta puede reportar; solo ve sus propios reportes.
-- La moderación se hace desde el panel de Supabase (rol de servicio).
create policy "reports_insert" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "reports_select_own" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

-- Elimina la cuenta del usuario actual y, en cascada, su perfil, aportes,
-- comentarios, reacciones, membresías y avisos. Los archivos se borran desde la app.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

grant select, insert on public.reports to authenticated;
