/* Rota do Dia — Faturamento: modo offline
   Troque a VERSAO sempre que publicar uma mudança grande. */
const VERSAO="rota-do-dia-v8";
const ARQUIVOS=["./","./index.html","./manifest.webmanifest","./app-icon.png"];
const LIBS=[
  "https://api.mapbox.com/mapbox-gl-js/v3.30.0/mapbox-gl.css",
  "https://api.mapbox.com/mapbox-gl-js/v3.30.0/mapbox-gl.js"
];

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSAO);
    await Promise.all([
      ...ARQUIVOS.map(u=>c.add(u).catch(()=>{})),
      ...LIBS.map(u=>fetch(u,{mode:"no-cors"}).then(r=>c.put(u,r)).catch(()=>{}))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==VERSAO)await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);

  // Arquivos do próprio app: tenta a internet primeiro (pega atualizações),
  // e usa a cópia guardada quando estiver sem sinal.
  if(url.origin===self.location.origin){
    e.respondWith((async()=>{
      const c=await caches.open(VERSAO);
      try{
        const r=await fetch(req);
        if(r&&r.ok)c.put(req.mode==="navigate"?"./index.html":req,r.clone());
        return r;
      }catch(err){
        return (await c.match(req,{ignoreSearch:true}))
          ||(req.mode==="navigate"?await c.match("./index.html"):null)
          ||Response.error();
      }
    })());
    return;
  }

  // Biblioteca do Mapbox: usa a cópia guardada.
  if(LIBS.includes(req.url)){
    e.respondWith(caches.match(req.url).then(r=>r||fetch(req)));
  }
});
