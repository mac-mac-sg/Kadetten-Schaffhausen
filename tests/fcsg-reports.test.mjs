import test from 'node:test';
import assert from 'node:assert/strict';
import {syncFcsgReports,fcsgReportBase,fcsgReportMessages,selectedFcsgReport} from '../scripts/lib/fcsg-reports.mjs';
const game=()=>({id:'1',date:'2026-10-11',home:'FC St.Gallen 1879',away:'Gast',score:[1,0],half:[1,0],homeStats:{totalScoringAtt:14,onTargetScoringAtt:5,possessionPercentage:41.3},awayStats:{totalScoringAtt:9,onTargetScoringAtt:4,possessionPercentage:58.7},events:[{type:'Tor',minute:30,player:'L. Görtler',home:true,score:[1,0]}]});
test('FCSG reports run after final confirmation, are cached and refresh on corrected scores',async()=>{
 const data={games:[game(),{...game(),id:'2',live:true,score:null}]},writes=[];
 const bucket={put:async(k,v)=>writes.push([k,v])};let calls=0;
 const write=async messages=>{calls++;assert.match(messages[0].content,/Fussball/);return {ok:true,text:JSON.stringify({facts:['goal-0','on-target']})}};
 assert.equal(fcsgReportBase(data.games[1]),null);assert.match(fcsgReportMessages(fcsgReportBase(data.games[0]))[1].content,/30/);
 assert.deepEqual(await syncFcsgReports(bucket,data,{write}),{written:1,ki:1});assert.equal(data.games[0].report.generator,'ki');assert.equal(writes[0][0],'fcsg/current.json');
 assert.equal((await syncFcsgReports(bucket,data,{write})).written,0);assert.equal(calls,1);
 data.games[0].score=[2,0];assert.equal((await syncFcsgReports(bucket,data)).written,1);assert.equal(data.games[0].report.generator,'daten');assert.deepEqual(data.games[0].report.score,[2,0]);
});
test('FCSG report AI failure preserves a readable factual fallback',async()=>{
 const data={games:[game()]};await syncFcsgReports({put:async()=>{}},data,{write:async()=>{throw Error('unavailable')}});
 assert.equal(data.games[0].report.generator,'daten');assert.match(data.games[0].report.paragraphs[0],/1:0/);
});

test('FCSG reports reject invented text and incorrect shot or possession claims',async()=>{
 const g=game(),base=fcsgReportBase(g);
 for(const text of ['FCSG hatte mehr Ballbesitz und 21 Schüsse aufs Tor.',JSON.stringify({facts:['invented']}),JSON.stringify({facts:['shots','shots']})])assert.equal(selectedFcsgReport(text,base),null);
 const selected=selectedFcsgReport(JSON.stringify({facts:['possession','shots','on-target']}),base);
 assert.match(selected.paragraphs[1],/41,3|41\.3/);assert.match(selected.paragraphs[1],/Schüsse aufs Tor: FC St.Gallen 1879 5, Gast 4/);
 const data={games:[g]};await syncFcsgReports({put:async()=>{}},data,{write:async()=>({ok:true,text:'Unbelegter Spielverlauf\n\nDie Gastgeber drehen das Spiel. Anschliessend gelingt der Ausgleich.\n\n21 Schüsse aufs Tor und mehr Ballbesitz führen zum Sieg.'})});
 assert.equal(g.report.generator,'daten');assert.doesNotMatch(g.report.paragraphs.join(' '),/drehen|Ausgleich|21/);
});
test('Sparse match facts skip AI and old free-form reports are replaced immediately',async()=>{
 const g={...game(),score:[3,3],half:[1,1],events:[],homeStats:null,awayStats:null,report:{generator:'ki',paragraphs:['erfundene Führung'],baseHash:'old'}},data={games:[g]};let calls=0;
 await syncFcsgReports({put:async()=>{}},data,{write:async()=>{calls++;throw Error();}});
 assert.equal(calls,0);assert.equal(g.report.version,2);assert.equal(g.report.generator,'daten');assert.doesNotMatch(g.report.paragraphs.join(' '),/Führung|drehen|heute/);
 assert.match(g.report.paragraphs[0],/11.10.2026/);
});
