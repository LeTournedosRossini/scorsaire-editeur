// Service worker of the installed Scorsaire EDITOR. The page is about 20 MB: it is kept whole in the cache and served from it (a fast start, and offline), never fetched again
// at every launch. A new version is downloaded in the BACKGROUND and WAITS: the page offers it to the person ("update"), who decides when, so an open score is never replaced
// under their hands. Only this folder's own files are handled: the SoundFont and everything else cross-origin goes straight to the network (the editor keeps its own cache for them).
// CACHE_VERSION is written by tools/build.js (a hash of the page): a different page is a different version.
const CACHE_VERSION = '0ba26987bf';
const PREFIX = 'scorsaire-editeur-';
const PRECACHE_URLS = ['./index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

// `cache: 'reload'`: straight from the server, never from the browser's own HTTP cache (a new worker must never keep an old page)
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PREFIX + CACHE_VERSION).then((cache) => Promise.all(PRECACHE_URLS.map(async (u) => {
    const response = await fetch(new Request(u, { cache: 'reload' }));
    if (!response.ok) throw new Error(`${u}: ${response.status}`);
    await cache.put(u, response);
  }))));
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== PREFIX + CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // the page (the folder's address, or index.html, whatever the query): the one cached copy, the network only when it is missing
  const key = url.pathname.endsWith('/') ? new URL('index.html', url) : request;
  event.respondWith(caches.match(key, { ignoreSearch: true, cacheName: PREFIX + CACHE_VERSION }).then((hit) => hit ?? fetch(request)));
});
