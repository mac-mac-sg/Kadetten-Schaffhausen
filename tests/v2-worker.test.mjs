import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function handler(scope) {
 const handlers={};
 const context=vm.createContext({URL,Set,Request,Response,Headers,self:{registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({match:async()=>Response.json({cached:true})})},fetch:async()=>Response.json({network:true})});
 vm.runInContext(fs.readFileSync('src/client/sw.js','utf8'),context);
 return handlers.fetch;
}
test('Parent worker passes preview navigations and assets to the independent worker/network',()=>{
 const fetch=handler('https://example.test/Kadetten/');
 for(const path of ['v2/','v2/index.html','v2/js/app.js','v2/assets/logo.png']) {
  let intercepted=false;
  fetch({request:{url:'https://example.test/Kadetten/'+path,method:'GET',mode:'navigate'},respondWith:()=>{intercepted=true;}});
  assert.equal(intercepted,false,path);
 }
});
test('Preview worker still intercepts its own offline navigation',async()=>{
 let promise;
 handler('https://example.test/Kadetten/v2/')({request:{url:'https://example.test/Kadetten/v2/',method:'GET',mode:'navigate'},respondWith:p=>promise=p});
 assert.ok(promise);assert.deepEqual(await (await promise).json(),{cached:true});
});
