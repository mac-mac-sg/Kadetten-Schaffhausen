/* Drei feste Spielbereiche, deren Inhalt dem bestätigten Spielstatus folgt. */
function fcsgStatValue(v,percent=false){return typeof v==='number'&&Number.isFinite(v)&&v>=0?`${v.toLocaleString('de-CH',{maximumFractionDigits:percent?1:0})}${percent?'%':''}`:'–';}
function fcsgStatRow(g,label,key,percent=false){
 const home=g.homeStats?.[key],away=g.awayStats?.[key],valid=[home,away].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0),total=valid?home+away:0,ratio=total?home/total*100:50,fcsgHome=/St[. ]?\s*Gallen/i.test(g.home);
 return `<div class="fcsg-stat-row"><div class="fcsg-stat-values"><strong${valid&&home>away?' class="is-leading"':''}>${fcsgStatValue(home,percent)}</strong><span>${label}</span><strong${valid&&away>home?' class="is-leading"':''}>${fcsgStatValue(away,percent)}</strong></div><div class="fcsg-stat-bar ${fcsgHome?'fcsg-home':'fcsg-away'}${!total?' is-empty':''}" aria-hidden="true"><i style="width:${ratio.toFixed(2)}%"></i><i style="width:${(100-ratio).toFixed(2)}%"></i></div></div>`;
}
function fcsgMomentum(g){
 const rows=(g.momentum||[]).filter(p=>Number.isFinite(p.value)&&Number.isFinite(p.minute));
 if(rows.length<2)return `<section class="fcsg-stat-card"><h2>Torgefährlichkeit</h2><p class="notice">Für dieses Spiel ist noch kein Opta-Verlauf verfügbar.</p></section>`;
 const max=Math.max(...rows.map(p=>Math.abs(p.value)),0.001),w=600,mid=120,amp=95,x=i=>20+i/(rows.length-1)*(w-40),y=(p,home)=>mid-(home?Math.max(p.value,0):Math.min(p.value,0))/max*amp,fcsgHome=/St[. ]?\s*Gallen/i.test(g.home);
 const path=home=>rows.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(p,home).toFixed(2)}`).join(' '),area=home=>`${path(home)} L580,${mid} L20,${mid} Z`,half=rows.findIndex(p=>p.period===2),end=rows.at(-1),title=`Opta-Torgefährlichkeit: ${g.home} oberhalb, ${g.away} unterhalb der Mittellinie`;
 return `<section class="fcsg-stat-card fcsg-momentum"><h2>Torgefährlichkeit</h2><p class="fcsg-stat-legend"><span>${liveEscape(g.home)} ↑</span><span>${liveEscape(g.away)} ↓</span></p><svg viewBox="0 0 600 270" role="img" aria-label="${liveEscape(title)}"><defs><linearGradient id="fcsg-momentum-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fcsgHome?'#a9e877':'#b5c2c0'}" stop-opacity=".65"/><stop offset="1" stop-color="${fcsgHome?'#a9e877':'#b5c2c0'}" stop-opacity=".04"/></linearGradient><linearGradient id="fcsg-momentum-bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fcsgHome?'#b5c2c0':'#a9e877'}" stop-opacity=".04"/><stop offset="1" stop-color="${fcsgHome?'#b5c2c0':'#a9e877'}" stop-opacity=".65"/></linearGradient></defs><path d="${area(true)}" fill="url(#fcsg-momentum-top)"/><path d="${area(false)}" fill="url(#fcsg-momentum-bottom)"/><path d="${path(true)}" fill="none" stroke="${fcsgHome?'#a9e877':'#b5c2c0'}" stroke-width="2"/><path d="${path(false)}" fill="none" stroke="${fcsgHome?'#b5c2c0':'#a9e877'}" stroke-width="2"/><path d="M20,120 H580" stroke="currentColor" opacity=".25"/>${half>0?`<path d="M${x(half).toFixed(2)},15 V225" stroke="currentColor" stroke-dasharray="5 6" opacity=".35"/><text x="${x(half).toFixed(2)}" y="257" text-anchor="middle">HZ</text>`:''}<text x="20" y="257">0′</text><text x="580" y="257" text-anchor="end">${g.score?'Ende':liveEscape(end.minute)+'′'}</text></svg><p class="muted">Relativer Opta-Verlauf, kein xG-Wert. Nachspielzeit bleibt in der jeweiligen Halbzeit.</p><details class="source-details"><summary>Verlaufswerte anzeigen</summary><div class="report-table-wrap"><table class="report-table"><caption>Opta-Momentum · positive Werte: Heim, negative Werte: Gast</caption><thead><tr><th>Halbzeit</th><th>Minute</th><th>Momentum</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${p.period}</td><td>${p.minute}′</td><td>${p.value.toLocaleString('de-CH',{maximumFractionDigits:5})}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
function fcsgLiveTeamStats(g){
 const groups=[['Hauptstatistiken',[['Ballbesitz','possessionPercentage',true],['Gesamtschüsse','totalScoringAtt'],['Schüsse aufs Tor','onTargetScoringAtt'],['Fouls','fkFoulLost'],['Abseits','totalOffside'],['Eckbälle','wonCorners'],['Torwartparaden','saves']]],['Schüsse',[['Schüsse daneben','shotOffTarget'],['Blockierte Schüsse','blockedScoringAtt'],['Pfostenschüsse','hitWoodwork']]],['Pässe',[['Summe der Pässe','totalPass'],['Flanken','totalCross']]],['Strafen',[['Gelbe Karten','totalYellowCard'],['Zweite Gelbe Karten','secondYellow'],['Rote Karten','totalRedCard']]]];
 return `<div class="fcsg-match-dashboard">${fcsgMomentum(g)}${groups.map(([title,stats])=>`<section class="fcsg-stat-card"><h2>${title}</h2><p class="fcsg-stat-legend"><span>${liveEscape(g.home)}</span><span>${liveEscape(g.away)}</span></p>${stats.map(([label,key,percent])=>fcsgStatRow(g,label,key,percent)).join('')}</section>`).join('')}<p class="muted">Offizielles FCSG-Matchcenter / Opta · – = Wert nicht verfügbar. ${g.live?'Aktualisierung alle 45 Sekunden.':''}</p></div>`;
}
const fcsgLineupChoices=new Map();
function fcsgPlayerMatchBadges(g,p,home){
 const names=[p.eventName,p.name].filter(Boolean),same=e=>e.home===home&&names.includes(e.player),events=(g.events||[]).filter(same),subs=(g.substitutions||[]).filter(e=>e.home===home&&(names.includes(e.on)||names.includes(e.off)));
 return events.map(e=>`<span class="fcsg-player-event ${e.type==='Gelb'?'is-yellow':e.type==='Rot'||e.type==='Gelb-Rot'?'is-red':''}" title="${liveEscape(e.type+' · '+e.minute+'′')}">${e.type==='Gelb'?'Gelb':e.type==='Rot'?'Rot':e.type==='Gelb-Rot'?'G/R':e.ownGoal?'ET':'Tor'} ${liveEscape(e.minute)}′</span>`).join('')+subs.map(e=>`<span class="fcsg-player-event" title="${names.includes(e.on)?'Eingewechselt':'Ausgewechselt'}">${names.includes(e.on)?'↑':'↓'} ${liveEscape(e.minute)}′</span>`).join('');
}
function fcsgLineupPlayer(g,p,home,pitch=false){
 const safeImage=typeof p.image==='string'&&/^https:\/\//.test(p.image),initials=p.name.split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join('');
 return `<li class="fcsg-formation-player">${safeImage?`<img src="${liveEscape(p.image)}" alt="" width="64" height="72" loading="lazy">`:`<span class="fcsg-player-initials" aria-hidden="true">${liveEscape(initials)}</span>`}<b class="fcsg-shirt">${p.number??'–'}</b><span class="fcsg-formation-name">${liveEscape(pitch?p.shortName||p.name:p.name)}</span>${pitch?`<span class="sr-only">${liveEscape(p.name)}</span>`:''}<span class="fcsg-player-events">${fcsgPlayerMatchBadges(g,p,home)}</span></li>`;
}
function fcsgLineupTeam(g,home){
 const name=home?g.home:g.away,l=home?g.homeLineup:g.awayLineup;
 if(!l)return '<p class="notice">Aufstellung noch nicht veröffentlicht.</p>';
 const starters=l.players.filter(p=>!p.bench),rank=p=>({'Goalkeeper':0,'Defender':1,'Defensive Midfielder':2,'Midfielder':3,'Attacking Midfielder':3,'Striker':4,'Forward':4}[p.position]??5),side=p=>p.side?.startsWith('Left')?0:p.side?.includes('Right')?2:1;
 const complete=starters.length===11&&starters.every(p=>rank(p)<5);
 const groups=[...new Set(starters.map(rank))].sort((a,b)=>b-a).map(r=>starters.filter(p=>rank(p)===r).sort((a,b)=>side(a)-side(b)||(a.place??0)-(b.place??0))),formation=String(l.formation||'–').split('').join('–');
 return `<p class="fcsg-formation-heading"><strong>${liveEscape(name)}</strong><span>Formation ${liveEscape(formation)}</span></p>${complete?`<div class="fcsg-pitch" aria-label="Startaufstellung ${liveEscape(name)}">${groups.map(row=>`<ol class="fcsg-pitch-row">${row.map(p=>fcsgLineupPlayer(g,p,home,true)).join('')}</ol>`).join('')}</div>`:starters.length?`<ol class="fcsg-bench">${starters.map(p=>fcsgLineupPlayer(g,p,home)).join('')}</ol>`:'<p class="notice">Startaufstellung noch nicht veröffentlicht.</p>'}<h2>Auswechselspieler</h2><ol class="fcsg-bench">${l.players.filter(p=>p.bench).map(p=>fcsgLineupPlayer(g,p,home)).join('')}</ol><h2>Trainer</h2>${l.coach?.name?`<div class="fcsg-coach">${l.coach.image?`<img src="${liveEscape(l.coach.image)}" alt="" width="64" height="72" loading="lazy">`:''}<div><strong>${liveEscape(l.coach.name)}</strong><span>Cheftrainer</span></div></div>`:'<p class="notice">Trainer nicht verfügbar.</p>'}<p class="muted">Positionen nach offizieller Aufstellung. Tor / ET = Tor / Eigentor · Gelb / Rot / G/R = Karten · ↑ / ↓ = eingewechselt / ausgewechselt.</p>`;
}
function fcsgLineups(g){
 const home=fcsgLineupChoices.get(g.id)??/St[. ]?\s*Gallen/i.test(g.home);
 return `<div class="fcsg-lineup-dashboard"><h2>Aufstellung</h2><div class="fcsg-lineup-switch" role="group" aria-label="Mannschaft auswählen">${[[true,g.home,g.homeLogo],[false,g.away,g.awayLogo]].map(([value,name,logo])=>`<button type="button" data-fcsg-lineup="${value?'home':'away'}" data-match-id="${liveEscape(g.id)}" aria-pressed="${home===value}">${logo?`<img src="${liveEscape(logo)}" alt="" width="24" height="24">`:''}<span>${liveEscape(name)}</span></button>`).join('')}</div><div class="fcsg-lineup-team">${fcsgLineupTeam(g,home)}</div></div>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-fcsg-lineup]');if(!button||activeClub!=='fcsg')return;
 const g=fcsgGame(button.dataset.matchId);if(!g)return;
 const home=button.dataset.fcsgLineup==='home';fcsgLineupChoices.set(g.id,home);
 const panel=button.closest('.fcsg-lineup-dashboard');panel.querySelectorAll('[data-fcsg-lineup]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.fcsgLineup==='home')===home)));panel.querySelector('.fcsg-lineup-team').innerHTML=fcsgLineupTeam(g,home);
});

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
function fcsgMatchHeader(g) {
 const result=fcsgResult(g);
 return `<header data-fcsg-game="${g.id}" class="fcsg-match-header ${result?'result-'+result.state:''}"><p class="eyebrow">${liveEscape(g.league)} · ${date(g)} · ${g.confirmed?liveEscape(g.time)+' Uhr':'Termin noch nicht bestätigt'}</p><div class="matchup"><div class="matchup-team">${fcsgBadge(g.home,g.homeLogo)}<span>${liveEscape(g.home)}</span></div><strong data-fcsg-score="${g.id}">${fcsgDisplayScore(g)}</strong><div class="matchup-team">${fcsgBadge(g.away,g.awayLogo)}<span>${liveEscape(g.away)}</span></div></div><p class="fcsg-live-summary" role="status" aria-atomic="true"><span data-fcsg-phase="${g.id}">${fcsgLiveState(g)}</span>${g.half?' · Halbzeit '+g.half.join(':'):''}</p>${g.venue?`<p class="fcsg-match-venue">${liveEscape(g.venue)}</p>`:''}</header>`;
}
function fcsgMatch(id,tab) {
 const g=fcsgGame(id);if(!g)return notFound();
 const selected=['squad','stats'].includes(tab)?tab:'ticker';
 return `<section class="match fcsg-match-page"><div class="content narrow">${backLink('#season/games','Zurück zu den Spielen')}<h1 class="live-sr-context">${liveEscape(g.home)} gegen ${liveEscape(g.away)}</h1>${fcsgMatchHeader(g)}${sourceNotice('games')}<nav class="segments match-tabs fcsg-match-tabs" aria-label="Spielbereich">${[['ticker','Liveticker'],['squad','Aufstellung'],['stats','Statistiken']].map(([key,label])=>`<a class="${selected===key?'selected':''}"${selected===key?' aria-current="page"':''} href="#match/${g.id}/${key}">${label}</a>`).join('')}</nav>${selected==='ticker'?`<section id="fcsg-live-panel" data-stage="${fcsgMatchStage(g)}" data-signature="${liveEscape(fcsgMatchTickerSignature(g))}">${fcsgMatchTicker(g)}</section>`:selected==='squad'?`<section id="fcsg-lineups">${fcsgLineups(g)}</section>`:`<section id="fcsg-team-stats">${fcsgTeamStats(g)}</section>`}<p>${ext(g.url,'Offizielles Matchcenter','news-link')}</p></div></section>${fcsgFooter('games')}`;
}
function fcsgPreviewStats(g) {
 const all=fcsgData.games.filter(x=>x.score&&x.id!==g.id&&x.date<g.date).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const recent=all.filter(x=>x.leagueId===g.leagueId).slice(-5),duels=all.filter(x=>[x.home,x.away].includes(g.home)&&[x.home,x.away].includes(g.away)).slice(-5);
 const list=games=>games.length?`<ol class="fcsg-recent-matches">${games.slice().reverse().map(x=>`<li><a href="#match/${x.id}/ticker"><span><small>${liveEscape(date(x))}</small>${liveEscape(x.home)}<br>${liveEscape(x.away)}</span><strong class="${fcsgResult(x).state}">${x.score.join(' : ')}</strong></a></li>`).join('')}</ol>`:'<p class="notice">Noch keine bestätigten Spiele im verfügbaren Datenstand.</p>';
 return `<section class="fcsg-stat-card"><p class="eyebrow">Vor dem Anpfiff</p><h2>Formkurve & letzte Spiele</h2><p class="muted">FCSG · ${liveEscape(g.league)} · nur abgeschlossene Spiele vor dieser Partie</p><div class="season-form">${recent.map(x=>`<a class="${fcsgResult(x).state}" href="#match/${x.id}/ticker" aria-label="${liveEscape(date(x)+' · '+fcsgResult(x).label)}">${{win:'S',draw:'U',loss:'N'}[fcsgResult(x).state]}</a>`).join('')}</div><p class="muted">Ältestes Spiel links · neuestes rechts</p>${recent.length?fcsgGoalDifferenceChart(recent):''}${list(recent)}</section><section class="fcsg-stat-card"><h2>Direktvergleich</h2><p class="muted">Begegnungen aus dem verfügbaren Saison-Spielplan.</p>${list(duels)}</section>`;
}
function fcsgTeamStats(g) { return fcsgMatchStage(g)==='preview'?fcsgPreviewStats(g):fcsgLiveTeamStats(g); }
