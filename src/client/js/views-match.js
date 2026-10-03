/* Spielseite: Übersicht, Vergleich, Formkurve, Direktduelle und Statistik. */
function matchDay(g) {
  return new Date(g.date + 'T12:00:00').toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
function venueFact(g) {
  const venue = g.venue || 'Spielort noch offen',
    photo = venuePhotos.find(p => venue.toLocaleLowerCase('de-CH').includes(p.match.toLocaleLowerCase('de-CH'))),
    bbc = /BBC Arena/i.test(venue),
    query = bbc ? 'BBC Arena, Schweizersbildstrasse 10, 8207 Schaffhausen' : venue,
    url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  return `<div class="venue-fact ${!g.score ? 'venue-preview' : ''}"><span>Spielort</span>${g.venue ? `<a class="venue-map" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${liveEscape(venue)} in Google Maps öffnen"><strong>${liveEscape(venue)}</strong><span>In Google Maps öffnen</span></a>` : `<strong>${venue}</strong>`}${photo ? `<figure class="venue-thumb"><a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${liveEscape(venue)} in Google Maps öffnen"><img src="${photoUrl(photo.image)}" alt="${liveEscape(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async"></a>${photo.license ? `<figcaption class="venue-attribution"><a href="${photo.source}" target="_blank" rel="noopener noreferrer">Foto: ${liveEscape(photo.credit)}</a> · <a href="${photo.license}" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0, verkleinert</a></figcaption>` : ''}</figure>` : ''}</div>`;
}
function match(g, tab) {
  if (liveForFixture(g)) return liveMatchPage(g, tab);
  const detail = verifiedReport(g);
  if (detail) g = {...g, half: detail.half};
  if (!g.score && tab === 'squad') tab = 'overview';
  return `<section class="match"><div class="match-top">${backLink('#season/games', 'Zurück zu den Spielen', 'back')}<div class="matchup"><div class="matchup-team">${badge(g.home)}<span>${liveEscape(g.home)}</span></div><strong>${g.score ? g.score.join(' : ') : 'VS'}</strong><div class="matchup-team">${badge(g.away)}<span>${liveEscape(g.away)}</span></div></div><small>${g.half ? 'Halbzeit ' + g.half.join(':') : (g.score ? date(g) : matchDay(g)) + (g.time ? ' · ' + g.time : '')}</small></div><nav class="segments match-tabs" aria-label="Spielbereich">${[['overview', g.score ? 'Rückblick' : 'Vorschau'], ...(g.score ? [['squad', 'Aufgebot']] : []), ['stats', 'Statistik']].map(([id, t]) => `<a href="#match/${liveEscape(g.id)}/${id}" class="${id === tab ? 'selected' : ''}">${t}</a>`).join('')}</nav>${tab === 'overview' ? matchOverview(g) : `<div class="content narrow">${tab === 'stats' ? matchStats(g) : matchSquad(g)}</div>`}</section>${footer()}`;
}
function matchOverview(g) {
  return `<div class="match-hero"><img src="${photoUrl(g.image)}" alt="${g.id === 'bukarest' ? 'Jubel bei den Kadetten' : g.id === 'stgallen' ? 'Frederik Tilsted im Spiel' : 'Die Mannschaft der Kadetten'}" fetchpriority="high"><div><p class="eyebrow">${league(g)} · ${g.score ? date(g) : matchDay(g)}</p><h1>${g.id === 'bukarest' ? 'EIN START<br>NACH MASS.' : g.id === 'stgallen' ? 'PUNKTE AUS<br>ST. GALLEN.' : 'ZUSAMMEN.<br>FÜR ORANGE.'}</h1></div></div><div class="content narrow">${matchdayDetail(g)}<h2>${g.score ? 'Der Rückblick' : g.home + ' gegen ' + g.away}</h2><p class="lead">${g.id === 'bukarest' ? 'Nach dem 16:16 zur Pause entscheiden die Kadetten die Partie gegen CSM Bucuresti mit 39:32 für sich. Odinn Rikhardsson erzielt 14 Tore.' : g.id === 'stgallen' ? 'Die Kadetten gewinnen auswärts bei St. Otmar mit 31:25 und nehmen zwei Punkte aus der Kreuzbleiche mit.' : g.id === 'staefa' && !g.score ? 'Nach dem erfolgreichen Europacup-Auftakt geht es in der QHL gegen Handball Stäfa weiter. Die Kadetten empfangen das Team in der BBC Arena.' : g.score ? `${g.home} – ${g.away}: ${g.score.join(':')}.` : `${g.home} trifft am ${date(g)} auf ${g.away}. Anspielzeit: ${g.time || 'noch offen'} Uhr.`}</p><div class="facts ${!g.score ? 'match-preview-facts' : ''}">${!g.score ? `<div><span>Spieldatum</span><strong>${matchDay(g)}</strong></div>` : ''}<div><span>${g.score ? 'Status' : 'Anspielzeit'}</span><strong>${g.score ? 'Beendet' : g.time ? g.time + ' Uhr' : 'Noch nicht hinterlegt'}</strong></div>${venueFact(g)}${reportFacts(g)}${g.id === 'bukarest' ? '<div><span>Zuschauer</span><strong>1’083</strong></div><div><span>Kadetten-Toptorschütze</span><strong>Rikhardsson · 14 Tore</strong></div>' : ''}</div><div class="actions">${ext(g.url, g.url.includes('matchcenter') ? 'Offizieller Spielplan' : g.score ? 'Originalbericht lesen' : 'Offizielle Spielinformationen')}</div>${g.score?reportHistory(g):''}</div>`;
}
function matchSquad(g) {
  if (verifiedReport(g)) return reportRoster(g);
  if (g.id !== 'bukarest')
    return `<h2>${g.score ? 'Spielkader' : 'Vor dem Spiel'}</h2><p class="notice">${g.score ? 'Für diese Partie ist noch kein verifizierter Spielkader hinterlegt.' : 'Das bestätigte Spielaufgebot ist noch nicht hinterlegt. Der Saisonkader ist keine bestätigte Aufstellung.'}</p><a class="button" href="#season/squad">Zum Saisonkader</a>`;
  return `<h2>Das Kadetten-Aufgebot</h2><p class="muted">Gemäss Vereinsbericht · gegen CSM Bucuresti</p><div class="lineup">${players
    .filter(p => Object.hasOwn(goals, p[0]))
    .map(
      p =>
        `<a href="#player/${p[0]}"><img src="assets/player-${p[0]}.webp" alt="" width="600" height="400" loading="lazy" decoding="async"><span><strong>${p[1]}</strong><small>${p[2]} · Nr. ${p[0]}</small></span><b>${goals[p[0]]} <small>Tore</small></b></a>`
    )
    .join(
      ''
    )}</div><p class="notice">Patrik Martinovic: im Bericht als rekonvaleszent aufgeführt. Das Aufgebot des Gegners ist nicht hinterlegt.</p>`;
}

function statTeams(g) {
  return `<div class="stat-teams"><div>${badge(g.home)}<span>${g.home}</span></div><span aria-hidden="true"></span><div>${badge(g.away)}<span>${g.away}</span></div></div>`;
}
function previewComparison(g) {
  const norm = n => n.replace(/^TSV /, '').replace('Chambery Savoie Mont Blanc', 'Chambéry');
  const rows = tables[g.league] || [];
  const a = rows.find(r => norm(r[0]) === norm(g.home)),
    b = rows.find(r => norm(r[0]) === norm(g.away));
  return a && b
    ? `<div class="panel">${statTeams(g)}${metric('Rang', rows.indexOf(a) + 1, rows.indexOf(b) + 1)}${metric('Punkte', a[4], b[4])}${metric('Absolvierte Spiele', a[1], b[1])}</div>`
    : `<p class="notice">Für diesen Wettbewerb ist kein verifizierter Tabellenvergleich verfügbar.</p>`;
}
let recentSelection = null;
const recentCache = new Map();
function recentSelector(g) {
  const team = recentSelection?.match === g.id ? recentSelection.team : g.home.includes('Kadetten') ? g.home : g.away;
  recentSelection = {match: g.id, team};
  return `<div id="form-comparison">${formComparison(g)}</div><h3 class="history-heading">Letzte Spiele im Detail</h3><div class="team-switch" role="group" aria-label="Team für letzte Spiele" style="--selected:${team === g.home ? 0 : 1}"><span class="team-switch-slider" aria-hidden="true"></span>${[g.home, g.away].map(t => `<button data-recent-team="${liveEscape(t)}" aria-pressed="${t === team}">${badge(t)}<span>${t}</span></button>`).join('')}</div><div id="recent-results" aria-live="polite">${recentGamesMarkup(g, team)}</div><h3 class="history-heading">Direkte Duelle</h3><div id="head-to-head" aria-live="polite">${headToHeadMarkup(g)}</div>`;
}
function recentGamesMarkup(g, team) {
  const cached = g.league === 'QHL' ? recentCache.get(team) : null;
  const list =
    cached?.games ||
    games
      .filter(x => x.score && x.league === g.league && (x.home === team || x.away === team))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  return `<div class="recent">${list
    .map(x => {
      const own = x.home === team ? 0 : 1,
        delta = x.score[own] - x.score[1 - own],
        state = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw',
        label = delta > 0 ? 'Sieg' : delta < 0 ? 'Niederlage' : 'Unentschieden';
      return `<a class="recent-game ${state}" href="${liveEscape(x.externalUrl ? safeUrl(x.externalUrl) : '#match/' + x.id + '/overview')}" ${x.externalUrl ? 'target="_blank" rel="noopener noreferrer"' : ''}><span><small>${date(x)}</small>${liveEscape(x.home)} – ${liveEscape(x.away)}</span><span class="recent-score"><b>${x.score.join(':')}</b><small class="result-label">${label}</small></span></a>`;
    })
    .join(
      ''
    )}</div>${!list.length ? '<p class="muted">Noch keine verifizierten Resultate erfasst.</p>' : ''}<p class="muted recent-note">${cached?.ok ? 'Die letzten fünf abgeschlossenen Saisonspiele' : g.league === 'QHL' ? 'Offizielle Resultate werden geladen …' : 'Hier erfasste Saisonspiele. Eine vollständige Gegnerhistorie ist noch nicht verfügbar.'}</p>`;
}
const recentPending = new Map(),
  duelCache = new Map(),
  duelPending = new Map();
function localRecent(g, team) {
  return games
    .filter(
      x =>
        x.score && x.league === g.league && (teamName(x.home) === teamName(team) || teamName(x.away) === teamName(team))
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}
function formComparison(g) {
  return `<div class="form-comparison">${[g.home, g.away]
    .map(team => {
      const cached = g.league === 'QHL' ? recentCache.get(team) : null,
        list = cached?.games || localRecent(g, team);
      return `<div class="form-team">${badge(team)}<strong>${liveEscape(team)}</strong><div class="form-strip" aria-label="Form von ältestem zu neuestem Spiel">${[
        ...list
      ]
        .reverse()
        .map(x => {
          const r = teamResult(x, team);
          return `<span class="form-result ${r.state}" title="${date(x)} · ${r.label} · ${x.score.join(':')}" aria-label="${date(x)}: ${r.label}, ${x.score.join(':')}">${r.short}</span>`;
        })
        .join(
          ''
        )}</div><small>${list.length ? list.length + ' erfasste Spiele' : 'Noch keine Resultate'}</small></div>`;
    })
    .join(
      ''
    )}</div><p class="muted form-legend">S = Sieg · U = Unentschieden · N = Niederlage<br>Ältestes links, neuestes rechts · ${league(g)}</p>`;
}
function duelKey(g) {
  return [g.home, g.away].sort().join('|');
}
function headToHeadMarkup(g) {
  const cached = duelCache.get(duelKey(g)),
    list =
      cached?.games ||
      games
        .filter(
          x =>
            x.score &&
            x.league === g.league &&
            [x.home, x.away].map(teamName).sort().join('|') === [g.home, g.away].map(teamName).sort().join('|')
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
  const team = g.home.includes('Kadetten') ? g.home : g.away;
  const outcomes = list.map(x => teamResult(x, team));
  return `${
    list.length
      ? `<p class="duel-summary"><strong>${outcomes.filter(r => r.state === 'win').length}</strong> Kadetten-Siege · <strong>${outcomes.filter(r => r.state === 'draw').length}</strong> Unentschieden · <strong>${outcomes.filter(r => r.state === 'loss').length}</strong> Niederlagen</p><div class="recent">${list
          .map(x => {
            const r = teamResult(x, team);
            return `<a class="recent-game ${r.state}" href="${liveEscape(x.externalUrl ? safeUrl(x.externalUrl) : '#match/' + x.id + '/overview')}" ${x.externalUrl ? 'target="_blank" rel="noopener noreferrer"' : ''}><span><small>${date(x)}</small>${liveEscape(x.home)} – ${liveEscape(x.away)}</span><span class="recent-score"><b>${x.score.join(':')}</b><small class="result-label">${r.label}</small></span></a>`;
          })
          .join('')}</div>`
      : '<p class="muted">Keine abgeschlossenen direkten Duelle im erfassten Zeitraum.</p>'
  }<p class="muted duel-note">${cached?.ok ? 'Letzte bis zu fünf direkte Duelle · Saison 2024/25 bis 2026/27' : g.league === 'QHL' ? 'Frühere direkte Duelle werden geprüft …' : 'Erfasste Duelle dieser Saison. Frühere Europacup-Duelle sind noch nicht verfügbar.'}</p>`;
}
async function ensureRecent(g, team) {
  if (
    g.league !== 'QHL' ||
    (recentCache.has(team) && Date.now() - Date.parse(recentCache.get(team).checkedAt) < 300000)
  )
    return;
  if (recentPending.has(team)) return recentPending.get(team);
  const promise = (async () => {
    const r = await apiFetch('/api/recent-games?team=' + encodeURIComponent(team), {
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw Error();
    const d = await r.json();
    if (!d.ok || !Array.isArray(d.games)) throw Error();
    recentCache.set(team, d);
  })();
  recentPending.set(team, promise);
  try {
    await promise;
  } finally {
    recentPending.delete(team);
  }
}
async function updateRecentGames(g, team) {
  const target = document.getElementById('recent-results');
  if (!target) return;
  if (recentSelection?.match === g.id && recentSelection.team === team) target.innerHTML = recentGamesMarkup(g, team);
  try {
    await ensureRecent(g, team);
    if (location.hash.split('/')[1] !== g.id) return;
    const form = document.getElementById('form-comparison');
    if (form) form.innerHTML = formComparison(g);
    if (
      recentSelection?.match === g.id &&
      recentSelection.team === team &&
      document.getElementById('recent-results') === target
    )
      target.innerHTML = recentGamesMarkup(g, team);
  } catch {
    if (
      recentSelection?.match === g.id &&
      recentSelection.team === team &&
      document.getElementById('recent-results') === target
    ) {
      const note = target.querySelector('.recent-note');
      if (note)
        note.textContent = 'Hier erfasste Saisonspiele. Weitere offizielle Resultate sind momentan nicht verfügbar.';
    }
  }
}
async function loadDuels(g) {
  const target = document.getElementById('head-to-head'),
    key = duelKey(g);
  if (
    !target ||
    g.league !== 'QHL' ||
    (duelCache.has(key) && Date.now() - Date.parse(duelCache.get(key).checkedAt) < 300000)
  )
    return;
  try {
    let pending = duelPending.get(key);
    if (!pending) {
      pending = (async () => {
        const r = await apiFetch(
          '/api/head-to-head?home=' + encodeURIComponent(g.home) + '&away=' + encodeURIComponent(g.away),
          {signal: AbortSignal.timeout(40000)}
        );
        if (!r.ok) throw Error();
        const d = await r.json();
        if (!d.ok || !Array.isArray(d.games)) throw Error();
        duelCache.set(key, d);
      })();
      duelPending.set(key, pending);
    }
    await pending;
    if (document.getElementById('head-to-head') === target) target.innerHTML = headToHeadMarkup(g);
  } catch {
    if (document.getElementById('head-to-head') === target)
      target.querySelector('.duel-note').textContent =
        'Hier erfasste direkte Duelle dieser Saison. Frühere Resultate sind momentan nicht verfügbar.';
  } finally {
    duelPending.delete(key);
  }
}
function setupRecentGames() {
  const g = games.find(x => x.id === location.hash.split('/')[1]);
  if (!g || !document.getElementById('recent-results')) return;
  document.querySelectorAll('[data-recent-team]').forEach(
    b =>
      (b.onclick = () => {
        recentSelection = {match: g.id, team: b.dataset.recentTeam};
        document.querySelectorAll('[data-recent-team]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        b.parentElement.style.setProperty('--selected', b.dataset.recentTeam === g.home ? 0 : 1);
        updateRecentGames(g, b.dataset.recentTeam);
      })
  );
  for (const team of [g.home, g.away]) updateRecentGames(g, team);
  loadDuels(g);
}
function seasonSummary(list) {
  const results = list.map(g => teamResult(g, 'Kadetten Schaffhausen'));
  const n = results.length;
  return {
    games: n,
    wins: results.filter(r => r.state === 'win').length,
    draws: results.filter(r => r.state === 'draw').length,
    losses: results.filter(r => r.state === 'loss').length,
    goals: results.reduce((a, r) => a + r.for, 0),
    against: results.reduce((a, r) => a + r.against, 0)
  };
}
function seasonPlayerLeaders() {
  const season = updateState?.playerSeason,
    valid = tableLeague === 'QHL' && season?.competition === 'QHL' && season?.season === '2026/27',
    source = season?.source || 'https://www.handball.ch/de/matchcenter/teams/41473';
  if (!valid)
    return `<section class="season-player-stats stats-block" aria-labelledby="season-players-title"><h3 id="season-players-title">Spielerstatistiken</h3><p class="muted">${tableLeague === 'EHL' ? 'Für die European League sind noch keine vollständigen Saisonwerte zu Toren und Strafminuten verfügbar.' : 'Die QHL-Saisonwerte der Spieler sind momentan nicht verfügbar.'}</p></section>`;
  const entries = players.map(([id, name]) => ({id, name, stats: season.players?.[id]})).filter(p => p.stats),
    ranking = (field, multiplier = 1) =>
      entries
        .filter(p => Number.isFinite(p.stats[field]) && p.stats[field] > 0)
        .map(p => ({...p, value: p.stats[field] * multiplier}))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'de'))
        .slice(0, 5);
  const leaders = (list, unit) =>
    `<ol class="player-leaders">${list
      .map((p, i) => {
        const rank = list.findIndex(x => x.value === p.value) + 1;
        return `<li><a href="#player/${p.id}" class="player-leader"><span class="leader-rank">${rank}</span><img src="assets/player-${p.id}.webp" width="600" height="400" loading="lazy" decoding="async" alt=""><span class="leader-name">${liveEscape(p.name)}<small>Nr. ${p.id}${unit === 'Min.' ? ' · ' + p.stats.twoMinutes + ' × 2 Minuten' : ''}</small></span><strong>${p.value}<small>${unit}</small></strong></a></li>`;
      })
      .join('')}</ol>`;
  const scorers = ranking('goals'),
    penalties = ranking('twoMinutes', 2);
  return `<section class="season-player-stats stats-block" aria-labelledby="season-players-title"><h3 id="season-players-title">Spielerstatistiken</h3><div class="player-leader-group"><h4>Top 5 Torschützen</h4>${scorers.length ? leaders(scorers, 'Tore') : '<p class="muted">Noch keine Tore erfasst.</p>'}</div><div class="player-leader-group"><h4>Meiste Strafminuten</h4>${penalties.length ? leaders(penalties, 'Min.') : '<p class="muted">Noch keine 2-Minuten-Strafen erfasst.</p>'}</div><p class="player-leader-note">QHL · Saison 2026/27 · ${season.teamGames} Spiele<br>Strafminuten aus 2-Minuten-Strafen; Disqualifikationen werden nicht zusätzlich als Minuten gezählt.<br>${ext(source, 'Quelle: SHV', '')} · ${updateLabel('players')}</p></section>`;
}
function seasonNumbers() {
  const list = games
    .filter(g => g.score && g.league === tableLeague && (g.home.includes('Kadetten') || g.away.includes('Kadetten')))
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  if (!list.length) return '';
  const stats = seasonSummary(list),
    home = seasonSummary(list.filter(g => g.home.includes('Kadetten'))),
    away = seasonSummary(list.filter(g => g.away.includes('Kadetten'))),
    avg = v => (v / stats.games).toLocaleString('de-CH', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
    balance = [
      [stats.wins, 'Siege', 'win'],
      [stats.draws, 'Unentschieden', 'draw'],
      [stats.losses, 'Niederlagen', 'loss']
    ],
    balanceLabel = `${stats.wins} Siege, ${stats.draws} Unentschieden, ${stats.losses} Niederlagen`;
  return `<section class="season-numbers"><h2>Kadetten – Saisonbilanz</h2><section class="season-overview stats-block" aria-labelledby="season-overview-title"><h3 id="season-overview-title">Saison auf einen Blick</h3><div class="season-balance"><div class="record-bar season-balance-bar" role="img" aria-label="${balanceLabel}">${balance.map(([n], i) => `<span class="record-${i}" style="width:${(n / stats.games) * 100}%"></span>`).join('')}</div><div class="season-balance-values">${balance.map(([n, label, state]) => `<div class="${state}"><strong>${n}</strong><span>${label}</span></div>`).join('')}</div></div><div class="season-splits">${[
    [home, 'Zu Hause'],
    [away, 'Auswärts']
  ]
    .map(
      ([r, label]) =>
        `<div class="season-split"><h4>${label}</h4><strong>${r.games}</strong><small>${r.games === 1 ? 'Spiel' : 'Spiele'}</small><p class="split-record" aria-label="${r.wins} Siege, ${r.draws} Unentschieden, ${r.losses} Niederlagen"><span class="win">${r.wins} S</span> · <span class="draw">${r.draws} U</span> · <span class="loss">${r.losses} N</span></p></div>`
    )
    .join(
      ''
    )}</div>${seasonJourney(list)}</section><section class="season-goal-stats stats-block" aria-labelledby="season-goals-title"><h3 id="season-goals-title">Torstatistiken</h3><div class="season-number-grid"><div><strong>${avg(stats.goals)}</strong><span>Tore pro Spiel im Schnitt</span></div><div><strong>${avg(stats.against)}</strong><span>Gegentore pro Spiel im Schnitt</span></div></div>${goalDifferenceChart(list)}</section>${seasonPlayerLeaders()}<p class="season-data-note">${tableLeague === 'QHL' ? 'QHL · Meisterschaft' : 'European League'} · Saison 2026/27<br>Aus ${stats.games} erfassten, abgeschlossenen Spielen berechnet. Testspiele sind ausgeschlossen.<br>${updateLabel('games')}</p></section>`;
}

function metric(label, a, b) {
  return `<div class="comparison"><strong>${a}</strong><span>${label}</span><strong>${b}</strong></div>`;
}
function matchStats(g) {
  if (verifiedReport(g)) return reportStats(g);
  if (g.id === 'bukarest')
    return `<h2>Das Spiel in Zahlen</h2><div class="panel">${statTeams(g)}${metric('Tore', 39, 32)}${metric('1. Halbzeit', 16, 16)}${metric('2. Halbzeit', 23, 16)}${metric('Strafminuten', 4, 4)}</div><p class="muted">Zweite Halbzeit aus End- und Halbzeitstand berechnet.</p><h2 class="subhead">Torschützen der Kadetten</h2><div class="scorers">${players
      .filter(p => goals[p[0]] > 0)
      .sort((a, b) => goals[b[0]] - goals[a[0]])
      .map(
        p =>
          `<a href="#player/${p[0]}"><span>${p[1]}${p[0] === 6 ? '<small>davon 3 Siebenmeter-Tore</small>' : ''}</span><strong>${goals[p[0]]}</strong></a>`
      )
      .join(
        ''
      )}</div><h2 class="subhead">Zwischen den Pfosten</h2><div class="facts"><div><span>Leon Bergmann</span><strong>12 Paraden · 38 %</strong></div><div><span>Mathieu Seravalli</span><strong>1 Parade · 8 %</strong></div></div><p class="notice">Wurfzahlen, Gegner-Torschützen und ein vollständiger Torverlauf sind nicht hinterlegt. Die Fangquoten stammen aus dem Vereinsbericht.</p>`;
  if (g.score)
    return `<h2>Endresultat</h2><div class="panel">${statTeams(g)}${metric('Tore', g.score[0], g.score[1])}</div><p class="notice">Weitere verifizierte Einzelstatistiken sind für dieses Spiel noch nicht hinterlegt.</p>`;
  return `<h2>Die Ausgangslage</h2><p class="muted">${updateLabel('table')}</p>${previewComparison(g)}<h2 class="subhead">Formkurve & Direktvergleich</h2>${recentSelector(g)}`;
}
