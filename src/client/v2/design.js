/* Loaded only by the independent /v2/ build. Original views remain available. */
document.documentElement.dataset.design = 'v2';
const v2ClubImages = {kadetten:'assets/bbc-arena-hall.webp',fcsg:'assets/fcsg-stadium.jpg',otmar:'assets/otmar-kreuzbleiche.webp'};
const v2ThemeKey = 'fan-v2-theme';
function v2SetTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(v2ThemeKey, theme); } catch {}
  document.querySelector('[data-v2-theme]')?.setAttribute('aria-label', theme==='light'?'Dunkle Ansicht aktivieren':'Helle Ansicht aktivieren');
}
try { v2SetTheme(localStorage.getItem(v2ThemeKey)||'light'); } catch { v2SetTheme('light'); }
function v2Layer(title, content, index=0, open=false) {
  return `<details class="v2-layer v2-layer-${index}" name="v2-match-layers" ${open?'open':''}><summary>${title}<span class="v2-layer-icon" aria-hidden="true"></span></summary><div class="v2-layer-content">${content}</div></details>`;
}
function v2Discover() {
  const name=liveEscape(fanClubs[activeClub].name);
  return `<section class="v2-discover" data-v2-reveal="discover" aria-labelledby="v2-discover-title"><p class="eyebrow">Mehr als ein Spiel</p><h2 id="v2-discover-title">Dein Verein.<br>Deine Geschichten.</h2><div class="v2-discover-stack"><a class="v2-discover-main" href="#season/squad"><img src="${v2ClubImages[activeClub]}" alt="" loading="lazy"><span><small>${name}</small><strong>Unsere Mannschaft</strong><i aria-hidden="true">↗</i></span></a><a class="v2-discover-link" href="#club"><span>Unsere Geschichte</span><i aria-hidden="true">+</i></a><a class="v2-discover-link" href="#club" data-v2-club-target="club-cabinet"><span>Unsere Erfolge</span><i aria-hidden="true">+</i></a><a class="v2-discover-link" href="#club" data-v2-club-target="v2-club-venue"><span>Unsere Heimstätte</span><i aria-hidden="true">+</i></a></div></section>`;
}
function v2Home() {
  const news=activeClub==='fcsg'?fcsgData.stories:stories;
  const name=liveEscape(fanClubs[activeClub].name);
  const fixture=activeClub==='fcsg'?fcsgMatchday():`<section class="home-matchday" aria-label="Aktuelles ${name}-Spiel"><a id="live-match" class="live-match" aria-label="${name}-Spiel" aria-live="polite" hidden></a></section>`;
  const story=(n,i)=>`<article class="story-screen v2-story" id="story-${i}"><a class="v2-story-link" href="#news/${liveEscape(n.id)}" aria-labelledby="v2-news-title-${i}"><div class="v2-story-image"><img src="${liveEscape(activeClub==='fcsg'?(n.image||'assets/fcsg-logo.svg'):photoUrl(n.image))}" alt="" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}></div><div class="story-copy"><p>${liveEscape(n.date)}</p><h2 id="v2-news-title-${i}"><span>${n.title}</span><span class="v2-news-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></span></h2></div></a></article>`;
  return `<section class="home-news v2-home-classic" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone">${fixture}</div><header class="v2-news-heading"><p class="eyebrow">Auf und neben dem Spielfeld</p><h1 id="home-news-title">Neues aus dem Verein</h1>${sourceNotice('news')}</header>${news[0]?story(news[0],0):'<p class="notice">Noch keine News verfügbar.</p>'}</div><div class="v2-news-grid">${news.slice(1).map((n,i)=>story(n,i+1)).join('')}</div></div>${v2Discover().replace(' data-v2-reveal="discover"','')}</section>${activeClub==='fcsg'?fcsgFooter():footer()}`;
}
home=v2Home;
fcsgHome=v2Home;
const v2OriginalMatchOverview=matchOverview;
matchOverview=function(g) {
  if(g.score)return v2OriginalMatchOverview(g);
  return `<div class="content narrow v2-match-discovery"><p class="eyebrow">${liveEscape(league(g))} · ${matchDay(g)}</p><h1>Das Duell.</h1><div class="v2-layer-stack">${v2Layer('Die Spielvorschau',matchPreviewSlot(g,handballClub()),0,true)}${v2Layer('Form & Direktvergleich',recentSelector(g),1)}${v2Layer('Zahlen zum Spiel',previewComparison(g),2)}${v2Layer('Rund ums Spiel',`<div class="facts"><div><span>Anspielzeit</span><strong>${g.time?g.time+' Uhr':'Noch offen'}</strong></div>${venueFact(g)}</div>${g.home==='Kadetten Schaffhausen'?`<div data-match-programme="${liveEscape(g.id)}"></div>`:''}<p>${ext(g.url,'Offizielle Spielinformationen','news-link')}</p>`,3)}</div></div>`;
};
const v2OriginalTicker=fcsgMatchTicker;
fcsgMatchTicker=function(g) {
  if(fcsgMatchStage(g)!=='preview')return v2OriginalTicker(g);
  return `<div class="v2-layer-stack">${v2Layer('Die Spielvorschau',matchPreviewSlot(g,'fcsg'),0,true)}${v2Layer('Form & Direktvergleich',fcsgPreviewStats(g),1)}${v2Layer('Rund ums Spiel',`<p>${liveEscape(g.venue||'Spielort noch offen')}</p><p>${g.confirmed?liveEscape(g.time)+' Uhr':'Anspielzeit noch nicht bestätigt'}</p>${ext(g.url,'Offizielles Matchcenter','news-link')}`,3)}</div>`;
};
const v2SetupViews=setupViews;
setupViews=function() {
  v2SetupViews();
  document.documentElement.classList.remove('snap-news');
  const season=document.querySelector('.season');
  if(season&&location.hash==='#season/squad') {
    const intro=document.createElement('section');intro.className='v2-roster-intro';intro.dataset.v2Reveal='roster-intro';
    intro.innerHTML=`<img src="${v2ClubImages[activeClub]}" alt="Heimstätte von ${liveEscape(fanClubs[activeClub].name)}"><div><p class="eyebrow">Menschen hinter dem Wappen</p><h2>Unsere Mannschaft.</h2><a class="button subtle" href="#club">Geschichte & Erfolge ↗</a></div>`;
    season.querySelector('.season-header')?.after(intro);
    season.insertAdjacentHTML('beforeend',v2Discover());
  }
  const club=document.querySelector('.club-page');
  if(club&&!club.querySelector('.v2-club-nav')) {
    const intro=club.querySelector('.club-intro');
    intro?.insertAdjacentHTML('afterend',`<nav class="v2-club-nav" aria-label="Verein entdecken"><button data-club-jump="club-history">Unsere Geschichte <span aria-hidden="true">+</span></button><button data-club-jump="club-cabinet">Unsere Erfolge <span aria-hidden="true">+</span></button><button data-v2-venue>Unsere Heimstätte <span aria-hidden="true">+</span></button></nav><section class="v2-club-venue" hidden><img src="${v2ClubImages[activeClub]}" alt="Heimstätte von ${liveEscape(fanClubs[activeClub].name)}"><h2>${activeClub==='kadetten'?'BBC Arena':activeClub==='fcsg'?'Berit Sitterstadion':'Kreuzbleiche'}</h2></section>`);
  }
  v2SetupHeader();
  v2SyncMatchAction();
  v2SetTheme(document.documentElement.dataset.theme);
  document.querySelectorAll('.club-chapter,.club-cabinet').forEach((element,index)=>element.dataset.v2Reveal='club-'+(element.id||index));
  v2SetupScrollChrome();
  v2SetupReveals();
  document.title+=' · V2 Test';
};
document.addEventListener('click',e=>{
  if(e.target.closest('[data-v2-theme]'))v2SetTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
  if(e.target.closest('[data-v2-venue]')) { const venue=document.querySelector('.v2-club-venue');if(venue){venue.hidden=!venue.hidden;e.target.closest('button').setAttribute('aria-expanded',String(!venue.hidden));} }
  const jump=e.target.closest('[data-v2-club-target]');
  if(jump) { const target=jump.dataset.v2ClubTarget;setTimeout(()=>{const element=document.querySelector('.'+target+',#'+target);if(element){element.hidden=false;element.scrollIntoView({behavior:'auto'});}},0); }
  if(e.target.closest('[data-v2-demo]'))v2ShowDemo();
});
function v2ShowDemo() {
  document.querySelector('.v2-demo')?.remove();
  const dialog=document.createElement('dialog');dialog.className='v2-demo';
  dialog.innerHTML=`<header><h2>Spielzustände testen</h2><button type="button" data-close aria-label="Schliessen">×</button></header><p class="muted">Gestaltungsbeispiele mit fiktiven Werten. Die aktuellen Vereinsdaten bleiben erhalten.</p><div class="v2-demo-controls">${['Vorschau','Matchday','Live','Endresultat'].map((s,i)=>`<button type="button" data-state="${i}" aria-pressed="${i===0}">${s}</button>`).join('')}</div><div class="v2-demo-fixture" role="status"></div>`;
  document.body.append(dialog);
  const draw=i=>{
    dialog.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.state)===i)));
    dialog.querySelector('.v2-demo-fixture').innerHTML=`<div class="v2-demo-card" data-demo-state="${i}"><p>${['Nächstes Spiel','Matchday','Live · 42. Minute','Beendet'][i]} · Beispiel</p><div><img src="${fanClubs[activeClub].logo}" alt="${liveEscape(fanClubs[activeClub].short)}"><strong>${i<2?'VS':activeClub==='fcsg'?(i===2?'1 : 0':'2 : 1'):(i===2?'24 : 21':'32 : 29')}</strong><span>Gastteam</span></div><p>${['Samstag · 18:00 Uhr','Heute · 18:00 Uhr','Zum Liveticker ↗','Spielbericht & Statistik ↗'][i]}</p></div>`;
  };
  draw(0);dialog.querySelector('[data-close]').onclick=()=>{dialog.close();dialog.remove();};
  dialog.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>draw(Number(b.dataset.state)));
  dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}

/* Scroll chrome is independent of the document flow: neither images nor fixtures change height. */
let v2TopObserver, v2HeroObserver, v2RevealObserver;
const v2Revealed=new Set();
function v2ScrollMarkup() {
  const club=fanClubs[activeClub];
  return `<a class="v2-scroll-home" href="#home" aria-label="${liveEscape(club.name)} · Startseite"><img src="${club.logo}" alt="" width="24" height="28"><span>${liveEscape(club.short)}</span></a><button type="button" data-v2-menu aria-controls="v2-scroll-clubs" aria-expanded="false" aria-label="Verein wechseln">Verein <span aria-hidden="true">⌄</span></button><button type="button" data-v2-settings aria-label="Meine Vereine einstellen">Einstellungen</button><div class="v2-scroll-clubs" id="v2-scroll-clubs" hidden>${selectedClubs.map(id=>`<button type="button" data-v2-select="${id}" aria-pressed="${id===activeClub}"><img src="${fanClubs[id].logo}" alt="" width="24" height="28"><span>${liveEscape(fanClubs[id].name)}</span></button>`).join('')}</div>`;
}
function v2SetupScrollChrome() {
  v2TopObserver?.disconnect();v2HeroObserver?.disconnect();
  document.querySelector('.v2-scrollbar')?.remove();
  const home=!location.hash||location.hash==='#home', club=location.hash==='#club';
  if(!club)return;
  const top=document.querySelector('body > .top');if(!top)return;
  const nav=document.createElement('nav');nav.className='v2-scrollbar';nav.hidden=true;nav.dataset.surface='photo';
  nav.setAttribute('aria-label','Kompakte Vereinsnavigation');nav.innerHTML=v2ScrollMarkup();document.body.append(nav);
  if(typeof IntersectionObserver==='undefined')return;
  v2TopObserver=new IntersectionObserver(entries=>{
    const visible=entries[0].isIntersecting;
    if(visible&&nav.contains(document.activeElement))top.querySelector('.brand')?.focus({preventScroll:true});
    nav.hidden=visible;
    if(visible)v2CloseClubMenu();
  },{threshold:0});
  v2TopObserver.observe(top);
  const hero=document.querySelector(home?'.home-title-zone':'.club-intro');
  if(hero){
    v2HeroObserver=new IntersectionObserver(entries=>{
      nav.dataset.surface=entries[0].boundingClientRect.bottom<=68?'content':'photo';
    },{rootMargin:'-68px 0px 0px 0px',threshold:0});
    v2HeroObserver.observe(hero);
  }else nav.dataset.surface='content';
}
function v2CloseClubMenu() {
  const menu=document.getElementById('v2-scroll-clubs');if(menu)menu.hidden=true;
  document.querySelector('[data-v2-menu]')?.setAttribute('aria-expanded','false');
}
function v2SetupReveals() {
  v2RevealObserver?.disconnect();
  const targets=[...document.querySelectorAll('[data-v2-reveal]')];
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||typeof IntersectionObserver==='undefined')return;
  v2RevealObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){
      entry.target.classList.remove('v2-reveal-pending');
      v2Revealed.add(activeClub+':'+entry.target.dataset.v2Reveal);v2RevealObserver.unobserve(entry.target);
    }
  },{rootMargin:'0px 0px -20px 0px',threshold:.08});
  for(const target of targets){
    if(v2Revealed.has(activeClub+':'+target.dataset.v2Reveal)||target.getBoundingClientRect().top<window.innerHeight-20)continue;
    target.classList.add('v2-reveal-pending');v2RevealObserver.observe(target);
  }
}
document.addEventListener('click',event=>{
  if(event.target.closest('.v2-scroll-home')&&location.hash==='#home'){event.preventDefault();window.scrollTo({top:0,behavior:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  const toggle=event.target.closest('[data-v2-menu]');
  if(toggle){const menu=document.getElementById('v2-scroll-clubs');menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));return;}
  const selected=event.target.closest('[data-v2-select]');
  if(selected){v2CloseClubMenu();applyClubChange(selected.dataset.v2Select,'#home',true);return;}
  if(event.target.closest('[data-v2-settings]')){
    document.getElementById('club-settings')?.click();return;
  }
  if(!event.target.closest('.v2-scrollbar'))v2CloseClubMenu();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('v2-scroll-clubs')?.hidden===false){v2CloseClubMenu();document.querySelector('[data-v2-menu]')?.focus();}
});

/* A single compact header; club choice and test tools open on demand. */
const v2UpdateClubHeader=updateClubHeader;
updateClubHeader=function(){v2UpdateClubHeader();v2SetupHeader();};
function v2SetupHeader(){
 v2CloseClubDropdown();
 const bar=document.querySelector('body > .top');if(!bar)return;
 if(!bar.querySelector('[data-v2-choose]')) {
  const button=document.createElement('button');button.type='button';button.className='v2-club-trigger';button.dataset.v2Choose='';button.setAttribute('aria-label','Verein wechseln');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','v2-club-dropdown');
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  bar.querySelector('.brand')?.after(button);
  const theme=document.createElement('button');theme.type='button';theme.className='header-button v2-theme-button';theme.dataset.v2Theme='';theme.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 14.1A8.5 8.5 0 0 1 9.9 4a8.5 8.5 0 1 0 10.1 10.1Z"/></svg>';bar.append(theme);
 }
 const settings=document.getElementById('club-settings');if(settings)settings.hidden=false;
 const picker=document.getElementById('club-switch');if(picker)picker.hidden=true;
 v2SetTheme(document.documentElement.dataset.theme);
}
function v2ClubStatus(id){const state=document.querySelector('[data-select-club="'+id+'"]')?.dataset.dot;return state?' · '+({soon:'spielt heute',live:'spielt gerade',pending:'hat heute gespielt',win:'heute gewonnen',draw:'heute unentschieden',loss:'heute verloren'}[state]||''):'';}
function v2CloseClubDropdown(restoreFocus=false){
 const menu=document.getElementById('v2-club-dropdown'),heldFocus=!!document.activeElement&&!!menu?.contains(document.activeElement);if(menu)menu.hidden=true;
 const trigger=document.querySelector('[data-v2-choose]');trigger?.setAttribute('aria-expanded','false');
 if(restoreFocus||heldFocus)trigger?.focus({preventScroll:true});
}
function v2ChooseClub(){
 const bar=document.querySelector('body > .top');if(!bar)return;
 let menu=document.getElementById('v2-club-dropdown');
 if(menu&&!menu.hidden){v2CloseClubDropdown();return;}
 if(!menu){menu=document.createElement('nav');menu.id='v2-club-dropdown';menu.className='v2-club-dropdown';menu.setAttribute('aria-label','Verein auswählen');bar.append(menu);}
 menu.innerHTML=`<div class="v2-club-options">${selectedClubs.map(id=>`<button type="button" data-v2-pick="${id}" aria-pressed="${id===activeClub}"><img src="${fanClubs[id].logo}" alt="" width="32" height="38"><span>${liveEscape(fanClubs[id].name)}<small>${id==='fcsg'?'Fussball':'Handball'}${id===activeClub?' · Ausgewählt':''}${v2ClubStatus(id)}</small></span><i aria-hidden="true">${id===activeClub?'✓':'→'}</i></button>`).join('')}</div><button type="button" class="v2-manage-clubs" data-v2-manage>Meine Vereine verwalten</button>`;
 menu.hidden=false;document.querySelector('[data-v2-choose]')?.setAttribute('aria-expanded','true');
}
const v2OpenClubSettings=openClubSettings;
openClubSettings=function(){
 v2OpenClubSettings();
 const dialog=document.querySelector('.club-settings-dialog');if(!dialog||dialog.querySelector('.v2-test-menu'))return;
 const tools=document.createElement('details');tools.className='v2-test-menu';tools.innerHTML='<summary>V2 · Testversion</summary><div><button type="button" data-v2-demo>Spielzustände ansehen</button><a href="../">Original-App öffnen ↗</a></div>';
 dialog.append(tools);
 const install=document.getElementById('install-app');if(install){install.classList.add('v2-install');install.innerHTML+=' <span>App installieren</span>';tools.before(install);}
};
document.addEventListener('click',event=>{
 if(event.target.closest('[data-v2-choose]'))v2ChooseClub();
 else if(!event.target.closest('.v2-club-dropdown'))v2CloseClubDropdown();
 if(event.target.closest('[data-v2-manage]')){v2CloseClubDropdown();openClubSettings();}
 const pick=event.target.closest('[data-v2-pick]');if(pick){const id=pick.dataset.v2Pick;v2CloseClubDropdown();if(id!==activeClub)applyClubChange(id,clubSwitchRoute(location.hash),true);}
});

/* One geometry for preview, matchday, live and confirmed results. */
function v2CountdownValue(g){const text=countdownText(g);if(!text.startsWith('Anpfiff in '))return g.time||'Zeit offen';const parts=text.slice(11).split(':');return parts.length===3?(Number(parts[0])*60+Number(parts[1]))+':'+parts[2]:text.slice(11);}
function v2MatchContents(g,live=false){
 if(!g)return '';
 const football=activeClub==='fcsg',ended=!live&&Array.isArray(g.score),today=g.date===swissToday();
 const result=ended?(football?fcsgResult(g):teamResult(g,handballTeamName())):null;
 const confirmed=football?g.confirmed:!!g.time;
 const soon=!live&&!ended&&today&&confirmed&&countdownSoon(g);
 const centre=live?(football?fcsgDisplayScore(g):g.score?.join(' : ')||'– : –'):ended?g.score.join(' : '):soon?v2CountdownValue(g):confirmed&&g.time?g.time:'Zeit offen';
 const home=football?g.home.replace(/\s/g,'')==='FCSt.Gallen1879':isOwnHandballTeam(teamName(g.home));
 const mark=(name,logo)=>football?fcsgBadge(name,logo):badge(name);
 const context=live?[g.phase,g.clock].filter(Boolean).join(' · ')||'Live':ended?(result?.label||'Beendet')+' · Endresultat':(relativeDay(g.date)||new Date(g.date+'T12:00:00Z').toLocaleDateString('de-CH',{timeZone:'Europe/Zurich',day:'2-digit',month:'2-digit'}))+' · '+(home?'Heimspiel':'Auswärtsspiel');
 return `<div class="live-heading"><span>${live?'<i aria-hidden="true"></i>LIVE':ended?'BEENDET':today?'MATCHDAY':'NÄCHSTES SPIEL'}</span><small>${liveEscape(g.league||'')}</small></div><div class="live-score"><span>${mark(g.home,g.homeLogo)}<b>${liveEscape(g.home)}</b></span><div class="v2-match-centre"><strong class="${!confirmed&&!live&&!ended?'v2-time-open':''}" ${live||ended?'data-v2-score aria-live="polite"':soon?`data-v2-countdown="${liveEscape(g.id)}" aria-live="off"`:''}>${liveEscape(centre)}</strong><small>${live||ended?'Resultat':soon?'Bis zum Anpfiff':confirmed&&g.time?'Anspielzeit':'Anspielzeit offen'}</small></div><span>${mark(g.away,g.awayLogo)}<b>${liveEscape(g.away)}</b></span></div><p class="v2-match-context">${liveEscape(context)}${football&&fcsgLiveErrors.has(g.id)?' · Letzter verfügbarer Stand':''}</p>`;
}
const v2SetMatchdayContent=setMatchdayContent;
setMatchdayContent=function(slot,html){
 const own=slot.closest('.home-matchday');
 if(own){const f=activeClub==='fcsg'?{game:fcsgFixture()}:homeFixture();if(f.game)html=v2MatchContents(f.game,activeClub==='fcsg'?!!f.game.live:!!f.live);slot.setAttribute('aria-live','off');}
 const previous=slot.querySelector('[data-v2-score]')?.textContent;
 v2SetMatchdayContent(slot,html);
 const score=slot.querySelector('[data-v2-score]');if(previous&&score&&previous!==score.textContent){score.classList.add('v2-score-updated');setTimeout(()=>score.classList.remove('v2-score-updated'),450);}
};
const v2FcsgMatchday=fcsgMatchday;
fcsgMatchday=function(){const html=v2FcsgMatchday(),g=fcsgFixture();if(!g)return html;const start=html.indexOf('<div class="live-heading">');return start<0?html:html.slice(0,start)+v2MatchContents(g,!!g.live)+'</a></section>';};
function v2SyncMatchAction(){
 const card=document.querySelector('.home-matchday .live-match'),section=card?.closest('.home-matchday');if(!section)return;
 let action=section.querySelector('.v2-match-action');
 if(card.hidden){if(action)action.hidden=true;return;}
 if(!action){action=document.createElement('a');action.className='v2-match-action';section.append(action);}
 action.hidden=false;action.href=card.getAttribute('href')||'#season/games';
 const label=card.classList.contains('is-live')?'Live verfolgen':card.classList.contains('matchday-win')||card.classList.contains('matchday-draw')||card.classList.contains('matchday-loss')?'Zum Spielrückblick':card.classList.contains('is-matchday')?'Zum Spiel':'Spielvorschau';
 const html=`<span>${label}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;if(action.innerHTML!==html)action.innerHTML=html;
}
const v2ShowLiveMatch=showLiveMatch;showLiveMatch=function(){v2ShowLiveMatch();v2SyncMatchAction();};
const v2UpdateFcsgLiveView=updateFcsgLiveView;updateFcsgLiveView=function(){v2UpdateFcsgLiveView();v2SyncMatchAction();};
setInterval(()=>{
 if(document.hidden)return;
 document.querySelectorAll('[data-v2-countdown]').forEach(el=>{const g=activeClub==='fcsg'?fcsgFixture():homeFixture().game;if(g?.id===el.dataset.v2Countdown){const text=v2CountdownValue(g);if(el.textContent!==text)el.textContent=text;if(!countdownSoon(g)){el.removeAttribute('data-v2-countdown');el.nextElementSibling.textContent='Anspielzeit';}}});
},1000);

document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.getElementById('v2-club-dropdown')?.hidden===false){v2CloseClubDropdown(true);event.preventDefault();}
 if(event.key==='ArrowDown'&&event.target.closest('[data-v2-choose]')){event.preventDefault();if(document.getElementById('v2-club-dropdown')?.hidden!==false)v2ChooseClub();document.querySelector('.v2-club-dropdown [data-v2-pick]')?.focus();}
});
window.addEventListener('scroll',()=>v2CloseClubDropdown(),{passive:true});
