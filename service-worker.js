// DashOne — service-worker.js (v0.3)
const CACHE_NAME = 'dashone-cache-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/css/splash.css',
  './assets/js/app.js',
  './assets/js/splash.js',
  './assets/img/dashone-192.png',
  './assets/img/dashone-512.png',
  './assets/img/apple-touch-icon.png',
  './favicon.svg',
  './manifest.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))));
  self.clients.claim();
});
