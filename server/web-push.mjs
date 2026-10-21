// RFC 8291 (aes128gcm) and RFC 8292 (VAPID), using the Worker Web Crypto API.
const enc = new TextEncoder();
export const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export const unbase64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0));
const concat = (...arrays) => {const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let p=0;for(const a of arrays){out.set(a,p);p+=a.length}return out};
async function hkdf(key, salt, info, length) {
 const material=await crypto.subtle.importKey('raw',key,'HKDF',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},material,length*8));
}
export async function encryptPush(subscription, payload) {
 const receiver=unbase64(subscription.keys.p256dh),auth=unbase64(subscription.keys.auth);
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const sender=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
 const publicKey=await crypto.subtle.importKey('raw',receiver,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},pair.privateKey,256));
 const ikm=await hkdf(shared,auth,concat(enc.encode('WebPush: info\0'),receiver,sender),32);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
 const nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
 const plain=concat(enc.encode(JSON.stringify(payload)),new Uint8Array([2]));
 if(plain.length>3900)throw Error('Push payload too large');
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']),plain));
 // salt(16), record size(4), public-key length(1), sender key(65), ciphertext.
 return concat(salt,new Uint8Array([0,0,16,0,sender.length]),sender,ciphertext);
}
export async function sendPush(env, subscription, payload, fetchFn=fetch) {
 const audience=new URL(subscription.endpoint).origin;
 const header=b64url(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const claims=b64url(enc.encode(JSON.stringify({aud:audience,exp:Math.floor(Date.now()/1000)+3600,sub:'https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/'})));
 const key=await crypto.subtle.importKey('jwk',JSON.parse(env.PUSH_PRIVATE_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=b64url(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(header+'.'+claims)));
 // Workers at our compatibility date reject redirect:'error'. Manual never forwards the
 // VAPID credential to a redirect destination; a 3xx is a failed delivery (Response.ok=false).
 return fetchFn(subscription.endpoint,{method:'POST',redirect:'manual',headers:{Authorization:`vapid t=${header}.${claims}.${signature}, k=${env.PUSH_PUBLIC_KEY}`,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:'300',Urgency:'high'},body:await encryptPush(subscription,payload),signal:AbortSignal.timeout(10000)});
}
