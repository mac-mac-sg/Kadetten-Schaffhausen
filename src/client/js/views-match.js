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
  return `<div class="match-hero"><img src="${photoUrl(g.image)}" alt="${g.id === 'bukarest' ? 'Jubel bei den Kadetten' : g.id === 'stgallen' ? 'Frederik Tilsted im Spiel' : 'Die Mannschaft der Kadetten'}" fetchpriority="high"><div><p class="eyebrow">${league(g)} · ${g.score ? date(g) : matchDay(g)}</p><h1>${g.id === 'bukarest' ? 'EIN START<br>NACH MASS.' : g.id === 'stgallen' ? 'PUNKTE AUS<br>ST. GALLEN.' : 'ZUSAMMEN.<br>FÜR ORANGE.'}</h1></div></div><div class="content narrow">${matchdayDetail(g)}<h2>${g.score ? 'Der Rückblick' : g.home + ' gegen ' + g.away}</h2><p class="lead">${g.id === 'bukarest' ? 'Nach dem 16:16 zur Pause entscheiden die Kadetten die Partie gegen CSM Bucuresti mit 39:32 für sich. Odinn Rikhardsson erzielt 14 Tore.' : g.id === 'stgallen' ? 'Die Kadetten gewinnen auswärts bei St. Otmar mit 31:25 und nehmen zwei Punkte aus der Kreuzbleiche mit.' : g.id === 'staefa' && !g.score ? 'Nach dem erfolgreichen Europacup-Auftakt geht es in der QHL gegen Handball Stäfa weiter. Die Kadetten empfangen das Team in der BBC Arena.' : g.score ? `${g.home} – ${g.away}: ${g.score.join(':')}.` : `${g.home} trifft am ${date(g)} auf ${g.away}. Anspielzeit: ${g.time || 'noch offen'} Uhr.`}</p>${!g.score?matchPreviewSlot(g,'kadetten'):''}${g.home==='Kadetten Schaffhausen'?`<div data-match-programme="${liveEscape(g.id)}"></div>`:''}<div class="facts ${!g.score ? 'match-preview-facts' : ''}">${!g.score ? `<div><span>Spieldatum</span><strong>${matchDay(g)}</strong></div>` : ''}<div><span>${g.score ? 'Status' : 'Anspielzeit'}</span><strong>${g.score ? 'Beendet' : g.time ? g.time + ' Uhr' : 'Noch nicht hinterlegt'}</strong></div>${venueFact(g)}${reportFacts(g)}${g.id === 'bukarest' ? '<div><span>Zuschauer</span><strong>1’083</strong></div><div><span>Kadetten-Toptorschütze</span><strong>Rikhardsson · 14 Tore</strong></div>' : ''}</div><div class="actions">${ext(g.url, g.url.includes('matchcenter') ? 'Offizieller Spielplan' : g.score ? 'Originalbericht lesen' : 'Offizielle Spielinformationen')}</div>${g.score?reportHistory(g):''}</div>`;
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
function seasonBalance(wins, draws, losses) {
 const total=wins+draws+losses, values=[[wins,'Siege','win'],[draws,'Unentschieden','draw'],[losses,'Niederlagen','loss']];
 return `<div class="season-balance"><div class="record-bar season-balance-bar" role="img" aria-label="${wins} Siege, ${draws} Unentschieden, ${losses} Niederlagen">${values.map(([n],i)=>`<span class="record-${i}" style="width:${total?n/total*100:0}%"></span>`).join('')}</div><div class="season-balance-values">${values.map(([n,label,state])=>`<div class="${state}"><strong>${n}</strong><span>${label}</span></div>`).join('')}</div></div>`;
}
function seasonSplit(label, played, wins, draws, losses) {
 return `<div class="season-split"><h4>${label}</h4><strong>${played}</strong><small>${played===1?'Spiel':'Spiele'}</small><p class="split-record" aria-label="${wins} Siege, ${draws} Unentschieden, ${losses} Niederlagen"><span class="win">${wins} S</span> · <span class="draw">${draws} U</span> · <span class="loss">${losses} N</span></p></div>`;
}
function seasonNumbers() {
  const list = games
    .filter(g => g.score && g.league === tableLeague && (g.home.includes('Kadetten') || g.away.includes('Kadetten')))
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  if (!list.length) return '';
  const stats = seasonSummary(list),
    home = seasonSummary(list.filter(g => g.home.includes('Kadetten'))),
    away = seasonSummary(list.filter(g => g.away.includes('Kadetten'))),
    avg = v => goalAverage(v, stats.games);
  return `<section class="season-numbers"><h2>Kadetten – Saisonbilanz</h2><section class="season-overview stats-block" aria-labelledby="season-overview-title"><h3 id="season-overview-title">Saison auf einen Blick</h3>${seasonBalance(stats.wins,stats.draws,stats.losses)}<div class="season-splits">${seasonSplit('Zu Hause',home.games,home.wins,home.draws,home.losses)}${seasonSplit('Auswärts',away.games,away.wins,away.draws,away.losses)}</div>${seasonJourney(list)}</section><section class="season-goal-stats stats-block" aria-labelledby="season-goals-title"><h3 id="season-goals-title">Torstatistiken</h3><div class="season-number-grid"><div><strong>${avg(stats.goals)}</strong><span>Tore pro Spiel im Schnitt</span></div><div><strong>${avg(stats.against)}</strong><span>Gegentore pro Spiel im Schnitt</span></div></div>${goalDifferenceChart(list)}</section>${seasonPlayerLeaders()}<p class="season-data-note">${tableLeague === 'QHL' ? 'QHL · Meisterschaft' : 'European League'} · Saison 2026/27<br>Aus ${stats.games} erfassten, abgeschlossenen Spielen berechnet. Testspiele sind ausgeschlossen.<br>${updateLabel('games')}</p></section>`;
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

function matchPreviewSlot(g,club){
 return `<section class="ai-match-preview" data-match-preview="${liveEscape(club+'/'+g.id)}" aria-label="KI-Match-Vorschau"><p class="muted" role="status">Match-Vorschau wird geladen …</p></section>`;
}
async function loadMatchPreview(){
 const target=document.querySelector('[data-match-preview]');if(!target)return;
 const route=target.dataset.matchPreview;
 try{
  const response=await apiFetch('/api/previews/'+route);if(!response.ok)throw Error('Unavailable');
  const p=await response.json();
  if(!target.isConnected||target.dataset.matchPreview!==route)return;
  if(!Array.isArray(p.paragraphs)||!Array.isArray(p.sources))throw Error('Invalid preview');
  const stamp=new Date(p.generatedAt).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  target.innerHTML=`<p class="eyebrow">KI-Match-Vorschau</p><h3>${liveEscape(p.headline)}</h3>${p.paragraphs.map(text=>`<p>${liveEscape(text)}</p>`).join('')}<details><summary>Quellen & Datenstand</summary><p class="muted">Mit KI aus den verlinkten Quellen erstellt · ${liveEscape(stamp)} Uhr. Einschätzungen sind keine Ergebnisprognose.</p><ul>${p.sources.filter(s=>/^https:\/\//.test(s.url)).map(s=>`<li><a href="${liveEscape(s.url)}" target="_blank" rel="noopener noreferrer">${liveEscape(s.label)}</a></li>`).join('')}</ul></details>`;
 }catch{if(target.isConnected)target.innerHTML='<p class="muted">Die ausführliche Match-Vorschau ist noch nicht verfügbar. Die bestätigten Spielinformationen findest du hier.</p>'}
}

let programmeDialog, programmeCleanup;
function closeMatchProgramme(){
 if(!programmeDialog)return;
 const dialog=programmeDialog;programmeDialog=null;
 programmeCleanup?.();programmeCleanup=null;
 if(dialog.open)dialog.close();dialog.remove();document.body.classList.remove('programme-open');
}
async function loadMatchProgramme(){
 const slot=document.querySelector('[data-match-programme]');if(!slot)return;
 try{
  const response=await apiFetch('/api/programmes/'+slot.dataset.matchProgramme);if(!response.ok)return;
  const p=await response.json();if(!slot.isConnected||!/^\/api\/programmes\/[a-zA-Z0-9_-]+\/pdf\?v=[a-f0-9]{64}$/.test(p.pdfPath))return;
  slot.innerHTML='<button class="button programme-button" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3h9l4 4v14H6Z M15 3v5h4 M9 12h7 M9 16h7"/></svg>Matchprogramm lesen</button>';
  slot.querySelector('button').onclick=e=>openMatchProgramme(p,e.currentTarget);
 }catch{/* An unavailable optional programme never replaces the fixture. */}
}
async function openMatchProgramme(p,trigger){
 closeMatchProgramme();
 const dialog=document.createElement('dialog');programmeDialog=dialog;dialog.className='programme-dialog';dialog.dataset.route=activeClub+location.hash;
 const url=kadettenApiOrigin+p.pdfPath;
 dialog.innerHTML=`<header class="programme-toolbar"><div><h2 id="programme-title">Matchprogramm</h2><p>${liveEscape(p.away)} · ${liveEscape(p.date.split('-').reverse().join('.'))}</p></div><button type="button" class="programme-close" aria-label="Matchprogramm schliessen" autofocus>×</button></header><div class="programme-tools"><div><button type="button" data-pdf-zoom="-1" aria-label="PDF verkleinern">−</button><output aria-label="Zoomstufe">100 %</output><button type="button" data-pdf-zoom="1" aria-label="PDF vergrössern">+</button></div><a href="${liveEscape(url)}" target="_blank" rel="noopener noreferrer">PDF extern öffnen ↗</a></div><div class="programme-pages" tabindex="0" aria-label="Seiten des Matchprogramms"><p class="programme-status" role="status">Matchprogramm wird geladen …</p></div>`;
 dialog.setAttribute('aria-labelledby','programme-title');document.body.append(dialog);document.body.classList.add('programme-open');dialog.showModal();
 const close=()=>{closeMatchProgramme();const button=trigger.isConnected?trigger:document.querySelector(`[data-match-programme="${p.id}"] button`);(button||document.getElementById("app"))?.focus({preventScroll:true})};
 dialog.querySelector('.programme-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 const root=dialog.querySelector('.programme-pages'),status=root.querySelector('.programme-status');
 let task,doc,observer,zoom=1,disposed=false,resizeTimer;const states=[];const controller=new AbortController();
 programmeCleanup=()=>{disposed=true;controller.abort();observer?.disconnect();clearTimeout(resizeTimer);window.removeEventListener('resize',resize);for(const s of states)s.render?.cancel();task?.destroy().catch(()=>{});};
 const updateZoom=()=>{dialog.querySelector('output').textContent=Math.round(zoom*100)+' %';dialog.querySelector('[data-pdf-zoom="-1"]').disabled=zoom<=1;dialog.querySelector('[data-pdf-zoom="1"]').disabled=zoom>=2;};
 async function draw(s){
  if(disposed||!s.visible)return;const generation=++s.generation;s.render?.cancel();
  try{
   if(s.render)await s.render.promise.catch(()=>{});
   const page=await doc.getPage(s.number);if(disposed||generation!==s.generation||!s.visible)return;
   const width=Math.min(1000,root.clientWidth-32)*zoom,viewport=page.getViewport({scale:width/page.getViewport({scale:1}).width}),ratio=Math.min(window.devicePixelRatio||1,1.5);
   s.el.style.width=width+'px';s.el.style.minHeight=viewport.height+'px';
   s.canvas.width=Math.round(viewport.width*ratio);s.canvas.height=Math.round(viewport.height*ratio);s.canvas.style.width=viewport.width+'px';s.canvas.style.height=viewport.height+'px';
   s.render=page.render({canvasContext:s.canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],annotationMode:0});await s.render.promise;
   if(!s.text.textContent){const content=await page.getTextContent();s.text.textContent=content.items.map(x=>x.str).join(' ');}
   if(!disposed&&generation===s.generation){s.el.classList.add('is-loaded');status.textContent='';}
  }catch(e){if(!disposed&&e.name!=='RenderingCancelledException'){status.textContent='Eine Seite konnte nicht angezeigt werden. Du kannst das PDF extern öffnen.';}}
 }
 const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{for(const s of states)if(s.visible)draw(s)},180)};
 dialog.querySelectorAll('[data-pdf-zoom]').forEach(button=>button.onclick=()=>{zoom=Math.max(1,Math.min(2,zoom+Number(button.dataset.pdfZoom)*.25));updateZoom();for(const s of states)if(s.visible)draw(s)});updateZoom();
 try{
  const pdfjs=await import('../vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',document.querySelector('script[src^="js/views-match.js"]').src).href;
  const response=await apiFetch(p.pdfPath,{signal:controller.signal});if(!response.ok)throw Error('PDF unavailable');
  const data=new Uint8Array(await response.arrayBuffer());if(disposed)return;
  task=pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,useWasm:false});doc=await task.promise;if(disposed)return;
  if(doc.numPages>100)throw Error('Too many pages');status.textContent=doc.numPages+' Seiten · Erste Seite wird geladen …';
  for(let number=1;number<=doc.numPages;number++){
   const el=document.createElement('section');el.className='programme-page';el.setAttribute('aria-label','Seite '+number);el.innerHTML=`<span class="programme-page-number">Seite ${number}</span><canvas aria-hidden="true"></canvas><p class="programme-page-text"></p>`;root.append(el);
   const s={el,number,canvas:el.querySelector('canvas'),text:el.querySelector('p'),visible:false,generation:0,render:null};states.push(s);
  }
  observer=new IntersectionObserver(entries=>{for(const e of entries){const s=states.find(s=>s.el===e.target);s.visible=e.isIntersecting;if(s.visible)draw(s);else{++s.generation;s.render?.cancel();s.canvas.width=0;s.canvas.height=0;s.el.classList.remove('is-loaded');}}},{root,rootMargin:'300px 0px'});
  states.forEach(s=>observer.observe(s.el));window.addEventListener('resize',resize);
 }catch(e){if(!disposed){status.textContent='Das Matchprogramm kann gerade nicht in der App angezeigt werden. Bitte nutze «PDF extern öffnen».';dialog.querySelectorAll('[data-pdf-zoom]').forEach(b=>b.disabled=true);}}
}
