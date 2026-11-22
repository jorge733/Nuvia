-- Uniluva · almacenamiento de archivos
-- Un único bucket privado. Estructura de rutas:
--   {community_id}/documentos/...    documentos de la comunidad (sube la directiva)
--   {community_id}/gastos/...        liquidaciones de gastos comunes (sube la directiva)
--   {community_id}/actas/...         actas de reuniones (sube la directiva)
--   {community_id}/comprobantes/{user_id}/...   comprobantes de pago (sube cada vecino)
-- Los archivos se entregan siempre con URLs firmadas de corta duración.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidad', 'comunidad', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create or replace function public.storage_community(path text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.storage_community(text) to authenticated;

create policy "uniluva: leer archivos" on storage.objects for select to authenticated
  using (
    bucket_id = 'comunidad' and (
      (split_part(name, '/', 2) <> 'comprobantes' and public.is_member(public.storage_community(name)))
      or (split_part(name, '/', 2) = 'comprobantes'
          and (split_part(name, '/', 3) = auth.uid()::text or public.can_manage(public.storage_community(name))))
    )
  );

create policy "uniluva: subir archivos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comunidad' and (
      (split_part(name, '/', 2) in ('documentos', 'gastos', 'actas') and public.can_manage(public.storage_community(name)))
      or (split_part(name, '/', 2) = 'comprobantes' and split_part(name, '/', 3) = auth.uid()::text
          and public.is_member(public.storage_community(name)))
    )
  );

create policy "uniluva: borrar archivos" on storage.objects for delete to authenticated
  using (bucket_id = 'comunidad' and public.can_manage(public.storage_community(name)));
