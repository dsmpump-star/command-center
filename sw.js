// Command Center — minimal service worker
// Caches only the static app shell, as a fallback for offline use.
// Live data always comes fresh from each app's Google Sheet (network),
// and the shell itself is NETWORK-FIRST so new deployments always show
// immediately — cache is only used if the network request fails.
const CACHE_NAME = 'command-center-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/apple-touch-icon-180.png',
  './icons/apple-touch-icon-152.png',
  './icons/apple-touch-icon-120.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never touch calls to Google Apps Script — always go live for real data.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return;
  }
  // App shell: network-first, falling back to cache only if offline.
  // This guarantees a fresh deploy is always what the user sees.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
