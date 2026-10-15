/* Saison: Spielplan, Kalender, Tabelle und Kader. */
function seasonHeading(title) {
  return document.documentElement.dataset?.design==='v2'?`<p class="eyebrow">1. Mannschaft · Saison 2026/27</p><h1>${title}</h1>`:`<h1 class="season-screen-title">${title}</h1>`;
}
function season(tab) {
  if(tab==='games'&&mode==='week')return `<section class="content season calendar-season week-season"><div class="season-header"><p class="eyebrow">DEINE AUSGEWÄHLTEN VEREINE</p><h1>Spiele</h1>${gameControls()}${calendarNavigation()}</div>${sharedWeekView()}</section>`;
  const calendarView = tab === 'games' && mode === 'calendar';
  const title = {games: 'Spiele', table: 'Tabelle', squad: 'Kader'}[tab];
  return `<section class="content season ${tab === 'table' ? 'standings-season' : ''} ${calendarView ? 'calendar-season' : ''}"><div class="season-header">${seasonHeading(title)}${tab === 'games' ? gameControls() + (mode === 'calendar' ? calendarNavigation() : '') : ''}${sourceNotice(tab==='squad'?'players':tab==='table'?'table':'games')}</div>${tab === 'table' ? standing() : tab === 'squad' ? squad() : gameList()}</section>${footer()}`;
}
function gameControls() {
  const choices=activeClub==='fcsg' ? ['Alle',...new Set(fcsgData.games.map(g=>g.league))] : handballClub()==='otmar' ? ['Alle',...new Set(games.map(g=>g.league))] : ['Alle','QHL','EHL','Testspiel','Falkencup'];
  if(document.documentElement.dataset?.design!=='v2')return `<div class="game-control-bar" role="group" aria-label="Spielplan und Wettbewerb">${gameViewToggle()}<div class="game-filter"><select id="competition" aria-label="Wettbewerb">${choices.map(c=>`<option ${c===competition?'selected':''}>${liveEscape(c)}</option>`).join('')}</select></div></div>`;
  return `${gameViewToggle()}${mode==='week'?'':`<div class="controls"><label>Wettbewerb <select id="competition">${choices.map(c=>`<option ${c===competition?'selected':''}>${liveEscape(c)}</option>`).join('')}</select></label></div>`}`;
}
function gameJumpControls(ordered){
  if(document.documentElement.dataset?.design==='v2')return '';
  const today=swissToday(),past=ordered.some(g=>g.score||g.date<today),future=ordered.filter(g=>!g.score&&g.date>=today);
  return `<nav class="game-jumps" aria-label="In der Spieleliste springen"><button type="button" data-game-jump="past" ${past?'':'disabled'}>Vergangen</button><button type="button" data-game-jump="current" ${ordered.length?'':'disabled'}>Aktuell</button><button type="button" data-game-jump="upcoming" ${future.length>1?'':'disabled'}>Kommend</button></nav>`;
}
function gameJumpTargets(){
  const cards=[...document.querySelectorAll('.game-timeline .game-card')],current=cards.find(e=>e.classList.contains('current-game')),index=cards.indexOf(current);
  return {past:cards.filter(e=>e.classList.contains('finished')).at(-1)||cards[index-1],current:current||cards.at(-1),upcoming:current?cards[index+1]:null};
}
let gameJumpScrollHandler;
function setupGameJumps(){
  if(gameJumpScrollHandler)window.removeEventListener('scroll',gameJumpScrollHandler);
  document.getElementById('return-current-game')?.remove();
  if(document.documentElement.dataset.design==='v2'||location.hash!=='#season/games'||mode!=='list')return;
  document.querySelectorAll('[data-game-jump]').forEach(button=>{button.onclick=()=>{const target=gameJumpTargets()[button.dataset.gameJump];if(target)scrollGameCardIntoView(target,true);};});
  const card=gameJumpTargets().current;if(!card)return;
  const back=document.createElement('button');back.type='button';back.id='return-current-game';back.className='return-current-game';back.textContent='Zum aktuellen Spiel';back.hidden=true;document.body.append(back);
  back.onclick=()=>scrollGameCardIntoView(gameJumpTargets().current,true);
  gameJumpScrollHandler=()=>{const r=card.getBoundingClientRect(),top=clubHeaderOffset()+(document.querySelector('.game-control-bar')?.getBoundingClientRect().height||0),bottom=document.querySelector('body > .dock')?.getBoundingClientRect().top||window.innerHeight;back.hidden=r.bottom>top&&r.top<bottom;};
  window.addEventListener('scroll',gameJumpScrollHandler,{passive:true});requestAnimationFrame(gameJumpScrollHandler);
}
function gameList() {
  if (mode === 'calendar') return `<section class="home-matchday games-matchday"><a id="live-match" class="live-match" data-live-only="true" aria-label="Laufendes Kadetten-Spiel" aria-live="polite" hidden></a></section><div class="calendar-panel">${calendar()}</div>`;
  const ordered = games
    .filter(g => competition === 'Alle' || g.league === competition)
    .slice()
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Zurich'});
  const next = ordered.find(g => !g.score && g.date >= today);
  return `<p class="muted">Saison 2026/27 · ${games.length} im Vereins-Matchcenter veröffentlichte Partien</p>${mode === 'calendar' ? calendar() : `${gameJumpControls(ordered)}<div class="games game-timeline">${ordered.map(g => card(g, g === next)).join('')}</div>${handballClub()==='otmar'?'':`<aside class="notice"><strong>Weiterer Saisonverlauf</strong><p>Für die Zeit nach Dezember sind im Vereins-Matchcenter noch keine weiteren konkreten Paarungen veröffentlicht. Weitere Liga-, Cup- und Europacuppartien werden ergänzt, sobald Gegner und Termine feststehen. Datenstand: 02.10.2026.</p></aside>`}`}`;
}
function calendarNavigation() {
  return `<div class="calendar-head"><button id="prev-month" aria-label="Vorheriger Monat">‹</button><h2>${new Date(calendarYear, month, 1).toLocaleDateString('de-CH', {month: 'long', year: 'numeric'})}</h2><button id="next-month" aria-label="Nächster Monat">›</button></div>`;
}
function calendar() {
  return calendarGrid(day => games.filter(g => g.date === day && (competition === 'Alle' || g.league === competition)).map(g => {
    const home = isOwnHandballTeam(g.home), opponent = home ? g.away : g.home;
    const label = `${date(g)} · ${home ? 'Heimspiel' : 'Auswärtsspiel'} gegen ${opponent}${g.time ? ' · ' + g.time + ' Uhr' : ''}${g.score ? ' · Endstand ' + g.score.join(':') : ''}`;
    return `<a class="calendar-fixture ${home ? 'fixture-home' : 'fixture-away'}" href="#match/${liveEscape(g.id)}/overview" aria-label="${liveEscape(label)}" title="${liveEscape(label)}"><span class="calendar-crest">${badge(opponent)}</span><span class="fixture-location" aria-hidden="true"></span></a>`;
  }).join(''), 'Gegnerlogo antippen für Spielinfos und Resultat.');
}
function calendarGrid(fixturesForDay, hint) {
  const days = new Date(calendarYear, month + 1, 0).getDate(), offset = (new Date(calendarYear, month, 1).getDay() + 6) % 7, today = swissToday();
  return `<div class="calendar match-calendar" style="--calendar-weeks:${Math.ceil((offset + days) / 7)}">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `<b>${d}</b>`).join('')}${'<div class="day empty-day" aria-hidden="true"></div>'.repeat(offset)}${Array.from({length:days}, (_,i) => {
    const day = `${calendarYear}-${String(month + 1).padStart(2,'0')}-${String(i + 1).padStart(2,'0')}`, fixtures = fixturesForDay(day);
    return `<div class="day ${fixtures ? 'has-game' : ''} ${day === today ? 'today' : ''}">${fixtures ? `<span class="fixture-date">${i + 1}</span>${fixtures}` : `<span class="calendar-date">${i + 1}</span>`}</div>`;
  }).join('')}${'<div class="day empty-day" aria-hidden="true"></div>'.repeat((7 - ((offset + days) % 7)) % 7)}</div><p class="calendar-legend"><span class="legend-home">Heimspiel</span><span class="legend-away">Auswärtsspiel</span></p><p class="muted calendar-hint">${liveEscape(hint)}</p>`;
}
function recordBar(name, total) {
  const row=tables.EHL.find(t=>t[0]===name);
  const norm=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/chambery.*$/,'chambery').replace(/[^a-z0-9]/g,'');
  const entry=Object.entries(updateState?.ehlRecentGames || {}).find(([team])=>norm(team)===norm(name))?.[1];
  const fixtures=(entry?.games || []).filter(g=>g.score&&[g.home,g.away].some(team=>norm(team)===norm(name)));
  let r=tableLeague==='QHL'?teamRecords[name]:null;
  if(tableLeague==='EHL'&&row&&fixtures.length===total) {
   const results=fixtures.map(g=>g.score[norm(g.home)===norm(name)?0:1]-g.score[norm(g.home)===norm(name)?1:0]);
   const confirmed=[results.filter(n=>n>0).length,results.filter(n=>n===0).length,results.filter(n=>n<0).length];
   if(2*confirmed[0]+confirmed[1]===Number(row[4]))r=confirmed;
  }
  if (!r || !total) return '';
  const label = `${r[0]} Siege, ${r[1]} Unentschieden, ${r[2]} Niederlagen`;
  return `<div class="record-bar" role="img" aria-label="${label}" title="${label}">${r.map((n, i) => `<span class="record-${i}" style="width:${(n / total) * 100}%"></span>`).join('')}</div><small class="record-text">${r[0]} S · ${r[1]} U · ${r[2]} N</small>`;
}
function standing() {
  return `<div class="toggle league-toggle">${(handballClub()==='otmar'?['QHL']:['QHL', 'EHL']).map(l => `<button data-league="${l}" aria-pressed="${l === tableLeague}">${l === 'QHL' ? 'QHL' : 'European League'}</button>`).join('')}</div><p class="muted">${tableLeague === 'QHL' ? 'Hauptrunde' : 'Gruppenphase · Gruppe C'} · ${updateLabel('table')}</p><p class="record-legend"><span>Siege</span><span>Unentschieden</span><span>Niederlagen</span></p><div class="table-wrap"><table class="standings-table"><colgroup><col class="rank-col"><col class="team-col"><col class="games-col"><col class="goals-col"><col class="diff-col"><col class="points-col"></colgroup><thead><tr><th aria-label="Rang">#</th><th>Team</th><th>Sp.</th><th>Tore</th><th>+/−</th><th>Pkt.</th></tr></thead><tbody>${tables[tableLeague].map((r, i) => `<tr class="${isOwnHandballTeam(r[0]) ? 'our-team' : ''}"><td>${i + 1}</td><th scope="row"><div class="table-team">${badge(r[0])}<div><span class="standing-name">${r[0]}</span>${recordBar(r[0], r[1])}<small class="standing-meta">${r[1]} Spiele · ${r[2] - r[3] > 0 ? '+' : ''}${r[2] - r[3]} Tore</small></div></div></th><td>${r[1]}</td><td>${r[2]}:${r[3]}</td><td>${r[2] - r[3] > 0 ? '+' : ''}${r[2] - r[3]}</td><td><strong>${r[4]}</strong></td></tr>`).join('')}</tbody></table></div>${seasonNumbers()}`;
}

function playerCard(p) {
  return `<a class="player-card" href="#player/${p[0]}"><img src="${liveEscape(handballPlayerImage(p[0]))}" alt="${p[1]}" width="600" height="400" loading="lazy" decoding="async"><div><span>${p[1].split(' ').slice(0, -1).join(' ')}</span><strong>${p[1].split(' ').at(-1)}</strong><b>${p[0]}</b></div></a>`;
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
