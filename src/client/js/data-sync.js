/* Datenstand laden, zwischenspeichern, aktualisieren. */
const articleMemory = new Map(),
  articleRequests = new Map();
// Restore the last valid public snapshot before building the first view.
const SNAPSHOT_KEY = 'kadetten-public-data-v1';
const kadettenPlayers=players, kadettenPlayerBios=playerBios;
const handballSnapshots=new Map([['kadetten',{games,tables,teamRecords,stories,clubLogos}],['otmar',otmarFallback]]);
function validSnapshot(d) {
  return !!d && Array.isArray(d.games) && Array.isArray(d.stories) && Array.isArray(d.tables?.QHL);
}
function activateHandballData(club) {
  const d=handballSnapshots.get(club);if(!d)return;
  games=d.games;tables=d.tables;teamRecords=d.teamRecords || {};stories=d.stories;clubLogos=d.clubLogos || {};updateState=d;
  if(club==='otmar') {
    players=(d.roster || []).map(p=>[p.number,p.name,p.position]);
    playerBios=Object.fromEntries((d.roster || []).map(p=>[p.number,{facts:p.facts,url:p.url}]));
    base='https://otmar.ch/';
  } else {players=kadettenPlayers;playerBios=kadettenPlayerBios;base='https://kadettensh.ch/';}
}
function setCurrentData(snapshot, club=handballClub()) {
  const d=sanitiseSnapshot(snapshot);
  handballSnapshots.set(club,d);
  if(activeClub===club || activeClub==='fcsg' && club==='kadetten') {
    activateHandballData(club);
    if(typeof applyFinishedMatch==='function')applyFinishedMatch(liveState?.finished);
  }
}
function restoreCurrentData() {
  for(const club of ['kadetten','otmar']) {
    try {const raw=localStorage.getItem(club+'-public-data-v1');if(raw){const d=JSON.parse(raw);if(validSnapshot(d))handballSnapshots.set(club,sanitiseSnapshot(d));}} catch {}
  }
  activateHandballData(handballClub());offlineData=!navigator.onLine;
}
function saveCurrentData(d, club=handballClub()) {
  try {localStorage.setItem(club+'-public-data-v1',JSON.stringify(d));} catch {}
}
function viewDataSignature() {
  if (activeClub === 'fcsg') return 'fcsg';
  const [page = 'home', id] = (location.hash.slice(1) || 'home').split('/');
  return JSON.stringify(
    page === 'home'
      ? stories
      : page === 'news'
        ? stories.find(n => String(n.id) === id)
        : {games, tables, teamRecords, clubLogos, playerSeason: updateState?.playerSeason, ehlRecentGames: page === 'match' ? updateState?.ehlRecentGames : undefined}
  );
}
function syncUpdateLabels() {
  syncSourceNotices();
  document
    .querySelectorAll('[data-update-key]')
    .forEach(el => (el.textContent = updateLabelText(el.dataset.updateKey)));
  if(typeof syncMatchdayNavigation==='function')syncMatchdayNavigation();
  showLiveMatch();
}

function updateLabel(key) {
  return `<span data-update-key="${key || ''}">${updateLabelText(key)}</span>`;
}
function updateLabelText(key) {
  const state = key ? updateState?.status?.[key] : null;
  const stamp = state?.updatedAt || updateState?.checkedAt;
  if (!stamp) return 'Aktualisierungszeit noch nicht verfügbar';
  const stale = snapshotDelayed(stamp);
  return `${state?.ok === false || stale ? 'Letzter gültiger Stand' : 'Aktualisiert'}: ${new Date(stamp).toLocaleString('de-CH', {timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})} Uhr${stale ? ' · Aktualisierung verzögert' : ''}`;
}
async function loadCurrentData(club=handballClub()) {
  const selectedAtStart=activeClub;
  try {
    const r = await apiFetch(handballApiPath('/api/data',club), {cache: 'no-store', signal: AbortSignal.timeout(25000)});
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        try {
          localStorage.removeItem(club+'-public-data-v1');
        } catch {}
      }
      throw Error("Data unavailable");
    }
    const d = await r.json();
    if (!validSnapshot(d)) throw Error("Invalid data");
    if(r.headers.get('X-Kadetten-Offline')==='1')weekDataFailures.add(club);else weekDataFailures.delete(club);
    if(activeClub!==selectedAtStart || activeClub!==club) {handballSnapshots.set(club,sanitiseSnapshot(d));saveCurrentData(d,club);updateClubDot();refreshWeekView();return;}
    dataLoadFailed = r.headers.get('X-Kadetten-Offline') === '1';
    offlineData = !navigator.onLine;
    const previous = viewDataSignature(),
      anchor = window.scrollY > 8 ? document.querySelector('.story-current') : null,
      storyId = anchor ? stories[Number(anchor.id.replace('story-', ''))]?.id : null,
      offset = anchor?.getBoundingClientRect().top,
      y = window.scrollY;
    setCurrentData(d,club);
    saveCurrentData(d,club);
    if (previous !== viewDataSignature()) {
      render();
      if (storyId) {
        const i = stories.findIndex(n => n.id === storyId);
        if (i >= 0) {
          const target = document.getElementById('story-' + i);
          if (target) {
            window.scrollTo({top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'instant'});
            updateNewsDots(i);
          }
        }
      } else if (!location.hash.startsWith('#season/games')) window.scrollTo({top: y, behavior: 'instant'});
    } else syncUpdateLabels();
    refreshWeekView();
    syncOfflineNotice();
  } catch {
    weekDataFailures.add(club);refreshWeekView();
    if(activeClub!==selectedAtStart || activeClub!==club)return;
    offlineData = !navigator.onLine;
    dataLoadFailed = true;
    syncOfflineNotice();
  }
}


let feedbackTimer;
function appFeedback(message) {
  const el = document.getElementById('app-feedback');
  clearTimeout(feedbackTimer);
  el.textContent = message;
  el.hidden = false;
  feedbackTimer = setTimeout(() => {
    el.hidden = true;
  }, 14000);
}
