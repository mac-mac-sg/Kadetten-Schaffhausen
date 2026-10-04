import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {publicReadCors} from '../server/cors.mjs';
test('Pages adapter keeps public reads cookie-free and sends grants only to protected endpoints',async()=>{
 const calls=[],values=new Map();
 const context={window:{KADETTEN_PLATFORM:{apiOrigin:'https://kadetten.ma-ra10.chatgpt.site'}},Response,Headers,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},fetch:async(...args)=>{calls.push(args);return Response.json({ok:true})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('src/client/platform.js','utf8'),context);
 await context.apiFetch('/api/data',{credentials:'include',headers:{Authorization:'untrusted'}});
 assert.equal(calls[0][0],'https://kadetten.ma-ra10.chatgpt.site/api/data');assert.equal(calls[0][1].credentials,'omit');assert.equal(calls[0][1].headers.has('Authorization'),false);
 assert.deepEqual(await (await context.apiFetch('/api/access')).json(),{canUpdate:false});assert.equal(calls.length,1);
 await assert.rejects(context.apiFetch('/api/refresh',{method:'POST'}));assert.equal(calls.length,1);
 values.set('kadetten-owner-refresh-v1',JSON.stringify({token:'a'.repeat(64),expiresAt:Date.now()+60000}));
 await context.apiFetch('/api/refresh',{method:'POST'});assert.equal(calls[1][1].headers.get('Authorization'),'Bearer '+'a'.repeat(64));assert.equal(calls[1][1].credentials,'omit');
 await context.apiFetch('/api/data');assert.equal(calls[2][1].headers.has('Authorization'),false);
 await assert.rejects(context.apiFetch('/api/pages-grant',{method:'POST'}));
 values.set('kadetten-owner-refresh-v1',JSON.stringify({token:'a'.repeat(64),expiresAt:0}));await assert.rejects(context.apiFetch('/api/refresh',{method:'POST'}));
});
test('CORS permits protected Pages requests and preflights without granting cookie access',()=>{
 for(const path of ['/api/data','/api/live','/api/recent-games','/api/head-to-head','/api/articles/42']){
  const r=publicReadCors(Response.json({ok:true}),new Request('https://service.test'+path));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
 }
 for(const path of ['/api/access','/api/refresh','/admin/login'])assert.equal(publicReadCors(Response.json({ok:true}),new Request('https://service.test'+path)).headers.get('Access-Control-Allow-Origin'),null);
 for(const origin of ['https://mac-mac-sg.github.io','https://attacker.test']){
  const request=new Request('https://service.test/api/refresh',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}}),r=publicReadCors(new Response(null,{status:204}),request);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin.includes('attacker')?null:origin);assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
 }
});
test('Owner return consumes its pending nonce once and removes the credential fragment immediately',()=>{
 const code=fs.readFileSync('src/client/platform.js','utf8'),token='b'.repeat(64),state='a'.repeat(32),expiry=Date.now()+60000;
 for(const valid of [true,false]){
  const values=new Map(),session=new Map([['kadetten-connect-state',JSON.stringify({state:valid?state:'wrong',at:Date.now()})]]),historyCalls=[];
  const context={window:{KADETTEN_PLATFORM:{apiOrigin:'https://kadetten.ma-ra10.chatgpt.site'}},Response,Headers,location:{hash:'#owner-connect/'+state+'/'+token+'/'+expiry,pathname:'/Kadetten-Schaffhausen/',search:''},history:{replaceState:(...args)=>historyCalls.push(args)},localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},sessionStorage:{getItem:k=>session.get(k),removeItem:k=>session.delete(k)}};
  vm.createContext(context);vm.runInContext(code,context);
  assert.equal(values.has('kadetten-owner-refresh-v1'),valid);assert.equal(session.size,0);assert.equal(historyCalls[0][2],'/Kadetten-Schaffhausen/#home');
 }
});
