// Service Worker der Kadetten Companion App. scripts/build-app.mjs setzt Version, Hüllen-Dateien und Adresse des Datendienstes ein.
// Regeln: App-Hülle aus dem Cache; Datenstand zuerst aus dem Netz, bei Ausfall der letzte gültige Stand;
// Live- und Push-Antworten nie aus dem Cache.
const VERSION = '__VERSION__';
const SHELL = __SHELL__;
const API_ORIGIN = '__API_ORIGIN__';
const SHELL_CACHE = 'kadetten-app-shell-' + VERSION;
const DATA_CACHE = 'kadetten-app-data';
const CACHEABLE_API = /^\/api\/(data|reports\/|ehf-reports\/|head-to-head|recent-games|previews\/|programmes\/[^/]+$|articles\/)/;
const NEVER_CACHE = /^\/api\/(live|push\/|access|refresh)/;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL.map(path => new Request(path, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('kadetten-app-shell-') && key !== SHELL_CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && /json/.test(response.headers.get('content-type') || '')) await cache.put(request, response.clone());
    else if (response.status >= 500) { const saved = await cache.match(request); if (saved) return saved; }
    return response;
  } catch {
    const saved = await cache.match(request);
    return saved || new Response(JSON.stringify({ok: false, error: 'offline'}), {status: 503, headers: {'Content-Type': 'application/json'}});
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const apiRequest = url.pathname.startsWith('/api/') && (url.origin === self.location.origin || url.origin === API_ORIGIN);
  if (apiRequest) {
    if (NEVER_CACHE.test(url.pathname)) return;
    if (CACHEABLE_API.test(url.pathname)) event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); } catch { return (await caches.match(new URL('index.html', scope).href)) || new Response('Offline', {status: 503}); }
    })());
    return;
  }
  event.respondWith((async () => (await caches.match(request, {ignoreSearch: true})) || fetch(request))());
});
