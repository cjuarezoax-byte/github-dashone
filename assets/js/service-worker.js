// DashOne — service-worker.js (v0.4 FIX)
// Bump de caché + actualización inmediata

const CACHE_NAME = 'dashone-cache-v41';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/css/splash.css',
  './assets/css/widgets.css',
  './assets/js/app.js',
  './assets/js/splash.js',
  './assets/js/widget-weather.js',
  './assets/js/widget-weekly.js',
  './assets/img/dashone-192.png',
  './assets/img/dashone-512.png',
  './assets/img/apple-touch-icon.png',
  './favicon.svg',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
