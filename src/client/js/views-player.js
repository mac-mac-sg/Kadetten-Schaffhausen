/* Spielerprofil. */
const shv = 'https://www.handball.ch/de/quickline-handball-league/';

function statFacts(items) {
  return `<div class="facts stat-facts">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
function playerStats(id) {
  const keeper = players.find(p => p[0] === id)?.[2] === 'Tor',
    p = updateState?.playerSeason?.players?.[id];
  const show = v => v === null || v === undefined ? '–' : String(v).replace('.', ',');
  const items = keeper
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
        ['Feldtore', p?.fieldGoals],
        ['Verwarnungen', p?.yellowCards],
        ['2-Minuten-Strafen', p?.twoMinutes],
        ['Disqualifikationen', p?.disqualifications]
      ];
  const note = !p
    ? 'Für diesen Spieler veröffentlicht der SHV aktuell keine QHL-Saisonstatistik. Fehlende Werte erscheinen als –.'
    : '– = von der Quelle nicht verfügbar. Einsätze gemäss offiziellem Spielbericht; keine Aussage zur Einsatzdauer.' + (keeper ? ' Paraden und Fangquoten liefert die SHV-Saisonquelle nicht.' : '');
  return `<p class="stat-scope">QHL · Saisonwerte</p>${statFacts(items.map(([k, v]) => [k, show(v)]))}<p class="stat-note">${note}</p><details class="source-details"><summary>Quelle & Datenstand</summary><p>${updateLabel('players')} · ${ext(updateState?.playerSeason?.source || 'https://www.handball.ch/de/matchcenter/teams/41473', 'SHV', '')}</p></details>`;
}
function profile(id) {
  const p = players.find(x => x[0] === id);
  if (!p) return notFound();
  const bio = playerBios[id]?.facts || [];
  const last = p[1].split(' ').at(-1);
  return `<section class="player-story">${backLink('#season/squad', 'Zurück zum Kader', 'profile-back')}<section class="profile-slide profile-intro" id="profile-intro"><div class="portrait"><img src="assets/player-${id}.webp" alt="${p[1]}" width="600" height="400" fetchpriority="high"><div><p>${p[1].split(' ').slice(0, -1).join(' ')}</p><h1>${last}</h1><span>${p[2]}</span><b>${id}</b></div></div><div class="profile-facts">${statFacts(bio)}<details class="source-details"><summary>Quelle & Datenstand</summary><p>${ext(playerBios[id]?.url || base + '1-mannschaft/', 'Offizieller Steckbrief', '')} · Stand 02.10.2026</p></details></div></section><section class="profile-slide player-season-screen" id="profile-season"><div class="profile-minihero"><img src="assets/player-${id}.webp" alt="" width="600" height="400" loading="lazy" decoding="async"><div><strong>${last}</strong><b>${id}</b></div></div><div class="season-stats-content"><h2>Saison 2026/27</h2><div id="player-stats" aria-live="polite">${playerStats(id)}</div></div></section><nav class="profile-jumps" aria-label="Spielerabschnitte">${[
    ['intro', 'Steckbrief'],
    ['season', 'Saisonwerte']
  ]
    .map(
      ([x, t], i) =>
        `<button data-section="profile-${x}" aria-label="${t}" title="${t}" aria-pressed="${i === 0}"><span></span></button>`
    )
    .join('')}</nav></section>`;
}
