# Uniluva — Agenda familiar y personal

> No necesitas ser famoso para ser importante. En tu familia, todos cuentan.

Uniluva es una agenda donde cada actividad tiene **quién se encargue**, nadie carga solo con todo y el trabajo invisible se vuelve visible.

## Lo que la hace distinta

- **Responsables y relevos.** Cada actividad tiene un responsable. Si no puede, pide relevo y la familia lo ve: otro toma la posta con un clic (también se puede avisar por WhatsApp).
- **Balance del hogar.** Cuánto organiza cada integrante en la semana, cuántas cosas hizo y cuántos relevos tomó. Avisa con cariño cuando una sola persona carga con la mayoría.
- **Toda la familia, incluso sin cuenta.** Niños, abuelos y mascotas son perfiles de la agenda aunque no usen la app. Los adultos invitados pueden reclamar su perfil al unirse.
- **Mi agenda.** Cada cuenta tiene un espacio personal (creado automáticamente) y una vista que junta lo propio con lo que le toca en cada familia.
- **Personal y familiar.** Cada actividad es *Familia*, *Solo yo* o *Ocupado* (la familia ve el bloque sin detalles).
- **Hoy en familia.** La pantalla principal muestra lo de hoy, quién se encarga, lo que necesita relevo y lo que nadie ha tomado.
- **Resumen diario por correo.** Cada mañana, "Tu día en Uniluva" con lo que te toca y los relevos abiertos (Vercel Cron + Resend). Se desactiva con un clic.
- **Tu calendario de siempre.** Enlace de suscripción (ICS) para Google Calendar, Apple Calendar u Outlook, con avisos.

## Tecnología

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- Supabase: Postgres con RLS y Auth (enlace mágico por correo)
- Vercel (región São Paulo)

## Puesta en marcha

1. En Supabase → **SQL Editor**, ejecuta en orden los archivos de `supabase/migrations/`:
   `20261123000000_agenda.sql`, `20261124000000_mi_agenda.sql` y `20261125000000_resumen_diario.sql`
   (este último muestra el valor para la variable `CRON_SECRET`).
   (Si el proyecto tenía la versión anterior de comunidades, el primero la elimina.)
2. En **Authentication → URL Configuration**, agrega como Redirect URLs `https://www.uniluva.com/auth/confirm`,
   `https://*.vercel.app/auth/confirm` y `http://localhost:3000/auth/confirm`.
3. Ejecuta:

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

La URL y la clave *publishable* de Supabase vienen por defecto en `src/lib/supabase/env.ts` (son públicas por diseño);
las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` las reemplazan si existen.
`NEXT_PUBLIC_SITE_URL` define el dominio de los enlaces de invitación y de calendario.

Variables secretas en Vercel (nunca en el repositorio):

| Variable | Para qué |
|---|---|
| `RESEND_API_KEY` | Enviar correos con Resend |
| `SEND_EMAIL_HOOK_SECRET` | Verificar el Send Email Hook de Supabase (correos de ingreso) |
| `CRON_SECRET` | Autorizar el resumen diario (`/api/cron/resumen`) |

## Estructura

```
supabase/migrations/          Esquema, RLS y funciones
src/lib/time.ts               Fechas en hora de Chile y repeticiones
src/lib/agenda.ts             Carga de la agenda (repeticiones, relevos, hechos)
src/lib/family.ts             Contexto de la familia y utilidades de acciones
src/app/
  mi/                         Mi agenda: lo personal + lo que me toca en cada familia
  inicio/, crear/, unirse/    Familias: crear, invitar y unirse
  f/[id]/                     Hoy
  f/[id]/semana/              Semana (toda la familia / solo lo mío)
  f/[id]/relevos/             Relevos pendientes e historial
  f/[id]/balance/             Balance del hogar
  f/[id]/familia/             Integrantes, invitación y roles
  f/[id]/nuevo, e/[eventId]/  Agregar, ver y editar actividades
  api/calendario/[token]/     Suscripción ICS
```

## Seguridad

- RLS en todas las tablas; solo los integrantes con cuenta ven la agenda de su familia.
- Los eventos *Solo yo* no salen de la base para nadie más; los *Ocupado* se entregan enmascarados.
- Responsables y participantes deben pertenecer a la misma familia; un perfil no se puede vincular a otra cuenta salvo con el enlace de invitación.
- Siempre queda al menos un administrador; si la última cuenta sale, la familia se elimina.
- El enlace de calendario es un token secreto de 48 caracteres, renovable.

## Próximos pasos

- Recordatorios por WhatsApp para abuelos y adultos sin app.
- Plantillas de Chile: vacaciones escolares, controles del niño sano, vencimientos de carnet, licencia, permiso de circulación y revisión técnica.
- Resumen “Tu semana en familia” por correo cada domingo.
