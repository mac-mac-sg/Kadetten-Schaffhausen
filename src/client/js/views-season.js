/* Saison: Spielplan, Kalender, Tabelle und Kader. */
function season(tab) {
  const calendarView = tab === 'games' && mode === 'calendar';
  const title = {games: 'Spiele', table: 'Tabelle', squad: 'Kader'}[tab];
  return `<section class="content season ${tab === 'table' ? 'standings-season' : ''} ${calendarView ? 'calendar-season' : ''}"><div class="season-header"><p class="eyebrow">1. Mannschaft · Saison 2026/27</p><h1>${title}</h1>${tab === 'games' ? gameControls() + (mode === 'calendar' ? calendarNavigation() : '') : ''}</div>${tab === 'table' ? standing() : tab === 'squad' ? squad() : gameList()}</section>${footer()}`;
}
function gameControls() {
  return `<div class="controls"><label>Wettbewerb <select id="competition">${['Alle', 'QHL', 'EHL', 'Testspiel', 'Falkencup'].map(c => `<option ${c === competition ? 'selected' : ''}>${c}</option>`).join('')}</select></label><div class="toggle"><button data-mode="list" aria-pressed="${mode === 'list'}">Liste</button><button data-mode="calendar" aria-pressed="${mode === 'calendar'}">Kalender</button></div></div>`;
}
function gameList() {
  if (mode === 'calendar') return `<div class="calendar-panel">${calendar()}</div>`;
  const ordered = games
    .filter(g => competition === 'Alle' || g.league === competition)
    .slice()
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Zurich'});
  const next = ordered.find(g => !g.score && g.date >= today);
  return `<p class="muted">Saison 2026/27 · ${games.length} im Vereins-Matchcenter veröffentlichte Partien</p>${mode === 'calendar' ? calendar() : `<div class="games game-timeline">${ordered.map(g => card(g, g === next)).join('')}</div><aside class="notice"><strong>Weiterer Saisonverlauf</strong><p>Für die Zeit nach Dezember sind im Vereins-Matchcenter noch keine weiteren konkreten Paarungen veröffentlicht. Weitere Liga-, Cup- und Europacuppartien werden ergänzt, sobald Gegner und Termine feststehen. Datenstand: 02.10.2026.</p></aside>`}`;
}
function calendarNavigation() {
  return `<div class="calendar-head"><button id="prev-month" aria-label="Vorheriger Monat">‹</button><h2>${new Date(calendarYear, month, 1).toLocaleDateString('de-CH', {month: 'long', year: 'numeric'})}</h2><button id="next-month" aria-label="Nächster Monat">›</button></div>`;
}
function calendar() {
  const days = new Date(calendarYear, month + 1, 0).getDate(),
    offset = (new Date(calendarYear, month, 1).getDay() + 6) % 7,
    today = swissToday();
  return `<div class="calendar match-calendar" style="--calendar-weeks:${Math.ceil((offset + days) / 7)}">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<b>${d}</b>`).join('')}${'<div class="day empty-day" aria-hidden="true"></div>'.repeat(offset)}${Array.from(
    {length: days},
    (_, i) => {
      const day = `${calendarYear}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
        found = games.filter(g => g.date === day && (competition === 'Alle' || g.league === competition));
      return `<div class="day ${found.length ? 'has-game' : ''} ${day === today ? 'today' : ''}">${
        found.length
          ? `<span class="fixture-date">${i + 1}</span>${found
              .map(g => {
                const home = g.home.includes('Kadetten'),
                  opponent = home ? g.away : g.home,
                  label = `${date(g)} · ${home ? 'Heimspiel' : 'Auswärtsspiel'} gegen ${opponent}${g.time ? ' · ' + g.time + ' Uhr' : ''}${g.score ? ' · Endstand ' + g.score.join(':') : ''}`;
                return `<a class="calendar-fixture ${home ? 'fixture-home' : 'fixture-away'}" href="#match/${liveEscape(g.id)}/overview" aria-label="${liveEscape(label)}" title="${liveEscape(label)}"><span class="calendar-crest">${badge(opponent)}</span><span class="fixture-location" aria-hidden="true"></span></a>`;
              })
              .join('')}`
          : `<span class="calendar-date">${i + 1}</span>`
      }</div>`;
    }
  ).join(
    ''
  )}${'<div class="day empty-day" aria-hidden="true"></div>'.repeat((7 - ((offset + days) % 7)) % 7)}</div><p class="calendar-legend"><span class="legend-home">Heimspiel</span><span class="legend-away">Auswärtsspiel</span></p><p class="muted calendar-hint">Gegnerlogo antippen für Spielinfos und Resultat. ${ext(base + 'matchcenter/', 'Offizieller Spielplan', '')}</p>`;
}
function recordBar(name, total) {
  const r =
    tableLeague === 'QHL'
      ? teamRecords[name]
      : name === 'Kadetten Schaffhausen' || name === 'HC Izvidac'
        ? [1, 0, 0]
        : [0, 0, 1];
  if (!r || !total) return '';
  const label = `${r[0]} Siege, ${r[1]} Unentschieden, ${r[2]} Niederlagen`;
  return `<div class="record-bar" role="img" aria-label="${label}" title="${label}">${r.map((n, i) => `<span class="record-${i}" style="width:${(n / total) * 100}%"></span>`).join('')}</div><small class="record-text">${r[0]} S · ${r[1]} U · ${r[2]} N</small>`;
}
function standing() {
  return `<div class="toggle league-toggle">${['QHL', 'EHL'].map(l => `<button data-league="${l}" aria-pressed="${l === tableLeague}">${l === 'QHL' ? 'QHL' : 'European League'}</button>`).join('')}</div><p class="muted">${tableLeague === 'QHL' ? 'Hauptrunde' : 'Gruppenphase · Gruppe C'} · ${updateLabel('table')}</p><p class="record-legend"><span>Siege</span><span>Unentschieden</span><span>Niederlagen</span></p><div class="table-wrap"><table class="standings-table"><colgroup><col class="rank-col"><col class="team-col"><col class="games-col"><col class="goals-col"><col class="diff-col"><col class="points-col"></colgroup><thead><tr><th aria-label="Rang">#</th><th>Team</th><th>Sp.</th><th>Tore</th><th>+/−</th><th>Pkt.</th></tr></thead><tbody>${tables[tableLeague].map((r, i) => `<tr class="${r[0].includes('Kadetten') ? 'our-team' : ''}"><td>${i + 1}</td><th scope="row"><div class="table-team">${badge(r[0])}<div><span class="standing-name">${r[0]}</span>${recordBar(r[0], r[1])}<small class="standing-meta">${r[1]} Spiele · ${r[2] - r[3] > 0 ? '+' : ''}${r[2] - r[3]} Tore</small></div></div></th><td>${r[1]}</td><td>${r[2]}:${r[3]}</td><td>${r[2] - r[3] > 0 ? '+' : ''}${r[2] - r[3]}</td><td><strong>${r[4]}</strong></td></tr>`).join('')}</tbody></table></div>${seasonNumbers()}`;
}

function playerCard(p) {
  return `<a class="player-card" href="#player/${p[0]}"><img src="assets/player-${p[0]}.jpg" alt="${p[1]}" loading="lazy"><div><span>${p[1].split(' ').slice(0, -1).join(' ')}</span><strong>${p[1].split(' ').at(-1)}</strong><b>${p[0]}</b></div></a>`;
}
function squad() {
  return ['Tor', 'Flügel', 'Rückraum', 'Kreis']
    .map(
      group =>
        `<h2 class="subhead">${group === 'Tor' ? 'Torhüter' : group}</h2><div class="players">${players
          .filter(p => p[2].startsWith(group))
          .map(playerCard)
          .join('')}</div>`
    )
    .join('');
}
