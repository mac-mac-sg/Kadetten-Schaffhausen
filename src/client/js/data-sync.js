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
    const matchday = todayGames().length > 0;
    badge.classList.toggle('is-matchday', matchday);
    badge.setAttribute('aria-label', matchday ? 'Spiele · Heute spielt Orange' : 'Spiele');
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


let manualRefreshing = false,
  feedbackTimer,
  canUpdateData = false;
async function checkUpdateAccess() {
  const button = document.getElementById('refresh-data');
  try {
    const r = await apiFetch('/api/access', {cache: 'no-store'});
    const d = await r.json();
    canUpdateData = r.ok && d.canUpdate === true;
  } catch {
    canUpdateData = false;
  }
  button.hidden = !canUpdateData;
}
function refreshFeedback(message) {
  const el = document.getElementById('refresh-feedback');
  clearTimeout(feedbackTimer);
  el.textContent = message;
  el.hidden = false;
  feedbackTimer = setTimeout(() => {
    el.hidden = true;
  }, 14000);
}
async function publicJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, {cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(30000)});
      if (!r.ok) {
        if (r.status < 500 && r.status !== 429) throw Error('HTTP ' + r.status);
        throw Error('Quelle vorübergehend nicht erreichbar');
      }
      return await r.json();
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
}
async function manualRefresh() {
  if (!canUpdateData || manualRefreshing) return;
  manualRefreshing = true;
  const button = document.getElementById('refresh-data');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  refreshFeedback('Aktualisierung läuft …');
  try {
    const supplied = {},
      failures = [];
    await Promise.all([
      (async () => {
        try {
          const p = await publicJson(base + 'wp-json/wp/v2/pages?slug=matchcenter');
          if (p.length !== 1 || p[0].link !== base + 'matchcenter/') throw Error('Spielplan fehlt');
          supplied.matchHtml = p[0].content.rendered;
        } catch {
          failures.push('Spiele');
        }
      })(),
      (async () => {
        try {
          const p = await publicJson(base + 'wp-json/wp/v2/pages?slug=home');
          if (p.length !== 1 || !p[0].content?.rendered) throw Error('Tabelle fehlt');
          supplied.tableHtml = p[0].content.rendered;
        } catch {
          failures.push('Tabelle');
        }
      })(),
      (async () => {
        try {
          const posts = [];
          let complete = false;
          for (let page = 1; page <= 20; page++) {
            const batch = await publicJson(
              base + 'wp-json/wp/v2/posts?after=2026-06-01T00:00:00&per_page=100&page=' + page + '&_embed'
            );
            if (!Array.isArray(batch)) throw Error('News fehlen');
            posts.push(...batch);
            if (batch.length < 100) {
              complete = true;
              break;
            }
          }
          if (!complete) throw Error('Zu viele Newsseiten');
          supplied.posts = posts;
        } catch {
          failures.push('News');
        }
      })()
    ]);
    const r = await apiFetch('/api/refresh', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(supplied),
        signal: AbortSignal.timeout(90000)
      }),
      d = await r.json();
    await loadCurrentData();
    if (r.status === 403) {
      canUpdateData = false;
      button.hidden = true;
      throw Error('Bitte mit deinem Eigentümer-Zugang anmelden.');
    }
    if (!r.ok) throw Error('Die Quellen sind momentan nicht erreichbar. Der letzte gültige Stand bleibt erhalten.');
    const labels = {games: 'Spiele', table: 'Tabelle', news: 'News', players: 'Spielerwerte'},
      failed = Object.entries(d.status || {})
        .filter(([, v]) => !v.ok)
        .map(([k]) => labels[k] || k);
    refreshFeedback(
      failed.length
        ? 'Teilweise aktualisiert. ' + failed.join(', ') + ': letzter gültiger Stand bleibt erhalten.'
        : 'News, Spiele, Tabelle und Spielerwerte sind aktualisiert.'
    );
  } catch (e) {
    refreshFeedback(
      e.name === 'TimeoutError'
        ? 'Die Aktualisierung dauert länger. Bitte später erneut prüfen.'
        : e.message || 'Aktualisierung fehlgeschlagen. Bitte später erneut versuchen.'
    );
  } finally {
    manualRefreshing = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}
