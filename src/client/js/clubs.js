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
    choice = new URL(location.href).searchParams.get('club');
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
    brand.innerHTML = `<img src="${club.logo}" alt="${club.name}" width="38" height="54"><span>${club.title} <small>${club.subtitle}</small></span>`;
    brand.setAttribute('aria-label', club.name + ' ' + club.subtitle + ' · Startseite');
  }
  const button = document.getElementById('club-switch');
  if (button) {
    button.querySelector('span').textContent = other === 'fcsg' ? 'FCSG' : 'Kadetten';
    button.dataset.base = fanClubs[other].name;
    button.setAttribute('aria-label', 'Aktueller Verein: ' + club.name + '. Zu ' + fanClubs[other].name + ' wechseln');
    button.title = 'Zu ' + fanClubs[other].name + ' wechseln';
  }
  updateClubDot();
}
/* Punkt am Vereinsknopf: der andere Verein hat heute ein Spiel.
   Vor der Anspielzeit ruhig, ab Anspielzeit 2 Stunden pulsierend, danach in der Farbe des Resultats (Sieg grün, Unentschieden blau,
   Niederlage rot) bis Mitternacht. Ohne Resultat bleibt der Punkt grau; der andere Verein wird dann höchstens alle 10 Minuten neu geladen. */
const CLUB_DOT_MINUTES = 120, CLUB_DOT_RETRY_MS = 600000;
let clubDotRefreshedAt = 0;
function clubMatchDot(game, nowMinutes, resultState) {
  const m = /^(\d{2}):(\d{2})$/.exec(game?.time || '');
  if (!m) return {state: 'soon'};
  const elapsed = nowMinutes - (Number(m[1]) * 60 + Number(m[2]));
  if (elapsed < 0) return {state: 'soon'};
  if (elapsed < CLUB_DOT_MINUTES) return {state: 'live'};
  return resultState ? {state: resultState} : {state: 'pending'};
}
function otherClubTodayGame(today) {
  const list = (activeClub === 'kadetten' ? (typeof fcsgData !== 'undefined' && fcsgData.games) : (typeof games !== 'undefined' && games)) || [];
  return list.filter(g => g.date === today).sort((a, b) => String(a.time).localeCompare(String(b.time)))[0] || null;
}
function otherClubResultState(game) {
  if (activeClub === 'kadetten') return fcsgResult(game)?.state || null;
  if (!Array.isArray(game.score)) return null;
  const home = game.home === 'Kadetten Schaffhausen', diff = game.score[home ? 0 : 1] - game.score[home ? 1 : 0];
  return diff > 0 ? 'win' : diff < 0 ? 'loss' : 'draw';
}
function updateClubDot() {
  const button = document.getElementById('club-switch');
  if (!button) return;
  let dot = button.querySelector('.club-dot');
  const today = swissToday(), game = otherClubTodayGame(today);
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date());
  const nowMinutes = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
  const info = game ? clubMatchDot(game, nowMinutes, otherClubResultState(game)) : null;
  if (!info) { dot?.remove(); delete button.dataset.dot; return; }
  if (!dot) { dot = document.createElement('i'); dot.className = 'club-dot'; dot.setAttribute('aria-hidden', 'true'); button.append(dot); }
  button.dataset.dot = info.state;
  const other = button.dataset.base || '';
  const note = {soon: 'spielt heute', live: 'spielt gerade', pending: 'hat heute gespielt', win: 'hat heute gewonnen', draw: 'hat heute unentschieden gespielt', loss: 'hat heute verloren'}[info.state];
  button.setAttribute('aria-label', button.getAttribute('aria-label').replace(/ · .*$/, '') + ' · ' + other + ' ' + note);
  button.title = 'Zu ' + other + ' wechseln · ' + note;
  if (info.state === 'pending' && navigator.onLine && !document.hidden && Date.now() - clubDotRefreshedAt > CLUB_DOT_RETRY_MS) {
    clubDotRefreshedAt = Date.now();
    (activeClub === 'kadetten' ? loadFcsgData() : loadCurrentData())?.finally?.(updateClubDot);
  }
}
setInterval(updateClubDot, 30000);
let clubTransitionBusy = false;
function switchClub(id) {
  if (clubTransitionBusy || !Object.hasOwn(fanClubs, id) || id === activeClub) return;
  const root = document.documentElement, button = document.getElementById('club-switch');
  const bounds = button?.getBoundingClientRect?.();
  const x = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
  const y = bounds ? bounds.top + bounds.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (root.classList.contains('keyboard-input')) { applyClubChange(id); return; }
  let changed = false;
  const change = () => { if (!changed) { changed = true; applyClubChange(id); } };
  const finish = () => {
    clubTransitionBusy = false;
    if (button) button.disabled = false;
    root.classList.remove('club-transition', 'club-transition-reduced');
    for (const key of ['--club-wave-x', '--club-wave-y', '--club-wave-radius']) root.style.removeProperty(key);
  };
  const fallback = () => {
    change();
    if (typeof document.getElementById('app')?.animate !== 'function') { finish(); return; }
    const target = reduced ? document.getElementById('app') : document.createElement('div');
    if (!reduced) {
      target.className = 'club-color-wave';
      target.setAttribute('aria-hidden', 'true');
      target.style.setProperty('--club-wave-x', x + 'px');
      target.style.setProperty('--club-wave-y', y + 'px');
      target.style.setProperty('--club-wave-radius', radius + 'px');
      document.body.append(target);
    }
    try {
      const frames = reduced ? [{opacity: 0.7}, {opacity: 1}] : [
        {clipPath: `circle(0px at ${x}px ${y}px)`, opacity: 0.65},
        {clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: 0.3, offset: 0.7},
        {clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: 0}
      ];
      target.animate(frames, {duration: reduced ? 120 : 280, easing: 'cubic-bezier(.22,1,.36,1)'})
        .finished.catch(() => {}).finally(() => { if (!reduced) target.remove(); finish(); });
    } catch { if (!reduced) target.remove(); finish(); }
  };
  clubTransitionBusy = true;
  if (button) button.disabled = true;
  if (typeof document.startViewTransition !== 'function') { fallback(); return; }
  root.style.setProperty('--club-wave-x', x + 'px');
  root.style.setProperty('--club-wave-y', y + 'px');
  root.style.setProperty('--club-wave-radius', radius + 'px');
  root.classList.add('club-transition');
  if (reduced) root.classList.add('club-transition-reduced');
  try {
    const transition = document.startViewTransition(change);
    transition.ready.catch(() => {});
    transition.finished.catch(() => {}).finally(() => { change(); finish(); });
  } catch { fallback(); }
}
function applyClubChange(id) {
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
  if (id === 'kadetten') checkLiveMatch();
  else {loadFcsgData();loadFcsgLive(true);}
}
const fcsgArticles = new Map();
let fcsgOffline = false, fcsgBusy = false, fcsgDataLoadFailed = false;
function fcsgStamp(key) {
 const state=fcsgData.status?.[key],stamp=state?.updatedAt||fcsgData.checkedAt;
 if(!stamp)return 'Stand nicht verfügbar';
 const stale=snapshotDelayed(stamp);
 return `${state?.ok===false||stale?'Letzter gültiger Stand':'Aktualisiert'}: ${new Date(stamp).toLocaleString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})} Uhr${stale?' · Aktualisierung verzögert':''}`;
}
function fcsgFooter(key='news') {
 return `<footer><span class="footer-updated" data-fcsg-update-key="${key}">${fcsgStamp(key)}</span><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Inoffizielles, nicht-kommerzielles Fan-Projekt und privater Designentwurf · kein offizieller Vereinsauftritt · keine Verbindung zu den Vereinen.</p><p>Alle Marken- und Bildrechte liegen bei den Kadetten Schaffhausen, dem FC St.Gallen 1879 bzw. den jeweiligen Vereinen und Urhebern.</p><p>${ext('https://www.fcsg.ch/','FC St.Gallen 1879','')} · Vereinsdaten, Artikel, Fotos und Wappen: FC St.Gallen 1879 und jeweilige Urheber.</p></details></footer>`;
}
function fcsgBadge(name, logo) {return logo?`<img class="crest" src="${liveEscape(safeUrl(logo))}" alt="${liveEscape(name)}" width="48" height="60" loading="lazy" decoding="async">`:`<span class="clubmark" aria-hidden="true">${liveEscape(name.split(' ').map(w=>w[0]).slice(0,3).join(''))}</span>`;}
function fcsgResult(g){const home=g.home==='FC St.Gallen 1879';const diff=g.score?g.score[home?0:1]-g.score[home?1:0]:null;return diff===null?null:{state:diff>0?'win':diff<0?'loss':'draw',label:diff>0?'Sieg':diff<0?'Niederlage':'Unentschieden'};}
function fcsgFixture(){const today=swissToday(),current=[...fcsgLiveGames.values()].find(g=>g.date===today&&(g.live||g.score));return current||fcsgData.games.find(g=>g.date===today&&g.score)||fcsgData.games.find(g=>!g.score&&g.date>=today);}
function fcsgMatchday(){const g=fcsgFixture();if(!g)return '';
 return `<section class="home-matchday" aria-label="Aktuelles FCSG-Spiel"><a class="live-match fcsg-matchday ${g.live?'is-live is-matchday':'match-preview'}" href="#match/${g.id}/${g.live?'ticker':'overview'}"><div class="live-heading"><span>${g.live?'<i aria-hidden="true"></i>JETZT LIVE':g.score?'HEUTE GESPIELT':'NÄCHSTES SPIEL'}</span><small>${liveEscape(g.league)}${g.live?' · '+liveEscape(g.phase)+(g.clock?' · '+g.clock:''):''}</small></div><div class="live-score"><span>${fcsgBadge(g.home,g.homeLogo)}<b>${liveEscape(g.home)}</b></span><strong>${fcsgDisplayScore(g)}</strong><span>${fcsgBadge(g.away,g.awayLogo)}<b>${liveEscape(g.away)}</b></span></div><p class="match-preview-time">${g.live?'Spiel live verfolgen':date(g)+' · '+(g.confirmed?g.time+' Uhr':'Anspielzeit noch offen')+(g.score?' · Rückblick':'')}${fcsgLiveErrors.has(g.id)?' · Letzter verfügbarer Stand':''}</p></a></section>`;
}
function fcsgHome(){const story=(n,i)=>`<section class="story-screen" id="story-${i}"><img src="${liveEscape(n.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(n.title)}" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}><div class="story-copy"><p>${liveEscape(n.date)} · News</p><h2>${liveEscape(n.title)}</h2><a class="button subtle" href="#news/${n.id}">Zum Artikel</a></div></section>`;
 return `<section class="home-news" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone">${fcsgMatchday()}<header class="home-news-heading"><span aria-hidden="true"></span><h1 id="home-news-title">Neues aus dem Verein</h1></header></div>${fcsgData.stories[0]?story(fcsgData.stories[0],0):'<p class="notice">Noch keine News verfügbar.</p>'}</div>${fcsgData.stories.slice(1).map((n,i)=>story(n,i+1)).join('')}</div><nav class="story-dots" aria-label="News auswählen" hidden>${fcsgData.stories.map((n,i)=>`<button data-story="${i}" ${i>4?'hidden':''} aria-label="${liveEscape(n.title)}" aria-pressed="${i===0}"><span></span></button>`).join('')}</nav></section>${fcsgFooter()}`;
}
function fcsgArticle(id){const n=fcsgData.stories.find(n=>n.id===id);if(!n)return notFound();
 return `<article class="news-article"><div class="article-bar">${backLink('#home','Zurück zu den News','back')}<button class="share button subtle">Teilen</button></div><img class="article-photo" src="${liveEscape(n.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(n.title)}" fetchpriority="high" decoding="async"><div class="content narrow"><p class="muted">${n.date} · Vereinsnews</p><h1>${liveEscape(n.title)}</h1><div id="fcsg-article-body" class="article-fulltext">${fcsgArticles.has(id)?sanitiseArticle(fcsgArticles.get(id),n.url):'<p role="status">Vollständiger Artikel wird geladen …</p>'}</div><p>${ext(n.url,'Originalartikel beim FCSG','news-link')}</p><h2>Mehr News</h2>${fcsgData.stories.filter(x=>x.id!==id).slice(0,4).map(x=>`<a class="related-story" href="#news/${x.id}"><img src="${liveEscape(x.image||'assets/fcsg-logo.svg')}" alt="" loading="lazy"><span>${liveEscape(x.title)}<small>${x.date}</small></span></a>`).join('')}</div></article>${fcsgFooter()}`;
}
async function loadFcsgArticle(){const [page,id]=location.hash.slice(1).split('/');const target=document.getElementById('fcsg-article-body');if(page!=='news'||!target||fcsgArticles.has(id))return;
 try{const r=await apiFetch('/api/fcsg/articles/'+encodeURIComponent(id),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const d=await r.json();if(d.id!==id||typeof d.html!=='string')throw Error();fcsgArticles.set(id,d.html);if(fcsgArticles.size>30)fcsgArticles.delete(fcsgArticles.keys().next().value);if(target===document.getElementById('fcsg-article-body'))target.innerHTML=sanitiseArticle(d.html,d.url);
 }catch{if(target===document.getElementById('fcsg-article-body')){const n=fcsgData.stories.find(n=>n.id===id);target.innerHTML=`<p class="notice">Der vollständige Artikel ist gerade nicht verfügbar.</p><button id="fcsg-retry-article" class="button subtle">Erneut laden</button>${n?ext(n.url,'Originalartikel öffnen','text-link'):''}`;document.getElementById('fcsg-retry-article').onclick=loadFcsgArticle;}}
}
function fcsgCard(g,current=false){g=fcsgGame(g.id)||g;const r=fcsgResult(g);
 return `<article class="game-card ${r?'finished result-'+r.state:''} ${current?'current-game':''}" data-fcsg-game="${g.id}">${current?'<p class="current-label">'+(g.live?'Jetzt live':'Nächstes Spiel')+'</p>':''}<p class="meta">${r?`<span class="game-result-label">${r.label}</span> · `:''}${liveEscape(g.league)} · ${date(g)} · ${g.confirmed?g.time+' Uhr':'Termin noch nicht bestätigt'}</p><div class="scoreline"><div>${fcsgBadge(g.home,g.homeLogo)}<span>${liveEscape(g.home)}</span></div><strong><span data-fcsg-score="${g.id}">${fcsgDisplayScore(g)}</span><small data-fcsg-phase="${g.id}">${fcsgLiveState(g)}</small></strong><div>${fcsgBadge(g.away,g.awayLogo)}<span>${liveEscape(g.away)}</span></div></div>${g.penalties&&!g.penalties.includes(null)?`<p class="muted">Elfmeterschiessen: ${g.penalties.join(' : ')}</p>`:''}<p class="venue">${liveEscape(g.venue)}</p><div class="actions"><a class="button ${g.score?'subtle':''}" href="#match/${g.id}/overview">${g.live?'Live verfolgen':g.score?'Rückblick':'Vorschau'}</a></div></article>`;
}
function fcsgGames(){const next=fcsgData.games.find(g=>!g.score&&g.date>=swissToday()),filtered=fcsgData.games.filter(g=>competition==='Alle'||g.league===competition);
 if(mode==='calendar')return fcsgCalendar(filtered);
 return `<p class="muted">${fcsgData.games.length} veröffentlichte Partien · <span data-fcsg-update-key="games">${fcsgStamp('games')}</span></p><div class="games game-timeline">${filtered.map(g=>fcsgCard(g,g===next)).join('')}</div>`;
}
function fcsgCalendar(list){const days=new Date(calendarYear,month+1,0).getDate(),offset=(new Date(calendarYear,month,1).getDay()+6)%7;
 return `<div class="calendar-panel"><div class="calendar match-calendar" style="--calendar-weeks:${Math.ceil((offset+days)/7)}">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d=>`<b>${d}</b>`).join('')}${'<div class="day empty-day"></div>'.repeat(offset)}${Array.from({length:days},(_,i)=>{const key=`${calendarYear}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,found=list.filter(g=>g.date===key);return `<div class="day ${found.length?'has-game':''} ${key===swissToday()?'today':''}"><span class="fixture-date">${i+1}</span>${found.map(g=>{const home=g.home==='FC St.Gallen 1879',other=home?g.away:g.home;return `<a class="calendar-fixture ${home?'fixture-home':'fixture-away'}" href="#match/${g.id}/overview" aria-label="${liveEscape(date(g)+' · '+other+' · '+(g.confirmed?g.time:'Termin noch offen'))}"><span class="calendar-crest">${fcsgBadge(other,home?g.awayLogo:g.homeLogo)}</span><span class="fixture-location" aria-hidden="true"></span></a>`}).join('')}</div>`}).join('')}${'<div class="day empty-day"></div>'.repeat((7-((offset+days)%7))%7)}</div><p class="calendar-legend"><span class="legend-home">Heimspiel</span><span class="legend-away">Auswärtsspiel</span></p></div>`;
}
function fcsgRecord(r){return `<div class="record-bar" role="img" aria-label="${r.w} Siege, ${r.d} Unentschieden, ${r.l} Niederlagen">${[r.w,r.d,r.l].map((n,i)=>`<span class="record-${i}" style="width:${r.played?n/r.played*100:0}%"></span>`).join('')}</div><small class="record-text">${r.w} S · ${r.d} U · ${r.l} N</small>`;}
function fcsgStanding(){return `<p class="muted">Brack Super League · <span data-fcsg-update-key="table">${fcsgStamp('table')}</span></p><p class="record-legend"><span>Siege</span><span>Unentschieden</span><span>Niederlagen</span></p><div class="table-wrap"><table class="standings-table"><colgroup><col class="rank-col"><col class="team-col"><col class="games-col"><col class="goals-col"><col class="diff-col"><col class="points-col"></colgroup><thead><tr><th aria-label="Rang">#</th><th>Team</th><th>Sp.</th><th>Tore</th><th>+/−</th><th>Pkt.</th></tr></thead><tbody>${fcsgData.table.map(r=>`<tr class="${r.name==='FC St.Gallen 1879'?'our-team':''}"><td>${r.rank}</td><th scope="row"><div class="table-team">${fcsgBadge(r.name,r.logo)}<div><span class="standing-name">${liveEscape(r.name)}</span>${fcsgRecord(r)}<small class="standing-meta">${r.played} Spiele · ${r.gf-r.ga>0?'+':''}${r.gf-r.ga} Tore</small></div></div></th><td>${r.played}</td><td>${r.gf}:${r.ga}</td><td>${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table></div>${fcsgSeasonNumbers()}`;}
function fcsgGoalDifferenceChart(list) {
 const rows=list.map(g=>{const home=g.home==='FC St.Gallen 1879';return {g,home,result:fcsgResult(g),diff:g.score[home?0:1]-g.score[home?1:0]};});
 const limit=Math.max(1,...rows.map(r=>Math.abs(r.diff))),signed=v=>v>0?'+'+v:v<0?'−'+Math.abs(v):'0';
 return `<section class="goal-difference-chart football-differences" aria-labelledby="fcsg-difference-title"><h4 id="fcsg-difference-title">Tordifferenz pro Spiel</h4><div class="difference-heading" aria-hidden="true"><span>Spiel</span><span class="difference-axis"><span>−${limit}</span><span>0</span><span>+${limit}</span></span><span>Tore</span></div><ol class="difference-games">${rows.map(({g,home,result,diff})=>`<li><a class="difference-game ${result.state}" href="#match/${liveEscape(g.id)}/stats" aria-label="${liveEscape((home?g.away:g.home)+', '+date(g)+' · '+(home?'Heim':'Auswärts')+' '+signed(diff)+'. Resultat '+g.score.join(':')+', Tordifferenz')}"><span class="difference-fixture"><strong>${liveEscape(home?g.away:g.home)}</strong> <small>${liveEscape(date(g))} · ${home?'Heim':'Auswärts'}</small></span> <span class="difference-track" aria-hidden="true"><span class="difference-bar" style="--difference-width:${Math.abs(diff)/limit*50}%"></span></span> <strong class="difference-value">${signed(diff)}</strong></a></li>`).join('')}</ol><p class="muted">Eigene Tore minus Gegentore · Skala von −${limit} bis +${limit}, angepasst an die bisherigen Ligaspiele. Grün: Sieg · Rot: Niederlage · Gelb: Unentschieden.</p></section>`;
}
function fcsgSeasonNumbers(){const all=fcsgData.games.filter(g=>g.score&&g.leagueId===24).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),summary=list=>{const r={played:list.length,w:0,d:0,l:0};for(const g of list)r[fcsgResult(g).state==='win'?'w':fcsgResult(g).state==='draw'?'d':'l']++;return r},r=fcsgData.table.find(r=>r.name==='FC St.Gallen 1879');
 const eventGames=all.filter(g=>g.eventsAvailable),tallies=new Map();for(const g of eventGames)for(const e of g.events){if(e.home!==(g.home==='FC St.Gallen 1879')||!e.player)continue;const p=tallies.get(e.player)||{name:e.player,goals:0,yellow:0,red:0};if(e.type==='Tor'&&!e.ownGoal)p.goals++;if(e.type==='Gelb')p.yellow++;if(['Rot','Gelb-Rot'].includes(e.type))p.red++;tallies.set(e.player,p)}
 const top=[...tallies.values()].filter(p=>p.goals).sort((a,b)=>b.goals-a.goals).slice(0,5),cards=[...tallies.values()].filter(p=>p.yellow||p.red).sort((a,b)=>(b.yellow+b.red)-(a.yellow+a.red)).slice(0,5);
 return `<section class="season-numbers"><h2>FCSG – Saisonbilanz</h2><div class="fcsg-stat-grid"><section class="season-overview stats-block"><h3>Saison auf einen Blick</h3>${r?seasonBalance(r.w,r.d,r.l):'<p>Bilanz noch nicht verfügbar.</p>'}<div class="season-splits">${[['Zu Hause',all.filter(g=>g.home==='FC St.Gallen 1879')],['Auswärts',all.filter(g=>g.away==='FC St.Gallen 1879')]].map(([title,list])=>{const r=summary(list);return seasonSplit(title,r.played,r.w,r.d,r.l)}).join('')}</div><h4>Letzte 5 Spiele</h4><p class="muted">Ältestes Spiel links · neuestes rechts</p><div class="season-form">${all.slice(-5).map(g=>`<a class="${fcsgResult(g).state}" href="#match/${g.id}/overview" aria-label="${liveEscape(date(g)+' · '+fcsgResult(g).label)}">${{win:'S',draw:'U',loss:'N'}[fcsgResult(g).state]}</a>`).join('')}</div></section><section class="season-goal-stats stats-block"><h3>Torstatistiken</h3>${r&&r.played?`<div class="season-number-grid"><div><strong>${goalAverage(r.gf,r.played)}</strong><span>Tore pro Spiel im Schnitt</span></div><div><strong>${goalAverage(r.ga,r.played)}</strong><span>Gegentore pro Spiel im Schnitt</span></div></div>`:'<p>Noch nicht verfügbar.</p>'}${fcsgGoalDifferenceChart(all)}</section><section class="stats-block"><h3>Spielerstatistiken</h3><h4>Top 5 Torschützen</h4>${top.length?`<ol class="fcsg-ranking">${top.map(p=>`<li><span>${liveEscape(p.name)}</span><strong>${p.goals} Tore</strong></li>`).join('')}</ol>`:'<p>Noch keine bestätigten Einzelwerte verfügbar.</p>'}<h4>Gelbe und rote Karten</h4>${cards.length?`<ol class="fcsg-ranking">${cards.map(p=>`<li><span>${liveEscape(p.name)}</span><strong>${p.yellow} Gelb · ${p.red} Rot</strong></li>`).join('')}</ol>`:'<p>Noch keine bestätigten Einzelwerte verfügbar.</p>'}<p class="muted">Aus ${eventGames.length} Spielen mit vollständig erfasster Torfolge von ${r?.played??all.length} Ligaspielen. Karten gemäss gemeldeten Ereignissen; fehlende Ereignisse werden nicht ergänzt.</p></section></div><p class="muted">Saison 2026/27 · Super League · Heim-/Auswärtswerte und Verlauf aus ${all.length} bestätigten Ligaspielen. <span data-fcsg-update-key="games">${fcsgStamp('games')}</span></p></section>`;
}
function fcsgSquad(){return ['Tor','Verteidigung','Mittelfeld','Sturm'].map(group=>`<h2 class="subhead">${group==='Tor'?'Torhüter':group}</h2><div class="players">${fcsgData.players.filter(p=>p.position===group).map(p=>`<a class="player-card" href="#player/${p.id}"><img src="${liveEscape(p.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(p.name)}" width="600" height="400" loading="lazy" decoding="async"><div><span>${liveEscape(p.firstName)}</span><strong>${liveEscape(p.lastName)}</strong><b>${p.number??'–'}</b></div></a>`).join('')}</div>`).join('');}
let fcsgPlayerDetails = new Map(), fcsgPlayerDetailsAt = 0, fcsgPlayerDetailsBusy = false, fcsgPlayerDetailsError = false;
function fcsgPlayerFacts(p){
 const dateFact=v=>/^\d{4}-\d\d-\d\d$/.test(String(v))?new Date(v+'T12:00:00').toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}):liveEscape(v);
 const facts=[['Geburtsdatum',p.birthDate],['Körpergrösse',p.height?`${p.height} cm`:null],['Nationalität',p.nationality],['Beim FCSG seit',p.since],['Vertrag bis',p.contract],['FCSG-Debüt',p.debutDate],['Debüt gegen',p.debutOpponent]];
 return `<h2>Steckbrief</h2><dl class="facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${dateFact(v)}</dd></div>`).join('')}</dl>`;
}
function fcsgPlayerStats(p){
 const rows=p.seasons||[],value=v=>v===null||v===undefined?'–':liveEscape(v),metrics=[['Einsätze','appearances'],['Tore','goals'],['Vorlagen','assists'],['Spielminuten','minutes'],['Gelbe Karten','yellow'],['Rote Karten','red'],['Gelb-Rot','secondYellow']];
 if(p.seasons===undefined&&!fcsgPlayerDetailsError)return '<h2>Daten & Fakten</h2><p class="muted" role="status">Weitere Spielerfakten werden geladen.</p>';
 if(!rows.length)return `<h2>Daten & Fakten</h2><p class="notice">${fcsgPlayerDetailsError?'Weitere Spielerfakten sind gerade nicht verfügbar.':'Für diesen Spieler sind noch keine Saisonstatistiken verfügbar.'}</p>`;
 const seasons=[...new Set(rows.map(r=>r.season))];
 return `<h2>Daten & Fakten beim FCSG</h2><p class="muted">Offizielle Vereinsstatistik nach Saison und Wettbewerb. –: Wert nicht verfügbar.</p>${seasons.map(season=>`<h3>Saison ${liveEscape(season)}</h3><div class="fcsg-player-stat-grid">${rows.filter(r=>r.season===season).map(r=>`<section class="fcsg-stat-panel"><h4>${liveEscape(r.competition==='Schweizer Pokal'?'Schweizer Cup':r.competition)}</h4><dl class="fcsg-player-stat-list">${metrics.map(([label,key])=>`<div><dt>${label}</dt><dd>${value(r[key])}</dd></div>`).join('')}</dl></section>`).join('')}</div>`).join('')}`;
}
function fcsgPlayer(id){const base=fcsgData.players.find(p=>p.id===id);if(!base)return notFound();const p={...base,...fcsgPlayerDetails.get(id)};return `<section class="fcsg-player content narrow">${backLink('#season/squad','Zurück zum Kader')}<img class="fcsg-player-photo" src="${liveEscape(p.cover||p.image||'assets/fcsg-logo.svg')}" alt="${liveEscape(p.name)}"><p class="eyebrow">${liveEscape(p.position)} · Nr. ${p.number??'–'}</p><h1>${liveEscape(p.name)}</h1><div id="fcsg-player-facts" data-player-id="${liveEscape(id)}">${fcsgPlayerFacts(p)}${fcsgPlayerStats(p)}</div>${ext(p.url,'Offizielles Spielerprofil','button subtle')}</section>${fcsgFooter('players')}`;}
async function loadFcsgPlayerDetails(){
 if(activeClub!=='fcsg'||!location.hash.startsWith('#player/')||document.hidden||fcsgPlayerDetailsBusy||Date.now()-fcsgPlayerDetailsAt<1800000)return;
 const id=location.hash.split('/')[1];if(!fcsgData.players.some(p=>p.id===id))return;
 fcsgPlayerDetailsBusy=true;fcsgPlayerDetailsAt=Date.now();
 try{const r=await apiFetch('/api/fcsg/players',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error();const d=await r.json();if(!d.ok||!Array.isArray(d.players)||d.players.length<20||d.players.some(p=>!p.id||!p.name||!Array.isArray(p.seasons)))throw Error();fcsgPlayerDetails=new Map(d.players.map(p=>[p.id,p]));fcsgPlayerDetailsError=false;}
 catch{fcsgPlayerDetailsError=true;fcsgPlayerDetailsAt=Date.now()-1770000;}
 finally{fcsgPlayerDetailsBusy=false;const target=document.getElementById('fcsg-player-facts');if(activeClub==='fcsg'&&target?.dataset.playerId===id){const p={...fcsgData.players.find(p=>p.id===id),...fcsgPlayerDetails.get(id)};target.innerHTML=fcsgPlayerFacts(p)+fcsgPlayerStats(p);}}
}

function fcsgTeamStats(g){const value=v=>v===null||v===undefined?'–':liveEscape(v),stats=[['Ballbesitz (%)','possessionPercentage'],['Abschlüsse','totalScoringAtt'],['Abschlüsse aufs Tor','onTargetScoringAtt'],['Eckbälle','wonCorners'],['Abseits','totalOffside'],['Fouls','fkFoulLost'],['Gelbe Karten','totalYellowCard'],['Rote Karten','totalRedCard'],['Pässe','totalPass']];return `<h2>Teamvergleich</h2><p class="muted">${liveEscape(g.home)} / ${liveEscape(g.away)}</p><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Wert</th><th>Heim</th><th>Gast</th></tr></thead><tbody>${stats.map(([label,key])=>`<tr><th scope="row">${label}</th><td>${value(g.homeStats?.[key])}</td><td>${value(g.awayStats?.[key])}</td></tr>`).join('')}</tbody></table></div><p class="muted">–: Wert nicht verfügbar</p>`;}
function fcsgLineups(g){return [[g.home,g.homeLineup],[g.away,g.awayLineup]].map(([name,l])=>`<h2>${liveEscape(name)}</h2>${l?`<p class="muted">Formation: ${liveEscape(l.formation||'–')}</p><ol class="fcsg-lineup">${l.players.map(p=>`<li><b>${p.number??'–'}</b><span>${liveEscape(p.name)}</span>${p.bench?'<small>Bank</small>':''}</li>`).join('')}</ol>`:'<p class="notice">Aufstellung noch nicht veröffentlicht.</p>'}`).join('');}
function fcsgOverview(g){
 const events=g.events.length?`<h2>Spielverlauf</h2><ol class="fcsg-events">${g.events.map(e=>`<li><b>${liveEscape(e.minute)}′</b><span>${liveEscape(e.type)} · ${liveEscape(e.player)}<small>${liveEscape(e.home?g.home:g.away)}</small></span>${e.score&&!e.score.includes(null)?`<strong>${e.score.join(' : ')}</strong>`:''}</li>`).join('')}</ol>`:'<p class="notice">Noch kein bestätigter Spielverlauf verfügbar.</p>';
 return g.score||g.live?events:`<h2>Spielvorschau</h2>${matchPreviewSlot(g,'fcsg')}<div class="fcsg-number-pair"><p><strong>${date(g)}</strong>Datum</p><p><strong>${g.confirmed?g.time+' Uhr':'Offen'}</strong>Anspielzeit</p></div><h3>${liveEscape(g.venue)}</h3><p>${g.confirmed?'Termin vom Verein bestätigt.':'Termin noch nicht bestätigt; Änderungen möglich.'}</p>${g.tickets?ext(g.tickets,'Tickets','button'):''}`;
}
function fcsgMatch(id,tab){const g=fcsgGame(id);if(!g)return notFound();

 return `<section class="match"><div class="content narrow">${backLink('#season/games','Zurück zu den Spielen')}${fcsgCard(g)}<p class="fcsg-live-summary" role="status" aria-atomic="true"><span data-fcsg-phase="${g.id}">${fcsgLiveState(g)}</span></p><nav class="segments match-tabs" aria-label="Spielbereich">${[['overview',g.live?'Spielverlauf':g.score?'Rückblick':'Vorschau'],['ticker','Liveticker'],['squad','Aufstellung'],['stats','Statistiken']].map(([key,label])=>`<a class="${tab===key?'selected':''}" href="#match/${g.id}/${key}">${label}</a>`).join('')}</nav>${tab==='ticker'?`<section id="fcsg-live-panel">${fcsgTicker(g)}</section>`:tab==='squad'?`<section id="fcsg-lineups">${fcsgLineups(g)}</section>`:tab==='stats'?`<section id="fcsg-team-stats">${fcsgTeamStats(g)}</section>`:`<section id="fcsg-overview" data-signature="${liveEscape(JSON.stringify(g.score||g.live?['events',g.events]:['preview',g.home,g.away,g.date,g.time,g.confirmed,g.venue,g.tickets]))}">${fcsgOverview(g)}</section>`}<p>${ext(g.url,'Offizielles Matchcenter','news-link')}</p></div></section>${fcsgFooter('games')}`;
}
function fcsgView(page,id,tab='overview'){
 if(page==='home')return fcsgHome();
 if(page==='news')return fcsgArticle(id);
 if(page==='player')return fcsgPlayer(id);
 if(page==='match')return fcsgMatch(id,tab);
 if(page==='club')return fcsgClubPage();
 const section=['games','table','squad'].includes(id)?id:'games',calendarView=section==='games'&&mode==='calendar';
 const controls=`<div class="controls"><label>Wettbewerb <select id="competition">${['Alle',...new Set(fcsgData.games.map(g=>g.league))].map(c=>`<option ${c===competition?'selected':''}>${liveEscape(c)}</option>`).join('')}</select></label><div class="toggle"><button data-mode="list" aria-pressed="${mode==='list'}">Liste</button><button data-mode="calendar" aria-pressed="${mode==='calendar'}">Kalender</button></div></div>`;
 return `<section class="content season ${section==='table'?'standings-season':''} ${calendarView?'calendar-season':''}"><div class="season-header"><p class="eyebrow">1. Mannschaft · Saison 2026/27</p><h1>${{games:'Spiele',table:'Tabelle',squad:'Kader'}[section]}</h1>${section==='games'?controls+(calendarView?calendarNavigation():''):''}</div>${section==='table'?fcsgStanding():section==='squad'?fcsgSquad():fcsgGames()}</section>${fcsgFooter(section==='squad'?'players':section)}`;
}
function restoreFcsgData(){try{const d=JSON.parse(localStorage.getItem('fcsg-public-data-v1'));if(validFcsgData(d))fcsgData=d}catch{}}
function validFcsgData(d){return d?.club==='fcsg'&&Array.isArray(d.stories)&&Array.isArray(d.games)&&Array.isArray(d.players)&&Array.isArray(d.table)&&d.table.length===12;}
function fcsgViewSignature(d) {
 const [page='home',id]=location.hash.slice(1).split('/');
 return JSON.stringify(page==='home'||!page?d.stories:page==='news'?d.stories.find(n=>n.id===id):page==='match'?d.games.find(g=>g.id===id):page==='player'?d.players.find(p=>p.id===id):page==='club'?null:id==='squad'?d.players:id==='table'?{table:d.table,games:d.games}:d.games);
}
function syncFcsgLabels(){document.querySelectorAll('[data-fcsg-update-key]').forEach(el=>el.textContent=fcsgStamp(el.dataset.fcsgUpdateKey));}
async function loadFcsgData(){if(fcsgBusy)return;fcsgBusy=true;
 try{const r=await apiFetch('/api/fcsg/data',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error();const d=await r.json();if(!validFcsgData(d))throw Error();const changed=fcsgViewSignature(fcsgData)!==fcsgViewSignature(d);for(const story of d.stories)if(story.articleVersion!==fcsgData.stories.find(n=>n.id===story.id)?.articleVersion)fcsgArticles.delete(story.id);for(const g of d.games){const old=fcsgData.games.find(x=>x.id===g.id);if(JSON.stringify(old)!==JSON.stringify(g)&&!fcsgLiveGames.get(g.id)?.live)fcsgLiveGames.delete(g.id);}fcsgData=d;fcsgOffline=false;fcsgDataLoadFailed=false;try{localStorage.setItem('fcsg-public-data-v1',JSON.stringify(d))}catch{}if(activeClub==='fcsg'){if(changed){if(location.hash.startsWith('#match/'))updateFcsgLiveView();else render();}syncFcsgLabels();}}
 catch{fcsgOffline=!navigator.onLine;fcsgDataLoadFailed=true;}
 finally{fcsgBusy=false;syncOfflineNotice();}
}
setInterval(()=>{if(activeClub==='fcsg'&&!document.hidden&&navigator.onLine)loadFcsgData()},120000);
