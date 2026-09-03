# Uniluva

Página de unión, luz y valor, con ideas para aprender y compartir, una pausa de un minuto y una lista personal de pendientes. Dirección principal: https://www.uniluva.com/.

## Desarrollo

Requiere Node.js. Ejecuta `npm run dev` y abre http://127.0.0.1:4187.

## Preparar la publicación

Ejecuta `npm run build`. La página y sus recursos públicos se generan en `dist/`. Firebase Hosting está configurado para publicar únicamente esa carpeta. El repositorio no incluye un flujo automático de despliegue.

La vinculación de unluva.com y sus registros DNS se gestiona en el proveedor de alojamiento. Subir cambios al repositorio no cambia por sí mismo el sitio publicado.

Los pendientes y la preferencia de texto grande se guardan solo en el navegador. Las fotos y las tipografías necesitan conexión a Internet. La página no requiere cuentas ni utiliza funciones de red social.

## Música y recomendaciones

La portada incluye accesos de búsqueda en Spotify y YouTube y una selección por ánimo e intención. Sin IA, el texto libre no se transmite ni se utiliza.

El servidor api/recommend.js conecta directamente con Google Gemini mediante generateContent. Configurar GEMINI_API_KEY como variable secreta de Production en Vercel y volver a desplegar. No se requiere AI Gateway. GEMINI_MODEL permite cambiar el modelo; por defecto gemini-2.5-flash. UNILUVA_AI_ENABLED=false desactiva temporalmente la IA; sin esa variable, la clave permite activarla. Nunca se expone la clave al navegador.

GET /api/recommend indica disponibilidad y proveedor. La respuesta se valida contra el catálogo. Errores, bloqueos y respuestas incompletas usan la selección local claramente identificada sin IA. La aplicación no guarda ni registra el texto libre. Google procesa el texto bajo los términos del plan de Gemini utilizado.

El límite de seis consultas por minuto es por instancia. Para tráfico elevado, configurar un límite global en Vercel Firewall y revisar las cuotas de Google.
