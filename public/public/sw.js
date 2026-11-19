/* Mise en cache de l'interface; les courses et le multijoueur restent en ligne. */
const CACHE='apex-run-app-shell-3.1.0';
const ASSETS=['/','/index.html','/offline.html','/manifest.webmanifest','/pwa.js','/game.js','/world.js','/track-data.js','/style.css','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('apex-run-app-shell-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname==='/health'||url.pathname==='/ws')return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request);
      if(response.ok&&(ASSETS.includes(url.pathname)||url.pathname==='/')){
        const cache=await caches.open(CACHE);
        cache.put(event.request,response.clone()).catch(()=>{});
      }
      return response;
    }catch(error){
      const cache=await caches.open(CACHE);
      if(event.request.mode==='navigate')return (await cache.match('/offline.html'));
      return (await cache.match(event.request))||(await cache.match(url.pathname))||Response.error();
    }
  })());
});
