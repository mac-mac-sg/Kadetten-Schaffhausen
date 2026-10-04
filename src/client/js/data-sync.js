/* Datenstand laden, zwischenspeichern, aktualisieren. */
const articleMemory = new Map(),
  articleRequests = new Map();
// Restore the last valid public snapshot before building the first view.
const SNAPSHOT_KEY = 'kadetten-public-data-v1';
function validSnapshot(d) {
  return !!d && Array.isArray(d.games) && Array.isArray(d.stories) && Array.isArray(d.tables?.QHL);
}
function setCurrentData(d) {
  games = d.games;
  if (typeof applyFinishedMatch === 'function') applyFinishedMatch(liveState?.finished);
  tables = d.tables;
  teamRecords = d.teamRecords || {};
  stories = d.stories;
  clubLogos = d.clubLogos || {};
  updateState = d;
}
function restoreCurrentData() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (validSnapshot(d)) {
      setCurrentData(d);
      offlineData = !navigator.onLine;
    }
  } catch {}
}
function saveCurrentData(d) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(d));
  } catch {}
}
function viewDataSignature() {
  if (activeClub === 'fcsg') return 'fcsg';
  const [page = 'home', id] = (location.hash.slice(1) || 'home').split('/');
  return JSON.stringify(
    page === 'home'
      ? stories
      : page === 'news'
        ? stories.find(n => String(n.id) === id)
        : {games, tables, teamRecords, clubLogos, playerSeason: updateState?.playerSeason}
  );
}
function syncUpdateLabels() {
  document
    .querySelectorAll('[data-update-key]')
    .forEach(el => (el.textContent = updateLabelText(el.dataset.updateKey)));
  const badge = document.querySelector('[data-nav="games"]');
  if (badge) {
    const matchday = (typeof activeClub === 'undefined' || activeClub === 'kadetten') && todayGames().length > 0;
    badge.classList.toggle('is-matchday', matchday);
    badge.setAttribute('aria-label', matchday ? 'Spiele · Matchday' : 'Spiele');
  }
  showLiveMatch();
}

function updateLabel(key) {
  return `<span data-update-key="${key || ''}">${updateLabelText(key)}</span>`;
}
function updateLabelText(key) {
  const state = key ? updateState?.status?.[key] : null;
  const stamp = state?.updatedAt || updateState?.checkedAt;
  if (!stamp) return 'Aktualisierungszeit noch nicht verfügbar';
  const stale = Date.now() - Date.parse(stamp) > 6 * 3600000;
  return `${state?.ok === false || stale ? 'Letzter gültiger Stand' : 'Aktualisiert'}: ${new Date(stamp).toLocaleString('de-CH', {timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})} Uhr${stale ? ' · Aktualisierung verzögert' : ''}`;
}
async function loadCurrentData() {
  try {
    const r = await apiFetch('/api/data', {cache: 'no-store', signal: AbortSignal.timeout(25000)});
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) {
        try {
          localStorage.removeItem(SNAPSHOT_KEY);
        } catch {}
      }
      return;
    }
    const d = await r.json();
    if (!validSnapshot(d)) return;
    offlineData = r.headers.get('X-Kadetten-Offline') === '1';
    const previous = viewDataSignature(),
      anchor = window.scrollY > 8 ? document.querySelector('.story-current') : null,
      storyId = anchor ? stories[Number(anchor.id.replace('story-', ''))]?.id : null,
      offset = anchor?.getBoundingClientRect().top,
      y = window.scrollY;
    setCurrentData(d);
    saveCurrentData(d);
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
    syncOfflineNotice();
  } catch {
    if (updateState) offlineData = true;
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
