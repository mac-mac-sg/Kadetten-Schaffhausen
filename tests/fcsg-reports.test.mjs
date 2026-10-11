import test from 'node:test';
import assert from 'node:assert/strict';
import {syncFcsgReports,fcsgReportBase,fcsgReportMessages} from '../scripts/lib/fcsg-reports.mjs';
const game=()=>({id:'1',date:'2026-10-11',home:'FC St.Gallen 1879',away:'Gast',score:[1,0],half:[1,0],events:[{type:'Tor',minute:30,player:'L. Görtler',home:true,score:[1,0]}]});
test('FCSG reports run after final confirmation, are cached and refresh on corrected scores',async()=>{
 const data={games:[game(),{...game(),id:'2',live:true,score:null}]},writes=[];
 const bucket={put:async(k,v)=>writes.push([k,v])};let calls=0;
 const write=async messages=>{calls++;assert.match(messages[0].content,/Fussball/);return {ok:true,text:'Grünweiss gewinnt\n\nDer FC St.Gallen 1879 gewinnt gegen Gast mit 1:0. Zur Pause stand es bereits 1:0.\n\nL. Görtler traf in der 30. Minute für das Heimteam. Damit ist das Endresultat 1:0.'}};
 assert.equal(fcsgReportBase(data.games[1]),null);assert.match(fcsgReportMessages(fcsgReportBase(data.games[0]))[1].content,/30/);
 assert.deepEqual(await syncFcsgReports(bucket,data,{write}),{written:1,ki:1});assert.equal(data.games[0].report.generator,'ki');assert.equal(writes[0][0],'fcsg/current.json');
 assert.equal((await syncFcsgReports(bucket,data,{write})).written,0);assert.equal(calls,1);
 data.games[0].score=[2,0];assert.equal((await syncFcsgReports(bucket,data)).written,1);assert.equal(data.games[0].report.generator,'daten');assert.deepEqual(data.games[0].report.score,[2,0]);
});
test('FCSG report AI failure preserves a readable factual fallback',async()=>{
 const data={games:[game()]};await syncFcsgReports({put:async()=>{}},data,{write:async()=>{throw Error('unavailable')}});
 assert.equal(data.games[0].report.generator,'daten');assert.match(data.games[0].report.paragraphs[0],/1:0/);
});
