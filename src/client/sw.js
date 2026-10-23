const CACHE='kadetten-offline-build';
const API_ORIGIN='';
const BASE=new URL(self.registration.scope);
const NS=encodeURIComponent(BASE.pathname);
const SHELL_CACHE=CACHE+'-'+NS;
const ARTICLE_CACHE='kadetten-articles-v2-'+NS;
const SHELL=['./','platform-config.js','platform.js','data/venues.js','data/squad.js','data/otmar-fallback.js','data/otmar-history.js','data/fcsg-fallback.js','data/fallback.js','data/club.js','js/logic.js','enhancements.js','js/core.js','js/views-news.js','js/views-season.js','js/views-week.js','js/views-match.js','js/views-player.js','js/views-club.js','js/clubs.js','js/push-settings.js','js/fcsg-live.js','js/fcsg-match.js','js/fcsg-history.js','js/view-state.js','js/match-header.js','js/router.js','js/data-sync.js','js/live.js','js/club-design.js','js/main.js','style.css','enhancements.css','fcsg-match.css','v1-theme.css','club.css','club-design.css','pwa.js','manifest.webmanifest','assets/anton.woff2','assets/bbc-arena-hall.webp','assets/fcsg-stadium.webp','assets/otmar-kreuzbleiche.webp'].map(p=>new URL(p,BASE).href);
const DATA=new URL('/api/data',API_ORIGIN||BASE.origin).href;
const DATA_URLS=['/api/data','/api/fcsg/data','/api/otmar/data'].map(path=>new URL(path,API_ORIGIN||BASE.origin).href);
const IMAGE_HOSTS=new Set(['kadettensh.ch','www.kadettensh.ch','storage.aico.swiss','data.otmar.ch','otmar.ch','www.otmar.ch','www.fcsg.ch']);
const fallback=`<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meine Vereine · Offline</title><body style="background:#101310;color:#f5f5ef;font:18px/1.6 system-ui;padding:24px"><h1>Meine Vereine</h1><p>Noch keine Offline-Kopie gespeichert. Öffne die App einmal mit Internetverbindung.</p><button onclick="location.reload()">Erneut versuchen</button></body></html>`;
async function validResponse(response,type){if(!response.ok||response.redirected)return false;const mime=response.headers.get('Content-Type')||'';if(type==='navigation')return mime.includes('text/html')&&(await response.clone().text()).includes('<main id="app"');if(type==='data'||type==='fcsg-data'){if(!mime.includes('json'))return false;try{const d=await response.clone().json();return Array.isArray(d.games)&&Array.isArray(d.stories)&&(type==='fcsg-data'?d.club==='fcsg'&&Array.isArray(d.players)&&Array.isArray(d.table)&&d.table.length===12:Array.isArray(d.tables?.QHL))}catch{return false}}return !mime.includes('text/html')}
function cachedData(response){const headers=new Headers(response.headers);headers.set('X-Kadetten-Offline','1');return new Response(response.body,{status:200,headers})}
async function readData(request){const cache=await caches.open(SHELL_CACHE),url=new URL(request.url),key=url.origin+url.pathname;try{const response=await fetch(request);if(await validResponse(response,url.pathname==='/api/fcsg/data'?'fcsg-data':'data')){await cache.put(key,response.clone());return response}if(response.status>=500){const saved=await cache.match(key);if(saved)return cachedData(saved)}return response}catch{const saved=await cache.match(key);return saved?cachedData(saved):new Response('',{status:503})}}
async function readArticle(request){
 const cache=await caches.open(ARTICLE_CACHE),url=new URL(request.url),version=url.searchParams.get('v'),saved=await cache.match(request);
 if(version&&saved)return saved;
 try{
  const response=await fetch(request);
  if(response.ok){const data=await response.clone().json();if(typeof data.html==='string'&&String(data.id)===url.pathname.split('/').at(-1)&&(!version||data.version===version)){await cache.put(request,response.clone());const keys=await cache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-100)))await cache.delete(old);}}
  if(response.status>=500&&saved)return cachedData(saved);
  return response;
 }catch{return saved?cachedData(saved):new Response('',{status:503})}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL_CACHE);try{await Promise.all(SHELL.map(async(path,i)=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!await validResponse(r,i===0?'navigation':'asset'))throw Error('Invalid app shell');await cache.put(path,r)}));await self.skipWaiting()}catch(error){await caches.delete(SHELL_CACHE);throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL_CACHE);for(const key of await caches.keys())if(key.startsWith('kadetten-offline-')&&key.endsWith('-'+NS)&&key!==SHELL_CACHE){const old=await caches.open(key);for(const url of DATA_URLS)if(!await cache.match(url)){const data=await old.match(url);if(data)await cache.put(url,data)}await caches.delete(key)}await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='GET_APP_VERSION'){event.source?.postMessage({type:'APP_VERSION',version:CACHE});return;}if(event.data?.type!=='SAVE_OFFLINE')return;event.waitUntil((async()=>{const cache=await caches.open(SHELL_CACHE);await Promise.all(DATA_URLS.map(async url=>{if(!await cache.match(url))await readData(new Request(url,{credentials:API_ORIGIN?'omit':'same-origin',cache:'no-cache'}));}));})().catch(()=>{}))});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 // Nested preview owns its own shell; never answer it with the parent app's cached index.
 if(url.origin===BASE.origin&&url.pathname.startsWith(new URL('v2/',BASE).pathname))return;
 const apiOrigin=API_ORIGIN||BASE.origin;
 if(url.origin===apiOrigin&&DATA_URLS.includes(url.origin+url.pathname)){event.respondWith(readData(req));return}
 if(url.origin===apiOrigin&&/^\/api\/(?:fcsg\/|otmar\/)?articles\//.test(url.pathname)){event.respondWith(readArticle(req));return}
 // Live/access/history responses always go to the network, never to a data cache.
 if(url.origin===apiOrigin&&url.pathname.startsWith('/api/'))return;
 if(url.origin!==BASE.origin){if(req.destination==='image'&&IMAGE_HOSTS.has(url.hostname))event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE),saved=await cache.match(req);if(saved)return saved;try{const r=await fetch(req);if(r.ok||r.type==='opaque'){await cache.put(req,r.clone());const keys=(await cache.keys()).filter(k=>new URL(k.url).origin!==BASE.origin);for(const old of keys.slice(0,Math.max(0,keys.length-80)))await cache.delete(old)}return r}catch{return new Response('',{status:503})}})());return}
 if(!url.pathname.startsWith(BASE.pathname))return;
 const navigation=req.mode==='navigate',asset=SHELL.includes(url.href)||url.pathname.startsWith(new URL('assets/',BASE).pathname);if(!navigation&&!asset)return;
 const key=navigation?SHELL[0]:req;
 event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE),saved=await cache.match(key);if(saved)return saved;try{const r=await fetch(req);if(await validResponse(r,navigation?'navigation':'asset'))await cache.put(key,r.clone());return r}catch{return navigation?new Response(fallback,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response('',{status:503})}})());
});

// Only the separately installed V2 PWA handles match push messages.
self.addEventListener('push',event=>{
 if(!BASE.pathname.endsWith('/v2/'))return;
 event.waitUntil((async()=>{
  let data;try{data=event.data?.json()}catch{}
  let target;try{target=new URL(data?.url);if(target.origin!==BASE.origin||target.pathname!==BASE.pathname)target=null}catch{}
  await self.registration.showNotification(typeof data?.title==='string'?data.title.slice(0,100):'Meine Vereine · V2',{body:typeof data?.body==='string'?data.body.slice(0,300):'Ein neuer Spielhinweis ist verfügbar.',icon:new URL('assets/apple-touch-icon.png',BASE).href,badge:new URL('assets/logo.png',BASE).href,tag:typeof data?.tag==='string'?data.tag.slice(0,120):'v2-match',data:{url:target?.href||BASE.href}});
 })());
});
self.addEventListener('notificationclick',event=>{
 if(!BASE.pathname.endsWith('/v2/'))return;
 event.notification.close();event.waitUntil((async()=>{
  let target;try{target=new URL(event.notification.data?.url);if(target.origin!==BASE.origin||target.pathname!==BASE.pathname)target=BASE}catch{target=BASE}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(c=>new URL(c.url).pathname===BASE.pathname);
  if(client){await client.navigate(target.href);await client.focus()}else await self.clients.openWindow(target.href);
 })());
});
