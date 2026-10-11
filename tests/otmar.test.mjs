import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshOtmar,aggregateOtmarSeason,decodeOtmarPage,OTMAR_TEAM_ID} from '../server/otmar.mjs';
import seed from '../server/otmar-seed.json' with {type:'json'};
import worker from '../server/worker.mjs';
import {publicReadCors} from '../server/cors.mjs';

test('Otmar-Datenquellen behalten bei Ausfall ihren letzten gültigen Stand',async()=>{
 const next=await refreshOtmar(seed,{fetchFn:async()=>{throw Error('offline')},reportLoader:async()=>{throw Error('offline')}});
 for(const key of ['games','roster','stories','playerSeason','tables'])assert.deepEqual(next[key],seed[key]);
 for(const key of ['games','players','news','playerSeason'])assert.equal(next.status[key].ok,false);
});
test('Otmar-Spielerwerte stammen aus vollständigen QHL-Berichten; fehlende Werte bleiben offen',()=>{
 const roster=[{number:7,name:'Test'}],ids={7:{shvPlayerId:42}};
 const reports=[1,2].map(gameId=>({gameId,teams:[{id:OTMAR_TEAM_ID,players:[{id:42,goals:gameId+1,seven:1,warnings:0,twoMinutes:gameId===1?null:1,redCards:0}]}]}));
 const data=aggregateOtmarSeason(reports,roster,ids,2);
 assert.equal(data.players[7].games,2);assert.equal(data.players[7].goals,5);assert.equal(data.players[7].fieldGoals,3);assert.equal(data.players[7].twoMinutes,null);
 assert.throws(()=>aggregateOtmarSeason(reports.slice(0,1),roster,ids,2),/Incomplete/);
 assert.throws(()=>aggregateOtmarSeason([reports[0],reports[0]],roster,ids,2),/Incomplete/);
});
test('Otmar-API liefert getrennten Startstand, CORS erlaubt nur Lesen und öffentliche Zugriffe schreiben nie',async()=>{
 let writes=0;const env={BUCKET:{get:async()=>null,put:async()=>writes++}};
 const request=new Request('https://api.test/api/otmar/data');const r=await worker.fetch(request,env);
 assert.equal(r.status,200);const data=await r.clone().json();assert.equal(data.roster.length,20);assert.equal(data.playerSeason.teamId,40900);assert.ok(data.games.every(g=>/Otmar/.test(g.home+' '+g.away)));
 const cors=publicReadCors(r,request);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');
 for(const path of ['data','live','reports/123','articles/test','head-to-head','match-reports/123'])assert.equal((await worker.fetch(new Request('https://api.test/api/otmar/'+path,{method:'POST'}),env)).status,405);
 assert.equal(writes,0);
});
test('Nuxt-Inhalte werden als Daten gelesen; Skripte und manipulierte Referenzen werden nicht ausgeführt',()=>{
 assert.throws(()=>decodeOtmarPage('<script>alert(1)</script>'),/unavailable/);
 assert.throws(()=>decodeOtmarPage('<script id="__NUXT_DATA__">[{"data":99}]</script>'),/Invalid/);
});
