/* Spielerprofil. */
const shv = 'https://www.handball.ch/de/quickline-handball-league/';

function statFacts(items) {
  return `<div class="facts stat-facts">${items.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
function playerRecentFixtures() {
  return games.filter(g => g.league === 'QHL' && g.score && g.date <= swissToday()).sort((a,b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))).slice(0,5).reverse();
}
function playerRecentStats(id) {
  const shvId = updateState?.playerSeason?.players?.[id]?.shvPlayerId;
  return playerRecentFixtures().map(g => {
    const r = verifiedReport(g), team = r?.teams?.find(t => t.id === handballTeamId());
    const p = shvId ? team?.players?.find(p => String(p.id) === String(shvId)) : null;
    return {game:g, player:p};
  });
}
function playerMiniBars(entries, key, label, percentage = false) {
  const values = entries.map(e => {
    const p=e.player;
    if(percentage)return Number.isFinite(p?.saves) && p.keeperShots > 0 && p.saves <= p.keeperShots ? p.saves / p.keeperShots * 100 : null;
    return Number.isFinite(p?.[key]) && p[key]>=0 ? p[key] : null;
  });
  if(!values.some(v=>v!==null))return '';
  const maximum=percentage?100:Math.max(...values.filter(v=>v!==null),1);
  return `<div class="player-mini-bars" aria-label="${label}: letzte ${entries.length} QHL-Teamspiele, ältestes zuerst">${entries.map((e,i)=>{
    const v=values[i], text=v===null?'–':String(percentage?Math.round(v):v)+(percentage?' %':'');
    return `<a href="#match/${liveEscape(e.game.id)}/stats" aria-label="${liveEscape(date(e.game))}: ${label} ${text}" title="${liveEscape(date(e.game))}: ${label} ${text}"><span>${text}</span><i aria-hidden="true" style="--bar-height:${v===null?0:Math.max(v/maximum*100,3)}%" class="${v===null?'is-missing':''}"></i><small>${liveEscape(date(e.game).slice(0,5))}</small></a>`;
  }).join('')}</div>`;
}
function playerRecentSummary(entries, keys) {
  const valid=entries.filter(e=>e.player && keys.every(k=>Number.isFinite(e.player[k]) && e.player[k]>=0));
  return {count:valid.length, totals:Object.fromEntries(keys.map(k=>[k,valid.length?valid.reduce((sum,e)=>sum+e.player[k],0):null]))};
}
function playerStats(id) {
  const keeper = players.find(p => p[0] === id)?.[2]?.startsWith('Tor'), p = updateState?.playerSeason?.players?.[id];
  const show = v => v === null || v === undefined ? '–' : String(v).replace('.', ',');
  const metric = (label, value, style = '', note = '') => `<div class="bento-metric ${style}"><span>${label}</span><strong>${show(value)}</strong>${note?`<small>${note}</small>`:''}</div>`;
  const recent=playerRecentStats(id), summary=playerRecentSummary(recent,keeper?['saves','keeperShots']:['goals','shots']);
  const numerator=keeper?summary.totals.saves:summary.totals.goals, denominator=keeper?summary.totals.keeperShots:summary.totals.shots;
  const quote=denominator>0 && numerator<=denominator ? Math.round(numerator/denominator*1000)/10 : null;
  const mini=playerMiniBars(recent,keeper?'saves':'goals',keeper?'Fangquote':'Tore',keeper);
  const knownGoals = Number.isFinite(p?.goals) && p.goals > 0 && Number.isFinite(p?.fieldGoals) && Number.isFinite(p?.sevenMeterGoals) && p.fieldGoals >= 0 && p.sevenMeterGoals >= 0 && p.fieldGoals + p.sevenMeterGoals === p.goals;
  const share = knownGoals ? Math.round(p.sevenMeterGoals / p.goals * 100) : null;
  const sample=`Aus ${summary.count} von ${recent.length} QHL-Teamspielen`;
  const scoring = keeper
    ? `${metric('Fangquote · letzte Spiele',quote===null?null:show(quote)+' %','bento-primary',sample)}${metric('Einsätze',p?.games,'','QHL · Saison')}<section class="bento-panel bento-wide keeper-panel"><h3>Zwischen den Pfosten</h3><div class="keeper-metrics">${metric('Paraden',summary.totals.saves)}${metric('Würfe aufs Tor',summary.totals.keeperShots)}${metric('Gehaltene 7-Meter',playerRecentSummary(recent,['sevenSaves']).totals.sevenSaves)}</div><p>${sample} · bestätigte Spielberichte, keine Saisonhochrechnung.</p></section>`
    : `${metric('Tore',p?.goals,'bento-primary','QHL · Saison')}${metric('Einsätze',p?.games,'','QHL · Saison')}${metric('Tore pro Spiel',p?.goalsPerGame,'bento-average bento-wide','Saisontore / Einsätze')}<section class="bento-panel bento-wide"><h3>Torverteilung · Saison</h3><div class="bento-scoring"><div class="bento-legend">${metric('Feldtore',p?.fieldGoals)}${metric('7-Meter-Tore',p?.sevenMeterGoals)}</div>${knownGoals?`<div class="bento-ring" style="--seven-meter-share:${share}%" role="img" aria-label="${share} Prozent der Tore durch 7-Meter"><div><strong>${share}%</strong><span>7-Meter-Anteil</span></div></div>`:`<p class="bento-chart-note">${p?.goals===0?'Noch keine Tore':'Torverteilung nicht verfügbar'}</p>`}</div></section>`;
  const form = mini || summary.count ? `<section class="bento-panel bento-wide player-form-panel"><h3>${keeper?'Fangquote':'Abschluss'} · letzte QHL-Spiele</h3>${mini}${keeper?'':`<div class="keeper-metrics">${metric('Tore',summary.totals.goals)}${metric('Würfe',summary.totals.shots)}${metric('Trefferquote',quote===null?null:show(quote)+' %')}</div>`}<p class="stat-note">${sample}. – = kein bestätigter Einzelwert. Balken antippen für Spielstatistik.</p></section>` : `<p class="stat-note bento-wide">Einzelspielwerte werden aus den letzten fünf QHL-Spielberichten geladen. Fehlende Berichte oder Spielerwerte bleiben als – sichtbar.</p>`;
  const dashboard = `<div class="player-bento${keeper?' player-bento-keeper':''}">${scoring}${form}<section class="bento-panel bento-wide"><h3>Strafen · Saison</h3><div class="bento-penalties">${metric('Verwarnungen',p?.yellowCards)}${metric('2-Minuten-Strafen',p?.twoMinutes)}${metric('Disqualifikationen',p?.disqualifications)}</div></section></div>`;
  const note = !p ? 'Für diesen Spieler veröffentlicht der SHV aktuell keine QHL-Saisonstatistik. Fehlende Werte erscheinen als –.' : '– = von der Quelle nicht verfügbar. Einsätze gemäss offiziellem Spielbericht; keine Aussage zur Einsatzdauer.';
  return `<p class="stat-scope">QHL · Saisonwerte</p>${dashboard}<p class="stat-note">${note}</p><details class="source-details"><summary>Quelle & Datenstand</summary><p>${updateLabel('players')} · ${ext(updateState?.playerSeason?.source || 'https://www.handball.ch/de/matchcenter/teams/'+handballTeamId(),'SHV','')}</p><p>Verläufe und Wurfwerte: bestätigte SHV-Berichte der letzten fünf QHL-Teamspiele; nur verfügbare Einzelwerte. Fangquote = Paraden / Würfe aufs Tor, gewichtet über die ausgewiesenen Berichte.</p></details>`;
}
const playerReportAttempts = new Map();
async function loadPlayerReports() {
  if(activeClub==='fcsg' || !location.hash.startsWith('#player/'))return;
  const id=Number(location.hash.split('/')[1]);
  await Promise.all(playerRecentFixtures().map(async g=>{
    if(Date.now()-(playerReportAttempts.get(g.id)||0)<60000)return;
    playerReportAttempts.set(g.id,Date.now());
    try {
      const response=await apiFetch(handballApiPath('/api/reports/')+encodeURIComponent(g.id),{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error();
      const {report:r}=await response.json(), normalized=n=>String(n).replace(/^TSV /,'');
      if(!r || r.score?.length!==2 || !r.score.every((v,i)=>Number.isInteger(v)&&v===g.score[i]) || r.teams?.length!==2 || normalized(r.teams[0].name)!==normalized(g.home) || normalized(r.teams[1].name)!==normalized(g.away) || !r.teams.every(t=>Array.isArray(t.players)))throw Error();
      gameReports[g.id]=r;
    } catch { /* Retain verified data, never infer zero from a missing report. */ }
  }));
  if(activeClub!=='fcsg' && location.hash===`#player/${id}`) {
    const target=document.getElementById('player-stats');
    if(target)target.innerHTML=playerStats(id);
  }
}
function profile(id) {
  const p = players.find(x => x[0] === id);
  if (!p) return notFound();
  const bio = playerBios[id]?.facts || [];
  const last = p[1].split(' ').at(-1);
  return `<section class="player-story">${backLink('#season/squad', 'Zurück zum Kader', 'profile-back')}<section class="profile-slide profile-intro" id="profile-intro"><div class="portrait"><img src="${liveEscape(handballPlayerImage(id))}" alt="${p[1]}" width="600" height="400" fetchpriority="high"><div><p>${p[1].split(' ').slice(0, -1).join(' ')}</p><h1>${last}</h1><span>${p[2]}</span><b>${id}</b></div></div><div class="profile-facts">${statFacts(bio)}<details class="source-details"><summary>Quelle & Datenstand</summary><p>${ext(playerBios[id]?.url || base + '1-mannschaft/', 'Offizieller Steckbrief', '')} · ${updateLabel('players')}</p></details></div></section><section class="profile-slide player-season-screen" id="profile-season"><div class="profile-minihero"><img src="${liveEscape(handballPlayerImage(id))}" alt="" width="600" height="400" loading="lazy" decoding="async"><div><strong>${last}</strong><b>${id}</b></div></div><div class="season-stats-content"><h2>Saison 2026/27</h2><div id="player-stats" aria-live="polite">${playerStats(id)}</div></div></section><nav class="profile-jumps" aria-label="Spielerabschnitte">${[
    ['intro', 'Steckbrief'],
    ['season', 'Saisonwerte']
  ]
    .map(
      ([x, t], i) =>
        `<button data-section="profile-${x}" aria-label="${t}" title="${t}" aria-pressed="${i === 0}"><span></span></button>`
    )
    .join('')}</nav></section>`;
}
