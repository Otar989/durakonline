/* eslint-disable */
self.addEventListener('install', _e=>{ self.skipWaiting(); });
self.addEventListener('activate', _e=>{ clients.claim(); });

const CACHE = 'durak-static-v2';
const STATIC_ASSETS = [ '/', '/manifest.json' ];
const OFFLINE_FALLBACK = '/';

self.addEventListener('fetch', event=>{
  const { request } = event;
  if(request.method !== 'GET') return;
  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    if(STATIC_ASSETS.includes(new URL(request.url).pathname)){
      const cached = await cache.match(request);
      if(cached) return cached;
    }
    try {
      const network = await fetch(request);
      // Stale-while-revalidate for text resources
      if(network.status===200 && network.headers.get('content-type')?.includes('text')){
        cache.put(request, network.clone());
      }
      return network;
    } catch {
      const fallback = await cache.match(request) || await cache.match(OFFLINE_FALLBACK);
      return fallback || Response.error();
    }
  })());
});
