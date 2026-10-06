const liveEndpoint='https://www.handball.ch/Umbraco/Api/MatchCenter/Query';
const liveGamesQuery='query($teamId:Int){games(teamId:$teamId){objectId isLive gameStatusId seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName}}';
const liveDetailQuery='query($gameId:Int,$isLive:Boolean){game(gameId:$gameId,isLive:$isLive){gameId isLive gameStatusId ltGameStatusId seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName homeTeamScoreInterval awayTeamScoreInterval ltGameTime ltCurrentGamePhaseText}}';
async function liveQuery(query,variables){const r=await fetch(liveEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'de'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Live source unavailable');const d=await r.json();if(d.errors?.length||!d.data)throw Error('Live source schema changed');return d.data}
export function selectLiveGame(data){if(!Array.isArray(data?.games))throw Error('Missing games');return data.games.find(g=>g.isLive===true&&g.seasonId===2026&&(g.homeTeamId===41473||g.awayTeamId===41473))||null}
export function parseLiveMatch(g){if(!g||g.isLive!==true||g.seasonId!==2026||(g.homeTeamId!==41473&&g.awayTeamId!==41473))return null;const id=g.gameId;if(!Number.isInteger(id)||!g.homeTeamName||!g.awayTeamName)throw Error('Invalid live match');const validScore=v=>Number.isInteger(v)&&v>=0;return {id,home:g.homeTeamName,away:g.awayTeamName,score:validScore(g.homeTeamScore)&&validScore(g.awayTeamScore)?[g.homeTeamScore,g.awayTeamScore]:null,league:g.leagueShortName||'Handball',clock:g.ltGameTime||null,phase:g.ltCurrentGamePhaseText||null,url:'https://www.handball.ch/de/matchcenter/spiele/'+id,half:validScore(g.homeTeamScoreInterval)&&validScore(g.awayTeamScoreInterval)?[g.homeTeamScoreInterval,g.awayTeamScoreInterval]:null}}
export function selectFinishedGame(data, today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'})) {
 if(!Array.isArray(data?.games))throw Error('Missing games');
 return data.games.filter(g=>g.isLive===false&&g.gameStatusId===2&&g.seasonId===2026&&(g.homeTeamId===41473||g.awayTeamId===41473)&&String(g.gameDateTime).slice(0,10)===today).sort((a,b)=>String(b.gameDateTime).localeCompare(String(a.gameDateTime)))[0]||null;
}
export function parseFinishedMatch(g) {
 if(!g||g.isLive!==false||g.seasonId!==2026||!(g.gameStatusId===2||g.ltGameStatusId===4)||(g.homeTeamId!==41473&&g.awayTeamId!==41473))return null;
 // Completion is explicit; neither 60:00 nor a half-time whistle proves a final result.
 const match=parseLiveMatch({...g,isLive:true});
 if(!match?.score)throw Error('Missing final score');
 return {...match,status:'finished',date:String(g.gameDateTime).slice(0,10)};
}
const ehfLiveEndpoint='https://ehfel.eurohandball.com/umbraco/api/livescoreapi/GetLiveScoreMatches/138790';
const ehfKadettenId='uyEpUicNjwv8hCX9B7A3sg';
// Die EHF meldet die Spieluhr als «mm:ss» (zum Beispiel «18:47»); nur eine reine Minutenzahl bekommt das Minutenzeichen.
export function ehfClock(value){
 if(value===null||value===undefined||value===''||value==='-')return null;
 const text=String(value).trim();
 return /^\d{1,2}:\d{2}$/.test(text)?text:text+'′';
}
// Teamwerte aus GetMatchDetailStatistic (die EHF liefert keine Spielerwerte und für diese Spiele keinen Ereignisverlauf).
export function parseEhfTeamStats(data){
 if(!data||typeof data!=='object'||!data.homeStatistics||!data.guestStatistics)throw Error('Missing EHF statistics');
 const count=v=>Number.isInteger(v)&&v>=0?v:null;
 const pick=t=>({goals:count(t.totalGoals),shots:count(t.totalShots),misses:count(t.totalMisses),efficiency:count(t.shotEfficiency),sevenGoals:count(t.goals7meters),sevenShots:count(t.shots7meters),twoMinutes:count(t.suspensions2minutes),warnings:count(t.warnings),disqualifications:count(t.disqualifications),technicalFaults:count(t.technicalFaults)});
 return {home:pick(data.homeStatistics),guest:pick(data.guestStatistics),isLive:data.isLive===true};
}
// Spielerwerte aus GetMatchDetails (matchDetails.details.homeTeam/guestTeam.players[].score). 7-Meter je Spieler liefert die EHF nicht.
export function parseEhfPlayers(data){
 const details=data?.matchDetails?.details;
 if(!details||!Array.isArray(details.homeTeam?.players)||!Array.isArray(details.guestTeam?.players))throw Error('Missing EHF players');
 const count=v=>Number.isInteger(v)&&v>=0?v:null;
 const side=(list,home)=>list.filter(p=>p&&p.isPlayer!==false&&p.person?.lastName).map(p=>{
  const sc=p.score||{};
  return {id:String(p.id||p.shirtNumber||p.person.lastName),number:p.shirtNumber?String(p.shirtNumber):null,name:[p.person.firstName,p.person.lastName].filter(Boolean).join(' '),home,goalkeeper:p.isGoalkeeper===true||p.playingPosition==='Goalkeeper',goals:count(sc.goals),shots:count(sc.shots),seven:null,sevenShots:null,twoMinutes:count(sc.twoMinPenaltiesCount),yellow:count(sc.warningsCount),red:count(sc.redCardsCount),saves:count(sc.goalkeeperSaves),savesFaced:count(sc.goalkeeperRecievedShots)};
 });
 return [...side(details.homeTeam.players,true),...side(details.guestTeam.players,false)];
}
// Gemeinsame Prüfung eines Feed-Eintrags der Kadetten (European League); liefert die Felder, die für Live und Ende gleich sind.
function ehfMatchBase(item){
 const m=item.match,stats=item.matchStats;
 const id=m.matchID;if(!/^202711\d{9}$/.test(id))throw Error('Unexpected EHF season');
 const url=new URL(m.url,'https://ehfel.eurohandball.com');
 if(url.origin!=='https://ehfel.eurohandball.com'||!url.pathname.startsWith('/men/2026-27/matches/details/'+id+'/'))throw Error('Unexpected EHF match URL');
 if(!m.homeTeam.name||!m.guestTeam.name)throw Error('Missing EHF teams');
 const valid=v=>Number.isInteger(v)&&v>=0;
 const score=valid(item.homeStats?.totalGoals)&&valid(item.guestStats?.totalGoals)?[item.homeStats.totalGoals,item.guestStats.totalGoals]:null;
 return {id,home:m.homeTeam.name,away:m.guestTeam.name,score,league:'European League',clock:ehfClock(stats.time),phase:typeof stats.phase==='string'?stats.phase:null,url:url.href};
}
const isEhfKadetten=m=>m.competitionShortName==='EHF EL - M'&&(m.homeTeam?.id===ehfKadettenId||m.guestTeam?.id===ehfKadettenId);
export function parseEhfLiveMatch(data){
 if(!Array.isArray(data?.days))throw Error('Missing EHF live feed');
 for(const day of data.days){
  if(!Array.isArray(day.liveScoreMatches))throw Error('EHF live schema changed');
  for(const item of day.liveScoreMatches){
   const m=item.match,stats=item.matchStats;
   if(!m||!stats)throw Error('Missing EHF match status');
   if(stats.isLive!==true||!isEhfKadetten(m))continue;
   return ehfMatchBase(item);
  }
 }
 return null;
}
// Beendetes Spiel von heute: der Feed führt es weiter, mit matchStats.stateEnum 2 («Match ended») und den Endtoren (Feed vom 6. Oktober 2026:
// {time:"60:00", phase:"Match ended", state:2, stateEnum:2, isLive:false}, 42:30). Ohne bestätigte Endtore gilt es nicht als beendet.
export function parseEhfFinishedMatch(data,today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'})){
 if(!Array.isArray(data?.days))throw Error('Missing EHF live feed');
 for(const day of data.days){
  if(!Array.isArray(day.liveScoreMatches))throw Error('EHF live schema changed');
  if(String(day.dayDatumFormatted||String(day.date||'').slice(0,10))!==today)continue;
  for(const item of day.liveScoreMatches){
   const m=item.match,stats=item.matchStats;
   if(!m||!stats)throw Error('Missing EHF match status');
   if(stats.isLive!==false||stats.stateEnum!==2||!isEhfKadetten(m))continue;
   const base=ehfMatchBase(item);
   if(!base.score)throw Error('Missing EHF final score');
   return {...base,status:'finished',date:today};
  }
 }
 return null;
}
const ehfApi='https://ehfel.eurohandball.com/umbraco/api/matchdetailapi/';
async function ehfJson(name,id){
 const r=await fetch(ehfApi+name+'?matchId='+encodeURIComponent(id),{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('EHF '+name+' unavailable');
 return r.json();
}
// Teamwerte und Spielerwerte werden unabhängig geholt; fällt eines aus, bleibt das andere erhalten.
async function getEhfDetails(id){
 const [stats,players]=await Promise.allSettled([ehfJson('GetMatchDetailStatistic',id).then(parseEhfTeamStats),ehfJson('GetMatchDetails',id).then(parseEhfPlayers)]);
 const teamStats=stats.status==='fulfilled'?stats.value:null,roster=players.status==='fulfilled'?players.value:null;
 if(!teamStats&&!roster)return {ok:false,updatedAt:null,events:null,players:null,teamStats:null};
 return {ok:true,updatedAt:new Date().toISOString(),events:null,players:roster,teamStats};
}
async function getEhfLiveMatch(){
 const r=await fetch(ehfLiveEndpoint,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('EHF live source unavailable');
 const feed=await r.json();
 const match=parseEhfLiveMatch(feed)||parseEhfFinishedMatch(feed);
 if(match)match.details=await getEhfDetails(match.id);
 return match;
}
let liveCache,livePending;
export async function getLiveMatch(){
 if(liveCache&&Date.now()-liveCache.at<20000)return liveCache.value;if(livePending)return livePending;
 livePending=(async()=>{
  const results=await Promise.allSettled([getNationalLiveMatch(),getEhfLiveMatch()]);
  if(results.every(r=>r.status==='rejected'))throw Error('All live sources unavailable');
  const sources=Object.fromEntries(results.map((r,i)=>[["SHV","EHF"][i],{ok:r.status==='fulfilled'}]));
  const match=results.find(r=>r.status==='fulfilled'&&r.value&&r.value.status!=='finished')?.value||null;
  const finished=results.find(r=>r.status==='fulfilled'&&r.value?.status==='finished')?.value||null;
  const value={ok:true,checkedAt:new Date().toISOString(),sources,match,finished};liveCache={at:Date.now(),value};return value;
 })();try{return await livePending}finally{livePending=null}
}

const recentServerCache=new Map();
export async function getRecentGames(team){
 const key=String(team||'');if(!key||key.length>100)throw Error('Invalid team');
 const cached=recentServerCache.get(key);if(cached&&Date.now()-cached.at<300000)return cached.value;
 const own=await liveQuery(liveGamesQuery,{teamId:41473});
 if(!Array.isArray(own.games))throw Error('Missing season games');
 const norm=n=>n.replace(/^TSV /,'');let teamId=key==='Kadetten Schaffhausen'?41473:null;
 for(const g of own.games.filter(g=>g.seasonId===2026)){if(norm(g.homeTeamName||'')===norm(key))teamId=g.homeTeamId;if(norm(g.awayTeamName||'')===norm(key))teamId=g.awayTeamId;}
 if(!Number.isInteger(teamId)||teamId<=0)throw Error('Team not found');
 const data=teamId===41473?own:await liveQuery(liveGamesQuery,{teamId});
 if(!Array.isArray(data.games))throw Error('Missing team games');
 const games=data.games.filter(g=>g.seasonId===2026&&g.isLive!==true&&Date.parse(g.gameDateTime)<Date.now()&&(g.homeTeamId===teamId||g.awayTeamId===teamId)&&Number.isInteger(g.homeTeamScore)&&Number.isInteger(g.awayTeamScore)&&g.homeTeamScore>=0&&g.awayTeamScore>=0&&(g.homeTeamScore+g.awayTeamScore)>0).sort((a,b)=>Date.parse(b.gameDateTime)-Date.parse(a.gameDateTime)).slice(0,5).map(g=>({id:String(g.objectId),date:g.gameDateTime.slice(0,10),home:g.homeTeamName,away:g.awayTeamName,score:[g.homeTeamScore,g.awayTeamScore],externalUrl:'https://www.handball.ch/de/matchcenter/spiele/'+g.objectId}));
 const value={ok:true,team:key,checkedAt:new Date().toISOString(),games};recentServerCache.set(key,{at:Date.now(),value});return value;
}

const duelQuery='query($clubId:Int,$seasonId:Int){games(clubId:$clubId,seasonId:$seasonId){objectId isLive seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName}}';
const duelServerCache=new Map();
export function parseDirectDuels(batches,home,away,now=Date.now()){
 const norm=n=>String(n||'').replace(/^TSV /,'');const pair=[home,away].map(norm).sort().join('|');const found=new Map();
 for(const {season,data} of batches){if(!Array.isArray(data?.games))throw Error('Missing duel history');for(const g of data.games){if(g.seasonId!==season||g.leagueShortName!=='QHL'||g.isLive===true||Date.parse(g.gameDateTime)>=now||!Number.isFinite(Date.parse(g.gameDateTime))||[g.homeTeamName,g.awayTeamName].map(norm).sort().join('|')!==pair||!Number.isInteger(g.objectId)||![g.homeTeamScore,g.awayTeamScore].every(v=>Number.isInteger(v)&&v>=0)||g.homeTeamScore+g.awayTeamScore===0)continue;found.set(g.objectId,{id:String(g.objectId),date:g.gameDateTime.slice(0,10),home:g.homeTeamName,away:g.awayTeamName,score:[g.homeTeamScore,g.awayTeamScore],externalUrl:'https://www.handball.ch/de/matchcenter/spiele/'+g.objectId});}}
 return [...found.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
}
export async function getHeadToHead(home,away){
 if(typeof home!=='string'||typeof away!=='string'||home.length>100||away.length>100||![home,away].includes('Kadetten Schaffhausen')||home===away)throw Error('Invalid teams');
 const key=[home,away].sort().join('|'),cached=duelServerCache.get(key);if(cached&&Date.now()-cached.at<300000)return cached.value;
 const current=await liveQuery(liveGamesQuery,{teamId:41473});if(!Array.isArray(current.games))throw Error('Missing current teams');const opponent=home==='Kadetten Schaffhausen'?away:home,norm=n=>String(n||'').replace(/^TSV /,'');
 if(!current.games.some(g=>g.seasonId===2026&&g.leagueShortName==='QHL'&&[g.homeTeamName,g.awayTeamName].some(n=>norm(n)===norm(opponent))))throw Error('Opponent not in QHL schedule');
 const old=await Promise.all([2025,2024].map(async season=>({season,data:await liveQuery(duelQuery,{clubId:140561,seasonId:season})})));
 const games=parseDirectDuels([{season:2026,data:current},...old],home,away);const value={ok:true,checkedAt:new Date().toISOString(),games};duelServerCache.set(key,{at:Date.now(),value});return value;
}

// Optional statistics never prevent the current score from being delivered.
const liveStatsQuery = 'query($gameId:Int,$isLive:Boolean){gameLog(gameId:$gameId,isLive:$isLive){gameId entryId timeInt timeString result actionText homeTeamPlayerStaffName awayTeamPlayerStaffName homeTeamActionLCID awayTeamActionLCID} gamePlayerStats(gameId:$gameId,isLive:$isLive){gameId teamId playerId playerName isHome function totalScore totalScore7m totalShots totalShots7m total2Minutes totalWarnings totalSuspension useReducedResultDisplay}}';
const liveDetailsCache = new Map();
const nonnegative = value => Number.isInteger(value) && value >= 0 ? value : null;
export function parseLiveDetails(data, game) {
 if (!Array.isArray(data?.gameLog) || !Array.isArray(data?.gamePlayerStats)) throw Error('Missing live statistics');
 const events = data.gameLog.map(e => {
  if (e.gameId !== game.gameId || !Number.isInteger(e.entryId) || !Number.isInteger(e.timeInt) || e.timeInt < 0 || typeof e.actionText !== 'string') throw Error('Invalid live event');
  const score = /^(\d+):(\d+)$/.exec(e.result || '');
  return {id:e.entryId,seconds:e.timeInt,time:e.timeString||null,score:score?[Number(score[1]),Number(score[2])]:null,action:e.actionText,homePlayer:e.homeTeamPlayerStaffName||null,awayPlayer:e.awayTeamPlayerStaffName||null,homeAction:e.homeTeamActionLCID||null,awayAction:e.awayTeamActionLCID||null};
 }).sort((a,b)=>b.seconds-a.seconds||b.id-a.id);
 const players = data.gamePlayerStats.filter(p=>p.useReducedResultDisplay!==true && p.playerId<10000000).map(p=>{
  if(p.gameId!==game.gameId || ![game.homeTeamId,game.awayTeamId].includes(p.teamId) || !Number.isInteger(p.playerId) || !p.playerName || ![0,1].includes(p.isHome) || (p.isHome===1)!==(p.teamId===game.homeTeamId)) throw Error('Invalid live player');
  return {id:p.playerId,home:p.isHome===1,name:p.playerName,goals:nonnegative(p.totalScore),shots:nonnegative(p.totalShots),seven:nonnegative(p.totalScore7m),sevenShots:nonnegative(p.totalShots7m),twoMinutes:nonnegative(p.total2Minutes),yellow:nonnegative(p.totalWarnings),red:nonnegative(p.totalSuspension)};
 });
 return {events,players};
}
async function getNationalLiveDetails(game) {
 try {
  const data=await liveQuery(liveStatsQuery,{gameId:game.gameId,isLive:game.isLive});
  const value={...parseLiveDetails(data,game),ok:true,updatedAt:new Date().toISOString()};
  // Only retain this match, never reuse statistics for the next opponent.
  liveDetailsCache.clear();liveDetailsCache.set(game.gameId,value);return value;
 } catch {
  const previous=liveDetailsCache.get(game.gameId);
  return previous?{...previous,ok:false}:{ok:false,updatedAt:null,events:null,players:null};
 }
}


// Archived reports use the final SHV feed, independent of the matchday clock.
const reportQuery = liveStatsQuery.replace('totalSuspension useReducedResultDisplay', 'totalSuspension totalSaves totalShotsGK useReducedResultDisplay');
const reportTeamQuery = 'query($gameId:Int){gameTeamStats(gameId:$gameId){gameId teamId turnovers totalShots totalScore totalSaves throwPercentage savePercentage isHome}}';
const reportId = id => ({staefa:508373,stgallen:508367})[id] || (/^[1-9][0-9]{0,8}$/.test(String(id)) ? Number(id) : null);
const reportNumber = v => typeof v === 'string' && /^\d+$/.test(v) ? nonnegative(Number(v)) : nonnegative(v);
export function parseArchivedReport(data, game) {
 const match = parseFinishedMatch(game);
 if (!match || game.leagueShortName !== 'QHL') throw Error('Not a completed Kadetten QHL game');
 const details = parseLiveDetails(data, game);
 if (!Array.isArray(data.gameTeamStats) || data.gameTeamStats.length !== 2) throw Error('Missing team statistics');
 const total = (list,key) => list.length && list.every(p=>nonnegative(p[key])!==null) ? list.reduce((n,p)=>n+p[key],0) : null;
 const teams = [game.homeTeamId,game.awayTeamId].map((id,i) => {
  const t=data.gameTeamStats.find(t=>t.teamId===id);
  if (!t || t.gameId!==game.gameId || t.isHome!==(i===0) || t.totalScore!==match.score[i]) throw Error('Team statistics mismatch');
  const all=data.gamePlayerStats.filter(p=>p.teamId===id && p.useReducedResultDisplay!==true);
  if (!all.length) throw Error('Missing team roster');
  const players=details.players.filter(p=>p.home===(i===0)).map(p=>{
   const raw=all.find(x=>x.playerId===p.id),saves=reportNumber(raw.totalSaves),keeperShots=reportNumber(raw.totalShotsGK);
   return {id:p.id,name:p.name,keeper:saves!==null||keeperShots!==null,goals:p.goals,shots:p.shots,seven:p.seven,sevenShots:p.sevenShots,warnings:p.yellow,twoMinutes:p.twoMinutes,redCards:p.red,saves,keeperShots,sevenSaves:null};
  });
  if (!players.length) throw Error('Missing public player statistics');
  return {id,name:i===0?match.home:match.away,players,shots:nonnegative(t.totalShots),saves:nonnegative(t.totalSaves),turnovers:nonnegative(t.turnovers),throwPercentage:nonnegative(t.throwPercentage),savePercentage:nonnegative(t.savePercentage),seven:total(all,'totalScore7m'),sevenShots:total(all,'totalShots7m'),twoMinutes:total(all,'total2Minutes'),warnings:total(all,'totalWarnings'),timeouts:details.events.length?details.events.filter(e=>(i===0?e.homeAction:e.awayAction)==='bTO').length:null};
 });
 return {gameId:game.gameId,score:match.score,half:match.half||[null,null],date:match.date,teams,events:details.events,spectators:null,referees:[],source:match.url,checkedAt:new Date().toISOString()};
}
async function fetchArchivedReport(id) {
 const d=await liveQuery(liveDetailQuery,{gameId:id,isLive:false});
 const game=Array.isArray(d.game)&&d.game.length===1&&d.game[0].gameId===id?d.game[0]:null;
 if (!parseFinishedMatch(game) || game.leagueShortName!=='QHL') throw Error('Report outside completed Kadetten QHL schedule');
 const [details,teams]=await Promise.all([liveQuery(reportQuery,{gameId:id,isLive:false}),liveQuery(reportTeamQuery,{gameId:id})]);
 return parseArchivedReport({...details,...teams},game);
}
export async function getArchivedReport(id,bucket) {
 const gameId=reportId(id);if (!gameId) throw Error('Invalid report ID');
 const stored=await bucket.get('kadetten/reports/'+gameId+'.json');
 if (stored) return {ok:true,stored:true,report:await stored.json()};
 // Public reads are read-only. Only the authorized refresh stores reports.
 return {ok:true,stored:false,report:await fetchArchivedReport(gameId)};
}
export async function archiveCompletedReports(bucket) {
 try {
  const data=await liveQuery(liveGamesQuery,{teamId:41473});
  if (!Array.isArray(data.games)) throw Error('Missing report schedule');
  const completed=data.games.filter(g=>g.leagueShortName==='QHL'&&parseFinishedMatch({...g,gameId:g.objectId})).sort((a,b)=>String(b.gameDateTime).localeCompare(String(a.gameDateTime)));
  const results=await Promise.all(completed.map(async(g,i)=>{
   const key='kadetten/reports/'+g.objectId+'.json';
   try {
    const prior=await bucket.get(key);
    // Refresh the latest final report for corrections; older archives remain durable.
    if(prior&&i>0)return {id:g.objectId,ok:true,stored:true};
    const report=await fetchArchivedReport(g.objectId);
    await bucket.put(key,JSON.stringify(report));return {id:g.objectId,ok:true,stored:true};
   } catch { return {id:g.objectId,ok:false}; }
  }));
  return {ok:results.every(r=>r.ok),reports:results};
 } catch {return {ok:false,reports:[]};}
}
