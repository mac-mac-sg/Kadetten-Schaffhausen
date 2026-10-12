import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function worker() {
 const listeners={},stores=new Map();let fetchImpl=async()=>{throw Error('offline');};
 const key=request=>typeof request==='string'?request:request.url;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {put:async(req,r)=>map.set(key(req),r.clone()),match:async req=>map.get(key(req))?.clone(),keys:async()=>[...map.keys()].map(url=>new Request(url)),delete:async req=>map.delete(key(req))};},keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)};
 const context=vm.createContext({URL,Request,Response,Headers,caches,fetch:(...args)=>fetchImpl(...args),self:{registration:{scope:'https://app.test/base/'},addEventListener:(type,fn)=>listeners[type]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}}});
 vm.runInContext(fs.readFileSync('src/client/sw.js','utf8'),context);
 return {online:fn=>fetchImpl=fn,async request(path){let response;listeners.fetch({request:new Request('https://app.test'+path),respondWith:r=>response=r});return response?await response:null;}};
}
test('All club snapshots remain readable offline, are marked saved and never share cache entries',async()=>{
 const w=worker();
 const paths=['/api/data','/api/fcsg/data','/api/otmar/data'];
 const data=paths.map((path,i)=>({club:i===1?'fcsg':i===2?'otmar':'kadetten',games:[],stories:[],tables:{QHL:[]},table:Array.from({length:12},()=>({})),players:[]}));
 w.online(async req=>Response.json(data[paths.indexOf(new URL(req.url).pathname)]));
 for(const path of paths)assert.equal((await w.request(path)).status,200);
 w.online(async()=>{throw Error('offline');});
 for(let i=0;i<paths.length;i++){const r=await w.request(paths[i]);assert.equal(r.headers.get('X-Kadetten-Offline'),'1');assert.equal((await r.json()).club,data[i].club);}
 for(const path of ['/api/live','/api/fcsg/live','/api/otmar/live','/api/reports/123'])assert.equal(await w.request(path),null,'live and history go straight to the network');
});
test('Club articles cache verified versions and unversioned articles only fall back on network failure',async()=>{
 const w=worker();let value='first';
 w.online(async req=>Response.json({id:new URL(req.url).pathname.split('/').at(-1),version:new URL(req.url).searchParams.get('v'),html:'<p>'+value+'</p>'}));
 for(const path of ['/api/articles/1?v=a','/api/fcsg/articles/2?v=b','/api/otmar/articles/3'])assert.equal((await w.request(path)).status,200);
 value='second';assert.match((await (await w.request('/api/otmar/articles/3')).json()).html,/second/);
 w.online(async()=>{throw Error('offline');});
 assert.match((await (await w.request('/api/fcsg/articles/2?v=b')).json()).html,/first/);
 assert.match((await (await w.request('/api/otmar/articles/3')).json()).html,/second/);
 assert.equal((await w.request('/api/fcsg/articles/2?v=new')).status,503);
});
test('Invalid snapshots and mismatched article versions cannot poison the offline cache',async()=>{
 const w=worker();w.online(async()=>Response.json({games:[],stories:[],html:'bad',id:'1',version:'wrong'}));
 await w.request('/api/fcsg/data');await w.request('/api/fcsg/articles/1?v=expected');
 w.online(async()=>{throw Error('offline');});
 assert.equal((await w.request('/api/fcsg/data')).status,503);
 assert.equal((await w.request('/api/fcsg/articles/1?v=expected')).status,503);
});
