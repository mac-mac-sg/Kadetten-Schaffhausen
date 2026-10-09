/* Matchday, season journey and device-local offline feedback. */
let offlineData = false, dataLoadFailed = false,
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
  const fcsg = typeof activeClub !== 'undefined' && activeClub === 'fcsg';
  const failed = fcsg ? fcsgDataLoadFailed : dataLoadFailed;
  const stamp = fcsg ? fcsgData.checkedAt : updateState?.checkedAt;
  el.hidden = navigator.onLine && !failed;
  const saved = stamp ? 'Gespeicherter Stand: ' + new Date(stamp).toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short'
  }) + ' Uhr.' : 'Der letzte verfügbare Stand bleibt sichtbar.';
  el.textContent = el.hidden ? '' : (!navigator.onLine ? 'Offline · ' : 'Daten konnten gerade nicht aktualisiert werden. ') + saved;
  document.body.classList.toggle('is-offline', !el.hidden);
}
function setupEnhancements() {
  if (typeof activeClub !== 'undefined' && activeClub !== 'kadetten') return;
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
    updateMatchPulse();
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
  await (activeClub === "fcsg" ? loadFcsgData() : loadCurrentData());
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
const reportAttempts = new Map();
async function loadGameReports() {
  const [page, id] = location.hash.slice(1).split('/'), g = games.find(x => x.id === id);
  if (page !== 'match' || !g?.score || g.league !== 'QHL') return;
  // One request per fixture per session; failures may retry after one minute.
  if (Date.now() - (reportAttempts.get(id) || 0) < 60000 || gameReports[id]?.events) return;
  reportAttempts.set(id, Date.now());
  if (!gameReportsRequest) gameReportsRequest = fetch('assets/game-reports.json').then(async r => {
    if (!r.ok) throw Error();
    const d = await r.json();
    if (!d.reports) throw Error();
    gameReports = {...d.reports, ...gameReports}; gameReportsCheckedAt = d.checkedAt; gameReportsLoaded = true;
  }).catch(() => {gameReportsRequest = null;});
  await gameReportsRequest;
  try {
    const response = await apiFetch('/api/reports/' + encodeURIComponent(id));
    if (!response.ok) throw Error();
    const {report:r} = await response.json();
    const normalized=n=>String(n).replace(/^TSV /,'');
    if (!r || !Array.isArray(r.score) || r.score.length!==2 || !r.score.every((v,i)=>Number.isInteger(v)&&v===g.score[i]) || r.teams?.length!==2 || normalized(r.teams[0].name)!==normalized(g.home) || normalized(r.teams[1].name)!==normalized(g.away)) throw Error();
    const previous=verifiedReport(g);
    gameReports[id] = {...previous, ...r, spectators:r.spectators??previous?.spectators??null, referees:r.referees?.length?r.referees:previous?.referees||[]};
  } catch { /* Keep the verified report available if the source fails. */ }
  if (location.hash.startsWith('#match/' + id + '/')) render();
}
function reportPlayer(p) {
  const nr = Object.keys(updateState?.playerSeason?.players || {}).find(
    n => updateState.playerSeason.players[n].shvPlayerId === p.id
  );
  // Spielerwerte der EHF tragen keine SHV-Kennung: Zuordnung zum Kader über den Namen.
  const key = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const local = players.find(x => String(x[0]) === nr) || (p.ehf ? players.find(x => key(x[1]) === key(p.name)) : null);
  return {name: local?.[1] || p.name, number: local?.[0]};
}
function reportSource(r) {
  return `<details class="source-details"><summary>Quelle & Datenstand</summary><p>${ext(r.source, 'Offizieller SHV-Spielbericht', '')} · geprüft ${new Date(r.checkedAt || gameReportsCheckedAt).toLocaleDateString('de-CH', {timeZone: 'Europe/Zurich'})}</p></details>`;
}
function reportFacts(g) {
  const r = verifiedReport(g);
  return r
    ? `${r.spectators !== null ? `<div><span>Zuschauer</span><strong>${r.spectators.toLocaleString('de-CH')}</strong></div>` : ''}`
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
            return `<div class="report-player"><span>${person.number ? `<a href="#player/${person.number}">${liveEscape(person.name)}</a>` : liveEscape(person.name)}<small>${p.keeper ? 'Torhüter' : 'Feldspieler'}${person.number ? ' · Nr. ' + person.number : ''}</small></span><strong>${p.goals ?? '–'}<small>Tore</small></strong></div>`;
          })
          .join('')}</section>`
    )
    .join('')}${reportSource(r)}`;
}
function reportStats(g) {
  const r = verifiedReport(g);
  const percent = v => (Number.isFinite(v) ? v.toLocaleString('de-CH', {maximumFractionDigits: 1}) + ' %' : '–');
  const link = (p, person) => (person.number ? `<a href="#player/${person.number}">${liveEscape(person.name)}</a>` : liveEscape(person.name));
  // Je Mannschaft: Feldspieler (Tore/Würfe, Quote, 7 m, Gelb, Rot) und «Zwischen den Pfosten» als Kacheln.
  const team = t => {
    const field = t.players.filter(p => !p.keeper).sort((a, b) => b.goals - a.goals);
    const keepers = t.players.filter(p => p.keeper);
    return `<h3>Feldspieler</h3><div class="report-table-wrap" tabindex="0" role="region" aria-label="Einzelstatistiken ${liveEscape(t.name)}"><table class="report-table stats-table"><thead><tr><th scope="col" class="name">Spieler</th><th scope="col">Tore/ Würfe</th><th scope="col">Quote</th><th scope="col">7 m</th><th scope="col">2 min</th><th scope="col">Gelb</th><th scope="col">Rot</th></tr></thead><tbody>${field
      .map(p => `<tr><th scope="row">${link(p, reportPlayer(p))}</th><td>${p.goals ?? '–'}/${p.shots ?? '–'}</td><td>${p.goals !== null && p.shots > 0 ? percent((p.goals / p.shots) * 100) : '–'}</td><td>${p.seven ?? '–'}/${p.sevenShots ?? '–'}</td><td>${p.twoMinutes ?? '–'}</td><td>${p.warnings ?? '–'}</td><td>${p.redCards ?? '–'}</td></tr>`)
      .join('')}</tbody></table></div>${keepers.length ? `<h3>Zwischen den Pfosten</h3><div class="facts">${keepers
      .map(p => `<div><span>${link(p, reportPlayer(p))}</span><strong>${p.saves ?? '–'} Paraden</strong><p class="muted nowrap">${p.saves !== null && p.keeperShots > 0 ? percent((p.saves / p.keeperShots) * 100) : '–'} Fangquote</p></div>`)
      .join('')}</div>` : ''}`;
  };
  return `<h2>Das Spiel in Zahlen</h2>${reportComparison(g,r)}${r.half.every(Number.isInteger) ? `<div class="panel">${metric('1. Halbzeit', ...r.half)}${metric('2. Halbzeit', r.score[0] - r.half[0], r.score[1] - r.half[1])}</div>` : ''}<h2>Spielerstatistiken</h2>${teamSwitchMarkup(String(g.id), r.teams[0].name, r.teams[1].name, (k, name) => team(r.teams[k === 'home' ? 0 : 1]))}`;
}

function reportComparison(g,r) {
 const [h,a]=r.teams, value=v=>v??'–', percentage=v=>v===null||v===undefined?'–':v+' %';
 const total=(t,key)=>t.players.length&&t.players.every(p=>Number.isInteger(p[key]))?t.players.reduce((n,p)=>n+p[key],0):null;
 const seven=t=>t.seven??total(t,'seven'), sevenShots=t=>t.sevenShots??total(t,'sevenShots');
 const rows=[
  ['Tore',...r.score,...r.score],
  ['Wurfeffektivität',h.throwPercentage,a.throwPercentage,`${value(r.score[0])}/${value(h.shots)} · ${percentage(h.throwPercentage)}`,`${value(r.score[1])}/${value(a.shots)} · ${percentage(a.throwPercentage)}`],
  ['Siebenmeter',seven(h),seven(a),`${value(seven(h))}/${value(sevenShots(h))}`,`${value(seven(a))}/${value(sevenShots(a))}`],
  ['Paraden',h.saves,a.saves,`${value(h.saves)} · ${percentage(h.savePercentage)}`,`${value(a.saves)} · ${percentage(a.savePercentage)}`],
  ['2-Minuten-Strafen',h.twoMinutes,a.twoMinutes,value(h.twoMinutes),value(a.twoMinutes)],
  ['Gelbe Karten',h.warnings??total(h,'warnings'),a.warnings??total(a,'warnings')],
  ['Technische Fehler',h.turnovers,a.turnovers,value(h.turnovers),value(a.turnovers)],
  ['Auszeiten',h.timeouts,a.timeouts,value(h.timeouts),value(a.timeouts)]
 ];
 const markup=rows.map(([label,x,y,l=value(x),rr=value(y)])=>{
  if(x===undefined&&y===undefined)return '';
  const valid=Number.isFinite(x)&&Number.isFinite(y), scale=valid?Math.max(x,y,1):1;
  return `<div class="report-comparison-row"><div><strong>${liveEscape(l)}</strong><span>${label}</span><strong>${liveEscape(rr)}</strong></div><div class="report-bars" aria-hidden="true"><span class="${h.id===41473?'is-kadetten':''}"><i style="width:${valid?x/scale*100:0}%"></i></span><span class="${a.id===41473?'is-kadetten':''}"><i style="width:${valid?y/scale*100:0}%"></i></span></div></div>`;
 }).join('');
 return `<section class="report-comparison" aria-label="Teamvergleich">${statTeams(g)}${markup}</section>`;
}
function reportHistory(g) {
 const r=verifiedReport(g);
 if(!r?.events)return '';
 // Use confirmed score changes only; no interpolated events or invented goals.
 const scores=r.events.filter(e=>e.score).sort((a,b)=>a.seconds-b.seconds||a.id-b.id);
 const maximum=Math.max(...r.score,1), end=Math.max(3600,...scores.map(e=>e.seconds));
 const path=side=>scores.map((e,i)=>`${i?'H':'M'}${(e.seconds/end*300+25).toFixed(1)}${i?'V':' '+(125-e.score[side]/maximum*100).toFixed(1)}${i?(125-e.score[side]/maximum*100).toFixed(1):''}`).join(' ');
 return `<section class="report-history"><h2>Torverlauf</h2>${scores.length?`<div class="report-score-legend"><span class="${r.teams[0].id===41473?'is-kadetten':''}">${liveEscape(g.home)}</span><span class="${r.teams[1].id===41473?'is-kadetten':''}">${liveEscape(g.away)}</span></div><svg class="report-score-chart" viewBox="0 0 350 155" role="img" aria-label="Torverlauf: ${liveEscape(g.home)} ${r.score[0]}, ${liveEscape(g.away)} ${r.score[1]}. Einzelereignisse folgen unter der Grafik."><path class="chart-grid" d="M25 25H325 M25 75H325 M25 125H325"/><text x="4" y="30">${maximum}</text><text x="12" y="129">0</text><path class="${r.teams[0].id===41473?'chart-kadetten':'chart-opponent'}" d="${path(0)}"/><path class="${r.teams[1].id===41473?'chart-kadetten':'chart-opponent'}" d="${path(1)}"/><text x="25" y="149">0′</text><text x="310" y="149">${Math.round(end/60)}′</text></svg>`:''}${liveEventFeed({home:g.home,away:g.away,details:{events:r.events}},null,true)}</section>`;
}
