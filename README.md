# Uniluva

Página de unión, luz y valor, con ideas para aprender y compartir, una pausa de un minuto y una lista personal de pendientes. Dirección principal: https://www.uniluva.com/.

## Desarrollo

Requiere Node.js. Ejecuta `npm run dev` y abre http://127.0.0.1:4187.

## Preparar la publicación

Ejecuta `npm run build`. La página y sus recursos públicos se generan en `dist/`. Firebase Hosting está configurado para publicar únicamente esa carpeta. El repositorio no incluye un flujo automático de despliegue.

La vinculación de unluva.com y sus registros DNS se gestiona en el proveedor de alojamiento. Subir cambios al repositorio no cambia por sí mismo el sitio publicado.

Los pendientes y la preferencia de texto grande se guardan solo en el navegador. Las fotos y las tipografías necesitan conexión a Internet. La página no requiere cuentas ni utiliza funciones de red social.

## Música y recomendaciones

La portada incluye accesos de búsqueda en Spotify y YouTube, selección de ánimo e intención y una selección musical local. El texto libre no se usa ni transmite mientras la IA esté desactivada.

`api/recommend.js` usa Vercel AI Gateway desde el servidor. Para activar: completar la habilitación de AI Gateway en Vercel, configurar `UNILUVA_AI_ENABLED=true` en Production y volver a desplegar. Se usa `AI_GATEWAY_API_KEY` o la identidad `VERCEL_OIDC_TOKEN` del proyecto; nunca se expone una credencial al navegador. Sin habilitación, GET devuelve available=false. La IA está limitada al catálogo y devuelve una explicación según el texto libre; ante errores la interfaz indica que muestra una selección sin IA.

El límite de seis consultas por minuto es por instancia; para tráfico elevado configurar también un límite global en Vercel Firewall y un presupuesto del servicio. No se registran textos en el código de la aplicación. Vercel y el proveedor procesan el texto cuando el visitante solicita una sugerencia con IA.
