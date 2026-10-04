import test from 'node:test';
import assert from 'node:assert/strict';
import {pagesGrant,pairingRoute,pagesOrigin} from '../server/pages-auth.mjs';
import worker from '../server/worker.mjs';
function fixture(){const data=new Map();return {data,env:{KADETTEN_OWNER_EMAIL:'owner@example.test',KADETTEN_AUTH_PROVIDER:'sites',KADETTEN_SITES_ORIGIN:'https://kadetten.example.chatgpt.site',BUCKET:{get:async k=>data.has(k)?{json:async()=>JSON.parse(data.get(k))}:null,put:async(k,v)=>data.set(k,v)}}}}
const owner={'oai-authenticated-user-id':'verified-id','oai-authenticated-user-email':'owner@example.test',Origin:'https://kadetten.example.chatgpt.site'};
test('Only a verified same-origin owner can issue a grant; no plaintext token is stored',async()=>{
 const {env,data}=fixture(),url=env.KADETTEN_SITES_ORIGIN+'/api/pages-grant';
 assert.equal((await pairingRoute(new Request(url,{method:'POST'}),env)).status,403);
 assert.equal((await pairingRoute(new Request(url,{method:'POST',headers:{...owner,Origin:pagesOrigin}}),env)).status,403);
 assert.equal((await pairingRoute(new Request(url,{headers:owner}),env)).status,405);
 const r=await pairingRoute(new Request(url,{method:'POST',headers:owner}),env),d=await r.json();assert.equal(r.status,200);assert.match(d.token,/^[a-f0-9]{64}$/);assert.ok(d.expiresAt>Date.now());
 assert.equal(data.size,1);assert.ok(![...data.values()][0].includes(d.token));
 const req=origin=>new Request(env.KADETTEN_SITES_ORIGIN+'/api/access',{headers:{Origin:origin,Authorization:'Bearer '+d.token}});
 assert.ok(await pagesGrant(req(pagesOrigin),env));assert.equal(await pagesGrant(req('https://attacker.test'),env),null);
 assert.deepEqual(await (await worker.fetch(req(pagesOrigin),env)).json(),{canUpdate:true});
 const key=[...data.keys()][0],record=JSON.parse(data.get(key));data.set(key,JSON.stringify({...record,expiresAt:0}));assert.equal(await pagesGrant(req(pagesOrigin),env),null);
 data.set(key,JSON.stringify({...record,owner:'someone@example.test'}));assert.equal(await pagesGrant(req(pagesOrigin),env),null);
 data.set(key,JSON.stringify({...record,scope:'other'}));assert.equal(await pagesGrant(req(pagesOrigin),env),null);
});
test('Forged and unknown bearer grants cannot authorize refresh; pairing page is owner-only and uncached',async()=>{
 const {env,data}=fixture();const r=await worker.fetch(new Request(env.KADETTEN_SITES_ORIGIN+'/api/refresh',{method:'POST',headers:{Origin:pagesOrigin,Authorization:'Bearer '+'f'.repeat(64)},body:'{}'}),env);assert.equal(r.status,403);assert.equal(data.size,0);
 const page=await pairingRoute(new Request(env.KADETTEN_SITES_ORIGIN+'/admin/connect?state='+ 'a'.repeat(32),{headers:owner}),env);assert.equal(page.headers.get('Cache-Control'),'no-store');assert.match(page.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.match(await page.text(),/location.replace/);
});
test('Anonymous connect uses platform sign-in and preserves only a validated same-site return path',async()=>{
 const {env}=fixture(),state='c'.repeat(32);
 const response=await pairingRoute(new Request(env.KADETTEN_SITES_ORIGIN+'/admin/connect?state='+state),env);
 assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'/signin-with-chatgpt?return_to='+encodeURIComponent('/admin/connect?state='+state));
 assert.equal((await pairingRoute(new Request(env.KADETTEN_SITES_ORIGIN+'/admin/connect?state=javascript:bad'),env)).status,400);
});
