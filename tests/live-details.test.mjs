import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLiveDetails,parseFinishedMatch,selectFinishedGame} from '../server/live.mjs';
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

const complete={...game,isLive:false,seasonId:2026,gameStatusId:2,ltGameStatusId:4,gameDateTime:'2026-10-03T18:00:00',homeTeamName:'Kadetten Schaffhausen',awayTeamName:'Handball Stäfa',homeTeamScore:45,awayTeamScore:34,ltGameTime:'60:00'};
test('Explicit completion returns the confirmed final score and date',()=>{
 const result=parseFinishedMatch(complete);assert.equal(result.status,'finished');assert.deepEqual(result.score,[45,34]);assert.equal(result.date,'2026-10-03');
 assert.equal(selectFinishedGame({games:[complete]},'2026-10-03').gameId,508373);
 assert.equal(selectFinishedGame({games:[complete]},'2026-10-04'),null);
});
test('Clock, half-time whistle and missing scores cannot manufacture a final result',()=>{
 assert.equal(parseFinishedMatch({...complete,isLive:true}),null);
 assert.equal(parseFinishedMatch({...complete,gameStatusId:1,ltGameStatusId:2}),null);
 assert.throws(()=>parseFinishedMatch({...complete,homeTeamScore:null}));
});

import {ehfClock,parseEhfTeamStats,parseEhfLiveMatch} from '../server/live.mjs';
test('EHF-Spieluhr: «mm:ss» bleibt unverändert, nur eine Minutenzahl bekommt das Minutenzeichen',()=>{
 assert.equal(ehfClock('18:47'),'18:47');
 assert.equal(ehfClock('5:03'),'5:03');
 assert.equal(ehfClock('19'),'19′');
 assert.equal(ehfClock(''),null);assert.equal(ehfClock('-'),null);assert.equal(ehfClock(null),null);
 const feed={days:[{liveScoreMatches:[{match:{competitionShortName:'EHF EL - M',matchID:'202711020901029',url:'/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/',homeTeam:{id:'uyEpUicNjwv8hCX9B7A3sg',name:'Kadetten Schaffhausen'},guestTeam:{id:'x',name:'HC Izvidac'}},matchStats:{isLive:true,time:'18:47',phase:'1st Half'},homeStats:{totalGoals:17},guestStats:{totalGoals:9}}]}]};
 const m=parseEhfLiveMatch(feed);assert.equal(m.clock,'18:47');assert.deepEqual(m.score,[17,9]);
});
test('EHF-Teamwerte: Zahlen, fehlende Werte bleiben leer, ohne Teamblöcke wird abgelehnt',()=>{
 const stats={id:'202711020901029',isLive:true,homeStatistics:{totalGoals:16,totalShots:19,totalMisses:3,shotEfficiency:84,goals7meters:0,shots7meters:0,suspensions2minutes:0,warnings:0,disqualifications:0,technicalFaults:2,turnover:null},guestStatistics:{totalGoals:8,totalShots:18,totalMisses:10,shotEfficiency:44,goals7meters:2,shots7meters:2,suspensions2minutes:null,warnings:0,disqualifications:0,technicalFaults:4}};
 const t=parseEhfTeamStats(stats);
 assert.equal(t.home.goals,16);assert.equal(t.home.efficiency,84);assert.equal(t.guest.sevenGoals,2);assert.equal(t.guest.twoMinutes,null);assert.equal(t.isLive,true);
 assert.throws(()=>parseEhfTeamStats({}));assert.throws(()=>parseEhfTeamStats(null));
});
