/* Drei feste Spielbereiche, deren Inhalt dem bestätigten Spielstatus folgt. */
const fcsgLineupSides = new Map();
function fcsgMatchStage(g) { return g.live ? 'live' : g.score ? 'finished' : 'preview'; }
function fcsgReport(g) {
 const r=g.report||fcsgData.games.find(x=>x.id===g.id)?.report;
 if(!r||JSON.stringify(r.score)!==JSON.stringify(g.score)||!Array.isArray(r.paragraphs))return '<p class="notice">Der kurze Match-Rückblick wird nach dem nächsten Datenlauf ergänzt.</p>';
 return `<section class="ai-match-preview"><p class="eyebrow">${r.generator==='ki'?'KI-Match-Rückblick':'Match-Rückblick'}</p><h2>${liveEscape(r.headline)}</h2>${r.paragraphs.map(p=>`<p>${liveEscape(p)}</p>`).join('')}<p class="muted">Aus den offiziellen FCSG-Spieldaten · ${new Date(r.generatedAt).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} Uhr</p></section>`;
}
function fcsgMatchTickerSignature(g) { return JSON.stringify([fcsgMatchStage(g),g.score,g.ticker,g.report,g.home,g.away,g.date,g.time,g.confirmed,g.venue,g.tickets,fcsgLiveErrors.has(g.id)]); }
function fcsgMatchTicker(g) {
 const stage=fcsgMatchStage(g);
 if(stage==='preview')return `<h2>Spielvorschau</h2>${matchPreviewSlot(g,'fcsg')}<p class="notice">Der Liveticker startet mit dem Spiel.</p>`;
 return `${stage==='finished'?fcsgReport(g):''}${fcsgTicker(g)}`;
}
function fcsgMatch(id,tab) {
 const g=fcsgGame(id);if(!g)return notFound();
 const selected=['squad','stats'].includes(tab)?tab:'ticker';
 return `<section class="match fcsg-match-page"><div class="content narrow">${backLink('#season/games','Zurück zu den Spielen')}<h1 class="live-sr-context">${liveEscape(g.home)} gegen ${liveEscape(g.away)}</h1>${fcsgCard(g)}<p class="fcsg-live-summary" role="status" aria-atomic="true"><span data-fcsg-phase="${g.id}">${fcsgLiveState(g)}</span></p><nav class="segments match-tabs fcsg-match-tabs" aria-label="Spielbereich">${[['ticker','Liveticker'],['squad','Aufstellung'],['stats','Statistiken']].map(([key,label])=>`<a class="${selected===key?'selected':''}"${selected===key?' aria-current="page"':''} href="#match/${g.id}/${key}">${label}</a>`).join('')}</nav>${selected==='ticker'?`<section id="fcsg-live-panel" data-stage="${fcsgMatchStage(g)}" data-signature="${liveEscape(fcsgMatchTickerSignature(g))}">${fcsgMatchTicker(g)}</section>`:selected==='squad'?`<section id="fcsg-lineups">${fcsgLineups(g)}</section>`:`<section id="fcsg-team-stats">${fcsgTeamStats(g)}</section>`}<p>${ext(g.url,'Offizielles Matchcenter','news-link')}</p></div></section>${fcsgFooter('games')}`;
}
function fcsgPreviewStats(g) {
 const all=fcsgData.games.filter(x=>x.score&&x.id!==g.id&&x.date<g.date).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const recent=all.filter(x=>x.leagueId===g.leagueId).slice(-5),duels=all.filter(x=>[x.home,x.away].includes(g.home)&&[x.home,x.away].includes(g.away)).slice(-5);
 const list=games=>games.length?`<ol class="fcsg-recent-matches">${games.slice().reverse().map(x=>`<li><a href="#match/${x.id}/ticker"><span><small>${liveEscape(date(x))}</small>${liveEscape(x.home)}<br>${liveEscape(x.away)}</span><strong class="${fcsgResult(x).state}">${x.score.join(' : ')}</strong></a></li>`).join('')}</ol>`:'<p class="notice">Noch keine bestätigten Spiele im verfügbaren Datenstand.</p>';
 return `<section class="fcsg-stat-card"><p class="eyebrow">Vor dem Anpfiff</p><h2>Formkurve & letzte Spiele</h2><p class="muted">FCSG · ${liveEscape(g.league)} · nur abgeschlossene Spiele vor dieser Partie</p><div class="season-form">${recent.map(x=>`<a class="${fcsgResult(x).state}" href="#match/${x.id}/ticker" aria-label="${liveEscape(date(x)+' · '+fcsgResult(x).label)}">${{win:'S',draw:'U',loss:'N'}[fcsgResult(x).state]}</a>`).join('')}</div><p class="muted">Ältestes Spiel links · neuestes rechts</p>${recent.length?fcsgGoalDifferenceChart(recent):''}${list(recent)}</section><section class="fcsg-stat-card"><h2>Direktvergleich</h2><p class="muted">Begegnungen aus dem verfügbaren Saison-Spielplan.</p>${list(duels)}</section>`;
}
function fcsgTeamStats(g) { return fcsgMatchStage(g)==='preview'?fcsgPreviewStats(g):fcsgLiveTeamStats(g); }
