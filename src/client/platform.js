// Public reads omit cookies. Only access/refresh may carry a browser-specific owner grant.
const kadettenApiOrigin=window.KADETTEN_PLATFORM?.apiOrigin||'';
const ownerGrantKey='kadetten-owner-refresh-v1';
function ownerGrant(){try{const value=JSON.parse(localStorage.getItem(ownerGrantKey)||'null');return /^[a-f0-9]{64}$/.test(value?.token||'')&&value.expiresAt>Date.now()?value:null}catch{return null}}
function forgetOwnerGrant(){try{localStorage.removeItem(ownerGrantKey)}catch{}}
function apiFetch(path,options={}){
 if(!path.startsWith('/api/'))throw Error('Invalid API path');
 if(kadettenApiOrigin){
  const protectedPath=['/api/access','/api/refresh'].includes(path),method=(options.method||'GET').toUpperCase();
  const headers=new Headers(options.headers);
  headers.delete('Authorization');
  if(method!=='GET'&&!(path==='/api/refresh'&&method==='POST'))return Promise.reject(Error('Invalid API write'));
  const grant=protectedPath?ownerGrant():null;
  if(protectedPath&&!grant){if(path==='/api/access')return Promise.resolve(Response.json({canUpdate:false}));return Promise.reject(Error('Bitte die Aktualisierung einmal freigeben.'))}
  if(grant)headers.set('Authorization','Bearer '+grant.token);
  return fetch(kadettenApiOrigin+path,{...options,headers,credentials:'omit',mode:'cors'});
 }
 return fetch(path,options);
}
let resumeOwnerRefresh=false;
if(kadettenApiOrigin&&typeof location!=='undefined'&&location.hash.startsWith('#owner-connect/')){
 try{
  const [,state,token,expiry]=location.hash.split('/'),pending=JSON.parse(localStorage.getItem('kadetten-connect-state')||'null'),expiresAt=Number(expiry);
  if(pending?.state===state&&pending.at>Date.now()-600000&&/^[a-f0-9]{64}$/.test(token||'')&&Number.isFinite(expiresAt)&&expiresAt>Date.now()&&expiresAt<=Date.now()+30*86400000){localStorage.setItem(ownerGrantKey,JSON.stringify({token,expiresAt}));resumeOwnerRefresh=true}
 }catch{}
 try{localStorage.removeItem('kadetten-connect-state')}catch{}
 history.replaceState(null,'',location.pathname+location.search+'#home');
}
function connectOwnerRefresh(){
 const state=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 localStorage.setItem('kadetten-connect-state',JSON.stringify({state,at:Date.now()}));
 location.assign(kadettenApiOrigin+'/admin/connect?state='+state);
 return new Promise(()=>{}); // The one-time sign-in returns to this app and resumes refresh.
}
