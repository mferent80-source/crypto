const CACHE="crypto-radar-v85-4";
const APP_SHELL=["/","/index.html","/app.css","/app.js","/research-worker.js","/engine-contract.json","/manifest.webmanifest","/offline.html","/icon-192.png","/icon-512.png","/icon-maskable-512.png","/lib/grid-calcul.js","/lib/grid-proba.js","/lib/grid-jurnal.js","/lib/grid-umpleri.js","/lib/grid-clasament.js","/lib/grid-laborator.js","/lib/tablou-extra.js","/lib/jurnal-trade.js","/lib/semnale-bot.js","/lib/contrafactual.js","/lib/obiceiuri.js","/lib/tablou-bot.js","/lib/directie.js","/lib/alerte.js","/lib/scenariu.js","/lib/sfaturi.js","/lib/t212.js","/lib/actiuni-semnale.js","/lib/t212-ecran.js"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    const results=await Promise.allSettled(APP_SHELL.map(async url=>{const r=await fetch(url,{cache:"reload"});if(!r.ok)throw Error(`${url} ${r.status}`);await cache.put(url,r)}));
    const ok=results.filter(x=>x.status==="fulfilled").length;if(!ok)throw Error("PWA shell cache unavailable");return results
  }));
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

  // v74.6: codul (app.js, lib/*, app.css, worker-ul, contractul) e network-first,
  // ca index.html. Cache-first servea JS VECHI sub HTML NOU (badge nou, reparatii
  // lipsa) pana la a doua reincarcare. Cache-ul ramane doar rezerva fara retea.
  if(url.origin===self.location.origin&&(url.pathname.startsWith("/lib/")||/\.(js|css|json)$/.test(url.pathname))){
    event.respondWith(
      fetch(req).then(res=>{
        if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{})}
        return res
      }).catch(async()=>(await caches.match(req))||Response.error())
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
