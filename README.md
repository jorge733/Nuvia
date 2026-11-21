# Uniluva

**Conecta. Descubre. Aporta.** Una red social donde el valor de tus aportes importa más que tu popularidad.

- Sin contadores públicos de likes ni de seguidores.
- Reacciones cualitativas (💡 Aprendí algo · 🤝 Me ayudó · ✨ Me inspiró) que **solo ve el autor**.
- Feed **"Más útiles"**: ordena por reacciones ponderadas y conversación, con prioridad a lo reciente.
- **Reputación por comunidad**: se gana ayudando, no acumulando seguidores.
- No puedes reaccionar a tus propios aportes.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- [Supabase](https://supabase.com): Auth (correo y Google), Postgres con Row Level Security y Storage

## Estructura

```
src/
  app/                 Rutas (inicio, /c comunidades, /p aportes, /u perfiles, /notificaciones, /ajustes, legales)
  app/actions.ts       Server actions (auth, aportes, reacciones, comentarios, comunidades, perfil, cuenta)
  components/          UI reutilizable
  lib/supabase/        Clientes de Supabase (server + middleware)
  lib/data.ts          Consultas compartidas
supabase/migrations/   Esquema SQL, RLS, triggers y funciones
```

## Puesta en marcha

1. **Crea un proyecto en Supabase** (región sugerida: São Paulo, `sa-east-1`).
2. **Aplica el esquema.** En el panel: *SQL Editor* → pega y ejecuta, en orden, los archivos de `supabase/migrations/`.
   Con la CLI: `npx supabase link --project-ref <ref>` y luego `npx supabase db push`.
3. **Configura Auth** (*Authentication → URL Configuration*):
   - *Site URL*: `https://www.uniluva.com` (o `http://localhost:3000` en desarrollo)
   - *Redirect URLs*: `http://localhost:3000/auth/callback`, `https://www.uniluva.com/auth/callback` y la de previsualización de Vercel.
   - Opcional: activa *Google* en *Authentication → Providers*.
4. **Variables de entorno**: `cp .env.example .env.local` y completa los valores de *Project Settings → API*.
5. **Corre la app**:
   ```bash
   npm install
   npm run dev
   ```

## Despliegue en Vercel

Importa el repo en Vercel (framework: Next.js) y agrega las mismas variables de entorno. Las URLs antiguas
(`/terminos.html`, `/privacidad.html`, `/normas.html`) redirigen a las nuevas.

## Moderación

Los reportes quedan en la tabla `reports`. Revísalos desde *Table Editor* en Supabase y elimina el aporte si corresponde.

## Próximos pasos sugeridos

- Notificaciones push (Web Push desde una Edge Function al insertar en `notifications`).
- Puntaje de calidad con IA (Gemini o Claude) desde una Edge Function, sumado al orden del feed.
- Búsqueda de texto completo (`tsvector` en `posts`).
- Bloquear usuarios y moderadores por comunidad.
- Preguntas con "respuesta más útil" marcada por el autor.
