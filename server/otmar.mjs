import {getArchivedReport} from './live.mjs';
import {shvEndpoint} from './shv.mjs';

export const OTMAR_TEAM_ID = 40900;
const clubOrigin = 'https://otmar.ch';
const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const plain = s => String(s ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const count = n => Number.isInteger(n) && n >= 0;
const nameKey = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/da silva /g,'').replace(/[^a-z]/g,'');
const safeImage = s => {const u = new URL(s || '/',clubOrigin); if(u.protocol !== 'https:' || !['otmar.ch','data.otmar.ch'].includes(u.hostname))throw Error('Unexpected Otmar image'); return u.href;};

// Read the public server-rendered Nuxt payload, never execute the site's scripts.
export function decodeOtmarPage(html) {
  const raw = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!raw || raw.length > 4000000)throw Error('Otmar page payload unavailable');
  const values = JSON.parse(raw), memo = new Map();
  if(!Array.isArray(values))throw Error('Otmar payload changed');
  function read(i, depth = 0) {
    if(depth > 100)throw Error('Otmar payload too deep');
    if(i < 0)return null;
    if(!Number.isInteger(i) || i >= values.length)throw Error('Invalid payload reference');
    if(memo.has(i))return memo.get(i);
    const v = values[i];
    if(Array.isArray(v)) {
      if(typeof v[0] === 'string') {
        if(['ShallowReactive','Reactive','Ref','ShallowRef'].includes(v[0]))return read(v[1],depth+1);
        return null; // Sets, dates and other state types are not content.
      }
      const out=[];memo.set(i,out);for(const ref of v)out.push(read(ref,depth+1));return out;
    }
    if(v && typeof v === 'object') {
      const out=Object.create(null);memo.set(i,out);
      for(const [key,ref] of Object.entries(v)) {if(['__proto__','constructor','prototype'].includes(key))continue;out[key]=read(ref,depth+1);}
      return out;
    }
    return v;
  }
  const data=read(0)?.data;
  if(!data || typeof data!=='object')throw Error('Missing Otmar page data');return data;
}
export const otmarEntry = data => Object.values(data).find(v=>v && typeof v==='object' && v.page);
const months = ['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sept.','Okt.','Nov.','Dez.'];
function newsDate(text) {
  const m=String(text).match(/(\d{1,2})\s+([^ ]+)\s+(202\d)/), month=m?months.indexOf(m[2]):-1;
  if(month<0)throw Error('Invalid Otmar news date');return `${m[1].padStart(2,'0')}.${String(month+1).padStart(2,'0')}.${m[3]}`;
}
export function parseOtmarNews(html) {
  const data=decodeOtmarPage(html), entry=otmarEntry(data);
  const blocks=entry?.data?.data?.content || [];
  const news=entry?.page?.news || data['news-overview-1']?.items || blocks.flatMap(b=>b.props?.data?.news || b.props?.data?.items || []).filter(n=>n.path?.startsWith('/aktuelles/'));
  if(!Array.isArray(news) || news.length<3)throw Error('Incomplete Otmar news');
  return news.filter(n=>n.path?.startsWith('/aktuelles/')).map(n=>{
    if(!/^\/aktuelles\/[a-z0-9-]+$/.test(n.path))throw Error('Invalid Otmar article URL');
    const slug=n.path.split('/').at(-1), image=safeImage(n.image?.src);
    // Stable, bounded IDs; long slugs remain in the URL, not in the route identifier.
    const id='otmar-'+(image.match(/\/(\d{5,})\//)?.[1] || slug.slice(0,65));
    return {id,title:esc(n.title),date:newsDate(n.info),image,url:clubOrigin+n.path,text:esc(plain(n.teaser || n.text || ''))};
  });
}
export function parseOtmarRoster(html) {
  const entry=otmarEntry(decodeOtmarPage(html));
  if(!/2026\/27/.test(entry?.page?.pageTitle || ''))throw Error('Unexpected Otmar roster season');
  const list=(entry?.data?.data?.content || []).filter(b=>b.name==='PlayerCards').flatMap(b=>b.props?.data?.players || []).filter(p=>/^\d+$/.test(p.playerNumber || '') && p.role==='Spieler 1. Mannschaft');
  if(list.length<15 || new Set(list.map(p=>p.playerNumber)).size!==list.length)throw Error('Incomplete Otmar roster');
  return list.map(p=>({number:Number(p.playerNumber),name:esc(p.firstName+' '+p.lastName),position:esc(p.factFieldPosition || 'Position nicht verfügbar'),image:safeImage(p.image.src),url:clubOrigin+'/1-mannschaft/team',facts:[['Geburtsjahr',p.factAgeYear],['Grösse',p.factHeight?`${p.factHeight} cm`:null],['Nationalität',p.nationality],['Wurfhand',p.factThrowingArm==='right'?'Rechts':p.factThrowingArm==='left'?'Links':null],['Bei St. Otmar seit',plain(p.table).match(/Bei St\.Otmar seit (\d{4})/)?.[1]]].filter(([,v])=>v!==null && v!==undefined && v!=='').map(([k,v])=>[k,esc(v)])}));
}
export const otmarShvQuery = 'query($teamId:Int){games(teamId:$teamId){objectId seasonId gameStatusId isLive gameDateTime homeTeamId homeTeamName homeTeamScore awayTeamId awayTeamName awayTeamScore leagueShortName} teamDashboard(teamId:$teamId){teamId name seasonId seasonName leagueName gamesTotal totalScoreTeam} playerStaff(teamId:$teamId){useReducedResultDisplay player{playerId teamId firstName lastName games totalScore totalScoreField totalScore7m scorePerGame totalYellowCards total2Minutes totalSuspension useReducedResultDisplay}}}';
export function parseOtmarShv(response, roster, previousGames=[], teamImage='') {
  const d=response?.data, team=d?.teamDashboard?.[0], staff=d?.playerStaff?.[0];
  if(response?.errors?.length || team?.teamId!==OTMAR_TEAM_ID || team.seasonId!==2026 || team.seasonName!=='2026/27' || team.name!=='TSV St. Otmar St. Gallen' || team.leagueName!=='Männer QHL' || !Array.isArray(d.games) || !Array.isArray(staff?.player) || staff.useReducedResultDisplay===true)throw Error('Otmar SHV scope mismatch');
  const games=d.games.filter(g=>g.seasonId===2026 && [g.homeTeamId,g.awayTeamId].includes(OTMAR_TEAM_ID)).map(g=>{
    if(!Number.isInteger(g.objectId)||!/^202[67]-\d\d-\d\dT\d\d:\d\d/.test(g.gameDateTime)||!g.homeTeamName||!g.awayTeamName)throw Error('Invalid Otmar fixture');
    const old=previousGames.find(x=>x.id===String(g.objectId)), item={id:String(g.objectId),date:g.gameDateTime.slice(0,10),time:g.gameDateTime.slice(11,16),home:esc(g.homeTeamName),away:esc(g.awayTeamName),league:esc(g.leagueShortName || 'Testspiel'),venue:old?.venue || '',image:teamImage,url:'https://www.handball.ch/de/matchcenter/spiele/'+g.objectId};
    if(g.gameStatusId===2 && g.isLive===false) {if(![g.homeTeamScore,g.awayTeamScore].every(count))throw Error('Missing final scores');item.score=[g.homeTeamScore,g.awayTeamScore];}
    return item;
  }).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if(games.length<18 || new Set(games.map(g=>g.id)).size!==games.length)throw Error('Incomplete Otmar schedule');
  const players={};let total=0;const seen=new Set();
  for(const p of staff.player) {
    if(p.teamId!==OTMAR_TEAM_ID || p.useReducedResultDisplay===true || seen.has(p.playerId))throw Error('Invalid Otmar player scope');seen.add(p.playerId);
    for(const k of ['games','totalScore','totalScoreField','totalScore7m','totalYellowCards','total2Minutes','totalSuspension'])if(!count(p[k]))throw Error('Missing SHV metric');
    if(p.totalScoreField+p.totalScore7m!==p.totalScore)throw Error('Otmar totals mismatch');total+=p.totalScore;
    const member=roster.find(r=>nameKey(r.name)===nameKey(p.firstName+' '+p.lastName));
    if(!member)continue;
    players[member.number]={shvPlayerId:p.playerId,games:p.games,goals:p.totalScore,fieldGoals:p.totalScoreField,sevenMeterGoals:p.totalScore7m,goalsPerGame:p.games?Math.round(p.totalScore/p.games*10)/10:null,yellowCards:p.totalYellowCards,twoMinutes:p.total2Minutes,disqualifications:p.totalSuspension};
  }
  if(!count(team.gamesTotal)||!count(team.totalScoreTeam)||Object.keys(players).length<15)throw Error('Incomplete Otmar scoring totals');
  return {games,shvRoster:players,playerSeason:{season:'2026/27',competition:'QHL',teamId:OTMAR_TEAM_ID,teamGames:team.gamesTotal,players:{},source:'https://www.handball.ch/de/matchcenter/teams/40900'}};
}
async function page(path,fetchFn) {const r=await fetchFn(clubOrigin+path,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Otmar HTTP '+r.status);return r.text();}
export async function refreshOtmar(previous,{fetchFn=fetch,qhlSnapshot=null,reportLoader=id=>getArchivedReport(id,{get:async()=>null},'otmar')}={}) {
  const next=structuredClone(previous);next.checkedAt=new Date().toISOString();next.status={...previous.status};
  const run=async(key,fn)=>{try{await fn();next.status[key]={ok:true,updatedAt:next.checkedAt};}catch(e){next.status[key]={...previous.status?.[key],ok:false,error:String(e.message).slice(0,160)};}};
  await Promise.all([
    run('news',async()=>{const imported=(await Promise.all(['/', '/aktuelles'].map(path=>page(path,fetchFn)))).flatMap(parseOtmarNews);const merged=new Map(previous.stories.map(n=>[n.url,n]));for(const n of imported)merged.set(n.url,n);next.stories=[...merged.values()].sort((a,b)=>a.date.split('.').reverse().join('').localeCompare(b.date.split('.').reverse().join(''))).reverse();}),
    run('players',async()=>{const html=await page('/1-mannschaft/team',fetchFn);next.roster=parseOtmarRoster(html);next.teamImage=safeImage(otmarEntry(decodeOtmarPage(html)).page.headerMedia[0].url);}),
    run('table',async()=>{if(!qhlSnapshot?.tables?.QHL?.length || qhlSnapshot.status?.table?.ok===false)throw Error('QHL table unavailable');next.tables={QHL:qhlSnapshot.tables.QHL,EHL:[]};next.teamRecords=qhlSnapshot.teamRecords;next.clubLogos={...qhlSnapshot.clubLogos,'TSV St. Otmar St. Gallen':'assets/club-140684.webp','St. Otmar St. Gallen':'assets/club-140684.webp'};})
  ]);
  await run('games',async()=>{
    const r=await fetchFn(shvEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'de'},body:JSON.stringify({query:otmarShvQuery,variables:{teamId:OTMAR_TEAM_ID}}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('SHV HTTP '+r.status);
    const parsed=parseOtmarShv(await r.json(),next.roster,previous.games,next.teamImage);
    Object.assign(next,parsed,{playerSeason:previous.playerSeason || parsed.playerSeason});next.qhlTeamGames=parsed.playerSeason.teamGames;
  });
  // Published venue names from the club's calendar, matched by date and both teams.
  await run('venues',async()=>{
    const data=decodeOtmarPage(await page('/1-mannschaft/saison',fetchFn));
    for(const g of next.games) {
      const item=(data['gamePlan-40900']?.months || []).flatMap(m=>m.games || []).find(x=>x.calendarEvent?.start?.slice(0,10)===g.date && nameKey(x.structuredData?.homeTeam?.name)===nameKey(g.home) && nameKey(x.structuredData?.awayTeam?.name)===nameKey(g.away));
      if(item?.location?.title)g.venue=esc(item.location.title+', '+item.location.location);
    }
  });
  await run('playerSeason',async()=>{
    const fixtures=next.games.filter(g=>g.league==='QHL' && g.score);
    const reports=[];
    for(let i=0;i<fixtures.length;i+=3)reports.push(...await Promise.all(fixtures.slice(i,i+3).map(async g=>(await reportLoader(g.id)).report)));
    next.playerSeason=aggregateOtmarSeason(reports,next.roster,next.shvRoster,next.qhlTeamGames);
  });
  return next;
}
export function aggregateOtmarSeason(reports,roster,shvRoster,teamGames) {
  if(reports.some(r=>!r?.teams?.some(t=>t.id===OTMAR_TEAM_ID && Array.isArray(t.players))))throw Error('Invalid Otmar report scope');
  if(!reports.length || reports.length!==teamGames || new Set(reports.map(r=>r.gameId)).size!==reports.length)throw Error('Incomplete QHL season reports');
  const players={};
  for(const member of roster) {
    const id=shvRoster[member.number]?.shvPlayerId;if(!id)continue;
    const rows=reports.map(r=>r.teams.find(t=>t.id===OTMAR_TEAM_ID)?.players.find(p=>p.id===id)).filter(Boolean);
    if(!rows.length)continue;
    const sum=key=>rows.every(p=>count(p[key]))?rows.reduce((n,p)=>n+p[key],0):null;
    const goals=sum('goals'),seven=sum('seven');
    players[member.number]={shvPlayerId:id,games:rows.length,goals,fieldGoals:goals!==null&&seven!==null?goals-seven:null,sevenMeterGoals:seven,goalsPerGame:goals!==null?Math.round(goals/rows.length*10)/10:null,yellowCards:sum('warnings'),twoMinutes:sum('twoMinutes'),disqualifications:sum('redCards')};
  }
  return {season:'2026/27',competition:'QHL',teamId:OTMAR_TEAM_ID,teamGames,players,source:'https://www.handball.ch/de/matchcenter/teams/40900',basis:'Bestätigte QHL-Spielberichte'};
}
export async function storeOtmarUpdate(bucket,seed,qhlSnapshot) {
  const saved=await bucket.get('otmar/current.json'), previous=saved?await saved.json():seed;
  const next=await refreshOtmar(previous,{qhlSnapshot,reportLoader:id=>getArchivedReport(id,bucket,'otmar')});
  if(Object.values(next.status).some(s=>s.ok)) {if(saved)await bucket.put('otmar/previous.json',JSON.stringify(previous));await bucket.put('otmar/current.json',JSON.stringify(next));}
  return {status:next.status,games:next.games.length,news:next.stories.length,players:next.roster.length};
}
export async function getOtmarArticle(story,fetchFn=fetch) {
  const url=new URL(story.url);if(url.origin!==clubOrigin || !/^\/aktuelles\/[a-z0-9-]+$/.test(url.pathname))throw Error('Invalid Otmar article');
  const entry=otmarEntry(decodeOtmarPage(await page(url.pathname,fetchFn)));
  const blocks=entry?.content || entry?.data?.data?.content || [];
  const pieces=[];
  if(entry?.page?.teaserText)pieces.push(entry.page.teaserText);
  if(entry?.page?.pageLeadtext)pieces.push(entry.page.pageLeadtext);
  for(const b of blocks) {
    const outer=b.props?.data, d=outer?.data || outer;
    if(d?.text?.text)pieces.push(d.text.text);
    if(typeof d?.text==='string')pieces.push(d.text);
  }
  const html=pieces.join('\n');if(plain(html).length<100)throw Error('Otmar article content unavailable');
  return {id:story.id,html,url:story.url};
}
