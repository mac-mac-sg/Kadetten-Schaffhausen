/* Matchday, season journey and device-local offline feedback. */
let offlineData = false,
  dayTimer,
  dataSyncTimer,
  highlightObserver;
const rivalColors = {
  'Pfadi Winterthur': '#b64740',
  'Handball Stäfa': '#bda749',
  'HC Kriens-Luzern': '#5978ab',
  'Wacker Thun': '#5d936e',
  'BSV Bern': '#aa4247',
  'GC Amicitia Zürich': '#628dc0',
  'HSC Suhr Aarau': '#ac3e45',
  'RTV 1879 Basel': '#597ca1',
  'St. Otmar St. Gallen': '#aa985b',
  'HC Izvidac': '#bd984a',
  'CSM Bucuresti': '#4e8fc0',
  Chambéry: '#9d8655'
};
function matchdayDetail(g) {
  if (g.date !== swissToday()) return '';
  const live = freshLive(),
    confirmed = sameFixture(g, live);
  const venue = g.venue || 'Spielort noch offen',
    maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue);
  return `<aside class="matchday-panel ${g.score ? 'finished' : ''}"><p class="eyebrow">${g.score ? 'Heute gespielt' : 'Matchday'}</p>${confirmed ? `<h2>Jetzt live · ${live.score ? live.score.join(' : ') : 'Resultat wird geladen'}</h2><a class="button" href="${liveEscape(live.url)}" target="_blank" rel="noopener noreferrer">Offizieller Liveticker</a>` : g.score ? `<h2>${g.score.join(' : ')} · Endresultat</h2><a class="text-link" href="#match/${liveEscape(g.id)}/stats">Zu den Statistiken</a>` : `<h2 data-countdown="${g.id}">${countdownText(g)}</h2>`}<p>${liveEscape(venue)}</p>${g.venue ? `<a class="text-link" href="${maps}" target="_blank" rel="noopener noreferrer">Anreise in Google Maps</a>` : ''}</aside>`;
}
function streakStats(list) {
  let run = 0,
    best = 0;
  for (const g of list) {
    run = teamResult(g, 'Kadetten Schaffhausen').state === 'win' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {current: run, best};
}
function goalDifferenceChart(list) {
  const rows = list.map(g => {
      const result = teamResult(g, 'Kadetten Schaffhausen'),
        home = g.home.includes('Kadetten');
      return {g, result, home, opponent: home ? g.away : g.home, diff: result.for - result.against};
    }),
    limit = Math.max(1, ...rows.map(r => Math.abs(r.diff))),
    signed = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
  const markup = items =>
    items
      .map(
        ({g, result, home, opponent, diff}) =>
          `<li><a class="difference-game ${result.state}" href="#match/${liveEscape(g.id)}/overview" aria-label="${liveEscape(date(g) + ' · ' + (home ? 'Heimspiel' : 'Auswärtsspiel') + ' gegen ' + opponent + ', Resultat ' + g.score.join(':') + ', Tordifferenz ' + signed(diff))}"><span class="difference-fixture"><strong>${liveEscape(teamName(opponent))}</strong><small>${liveEscape(date(g))} · ${home ? 'Heim' : 'Auswärts'}</small></span><span class="difference-track" aria-hidden="true"><span class="difference-bar" style="--difference-width:${(Math.abs(diff) / limit) * 50}%"></span></span><strong class="difference-value">${signed(diff)}</strong></a></li>`
      )
      .join('');
  return `<section class="journey-chart goal-difference-chart" aria-labelledby="goal-difference-title"><h4 id="goal-difference-title">Tordifferenz pro Spiel</h4><div class="difference-heading" aria-hidden="true"><span>Spiel</span><span class="difference-axis"><span>−${limit}</span><span>0</span><span>+${limit}</span></span><span>Tore</span></div>${rows.length > 5 ? `<details class="difference-history"><summary><span class="history-show">Alle ${rows.length} Spiele anzeigen</span><span class="history-hide">Ältere Spiele ausblenden</span></summary><ol class="difference-games">${markup(rows.slice(0, -5))}</ol></details>` : ''}<ol class="difference-games">${markup(rows.slice(-5))}</ol><p class="muted">Erzielte minus erhaltene Tore je Spiel · ältestes Spiel zuerst. Ein Spiel antippen für Details.</p></section>`;
}
function seasonJourney(input) {
  const recent = input
    .slice()
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')))
    .slice(-5);
  if (!recent.length) return '';
  return `<div class="season-form-overview"><h4>${recent.length === 1 ? 'Letztes Spiel' : 'Letzte ' + recent.length + ' Spiele'}</h4><p class="muted">Ältestes Spiel links · neuestes rechts</p><div class="season-form" aria-label="Form der letzten ${recent.length} Spiele, ältestes Spiel zuerst">${recent
    .map(g => {
      const r = teamResult(g, 'Kadetten Schaffhausen');
      return `<a class="${r.state}" href="#match/${liveEscape(g.id)}/overview" aria-label="${liveEscape(date(g) + ': ' + g.home + ' gegen ' + g.away + ', ' + r.label)}" title="${liveEscape(date(g) + ' · ' + r.label)}">${r.short}</a>`;
    })
    .join('')}</div></div>`;
}
function syncOfflineNotice() {
  let el = document.getElementById('offline-notice');
  if (!el) {
    el = document.createElement('p');
    el.id = 'offline-notice';
    el.setAttribute('role', 'status');
    document.querySelector('.top').after(el);
  }
  el.hidden = navigator.onLine && !offlineData;
  el.textContent =
    offlineData || !navigator.onLine
      ? 'Offline · ' +
        (updateState?.checkedAt
          ? 'gespeicherter Stand ' +
            new Date(updateState.checkedAt).toLocaleString('de-CH', {
              timeZone: 'Europe/Zurich',
              dateStyle: 'short',
              timeStyle: 'short'
            }) +
            ' Uhr'
          : 'letzter verfügbarer Stand')
      : '';
  document.body.classList.toggle('is-offline', !el.hidden);
  const refresh = document.getElementById('refresh-data');
  if (refresh && !refresh.hasAttribute('aria-busy')) refresh.disabled = !navigator.onLine;
}
function setupEnhancements() {
  const [page, id] = location.hash.slice(1).split('/'),
    game = page === 'match' ? games.find(g => g.id === id) : null;
  const opponent = game ? (game.home.includes('Kadetten') ? game.away : game.home) : null;
  document.documentElement.style.setProperty('--rival-color', rivalColors[teamName(opponent || '')] || '#94683f');
  const badgeTarget = document.querySelector('[data-nav="games"]');
  badgeTarget.classList.toggle('is-matchday', todayGames().length > 0);
  badgeTarget.setAttribute('aria-label', todayGames().length ? 'Spiele · Matchday' : 'Spiele');
  syncOfflineNotice();
  document
    .querySelectorAll('.story-screen')
    .forEach(el =>
      el.classList.toggle(
        'story-current',
        el.id === 'story-' + (document.querySelector('[data-story][aria-pressed="true"]')?.dataset.story || 0)
      )
    );
  highlightObserver?.disconnect();
  const row = document.querySelector('.our-team');
  if (row && 'IntersectionObserver' in window) {
    highlightObserver = new IntersectionObserver(
      entries => row.classList.toggle('rank-visible', entries[0].isIntersecting),
      {threshold: 0.5}
    );
    highlightObserver.observe(row);
  }
  const heading = document.querySelector('.match-hero h1');
  if (game?.score && teamResult(game, 'Kadetten Schaffhausen').state === 'win' && heading) {
    heading.classList.add('winning-headline');
  }
  const displayedDay = swissToday();
  clearInterval(dayTimer);
  dayTimer = setInterval(() => {
    if (document.hidden) return;
    if (displayedDay !== swissToday()) {
      showLiveMatch();
      setupEnhancements();
      return;
    }
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const g = games.find(x => x.id === el.dataset.countdown);
      if (g) {
        el.textContent = countdownText(g);
        el.classList.toggle('is-soon', countdownSoon(g));
      }
    });
  }, 1000);
}
async function syncMatchdayData() {
  if (navigator.onLine && !document.hidden && (todayGames().length || freshLive())) await loadCurrentData();
}
window.addEventListener('offline', () => {
  liveState = null;
  showLiveMatch();
  syncOfflineNotice();
});
window.addEventListener('online', async () => {
  await loadCurrentData();
  checkLiveMatch();
  syncOfflineNotice();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncMatchdayData();
    syncOfflineNotice();
  }
});
dataSyncTimer = setInterval(syncMatchdayData, 120000);

function refreshMatchdayDetail() {
  const g = games.find(x => x.id === location.hash.split('/')[1]);
  const old = document.querySelector('.matchday-panel');
  if (g && old) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = matchdayDetail(g);
    if (wrapper.firstElementChild) old.replaceWith(wrapper.firstElementChild);
  }
}

// Official, verified reports are loaded only on completed match detail pages.
let gameReports = {},
  gameReportsRequest,
  gameReportsLoaded = false,
  gameReportsCheckedAt;
function verifiedReport(g) {
  if (!g) return null;
  const r = gameReports[g.id] || Object.values(gameReports).find(r => String(r.gameId) === String(g.id));
  return r && g.score && r.score.every((v, i) => v === g.score[i]) ? r : null;
}
async function loadGameReports() {
  const [page, id] = location.hash.slice(1).split('/'),
    g = games.find(x => x.id === id);
  if (page !== 'match' || !g?.score || g.league !== 'QHL' || gameReportsLoaded) return;
  try {
    if (!gameReportsRequest)
      gameReportsRequest = fetch('assets/game-reports.json').then(async r => {
        if (!r.ok) throw Error();
        const d = await r.json();
        if (!d.reports) throw Error();
        gameReports = d.reports;
        gameReportsCheckedAt = d.checkedAt;
        gameReportsLoaded = true;
      });
    await gameReportsRequest;
    if (location.hash.startsWith('#match/' + id + '/')) render();
  } catch {
    gameReportsRequest = null;
  }
}
function reportPlayer(p) {
  const nr = Object.keys(updateState?.playerSeason?.players || {}).find(
    n => updateState.playerSeason.players[n].shvPlayerId === p.id
  );
  const local = players.find(x => String(x[0]) === nr);
  return {name: local?.[1] || p.name, number: local?.[0]};
}
function reportSource(r) {
  return `<details class="source-details"><summary>Quelle & Datenstand</summary><p>${ext(r.source, 'Offizieller SHV-Spielbericht', '')} · geprüft ${new Date(gameReportsCheckedAt).toLocaleDateString('de-CH', {timeZone: 'Europe/Zurich'})}</p></details>`;
}
function reportFacts(g) {
  const r = verifiedReport(g);
  return r
    ? `${r.spectators !== null ? `<div><span>Zuschauer</span><strong>${r.spectators.toLocaleString('de-CH')}</strong></div>` : ''}<div><span>Schiedsrichter</span><strong>${r.referees.filter(Boolean).map(liveEscape).join(' · ') || '–'}</strong></div>`
    : '';
}
function reportRoster(g) {
  const r = verifiedReport(g);
  return `<h2>Das Spielaufgebot</h2><p class="muted">Beide Teams gemäss offiziellem Spielbericht. Ein Eintrag im Aufgebot bestätigt keine Einsatzdauer.</p>${r.teams
    .map(
      t =>
        `<section class="report-roster"><h3>${liveEscape(t.name)}</h3>${t.players
          .map(p => {
            const person = reportPlayer(p);
            return `<div class="report-player"><span>${person.number ? `<a href="#player/${person.number}">${liveEscape(person.name)}</a>` : liveEscape(person.name)}<small>${p.keeper ? 'Torhüter' : 'Feldspieler'}${person.number ? ' · Nr. ' + person.number : ''}</small></span><strong>${p.goals}<small>Tore</small></strong></div>`;
          })
          .join('')}</section>`
    )
    .join('')}${reportSource(r)}`;
}
function reportStats(g) {
  const r = verifiedReport(g),
    [h, a] = r.teams;
  const percent = v => (Number.isFinite(v) ? v.toLocaleString('de-CH', {maximumFractionDigits: 1}) + ' %' : '–');
  const pair = (label, key, format = v => v ?? '–') => metric(label, format(h[key]), format(a[key]));
  return `<h2>Das Spiel in Zahlen</h2><div class="panel">${statTeams(g)}${metric('Tore', ...r.score)}${r.half.every(Number.isInteger) ? metric('1. Halbzeit', ...r.half) + metric('2. Halbzeit', r.score[0] - r.half[0], r.score[1] - r.half[1]) : ''}${pair('Würfe', 'shots')}${pair('Wurfquote', 'throwPercentage', percent)}${pair('Paraden', 'saves')}${pair('Paradenquote', 'savePercentage', percent)}${pair('Ballverluste', 'turnovers')}${pair('2-Minuten-Strafen', 'twoMinutes')}</div><p class="muted">Zweite Halbzeit aus End- und Halbzeitstand berechnet. Strafen umfassen auch Teamoffizielle.</p>${r.teams
    .map(
      t =>
        `<section class="report-roster"><h3>${liveEscape(t.name)}</h3><p class="muted">Tore/Würfe · Siebenmeter-Tore/Versuche · 2-Minuten-Strafen</p><div class="report-table-wrap" tabindex="0" role="region" aria-label="Einzelstatistiken ${liveEscape(t.name)}"><table class="report-table"><thead><tr><th scope="col">Spieler</th><th scope="col">Tore/Würfe</th><th scope="col">Quote</th><th scope="col">7 m</th><th scope="col">2 min</th><th scope="col">Gelb</th><th scope="col">Rot</th></tr></thead><tbody>${t.players
          .filter(p => !p.keeper)
          .sort((a, b) => b.goals - a.goals)
          .map(p => {
            const person = reportPlayer(p);
            return `<tr><th scope="row">${person.number ? `<a href="#player/${person.number}">${liveEscape(person.name)}</a>` : liveEscape(person.name)}</th><td>${p.goals}/${p.shots ?? '–'}</td><td>${p.shots > 0 ? percent((p.goals / p.shots) * 100) : '–'}</td><td>${p.seven ?? '–'}/${p.sevenShots ?? '–'}</td><td>${p.twoMinutes ?? '–'}</td><td>${p.warnings ?? '–'}</td><td>${p.redCards ?? '–'}</td></tr>`;
          })
          .join('')}</tbody></table></div><h4>Zwischen den Pfosten</h4><div class="facts">${t.players
          .filter(p => p.keeper)
          .map(p => {
            const person = reportPlayer(p);
            return `<div><span>${liveEscape(person.name)}</span><strong>${p.saves ?? '–'} Paraden · ${p.saves !== null && p.keeperShots > 0 ? percent((p.saves / p.keeperShots) * 100) : '–'}</strong><p class="muted">${p.sevenSaves ?? '–'} gehaltene Siebenmeter</p></div>`;
          })
          .join('')}</div></section>`
    )
    .join('')}${reportSource(r)}`;
}

