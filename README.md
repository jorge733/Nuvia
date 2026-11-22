# Uniluva

Plataforma para edificios, condominios, pasajes y vecindarios. En un solo lugar:

- **Gastos comunes**: cuánto debe cada unidad, vencimiento, liquidación en PDF, informar pago con comprobante y confirmación de la directiva.
- **Reuniones**: próxima asamblea, tabla, confirmación de asistencia, archivo `.ics` para el calendario y actas.
- **Documentos**: reglamento, actas, presupuestos, contratos y seguros.
- **Reclamos y sugerencias**: con estado visible (recibido → en revisión → resuelto), conversación y apoyos.
- **Contacto con la administración**: mensajes privados.
- **Chats**: enlaces al grupo de WhatsApp de la comunidad y al de ventas, visibles solo para vecinos aprobados.
- **Oficios recomendados por vecinos**: gásfiter, electricista, cerrajero… recomendados por vecinos verificados de la comuna.
- **Invitación con QR**: cartel imprimible para el ascensor o el portón; cada vecino solicita su unidad y la directiva aprueba.

## Tecnología

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- [Supabase](https://supabase.com): Postgres con RLS, Auth (enlace mágico por correo) y Storage
- Despliegue en Vercel

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (región sugerida: São Paulo, `sa-east-1`).
2. En **SQL Editor**, ejecuta en orden:
   - `supabase/migrations/20261122000000_init.sql`
   - `supabase/migrations/20261122000100_storage.sql`

   O con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
3. En **Authentication → URL Configuration**:
   - *Site URL*: `https://www.uniluva.com` (o `http://localhost:3000` en desarrollo)
   - *Redirect URLs*: agrega `http://localhost:3000/auth/confirm` y `https://www.uniluva.com/auth/confirm`
4. En **Authentication → Emails**, traduce la plantilla *Magic Link* al español si quieres.
   Para producción configura un SMTP propio (Resend, Postmark, etc.): el SMTP por defecto de Supabase tiene un límite muy bajo de correos por hora.

### 2. Variables de entorno

```bash
cp .env.example .env.local
# completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Project Settings → API)
```

En Vercel, agrega las mismas variables en *Project Settings → Environment Variables*.

### 3. Ejecutar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # compilación de producción
npm run lint
```

## Estructura

```
supabase/migrations/       Esquema, RLS, funciones y bucket de archivos
src/proxy.ts               Refresca la sesión y protege rutas privadas
src/lib/                   Cliente Supabase, contexto de comunidad, formatos, archivos
src/app/
  page.tsx                 Landing
  ingresar/, auth/         Ingreso con enlace mágico
  inicio/                  Mis comunidades
  crear/, unirse/          Crear comunidad / unirse con código o QR
  perfil/
  c/[id]/                  Panel de la comunidad
    gastos/                Gastos comunes (vecino y directiva)
    reuniones/             Reuniones, asistencia, .ics y actas
    documentos/
    reclamos/              Reclamos, sugerencias y mensajes a la administración
    oficios/               Oficios recomendados por vecinos
    admin/                 Invitaciones, vecinos, unidades, datos, avisos
```

## Seguridad y privacidad

- **RLS en todas las tablas.** Un vecino solo ve datos de comunidades donde su membresía está *activa*.
- Cada vecino ve **solo los cobros de su unidad**; la directiva (administración y comité) ve todos.
- El **teléfono** de los perfiles solo lo ven el propio usuario y la directiva.
- Las consultas a la administración son siempre privadas; los reclamos pueden ser públicos o privados.
- Solo un administrador puede cambiar roles, y la comunidad siempre conserva al menos un administrador.
- Los archivos están en un bucket privado y se entregan con URLs firmadas de 10 minutos.
- Los comprobantes de pago solo los ve quien los subió y la directiva.
- Las recomendaciones de oficios requieren declarar el consentimiento del trabajador (Ley 21.719). Los comentarios solo se ven dentro de cada comunidad; hacia la comuna solo se comparten la cantidad de recomendaciones y el promedio.

Las páginas de privacidad y términos son **borradores**: deben ser revisadas por un abogado antes del lanzamiento.

## Próximos pasos sugeridos

- Recordatorios por correo (vencimiento del gasto común, reunión de mañana) con Edge Functions + `pg_cron`.
- Notificaciones cuando cambia el estado de un reclamo o cuando aprueban a un vecino.
- Subida directa de archivos a Storage desde el navegador (hoy el límite es 4 MB por el tope de Vercel).
- Carga de liquidaciones desde Excel/PDF con IA.
- Pago en línea (Khipu, Flow o Mercado Pago).
- Eliminación de cuenta desde la app.
