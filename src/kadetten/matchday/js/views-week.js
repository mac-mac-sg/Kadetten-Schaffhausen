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
function sharedWeekEnabled() {
  const data=document.documentElement.dataset;
  return data?.preview==='v2'||data?.design==='v2';
}
function gameViewToggle() {
  const views=[['list','Liste'],['calendar','Kalender']];
  if(sharedWeekEnabled())views.push(['week','Meine Woche']);
  return `<div class="toggle game-view-toggle" aria-label="Spielplanansicht">${views.map(([id,label])=>`<button type="button" data-mode="${id}" aria-pressed="${mode===id}">${label}</button>`).join('')}</div>`;
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
function weekCalendarFixture(entry, reference) {
  const g=entry.game, club=reference.club;
  const home=teamName(g.home)===teamName(club==='fcsg'?'FC St.Gallen 1879':fanClubs[club].name);
  const score=entry.live?(g.liveScore||g.score):g.score;
  const validScore=Array.isArray(score)&&score.length===2&&score.every(n=>Number.isInteger(n)&&n>=0);
  const stale=entry.state?.failed || entry.state?.checkedAt&&Date.now()-Date.parse(entry.state.checkedAt)>120000;
  const status=entry.live?'Live'+(g.clock?' · '+g.clock:''):validScore?'Beendet':g.confirmed===false||!g.time?'Anspielzeit offen':g.time+' Uhr';
  const label=`${g.date} · ${fanClubs[club].name} · ${home?'Heimspiel':'Auswärtsspiel'} · ${g.home} gegen ${g.away} · ${g.league} · ${validScore?score.join(' : ')+' · ':''}${status}${stale&&entry.live?' · Letzter verfügbarer Stand':''}`;
  const url=new URL(location.href);url.searchParams.set('club',club);url.hash='#match/'+encodeURIComponent(reference.id)+'/overview';
  return `<a class="calendar-fixture week-club-${club} ${home?'fixture-home':'fixture-away'} ${entry.live?'week-fixture-live':''}" data-week-club="${club}" data-week-match="${liveEscape(reference.id)}" href="${liveEscape(url.href)}" aria-label="${liveEscape(label)}" title="${liveEscape(label)}"><span class="calendar-crest"><img class="crest" src="${fanClubs[club].logo}" alt="" width="28" height="34"></span><span class="fixture-location" aria-hidden="true"></span></a>`;
}
function sharedWeekContent() {
  const entries=weekFixtures();
  return calendarGrid(day=>entries.filter(e=>e.game.date===day).map(entry=>entry.references.map(reference=>weekCalendarFixture(entry,reference)).join('')).join(''),'Vereinslogo antippen für Spielinfos und Resultat.');
}
function sharedWeekView() { return `<div id="shared-week" class="calendar-panel">${sharedWeekContent()}</div>`; }
function bindWeekControls() {
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
  syncOfflineNotice();
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
