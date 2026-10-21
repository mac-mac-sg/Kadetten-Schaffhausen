// Optional Workers runtime regression, using the Miniflare installed alongside Wrangler.
// PUSH_MINIFLARE_MODULE may point to that installation; no app secrets or real recipients are used.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {build} from 'esbuild';
const {Miniflare,convertV4MiniflareOptions}=await import(process.env.PUSH_MINIFLARE_MODULE||'miniflare');
const jwk=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({format:'jwk'});
const source=`import {sendPush,b64url} from ${JSON.stringify(fileURLToPath(new URL('../server/web-push.mjs',import.meta.url)))};
export default {async fetch(){try{
 const client=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/runtime-fixture',keys:{p256dh:b64url(await crypto.subtle.exportKey('raw',client.publicKey)),auth:b64url(crypto.getRandomValues(new Uint8Array(16)))}};
 const env={PUSH_PRIVATE_JWK:JSON.stringify(${JSON.stringify(jwk)}),PUSH_PUBLIC_KEY:'runtime-test-only'};
 const result=await sendPush(env,subscription,{title:'Test'},async(url,options)=>{
  // Unlike Node fetch mocks, constructing the request exercises Worker-only validation.
  const request=new Request(url,options);
  if(request.redirect!=='manual')throw Error('Push redirects must be manual');
  return new Response(null,{status:201});
 });return Response.json({ok:result.ok});
}catch(e){return Response.json({ok:false,error:e.name,message:e.message})}}}`;
const bundle=await build({stdin:{contents:source,resolveDir:fileURLToPath(new URL('..',import.meta.url))},bundle:true,write:false,format:'esm',platform:'browser'});
const options={modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2025-09-01'};
const runtime=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
try{
 const result=await (await runtime.dispatchFetch('https://runtime.test/')).json();
 assert.equal(result.ok,true,JSON.stringify(result));
 console.log('Worker runtime: key import, signing, encryption and manual-redirect request passed. No real push sent.');
}finally{await runtime.dispose()}
