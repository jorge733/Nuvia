# Uniluva

Página de unión, luz y valor, con ideas para aprender y compartir, una pausa de un minuto y una lista personal de pendientes. Dirección principal: https://unluva.com/.

## Desarrollo

Requiere Node.js. Ejecuta `npm run dev` y abre http://127.0.0.1:4187.

## Preparar la publicación

Ejecuta `npm run build`. La página y sus recursos públicos se generan en `dist/`. Firebase Hosting está configurado para publicar únicamente esa carpeta. El repositorio no incluye un flujo automático de despliegue.

La vinculación de unluva.com y sus registros DNS se gestiona en el proveedor de alojamiento. Subir cambios al repositorio no cambia por sí mismo el sitio publicado.

Los pendientes y la preferencia de texto grande se guardan solo en el navegador. Las fotos y las tipografías necesitan conexión a Internet. La página no requiere cuentas ni utiliza funciones de red social.
