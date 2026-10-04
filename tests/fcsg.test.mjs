import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../server/fcsg-seed.json' with {type:'json'};
import worker from '../server/worker.mjs';
import {refreshFcsg,publicFcsgData,parseFcsgTable,parseFcsgPlayers} from '../server/fcsg.mjs';
test('FCSG public data and full articles use an independent namespace and never write',async()=>{
 const reads=[],writes=[],env={BUCKET:{get:async key=>{reads.push(key);return null},put:async key=>writes.push(key)}};
 const response=await worker.fetch(new Request('https://app.test/api/fcsg/data'),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');
 const data=await response.json();assert.equal(data.club,'fcsg');assert.equal(data.table.length,12);assert.equal(data.players.length,30);assert.ok(data.stories.every(s=>!('html' in s)));
 const article=await worker.fetch(new Request('https://app.test/api/fcsg/articles/'+seed.stories[0].id),env);
 assert.equal((await article.json()).html,seed.stories[0].html);
 const denied=await worker.fetch(new Request('https://app.test/api/fcsg/data',{method:'POST'}),env);assert.equal(denied.status,405);
 assert.deepEqual(reads,['fcsg/current.json','fcsg/current.json']);assert.deepEqual(writes,[]);
});
test('FCSG source failure preserves every prior valid record and successful timestamp',async()=>{
 const before=globalThis.fetch;globalThis.fetch=async()=>{throw Error('upstream down')};
 try{const next=await refreshFcsg(seed);for(const key of ['games','table','players','stories'])assert.deepEqual(next[key],seed[key]);for(const key of ['games','table','players','news']){assert.equal(next.status[key].ok,false);assert.equal(next.status[key].updatedAt,seed.status[key].updatedAt)}}finally{globalThis.fetch=before}
});
test('Incomplete or inconsistent standings and roster do not replace valid data',()=>{
 assert.throws(()=>parseFcsgTable({data:{soccerMatchTableRows:[]}}));
 assert.throws(()=>parseFcsgPlayers({data:[]}));
 assert.equal(publicFcsgData(seed).stories[0].html,undefined);
 assert.ok(seed.games.filter(g=>g.score).every(g=>g.status==='FINISHED'&&g.score.every(Number.isInteger)));
});
