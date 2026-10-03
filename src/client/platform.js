// Pages serves the app shell; the existing public service serves live data.
// This adapter never carries owner cookies or permits writes across hosts.
const kadettenApiOrigin=window.KADETTEN_PLATFORM?.apiOrigin||'';
function apiFetch(path,options={}){
 if(!path.startsWith('/api/'))throw Error('Invalid API path');
 if(kadettenApiOrigin){
  if((options.method||'GET').toUpperCase()!=='GET')return Promise.reject(Error('Updates require the owner service'));
  if(path==='/api/access')return Promise.resolve(new Response(JSON.stringify({canUpdate:false}),{headers:{'Content-Type':'application/json'}}));
  return fetch(kadettenApiOrigin+path,{...options,credentials:'omit',mode:'cors'});
 }
 return fetch(path,options);
}
