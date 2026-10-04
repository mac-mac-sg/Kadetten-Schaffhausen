/* Vereinswahl bleibt getrennt von den Kadetten-Snapshots und Live-Daten.
   Etappe 1: gemeinsamer Einstieg; FCSG-Daten werden separat angebunden. */
const fanClubs = {
  kadetten: {name: 'Kadetten Schaffhausen', title: 'KADETTEN', subtitle: 'SCHAFFHAUSEN', logo: 'assets/logo.png'},
  fcsg: {name: 'FC St. Gallen', title: 'FC ST. GALLEN', subtitle: '1879', logo: 'assets/fcsg-logo.svg'}
};
const CLUB_CHOICE_KEY = 'fan-app-active-club-v1';
let activeClub = 'kadetten';
function restoreActiveClub() {
  let choice;
  try {
    choice = new URL(location.href).searchParams.get('club') || localStorage.getItem(CLUB_CHOICE_KEY);
  } catch {}
  activeClub = Object.hasOwn(fanClubs, choice) ? choice : 'kadetten';
}
function clubSwitchRoute(hash) {
  const [page, id] = (hash.slice(1) || 'home').split('/');
  if (page === 'match') return '#season/games';
  if (page === 'player') return '#season/squad';
  if (page === 'news') return '#home';
  if (page === 'club') return '#club';
  if (page === 'season' && ['games', 'table', 'squad'].includes(id)) return '#season/' + id;
  return '#home';
}
function updateClubHeader() {
  const club = fanClubs[activeClub], other = activeClub === 'kadetten' ? 'fcsg' : 'kadetten';
  document.documentElement.dataset.club = activeClub;
  const brand = document.querySelector('.brand');
  if (brand) {
    brand.innerHTML = `<img src="${club.logo}" alt="${club.name}" width="38" height="54"><span>${club.title}<small>${club.subtitle}</small></span>`;
    brand.setAttribute('aria-label', club.name + ' · Startseite');
  }
  const button = document.getElementById('club-switch');
  if (button) {
    button.querySelector('span').textContent = other === 'fcsg' ? 'FCSG' : 'Kadetten';
    button.setAttribute('aria-label', 'Aktueller Verein: ' + club.name + '. Zu ' + fanClubs[other].name + ' wechseln');
    button.title = 'Zu ' + fanClubs[other].name + ' wechseln';
  }
}
function switchClub(id) {
  if (!Object.hasOwn(fanClubs, id) || id === activeClub) return;
  activeClub = id;
  try { localStorage.setItem(CLUB_CHOICE_KEY, id); } catch {}
  clearTimeout(liveTimer);
  clearInterval(dayTimer);
  highlightObserver?.disconnect();
  competition = 'Alle';
  const url = new URL(location.href);
  url.searchParams.set('club', id);
  url.hash = clubSwitchRoute(location.hash);
  history.replaceState(null, '', url.href);
  render();
  window.scrollTo({top: 0, behavior: 'instant'});
  document.getElementById('app')?.focus({preventScroll: true});
  appFeedback(fanClubs[id].name + ' ausgewählt');
  if (id === 'kadetten') checkLiveMatch();
  else loadFcsgData();
}
const fcsgArticles = new Map();
let fcsgOffline = false, fcsgBusy = false;
function fcsgStamp(key) {
 const state=fcsgData.status?.[key],stamp=state?.updatedAt||fcsgData.checkedAt;
 if(!stamp)return 'Stand nicht verfügbar';
 const stale=Date.now()-Date.parse(stamp)>6*3600000;
 return `${state?.ok===false||stale?'Letzter gültiger Stand':'Aktualisiert'}: ${new Date(stamp).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} Uhr${stale?' · Aktualisierung verzögert':''}`;
}
function fcsgFooter(key='news') {
 return `<footer><span class="footer-updated">${fcsgStamp(key)}</span><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Unabhängige Fan-App · kein offizieller Vereinsauftritt.</p><p>${ext('https://www.fcsg.ch/','FC St.Gallen 1879','')} · Vereinsdaten, Artikel, Fotos und Wappen: FC St.Gallen 1879 und jeweilige Urheber.</p></details></footer>`;
}
function fcsgBadge(name, logo) {return logo?`<img class="crest" src="${liveEscape(safeUrl(logo))}" alt="${liveEscape(name)}" width="48" height="60" loading="lazy" decoding="async">`:`<span class="clubmark" aria-hidden="true">${liveEscape(name.split(' ').map(w=>w[0]).slice(0,3).join(''))}</span>`;}
function fcsgResult(g){const home=g.home==='FC St.Gallen 1879';const diff=g.score?g.score[home?0:1]-g.score[home?1:0]:null;return diff===null?null:{state:diff>0?'win':diff<0?'loss':'draw',label:diff>0?'Sieg':diff<0?'Niederlage':'Unentschieden'};}
function fcsgFixture(){return fcsgData.games.find(g=>g.date===swissToday()&&g.score)||fcsgData.games.find(g=>!g.score&&g.date>=swissToday());}
function fcsgMatchday(){const g=fcsgFixture();if(!g)return '';
 return `<section class="home-matchday" aria-label="Aktuelles FCSG-Spiel"><a class="live-match match-preview fcsg-matchday" href="#match/${g.id}/overview"><div class="live-heading"><span>${g.score?'HEUTE GESPIELT':'NÄCHSTES SPIEL'}</span><small>${liveEscape(g.league)}</small></div><div class="live-score"><span>${fcsgBadge(g.home,g.homeLogo)}<b>${liveEscape(g.home)}</b></span><strong>${g.score?g.score.join(' : '):'VS'}</strong><span>${fcsgBadge(g.away,g.awayLogo)}<b>${liveEscape(g.away)}</b></span></div><p class="match-preview-time">${date(g)} · ${g.confirmed?g.time+' Uhr':'Anspielzeit noch offen'}${g.score?' · Rückblick':''}</p></a></section>`;
}
function fcsgHome(){const story=(n,i)=>`<section class="story-screen" id="story-${i}"><img src="${liveEscape(n.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(n.title)}" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}><div class="story-copy"><p>${liveEscape(n.date)} · News</p><h1>${liveEscape(n.title)}</h1><a class="button subtle" href="#news/${n.id}">Zum Artikel</a></div></section>`;
 return `<section class="home-news" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone">${fcsgMatchday()}<header class="home-news-heading"><span aria-hidden="true"></span><h2 id="home-news-title">Neues aus dem Verein</h2></header></div>${fcsgData.stories[0]?story(fcsgData.stories[0],0):'<p class="notice">Noch keine News verfügbar.</p>'}</div>${fcsgData.stories.slice(1).map((n,i)=>story(n,i+1)).join('')}</div><nav class="story-dots" aria-label="News auswählen" hidden>${fcsgData.stories.map((n,i)=>`<button data-story="${i}" ${i>4?'hidden':''} aria-label="${liveEscape(n.title)}" aria-pressed="${i===0}"><span></span></button>`).join('')}</nav></section>${fcsgFooter()}`;
}
function fcsgArticle(id){const n=fcsgData.stories.find(n=>n.id===id);if(!n)return notFound();
 return `<article class="news-article"><div class="article-bar">${backLink('#home','Zurück zu den News','back')}<button class="share button subtle">Teilen</button></div><img class="article-photo" src="${liveEscape(n.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(n.title)}" fetchpriority="high" decoding="async"><div class="content narrow"><p class="muted">${n.date} · Vereinsnews</p><h1>${liveEscape(n.title)}</h1><div id="fcsg-article-body" class="article-fulltext">${fcsgArticles.has(id)?sanitiseArticle(fcsgArticles.get(id),n.url):'<p role="status">Vollständiger Artikel wird geladen …</p>'}</div><p>${ext(n.url,'Originalartikel beim FCSG','news-link')}</p><h2>Mehr News</h2>${fcsgData.stories.filter(x=>x.id!==id).slice(0,4).map(x=>`<a class="related-story" href="#news/${x.id}"><img src="${liveEscape(x.image||'assets/fcsg-logo.svg')}" alt="" loading="lazy"><span>${liveEscape(x.title)}<small>${x.date}</small></span></a>`).join('')}</div></article>${fcsgFooter()}`;
}
async function loadFcsgArticle(){const [page,id]=location.hash.slice(1).split('/');const target=document.getElementById('fcsg-article-body');if(page!=='news'||!target||fcsgArticles.has(id))return;
 try{const r=await apiFetch('/api/fcsg/articles/'+encodeURIComponent(id),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const d=await r.json();if(d.id!==id||typeof d.html!=='string')throw Error();fcsgArticles.set(id,d.html);if(fcsgArticles.size>30)fcsgArticles.delete(fcsgArticles.keys().next().value);if(target===document.getElementById('fcsg-article-body'))target.innerHTML=sanitiseArticle(d.html,d.url);
 }catch{if(target===document.getElementById('fcsg-article-body')){const n=fcsgData.stories.find(n=>n.id===id);target.innerHTML=`<p class="notice">Der vollständige Artikel ist gerade nicht verfügbar.</p><button id="fcsg-retry-article" class="button subtle">Erneut laden</button>${n?ext(n.url,'Originalartikel öffnen','text-link'):''}`;document.getElementById('fcsg-retry-article').onclick=loadFcsgArticle;}}
}
function fcsgCard(g,current=false){const r=fcsgResult(g);
 return `<article class="game-card ${r?'finished result-'+r.state:''} ${current?'current-game':''}" data-fcsg-game="${g.id}">${current?'<p class="current-label">Nächstes Spiel</p>':''}<p class="meta">${r?`<span class="game-result-label">${r.label}</span> · `:''}${liveEscape(g.league)} · ${date(g)} · ${g.confirmed?g.time+' Uhr':'Termin noch nicht bestätigt'}</p><div class="scoreline"><div>${fcsgBadge(g.home,g.homeLogo)}<span>${liveEscape(g.home)}</span></div><strong>${g.score?g.score.join(' : '):'VS'}<small>${g.half?'('+g.half.join(':')+')':g.score?'Endstand':'Vorschau'}</small></strong><div>${fcsgBadge(g.away,g.awayLogo)}<span>${liveEscape(g.away)}</span></div></div><p class="venue">${liveEscape(g.venue)}</p><div class="actions"><a class="button ${g.score?'subtle':''}" href="#match/${g.id}/overview">${g.score?'Rückblick':'Vorschau'}</a></div></article>`;
}
function fcsgGames(){const next=fcsgData.games.find(g=>!g.score&&g.date>=swissToday()),filtered=fcsgData.games.filter(g=>competition==='Alle'||g.league===competition);
 if(mode==='calendar')return fcsgCalendar(filtered);
 return `<p class="muted">${fcsgData.games.length} veröffentlichte Partien · ${fcsgStamp('games')}</p><div class="games game-timeline">${filtered.map(g=>fcsgCard(g,g===next)).join('')}</div>`;
}
function fcsgCalendar(list){const days=new Date(calendarYear,month+1,0).getDate(),offset=(new Date(calendarYear,month,1).getDay()+6)%7;
 return `<div class="calendar-panel"><div class="calendar match-calendar" style="--calendar-weeks:${Math.ceil((offset+days)/7)}">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=>`<b>${d}</b>`).join('')}${'<div class="day empty-day"></div>'.repeat(offset)}${Array.from({length:days},(_,i)=>{const key=`${calendarYear}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,found=list.filter(g=>g.date===key);return `<div class="day ${found.length?'has-game':''} ${key===swissToday()?'today':''}"><span class="fixture-date">${i+1}</span>${found.map(g=>{const home=g.home==='FC St.Gallen 1879',other=home?g.away:g.home;return `<a class="calendar-fixture ${home?'fixture-home':'fixture-away'}" href="#match/${g.id}/overview" aria-label="${liveEscape(date(g)+' · '+other+' · '+(g.confirmed?g.time:'Termin noch offen'))}"><span class="calendar-crest">${fcsgBadge(other,home?g.awayLogo:g.homeLogo)}</span><span class="fixture-location" aria-hidden="true"></span></a>`}).join('')}</div>`}).join('')}${'<div class="day empty-day"></div>'.repeat((7-((offset+days)%7))%7)}</div><p class="calendar-legend"><span class="legend-home">Heimspiel</span><span class="legend-away">Auswärtsspiel</span></p></div>`;
}
function fcsgRecord(r){return `<div class="record-bar" role="img" aria-label="${r.w} Siege, ${r.d} Unentschieden, ${r.l} Niederlagen">${[r.w,r.d,r.l].map((n,i)=>`<span class="record-${i}" style="width:${r.played?n/r.played*100:0}%"></span>`).join('')}</div><small class="record-text">${r.w} S · ${r.d} U · ${r.l} N</small>`;}
function fcsgStanding(){return `<p class="muted">Brack Super League · ${fcsgStamp('table')}</p><p class="record-legend"><span>Siege</span><span>Unentschieden</span><span>Niederlagen</span></p><div class="table-wrap"><table class="standings-table"><colgroup><col class="rank-col"><col class="team-col"><col class="games-col"><col class="goals-col"><col class="diff-col"><col class="points-col"></colgroup><thead><tr><th aria-label="Rang">#</th><th>Team</th><th>Sp.</th><th>Tore</th><th>+/−</th><th>Pkt.</th></tr></thead><tbody>${fcsgData.table.map(r=>`<tr class="${r.name==='FC St.Gallen 1879'?'our-team':''}"><td>${r.rank}</td><th scope="row"><div class="table-team">${fcsgBadge(r.name,r.logo)}<div><span class="standing-name">${liveEscape(r.name)}</span>${fcsgRecord(r)}<small class="standing-meta">${r.played} Spiele · ${r.gf-r.ga>0?'+':''}${r.gf-r.ga} Tore</small></div></div></th><td>${r.played}</td><td>${r.gf}:${r.ga}</td><td>${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table></div>${fcsgSeasonNumbers()}`;}
function fcsgSeasonNumbers(){const all=fcsgData.games.filter(g=>g.score&&g.leagueId===24),summary=list=>{const r={played:list.length,w:0,d:0,l:0};for(const g of list)r[fcsgResult(g).state==='win'?'w':fcsgResult(g).state==='draw'?'d':'l']++;return r},r=fcsgData.table.find(r=>r.name==='FC St.Gallen 1879');
 const eventGames=all.filter(g=>g.eventsAvailable),tallies=new Map();for(const g of eventGames)for(const e of g.events){if(e.home!==(g.home==='FC St.Gallen 1879')||!e.player)continue;const p=tallies.get(e.player)||{name:e.player,goals:0,yellow:0,red:0};if(e.type==='Tor'&&!e.ownGoal)p.goals++;if(e.type==='Gelb')p.yellow++;if(['Rot','Gelb-Rot'].includes(e.type))p.red++;tallies.set(e.player,p)}
 const top=[...tallies.values()].filter(p=>p.goals).sort((a,b)=>b.goals-a.goals).slice(0,5),cards=[...tallies.values()].filter(p=>p.yellow||p.red).sort((a,b)=>(b.yellow+b.red)-(a.yellow+a.red)).slice(0,5);
 return `<section class="season-numbers"><h2>FCSG – Saisonbilanz</h2><div class="fcsg-stat-grid"><section class="fcsg-stat-panel"><h3>Saison auf einen Blick</h3>${r?fcsgRecord(r):'<p>Bilanz noch nicht verfügbar.</p>'}${[['Zu Hause',all.filter(g=>g.home==='FC St.Gallen 1879')],['Auswärts',all.filter(g=>g.away==='FC St.Gallen 1879')]].map(([title,list])=>`<h4>${title}</h4><p>${list.length} erfasste Spiele</p>${fcsgRecord(summary(list))}`).join('')}<h4>Letzte 5 Spiele</h4><div class="season-form">${all.slice(-5).map(g=>`<a class="${fcsgResult(g).state}" href="#match/${g.id}/overview" aria-label="${liveEscape(date(g)+' · '+fcsgResult(g).label)}">${{win:'S',draw:'U',loss:'N'}[fcsgResult(g).state]}</a>`).join('')}</div></section><section class="fcsg-stat-panel"><h3>Torstatistiken</h3>${r&&r.played?`<div class="fcsg-number-pair"><p><strong>${(r.gf/r.played).toFixed(2)}</strong>Tore pro Spiel</p><p><strong>${(r.ga/r.played).toFixed(2)}</strong>Gegentore pro Spiel</p></div>`:'<p>Noch nicht verfügbar.</p>'}<h4>Tordifferenz pro Spiel</h4><div class="fcsg-goal-diffs">${all.map(g=>{const h=g.home==='FC St.Gallen 1879',diff=g.score[h?0:1]-g.score[h?1:0];return `<a href="#match/${g.id}/stats"><span>${date(g)} · ${liveEscape(h?g.away:g.home)}</span><strong class="${fcsgResult(g).state}">${diff>0?'+':''}${diff}</strong></a>`}).join('')}</div></section><section class="fcsg-stat-panel"><h3>Spielerstatistiken</h3><h4>Top 5 Torschützen</h4>${top.length?`<ol class="fcsg-ranking">${top.map(p=>`<li><span>${liveEscape(p.name)}</span><strong>${p.goals} Tore</strong></li>`).join('')}</ol>`:'<p>Noch keine bestätigten Einzelwerte verfügbar.</p>'}<h4>Gelbe und rote Karten</h4>${cards.length?`<ol class="fcsg-ranking">${cards.map(p=>`<li><span>${liveEscape(p.name)}</span><strong>${p.yellow} Gelb · ${p.red} Rot</strong></li>`).join('')}</ol>`:'<p>Noch keine bestätigten Einzelwerte verfügbar.</p>'}<p class="muted">Aus ${eventGames.length} Spielen mit vollständig erfasster Torfolge von ${r?.played??all.length} Ligaspielen. Karten gemäss gemeldeten Ereignissen; fehlende Ereignisse werden nicht ergänzt.</p></section></div><p class="muted">Saison 2026/27 · Super League · Heim-/Auswärtswerte und Verlauf aus ${all.length} bestätigten Ligaspielen. ${fcsgStamp('games')}</p></section>`;
}
function fcsgSquad(){return ['Tor','Verteidigung','Mittelfeld','Sturm'].map(group=>`<h2 class="subhead">${group==='Tor'?'Torhüter':group}</h2><div class="players">${fcsgData.players.filter(p=>p.position===group).map(p=>`<a class="player-card" href="#player/${p.id}"><img src="${liveEscape(p.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(p.name)}" width="600" height="400" loading="lazy" decoding="async"><div><span>${liveEscape(p.firstName)}</span><strong>${liveEscape(p.lastName)}</strong><b>${p.number??'–'}</b></div></a>`).join('')}</div>`).join('');}
function fcsgPlayer(id){const p=fcsgData.players.find(p=>p.id===id);if(!p)return notFound();return `<section class="fcsg-player content narrow">${backLink('#season/squad','Zurück zum Kader')}<img class="fcsg-player-photo" src="${liveEscape(p.cover||p.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(p.name)}"><p class="eyebrow">${liveEscape(p.position)} · Nr. ${p.number??'–'}</p><h1>${liveEscape(p.name)}</h1><dl class="facts">${[['Geburtsdatum',p.birthDate],['Beim FCSG seit',p.since],['Vertrag bis',p.contract]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${/^\d{4}-\d\d-\d\d$/.test(v)?new Date(v+'T12:00:00').toLocaleDateString('de-CH'):liveEscape(v)}</dd></div>`).join('')}</dl>${ext(p.url,'Offizielles Spielerprofil','button subtle')}</section>${fcsgFooter('players')}`;}
function fcsgMatch(id,tab){const g=fcsgData.games.find(g=>g.id===id);if(!g)return notFound();const value=v=>v===null||v===undefined?'–':liveEscape(v);
 const events=g.events.length?`<h2>Spielverlauf</h2><ol class="fcsg-events">${g.events.map(e=>`<li><b>${liveEscape(e.minute)}′</b><span>${liveEscape(e.type)} · ${liveEscape(e.player)}<small>${liveEscape(e.home?g.home:g.away)}</small></span>${e.score&&!e.score.includes(null)?`<strong>${e.score.join(' : ')}</strong>`:''}</li>`).join('')}</ol>`:'<p class="notice">Noch kein bestätigter Spielverlauf verfügbar.</p>';
 const stats=[['Ballbesitz (%)','possessionPercentage'],['Abschlüsse','totalScoringAtt'],['Abschlüsse aufs Tor','onTargetScoringAtt'],['Eckbälle','wonCorners'],['Abseits','totalOffside'],['Fouls','fkFoulLost'],['Gelbe Karten','totalYellowCard'],['Rote Karten','totalRedCard'],['Pässe','totalPass']];
 const squad=[['Heim',g.home,g.homeLineup],['Gast',g.away,g.awayLineup]].map(([,name,l])=>`<h2>${liveEscape(name)}</h2>${l?`<p class="muted">Formation: ${liveEscape(l.formation||'–')}</p><ol class="fcsg-lineup">${l.players.map(p=>`<li><b>${p.number??'–'}</b><span>${liveEscape(p.name)}</span>${p.bench?'<small>Bank</small>':''}</li>`).join('')}</ol>`:'<p class="notice">Aufstellung noch nicht veröffentlicht.</p>'}`).join('');
 return `<section class="match"><div class="content narrow">${backLink('#season/games','Zurück zu den Spielen')}${fcsgCard(g)}<nav class="segments match-tabs" aria-label="Spielbereich">${[['overview',g.score?'Rückblick':'Vorschau'],['squad','Aufstellung'],['stats','Statistiken']].map(([key,label])=>`<a class="${tab===key?'selected':''}" href="#match/${g.id}/${key}">${label}</a>`).join('')}</nav>${tab==='squad'?squad:tab==='stats'?`<h2>Teamvergleich</h2><p class="muted">${liveEscape(g.home)} / ${liveEscape(g.away)}</p><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Wert</th><th>Heim</th><th>Gast</th></tr></thead><tbody>${stats.map(([label,key])=>`<tr><th scope="row">${label}</th><td>${value(g.homeStats?.[key])}</td><td>${value(g.awayStats?.[key])}</td></tr>`).join('')}</tbody></table></div><p class="muted">–: Wert nicht verfügbar</p>`:g.score?events:`<h2>Spielvorschau</h2><div class="fcsg-number-pair"><p><strong>${date(g)}</strong>Datum</p><p><strong>${g.confirmed?g.time+' Uhr':'Offen'}</strong>Anspielzeit</p></div><h3>${liveEscape(g.venue)}</h3><p>${g.confirmed?'Termin vom Verein bestätigt.':'Termin noch nicht bestätigt; Änderungen möglich.'}</p>${g.tickets?ext(g.tickets,'Tickets','button'):''}`}<p>${ext(g.url,'Offizielles Matchcenter','news-link')}</p></div></section>${fcsgFooter('games')}`;
}
function fcsgView(page,id,tab='overview'){
 if(page==='home')return fcsgHome();
 if(page==='news')return fcsgArticle(id);
 if(page==='player')return fcsgPlayer(id);
 if(page==='match')return fcsgMatch(id,tab);
 if(page==='club')return `<section class="content narrow"><p class="eyebrow">FC St.Gallen 1879</p><h1>Unser Verein</h1><img class="fcsg-club-logo" src="assets/fcsg-logo.svg" alt="FC St.Gallen 1879"><p>Geschichte, Fakten und Erfolge findest du im offiziellen Vereinsarchiv.</p>${ext('https://www.fcsg.ch/pages/epochen','Vereinsgeschichte öffnen','button subtle')}</section>${fcsgFooter()}`;
 const section=['games','table','squad'].includes(id)?id:'games',calendarView=section==='games'&&mode==='calendar';
 const controls=`<div class="controls"><label>Wettbewerb <select id="competition">${['Alle',...new Set(fcsgData.games.map(g=>g.league))].map(c=>`<option ${c===competition?'selected':''}>${liveEscape(c)}</option>`).join('')}</select></label><div class="toggle"><button data-mode="list" aria-pressed="${mode==='list'}">Liste</button><button data-mode="calendar" aria-pressed="${mode==='calendar'}">Kalender</button></div></div>`;
 return `<section class="content season ${section==='table'?'standings-season':''} ${calendarView?'calendar-season':''}"><div class="season-header"><p class="eyebrow">1. Mannschaft · Saison 2026/27</p><h1>${{games:'Spiele',table:'Tabelle',squad:'Kader'}[section]}</h1>${section==='games'?controls+(calendarView?calendarNavigation():''):''}</div>${section==='table'?fcsgStanding():section==='squad'?fcsgSquad():fcsgGames()}</section>${fcsgFooter(section==='squad'?'players':section)}`;
}
function restoreFcsgData(){try{const d=JSON.parse(localStorage.getItem('fcsg-public-data-v1'));if(validFcsgData(d))fcsgData=d}catch{}}
function validFcsgData(d){return d?.club==='fcsg'&&Array.isArray(d.stories)&&Array.isArray(d.games)&&Array.isArray(d.players)&&Array.isArray(d.table)&&d.table.length===12;}
async function loadFcsgData(){if(fcsgBusy)return;fcsgBusy=true;
 try{const r=await apiFetch('/api/fcsg/data',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error();const d=await r.json();if(!validFcsgData(d))throw Error();const changed=JSON.stringify(fcsgData)!==JSON.stringify(d);for(const story of d.stories)if(story.articleVersion!==fcsgData.stories.find(n=>n.id===story.id)?.articleVersion)fcsgArticles.delete(story.id);fcsgData=d;fcsgOffline=false;try{localStorage.setItem('fcsg-public-data-v1',JSON.stringify(d))}catch{}if(changed&&activeClub==='fcsg')render();}
 catch{fcsgOffline=!navigator.onLine;}
 finally{fcsgBusy=false;}
}
setInterval(()=>{if(activeClub==='fcsg'&&!document.hidden&&navigator.onLine)loadFcsgData()},120000);
