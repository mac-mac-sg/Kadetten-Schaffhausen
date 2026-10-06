import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';
function fixture(){const memory=new Map(),reads=[],writes=[];return {memory,reads,writes,env:{KADETTEN_OWNER_EMAIL:'owner@example.test',KADETTEN_AUTH_PROVIDER:'sites',KADETTEN_SITES_ORIGIN:'https://kadetten.example.chatgpt.site',BUCKET:{get:async key=>{reads.push(key);return memory.has(key)?{json:async()=>JSON.parse(memory.get(key))}:null},put:async(key,value)=>{writes.push(key);memory.set(key,value)}}}}}
test('Public writes are rejected before storage or body access',async()=>{const f=fixture();const r=await worker.fetch(new Request('https://app.test/api/refresh',{method:'POST',body:'{}'}),f.env);assert.equal(r.status,403);assert.deepEqual(f.reads,[]);assert.deepEqual(f.writes,[])});
test('Public access does not grant update permission',async()=>{const f=fixture();const r=await worker.fetch(new Request('https://app.test/api/access'),f.env);assert.deepEqual(await r.json(),{canUpdate:false})});
test('Full articles are read separately, missing articles and writes rejected',async()=>{const f=fixture(),version='a'.repeat(64);f.memory.set('kadetten/current.json',JSON.stringify({stories:[{id:'example',articleVersion:version}]}));f.memory.set('kadetten/articles/example/'+version+'.json',JSON.stringify({id:'example',version,html:'<p>Complete article</p>'}));let r=await worker.fetch(new Request('https://app.test/api/articles/example?v='+version),f.env);assert.equal(r.status,200);assert.equal((await r.json()).html,'<p>Complete article</p>');r=await worker.fetch(new Request('https://app.test/api/articles/missing'),f.env);assert.equal(r.status,404);r=await worker.fetch(new Request('https://app.test/api/articles/example',{method:'POST'}),f.env);assert.equal(r.status,405);assert.equal(f.writes.length,0)});
test('Bad automation credentials never authorize writes',async()=>{const f=fixture();f.env.KADETTEN_UPDATE_KEY_SHA256='0'.repeat(64);const r=await worker.fetch(new Request('https://app.test/api/refresh',{method:'POST',headers:{'X-Kadetten-Update-Key':'wrong'},body:'{}'}),f.env);assert.equal(r.status,403);assert.equal(f.writes.length,0)});
test('Cross-origin owner write is rejected',async()=>{const f=fixture();const r=await worker.fetch(new Request('https://kadetten.example.chatgpt.site/api/refresh',{method:'POST',headers:{Origin:'https://other.test','oai-authenticated-user-id':'verified-platform-id','oai-authenticated-user-email':'owner@example.test'},body:'{}'}),f.env);assert.equal(r.status,403);assert.equal(f.reads.length,0)});

test('/api/data liefert nur bei GET, andere Methoden werden vor dem Speicher abgewiesen',async()=>{
 const f=fixture();
 for(const method of ['POST','PUT','DELETE','PATCH']){
  const r=await worker.fetch(new Request('https://app.test/api/data',{method,body:'{}'}),f.env);
  assert.equal(r.status,405);
 }
 assert.deepEqual(f.reads,[]);assert.deepEqual(f.writes,[]);
 assert.equal((await worker.fetch(new Request('https://app.test/api/data'),f.env)).status,200);
});

test('Unerwartete Fehler werden protokolliert und bleiben für Besucher ein 503 ohne Details',async()=>{
 const f=fixture();f.env.BUCKET.get=async()=>{throw new Error('R2 down: secret-detail')};
 const log=mock.method(console,'error',()=>{});
 try{
  const r=await worker.fetch(new Request('https://app.test/api/articles/42'),f.env);
  assert.equal(r.status,503);
  const body=await r.text();assert.ok(!body.includes('secret-detail'));
  assert.equal(log.mock.callCount(),1);
  assert.deepEqual(log.mock.calls[0].arguments.slice(0,3),['Worker error','GET','/api/articles/42']);
  assert.match(String(log.mock.calls[0].arguments[3]),/R2 down/);
 }finally{log.mock.restore()}
});

test('Autorisierte Aktualisierung speichert alten und neuen Stand, bei Quellenfehlern bleibt alles unverändert',async()=>{
 const seed=JSON.parse((await import('node:fs')).readFileSync('server/seed.json','utf8'));
 const owner={'oai-authenticated-user-id':'1','oai-authenticated-user-email':'owner@example.test',Origin:'https://kadetten.example.chatgpt.site'};
 const url='https://kadetten.example.chatgpt.site/api/refresh';
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline')};
 try{
  const posts=seed.stories.map((s,i)=>({id:1000+i,link:s.url,title:{rendered:'Titel '+i},excerpt:{rendered:'<p>eins zwei drei</p>'},date:'2026-10-01T10:00:00',content:{rendered:'<p>Text '+i+'</p>',protected:false},_embedded:{}}));
  const ok=fixture();ok.memory.set('kadetten/current.json',JSON.stringify(seed));
  const r=await worker.fetch(new Request(url,{method:'POST',headers:owner,body:JSON.stringify({posts})}),ok.env);
  assert.equal(r.status,200);
  const body=await r.json();assert.equal(body.news,seed.stories.length);assert.equal(body.status.news.ok,true);
  assert.ok(ok.writes.includes('kadetten/previous.json'));assert.ok(ok.writes.includes('kadetten/current.json'));
  assert.equal(JSON.parse(ok.memory.get('kadetten/previous.json')).stories.length,seed.stories.length);
  assert.equal(JSON.parse(ok.memory.get('kadetten/current.json')).stories[0].title,'Titel 0');
  const failed=fixture();failed.memory.set('kadetten/current.json',JSON.stringify(seed));
  const bad=await worker.fetch(new Request(url,{method:'POST',headers:owner,body:'{}'}),failed.env);
  assert.equal(bad.status,502);assert.deepEqual(failed.writes,[]);
 }finally{globalThis.fetch=original}
});
