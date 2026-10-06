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

import {parseEhfPlayers} from '../server/live.mjs';
test('EHF-Spielerwerte: Namen, Tore, Würfe, Strafen, Paraden; Staff-Einträge und fehlende Werte',()=>{
 const player=(id,first,last,score,extra={})=>({id,shirtNumber:'7',playingPosition:'Left Wing',isPlayer:true,isGoalkeeper:false,person:{firstName:first,lastName:last},score,...extra});
 const data={matchDetails:{details:{
  homeTeam:{players:[player('a','Leon','Bergmann',{goals:0,shots:0,goalkeeperSaves:8,goalkeeperRecievedShots:17,twoMinPenaltiesCount:0,warningsCount:0,redCardsCount:0},{isGoalkeeper:true,playingPosition:'Goalkeeper'}),player('b','Max','Muster',{goals:5,shots:7,twoMinPenaltiesCount:1,warningsCount:1,redCardsCount:0})]},
  guestTeam:{players:[player('c','Marko','Culjak',{goals:3,shots:4,twoMinPenaltiesCount:null}),{id:'x',isPlayer:true,person:{},score:{}}]}}}};
 const list=parseEhfPlayers(data);
 assert.equal(list.length,3,'Eintrag ohne Nachnamen entfällt');
 const gk=list.find(p=>p.id==='a'),field=list.find(p=>p.id==='b'),guest=list.find(p=>p.id==='c');
 assert.equal(gk.name,'Leon Bergmann');assert.equal(gk.goalkeeper,true);assert.equal(gk.saves,8);assert.equal(gk.savesFaced,17);assert.equal(gk.home,true);
 assert.equal(field.goals,5);assert.equal(field.shots,7);assert.equal(field.twoMinutes,1);assert.equal(field.yellow,1);assert.equal(field.seven,null);
 assert.equal(guest.home,false);assert.equal(guest.twoMinutes,null);
 assert.throws(()=>parseEhfPlayers({}));assert.throws(()=>parseEhfPlayers({matchDetails:{details:{homeTeam:{players:[]}}}}));
});

import {parseEhfFinishedMatch} from '../server/live.mjs';
test('EHF-Spielende: «Match ended» mit Endtoren gilt als beendet, nur heute, nie ohne Endtore und nie für ein laufendes Spiel',()=>{
 const item=(stats,extra={})=>({match:{competitionShortName:'EHF EL - M',matchID:'202711020901029',url:'/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/',homeTeam:{id:'uyEpUicNjwv8hCX9B7A3sg',name:'Kadetten Schaffhausen'},guestTeam:{id:'2zXEaNBPEzJP81Ffhy6t9g',name:'HC Izvidac'}},homeStats:{totalGoals:42},guestStats:{totalGoals:30},matchStats:stats,...extra});
 const ended={time:'60:00',startTime:'18:45',phase:'Match ended',state:2,stateEnum:2,isLive:false};
 const feed=(day,i)=>({days:[{dayDatumFormatted:day,liveScoreMatches:[i]}]});
 const m=parseEhfFinishedMatch(feed('2026-10-06',item(ended)),'2026-10-06');
 assert.equal(m.status,'finished');assert.deepEqual(m.score,[42,30]);assert.equal(m.date,'2026-10-06');assert.equal(m.home,'Kadetten Schaffhausen');assert.equal(m.away,'HC Izvidac');assert.equal(m.league,'European League');assert.equal(m.clock,'60:00');assert.equal(m.phase,'Match ended');
 assert.equal(parseEhfFinishedMatch(feed('2026-10-05',item(ended)),'2026-10-06'),null,'nur Spiele von heute');
 assert.equal(parseEhfFinishedMatch(feed('2026-10-06',item({...ended,stateEnum:1,isLive:true,phase:'2nd Half'})),'2026-10-06'),null,'laufendes Spiel');
 assert.equal(parseEhfFinishedMatch(feed('2026-10-06',item({...ended,stateEnum:0,phase:null,time:null})),'2026-10-06'),null,'noch nicht begonnen');
 assert.throws(()=>parseEhfFinishedMatch(feed('2026-10-06',item(ended,{homeStats:{}})),'2026-10-06'),/final score/);
 const other=item(ended);other.match.homeTeam={id:'x',name:'A'};other.match.guestTeam={id:'y',name:'B'};
 assert.equal(parseEhfFinishedMatch(feed('2026-10-06',other),'2026-10-06'),null,'Spiel ohne Kadetten');
 assert.throws(()=>parseEhfFinishedMatch({},'2026-10-06'));
});

test('EHF-Feed: ein unvollständiger Eintrag eines anderen Spiels stört weder Live- noch Ende-Erkennung',()=>{
 const base={competitionShortName:'EHF EL - M',matchID:'202711020901029',url:'/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/',homeTeam:{id:'uyEpUicNjwv8hCX9B7A3sg',name:'Kadetten Schaffhausen'},guestTeam:{id:'2zXEaNBPEzJP81Ffhy6t9g',name:'HC Izvidac'}};
 const odd=[{match:null,matchStats:null},{match:{matchID:'x'}},{match:{matchID:'y'},matchStats:null}];
 const ended={days:[{dayDatumFormatted:'2026-10-06',liveScoreMatches:[...odd,{match:base,homeStats:{totalGoals:42},guestStats:{totalGoals:30},matchStats:{time:'60:00',phase:'Match ended',stateEnum:2,isLive:false}}]}]};
 assert.equal(parseEhfLiveMatch(ended),null);
 assert.deepEqual(parseEhfFinishedMatch(ended,'2026-10-06').score,[42,30]);
 const live={days:[{dayDatumFormatted:'2026-10-06',liveScoreMatches:[...odd,{match:base,homeStats:{totalGoals:5},guestStats:{totalGoals:3},matchStats:{time:'10:00',phase:'1st Half',stateEnum:1,isLive:true}}]}]};
 assert.deepEqual(parseEhfLiveMatch(live).score,[5,3]);
});
