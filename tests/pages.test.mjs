import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {publicReadCors} from '../server/cors.mjs';
test('Pages adapter reads public APIs without cookies and rejects writes',async()=>{
 const calls=[];
 const context={window:{KADETTEN_PLATFORM:{apiOrigin:'https://kadetten.ma-ra10.chatgpt.site'}},Response,fetch:async(...args)=>{calls.push(args);return Response.json({ok:true})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('src/client/platform.js','utf8'),context);
 await context.apiFetch('/api/data',{credentials:'include'});
 assert.equal(calls[0][0],'https://kadetten.ma-ra10.chatgpt.site/api/data');assert.equal(calls[0][1].credentials,'omit');
 assert.deepEqual(await (await context.apiFetch('/api/access')).json(),{canUpdate:false});assert.equal(calls.length,1);
 await assert.rejects(context.apiFetch('/api/refresh',{method:'POST'}));assert.equal(calls.length,1);
});
test('CORS exposes only public reads and never update or identity routes',()=>{
 for(const path of ['/api/data','/api/live','/api/recent-games','/api/head-to-head','/api/articles/42']){
  const r=publicReadCors(Response.json({ok:true}),new Request('https://service.test'+path));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
 }
 for(const path of ['/api/access','/api/refresh','/admin/login'])assert.equal(publicReadCors(Response.json({ok:true}),new Request('https://service.test'+path)).headers.get('Access-Control-Allow-Origin'),null);
 assert.equal(publicReadCors(Response.json({ok:true}),new Request('https://service.test/api/data',{method:'POST'})).headers.get('Access-Control-Allow-Origin'),null);
});
