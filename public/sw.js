const CACHE="crypto-radar-v44";
const APP_SHELL=["/","/index.html","/manifest.webmanifest","/offline.html","/icon-192.png","/icon-512.png","/icon-maskable-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);

  // v41: API responses are always network-only. Never serve stale market/account/history failures from Cache Storage.
  if(url.origin===self.location.origin && url.pathname.startsWith("/api/")){
    event.respondWith(fetch(req));
    return;
  }

  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(cache=>cache.put("/index.html",copy)).catch(()=>{});
        return res;
      }).catch(async()=>{
        return (await caches.match("/index.html")) || (await caches.match("/offline.html"));
      })
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(req).then(cached=>{
        const network=fetch(req).then(res=>{
          if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{})}
          return res
        }).catch(()=>cached);
        return cached||network
      })
    )
  }
});


self.addEventListener("push",event=>{
  let data={};try{data=event.data?event.data.json():{}}catch{data={body:event.data?event.data.text():""}}
  const title=data.title||"Crypto Radar";
  const options={
    body:data.body||"Ai o actualizare nouă.",
    icon:"/icon-192.png",
    badge:"/icon-192.png",
    tag:data.tag||"crypto-radar-alert",
    renotify:!!data.renotify,
    data:{url:data.url||"/?panel=alerts"}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification?.data?.url||"/?panel=alerts";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if("focus" in c){c.navigate(url).catch(()=>{});return c.focus()}}
    return clients.openWindow?clients.openWindow(url):null
  }));
});
