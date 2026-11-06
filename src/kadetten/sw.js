// Service Worker der Kadetten Companion App. scripts/build-app.mjs setzt Version, Hüllen-Dateien und Adresse des Datendienstes ein.
// Regeln: App-Hülle aus dem Cache; Datenstand zuerst aus dem Netz, bei Ausfall der letzte gültige Stand;
// Live- und Push-Antworten nie aus dem Cache.
const VERSION = '__VERSION__';
const SHELL = __SHELL__;
const API_ORIGIN = '__API_ORIGIN__';
const SCOPE = new URL(self.registration.scope);
// Alle Caches tragen den Pfad der App, damit sie die Caches von V1 «Matchday» auf derselben Domain nie berühren.
const NS = encodeURIComponent(SCOPE.pathname);
const SHELL_CACHE = 'kadetten-app-shell-' + NS + '-' + VERSION;
const DATA_CACHE = 'kadetten-app-data-' + NS;
// Caches der bisherigen V2 am selben Ort (kadetten-offline-<Version>-<Pfad>, kadetten-articles-v2-<Pfad>).
const OLD_V2 = key => (key.startsWith('kadetten-offline-') || key.startsWith('kadetten-articles-v2-')) && key.endsWith('-' + NS);
const CACHEABLE_API = /^\/api\/(data|reports\/|ehf-reports\/|head-to-head|recent-games|previews\/|programmes\/[^/]+$|articles\/)/;
const NEVER_CACHE = /^\/api\/(live|push\/|access|refresh)/;

// Matchday zeigt einen verfügbaren Hüllenwechsel in den Einstellungen an.
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_APP_VERSION') event.source?.postMessage({type: 'APP_VERSION', version: VERSION});
});

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL.map(path => new Request(path, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if ((key.startsWith('kadetten-app-shell-' + NS + '-') && key !== SHELL_CACHE) || OLD_V2(key)) await caches.delete(key);
    }
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
  event.respondWith((async () => {
    const saved = await caches.match(request, {ignoreSearch: true});
    if (saved) return saved;
    const response = await fetch(request);
    // Bilder (Spielerfotos, Wappen) beim ersten Ansehen für offline zwischenspeichern.
    if (response.ok && request.destination === 'image') (await caches.open(SHELL_CACHE)).put(request, response.clone());
    return response;
  })());
});

// Push-Mitteilungen zu Kadetten-Spielen (server/push-subscriptions.mjs). Ziel nur innerhalb dieser App.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = null;
    try { data = event.data?.json(); } catch {}
    const scope = new URL(self.registration.scope);
    let target = null;
    try { target = new URL(data?.url); if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) target = null; } catch {}
    await self.registration.showNotification(typeof data?.title === 'string' ? data.title.slice(0, 100) : 'Kadetten', {
      body: typeof data?.body === 'string' ? data.body.slice(0, 300) : 'Ein neuer Spielhinweis ist verfügbar.',
      icon: new URL('assets/icon-192.png', scope).href, badge: new URL('assets/icon-192.png', scope).href,
      tag: typeof data?.tag === 'string' ? data.tag.slice(0, 120) : 'kadetten-match', data: {url: (target || scope).href}
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    let target = scope;
    try { const url = new URL(event.notification.data?.url); if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) target = url; } catch {}
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const open = windows.find(c => new URL(c.url).pathname.startsWith(scope.pathname));
    if (open) { await open.focus(); if ('navigate' in open) await open.navigate(target.href); return; }
    await self.clients.openWindow(target.href);
  })());
});
