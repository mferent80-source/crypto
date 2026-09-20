const CACHE="crypto-radar-v32";
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
