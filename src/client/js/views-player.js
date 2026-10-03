/* Spielerprofil. */
const shv = 'https://www.handball.ch/de/quickline-handball-league/';

function statFacts(items) {
  return `<div class="facts stat-facts">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
let playerCompetition = 'QHL';
function playerStats(id) {
  const keeper = players.find(p => p[0] === id)?.[2] === 'Tor',
    qhl = playerCompetition === 'QHL',
    p = updateState?.playerSeason?.players?.[id];
  const show = (v, suffix = '') => (v === null || v === undefined ? '–' : String(v).replace('.', ',') + suffix);
  const items = qhl
    ? keeper
      ? [
          ['Einsätze', p?.games],
          ['Paraden', null],
          ['Paradenquote', null],
          ['Gehaltene 7-Meter', null],
          ['2-Minuten-Strafen', p?.twoMinutes],
          ['Disqualifikationen', p?.disqualifications]
        ]
      : [
          ['Tore', p?.goals],
          ['Einsätze', p?.games],
          ['Tore pro Spiel', p?.goalsPerGame],
          ['7-Meter-Tore', p?.sevenMeterGoals],
          ['2-Minuten-Strafen', p?.twoMinutes],
          ['Disqualifikationen', p?.disqualifications]
        ]
    : keeper
      ? [
          ['Paraden', id === 1 ? 12 : id === 16 ? 1 : null],
          ['Paradenquote', id === 1 ? '38 %' : id === 16 ? '8 %' : null],
          ['Gehaltene 7-Meter', null],
          ['Einsätze', null]
        ]
      : [
          ['Tore', Object.hasOwn(goals, id) ? goals[id] : null],
          ['7-Meter-Tore', id === 6 ? 3 : null],
          ['Wurfquote', null],
          ['2-Minuten-Strafen', null]
        ];
  return `<p class="stat-scope">${qhl ? 'QHL · Saisonwerte' : 'European League · bisher nur Bukarest erfasst'}</p>${statFacts(items.map(([k, v]) => [k, show(v)]))}<p class="stat-note">${qhl ? '– = von der Quelle nicht verfügbar. Einsätze gemäss offiziellem Spielbericht; keine Aussage zur Einsatzdauer.' : '– = noch nicht verifiziert. Die Werte beziehen sich auf das Spiel vom 30.09.2026, nicht auf eine vollständig erfasste Saison.'}</p><p class="source">${qhl ? updateLabel('players') : 'Stand 02.10.2026'} · ${ext(qhl ? updateState?.playerSeason?.source || 'https://www.handball.ch/de/matchcenter/teams/41473' : report, qhl ? 'SHV' : 'Vereinsbericht', '')}</p>${qhl ? '' : '<a class="text-link" href="#match/bukarest/stats">Zum erfassten Spiel</a>'}`;
}
function profile(id) {
  const p = players.find(x => x[0] === id);
  if (!p) return notFound();
  const bio = playerBios[id]?.facts || [];
  const last = p[1].split(' ').at(-1);
  return `<section class="player-story"><a href="#season/squad" class="profile-back" aria-label="Zurück zum Kader">‹ <span>Kader</span></a><section class="profile-slide profile-intro" id="profile-intro"><div class="portrait"><img src="assets/player-${id}.jpg" alt="${p[1]}"><div><p>${p[1].split(' ').slice(0, -1).join(' ')}</p><h1>${last}</h1><span>${p[2]}</span><b>${id}</b></div></div><div class="profile-facts">${statFacts(bio)}<p class="source">${ext(playerBios[id]?.url || base + '1-mannschaft/', 'Offizieller Steckbrief', '')} · Stand 02.10.2026</p></div></section><section class="profile-slide player-season-screen" id="profile-season"><div class="profile-minihero"><img src="assets/player-${id}.jpg" alt=""><div><strong>${last}</strong><b>${id}</b></div></div><div class="season-stats-content"><h2>Saison 2026/27</h2><div class="toggle" aria-label="Wettbewerb">${['QHL', 'EHL'].map(c => `<button data-player-competition="${c}" aria-pressed="${playerCompetition === c}">${c === 'QHL' ? 'Meisterschaft' : 'European League'}</button>`).join('')}</div><div id="player-stats" aria-live="polite">${playerStats(id)}</div></div></section><nav class="profile-jumps" aria-label="Spielerabschnitte">${[
    ['intro', 'Steckbrief'],
    ['season', 'Saisonwerte']
  ]
    .map(
      ([x, t], i) =>
        `<button data-section="profile-${x}" aria-label="${t}" title="${t}" aria-pressed="${i === 0}"><span></span></button>`
    )
    .join('')}</nav></section>`;
}
