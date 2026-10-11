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
function fcsgStatRow(g,label,key,percent=false) {
 const values=[g.homeStats?.[key],g.awayStats?.[key]],valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const total=values.every(valid)?values[0]+values[1]:0;
 const val=v=>valid(v)?v.toLocaleString('de-CH',{maximumFractionDigits:1})+(percent?'%':''):'–';
 return `<div class="fcsg-stat-row"><div><strong>${val(values[0])}</strong><span>${label}</span><strong>${val(values[1])}</strong></div><div class="fcsg-stat-bar" aria-hidden="true">${values.every(valid)&&total>0?`<i style="width:${values[0]/total*100}%"></i><i style="width:${values[1]/total*100}%"></i>`:''}</div></div>`;
}
function fcsgMomentum(g) {
 const series=g.momentum||[];
 if(!series.length)return `<section class="fcsg-stat-card"><h2>Torgefährlichkeit</h2><p class="notice">Für dieses Spiel noch nicht verfügbar.</p></section>`;
 // Jede Halbzeit hat eine eigene Zeitachse; Nachspielzeit der ersten Hälfte endet vor der zweiten.
 const first=series.filter(p=>p.period===1),second=series.filter(p=>p.period===2),extra=series.filter(p=>p.period>2);
 const ordered=[...first,...second,...extra].length? [...first,...second,...extra]:series;
 const n=ordered.length,max=Math.max(.001,...ordered.flatMap(p=>[p.home,p.away]));
 const points=side=>ordered.map((p,i)=>`${(12+i/Math.max(1,n-1)*576).toFixed(1)},${(112+(side==='home'?-1:1)*p[side]/max*88).toFixed(1)}`);
 const halfX=12+Math.max(0,first.length-.5)/Math.max(1,n-1)*576;
 return `<section class="fcsg-stat-card fcsg-momentum"><h2>Torgefährlichkeit</h2><p class="fcsg-stat-teams"><span>${liveEscape(g.home)}</span><span>${liveEscape(g.away)}</span></p><svg viewBox="0 0 600 242" role="img" aria-label="Torgefährlichkeit im Spielverlauf. ${liveEscape(g.home)} oberhalb, ${liveEscape(g.away)} unterhalb der Mittellinie."><defs><linearGradient id="fcsg-momentum-home" x2="0" y2="1"><stop stop-color="#8de0a6" stop-opacity=".8"/><stop offset="1" stop-color="#8de0a6" stop-opacity=".08"/></linearGradient></defs><line x1="12" y1="112" x2="588" y2="112" stroke="currentColor" opacity=".25"/>${['home','away'].map(side=>`<polygon points="12,112 ${points(side).join(' ')} 588,112" fill="${side==='home'?'url(#fcsg-momentum-home)':'#afbac2'}" opacity="${side==='home'?1:.35}"/><polyline points="${points(side).join(' ')}" fill="none" stroke="${side==='home'?'#8de0a6':'#afbac2'}" stroke-width="2" stroke-linejoin="round"/>`).join('')}${first.length&&second.length?`<line x1="${halfX}" y1="12" x2="${halfX}" y2="212" stroke="currentColor" stroke-dasharray="4 5" opacity=".35"/><text x="${halfX}" y="236" text-anchor="middle">HZ</text>`:''}<text x="12" y="236">0′</text><text x="588" y="236" text-anchor="end">${g.live?'Live':'Ende'}</text></svg><p class="muted">Momentum aus den offiziellen FCSG-Spieldaten.</p></section>`;
}
function fcsgTeamStats(g) {
 if(fcsgMatchStage(g)==='preview')return fcsgPreviewStats(g);
 const groups=[['Hauptstatistiken',[['Ballbesitz','possessionPercentage',true],['Gesamtschüsse','totalScoringAtt'],['Schüsse aufs Tor','onTargetScoringAtt'],['Fouls','fkFoulLost'],['Abseits','totalOffside'],['Eckbälle','wonCorners'],['Torwartparaden','saves']]],['Schüsse',[['Schüsse daneben','shotOffTarget'],['Blockierte Schüsse','blockedScoringAtt'],['Pfostenschüsse','hitWoodwork']]],['Pässe',[['Summe der Pässe','totalPass'],['Flanken','totalCross']]],['Strafen',[['Gelbe Karten','totalYellowCard'],['Zweite Gelbe Karte','secondYellow'],['Rote Karten','totalRedCard']]]];
 return `${fcsgMomentum(g)}${groups.map(([title,rows])=>`<section class="fcsg-stat-card"><h2>${title}</h2><p class="fcsg-stat-teams"><span>${fcsgBadge(g.home,g.homeLogo)}${liveEscape(g.home)}</span><span>${fcsgBadge(g.away,g.awayLogo)}${liveEscape(g.away)}</span></p>${rows.map(([label,key,percent])=>fcsgStatRow(g,label,key,percent)).join('')}</section>`).join('')}<p class="muted">–: Wert nicht verfügbar · ${g.live?'laufender Spielstand':'Endstand'} · Offizielles FCSG-Matchcenter</p>`;
}
function fcsgPitchRows(l) {
 const rank={goalkeeper:0,torwart:0,defender:1,verteidiger:1,'defensive midfielder':2,midfielder:3,mittelfeld:3,'attacking midfielder':4,winger:5,striker:6,forward:6,stürmer:6};
 const sides={left:0,'left/centre':1,centre:2,center:2,'centre/right':3,right:4};
 const starters=(l?.players||[]).filter(p=>!p.bench);
 // Avoid assigning invented tactical slots when the official position is missing.
 if(starters.length!==11||starters.some(p=>rank[String(p.position).toLowerCase()]===undefined))return null;
 const groups=new Map();for(const p of starters){const key=rank[String(p.position).toLowerCase()];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 if(groups.get(0)?.length!==1)return null;
 return [...groups].sort(([a],[b])=>b-a).map(([,players])=>players.sort((a,b)=>(sides[String(a.side).toLowerCase()]??2)-(sides[String(b.side).toLowerCase()]??2)||(a.place??99)-(b.place??99)));
}
function fcsgPlayerMarks(g,p,home) {
 const names=[p.name,p.matchName].filter(Boolean),matches=name=>names.includes(name);
 const marks=(g.events||[]).filter(e=>e.home===home&&matches(e.player)).map(e=>`<span class="fcsg-player-event" title="${liveEscape(e.type+' · '+e.minute+'′')}">${e.type==='Tor'?'⚽':e.type==='Gelb'?'🟨':e.type==='Rot'||e.type==='Gelb-Rot'?'🟥':''}<span class="live-sr-context">${liveEscape(e.type+' · '+e.minute+'′')}</span></span>`);
 for(const e of g.substitutions||[])if(e.home===home&&(matches(e.on)||matches(e.off)))marks.push(`<span class="fcsg-player-event ${matches(e.on)?'is-on':'is-off'}" title="${matches(e.on)?'Eingewechselt':'Ausgewechselt'} · ${liveEscape(e.minute)}′">${matches(e.on)?'↑':'↓'}<span class="live-sr-context">${matches(e.on)?'Eingewechselt':'Ausgewechselt'} ${liveEscape(e.minute)}′</span></span>`);
 return marks.join('');
}
function fcsgLineupPlayer(g,p,home,pitch=false) {
 const label=p.lastName||p.matchName||p.name;
 return `<div class="fcsg-lineup-player${pitch?' on-pitch':''}">${p.image?`<img src="${liveEscape(p.image)}" alt="" loading="lazy" decoding="async">`:'<span class="fcsg-player-silhouette" aria-hidden="true">♟</span>'}<span class="fcsg-shirt-number">${p.number??'–'}</span><span class="fcsg-player-name" title="${liveEscape(p.name)}">${liveEscape(pitch?label:p.name)}</span><span class="fcsg-player-marks">${fcsgPlayerMarks(g,p,home)}</span></div>`;
}
function fcsgLineupContent(g,side) {
 const home=side==='home',l=home?g.homeLineup:g.awayLineup;
 if(!l)return `<p class="notice">${g.score?'Für dieses Spiel ist keine bestätigte Aufstellung verfügbar.':'Die Aufstellung ist noch nicht veröffentlicht. Sie erscheint, sobald der Verein sie bekannt gibt.'}</p>`;
 const rows=fcsgPitchRows(l),starters=(l.players||[]).filter(p=>!p.bench),bench=(l.players||[]).filter(p=>p.bench);
 const formation=String(l.formation||'').replace(/[^1-9]/g,'').split('').join('–');
 return `<p class="muted">${home?'Heim':'Gast'}${formation?' · Formation '+liveEscape(formation):''}</p>${rows?`<div class="fcsg-pitch"><div class="fcsg-pitch-lines" aria-hidden="true"><i></i><b></b></div><div class="fcsg-pitch-rows">${rows.map(row=>`<div class="fcsg-pitch-row">${row.map(p=>fcsgLineupPlayer(g,p,home,true)).join('')}</div>`).join('')}</div></div>`:`<h3>Startelf</h3><div class="fcsg-bench">${starters.map(p=>fcsgLineupPlayer(g,p,home)).join('')}</div>`}<h2>Auswechselspieler</h2>${bench.length?`<div class="fcsg-bench">${bench.map(p=>fcsgLineupPlayer(g,p,home)).join('')}</div>`:'<p class="notice">Keine Ersatzbank übermittelt.</p>'}<h2>Trainer</h2>${l.coach?.name?`<div class="fcsg-coach">${l.coach.image?`<img src="${liveEscape(l.coach.image)}" alt="" loading="lazy">`:''}<strong>${liveEscape(l.coach.name)}</strong><span>Cheftrainer</span></div>`:'<p class="notice">Noch nicht verfügbar.</p>'}<p class="muted">⚽ Tor · 🟨 Gelb · 🟥 Rot / Gelb-Rot · ↑ eingewechselt · ↓ ausgewechselt</p>`;
}
function fcsgLineups(g) {
 const side=fcsgLineupSides.get(g.id)||(g.home==='FC St.Gallen 1879'?'home':'away');
 return `<h2>Aufstellung</h2><div class="fcsg-lineup-switch" role="group" aria-label="Mannschaft wählen">${[['home',g.home,g.homeLogo],['away',g.away,g.awayLogo]].map(([key,name,logo])=>`<button type="button" data-fcsg-lineup="${key}" data-match-id="${g.id}" aria-pressed="${key===side}">${fcsgBadge(name,logo)}<span>${liveEscape(name)}</span></button>`).join('')}</div><div id="fcsg-lineup-content">${fcsgLineupContent(g,side)}</div>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-fcsg-lineup]');if(!button||activeClub!=='fcsg')return;
 const g=fcsgGame(button.dataset.matchId);if(!g)return;
 fcsgLineupSides.set(g.id,button.dataset.fcsgLineup);
 const content=document.getElementById('fcsg-lineup-content');if(content)content.innerHTML=fcsgLineupContent(g,button.dataset.fcsgLineup);
 document.querySelectorAll('[data-fcsg-lineup]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
});
