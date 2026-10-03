import {createRemoteJWKSet,jwtVerify} from 'jose';

const accessKeys=new Map();
function tokenFrom(request){
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  if(assertion)return assertion;
  const cookies=request.headers.get('Cookie')||'';
  return cookies.split(';').map(x=>x.trim()).find(x=>x.startsWith('CF_Authorization='))?.slice('CF_Authorization='.length);
}

// Explicit provider selection prevents platform identity headers becoming a login
// when this code is deployed on a different host. Missing configuration fails closed.
export async function isOwner(request,env){
  const owner=env.KADETTEN_OWNER_EMAIL;
  if(typeof owner!=='string'||!owner)return false;
  if(env.KADETTEN_AUTH_PROVIDER==='sites'){
    const origin=env.KADETTEN_SITES_ORIGIN;
    if(typeof origin!=='string'||!/^https:\/\/[^/]+\.chatgpt\.site$/.test(origin)||new URL(request.url).origin!==origin)return false;
    const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');
    return !!(id&&email&&email.toLowerCase()===owner.toLowerCase());
  }
  if(env.KADETTEN_AUTH_PROVIDER!=='cloudflare-access')return false;
  const issuer=env.KADETTEN_ACCESS_ISSUER,audience=env.KADETTEN_ACCESS_AUD;
  if(typeof issuer!=='string'||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||typeof audience!=='string'||!audience)return false;
  const token=tokenFrom(request);
  if(!token||token.length>16384)return false;
  try{
    let keys=accessKeys.get(issuer);
    if(!keys){
      if(accessKeys.size>=8)accessKeys.delete(accessKeys.keys().next().value);
      keys=createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs'),{timeoutDuration:5000,cacheMaxAge:300000,cooldownDuration:30000});
      accessKeys.set(issuer,keys);
    }
    const {payload}=await jwtVerify(token,keys,{issuer,audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],clockTolerance:0});
    const now=Math.floor(Date.now()/1000);
    return typeof payload.sub==='string'&&!!payload.sub&&typeof payload.iat==='number'&&payload.iat<=now&&typeof payload.email==='string'&&payload.email.toLowerCase()===owner.toLowerCase();
  }catch{return false}
}

export async function mayUpdate(request,env){
  if(await isOwner(request,env))return true;
  const key=request.headers.get('X-Kadetten-Update-Key'),expected=env.KADETTEN_UPDATE_KEY_SHA256;
  if(!key||key.length>512||!expected||!/^[a-f0-9]{64}$/.test(expected))return false;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)),actual=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  let diff=0;for(let i=0;i<64;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return diff===0;
}
