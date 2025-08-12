// service-worker.js — offline caching for ASTM D2488 RU/EN generator
const CACHE_NAME = 'astm-d2488-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  // External CDNs used by the app (precache for offline)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Network-first for HTML/navigation; cache-first for others
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./index.html');
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
  } else {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200 && (req.method === 'GET')) {
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })());
  }
});
