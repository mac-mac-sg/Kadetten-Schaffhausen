import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {isOwner,mayUpdate} from '../server/auth.mjs';
import worker from '../server/worker.mjs';

const issuer='https://kadetten-auth-test.cloudflareaccess.com';
const env={KADETTEN_AUTH_PROVIDER:'cloudflare-access',KADETTEN_OWNER_EMAIL:'owner@example.test',KADETTEN_ACCESS_ISSUER:issuer,KADETTEN_ACCESS_AUD:'test-app-audience'};
const key=await generateKeyPair('RS256'),jwk={...await exportJWK(key.publicKey),kid:'test-key',alg:'RS256',use:'sig'};
const now=Math.floor(Date.now()/1000);
async function sign(overrides={},signingKey=key.privateKey){
  return new SignJWT({email:'owner@example.test',iss:issuer,aud:['test-app-audience'],sub:'owner-id',iat:now,exp:now+3600,...overrides}).setProtectedHeader({alg:'RS256',kid:'test-key'}).sign(signingKey);
}
function request(token,headers={}){return new Request('https://kadetten-staging.example/api/access',{headers:{'Cf-Access-Jwt-Assertion':token,...headers}})}

test('Signed Access identity authorizes only the configured owner and app',async t=>{
  const original=globalThis.fetch;let reads=0;
  globalThis.fetch=async url=>{assert.equal(String(url),issuer+'/cdn-cgi/access/certs');reads++;return Response.json({keys:[jwk]})};
  try{
    const token=await sign();assert.equal(await isOwner(request(token),env),true);
    assert.equal(await isOwner(new Request('https://kadetten-staging.example/api/access',{headers:{Cookie:'other=x; CF_Authorization='+token}}),env),true);
    for(const [name,claims] of Object.entries({expired:{exp:now-1},wrongOwner:{email:'viewer@example.test'},wrongAudience:{aud:['other-app']},wrongIssuer:{iss:'https://other.cloudflareaccess.com'},future:{nbf:now+3600},noExpiry:{exp:undefined},noSubject:{sub:''},futureIssued:{iat:now+3600}})){
      await t.test(name,async()=>assert.equal(await isOwner(request(await sign(claims)),env),false));
    }
    const wrongKey=await generateKeyPair('RS256');assert.equal(await isOwner(request(await sign({},wrongKey.privateKey)),env),false);
    assert.equal(await isOwner(request('not.a.valid.token'),env),false);
    assert.equal(reads,1,'JWKS are reused for the configured issuer');
    const access=await worker.fetch(request(token),env);assert.deepEqual(await access.json(),{canUpdate:true});
    const login=await worker.fetch(new Request('https://kadetten-staging.example/admin/login',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);assert.equal(login.status,303);assert.equal(login.headers.get('Location'),'/');
  }finally{globalThis.fetch=original}
});

test('Missing configuration and forged platform or email headers fail closed',async()=>{
  const forged=new Request('https://external.example/api/access',{headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'owner@example.test','Cf-Access-Authenticated-User-Email':'owner@example.test'}});
  assert.equal(await isOwner(forged,env),false);
  assert.equal(await isOwner(forged,{KADETTEN_OWNER_EMAIL:env.KADETTEN_OWNER_EMAIL}),false);
  assert.equal(await isOwner(request(await sign()),{...env,KADETTEN_ACCESS_AUD:''}),false);
  assert.equal(await isOwner(request(await sign()),{...env,KADETTEN_ACCESS_ISSUER:'https://attacker.test'}),false);
});

test('Unavailable JWKS never authorizes a write or touches storage',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};
  try{
    const broken={...env,KADETTEN_ACCESS_ISSUER:'https://unavailable.cloudflareaccess.com',BUCKET:{get(){assert.fail('Unauthorized request read storage')},put(){assert.fail('Unauthorized request wrote storage')}}};
    const token=await sign({iss:broken.KADETTEN_ACCESS_ISSUER});
    const r=await worker.fetch(new Request('https://kadetten-staging.example/api/refresh',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':token},body:'{}'}),broken);assert.equal(r.status,403);
  }finally{globalThis.fetch=original}
});

test('Sites identity is accepted only with explicit provider and matching trusted origin',async()=>{
  const config={KADETTEN_AUTH_PROVIDER:'sites',KADETTEN_SITES_ORIGIN:'https://kadetten.example.chatgpt.site',KADETTEN_OWNER_EMAIL:env.KADETTEN_OWNER_EMAIL};
  const headers={'oai-authenticated-user-id':'gateway-id','oai-authenticated-user-email':'owner@example.test'};
  assert.equal(await isOwner(new Request(config.KADETTEN_SITES_ORIGIN+'/api/access',{headers}),config),true);
  assert.equal(await isOwner(new Request('https://external.example/api/access',{headers}),config),false);
});

test('Automation uses its own rotated key independently of the browser provider',async()=>{
  const secret='test-only-automation-key';const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret));
  const config={KADETTEN_UPDATE_KEY_SHA256:Buffer.from(digest).toString('hex')};
  assert.equal(await mayUpdate(new Request('https://app.test/api/refresh',{headers:{'X-Kadetten-Update-Key':secret}}),config),true);
  assert.equal(await mayUpdate(new Request('https://app.test/api/refresh',{headers:{'X-Kadetten-Update-Key':'wrong'}}),config),false);
});
