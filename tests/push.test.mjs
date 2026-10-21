import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,hkdfSync,createDecipheriv,createPublicKey,verify} from 'node:crypto';
import {pushRoute,PUSH_ORIGIN,PUSH_PREFIX,digest,validPushSubscription} from '../server/push-subscriptions.mjs';
import {advancePushState,pushKickoff,pushHalfScore,monitorPush} from '../server/push-monitor.mjs';
import {encryptPush,sendPush} from '../server/web-push.mjs';
import worker from '../server/worker.mjs';
function memoryKV(){const data=new Map();return {data,get:async(k,type)=>data.has(k)?type==='json'?JSON.parse(data.get(k)):data.get(k):null,put:async(k,v)=>data.set(k,v),delete:async k=>data.delete(k),list:async({prefix})=>({keys:[...data.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name})),list_complete:true})}}
function subscription(){const ecdh=createECDH('prime256v1');ecdh.generateKeys();return {ecdh,subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,7).toString('base64url')}}}}
const fixture={id:'42',date:'2026-10-24',time:'18:00',home:'Heim',away:'Gast',league:'QHL'},kickoff=Date.parse('2026-10-24T16:00:00Z');
const match=(phase,score=[2,1])=>({id:42,home:'Heim',away:'Gast',phase,score});

test('Encrypted push decrypts independently with Node ECDH/HKDF/AES-GCM; VAPID signature and audience verify',async()=>{
 const {ecdh,subscription:s}=subscription(),payload={title:'Pausenresultat',body:'Heim 15 : 18 Gast'};
 const encrypted=Buffer.from(await encryptPush(s,payload)),salt=encrypted.subarray(0,16),sender=encrypted.subarray(21,86);
 assert.equal(encrypted.readUInt32BE(16),4096);assert.equal(encrypted[20],65);
 const ikm=Buffer.from(hkdfSync('sha256',ecdh.computeSecret(sender),Buffer.from(s.keys.auth,'base64url'),Buffer.concat([Buffer.from('WebPush: info\0'),ecdh.getPublicKey(),sender]),32));
 const key=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const decipher=createDecipheriv('aes-128-gcm',key,nonce);decipher.setAuthTag(encrypted.subarray(-16));const decoded=Buffer.concat([decipher.update(encrypted.subarray(86,-16)),decipher.final()]);
 assert.equal(decoded.at(-1),2);assert.deepEqual(JSON.parse(decoded.subarray(0,-1)),payload);
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey),publicJwk=await crypto.subtle.exportKey('jwk',pair.publicKey);
 await sendPush({PUSH_PRIVATE_JWK:JSON.stringify(privateJwk),PUSH_PUBLIC_KEY:'public'},s,payload,async(url,options)=>{
  assert.equal(url,s.endpoint);assert.equal(options.redirect,'manual');assert.equal(options.headers.TTL,'300');
  const jwt=options.headers.Authorization.match(/t=(.+), k=/)[1],parts=jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).aud,'https://fcm.googleapis.com');
  assert.ok(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key:createPublicKey({key:publicJwk,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
  return new Response(null,{status:201});
 });
});

test('Device endpoints require exact origin and unguessable ownership; snapshots stay read-only',async()=>{
 const DATA=memoryKV(),env={DATA,PUSH_PRIVATE_JWK:'configured',PUSH_PUBLIC_KEY:'configured'},s=subscription().subscription,token='a'.repeat(43);
 const req=(method='PUT',owner=token,origin=PUSH_ORIGIN,body={subscription:s,clubs:['kadetten'],types:['start','half','final']})=>new Request('https://api.test/api/push/device',{method,headers:{Origin:origin,Authorization:'Bearer '+owner,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const call=r=>pushRoute(r,env,new URL(r.url));
 assert.equal((await call(req('PUT',token,'https://evil.test'))).status,403);
 assert.equal((await call(req('PUT','bad'))).status,401);
 assert.equal((await call(req())).status,200);
 assert.equal((await call(req('PUT','b'.repeat(43)))).status,403);
 assert.equal((await call(req('DELETE','b'.repeat(43)))).status,403);
 assert.equal((await call(req('PUT',token,PUSH_ORIGIN,{subscription:{...s,endpoint:'https://127.0.0.1/private'},clubs:['kadetten'],types:[]}))).status,400);
 assert.equal((await call(req('PUT',token,PUSH_ORIGIN,{subscription:s,clubs:['invented'],types:[]}))).status,400);
 assert.equal((await call(req('DELETE'))).status,200);assert.equal((await DATA.list({prefix:PUSH_PREFIX})).keys.length,0);
 const preflight=new Request('https://api.test/api/push/device',{method:'OPTIONS',headers:{Origin:PUSH_ORIGIN}});assert.equal((await call(preflight)).status,204);
 assert.equal((await worker.fetch(new Request('https://api.test/api/data',{method:'POST'}),env)).status,405);
 assert.equal(validPushSubscription({...s,endpoint:'https://web.push.apple.com.evil.test/x'}),false);
});

test('Zurich reminder includes DST, unknown kickoff is ignored, no event is inferred from elapsed clock',()=>{
 assert.equal(pushKickoff(fixture),kickoff);
 assert.equal(pushKickoff({...fixture,date:'2026-12-24'}),Date.parse('2026-12-24T17:00:00Z'));
 assert.ok(Number.isNaN(pushKickoff({...fixture,time:null})));
 let state=advancePushState(null,fixture,null,'kadetten',kickoff-30*60000);assert.ok(state.events.reminder);
 state=advancePushState(state,fixture,{...match(null),clock:'60:00'},'kadetten',kickoff+90*60000);assert.equal(state.events.final,undefined);
 assert.equal(advancePushState(null,{...fixture,confirmed:false},null,'fcsg',kickoff-30*60000).events.reminder,undefined);
});

test('Four phases emit once; half-time uses confirmed score instead of erroneous SHV interval fields',()=>{
 let state=advancePushState(null,fixture,null,'kadetten',kickoff-30*60000);
 state=advancePushState(state,fixture,match('1. Halbzeit',[0,0]),'kadetten',kickoff);assert.ok(state.events.start);
 state=advancePushState(state,fixture,{...match('Halbzeitpause',[15,18]),half:[0,1]},'kadetten',kickoff+32*60000);assert.deepEqual(state.events.half.score,[15,18]);
 state=advancePushState(state,fixture,match('2. Halbzeit',[24,25]),'kadetten',kickoff+60*60000);
 state=advancePushState(state,fixture,{...match('Beendet',[30,32]),status:'finished'},'kadetten',kickoff+80*60000);assert.deepEqual(state.events.final.score,[30,32]);
 assert.deepEqual(Object.keys(state.events),['reminder','start','half','final']);
 assert.deepEqual(advancePushState(state,fixture,{...match('Beendet',[30,32]),status:'finished'},'kadetten',kickoff+81*60000),state);
 const old=advancePushState(null,fixture,{...match('Beendet',[30,32]),status:'finished'},'kadetten',kickoff+80*60000);assert.equal(old.events.final,undefined);
 assert.equal(pushHalfScore({...match('2. Halbzeit',[16,19]),half:[0,1]},'kadetten','second'),null);
 assert.deepEqual(pushHalfScore({...match('2. Halbzeit',[16,19]),details:{events:[{id:1,seconds:1700,score:[15,18]},{id:2,seconds:1802,score:[16,19]}]}},'kadetten','second'),[15,18]);
 for(const club of ['fcsg','otmar']){
  const first=club==='fcsg'?{...match(null,[0,0]),status:'FIRST HALF',liveScore:[0,0]}:match('1. Halbzeit',[0,0]);
  let s=advancePushState(null,fixture,first,club,kickoff);assert.ok(s.events.start);
  const half=club==='fcsg'?{...first,status:'PAUSE',liveScore:[1,0]}:match('Halbzeitpause',[12,10]);
  s=advancePushState(s,fixture,half,club,kickoff+45*60000);assert.ok(s.events.half);
 }
});

test('Background monitor respects clubs/types, paginates, deduplicates, retries failures and removes expired devices',async()=>{
 const DATA=memoryKV(),env={DATA,PUSH_PRIVATE_JWK:'configured',PUSH_PUBLIC_KEY:'configured'},s=subscription().subscription;
 await DATA.put('kadetten/current.json',JSON.stringify({games:[fixture]}));
 const device={subscription:s,clubs:['kadetten'],types:['reminder','start','half','final'],createdAt:kickoff-3600000};
 await DATA.put(PUSH_PREFIX+'one',JSON.stringify(device));await DATA.put(PUSH_PREFIX+'two',JSON.stringify({...device,clubs:['otmar']}));
 const sends=[],deps={live:async()=>null,send:async(_,__,payload)=>{sends.push(payload);return new Response(null,{status:201})}};
 await monitorPush(env,kickoff-30*60000,deps);await monitorPush(env,kickoff-29*60000,deps);assert.equal(sends.length,1);assert.equal(sends[0].title,'In 30 Minuten geht’s los');
 deps.live=async()=>match('1. Halbzeit',[0,0]);await monitorPush(env,kickoff,deps);assert.equal(sends.length,2);
 // A later device receives forthcoming events, not already-observed start/reminder.
 await DATA.put(PUSH_PREFIX+'late',JSON.stringify({...device,createdAt:kickoff+1000}));
 await monitorPush(env,kickoff+60000,deps);assert.equal(sends.length,2);
 deps.live=async()=>({...match('Halbzeitpause',[15,18]),half:[0,1]});await monitorPush(env,kickoff+32*60000,deps);assert.equal(sends.length,4);assert.match(sends[2].body,/15 : 18/);
 deps.live=async()=>{throw Error('down')};await monitorPush(env,kickoff+65*60000,deps);assert.equal(sends.length,4);
 deps.live=async()=>({...match('Beendet',[30,32]),status:'finished'});let attempt=0;deps.send=async()=>{attempt++;return new Response(null,{status:attempt===1?503:410})};
 await monitorPush(env,kickoff+80*60000,deps);assert.equal(attempt,2);await monitorPush(env,kickoff+81*60000,deps);assert.equal(attempt,3);
 assert.equal((await DATA.list({prefix:PUSH_PREFIX})).keys.length,1); // Only the unrelated Otmar subscription survives.
 assert.equal(await DATA.get('push/v2/matches/'+await digest('2026-10-24:42:Heim:Gast'),'json').then(s=>s.phase),'final');
});

test('Service worker shows V2 pushes and navigates only within V2; V1 ignores push',async()=>{
 const {default:vm}=await import('node:vm'),{default:fs}=await import('node:fs');
 for(const scope of ['https://mac-mac-sg.github.io/Kadetten-Schaffhausen/','https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/']){
  const handlers={},shown=[],opened=[];
  const self={registration:{scope,showNotification:async(...args)=>shown.push(args)},addEventListener:(name,fn)=>handlers[name]=fn,clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
  vm.runInNewContext(fs.readFileSync('src/client/sw.js','utf8'),{self,URL,Response,Request,console});
  const waits=[];handlers.push({data:{json:()=>({title:'Endresultat',body:'Heim 30 : 32 Gast',url:'https://evil.test/',tag:'match'})},waitUntil:p=>waits.push(p)});await Promise.all(waits);
  if(!scope.endsWith('/v2/')){assert.equal(shown.length,0);continue}
  assert.equal(shown.length,1);assert.equal(shown[0][1].data.url,scope);
  handlers.notificationclick({notification:{close(){},data:{url:scope+'?club=otmar#match/42/overview'}},waitUntil:p=>waits.push(p)});await Promise.all(waits);
  assert.equal(opened[0],scope+'?club=otmar#match/42/overview');
 }
});

test('Source recovery at final still notifies a device watching before kickoff; later activation never replays an old final',()=>{
 const waiting=advancePushState(null,fixture,null,'kadetten',kickoff-60000);
 const final={...match('Beendet',[30,32]),status:'finished'};
 assert.deepEqual(advancePushState(waiting,fixture,final,'kadetten',kickoff+80*60000).events.final.score,[30,32]);
 const late=advancePushState(null,fixture,null,'kadetten',kickoff+81*60000);
 assert.equal(advancePushState(late,fixture,final,'kadetten',kickoff+82*60000).events.final,undefined);
});

test('A derby produces one notification for a device subscribed to both clubs',async()=>{
 const DATA=memoryKV(),env={DATA,PUSH_PRIVATE_JWK:'configured',PUSH_PUBLIC_KEY:'configured'},s=subscription().subscription;
 for(const club of ['kadetten','otmar'])await DATA.put(club+'/current.json',JSON.stringify({games:[fixture]}));
 await DATA.put(PUSH_PREFIX+'both',JSON.stringify({subscription:s,clubs:['kadetten','otmar'],types:['reminder'],createdAt:kickoff-3600000}));
 let sent=0;await monitorPush(env,kickoff-30*60000,{send:async()=>{sent++;return new Response(null,{status:201})}});assert.equal(sent,1);
});

test('Worker returns readable, origin-scoped push errors when storage or transport throws',async()=>{
 const s=subscription().subscription,token='a'.repeat(43),DATA=memoryKV(),env={DATA,PUSH_PRIVATE_JWK:'configured',PUSH_PUBLIC_KEY:'configured'};
 const id=await digest(s.endpoint);
 await DATA.put(PUSH_PREFIX+id,JSON.stringify({owner:await digest(token),subscription:s,clubs:['kadetten'],types:[]}));
 const request=origin=>new Request('https://api.test/api/push/test',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({subscription:s})});
 // The configured fixture is intentionally not a signing key: this used to escape to
 // the generic Worker catch without CORS, hiding the actual HTTP error as Failed to fetch.
 const response=await worker.fetch(request(PUSH_ORIGIN),env);
 assert.equal(response.status,503);assert.equal(response.headers.get('Access-Control-Allow-Origin'),PUSH_ORIGIN);
 assert.match((await response.json()).error,/Benachrichtigungsdienst/);
 DATA.get=async()=>{throw Error('storage failure contains private details')};
 const unavailable=await worker.fetch(request(PUSH_ORIGIN),env);
 assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Access-Control-Allow-Origin'),PUSH_ORIGIN);assert.doesNotMatch(await unavailable.text(),/private details/);
 const rejected=await worker.fetch(request('https://evil.test'),env);
 assert.equal(rejected.status,403);assert.equal(rejected.headers.get('Access-Control-Allow-Origin'),null);
});
