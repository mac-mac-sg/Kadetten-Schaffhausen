/* Spielerprofil. */
const shv = 'https://www.handball.ch/de/quickline-handball-league/';

function statFacts(items) {
  return `<div class="facts stat-facts">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
function playerStats(id) {
  const keeper = players.find(p => p[0] === id)?.[2] === 'Tor',
    p = updateState?.playerSeason?.players?.[id];
  const show = v => v === null || v === undefined ? '–' : String(v).replace('.', ',');
  const metric = (label, value, style = '') => `<div class="bento-metric ${style}"><span>${label}</span><strong>${show(value)}</strong></div>`;
  const knownGoals = Number.isFinite(p?.goals) && p.goals > 0 &&
    Number.isFinite(p?.fieldGoals) && Number.isFinite(p?.sevenMeterGoals) &&
    p.fieldGoals >= 0 && p.sevenMeterGoals >= 0 && p.fieldGoals + p.sevenMeterGoals === p.goals;
  const share = knownGoals ? Math.round(p.sevenMeterGoals / p.goals * 100) : null;
  const scoring = keeper
    ? `${metric('Einsätze', p?.games, 'bento-primary bento-wide')}<section class="bento-panel bento-wide keeper-panel"><h3>Zwischen den Pfosten</h3><div class="keeper-metrics">${metric('Paraden', null)}${metric('Paradenquote', null)}${metric('Gehaltene 7-Meter', null)}</div><p>Die QHL-Saisonquelle veröffentlicht diese Torwartwerte nicht.</p></section>`
    : `${metric('Tore', p?.goals, 'bento-primary')}${metric('Einsätze', p?.games)}${metric('Tore pro Spiel', p?.goalsPerGame, 'bento-average bento-wide')}<section class="bento-panel bento-wide"><h3>Torverteilung</h3><div class="bento-scoring"><div class="bento-legend">${metric('Feldtore', p?.fieldGoals)}${metric('7-Meter-Tore', p?.sevenMeterGoals)}</div>${knownGoals ? `<div class="bento-ring" style="--seven-meter-share:${share}%" role="img" aria-label="${share} Prozent der Tore durch 7-Meter"><div><strong>${share}%</strong><span>7-Meter-Anteil</span></div></div>` : `<p class="bento-chart-note">${p?.goals === 0 ? 'Noch keine Tore' : 'Torverteilung nicht verfügbar'}</p>`}</div></section>`;
  const dashboard = `<div class="player-bento${keeper ? ' player-bento-keeper' : ''}">${scoring}<section class="bento-panel bento-wide"><h3>Strafen</h3><div class="bento-penalties">${metric('Verwarnungen', p?.yellowCards)}${metric('2-Minuten-Strafen', p?.twoMinutes)}${metric('Disqualifikationen', p?.disqualifications)}</div></section></div>`;
  const note = !p
    ? 'Für diesen Spieler veröffentlicht der SHV aktuell keine QHL-Saisonstatistik. Fehlende Werte erscheinen als –.'
    : '– = von der Quelle nicht verfügbar. Einsätze gemäss offiziellem Spielbericht; keine Aussage zur Einsatzdauer.' + (keeper ? ' Paraden und Fangquoten liefert die SHV-Saisonquelle nicht.' : '');
  return `<p class="stat-scope">QHL · Saisonwerte</p>${dashboard}<p class="stat-note">${note}</p><details class="source-details"><summary>Quelle & Datenstand</summary><p>${updateLabel('players')} · ${ext(updateState?.playerSeason?.source || 'https://www.handball.ch/de/matchcenter/teams/41473', 'SHV', '')}</p></details>`;
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
