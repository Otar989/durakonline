/* eslint-disable */
self.addEventListener('install', _e=>{ self.skipWaiting(); });
self.addEventListener('activate', _e=>{ clients.claim(); });

const CACHE = 'durak-static-v1';
const _ASSETS = [ '/', '/manifest.json' ];

self.addEventListener('fetch', event=>{
  const { request } = event;
  if(request.method !== 'GET') return;
  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if(cached) return cached;
    try {
      const res = await fetch(request);
      if(res.status===200 && res.headers.get('content-type')?.includes('text') ){ cache.put(request, res.clone()); }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
