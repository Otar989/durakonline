/* eslint-disable */
const VERSION = 'v3';
const STATIC_CACHE = 'durak-static-'+VERSION;
const RUNTIME_CACHE = 'durak-runtime-'+VERSION;
const AUDIO_CACHE = 'durak-audio-'+VERSION;
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/table-texture.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg'
];
// аудио заполняем лениво
const AUDIO_PREFIX = '/sounds/';

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=> !k.endsWith(VERSION)).map(k=> caches.delete(k)));
    await clients.claim();
  })());
});

function isNavigate(request){
  return request.mode==='navigate' || (request.headers.get('accept')||'').includes('text/html');
}

self.addEventListener('fetch', event=>{
  const { request } = event;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  // Network-first for API
  if(url.pathname.startsWith('/api/')){
    event.respondWith((async()=>{
      try { return await fetch(request); } catch { return new Response(JSON.stringify({ ok:false, offline:true }), { status:503, headers:{'content-type':'application/json'} }); }
    })());
    return;
  }
  // Audio: cache-first
  if(url.pathname.startsWith(AUDIO_PREFIX)){
    event.respondWith((async()=>{
      const cache = await caches.open(AUDIO_CACHE);
      const hit = await cache.match(request);
      if(hit) return hit;
      try { const res = await fetch(request); if(res.ok) cache.put(request, res.clone()); return res; } catch { return hit || Response.error(); }
    })());
    return;
  }
  // Static known assets: cache-first
  if(STATIC_ASSETS.includes(url.pathname)){
    event.respondWith((async()=>{
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(request);
      if(hit) return hit;
      try { const res = await fetch(request); if(res.ok) cache.put(request, res.clone()); return res; } catch { return hit || Response.error(); }
    })());
    return;
  }
  // Navigation: offline fallback
  if(isNavigate(request)){
    event.respondWith((async()=>{
      try {
        const res = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        if(res.ok) cache.put(request, res.clone());
        return res;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('/offline.html')) || new Response('<h1>Offline</h1>', { headers:{'content-type':'text/html'} });
      }
    })());
    return;
  }
  // Other GET: stale-while-revalidate (runtime cache)
  event.respondWith((async()=>{
    const cache = await caches.open(RUNTIME_CACHE);
    const hit = await cache.match(request);
    const fetchAndUpdate = fetch(request).then(res=>{ if(res.ok) cache.put(request, res.clone()); return res; }).catch(()=> null);
    if(hit){ fetchAndUpdate; return hit; }
    const net = await fetchAndUpdate; if(net) return net; return hit || Response.error();
  })());
});
