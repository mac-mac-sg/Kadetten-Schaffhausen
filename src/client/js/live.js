/* Live-Karte auf der Startseite und Live-Abfrage. */
let matchdayIntroDay = null;
let liveRequestFailed = false, lastLiveMatch = null, lastLiveAt = null, lastLiveDate = null;
function playMatchdayIntro(slot, day) {
  if (matchdayIntroDay === day) return;
  matchdayIntroDay = day;
  try {
    if (localStorage.getItem('kadetten-matchday-intro') === day) return;
    localStorage.setItem('kadetten-matchday-intro', day);
  } catch { /* Ohne Speicher höchstens einmal pro geöffneter App. */ }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  slot.classList.add('is-matchday-intro');
  setTimeout(() => slot.classList.remove('is-matchday-intro'), 1300);
}
function showLiveMatch() {
  const slot = document.getElementById('live-match');
  if (!slot) return;
  const {game: g, live} = homeFixture();
  if (!g) {
    slot.hidden = true;
    slot.innerHTML = '';
    return;
  }
  const today = g.date === swissToday(),
    ended = !!g.score && !live;
  const matchDate = live
    ? ''
    : new Date(g.date + 'T12:00:00Z').toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich',
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
  const result = ended ? teamResult(g, 'Kadetten Schaffhausen') : null;
  const html = `<div class="live-heading"><span>${live ? '<i aria-hidden="true"></i>JETZT LIVE' : ended ? 'HEUTE GESPIELT' : today ? '<i aria-hidden="true"></i>MATCHDAY' : 'NÄCHSTES SPIEL'}</span><small>${liveEscape(g.league)}${live && g.phase ? ' · ' + liveEscape(g.phase) : ''}${live && g.clock ? ' · ' + liveEscape(g.clock) : ''}</small></div><div class="live-score"><span>${badge(g.home)}<b>${liveEscape(g.home)}</b></span><strong>${live || ended ? (g.score ? g.score.join(' : ') : '– : –') : 'VS'}</strong><span>${badge(g.away)}<b>${liveEscape(g.away)}</b></span></div>${live ? '<span class="live-link">Spiel live verfolgen</span>' : ended ? `<p class="match-preview-time">${result.label} · Zum Resultat und Rückblick</p>` : `<p class="match-preview-time">${relativeDay(g.date) ? relativeDay(g.date) + ' · ' : ''}${matchDate}${g.time ? ' · ' + liveEscape(g.time) + ' Uhr' : ' · Anspielzeit noch offen'}</p>${today ? `<p class="home-countdown${countdownSoon(g) ? ' is-soon' : ''}" data-countdown="${g.id}">${countdownText(g)}</p>` : ''}`}`;
  slot.href = live ? liveMatchHref(live) : '#match/' + encodeURIComponent(g.id) + '/overview';
  slot.removeAttribute('target');
  slot.removeAttribute('rel');
  slot.setAttribute(
    'aria-label',
    (live ? 'Zum Live-Spiel: ' : ended ? 'Zum Rückblick: ' : 'Zur Spielvorschau: ') +
      g.home +
      ' gegen ' +
      g.away
  );
  slot.classList.toggle('match-preview', !live);
  slot.classList.toggle('is-matchday', today || !!live);
  slot.classList.toggle('matchday-win', result?.state === 'win');
  slot.classList.toggle('matchday-upcoming', today && !live && !ended);
  slot.classList.toggle('is-live', !!live);
  slot.classList.toggle('matchday-over', ended && result?.state !== 'win');
  if (slot.innerHTML !== html) slot.innerHTML = html;
  slot.hidden = false;
  if (today) playMatchdayIntro(slot, g.date);
}

async function checkLiveMatch() {
  clearTimeout(liveTimer);
  if (document.hidden || !(['', '#home'].includes(location.hash) || location.hash.startsWith('#match/') || location.hash === '#season/games')) return;
  if (!navigator.onLine) {
    liveRequestFailed = true;
    showLiveMatch();
    refreshLiveViews();
    return;
  }
  if (liveBusy) return;
  liveBusy = true;
  try {
    const r = await apiFetch('/api/live', {cache: 'no-store', signal: AbortSignal.timeout(30000)});
    const d = await r.json();
    if (!r.ok || !d.ok) throw Error('Live source unavailable');
    if (!d.match && lastLiveMatch && d.sources?.[lastLiveMatch.league === 'QHL' ? 'SHV' : 'EHF']?.ok === false) throw Error('Live source unavailable');
    liveState = d;
    liveRequestFailed = false;
    if (d.match) { lastLiveMatch = d.match; lastLiveAt = d.checkedAt; lastLiveDate = swissToday(); }
  } catch {
    liveRequestFailed = true;
  } finally {
    liveBusy = false;
    showLiveMatch();
    refreshMatchdayDetail();
    refreshLiveViews();
    liveTimer = setTimeout(checkLiveMatch, (liveState?.match || lastLiveMatch) ? 30000 : 60000);
  }
}

function liveMatchHref(live) {
 const fixture=games.find(g=>g.date===swissToday()&&sameFixture(g,live));
 return '#match/'+encodeURIComponent(fixture?.id||'live')+'/overview';
}
function liveForFixture(g) {
 const live=freshLive() || (lastLiveDate === swissToday() ? lastLiveMatch : null);
 return live && (g.id==='live' || g.date===swissToday()&&sameFixture(g,live)) ? live : null;
}
function liveMatchPage(g, tab='overview') {
 return `<section class="match live-match-page">${backLink('#season/games','Zurück zu den Spielen','back')}<div id="live-detail-content">${liveMatchContent(g,tab)}</div></section>${footer()}`;
}
function liveMatchContent(g, tab) {
 const live=liveForFixture(g), active=!!freshLive()&&sameFixture(live,freshLive()), details=live?.details;
 const status=liveRequestFailed||!navigator.onLine?'Verbindung unterbrochen · letzter bestätigter Stand':active?'Jetzt live':'Spiel wird derzeit nicht als live gemeldet';
 if(!live)return `<div class="content narrow"><h1>Live-Spiel</h1><p role="status">${navigator.onLine?'Live-Daten werden geladen …':'Live-Daten sind offline nicht verfügbar.'}</p></div>`;
 const updated=lastLiveAt?new Date(lastLiveAt).toLocaleTimeString('de-CH',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',second:'2-digit'}):null;
 return `<header class="live-match-header"><p class="eyebrow">${liveEscape(live.league)} · Live-Spiel</p><p class="live-status ${active?'is-current':''}" role="status" aria-atomic="true">${status}<span class="live-sr-context"> · ${liveEscape(live.home)} ${live.score?live.score.join(' : '):'– : –'}</span></p><div class="matchup"><div class="matchup-team">${badge(live.home)}<span>${liveEscape(live.home)}</span></div><strong>${live.score?live.score.join(' : '):'– : –'}</strong><div class="matchup-team">${badge(live.away)}<span>${liveEscape(live.away)}</span></div></div><p>${[live.phase,live.clock].filter(Boolean).map(liveEscape).join(' · ')}</p>${live.half&&/2\.|zweite|2nd/i.test(live.phase||'')?`<small>Halbzeit ${live.half.join(' : ')}</small>`:''}<small class="live-checked">${updated?'Stand '+updated+' Uhr · ':''}Aktualisierung alle 30 Sekunden</small></header><nav class="segments match-tabs" aria-label="Live-Spielbereich">${[['overview','Spielverlauf'],['stats','Statistiken']].map(([id,label])=>`<a href="#match/${encodeURIComponent(g.id)}/${id}" class="${tab===id?'selected':''}">${label}</a>`).join('')}</nav><div class="content narrow live-match-body">${details?.ok===false?`<p class="notice">${details.updatedAt?'Statistiken momentan nicht aktualisierbar · Stand '+new Date(details.updatedAt).toLocaleTimeString('de-CH',{timeZone:'Europe/Zurich'})+' Uhr.':'Weitere Live-Statistiken sind momentan nicht verfügbar.'}</p>`:''}${tab==='stats'?livePlayerStats(live):liveEventFeed(live)}<div class="actions">${ext(live.url,'Offiziellen Liveticker öffnen','text-link')}</div></div>`;
}
function liveEventFeed(live) {
 const events=live.details?.events;
 if(!events)return '<h2>Spielverlauf</h2><p class="notice">Für dieses Spiel ist noch kein Ereignisverlauf verfügbar.</p>';
 // Goals and disciplinary decisions form the readable feed; all source events remain expandable.
 const highlights=events.filter(e=>/tor|zeitstrafe|verwarn|disqual|time.?out/i.test(e.action));
 const markup=list=>list.map(e=>`<li class="live-event"><time>${liveEscape(e.time||'–')}</time><div><strong>${liveEscape(e.action)}${e.score?' · '+e.score.join(' : '):''}</strong>${e.homePlayer?`<span>${liveEscape(e.homePlayer)} <small>${liveEscape(live.home)}</small></span>`:''}${e.awayPlayer?`<span>${liveEscape(e.awayPlayer)} <small>${liveEscape(live.away)}</small></span>`:''}</div></li>`).join('');
 return `<h2>Spielverlauf</h2><p class="muted">Neueste Ereignisse zuerst</p>${events.length?`<ol class="live-events">${markup(highlights)}</ol><details class="live-all-events"><summary>Alle Spielereignisse (${events.length})</summary><ol class="live-events">${markup(events)}</ol></details>`:'<p class="muted">Noch keine Ereignisse gemeldet.</p>'}`;
}
function livePlayerStats(live) {
 const roster=live.details?.players, value=n=>n===null||n===undefined?'–':n;
 if(!roster)return '<h2>Spielerstatistiken</h2><p class="notice">Für dieses Spiel sind noch keine Spielerstatistiken verfügbar.</p>';
 return [true,false].map(home=>{
  const team=home?live.home:live.away, list=roster.filter(p=>p.home===home).sort((a,b)=>(b.goals??-1)-(a.goals??-1)||a.name.localeCompare(b.name));
  return `<section class="live-team-stats"><h2>${liveEscape(team)}</h2>${list.length?`<h3>Toptorschützen</h3><div class="scorers">${list.filter(p=>p.goals>0).slice(0,5).map(p=>`<div><span>${liveEscape(p.name)}</span><strong>${p.goals} <small>Tore</small></strong></div>`).join('')||'<p class="muted">Noch keine Tore gemeldet.</p>'}</div><h3>Spielerwerte</h3><div class="report-table-wrap" tabindex="0" role="region" aria-label="Spielerstatistiken ${liveEscape(team)}"><table class="report-table"><thead><tr><th scope="col">Spieler</th><th scope="col">Tore/Würfe</th><th scope="col">7 m</th><th scope="col">2 min</th><th scope="col">Gelb</th><th scope="col">Rot</th></tr></thead><tbody>${list.map(p=>`<tr><th scope="row">${liveEscape(p.name)}</th><td>${value(p.goals)}/${value(p.shots)}</td><td>${value(p.seven)}/${value(p.sevenShots)}</td><td>${value(p.twoMinutes)}</td><td>${value(p.yellow)}</td><td>${value(p.red)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="notice">Noch keine Spielerwerte gemeldet.</p>'}</section>`;
 }).join('')+'<p class="muted">2 min: Anzahl Zeitstrafen · –: Wert nicht verfügbar</p>';
}
function refreshLiveViews() {
 const [page,id,tab='overview']=(location.hash.slice(1)||'home').split('/');
 if(page==='match') {
  const g=games.find(x=>x.id===id)||(id==='live'?{id:'live'}:null);
  if(!g)return;
  const container=document.getElementById('live-detail-content');
  if(container){
   const open=container.querySelector('.live-all-events')?.open;
   if(container.contains(document.activeElement))return;
   const html=liveMatchContent(g,tab);
   if(container.innerHTML!==html)container.innerHTML=html;
   if(open&&container.querySelector('.live-all-events'))container.querySelector('.live-all-events').open=true;
  } else if(liveForFixture(g))render();
 }
 if(page==='season'&&id==='games')document.querySelectorAll('[data-game-card]').forEach(el=>{
  if(el.contains(document.activeElement))return;
  const g=games.find(x=>x.id===el.dataset.gameCard);
  if(!g)return;
  const wrapper=document.createElement('div');wrapper.innerHTML=card(g,el.classList.contains('current-game'));
  if(el.outerHTML!==wrapper.firstElementChild.outerHTML)el.replaceWith(wrapper.firstElementChild);
 });
}
