export const shvRequest={"query": "query KadettenSeason($teamId: Int){ teamDashboard(teamId:$teamId){teamId name seasonId seasonName leagueName gamesTotal totalScoreTeam} playerStaff(teamId:$teamId){useReducedResultDisplay player{playerId teamId firstName lastName games totalScore totalScoreField totalScore7m scorePerGame totalYellowCards total2Minutes totalSuspension useReducedResultDisplay}}}", "variables": {"teamId": 41473}};
export const shvEndpoint='https://www.handball.ch/Umbraco/Api/MatchCenter/Query';
const playerNumbers={356818:1,277624:2,312787:3,351556:4,301744:5,341559:6,312183:7,364953:8,261608:9,356211:10,365612:11,322984:14,342985:15,304323:16,336934:18,275870:19,271116:20,356303:21,350355:22};
export function parsePlayerSeason(response){
 const d=response?.data,team=d?.teamDashboard?.[0],staff=d?.playerStaff?.[0];
 if(response?.errors?.length||team?.teamId!==41473||team.seasonId!==2026||team.seasonName!=='2026/27'||team.name!=='Kadetten Schaffhausen'||team.leagueName!=='Männer QHL'||!Array.isArray(staff?.player)||staff.player.length<10||staff.useReducedResultDisplay===true)throw Error('SHV season or team validation failed');
 const nonnegative=v=>Number.isInteger(v)&&v>=0;
 if(!nonnegative(team.gamesTotal)||!nonnegative(team.totalScoreTeam))throw Error('Invalid SHV team totals');
 const players={},seen=new Set();let total=0;
 for(const p of staff.player){
  if(p.teamId!==41473||seen.has(p.playerId)||p.useReducedResultDisplay===true)throw Error('Invalid SHV player scope');seen.add(p.playerId);
  for(const k of ['games','totalScore','totalScoreField','totalScore7m','totalYellowCards','total2Minutes','totalSuspension'])if(!nonnegative(p[k]))throw Error('Missing or invalid SHV metric');
  if(p.games>team.gamesTotal||p.totalScoreField+p.totalScore7m!==p.totalScore)throw Error('SHV player totals mismatch');
  total+=p.totalScore;
  const nr=playerNumbers[p.playerId];if(!nr)continue;
  players[nr]={shvPlayerId:p.playerId,games:p.games,goals:p.totalScore,fieldGoals:p.totalScoreField,sevenMeterGoals:p.totalScore7m,goalsPerGame:p.games?Math.round(p.totalScore/p.games*10)/10:null,yellowCards:p.totalYellowCards,twoMinutes:p.total2Minutes,disqualifications:p.totalSuspension};
 }
 if(total!==team.totalScoreTeam||Object.keys(players).length<10)throw Error('Incomplete SHV scoring totals');
 return {season:'2026/27',competition:'QHL',teamId:41473,teamGames:team.gamesTotal,players,source:'https://www.handball.ch/de/matchcenter/teams/41473'};
}
export async function fetchPlayerSeason(){
 const r=await fetch(shvEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'de'},body:JSON.stringify(shvRequest),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('SHV HTTP '+r.status);return r.json();
}
