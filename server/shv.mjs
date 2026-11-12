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
  if(p.games>team.gamesTotal)throw Error(`SHV player totals mismatch: Spieler ${p.playerId} hat ${p.games} Spiele, das Team ${team.gamesTotal}`);
  if(p.totalScoreField+p.totalScore7m!==p.totalScore)throw Error(`SHV player totals mismatch: Spieler ${p.playerId} Feld ${p.totalScoreField} + 7 m ${p.totalScore7m} ≠ Total ${p.totalScore}`);
  total+=p.totalScore;
  const nr=playerNumbers[p.playerId];if(!nr)continue;
  players[nr]={shvPlayerId:p.playerId,games:p.games,goals:p.totalScore,fieldGoals:p.totalScoreField,sevenMeterGoals:p.totalScore7m,goalsPerGame:p.games?Math.round(p.totalScore/p.games*10)/10:null,yellowCards:p.totalYellowCards,twoMinutes:p.total2Minutes,disqualifications:p.totalSuspension};
 }
 if(total!==team.totalScoreTeam||Object.keys(players).length<10)throw Error(`Incomplete SHV scoring totals: Spieler ${total} Tore, Team ${team.totalScoreTeam}, zugeordnet ${Object.keys(players).length}`);
 return {season:'2026/27',competition:'QHL',teamId:41473,teamGames:team.gamesTotal,players,source:'https://www.handball.ch/de/matchcenter/teams/41473'};
}
export async function fetchPlayerSeason(){
 const r=await fetch(shvEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'de'},body:JSON.stringify(shvRequest),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('SHV HTTP '+r.status);return r.json();
}

// QHL-Saisonwerte aus den archivierten SHV-Spielberichten. Die Spielerliste der SHV-Schnittstelle zählt Cup-Spiele mit, die
// Teamwerte nicht; deshalb werden die Werte hier Spiel für Spiel nur aus abgeschlossenen QHL-Spielen summiert.
const ownTeam=r=>r?.teams?.find(t=>t.id===41473);
const count=v=>Number.isInteger(v)&&v>=0;
export function aggregatePlayerSeason(reports,teamGames){
 if(!Number.isInteger(teamGames)||teamGames<1||reports.length!==teamGames||new Set(reports.map(r=>r?.gameId)).size!==reports.length)throw Error(`Incomplete QHL season reports: ${reports.length} Berichte, ${teamGames} Spiele`);
 let teamGoals=0,playerGoals=0;
 for(const r of reports){
  const i=r?.teams?.findIndex(t=>t.id===41473);
  if(!(i>=0)||!Array.isArray(r.teams[i].players)||!Array.isArray(r.score)||!count(r.score[i]))throw Error('Invalid QHL report scope: '+r?.gameId);
  teamGoals+=r.score[i];
 }
 const players={};
 for(const [id,nr] of Object.entries(playerNumbers)){
  const rows=reports.map(r=>ownTeam(r).players.find(p=>p.id===Number(id))).filter(Boolean);
  if(!rows.length)continue; // ohne Einsatz kein Datensatz: die App kennzeichnet fehlende Werte, statt null Einsätze zu behaupten
  const sum=key=>rows.every(p=>count(p[key]))?rows.reduce((n,p)=>n+p[key],0):null;
  const goals=sum('goals'),seven=sum('seven');
  if(goals===null)throw Error('Missing QHL report goals: Spieler '+id);
  playerGoals+=goals;
  players[nr]={shvPlayerId:Number(id),games:rows.length,goals,fieldGoals:seven!==null?goals-seven:null,sevenMeterGoals:seven,goalsPerGame:Math.round(goals/rows.length*10)/10,yellowCards:sum('warnings'),twoMinutes:sum('twoMinutes'),disqualifications:sum('redCards')};
 }
 // Tore von Spielern ausserhalb der Kaderliste zählen für den Abgleich mit dem Teamtotal mit.
 for(const r of reports)for(const p of ownTeam(r).players)if(!playerNumbers[p.id]&&count(p.goals))playerGoals+=p.goals;
 if(playerGoals!==teamGoals)throw Error(`QHL report totals mismatch: Spieler ${playerGoals} Tore, Team ${teamGoals}`);
 return {season:'2026/27',competition:'QHL',teamId:41473,teamGames,players,source:'https://www.handball.ch/de/matchcenter/teams/41473',basis:'Bestätigte QHL-Spielberichte'};
}
