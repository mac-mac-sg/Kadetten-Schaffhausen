// Run only inside the authorised deployment workflow. Never print private key material.
import {generateKeyPairSync} from 'node:crypto';
const {CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:account}=process.env;
if(!token||!account)throw Error('Cloudflare deployment credentials missing');
const endpoint=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/kadetten-api/secrets`;
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
const response=await fetch(endpoint,{headers});const data=await response.json();
if(!response.ok||!data.success)throw Error('Cannot inspect Worker secret names');
const names=new Set(data.result.map(s=>s.name));
if(names.has('PUSH_PRIVATE_JWK')&&names.has('PUSH_PUBLIC_KEY')){console.log('Existing push keys retained.');}
else {
 if(names.has('PUSH_PRIVATE_JWK')||names.has('PUSH_PUBLIC_KEY'))throw Error('Incomplete push key pair; refusing automatic rotation');
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const jwk=privateKey.export({format:'jwk'}),pub=publicKey.export({format:'jwk'});
 const raw=Buffer.concat([Buffer.from([4]),Buffer.from(pub.x,'base64url'),Buffer.from(pub.y,'base64url')]).toString('base64url');
 for(const [name,text] of [['PUSH_PRIVATE_JWK',JSON.stringify(jwk)],['PUSH_PUBLIC_KEY',raw]]){
  const r=await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({name,text,type:'secret_text'})});
  if(!r.ok||!(await r.json()).success)throw Error('Cannot provision push key: '+name);
 }
 console.log('Push keys provisioned as Worker secrets.');
}
