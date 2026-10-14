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
    run = teamResult(g, handballTeamName()).state === 'win' ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {current: run, best};
}
function goalDifferenceChart(list) {
  const rows = list.map(g => {
      const result = teamResult(g, handballTeamName()),
        home = isOwnHandballTeam(g.home);
      return {g, result, home, opponent: home ? g.away : g.home, diff: result.for - result.against};
    }),
    limit = Math.max(1, ...rows.map(r => Math.abs(r.diff))),
    signed = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
  const markup = items =>
    items
      .map(
        ({g, result, home, opponent, diff}) =>
          `<li><a class="difference-game ${result.state}" href="#match/${liveEscape(g.id)}/overview" title="${liveEscape(date(g) + ' · ' + (home ? 'Heimspiel' : 'Auswärtsspiel') + ' gegen ' + opponent + ', Resultat ' + g.score.join(':') + ', Tordifferenz ' + signed(diff))}"><span class="difference-fixture"><strong>${liveEscape(teamName(opponent))}</strong><small>${liveEscape(date(g))} · ${home ? 'Heim' : 'Auswärts'}</small></span><span class="difference-track" aria-hidden="true"><span class="difference-bar" style="--difference-width:${(Math.abs(diff) / limit) * 50}%"></span></span><strong class="difference-value">${signed(diff)}</strong></a></li>`
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
      const r = teamResult(g, handballTeamName());
      return `<a class="${r.state}" href="#match/${liveEscape(g.id)}/overview" title="${liveEscape(date(g) + ': ' + g.home + ' gegen ' + g.away + ', ' + r.label)}" title="${liveEscape(date(g) + ' · ' + r.label)}">${r.short}</a>`;
    })
    .join('')}</div></div>`;
}
function syncOfflineNotice() {
  if(typeof syncSourceNotices==='function')syncSourceNotices();
  let el = document.getElementById('offline-notice');
  if (!el) {
    el = document.createElement('details');
    el.id = 'offline-notice';el.className='compact-status';
    el.innerHTML='<summary aria-label="Hinweis zum Datenstand" title="Hinweis zum Datenstand"><span class="status-dot" aria-hidden="true"></span></summary><div class="status-popover"><p></p></div>';
    document.body.append(el);
    document.addEventListener('click',event=>{if(!el.contains(event.target))el.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&el.open){el.open=false;el.querySelector('summary').focus();}});
  }
  const fcsg = typeof activeClub !== 'undefined' && activeClub === 'fcsg';
  const failed = fcsg ? fcsgDataLoadFailed : dataLoadFailed;
  const stamp = fcsg ? fcsgData.checkedAt : updateState?.checkedAt;
  const messages=[];
  const saved = stamp ? 'Gespeicherter Stand: ' + new Date(stamp).toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short'
  }) + ' Uhr.' : 'Der letzte verfügbare Stand bleibt sichtbar.';
  if(!navigator.onLine||failed)messages.push((!navigator.onLine?'Offline · ':'Daten konnten gerade nicht aktualisiert werden. ')+saved);
  document.querySelectorAll('[data-source-key]').forEach(node=>{if(node.textContent&&!messages.includes(node.textContent))messages.push(node.textContent);});
  if(typeof weekVisible==='function'&&weekVisible())for(const club of selectedClubs){
    const data=club==='fcsg'?fcsgData:handballSnapshots.get(club);
    const health=sourceHealth(data?.status?.games,data?.checkedAt,'games');
    if(health)messages.push(fanClubs[club].short+': '+health);
    if(weekDataFailures.has(club)||weekLive.get(club)?.failed)messages.push(fanClubs[club].short+': Aktualisierung derzeit nicht verfügbar. Der letzte gültige Stand bleibt sichtbar.');
  }
  el.hidden=!messages.length;
  if(el.hidden)el.open=false;
  el.querySelector('p').textContent=messages.join(' ');
  document.body.classList.toggle('is-offline', !navigator.onLine);

}
function setupEnhancements() {
  if (typeof activeClub !== 'undefined' && activeClub === 'fcsg') return;
  const [page, id] = location.hash.slice(1).split('/'),
    game = page === 'match' ? games.find(g => g.id === id) : null;
  const opponent = game ? (game.home.includes('Kadetten') ? game.away : game.home) : null;
  document.documentElement.style.setProperty('--rival-color', rivalColors[teamName(opponent || '')] || '#94683f');
  if(typeof syncMatchdayNavigation==='function')syncMatchdayNavigation();
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
  if (navigator.onLine && !document.hidden && activeClub !== 'fcsg') await loadCurrentData();
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
    const response = await apiFetch(handballApiPath('/api/reports/') + encodeURIComponent(id));
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
  const shots=g.league==='EHL' && r.ehf ? r.shotStats : null;
  return `<h2>Das Spiel in Zahlen</h2>${reportComparison(g,r)}${r.half.every(Number.isInteger) ? `<div class="panel">${metric('1. Halbzeit', ...r.half)}${metric('2. Halbzeit', r.score[0] - r.half[0], r.score[1] - r.half[1])}</div>` : ''}${ehfShotComparison(shots)}<h2>Spielerstatistiken</h2>${teamSwitchMarkup(String(g.id), r.teams[0].name, r.teams[1].name, (k, name) => ehfShotTeam(shots,k)+team(r.teams[k === 'home' ? 0 : 1]))}`;
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
  return `<div class="report-comparison-row"><div><strong>${liveEscape(l)}</strong><span>${label}</span><strong>${liveEscape(rr)}</strong></div><div class="report-bars" aria-hidden="true"><span class="${h.id===handballTeamId()?'is-kadetten':''}"><i style="width:${valid?x/scale*100:0}%"></i></span><span class="${a.id===handballTeamId()?'is-kadetten':''}"><i style="width:${valid?y/scale*100:0}%"></i></span></div></div>`;
 }).join('');
 return `<section class="report-comparison" aria-label="Teamvergleich">${statTeams(g)}${markup}</section>`;
}
// Cubic controls stay within each pair of confirmed values, so the curve cannot overshoot.
function reportScoreCurve(points) {
 const unique=[];
 for(const p of points) {
  if(unique.at(-1)?.x===p.x) unique[unique.length-1]=p;
  else unique.push(p);
 }
 if(!unique.length)return '';
 const slopes=unique.slice(1).map((p,i)=>(p.y-unique[i].y)/(p.x-unique[i].x));
 const tangent=i=>i===0?(slopes[0]||0):i===unique.length-1?(slopes.at(-1)||0):slopes[i-1]*slopes[i]>0?Math.sign(slopes[i])*Math.min(Math.abs(slopes[i-1]),Math.abs(slopes[i])):0;
 const n=v=>+v.toFixed(3);
 return `M${unique[0].x} ${unique[0].y}`+unique.slice(1).map((p,i)=>{
  const a=unique[i], dx=(p.x-a.x)/3;
  return ` C${n(a.x+dx)} ${n(a.y+tangent(i)*dx)} ${n(p.x-dx)} ${n(p.y-tangent(i+1)*dx)} ${p.x} ${p.y}`;
 }).join('');
}
function reportScoreChart(g, r) {
 const scores=r.events.filter(e=>Number.isFinite(e.seconds)&&e.seconds>=0&&Array.isArray(e.score)&&e.score.length===2&&e.score.every(v=>Number.isInteger(v)&&v>=0)).sort((a,b)=>a.seconds-b.seconds||a.id-b.id);
 if(!scores.length)return '';
 const maximum=Math.ceil(Math.max(...r.score,...scores.flatMap(e=>e.score),1)/10)*10;
 const end=Math.max(3600,...scores.map(e=>e.seconds)), left=36, right=380, top=22, bottom=182;
 const x=sec=>+(left+sec/end*(right-left)).toFixed(2), y=value=>+(bottom-value/maximum*(bottom-top)).toFixed(2);
 const last=scores.at(-1), complete=last.score.every((v,i)=>v===r.score[i]);
 const path=side=>{
  const points=[{x:left,y:bottom}];
  // Other-team goals are not additional anchors for this team's interpolated curve.
  for(const e of scores)if(y(e.score[side])!==points.at(-1).y)points.push({x:x(e.seconds),y:y(e.score[side])});
  const final={x:complete?right:x(last.seconds),y:y(last.score[side])};
  if(final.x!==points.at(-1).x)points.push(final);
  return reportScoreCurve(points);
 };
 const finalX=complete?right:x(last.seconds), id='report-score-'+String(g.id).replace(/[^a-zA-Z0-9_-]/g,'');
 const colour=side=>r.teams[side].id===handballTeamId()?'kadetten':'opponent';
 const grid=[0,maximum/2,maximum].map(v=>`<path class="chart-grid" d="M${left} ${y(v)}H${right}"/><text x="26" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
 const times=[...Array.from({length:Math.floor(end/600)+1},(_,i)=>i*600),end].filter((v,i,list)=>v<=end&&list.indexOf(v)===i).map(sec=>`<text x="${x(sec)}" y="${sec===1800?210:204}" text-anchor="${sec===0?'start':sec===end?'end':'middle'}">${sec===1800?'30′ · Pause':Math.round(sec/60)+'′'}</text>`).join('');
 return `<figure class="report-score-card"><figcaption><div><p class="eyebrow">Das Spiel im Verlauf</p><h2>Torverlauf</h2></div><span class="report-score-status">Beendet</span></figcaption><div class="report-score-legend">${[g.home,g.away].map((name,side)=>`<div class="report-score-team is-${colour(side)}"><span><i aria-hidden="true"></i>${liveEscape(name)}</span><strong>${r.score[side]}<small>Tore</small></strong></div>`).join('')}</div><svg class="report-score-chart" viewBox="0 0 400 224" role="img" aria-label="Torverlauf: ${liveEscape(g.home)} ${r.score[0]}, ${liveEscape(g.away)} ${r.score[1]}. Geglättete Darstellung zwischen gesicherten Torständen. Zeit in Spielminuten, Anzahl Tore. Einzelereignisse folgen unter der Grafik."><defs>${[0,1].map(side=>{const kadetten=colour(side)==='kadetten',base=kadetten?'#ff7a24':'#a78bfa',light=kadetten?'#ffb15b':'#d0baff';return `<linearGradient id="${id}-${side}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${base}" stop-opacity=".38"/><stop offset="55%" stop-color="${base}" stop-opacity=".14"/><stop offset="100%" stop-color="${base}" stop-opacity="0"/></linearGradient><linearGradient id="${id}-line-${side}" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="${base}"/><stop offset="100%" stop-color="${light}"/></linearGradient>`;}).join('')}</defs>${grid}<path class="chart-half" d="M${x(1800)} ${top}V${bottom}"/>${[0,1].map(side=>`<path class="chart-area" fill="url(#${id}-${side})" d="${path(side)} V${bottom} H${left}Z"/>`).join('')}${[0,1].map(side=>`<path class="chart-line chart-${colour(side)}" style="stroke:url(#${id}-line-${side})" d="${path(side)}"/><circle class="chart-end chart-${colour(side)}" cx="${finalX}" cy="${y(last.score[side])}" r="4"/>`).join('')}${times}</svg><p class="report-score-caption">Spielminuten · Geglätteter Verlauf${complete?'':' · Torfolge unvollständig'}</p></figure>`;
}
function reportHistory(g) {
 const r=verifiedReport(g);
 if(!r?.events)return '';
 return `<section class="report-history">${reportScoreChart(g,r)}${liveEventFeed({home:g.home,away:g.away,details:{events:r.events}},null,true)}</section>`;
}
