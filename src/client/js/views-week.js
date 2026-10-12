/* Gemeinsame Woche: Kalenderdaten bleiben unabhängig von Sommerzeit und aktivem Verein. */
let weekOffset = 0, weekTimer, weekBusy = false, weekWasVisible = false;
const weekLive = new Map(), weekDataFailures = new Set();
function shiftWeekDate(value, days) {
  return new Date(Date.parse(value + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}
function weekStart(today = swissToday(), offset = weekOffset) {
  return shiftWeekDate(today, -((new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7) + offset * 7);
}
function weekVisible() { return mode === 'week' && location.hash === '#season/games'; }
function gameViewToggle() {
  return `<div class="toggle game-view-toggle" aria-label="Spielplanansicht">${[['list','Liste'],['calendar','Kalender'],['week','Meine Woche']].map(([id,label])=>`<button type="button" data-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div>`;
}
function weekNavigation() {
  const start=weekStart(), end=shiftWeekDate(start,6);
  const label=value=>new Date(value+'T12:00:00Z').toLocaleDateString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric'});
  return `<div class="week-navigation"><button type="button" data-week-shift="-1" aria-label="Vorherige Woche">‹</button><h2>${label(start)} – ${label(end)}</h2><button type="button" data-week-shift="1" aria-label="Nächste Woche">›</button></div><button type="button" class="week-today" data-week-today ${weekOffset===0?'disabled':''}>Diese Woche</button>`;
}
function weekFixtures(clubs=selectedClubs) {
  const fixtures=new Map();
  for(const club of clubs) {
    const snapshot=club==='fcsg'?fcsgData:handballSnapshots.get(club);
    const state=weekLive.get(club), current=state?.data?.match || state?.data?.finished;
    const list=(snapshot?.games || []).slice();
    // A newly published live fixture may precede the next season snapshot.
    if(current?.date && !list.some(g=>g.date===current.date&&sameFixture(g,current)))list.push(current);
    for(const base of list) {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(base.date))continue;
      const overlay=current&&base.date===current.date&&sameFixture(base,current)?current:club==='fcsg'?fcsgLiveGames.get(String(base.id)):null;
      const g=overlay?{...base,...overlay,id:base.id}:base;
      const key=(club==='fcsg'?'football':'handball')+'|'+g.date+'|'+teamName(g.home)+'|'+teamName(g.away);
      const entry=fixtures.get(key);
      const reference={club,id:String(base.id)};
      if(entry) {
        entry.references.push(reference);
        if(overlay || (!entry.game.score && g.score)) {entry.game=g;entry.live=!!overlay&&(club==='fcsg'?!!g.live:g.status!=='finished');entry.state=state;}
      } else fixtures.set(key,{game:g,references:[reference],live:!!overlay&&(club==='fcsg'?!!g.live:g.status!=='finished'),state});
    }
  }
  return [...fixtures.values()].sort((a,b)=>(a.game.date+(a.game.confirmed===false?'23:59':a.game.time||'23:59')).localeCompare(b.game.date+(b.game.confirmed===false?'23:59':b.game.time||'23:59'))||a.game.home.localeCompare(b.game.home));
}
function weekCard(entry) {
  const g=entry.game, target=entry.references.find(r=>r.club===activeClub)||entry.references[0];
  const home=teamName(g.home)===teamName(target.club==='fcsg'?'FC St.Gallen 1879':fanClubs[target.club].name);
  const score=entry.live?(g.liveScore||g.score):g.score;
  const validScore=Array.isArray(score)&&score.length===2&&score.every(n=>Number.isInteger(n)&&n>=0);
  const stale=entry.state?.failed || entry.state?.checkedAt&&Date.now()-Date.parse(entry.state.checkedAt)>120000;
  const status=entry.live?'Live'+(g.clock?' · '+g.clock:''):validScore?'Beendet':g.confirmed===false||!g.time?'Anspielzeit offen':g.time+' Uhr';
  const url=new URL(location.href);url.searchParams.set('club',target.club);url.hash='#match/'+encodeURIComponent(target.id)+'/overview';
  return `<a class="week-card ${entry.live?'week-card-live':''}" data-week-club="${target.club}" data-week-match="${liveEscape(target.id)}" href="${liveEscape(url.href)}"><div class="week-clubs">${entry.references.map(r=>`<span class="week-club week-club-${r.club}"><img src="${fanClubs[r.club].logo}" alt="" width="24" height="28">${fanClubs[r.club].short}</span>`).join('')}</div><div class="week-match"><div><p>${liveEscape(g.league)} · ${home?'Heimspiel':'Auswärtsspiel'}</p><h3>${liveEscape(g.home)} <span>gegen</span> ${liveEscape(g.away)}</h3>${g.venue?`<small>${liveEscape(g.venue)}</small>`:''}</div><div class="week-result">${validScore?`<strong>${score.join(' : ')}</strong>`:''}<span>${liveEscape(status)}</span>${stale&&entry.live?'<small>Letzter verfügbarer Stand</small>':''}</div></div></a>`;
}
function sharedWeekContent() {
  const start=weekStart(), end=shiftWeekDate(start,6), all=weekFixtures(), entries=all.filter(e=>e.game.date>=start&&e.game.date<=end);
  const dates=[...new Set(entries.map(e=>e.game.date))];
  const next=all.find(e=>e.game.date>end);
  const sources=selectedClubs.map(club=>{
    const data=club==='fcsg'?fcsgData:handballSnapshots.get(club), state=data?.status?.games, stamp=state?.updatedAt||data?.checkedAt;
    const label=stamp?new Date(stamp).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Stand noch nicht verfügbar';
    return `<li>${fanClubs[club].short}: ${liveEscape(label)}${weekDataFailures.has(club)||state?.ok===false||stamp&&snapshotDelayed(stamp)?' · Letzter gültiger Stand':''}${weekLive.get(club)?.failed?' · Live-Abfrage derzeit nicht verfügbar':''}</li>`;
  }).join('');
  return `<p class="week-summary">${entries.length} ${entries.length===1?'Spiel':'Spiele'} · ${selectedClubs.map(c=>fanClubs[c].short).join(', ')}</p>${entries.length?dates.map(day=>`<section class="week-day"><h2>${new Date(day+'T12:00:00Z').toLocaleDateString('de-CH',{timeZone:'Europe/Zurich',weekday:'long',day:'2-digit',month:'long'})}${day===swissToday()?'<span>Heute</span>':''}</h2>${entries.filter(e=>e.game.date===day).map(weekCard).join('')}</section>`).join(''):`<aside class="notice week-empty"><h2>Diese Woche ist spielfrei.</h2><p>Für deine ausgewählten Vereine sind in dieser Woche keine Spiele veröffentlicht.</p>${next?`<button type="button" class="button" data-week-next="${next.game.date}">Zur nächsten Woche mit Spiel</button>`:''}</aside>`}<details class="week-sources"><summary>Datenstand deiner Vereine</summary><ul>${sources}</ul><p>Live-Spielstände werden bei geöffneter Ansicht alle 30 Sekunden abgefragt.</p><p>Inoffizielles, nicht-kommerzielles Fan-Projekt. Alle Marken- und Bildrechte liegen bei den jeweiligen Vereinen und Urhebern.</p><p>${selectedClubs.map(club=>ext(club==='fcsg'?'https://www.fcsg.ch/':club==='otmar'?'https://otmar.ch/':'https://kadettensh.ch/',fanClubs[club].short,'text-link')).join(' · ')}</p></details>`;
}
function sharedWeekView() { return `<div id="shared-week">${sharedWeekContent()}</div>`; }
function bindWeekControls() {
  document.querySelectorAll('[data-week-shift],[data-week-today],[data-week-next]').forEach(button=>button.onclick=()=>{
    if(button.hasAttribute('data-week-shift'))weekOffset+=Number(button.dataset.weekShift);
    else if(button.hasAttribute('data-week-next'))weekOffset=Math.round((Date.parse(weekStart(button.dataset.weekNext,0))-Date.parse(weekStart(swissToday(),0)))/604800000);
    else weekOffset=0;
    const selector=button.hasAttribute('data-week-shift')?`[data-week-shift="${button.dataset.weekShift}"]`:'[data-week-shift="1"]';
    render();document.querySelector(selector)?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
  });
  document.querySelectorAll('[data-week-club]').forEach(link=>link.onclick=event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    const club=link.dataset.weekClub, route='#match/'+encodeURIComponent(link.dataset.weekMatch)+'/overview';
    if(club!==activeClub)applyClubChange(club,route,true);
    else {adoptWeekLive(club);location.hash=route;}
  });
}
function adoptWeekLive(club) {
  const state=weekLive.get(club);if(club==='fcsg'||!state?.data)return;
  liveState=state.data;lastLiveMatch=state.data.match||state.data.finished;lastLiveAt=state.checkedAt;lastLiveDate=swissToday();liveRequestFailed=!!state.failed;
  if(lastLiveMatch?.date&&!games.some(g=>g.date===lastLiveMatch.date&&sameFixture(g,lastLiveMatch)))games=[...games,lastLiveMatch];
  applyFinishedMatch(state.data.finished);
}
function refreshWeekView() {
  const slot=document.getElementById('shared-week');if(!slot||!weekVisible())return;
  // Updating a live result never removes the link currently used by the keyboard.
  if(slot.contains(document.activeElement))return;
  const html=sharedWeekContent();if(slot.innerHTML!==html){slot.innerHTML=html;bindWeekControls();}
}
async function pollWeekLive() {
  if(!weekVisible()||document.hidden||weekBusy)return;
  clearTimeout(weekTimer);weekBusy=true;
  await Promise.all(selectedClubs.map(async club=>{
    const previous=weekLive.get(club);
    try {
      const response=await apiFetch(club==='fcsg'?'/api/fcsg/live':handballApiPath('/api/live',club),{cache:'no-store',signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok||!data.ok||!Number.isFinite(Date.parse(data.checkedAt)))throw Error('Live unavailable');
      const current=data.match||data.finished||previous?.data?.match||previous?.data?.finished;
      const source=current?(current.league==='QHL'?'SHV':'EHF'):null;
      if(source?data.sources?.[source]?.ok===false:Object.values(data.sources||{}).some(item=>item.ok===false))throw Error('Live source unavailable');
      for(const match of [data.match,data.finished].filter(Boolean))if(!match.home||!match.away||!/^\d{4}-\d{2}-\d{2}$/.test(match.date))throw Error('Invalid match');
      weekLive.set(club,{data,checkedAt:data.checkedAt,failed:false});
      if(club==='fcsg'){
        for(const [id,game] of fcsgLiveGames)if(game.live&&id!==data.match?.id)fcsgLiveGames.delete(id);
        if(data.match){fcsgLiveGames.set(data.match.id,data.match);fcsgLiveChecks.set(data.match.id,data.checkedAt);fcsgLiveErrors.delete(data.match.id);}
      }
    } catch {weekLive.set(club,{...previous,failed:true});}
  }));
  weekBusy=false;refreshWeekView();
  if(weekVisible()&&!document.hidden)weekTimer=setTimeout(pollWeekLive,30000);
}
function setupWeekView() {
  bindWeekControls();clearTimeout(weekTimer);
  const visible=weekVisible(), leaving=weekWasVisible&&!visible;weekWasVisible=visible;
  if(leaving&&activeClub!=='fcsg')checkLiveMatch();
  if(visible) {
    const latest=Math.max(0,...selectedClubs.map(c=>Date.parse(weekLive.get(c)?.checkedAt)||0));
    if(Date.now()-latest>=30000)pollWeekLive();else weekTimer=setTimeout(pollWeekLive,30000-(Date.now()-latest));
  }
}
document.addEventListener('visibilitychange',()=>{clearTimeout(weekTimer);if(!document.hidden&&weekVisible())pollWeekLive();});
