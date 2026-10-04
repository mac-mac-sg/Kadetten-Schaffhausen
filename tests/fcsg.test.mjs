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

test('FCSG live phases do not manufacture final scores; missing values stay unknown',async()=>{
 const {parseFcsgGame,fcsgClock,FCSG_LIVE_STATUSES}=await import('../server/fcsg.mjs');
 const base={id:458,date:'2026-10-11 16:30:00',homeClub:{id:12,name:'FC St.Gallen 1879'},guestClub:{id:13,name:'Opponent'},soccerLeague:{name:'Liga'},regularTimeHome:'2',regularTimeGuest:'1',firstHalfStartTime:'2026-10-11T16:30:00+02:00',secondHalfStartTime:'2026-10-11T17:30:00+02:00',livetickerEvents:[]};
 for(const status of FCSG_LIVE_STATUSES){const g=parseFcsgGame({...base,status},new Date('2026-10-11T17:40:00+02:00'));assert.equal(g.live,true);assert.equal(g.score,null);assert.deepEqual(g.liveScore,[2,1]);}
 const missing=parseFcsgGame({...base,status:'FIRST HALF',regularTimeGuest:null});assert.equal(missing.liveScore,null);assert.equal(missing.score,null);
 const final=parseFcsgGame({...base,status:'FINISHED'});assert.equal(final.live,false);assert.deepEqual(final.score,[2,1]);
 assert.throws(()=>parseFcsgGame({...base,status:'FINISHED',regularTimeGuest:null}));
 assert.throws(()=>parseFcsgGame({...base,homeClub:{id:15,name:'Other'}}));
 assert.equal(fcsgClock({...base,status:'SECOND HALF'},new Date('2026-10-11T18:17:00+02:00')),'90+2′');
 assert.equal(fcsgClock({...base,status:'PAUSE'},new Date()),null);
 assert.equal(fcsgClock({...base,status:'FIRST HALF',firstHalfStartTime:'2026-10-11T16:30:00'},new Date()),null);
});
test('FCSG live and detail APIs reject writes, wrong IDs and upstream errors without touching storage',async()=>{
 const original=globalThis.fetch,base={id:590,date:'2026-10-03 15:00:00',status:'FINISHED',homeClub:{id:12,name:'FC St.Gallen 1879'},guestClub:{id:13,name:'Opponent'},soccerLeague:{name:'Test'},extraTimeHome:'3',extraTimeGuest:'3',livetickerEvents:[{id:1,type:'Default',minute:null,title:'Anpfiff',content:'<p>Los geht es</p>',createdAt:'2026-10-03T13:00:00Z'},{id:2,type:'Social Media Post',title:'Ignored'}]};
 const env={BUCKET:{get:()=>{throw Error('No storage reads allowed')},put:()=>{throw Error('No storage writes allowed')}}};let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({data:base}))};
 try{
  const detail=await worker.fetch(new Request('https://app.test/api/fcsg/matches/590'),env);assert.equal(detail.status,200);assert.equal(detail.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');const data=await detail.json();assert.equal(data.match.ticker.length,1);assert.equal(data.match.ticker[0].minute,null);
  assert.equal((await worker.fetch(new Request('https://app.test/api/fcsg/matches/590',{method:'POST'}),env)).status,405);
  assert.equal((await worker.fetch(new Request('https://app.test/api/fcsg/matches/invalid'),env)).status,400);
  assert.equal((await worker.fetch(new Request('https://app.test/api/fcsg/matches/extra/590'),env)).status,400);
  assert.equal(calls,1);
  assert.equal((await worker.fetch(new Request('https://app.test/api/fcsg/matches/591'),env)).status,503);
  globalThis.fetch=async()=>{throw Error('offline')};assert.equal((await worker.fetch(new Request('https://app.test/api/fcsg/live'),env)).status,503);
 }finally{globalThis.fetch=original}
});
