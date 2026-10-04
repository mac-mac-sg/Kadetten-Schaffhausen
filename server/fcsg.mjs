// Official FCSG public website API; no account or access token required.
export const FCSG_SOURCE='https://fcsg-api-cdn.b-cdn.net/api/v1/';
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const integer=v=>v!==null&&v!==undefined&&v!==''&&Number.isInteger(Number(v))&&Number(v)>=0?Number(v):null;
const https=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
const translation=a=>a?.translations?.find(t=>t.locale==='de_CH')||a?.translations?.find(t=>t.locale?.startsWith('de'))||a?.translations?.[0]||a;
function array(d){if(!Array.isArray(d?.data)||!d.data.length)throw Error('Empty FCSG source');return d.data}
export function parseFcsgGames(d){
 const games=array(d).filter(g=>g.soccerLeague?.soccerSeason?.name==='2026/2027'&&(g.homeClub?.id===12||g.guestClub?.id===12)).map(g=>{
  if(!/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(g.date)||!integer(g.id)||!g.homeClub?.name||!g.guestClub?.name)throw Error('Invalid FCSG fixture');
  const score=[integer(g.extraTimeHome??g.regularTimeHome),integer(g.extraTimeGuest??g.regularTimeGuest)];
  const finished=g.status==='FINISHED';
  if(finished&&score.includes(null))throw Error('Final score missing');
  const half=[integer(g.halfTimeHome),integer(g.halfTimeGuest)];
  const detail=g.soccerMatchDetail;
  const normalLineup=x=>x?{formation:x.formation,players:(x.lineupPlayers||[]).map(p=>({name:[p.firstName,p.lastName].filter(Boolean).join(' '),number:integer(p.shirtNumber),bench:!!p.isBenched,position:p.position,image:https(p.image)}))}:null;
  const stats=x=>x?Object.fromEntries(['goals','saves','possessionPercentage','totalScoringAtt','onTargetScoringAtt','wonCorners','totalOffside','fkFoulLost','totalYellowCard','secondYellow','totalRedCard','totalPass'].map(k=>[k,x[k]===null||x[k]===undefined?null:Number(x[k])])):null;
  const events=[...(detail?.goalEvents||[]).filter(e=>!e.isCancelled).map(e=>({type:e.type==='OG'?'Eigentor':'Tor',minute:e.goalTimeMin,player:e.scorerName,home:e.isHomeClub,score:[integer(e.homeScore),integer(e.guestScore)],ownGoal:e.type==='OG'||e.detailedGoalType==='OG'})),...(detail?.cardEvents||[]).filter(e=>!e.isCancelled).map(e=>({type:e.type==='YC'?'Gelb':e.type==='Y2C'?'Gelb-Rot':e.type==='RC'?'Rot':e.type,minute:e.cardTimeMin,player:e.playerName,home:e.isHomeClub}))].sort((a,b)=>parseFloat(a.minute)-parseFloat(b.minute));
  return {id:String(g.id),date:g.date.slice(0,10),time:g.date.slice(11,16),confirmed:g.isConfirmed===true,home:g.homeClub.name,away:g.guestClub.name,homeLogo:https(g.homeClub.logo),awayLogo:https(g.guestClub.logo),league:translation(g.soccerLeague).name,leagueId:g.soccerLeague.id,venue:g.arenaName||'Spielort noch offen',image:https(g.arenaImage),url:'https://www.fcsg.ch/pages/match-center/'+g.id,tickets:https(g.ticketsUrl),status:g.status,score:finished?score:null,half:finished&&!half.includes(null)?half:null,homeStats:stats(detail?.homeSoccerMatchStatistic),awayStats:stats(detail?.guestSoccerMatchStatistic),events,eventsAvailable:!!detail&&(detail.goalEvents||[]).filter(e=>!e.isCancelled).length===score.reduce((a,b)=>a+(b||0),0)&&finished,homeLineup:normalLineup(detail?.homeSoccerLineup),awayLineup:normalLineup(detail?.guestSoccerLineup)};
 });
 if(games.length<20||new Set(games.map(g=>g.id)).size!==games.length)throw Error('Incomplete FCSG fixtures');
 return games.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
export function parseFcsgTable(d){
 const rows=d?.data?.soccerMatchTableRows;
 if(!Array.isArray(rows)||rows.length!==12)throw Error('Invalid FCSG standings');
 return rows.map(r=>{
  const [played,w,d,l,gf,ga,points]=[r.matchesPlayed,r.matchesWon,r.matchesDrawn,r.matchesLost,r.goalsFor,r.goalsAgainst,r.points].map(integer);
  if([played,w,d,l,gf,ga,points].includes(null)||w+d+l!==played||w*3+d!==points||gf-ga!==r.goalDifference)throw Error('Invalid standings totals');
  return {rank:r.rank,name:r.contestantClubName||r.contestantName,played,w,d,l,gf,ga,points,logo:https(r.logo)};
 }).sort((a,b)=>a.rank-b.rank);
}
export function parseFcsgPlayers(d){
 const players=array(d).filter(p=>p.attributes?.shouldDisplayOnWebsite&&p.attributes.crmTags?.some(t=>t.id===64)&&p.attributes.crmTags?.some(t=>[1,2,3,4].includes(t.id))).map(p=>{
  const a=p.attributes, field=name=>a.customFields?.find(f=>f.name===name&&f.locale==='de_CH')?.value;
  return {id:String(p.id),name:[a.firstName,a.lastName].filter(Boolean).join(' '),firstName:a.firstName,lastName:a.lastName,position:a.position,number:integer(field('Trikotnummer')),birthDate:a.birthDate,image:https(a.gif||a.image),cover:https(a.coverPhoto),since:field('Beim FCSG seit')||null,contract:field('Vertrag bis')||null,url:a.profileUrl?'https://www.fcsg.ch/pages/kader/'+encodeURIComponent(a.profileUrl):'https://www.fcsg.ch/pages/1-mannschaft'};
 });
 if(players.length<20||players.some(p=>!p.name||!p.position))throw Error('Incomplete FCSG roster');return players;
}
function contentMarkup(a){
 let html=translation(a)?.description||a.description||'';
 const rows=a.contentBuilder?.rows||[];
 for(const row of rows)for(const col of row.columns||[])for(const c of col.contentContainer?.contents||[]){
  const d=c.contentData||{},tr=translation(d);
  if(c.type==='HTML'||c.type==='TEXT')html+=tr?.text||d.text||'';
  if(c.type==='ALBUM')for(const image of d.album?.images||[]){const src=https(image.image||image.url||image.path);if(src)html+=`<figure><img src="${escape(src)}" alt="${escape(translation(image)?.name||'Bild aus dem Originalartikel')}"></figure>`;}
  if(c.type==='IMAGE'){const src=https(d.image||d.url);if(src)html+=`<figure><img src="${escape(src)}" alt="Bild aus dem Originalartikel"></figure>`;}
 }
 if(!html.trim())throw Error('FCSG article empty');return html;
}
export function parseFcsgNews(d){
 return array(d).map(p=>{
  const a=p.attributes,t=translation(a),id=String(p.id),title=t?.name||a.name,slug=t?.urlHandle||a.urlHandle;
  if(!/^\d+$/.test(id)||!title||!slug)throw Error('Invalid FCSG news');
  return {id,title,articleVersion:a.updatedAt,date:String(a.publishDate).slice(0,10).split('-').reverse().join('.'),publishedAt:a.publishDate,image:https(a.optimizedListImage||a.optimizedImage||a.image),url:'https://www.fcsg.ch/pages/news/'+encodeURIComponent(slug),html:contentMarkup(a),text:String(t?.excerpt||a.excerpt||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()};
 }).filter(n=>n.image);
}
async function getFcsg(path){const r=await fetch(FCSG_SOURCE+path,{headers:{Accept:'application/vnd.api+json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('FCSG source HTTP '+r.status);return r.json()}
export async function refreshFcsg(previous){
 const next=structuredClone(previous);next.checkedAt=new Date().toISOString();next.status={...previous.status};
 const jobs=[['news','news?page[number]=0&page[size]=30&sort=-publishDate&filter[isActive]=1&filter[excludeTag][]=FCO',parseFcsgNews,'stories'],['games','match-center/soccer-matches?filter[season.name][]=2026/2027&filter[soccerClubId]=12&page[size]=100&page[number]=0&isDetailed=1',parseFcsgGames,'games'],['table','match-center/soccer-matches/live-table/24?followCurrentSeason=1',parseFcsgTable,'table'],['players','b2cs?filter[isActive]=1&filter[crmSort][]=7,64&page[number]=0&filter[isLightVersion]=true&page[size]=100',parseFcsgPlayers,'players']];
 await Promise.all(jobs.map(async([key,path,parse,field])=>{try{next[field]=parse(await getFcsg(path));next.status[key]={ok:true,updatedAt:next.checkedAt}}catch(e){next.status[key]={...previous.status?.[key],ok:false,error:e.message}}}));
 return next;
}
export function publicFcsgData(d){return {...d,stories:d.stories.map(({html,...story})=>story)}};
export async function storeFcsgUpdate(bucket,seed){const saved=await bucket.get('fcsg/current.json');const previous=saved?await saved.json():seed;const next=await refreshFcsg(previous);if(Object.values(next.status).some(s=>s.ok)){await bucket.put('fcsg/current.json',JSON.stringify(next))}return {checkedAt:next.checkedAt,status:next.status,news:next.stories.length,games:next.games.length,players:next.players.length}}
