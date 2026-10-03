import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArchivedReport,getArchivedReport,archiveCompletedReports} from '../server/live.mjs';
import worker from '../server/worker.mjs';
const game={gameId:508373,objectId:508373,isLive:false,seasonId:2026,gameStatusId:2,gameDateTime:'2026-10-03T18:00:00',homeTeamId:41473,awayTeamId:40761,homeTeamName:'Kadetten Schaffhausen',awayTeamName:'Handball Stäfa',homeTeamScore:45,awayTeamScore:34,leagueShortName:'QHL',homeTeamScoreInterval:21,awayTeamScoreInterval:14};
const player=(teamId,isHome)=>({gameId:508373,teamId,playerId:teamId,playerName:'Player',isHome,totalScore:isHome?45:34,totalShots:null,totalScore7m:isHome?3:1,totalShots7m:isHome?3:2,total2Minutes:isHome?3:2,totalWarnings:0,totalSuspension:0,totalSaves:isHome?'11':'',totalShotsGK:isHome?'45':''});
const data={gamePlayerStats:[player(41473,1),player(40761,0)],gameTeamStats:[{gameId:508373,teamId:40761,isHome:false,totalScore:34,totalShots:54,totalSaves:9,throwPercentage:63,savePercentage:17,turnovers:14},{gameId:508373,teamId:41473,isHome:true,totalScore:45,totalShots:57,totalSaves:11,throwPercentage:79,savePercentage:24,turnovers:6}],gameLog:[{gameId:508373,entryId:1,timeInt:1800,timeString:'30:00',result:'21:14',actionText:'Time-Out',homeTeamActionLCID:'bTO'}]};
test('Archived final report orders home/away, retains missing values and official keeper denominator',()=>{
 const r=parseArchivedReport(data,game);
 assert.deepEqual(r.score,[45,34]);assert.deepEqual(r.half,[21,14]);
 assert.equal(r.teams[0].sevenShots,3);assert.equal(r.teams[1].turnovers,14);
 assert.equal(r.teams[0].players[0].keeperShots,45);assert.equal(r.teams[0].savePercentage,24);
 assert.equal(r.teams[1].players[0].saves,null);assert.equal(r.teams[1].players[0].shots,null);
 assert.equal(r.teams[0].timeouts,1);
});
test('Final reports reject live games, another season, opponents and mismatched scores',()=>{
 for(const change of [{isLive:true},{seasonId:2025},{homeTeamId:1},{leagueShortName:'EHL'},{gameStatusId:1}])assert.throws(()=>parseArchivedReport(data,{...game,...change}));
 assert.throws(()=>parseArchivedReport({...data,gameTeamStats:data.gameTeamStats.map(t=>({...t,totalScore:0}))},game));
});
test('Stored reports stay accessible after matchday without upstream access or public writes',async()=>{
 const r=parseArchivedReport(data,game),writes=[],bucket={get:async key=>key==='kadetten/reports/508373.json'?{json:async()=>r}:null,put:async(...args)=>writes.push(args)};
 const result=await getArchivedReport('staefa',bucket);assert.equal(result.stored,true);assert.deepEqual(result.report.score,[45,34]);
 const response=await worker.fetch(new Request('https://app.test/api/reports/staefa'),{BUCKET:bucket});
 assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://mac-mac-sg.github.io');assert.equal((await response.json()).report.date,'2026-10-03');
 assert.equal((await worker.fetch(new Request('https://app.test/api/reports/staefa',{method:'POST'}),{BUCKET:bucket})).status,405);
 assert.deepEqual(writes,[]);
});
test('Authorized archival refresh preserves stored final data when the source fails',async()=>{
 const original=globalThis.fetch,writes=[];
 globalThis.fetch=async(_url,options)=>JSON.parse(options.body).query.includes('games(teamId:')?Response.json({data:{games:[game]}}):Response.json({errors:[{message:'source unavailable'}]});
 try{
  const result=await archiveCompletedReports({get:async()=>({json:async()=>({score:[45,34]})}),put:async(...args)=>writes.push(args)});
  assert.equal(result.ok,false);assert.deepEqual(writes,[]);
 }finally{globalThis.fetch=original;}
});
