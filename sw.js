// Retira la caché de la antigua red social sin mantener notificaciones.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('uniluva-'))await caches.delete(key)}await self.clients.claim()})()));
