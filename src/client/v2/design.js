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
  return `<section class="v2-discover" aria-labelledby="v2-discover-title"><p class="eyebrow">Mehr als ein Spiel</p><h2 id="v2-discover-title">Dein Verein.<br>Deine Geschichten.</h2><div class="v2-discover-stack"><a class="v2-discover-main" href="#season/squad"><img src="${v2ClubImages[activeClub]}" alt="" loading="lazy"><span><small>${name}</small><strong>Unsere Mannschaft</strong><i aria-hidden="true">↗</i></span></a><a class="v2-discover-link" href="#club"><span>Unsere Geschichte</span><i aria-hidden="true">+</i></a><a class="v2-discover-link" href="#club" data-v2-club-target="club-cabinet"><span>Unsere Erfolge</span><i aria-hidden="true">+</i></a><a class="v2-discover-link" href="#club" data-v2-club-target="v2-club-venue"><span>Unsere Heimstätte</span><i aria-hidden="true">+</i></a></div></section>`;
}
function v2Home() {
  const news=activeClub==='fcsg'?fcsgData.stories:stories;
  const name=liveEscape(fanClubs[activeClub].name);
  const fixture=activeClub==='fcsg'?fcsgMatchday():`<section class="home-matchday" aria-label="Aktuelles ${name}-Spiel"><a id="live-match" class="live-match" aria-label="${name}-Spiel" aria-live="polite" hidden></a></section>`;
  const story=(n,i)=>`<article class="story-screen v2-story" id="story-${i}"><a class="v2-story-image" href="#news/${liveEscape(n.id)}" tabindex="-1" aria-hidden="true"><img src="${liveEscape(activeClub==='fcsg'?(n.image||'assets/fcsg-logo.svg'):photoUrl(n.image))}" alt="" decoding="async" ${i?'loading="lazy"':'fetchpriority="high"'}></a><div class="story-copy"><p>${liveEscape(n.date)} · Vereinsnews</p><h2><a href="#news/${liveEscape(n.id)}">${n.title}</a></h2><a class="v2-text-link" href="#news/${liveEscape(n.id)}">Geschichte lesen <span aria-hidden="true">↗</span></a></div></article>`;
  return `<section class="home-news" aria-labelledby="home-news-title"><div class="story-feed"><div class="home-front-page"><div class="home-title-zone"><div class="v2-hero-copy"><p class="eyebrow">Dein Verein. Dein Spiel.</p><h1 id="home-news-title">${activeClub==='kadetten'?'Zusammen.<br>Für Orange.':activeClub==='fcsg'?'Hier schlägt<br>Grünweiss.':'Zämästoh.<br>Für Gelbschwarz.'}</h1><p>${name} · Saison 2026/27</p></div>${fixture}</div><header class="v2-news-heading"><p class="eyebrow">Auf und neben dem Spielfeld</p><h2>Neues aus dem Verein</h2>${sourceNotice('news')}</header>${news[0]?story(news[0],0):'<p class="notice">Noch keine News verfügbar.</p>'}</div><div class="v2-news-grid">${news.slice(1).map((n,i)=>story(n,i+1)).join('')}</div></div>${v2Discover()}</section>${activeClub==='fcsg'?fcsgFooter():footer()}`;
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
    const intro=document.createElement('section');intro.className='v2-roster-intro';
    intro.innerHTML=`<img src="${v2ClubImages[activeClub]}" alt="Heimstätte von ${liveEscape(fanClubs[activeClub].name)}"><div><p class="eyebrow">Menschen hinter dem Wappen</p><h2>Unsere Mannschaft.</h2><a class="button subtle" href="#club">Geschichte & Erfolge ↗</a></div>`;
    season.querySelector('.season-header')?.after(intro);
    season.insertAdjacentHTML('beforeend',v2Discover());
  }
  const club=document.querySelector('.club-page');
  if(club&&!club.querySelector('.v2-club-nav')) {
    const intro=club.querySelector('.club-intro');
    intro?.insertAdjacentHTML('afterend',`<nav class="v2-club-nav" aria-label="Verein entdecken"><button data-club-jump="club-history">Unsere Geschichte <span aria-hidden="true">+</span></button><button data-club-jump="club-cabinet">Unsere Erfolge <span aria-hidden="true">+</span></button><button data-v2-venue>Unsere Heimstätte <span aria-hidden="true">+</span></button></nav><section class="v2-club-venue" hidden><img src="${v2ClubImages[activeClub]}" alt="Heimstätte von ${liveEscape(fanClubs[activeClub].name)}"><h2>${activeClub==='kadetten'?'BBC Arena':activeClub==='fcsg'?'Berit Sitterstadion':'Kreuzbleiche'}</h2></section>`);
  }
  const bar=document.querySelector('body > .top');
  if(bar&&!bar.querySelector('.v2-test-tools')) {
    const tools=document.createElement('div');tools.className='v2-test-tools';
    tools.innerHTML='<span>Version 2 · Test</span><button type="button" data-v2-theme aria-label="Dunkle Ansicht aktivieren">◐</button><button type="button" data-v2-demo>Spielzustände</button><a href="../">Original ↗</a>';
    bar.prepend(tools);
  }
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
