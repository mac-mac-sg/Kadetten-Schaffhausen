import {isOwner} from './auth.mjs';
export const pagesOrigin='https://mac-mac-sg.github.io';
const ttl=30*24*60*60*1000;
const grantJson=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const digest=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
export async function pagesGrant(request,env){
 if(request.headers.get('Origin')!==pagesOrigin)return null;
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return null;
 const hash=await digest(token),obj=await env.BUCKET.get('kadetten/access/'+hash+'.json');
 if(!obj)return null;
 const record=await obj.json();
 return record.scope==='refresh'&&record.origin===pagesOrigin&&record.owner===env.KADETTEN_OWNER_EMAIL&&Number.isFinite(record.expiresAt)&&record.expiresAt>Date.now()?{hash,...record}:null;
}
export async function pairingRoute(request,env){
 const u=new URL(request.url);
 if(!['/admin/connect','/api/pages-grant'].includes(u.pathname))return null;
 if(u.pathname==='/admin/connect'){
  if(!/^[a-f0-9]{32}$/.test(u.searchParams.get('state')||''))return grantJson({error:'Bitte die Freigabe aus der Kadetten-App starten.'},400);
  if(!request.headers.get('oai-authenticated-user-id')&&env.KADETTEN_AUTH_PROVIDER==='sites')return new Response(null,{status:303,headers:{Location:'/signin-with-chatgpt?return_to='+encodeURIComponent(u.pathname+u.search),'Cache-Control':'no-store'}});
 }
 if(!await isOwner(request,env))return grantJson({error:'Bitte mit deinem Eigentümer-Zugang anmelden.'},403);
 if(u.pathname==='/api/pages-grant'){
  if(request.method!=='POST')return grantJson({error:'POST required'},405);
  if(request.headers.get('Origin')!==u.origin)return grantJson({error:'Origin rejected'},403);
  const random=crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(random,b=>b.toString(16).padStart(2,'0')).join(''),expiresAt=Date.now()+ttl;
  await env.BUCKET.put('kadetten/access/'+await digest(token)+'.json',JSON.stringify({scope:'refresh',origin:pagesOrigin,owner:env.KADETTEN_OWNER_EMAIL,expiresAt}));
  return grantJson({token,expiresAt});
 }
 if(request.method!=='GET')return grantJson({error:'GET required'},405);
 const nonce=crypto.randomUUID();
 const html=`<!doctype html><html lang="de-CH"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kadetten · Aktualisierung freigeben</title><style>body{background:#111310;color:#fff;font:17px system-ui;max-width:420px;margin:12vh auto;padding:24px}button{background:#f68a20;border:0;border-radius:12px;padding:16px;font:inherit;font-weight:700}p{line-height:1.6}textarea{width:100%;height:90px}</style><h1>Aktualisierung freigeben</h1><p>Erlaube deiner Kadetten-App, News und Statistiken direkt zu aktualisieren. Die Freigabe gilt 30 Tage für diesen Browser.</p><button id="allow">Freigeben</button><p id="status" role="status"></p><script nonce="${nonce}">
const state=${JSON.stringify(u.searchParams.get('state'))},button=document.getElementById('allow');
button.onclick=async()=>{button.disabled=true;const status=document.getElementById('status');try{if(!/^[a-f0-9]{32}$/.test(state))throw Error('Bitte die Freigabe aus der Kadetten-App starten.');const r=await fetch('/api/pages-grant',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),d=await r.json();if(!r.ok)throw Error(d.error||'Freigabe fehlgeschlagen.');location.replace('${pagesOrigin}/Kadetten-Schaffhausen/#owner-connect/'+state+'/'+d.token+'/'+d.expiresAt)}catch(e){status.textContent=e.message;button.disabled=false}};
</script></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`}});
}
