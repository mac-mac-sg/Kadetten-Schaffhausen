/* Spielerprofil. */
const shv = 'https://www.handball.ch/de/quickline-handball-league/';

function statFacts(items) {
  return `<div class="facts stat-facts">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
let playerCompetition = 'QHL';
function playerStats(id) {
  const keeper = players.find(p => p[0] === id)?.[2] === 'Tor',
    qhl = playerCompetition === 'QHL',
    p = updateState?.playerSeason?.players?.[id],
    ehl = updateState?.ehlPlayerSeason,
    e = ehl?.players?.[id];
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
          ['Paraden', null],
          ['Paradenquote', null],
          ['Gehaltene 7-Meter', null],
          ['Einsätze', null],
          ['2-Minuten-Strafen', e?.twoMinutes],
          ['Disqualifikationen', e?.disqualifications]
        ]
      : [
          ['Tore', e?.goals],
          ['7-Meter-Tore', null],
          ['Wurfquote', null],
          ['2-Minuten-Strafen', e?.twoMinutes],
          ['Verwarnungen', e?.yellowCards],
          ['Disqualifikationen', e?.disqualifications]
        ];
  return `<p class="stat-scope">${qhl ? 'QHL · Saisonwerte' : 'European League · EHF-Werte 2026/27'}</p>${statFacts(items.map(([k, v]) => [k, show(v)]))}<p class="stat-note">${qhl ? '– = von der Quelle nicht verfügbar. Einsätze gemäss offiziellem Spielbericht; keine Aussage zur Einsatzdauer.' : '– = von der EHF-Teamseite nicht verlässlich verfügbar. Werte des dort ausgewählten Wettbewerbsabschnitts.'}</p><details class="source-details"><summary>Quelle & Datenstand</summary><p>${qhl ? updateLabel('players') : ehl?.checkedAt ? (ehl.ok === false ? 'Letzter gültiger Stand: ' : 'Aktualisiert: ') + new Date(ehl.checkedAt).toLocaleString('de-CH', {timeZone: 'Europe/Zurich'}) + ' Uhr' : 'Noch keine EHF-Saisonwerte geladen'} · ${ext(qhl ? updateState?.playerSeason?.source || 'https://www.handball.ch/de/matchcenter/teams/41473' : ehl?.source || 'https://ehfel.eurohandball.com/men/2026-27/clubs/details/uyEpUicNjwv8hCX9B7A3sg/KadettenSchaffhausen/', qhl ? 'SHV' : 'EHF', '')}</p></details>`;
}
function profile(id) {
  const p = players.find(x => x[0] === id);
  if (!p) return notFound();
  const bio = playerBios[id]?.facts || [];
  const last = p[1].split(' ').at(-1);
  return `<section class="player-story">${backLink('#season/squad', 'Zurück zum Kader', 'profile-back')}<section class="profile-slide profile-intro" id="profile-intro"><div class="portrait"><img src="assets/player-${id}.webp" alt="${p[1]}" width="600" height="400" fetchpriority="high"><div><p>${p[1].split(' ').slice(0, -1).join(' ')}</p><h1>${last}</h1><span>${p[2]}</span><b>${id}</b></div></div><div class="profile-facts">${statFacts(bio)}<details class="source-details"><summary>Quelle & Datenstand</summary><p>${ext(playerBios[id]?.url || base + '1-mannschaft/', 'Offizieller Steckbrief', '')} · Stand 02.10.2026</p></details></div></section><section class="profile-slide player-season-screen" id="profile-season"><div class="profile-minihero"><img src="assets/player-${id}.webp" alt="" width="600" height="400" loading="lazy" decoding="async"><div><strong>${last}</strong><b>${id}</b></div></div><div class="season-stats-content"><h2>Saison 2026/27</h2><div class="toggle" aria-label="Wettbewerb">${['QHL', 'EHL'].map(c => `<button data-player-competition="${c}" aria-pressed="${playerCompetition === c}">${c === 'QHL' ? 'Meisterschaft' : 'European League'}</button>`).join('')}</div><div id="player-stats" aria-live="polite">${playerStats(id)}</div></div></section><nav class="profile-jumps" aria-label="Spielerabschnitte">${[
    ['intro', 'Steckbrief'],
    ['season', 'Saisonwerte']
  ]
    .map(
      ([x, t], i) =>
        `<button data-section="profile-${x}" aria-label="${t}" title="${t}" aria-pressed="${i === 0}"><span></span></button>`
    )
    .join('')}</nav></section>`;
}
