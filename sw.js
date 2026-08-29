self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const notificationData=event.notification.data||{};
  const targetPath=notificationData.url
    || notificationData.link
    || notificationData.FCM_MSG?.fcmOptions?.link
    || notificationData.FCM_MSG?.data?.url
    || "/";
  const target=new URL(targetPath,self.location.origin).href;
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
      const existing=list.find(client=>client.url.startsWith(self.location.origin));
      if(existing){
        existing.navigate(target);
        return existing.focus();
      }
      return clients.openWindow(target);
    })
  );
});

importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCeKgsIeYLulHGMhf82EWzA3KBPznX7bSU",
  authDomain: "nuvia-b09c6.firebaseapp.com",
  projectId: "nuvia-b09c6",
  storageBucket: "nuvia-b09c6.firebasestorage.app",
  messagingSenderId: "147115063936",
  appId: "1:147115063936:web:d8501e839eecad07cf8465"
});

const messaging=firebase.messaging();
const CACHE_NAME = "uniluva-v24-3";
const OFFLINE_URL = "/index.html";

const CORE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg"
];

const FIREBASE_HOSTS = [
  "googleapis.com",
  "firebaseio.com",
  "firebaseapp.com",
  "gstatic.com"
];

function isFirebaseRequest(url) {
  return FIREBASE_HOSTS.some(
    host =>
      url.hostname === host ||
      url.hostname.endsWith("." + host)
  );
}

messaging.onBackgroundMessage(payload=>{
  // Los mensajes con `notification` los muestra automáticamente FCM.
  // Para mensajes solo con datos, construimos el aviso aquí.
  if(payload.notification)return;
  const data=payload.data||{};
  self.registration.showNotification(data.title||"Uniluva",{
    body:data.body||"Tienes una nueva notificación.",
    icon:"/icon-192.svg",
    badge:"/icon-192.svg",
    tag:data.tag||"uniluva-notification",
    data:{url:data.url||data.link||"/"}
  });
});

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith("uniluva-") &&
                key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      ),

      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isFirebaseRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then(cache =>
              cache.put(OFFLINE_URL, copy)
            )
            .catch(() => {});

          return response;
        })
        .catch(() =>
          caches.match(OFFLINE_URL)
        )
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type !== "opaque"
          ) {
            const copy = response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache =>
                cache.put(request, copy)
              )
              .catch(() => {});
          }

          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
