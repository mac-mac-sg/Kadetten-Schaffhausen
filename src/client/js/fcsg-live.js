/* Live-Daten sind flüchtig und getrennt von bestätigten Saisonresultaten. */
const fcsgLiveGames = new Map();
const fcsgLiveChecks = new Map();
const fcsgLiveErrors = new Set();
let fcsgLiveBusy = false;
const fcsgLiveAttempts = new Map();
const fcsgPanelSignatures = new WeakMap();
function updateFcsgPanel(panel, signature, html) {
 if (!panel || panel.contains(document.activeElement) || fcsgPanelSignatures.get(panel) === signature) return false;
 panel.innerHTML=html();fcsgPanelSignatures.set(panel,signature);return true;
}
function fcsgGame(id) { return fcsgLiveGames.get(String(id)) || fcsgData.games.find(g=>g.id===String(id)); }
function fcsgDisplayScore(g) { return g.live ? (g.liveScore?.join(' : ') || '– : –') : g.score?.join(' : ') || 'VS'; }
function fcsgLiveState(g) { return `${g.live?'JETZT LIVE · ':''}${g.phase || (g.score?'Beendet':'Vorschau')}${g.clock?' · '+g.clock:''}`; }
function fcsgLiveNotice(g) {
 const time=fcsgLiveChecks.get(g.id),failed=fcsgLiveErrors.has(g.id),stale=time&&Date.now()-Date.parse(time)>120000;
 return `<p class="fcsg-live-notice ${failed||stale?'is-stale':''}">${failed||stale?'Live-Verbindung unterbrochen. Letzter verfügbarer Stand bleibt sichtbar. ':''}${time?'Live-Abfrage: '+new Date(time).toLocaleTimeString('de-CH',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' Uhr. ':''}${g.live?'Automatische Aktualisierung alle 45 Sekunden.':'Textmeldungen aus dem offiziellen Matchcenter.'}</p>`;
}
function fcsgTicker(g) {
 const rows=g.ticker||[];
 return `${fcsgLiveNotice(g)}<h2>${g.live?'Liveticker':'Ticker zum Spiel'}</h2>${rows.length?`<ol class="fcsg-ticker">${rows.map(e=>`<li data-ticker-id="${liveEscape(e.id)}"><span class="fcsg-ticker-minute">${e.minute===null?'•':liveEscape(e.minute)+'′'}</span><div>${e.title?`<h3>${liveEscape(e.title)}</h3>`:''}${sanitiseArticle(e.html||'',g.url)}${e.url?ext(e.url,e.label||'Mehr erfahren','news-link'):''}</div></li>`).join('')}</ol>`:`<p class="notice">${fcsgLiveErrors.has(g.id)?'Ticker derzeit nicht verfügbar.':'Noch keine Textmeldungen veröffentlicht.'}</p>`}`;
}
function updateFcsgLiveView() {
 if(activeClub!=='fcsg')return;
 const slot=document.querySelector('.fcsg-matchday');
 if(slot){const template=document.createElement('template');template.innerHTML=fcsgMatchday();const next=template.content.querySelector('.fcsg-matchday');if(next){slot.innerHTML=next.innerHTML;slot.className=next.className;slot.href=next.href;slot.dataset.pulse=next.dataset.pulse;updateFcsgPulse();}}
 const [page,id]=location.hash.slice(1).split('/');
 if(page==='match'){
  const g=fcsgGame(id);if(!g)return;
  if(!document.querySelector('[data-fcsg-game]')){render();return;}
  document.querySelectorAll('[data-fcsg-score]').forEach(e=>{if(e.dataset.fcsgScore===id)e.textContent=fcsgDisplayScore(g)});
  document.querySelectorAll('[data-fcsg-phase]').forEach(e=>{if(e.dataset.fcsgPhase===id)e.textContent=fcsgLiveState(g)});
  const panel=document.getElementById('fcsg-live-panel');if(panel&&!panel.contains(document.activeElement))panel.innerHTML=fcsgTicker(g);
  const overview=document.getElementById('fcsg-overview');
  if(overview){const signature=JSON.stringify(g.score||g.live?['events',g.events]:['preview',g.home,g.away,g.date,g.time,g.confirmed,g.venue,g.tickets]);
   if(!fcsgPanelSignatures.has(overview))fcsgPanelSignatures.set(overview,overview.dataset.signature);
   if(updateFcsgPanel(overview,signature,()=>fcsgOverview(g)))loadMatchPreview();}
  const stats=document.getElementById('fcsg-team-stats');updateFcsgPanel(stats,JSON.stringify([g.homeStats,g.awayStats]),()=>fcsgTeamStats(g));
  const lineup=document.getElementById('fcsg-lineups');updateFcsgPanel(lineup,JSON.stringify([g.homeLineup,g.awayLineup]),()=>fcsgLineups(g));
 }
 document.querySelectorAll('.games [data-fcsg-game]').forEach(card=>{const g=fcsgGame(card.dataset.fcsgGame);if(!g)return;const score=card.querySelector('[data-fcsg-score]');if(score)score.textContent=fcsgDisplayScore(g);const phase=card.querySelector('[data-fcsg-phase]');if(phase)phase.textContent=fcsgLiveState(g);const link=card.querySelector('.actions a');if(link)link.textContent=g.live?'Live verfolgen':g.score?'Rückblick':'Vorschau';card.classList.toggle('fcsg-game-live',!!g.live);});
}
async function loadFcsgLive(force=false) {
 if(activeClub!=='fcsg'||document.hidden||fcsgLiveBusy)return;
 const [page,id]=location.hash.slice(1).split('/'),detail=page==='match';
 if(!detail&&!['home','season',''].includes(page))return;
 if(page==='season'&&id!=='games')return;
 if(detail&&!/^[1-9][0-9]{0,8}$/.test(id))return;
 const key=detail?id:'latest',game=detail?fcsgGame(id):fcsgFixture();
 const interval=game?.live?45000:game?.score?1800000:300000;
 const last=fcsgLiveAttempts.get(key);if(last&&Date.now()-last<(force?interval:20000))return;
 fcsgLiveAttempts.set(key,Date.now());
 fcsgLiveBusy=true;
 try{
  const r=await apiFetch(detail?'/api/fcsg/matches/'+id:'/api/fcsg/live',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error();const d=await r.json();if(!d.ok||!d.checkedAt||(d.match&&(typeof d.match.id!=='string'||!d.match.home||!d.match.away))||(detail&&d.match?.id!==id))throw Error();
  fcsgLiveChecks.set(key,d.checkedAt);
  if(d.match){fcsgLiveGames.set(d.match.id,d.match);fcsgLiveChecks.set(d.match.id,d.checkedAt);fcsgLiveErrors.delete(d.match.id);if(fcsgLiveGames.size>15){const first=fcsgLiveGames.keys().next().value;fcsgLiveGames.delete(first);fcsgLiveChecks.delete(first);}}
  else for(const [gid,g] of fcsgLiveGames)if(g.live){fcsgLiveGames.delete(gid);}
  fcsgLiveErrors.delete(key);updateFcsgLiveView();
 }catch{fcsgLiveErrors.add(key);if(!detail){const g=fcsgFixture();if(g&&(g.live||g.date===swissToday()))fcsgLiveErrors.add(g.id);}updateFcsgLiveView();}
 finally{fcsgLiveBusy=false;}
}
setInterval(()=>loadFcsgLive(true),45000);

function fcsgPulsePhase(g) {
 return matchPulsePhase(g ? {...g,time:g.confirmed?g.time:''} : null,!!g?.live);
}
function updateFcsgPulse() {
 if(activeClub!=='fcsg')return;
 const slot=document.querySelector('.fcsg-matchday'),g=fcsgFixture();
 if(!slot||!g)return;
 const phase=fcsgPulsePhase(g);
 if(slot.dataset.pulse!==phase)slot.dataset.pulse=phase;
 slot.classList.toggle('pulse-paused',document.hidden);
 slot.classList.toggle('is-matchday',!!g.live||(!g.score&&g.date===swissToday()));
}
setInterval(()=>{if(!document.hidden)updateFcsgPulse();},1000);
document.addEventListener('visibilitychange',updateFcsgPulse);
