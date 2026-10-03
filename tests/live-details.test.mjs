import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLiveDetails} from '../server/live.mjs';
const game={gameId:508373,homeTeamId:41473,awayTeamId:40761};
const event={gameId:508373,entryId:1,timeInt:90,timeString:'01:30',result:'1:0',actionText:'Tor',homeTeamPlayerStaffName:'PRINCE Yari'};
const player={gameId:508373,teamId:41473,playerId:312787,playerName:'PRINCE Yari',isHome:1,totalScore:1,totalShots:null,totalScore7m:0,total2Minutes:1};
test('Live details retain missing metrics and order the feed newest first',()=>{
 const x=parseLiveDetails({gameLog:[event,{...event,entryId:2,timeInt:120,result:'1:1'}],gamePlayerStats:[player]},game);
 assert.equal(x.events[0].id,2);assert.deepEqual(x.events[0].score,[1,1]);
 assert.equal(x.players[0].shots,null);assert.equal(x.players[0].sevenShots,null);assert.equal(x.players[0].goals,1);
});
test('Live detail scope rejects another match and a reversed team assignment',()=>{
 assert.throws(()=>parseLiveDetails({gameLog:[{...event,gameId:9}],gamePlayerStats:[player]},game));
 assert.throws(()=>parseLiveDetails({gameLog:[event],gamePlayerStats:[{...player,teamId:40761}]},game));
 assert.throws(()=>parseLiveDetails({gameLog:null,gamePlayerStats:[]},game));
});
test('Reduced player records and staff placeholders are excluded',()=>{
 const x=parseLiveDetails({gameLog:[],gamePlayerStats:[{...player,useReducedResultDisplay:true},{...player,playerId:10000001},player]},game);
 assert.equal(x.players.length,1);
});
