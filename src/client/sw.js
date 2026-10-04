const CACHE='kadetten-offline-build';
const API_ORIGIN='';
const BASE=new URL(self.registration.scope);
const NS=encodeURIComponent(BASE.pathname);
const SHELL_CACHE=CACHE+'-'+NS;
const ARTICLE_CACHE='kadetten-articles-v2-'+NS;
const SHELL=['./','platform-config.js','platform.js','data/venues.js','data/squad.js','data/fallback.js','data/club.js','js/logic.js','enhancements.js','js/core.js','js/views-news.js','js/views-season.js','js/views-match.js','js/views-player.js','js/views-club.js','js/clubs.js','js/router.js','js/data-sync.js','js/live.js','js/main.js','style.css','enhancements.css','club.css','pwa.js','manifest.webmanifest','assets/anton.ttf'].map(p=>new URL(p,BASE).href);
const DATA=new URL('/api/data',API_ORIGIN||BASE.origin).href;
const fallback=`<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kadetten · Offline</title><body style="background:#101310;color:#f5f5ef;font:18px/1.6 system-ui;padding:24px"><h1>Kadetten</h1><p>Noch keine Offline-Kopie gespeichert. Öffne die App einmal mit Internetverbindung.</p><button onclick="location.reload()">Erneut versuchen</button></body></html>`;
async function validResponse(response,type){if(!response.ok||response.redirected)return false;const mime=response.headers.get('Content-Type')||'';if(type==='navigation')return mime.includes('text/html')&&(await response.clone().text()).includes('<main id="app"');if(type==='data'){if(!mime.includes('json'))return false;try{const d=await response.clone().json();return Array.isArray(d.games)&&Array.isArray(d.stories)&&Array.isArray(d.tables?.QHL)}catch{return false}}return !mime.includes('text/html')}
function cachedData(response){const headers=new Headers(response.headers);headers.set('X-Kadetten-Offline','1');return new Response(response.body,{status:200,headers})}
async function readData(request){const cache=await caches.open(SHELL_CACHE);try{const response=await fetch(request);if(await validResponse(response,'data')){await cache.put(DATA,response.clone());return response}if(response.status>=500){const saved=await cache.match(DATA);if(saved)return cachedData(saved)}return response}catch{const saved=await cache.match(DATA);return saved?cachedData(saved):new Response('',{status:503})}}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL_CACHE);try{await Promise.all(SHELL.map(async(path,i)=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!await validResponse(r,i===0?'navigation':'asset'))throw Error('Invalid app shell');await cache.put(path,r)}));await self.skipWaiting()}catch(error){await caches.delete(SHELL_CACHE);throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL_CACHE);for(const key of await caches.keys())if(key.startsWith('kadetten-offline-')&&key.endsWith('-'+NS)&&key!==SHELL_CACHE){const old=await caches.open(key);if(!await cache.match(DATA)){const data=await old.match(DATA);if(data)await cache.put(DATA,data)}await caches.delete(key)}await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type!=='SAVE_OFFLINE')return;event.waitUntil(readData(new Request(DATA,{credentials:API_ORIGIN?'omit':'same-origin',cache:'no-cache'})).catch(()=>{}))});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 const apiOrigin=API_ORIGIN||BASE.origin;
 if(url.origin===apiOrigin&&url.pathname==='/api/data'){event.respondWith(readData(req));return}
 if(url.origin===apiOrigin&&url.pathname.startsWith('/api/articles/')){event.respondWith((async()=>{const cache=await caches.open(ARTICLE_CACHE),saved=await cache.match(req);if(saved)return saved;try{const r=await fetch(req);if(r.ok&&url.searchParams.has('v')){const d=await r.clone().json();if(typeof d.html==='string'&&d.version===url.searchParams.get('v')){await cache.put(req,r.clone());const keys=await cache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-100)))await cache.delete(old)}}return r}catch{return new Response('',{status:503})}})());return}
 // Live/access/history responses always go to the network, never to a data cache.
 if(url.origin===apiOrigin&&url.pathname.startsWith('/api/'))return;
 if(url.origin!==BASE.origin){if(req.destination==='image'&&['kadettensh.ch','www.kadettensh.ch'].includes(url.hostname))event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE),saved=await cache.match(req);if(saved)return saved;try{const r=await fetch(req);if(r.ok||r.type==='opaque'){await cache.put(req,r.clone());const keys=(await cache.keys()).filter(k=>new URL(k.url).origin!==BASE.origin);for(const old of keys.slice(0,Math.max(0,keys.length-80)))await cache.delete(old)}return r}catch{return new Response('',{status:503})}})());return}
 if(!url.pathname.startsWith(BASE.pathname))return;
 const navigation=req.mode==='navigate',asset=SHELL.includes(url.href)||url.pathname.startsWith(new URL('assets/',BASE).pathname);if(!navigation&&!asset)return;
 const key=navigation?SHELL[0]:req;
 event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE),saved=await cache.match(key);if(saved)return saved;try{const r=await fetch(req);if(await validResponse(r,navigation?'navigation':'asset'))await cache.put(key,r.clone());return r}catch{return navigation?new Response(fallback,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response('',{status:503})}})());
});
