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
  setTimeout(() => slot.classList.remove('is-matchday-intro'), 2200);
}
function showLiveMatch() {
  const slot = document.getElementById('live-match');
  if (!slot) return;
  const {game: g, live} = homeFixture();
  if (!g || (slot.dataset.liveOnly === 'true' && !live)) {
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
  slot.classList.toggle('matchday-loss', result?.state === 'loss');
  slot.classList.toggle('matchday-draw', result?.state === 'draw');
  slot.classList.toggle('matchday-upcoming', today && !live && !ended);
  slot.classList.toggle('is-live', !!live);
  slot.classList.toggle('matchday-over', ended && result?.state !== 'win');
  if (slot.innerHTML !== html) slot.innerHTML = html;
  slot.hidden = false;
  if (today) playMatchdayIntro(slot, g.date);
}

async function checkLiveMatch() {
  clearTimeout(liveTimer);
  if ((typeof activeClub !== 'undefined' && activeClub !== 'kadetten') || document.hidden || !(['', '#home'].includes(location.hash) || location.hash.startsWith('#match/') || location.hash === '#season/games')) return;
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
    applyFinishedMatch(d.finished);
    liveState = d;
    liveRequestFailed = false;
    if (d.match || d.finished) { lastLiveMatch = d.match || d.finished; lastLiveAt = d.checkedAt; lastLiveDate = swissToday(); }
  } catch {
    liveRequestFailed = true;
  } finally {
    liveBusy = false;
    showLiveMatch();
    refreshMatchdayDetail();
    refreshLiveViews();
    if (typeof activeClub === 'undefined' || activeClub === 'kadetten') liveTimer = setTimeout(checkLiveMatch, (liveState?.match || lastLiveMatch) ? 30000 : 60000);
  }
}

function liveMatchHref(live) {
 const fixture=games.find(g=>g.date===swissToday()&&sameFixture(g,live));
 return '#match/'+encodeURIComponent(fixture?.id||'live')+'/stats';
}
function liveForFixture(g) {
 const live=freshLive() || (lastLiveDate === swissToday() ? lastLiveMatch : null);
 return live && (g.id==='live' || g.date===swissToday()&&sameFixture(g,live)) ? live : null;
}
function liveMatchPage(g, tab='overview') {
 return `<section class="match live-match-page">${backLink('#season/games','Zurück zu den Spielen','back')}<div id="live-detail-content">${liveMatchContent(g,tab)}</div></section>${footer()}`;
}
function liveMatchContent(g, tab) {
 const live=liveForFixture(g);
 if(tab==='overview')tab='stats'; // zuerst die Statistiken; Spielverlauf und Bericht liegen im Tab «report»
 const active=!!freshLive()&&sameFixture(live,freshLive()), details=live?.details, archive=ehfArchiveFor(g);
 const status=liveRequestFailed||!navigator.onLine?'Verbindung unterbrochen · letzter bestätigter Stand':live?.status==='finished'?'Beendet · Endresultat':active?'Jetzt live':'Spiel wird derzeit nicht als live gemeldet';
 if(!live)return `<div class="content narrow"><h1>Live-Spiel</h1><p role="status">${navigator.onLine?'Live-Daten werden geladen …':'Live-Daten sind offline nicht verfügbar.'}</p></div>`;
 const resultClass=live.status==='finished'&&live.score?' result-'+teamResult(live,'Kadetten Schaffhausen').state:'';
 const updated=lastLiveAt?new Date(lastLiveAt).toLocaleTimeString('de-CH',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',second:'2-digit'}):null;
 return `<header class="live-match-header${resultClass}"><p class="eyebrow">${liveEscape(live.league)} · ${live.status==='finished'?'Spiel beendet':'Live-Spiel'}</p><p class="live-status ${active?'is-current':''}" role="status" aria-atomic="true">${status}<span class="live-sr-context"> · ${liveEscape(live.home)} ${live.score?live.score.join(' : '):'– : –'}</span></p><div class="matchup"><div class="matchup-team">${badge(live.home)}<span>${liveEscape(live.home)}</span></div><strong>${live.score?live.score.join(' : '):'– : –'}</strong><div class="matchup-team">${badge(live.away)}<span>${liveEscape(live.away)}</span></div></div><p>${[live.phase,live.clock].filter(Boolean).map(liveEscape).join(' · ')}</p>${live.half&&(live.status==='finished'||/2\.|zweite|2nd/i.test(live.phase||''))?`<small>Halbzeit ${live.half.join(' : ')}</small>`:''}<small class="live-checked">${updated?'Stand '+updated+' Uhr · ':''}Aktualisierung alle 30 Sekunden</small></header><nav class="segments match-tabs" aria-label="Live-Spielbereich">${[['stats','Statistiken'],['report','Spielverlauf']].map(([id,label])=>`<a href="#match/${encodeURIComponent(g.id)}/${id}" class="${tab===id?'selected':''}">${label}</a>`).join('')}</nav><div class="content narrow live-match-body">${details?.ok===false?`<p class="notice">${details.updatedAt?'Statistiken momentan nicht aktualisierbar · Stand '+new Date(details.updatedAt).toLocaleTimeString('de-CH',{timeZone:'Europe/Zurich'})+' Uhr.':'Weitere Live-Statistiken sind momentan nicht verfügbar.'}</p>`:''}${tab==='stats'?(verifiedReport(g)?reportStats(g):livePlayerStats(live,archive)):liveEventFeed(live,archive)}<div class="actions">${ext(live.url,'Offiziellen Liveticker öffnen','text-link')}</div></div>`;
}
function liveEventFeed(live,archive) {
 const events=live.details?.events;
 if(!events&&live.league==='European League'){
  if(archive?.report)return ehfReportBlock(archive)+ehfGoalFeed(archive,live);
  return '<h2>Spielverlauf</h2><p class="notice">'+(live.status==='finished'?'Der KI-Matchbericht und die Torfolge erscheinen kurz nach dem Spielende an dieser Stelle.':'Für Spiele der European League liefert die EHF während des Spiels keinen Ereignisverlauf. Nach dem Schlusspfiff erscheinen hier ein KI-Matchbericht und die Torfolge; Spielstand und Spielzeit werden live angezeigt, die Statistiken findest du unter «Statistiken».')+'</p>';
 }
 if(!events)return '<h2>Spielverlauf</h2><p class="notice">Für dieses Spiel ist noch kein Ereignisverlauf verfügbar.</p>';
 // Goals and disciplinary decisions form the readable feed; all source events remain expandable.
 const highlights=events.filter(e=>/tor|zeitstrafe|verwarn|disqual|time.?out/i.test(e.action));
 const markup=list=>list.map(e=>`<li class="live-event"><time>${liveEscape(e.time||'–')}</time><div><strong>${liveEscape(e.action)}${e.score?' · '+e.score.join(' : '):''}</strong>${e.homePlayer?`<span>${liveEscape(e.homePlayer)} <small>${liveEscape(live.home)}</small></span>`:''}${e.awayPlayer?`<span>${liveEscape(e.awayPlayer)} <small>${liveEscape(live.away)}</small></span>`:''}</div></li>`).join('');
 return `<h2>Spielverlauf</h2><p class="muted">Neueste Ereignisse zuerst</p>${events.length?`<ol class="live-events">${markup(highlights)}</ol><details class="live-all-events"><summary>Alle Spielereignisse (${events.length})</summary><ol class="live-events">${markup(events)}</ol></details>`:'<p class="muted">Noch keine Ereignisse gemeldet.</p>'}`;
}
// Gesicherter Endstand eines European-League-Spiels (Actions → KV → /api/ehf-reports/<Spiel>): Matchbericht, Torfolge, Statistik.
let ehfArchive={};
const ehfArchiveAttempts=new Map();
function ehfArchiveFor(g) {
 const r=g&&ehfArchive[g.id];
 return r&&Array.isArray(g.score)&&Array.isArray(r.score)&&r.score.every((v,i)=>v===g.score[i])?r:null;
}
async function loadEhfArchive() {
 const [page,id]=location.hash.slice(1).split('/'), g=games.find(x=>x.id===id);
 if(page!=='match'||!g?.score||g.league!=='EHL'||ehfArchive[id]||Date.now()-(ehfArchiveAttempts.get(id)||0)<120000)return;
 ehfArchiveAttempts.set(id,Date.now());
 try{
  const response=await apiFetch('/api/ehf-reports/'+encodeURIComponent(id));if(!response.ok)return;
  const {report}=await response.json();
  if(!report||!Array.isArray(report.score)||report.score.length!==2||!Array.isArray(report.players||[]))return;
  ehfArchive[id]=report;
  if(!location.hash.startsWith('#match/'+id+'/'))return;
  if(document.getElementById('live-detail-content'))refreshLiveViews();else render();
 }catch{/* Ohne gesicherten Stand bleibt die Seite wie bisher. */}
}
function ehfReportBlock(a) {
 const r=a?.report;if(!r||!Array.isArray(r.paragraphs))return '';
 const ki=r.generator==='ki', stamp=new Date(r.generatedAt).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 return `<section class="ai-match-preview ai-match-report" aria-label="${ki?'KI-Matchbericht':'Matchbericht'}"><p class="eyebrow">${ki?'KI-Matchbericht':'Matchbericht'}</p><h3>${liveEscape(r.headline)}</h3>${r.paragraphs.map(t=>`<p>${liveEscape(t)}</p>`).join('')}<details><summary>Quellen & Datenstand</summary><p class="muted">${ki?'Von einer KI aus den Spieldaten der EHF (Livetickerereignisse, Team- und Spielerstatistik) formuliert':'Aus den Spieldaten der EHF (Livetickerereignisse, Team- und Spielerstatistik) zusammengestellt'}, ohne Gewähr · ${liveEscape(stamp)} Uhr.${a.source?.url&&/^https:\/\//.test(a.source.url)?' '+ext(a.source.url,'EHF-Spielseite',''):''}</p></details></section>`;
}
function ehfGoalFeed(a,live) {
 const goals=Array.isArray(a?.goals)?a.goals:[];if(!goals.length)return '';
 const home=live?.home||a.home,away=live?.away||a.away;
 return `<details class="live-all-events ehf-goal-feed"><summary>Torfolge (${goals.length} Tore)</summary><ol class="live-events">${goals.map(x=>`<li class="live-event"><time>${liveEscape(x.t)}</time><div><strong>${Array.isArray(x.s)?x.s.join(' : '):''}${x.p?' · Siebenmeter':''}</strong><span>${liveEscape(x.n||'')} <small>${liveEscape(x.h?home:away)}</small></span></div></li>`).join('')}</ol></details><p class="muted">Quelle: EHF Live-Ticker · ohne Gewähr</p>`;
}
function liveTeamStats(src) {
 const t=src.teamStats, value=n=>n===null||n===undefined?'–':n, pair=(a,b)=>a===null||a===undefined?'–':b===null||b===undefined?String(a):a+'/'+b;
 const rows=[['Tore',x=>value(x.goals)],['Würfe',x=>value(x.shots)],['Fehlwürfe',x=>value(x.misses)],['Wurfquote',x=>x.efficiency===null?'–':x.efficiency+' %'],['7 m (Tore/Würfe)',x=>pair(x.sevenGoals,x.sevenShots)],['2-Minuten-Strafen',x=>value(x.twoMinutes)],['Verwarnungen',x=>value(x.warnings)],['Disqualifikationen',x=>value(x.disqualifications)],['Technische Fehler',x=>value(x.technicalFaults)]];
 return `<h2>Teamstatistik</h2><div class="report-table-wrap" tabindex="0" role="region" aria-label="Teamstatistik"><table class="report-table"><thead><tr><th scope="col">${liveEscape(src.home)}</th><th scope="col"><span class="live-sr-context">Wert</span></th><th scope="col">${liveEscape(src.away)}</th></tr></thead><tbody>${rows.map(([label,f])=>`<tr><td>${f(t.home)}</td><th scope="row">${label}</th><td>${f(t.guest)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Teamwerte der EHF · –: Wert nicht verfügbar</p>`;
}
// Auswahl der Mannschaft in den Spielerstatistiken (gilt für die laufende Sitzung; Standard: die Kadetten).
let liveStatsTeam=null;
const shirt=p=>Number.isFinite(Number(p.number))&&p.number!==null?Number(p.number):999;
function playerTables(list,team,seven) {
 const value=n=>n===null||n===undefined?'–':n, field=list.filter(p=>!p.goalkeeper).sort((a,b)=>shirt(a)-shirt(b)||a.name.localeCompare(b.name)), keepers=list.filter(p=>p.goalkeeper).sort((a,b)=>shirt(a)-shirt(b));
 const scorers=field.filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name)).slice(0,5);
 const quote=p=>p.saves!==null&&p.saves!==undefined&&p.savesFaced>0?Math.round(p.saves*100/p.savesFaced)+' %':'–';
 const fieldTable=field.length?`<h3>Feldspieler</h3><div class="report-table-wrap" tabindex="0" role="region" aria-label="Feldspieler ${liveEscape(team)}"><table class="report-table stats-table"><thead><tr><th scope="col">#</th><th scope="col">Spieler</th><th scope="col" title="Gelbe Karten">YC</th><th scope="col" title="2-Minuten-Strafen">2M</th><th scope="col" title="Rote Karten">RC</th><th scope="col" title="Würfe">S</th><th scope="col" title="Tore">G</th>${seven?'<th scope="col" title="Siebenmeter-Tore/Würfe">7 m</th>':''}</tr></thead><tbody>${field.map(p=>`<tr><td>${liveEscape(p.number??'–')}</td><th scope="row">${liveEscape(p.name)}</th><td>${value(p.yellow)}</td><td>${value(p.twoMinutes)}</td><td>${value(p.red)}</td><td>${value(p.shots)}</td><td>${value(p.goals)}</td>${seven?`<td>${p.seven===null||p.seven===undefined?'–':p.seven+'/'+value(p.sevenShots)}</td>`:''}</tr>`).join('')}</tbody></table></div>`:'';
 const keeperTable=keepers.length?`<h3>Torhüter</h3><div class="report-table-wrap" tabindex="0" role="region" aria-label="Torhüter ${liveEscape(team)}"><table class="report-table stats-table"><thead><tr><th scope="col">#</th><th scope="col">Torhüter</th><th scope="col" title="Paraden">SV</th><th scope="col" title="Erhaltene Würfe">SH</th><th scope="col" title="Fangquote">SV%</th></tr></thead><tbody>${keepers.map(p=>`<tr><td>${liveEscape(p.number??'–')}</td><th scope="row">${liveEscape(p.name)}</th><td>${value(p.saves)}</td><td>${value(p.savesFaced)}</td><td>${quote(p)}</td></tr>`).join('')}</tbody></table></div>`:'';
 return `${scorers.length?`<h3>Toptorschützen</h3><div class="scorers">${scorers.map(p=>`<div><span>${liveEscape(p.name)}</span><strong>${p.goals} <small>Tore</small></strong></div>`).join('')}</div>`:''}${fieldTable}${keeperTable}`||'<p class="notice">Noch keine Spielerwerte gemeldet.</p>';
}
// src: {id, home, away, teamStats, players}; je eine Tabellengruppe pro Mannschaft, umschaltbar ohne neue Abfrage.
function statsView(src) {
 const teamPart=src.teamStats?liveTeamStats(src):'';
 if(!src.players?.length)return teamPart||'<h2>Spielerstatistiken</h2><p class="notice">Für dieses Spiel sind noch keine Spielerstatistiken verfügbar.</p>';
 const side=liveStatsTeam?.id===src.id?liveStatsTeam.side:(/Kadetten/.test(src.home)||!/Kadetten/.test(src.away)?'home':'away'), seven=src.players.some(p=>p.seven!==null&&p.seven!==undefined);
 const teams=[['home',src.home],['away',src.away]];
 return `${teamPart}<h2>Spielerstatistiken</h2><div class="team-switch" role="group" aria-label="Mannschaft wählen" data-stats-switch="${liveEscape(src.id)}" style="--selected:${side==='home'?0:1}"><span class="team-switch-slider" aria-hidden="true"></span>${teams.map(([k,name])=>`<button type="button" data-stats-team="${k}" aria-pressed="${k===side}">${badge(name)}<span>${liveEscape(name)}</span></button>`).join('')}</div>${teams.map(([k,name])=>`<section class="live-team-stats" data-stats-panel="${k}" ${k===side?'':'hidden'}><h2 class="live-sr-context">${liveEscape(name)}</h2>${playerTables(src.players.filter(p=>p.home===(k==='home')),name,seven)}</section>`).join('')}<p class="muted">YC: Gelbe Karte · 2M: 2-Minuten-Strafe · RC: Rote Karte · S: Würfe · G: Tore · SV: Paraden · SH: erhaltene Würfe · SV%: Fangquote${seven?' · 7 m: Siebenmeter-Tore/Würfe':''} · –: Wert nicht verfügbar · Quelle: EHF, ohne Gewähr</p>`;
}
function livePlayerStats(live,archive) {
 const d=live.details, src=archive?{id:String(archive.fixtureId||live.id),home:archive.home,away:archive.away,teamStats:archive.teamStats,players:archive.players}:{id:String(live.id),home:live.home,away:live.away,teamStats:d?.teamStats,players:d?.players};
 return statsView(src);
}
// Umschalten der Mannschaft: Die Tabellen beider Mannschaften sind schon im Dokument; es wird nur gewechselt.
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-stats-team]');if(!button)return;
 const group=button.closest('[data-stats-switch]');if(!group)return;
 const side=button.dataset.statsTeam;liveStatsTeam={id:group.dataset.statsSwitch,side};
 group.style.setProperty('--selected',side==='home'?0:1);
 group.querySelectorAll('[data-stats-team]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 (group.closest('.content')||document).querySelectorAll('[data-stats-panel]').forEach(p=>{p.hidden=p.dataset.statsPanel!==side;});
});
function refreshLiveViews() {
 const [page,id,tab='overview']=(location.hash.slice(1)||'home').split('/');
 if(page==='match') {
  const g=games.find(x=>x.id===id)||(id==='live'?{id:'live'}:null);
  if(!g)return;
  loadEhfArchive();
  const container=document.getElementById('live-detail-content');
  if(container){
   const open=container.querySelector('.live-all-events')?.open, focused=document.activeElement?.dataset?.statsTeam;
   if(container.contains(document.activeElement)&&!focused)return;
   const html=liveMatchContent(g,tab);
   if(container.innerHTML!==html){container.innerHTML=html;if(focused)container.querySelector('[data-stats-team="'+focused+'"]')?.focus();}
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
 if(page==='season'&&id==='games')showLiveMatch();
}

function applyFinishedMatch(finished) {
 if(!finished || finished.status!=='finished' || finished.date!==swissToday() || !Array.isArray(finished.score) || finished.score.length!==2 || !finished.score.every(v=>Number.isInteger(v)&&v>=0))return;
 games=games.map(g=>g.date===finished.date&&sameFixture(g,finished)?{...g,score:finished.score,half:finished.half||g.half}:g);
}
