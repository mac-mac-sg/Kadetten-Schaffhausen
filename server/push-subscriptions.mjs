import {sendPush, unbase64} from './web-push.mjs';
export const PUSH_ORIGIN='https://mac-mac-sg.github.io';
export const PUSH_PREFIX='push/v2/devices/';
export const PUSH_TYPES=['reminder','start','half','final'];
export const PUSH_CLUBS=['kadetten','fcsg','otmar'];
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
const reply=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':PUSH_ORIGIN,'Access-Control-Allow-Methods':'GET, PUT, DELETE, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'}});
export function validPushSubscription(s) {
 try {
  const u=new URL(s.endpoint);
  const host=u.hostname;
  const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(host)||host.endsWith('.notify.windows.com')||host.endsWith('.push.services.mozilla.com');
  return allowed&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&s.endpoint.length<2048&&/^[-\w]{87}$/.test(s.keys.p256dh)&&/^[-\w]{22}$/.test(s.keys.auth)&&unbase64(s.keys.p256dh)[0]===4;
 } catch{return false}
}
async function bodyJson(request) {
 const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,text='';const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000){await reader.cancel();throw Error('body')}text+=decoder.decode(value,{stream:true})}
 return JSON.parse(text+decoder.decode());
}
async function handlePush(request, env, url) {
 if(request.headers.get('Origin')!==PUSH_ORIGIN)return new Response('Origin rejected',{status:403});
 if(request.method==='OPTIONS')return reply(null,204);
 if(url.pathname==='/api/push/config'&&request.method==='GET')return reply({enabled:!!(env.DATA&&env.PUSH_PUBLIC_KEY&&env.PUSH_PRIVATE_JWK),publicKey:env.PUSH_PUBLIC_KEY||null});
 if(!env.DATA||!env.PUSH_PUBLIC_KEY||!env.PUSH_PRIVATE_JWK)return reply({error:'Benachrichtigungen werden noch eingerichtet.'},503);
 if(!['/api/push/device','/api/push/test'].includes(url.pathname))return reply({error:'Not found'},404);
 if(!['PUT','DELETE','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([-\w]{43})$/)?.[1];
 if(!token)return reply({error:'Device authorization required'},401);
 let input;try{input=await bodyJson(request)}catch{return reply({error:'Invalid body'},400)}
 if(!validPushSubscription(input?.subscription))return reply({error:'Invalid subscription'},400);
 const id=await digest(input.subscription.endpoint),key=PUSH_PREFIX+id,owner=await digest(token),previous=await env.DATA.get(key,'json');
 if(previous&&previous.owner!==owner)return reply({error:'Device authorization required'},403);
 if(request.method==='DELETE'&&url.pathname==='/api/push/device'){await env.DATA.delete(key);return reply({ok:true})}
 if(url.pathname==='/api/push/test'&&request.method==='POST') {
  if(!previous)return reply({error:'Device not registered'},404);
  const testKey='push/v2/test/'+id;
  if(await env.DATA.get(testKey))return reply({error:'Bitte eine Minute bis zum nächsten Test warten.'},429);
  await env.DATA.put(testKey,'1',{expirationTtl:60});
  const result=await sendPush(env,previous.subscription,{title:'Benachrichtigungen sind bereit',body:'Hier erscheinen deine Spielhinweise aus V2.',tag:'v2-test',url:'https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/'});
  if([404,410].includes(result.status))await env.DATA.delete(key);
  return reply(result.ok?{ok:true}:{error:'Test konnte nicht zugestellt werden.'},result.ok?200:502);
 }
 if(request.method!=='PUT'||url.pathname!=='/api/push/device')return reply({error:'Method not allowed'},405);
 if(!Array.isArray(input.clubs)||!input.clubs.length||input.clubs.some(c=>!PUSH_CLUBS.includes(c))||!Array.isArray(input.types)||input.types.some(t=>!PUSH_TYPES.includes(t)))return reply({error:'Invalid preferences'},400);
 if(!previous) {
  // Bounded per-IP enrolment; no subscription lists, arbitrary messages or snapshot writes are exposed.
  const rateKey='push/v2/enrol/'+await digest(request.headers.get('CF-Connecting-IP')||'unknown');
  if(await env.DATA.get(rateKey))return reply({error:'Bitte eine Minute bis zur erneuten Aktivierung warten.'},429);
  await env.DATA.put(rateKey,'1',{expirationTtl:60});
 }
 await env.DATA.put(key,JSON.stringify({owner,subscription:{endpoint:input.subscription.endpoint,keys:input.subscription.keys},clubs:[...new Set(input.clubs)],types:[...new Set(input.types)],createdAt:previous?.createdAt||Date.now(),updatedAt:Date.now()}),{expirationTtl:180*86400});
 return reply({ok:true});
}

// Keep exceptions readable by the V2 client without granting CORS to other origins.
export async function pushRoute(request,env,url) {
 try {return await handlePush(request,env,url)}
 catch {
  if(request.headers.get('Origin')!==PUSH_ORIGIN)return new Response('Origin rejected',{status:403});
  return reply({error:'Der Benachrichtigungsdienst ist gerade nicht erreichbar. Bitte in einer Minute erneut versuchen.'},503);
 }
}
