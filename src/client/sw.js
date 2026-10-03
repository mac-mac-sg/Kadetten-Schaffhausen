const CACHE='kadetten-offline-6e9010a6fe70cfda';
const ARTICLE_CACHE='kadetten-articles-v1';
const SHELL=['/','/app.js?v=6e9010a6fe70cfda','/enhancements.js?v=6e9010a6fe70cfda','/style.css?v=6e9010a6fe70cfda','/enhancements.css?v=6e9010a6fe70cfda','/pwa.js?v=6e9010a6fe70cfda','/manifest.webmanifest?v=6e9010a6fe70cfda','/assets/anton.ttf'];
const fallback=`<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kadetten · Offline</title><body style="background:#101310;color:#f5f5ef;font:18px/1.6 system-ui;padding:24px"><h1>Kadetten</h1><p>Noch keine Offline-Kopie gespeichert. Öffne die App einmal mit Internetverbindung.</p><button onclick="location.reload()">Erneut versuchen</button></body></html>`;
async function validResponse(response,path){if(!response.ok||response.redirected)return false;const type=response.headers.get('Content-Type')||'';if(path==='/')return type.includes('text/html')&&(await response.clone().text()).includes('<main id="app"');if(path==='/api/data'){if(!type.includes('json'))return false;try{const d=await response.clone().json();return Array.isArray(d.games)&&Array.isArray(d.stories)&&!!d.tables?.QHL}catch{return false}}return !type.includes('text/html')}
// Install one complete release; never combine cached HTML with another JS release.
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{await Promise.all(SHELL.map(async path=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!await validResponse(r,path.split('?')[0]))throw Error('Invalid app shell');await cache.put(path,r)}));await self.skipWaiting()}
 catch(error){await caches.delete(CACHE);throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const key of await caches.keys())if(key.startsWith('kadetten-offline-')&&key!==CACHE){const old=await caches.open(key);if(!await cache.match('/api/data')){const data=await old.match('/api/data');if(data)await cache.put('/api/data',data)}await caches.delete(key);}await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type!=='SAVE_OFFLINE')return;event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const path of [...SHELL,'/api/data']){try{if(await cache.match(path))continue;const r=await fetch(path,{credentials:'same-origin',cache:'no-cache'});if(await validResponse(r,path.split('?')[0]))await cache.put(path,r)}catch{}}})())});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 if(url.origin!==self.location.origin){
  if(req.destination==='image'&&(url.hostname==='kadettensh.ch'||url.hostname==='www.kadettensh.ch'))event.respondWith((async()=>{const cache=await caches.open(CACHE);const saved=await cache.match(req);if(saved)return saved;try{const r=await fetch(req);if(r.ok||r.type==='opaque'){await cache.put(req,r.clone());const keys=(await cache.keys()).filter(k=>new URL(k.url).origin!==self.location.origin);for(const old of keys.slice(0,Math.max(0,keys.length-80)))await cache.delete(old)}return r}catch{return await cache.match(req)||new Response('',{status:503})}})());
  return;
 }
 if(url.pathname.startsWith('/api/articles/')){event.respondWith((async()=>{const cache=await caches.open(ARTICLE_CACHE),saved=await cache.match(req);if(saved)return saved;try{const r=await fetch(req);if(r.ok&&url.searchParams.has('v')){const d=await r.clone().json();if(typeof d.html==='string'&&d.version===url.searchParams.get('v')){await cache.put(req,r.clone());const keys=await cache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-100)))await cache.delete(old)}}return r}catch{return new Response('',{status:503})}})());return}
 const navigation=req.mode==='navigate',data=url.pathname==='/api/data',asset=SHELL.some(path=>path.split('?')[0]===url.pathname)||url.pathname.startsWith('/assets/');if(!navigation&&!data&&!asset)return;
 const key=navigation?'/':url.pathname+url.search;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(!data&&(navigation||SHELL.includes(key)||url.pathname.startsWith('/assets/'))){
 const saved=await cache.match(key);
 if(saved){
  // Navigation checks access in the background; new releases arrive via SW update.
  if(navigation)event.waitUntil(fetch(req).then(async r=>{if(r.status===401||r.status===403||r.redirected){await caches.delete(CACHE);for(const client of await self.clients.matchAll())client.postMessage({type:'CLEAR_SAVED_DATA'})}}).catch(()=>{}));
  return saved;
 }
}try{const response=await fetch(req);if(await validResponse(response,navigation?'/':url.pathname)){event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return response}if(response.status===401||response.status===403||response.redirected){await caches.delete(CACHE);return response}if(data&&response.status>=500){const saved=await cache.match(key);if(saved)return cachedData(saved)}return response}catch{const saved=await cache.match(key);if(saved)return data?cachedData(saved):saved;return navigation?new Response(fallback,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response('',{status:503})}})());
});
function cachedData(response){const headers=new Headers(response.headers);headers.set('X-Kadetten-Offline','1');return new Response(response.body,{status:200,headers})}
