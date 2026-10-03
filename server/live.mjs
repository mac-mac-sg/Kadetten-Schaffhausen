const liveEndpoint='https://www.handball.ch/Umbraco/Api/MatchCenter/Query';
const liveGamesQuery='query($teamId:Int){games(teamId:$teamId){objectId isLive seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName}}';
const liveDetailQuery='query($gameId:Int,$isLive:Boolean){game(gameId:$gameId,isLive:$isLive){gameId isLive seasonId gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName ltGameTime ltCurrentGamePhaseText}}';
async function liveQuery(query,variables){const r=await fetch(liveEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'de'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Live source unavailable');const d=await r.json();if(d.errors?.length||!d.data)throw Error('Live source schema changed');return d.data}
export function selectLiveGame(data){if(!Array.isArray(data?.games))throw Error('Missing games');return data.games.find(g=>g.isLive===true&&g.seasonId===2026&&(g.homeTeamId===41473||g.awayTeamId===41473))||null}
export function parseLiveMatch(g){if(!g||g.isLive!==true||g.seasonId!==2026||(g.homeTeamId!==41473&&g.awayTeamId!==41473))return null;const id=g.gameId;if(!Number.isInteger(id)||!g.homeTeamName||!g.awayTeamName)throw Error('Invalid live match');const validScore=v=>Number.isInteger(v)&&v>=0;return {id,home:g.homeTeamName,away:g.awayTeamName,score:validScore(g.homeTeamScore)&&validScore(g.awayTeamScore)?[g.homeTeamScore,g.awayTeamScore]:null,league:g.leagueShortName||'Handball',clock:g.ltGameTime||null,phase:g.ltCurrentGamePhaseText||null,url:'https://www.handball.ch/de/matchcenter/spiele/'+id}}
const ehfLiveEndpoint='https://ehfel.eurohandball.com/umbraco/api/livescoreapi/GetLiveScoreMatches/138790';
const ehfKadettenId='uyEpUicNjwv8hCX9B7A3sg';
export function parseEhfLiveMatch(data){
 if(!Array.isArray(data?.days))throw Error('Missing EHF live feed');
 for(const day of data.days){
  if(!Array.isArray(day.liveScoreMatches))throw Error('EHF live schema changed');
  for(const item of day.liveScoreMatches){
   const m=item.match,stats=item.matchStats;
   if(!m||!stats)throw Error('Missing EHF match status');
   if(stats.isLive!==true||m.competitionShortName!=='EHF EL - M'||(m.homeTeam?.id!==ehfKadettenId&&m.guestTeam?.id!==ehfKadettenId))continue;
   const id=m.matchID;if(!/^202711\d{9}$/.test(id))throw Error('Unexpected EHF season');
   const url=new URL(m.url,'https://ehfel.eurohandball.com');
   if(url.origin!=='https://ehfel.eurohandball.com'||!url.pathname.startsWith('/men/2026-27/matches/details/'+id+'/'))throw Error('Unexpected EHF match URL');
   if(!m.homeTeam.name||!m.guestTeam.name)throw Error('Missing EHF teams');
   const valid=v=>Number.isInteger(v)&&v>=0;
   const score=valid(item.homeStats?.totalGoals)&&valid(item.guestStats?.totalGoals)?[item.homeStats.totalGoals,item.guestStats.totalGoals]:null;
   const time=stats.time!==null&&stats.time!==undefined&&stats.time!==''&&stats.time!=='-'?String(stats.time)+'′':null;
   return {id,home:m.homeTeam.name,away:m.guestTeam.name,score,league:'European League',clock:time,phase:typeof stats.phase==='string'?stats.phase:null,url:url.href};
  }
 }
 return null;
}
async function getEhfLiveMatch(){const r=await fetch(ehfLiveEndpoint,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('EHF live source unavailable');return parseEhfLiveMatch(await r.json())}
async function getNationalLiveMatch(){const games=await liveQuery(liveGamesQuery,{teamId:41473});const selected=selectLiveGame(games);if(!selected)return null;if(!Number.isInteger(selected.objectId)||selected.objectId<=0)throw Error('Invalid game ID');const detail=await liveQuery(liveDetailQuery,{gameId:selected.objectId,isLive:true});if(!Array.isArray(detail.game)||detail.game.length!==1||detail.game[0].gameId!==selected.objectId)throw Error('Missing live detail');return parseLiveMatch(detail.game[0])}
let liveCache,livePending;
export async function getLiveMatch(){
 if(liveCache&&Date.now()-liveCache.at<20000)return liveCache.value;if(livePending)return livePending;
 livePending=(async()=>{
  const results=await Promise.allSettled([getNationalLiveMatch(),getEhfLiveMatch()]);
  if(results.every(r=>r.status==='rejected'))throw Error('All live sources unavailable');
  const sources=Object.fromEntries(results.map((r,i)=>[["SHV","EHF"][i],{ok:r.status==='fulfilled'}]));
  const match=results.find(r=>r.status==='fulfilled'&&r.value)?.value||null;
  const value={ok:true,checkedAt:new Date().toISOString(),sources,match};liveCache={at:Date.now(),value};return value;
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
