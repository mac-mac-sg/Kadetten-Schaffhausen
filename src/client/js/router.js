/* Hash-Routing, Seitenaufbau und Ansichten-Setup. */
let viewObserver, newsRegionObserver, renderedRouteURL;
function newsDotWindow(index, total) {
  const count = Math.min(5, total),
    start = Math.max(0, Math.min(index - (count - 2), total - count));
  return {start, end: start + count};
}
function updateNewsDots(index) {
  const buttons = [...document.querySelectorAll('[data-story]')],
    {start, end} = newsDotWindow(index, buttons.length);
  for (const button of buttons) {
    const position = Number(button.dataset.story),
      visible = position >= start && position < end,
      entering = visible && button.hidden;
    button.hidden = !visible;
    button.setAttribute('aria-pressed', String(position === index));
    button.classList.toggle('dot-entering', entering);
  }
  document
    .querySelectorAll('.story-screen')
    .forEach(el => el.classList.toggle('story-current', el.id === 'story-' + index));
}
let fcsgProfileViewportObserver;
function clubHeaderOffset(header=document.querySelector('body > .top')) {
  const rect=header?.getBoundingClientRect();if(!rect)return 0;
  return document.documentElement?.dataset?.design==='v2'?rect.height:Number.isFinite(rect.bottom)?rect.bottom+14:rect.height;
}
function setupFcsgProfileViewport() {
  fcsgProfileViewportObserver?.disconnect();
  const root = document.documentElement;
  const enabled = activeClub === 'fcsg' && location.hash.startsWith('#player/');
  document.body.classList.toggle('fcsg-profile-mode', enabled);
  for (const name of ['--fcsg-profile-top', '--fcsg-profile-bottom']) root.style.removeProperty(name);
  if (!enabled) return;
  const header = document.querySelector('body > .top');
  const dock = document.querySelector('body > .dock');
  const measure = () => {
    if (header) root.style.setProperty('--fcsg-profile-top', `${Math.ceil(clubHeaderOffset(header))}px`);
    if (dock) root.style.setProperty('--fcsg-profile-bottom', `${Math.ceil(window.innerHeight - dock.getBoundingClientRect().top + 16)}px`);
  };
  measure();
  if (typeof ResizeObserver !== 'undefined') {
    fcsgProfileViewportObserver = new ResizeObserver(measure);
    for (const element of [header, dock]) if (element) fcsgProfileViewportObserver.observe(element);
  }
  window.removeEventListener('resize', measureFcsgProfileViewport);
  window.addEventListener('resize', measureFcsgProfileViewport);
}
function measureFcsgProfileViewport() {
  if (document.body.classList.contains('fcsg-profile-mode')) setupFcsgProfileViewport();
}
function setupViews() {
  setupMatchdayOrbit();
  viewObserver?.disconnect();
  newsRegionObserver?.disconnect();
  document.body.classList.toggle('player-mode', activeClub !== 'fcsg' && location.hash.startsWith('#player/'));
  document.body.classList.toggle('immersive', location.hash === '#home' || !location.hash);
  document.documentElement.classList.toggle('snap-news', location.hash === '#home' || !location.hash);
  document.documentElement.classList.toggle('snap-profile', location.hash.startsWith('#player/'));
  setupFcsgProfileViewport();
  document
    .querySelectorAll('[data-story]')
    .forEach(
      b =>
        (b.onclick = () =>
          (b.dataset.story === '0'
            ? document.querySelector('.home-front-page')
            : document.getElementById('story-' + b.dataset.story))
            ?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}))
    );
  document
    .querySelectorAll('[data-section]')
    .forEach(
      b =>
        (b.onclick = () =>
          document
            .getElementById(b.dataset.section)
            ?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}))
    );
  if (typeof IntersectionObserver !== 'undefined') {
    viewObserver = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            if (e.target.classList.contains('story-screen')) updateNewsDots(Number(e.target.id.replace('story-', '')));
            else
              document
                .querySelectorAll('[data-section]')
                .forEach(b => b.setAttribute('aria-pressed', String(e.target.id === b.dataset.section)));
          }
        });
      },
      {threshold: 0.45}
    );
    document.querySelectorAll('.story-screen,.profile-slide,.fcsg-profile-slide').forEach(e => viewObserver.observe(e));
  }
  // Initialise both clubs identically before observers begin reporting visibility.
  if (document.querySelector('.story-screen')) updateNewsDots(0);
  const newsFeed = document.querySelector('.story-feed');
  const newsDots = document.querySelector('.story-dots');
  if (newsFeed && newsDots) {
    if (typeof IntersectionObserver !== 'undefined') {
      const visibleStories = new Set();
      newsRegionObserver = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) visibleStories.add(entry.target);
            else visibleStories.delete(entry.target);
          }
          newsDots.hidden = visibleStories.size === 0;
        },
        {rootMargin: '-35% 0px -45% 0px', threshold: 0}
      );
      newsFeed.querySelectorAll('.story-screen').forEach(story => newsRegionObserver.observe(story));
    } else newsDots.hidden = false;
  }
  $('.share')?.addEventListener('click', async e => {
    try {
      if (navigator.share) await navigator.share({title: document.title, url: location.href});
      else {
        await navigator.clipboard.writeText(location.href);
        e.target.textContent = 'Link kopiert';
      }
    } catch {
      e.target.textContent = 'Link aus Adresszeile teilen';
    }
  });
}
function notFound() {
  return '<section class="content"><h1>Hier geht’s zurück aufs Feld.</h1><a class="button" href="#home">Zur Startseite</a></section>';
}
function render() {
  renderedRouteURL=location.href;
  if (programmeDialog && programmeDialog.dataset.route !== activeClub + location.hash) closeMatchProgramme();
  const scrollRoot = document.documentElement,
    scrollTop = window.scrollY;
  scrollRoot.style.scrollSnapType = 'none';
  const [page = 'home', id, tab = 'overview'] = (location.hash.slice(1) || 'home').split('/');
  if(scrollRoot.dataset?.design!=='v2'&&mode==='week')mode='calendar';
  const fixedCalendar = page === 'season' && id === 'games' && ['calendar','week'].includes(mode);
  document.body.classList.toggle('games-mode', page === 'season' && id === 'games');
  scrollRoot.classList.toggle('calendar-mode', fixedCalendar);
  document.body.classList.toggle('calendar-mode', fixedCalendar);
  $('#app').innerHTML =
    activeClub === 'fcsg'
      ? fcsgView(page, id, tab)
      : page === 'home'
      ? home()
      : page === 'club'
        ? clubPage()
        : page === 'news'
        ? article(id)
        : page === 'season'
          ? season(['games', 'table', 'squad'].includes(id) ? id : 'games')
          : page === 'match'
            ? id === 'live' ? liveMatchPage({id:'live'},tab) : games.find(g => g.id === id)
              ? match(
                  games.find(g => g.id === id),
                  ['overview', 'report', 'squad', 'stats'].includes(tab) ? tab : 'overview'
                )
              : notFound()
            : page === 'player'
              ? profile(Number(id))
              : notFound();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const active =
      a.dataset.nav ===
      (['home', 'news'].includes(page)
        ? 'news'
        : ['player','club'].includes(page)
          ? 'squad'
          : page === 'match'
            ? 'games'
            : page === 'season'
              ? ['games', 'table', 'squad'].includes(id)
                ? id
                : 'games'
              : 'news');
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('#competition')?.addEventListener('change', e => {
    competition = e.target.value;
    render();
  });
  document.querySelectorAll('[data-mode]').forEach(
    b =>
      (b.onclick = () => {
        window.scrollTo({top:0,behavior:'instant'});
        mode = b.dataset.mode;
        render();
      })
  );
  document.querySelectorAll('[data-league]').forEach(
    b =>
      (b.onclick = () => {
        tableLeague = b.dataset.league;
        render();
      })
  );
  $('#prev-month')?.addEventListener('click', () => {
    if (calendarYear * 12 + month > 2026 * 12 + 6) {
      month--;
      if (month < 0) {
        month = 11;
        calendarYear--;
      }
    }
    render();
  });
  $('#next-month')?.addEventListener('click', () => {
    if (calendarYear * 12 + month < 2027 * 12 + 5) {
      month++;
      if (month > 11) {
        month = 0;
        calendarYear++;
      }
    }
    render();
  });
  document.title =
    (page === 'match'
      ? 'Matchcenter'
      : page === 'player'
        ? 'Spielerprofil'
        : page === 'season'
          ? {games: 'Spiele', table: 'Tabelle', squad: 'Kader'}[id] || 'Spiele'
          : page === 'club'
            ? 'Unser Verein'
            : page === 'news'
            ? 'Artikel'
            : 'News') + ' · ' + fanClubs[activeClub].name;
  // Fill the handball card before header measurement commits the hidden-card layout.
  if (activeClub !== 'fcsg') showLiveMatch();
  setupWeekView();
  setupViews();
  updateClubHeader();
  measureAppChrome();
  loadMatchPreview();
  loadMatchProgramme();
  if (activeClub === 'fcsg') {
    document.body.classList.toggle('player-mode', false);
    scrollRoot.classList.toggle('snap-profile', page === 'player');
    if (page === 'season' && id === 'games' && mode === 'list') centerNextGame();
    syncOfflineNotice();
    loadFcsgArticle();
    setupClubPage();
    loadFcsgLive();
    loadFcsgPlayerDetails();
    window.scrollTo({top: fixedCalendar ? 0 : scrollTop, behavior: 'instant'});
    requestAnimationFrame(() => scrollRoot.style.removeProperty('scroll-snap-type'));
    return;
  }
  setupClubPage();
  setupRecentGames();
  if (page === 'season' && id === 'games' && mode === 'list') centerNextGame();
  setupEnhancements();
  loadGameReports();
  loadPlayerReports();
  loadEhfArchive();
  loadFullArticle();
  window.scrollTo({top: fixedCalendar ? 0 : scrollTop, behavior: 'instant'});
  requestAnimationFrame(() => scrollRoot.style.removeProperty('scroll-snap-type'));
}
let gameCenterFrame;
function centerNextGame() {
  cancelAnimationFrame(gameCenterFrame);
  gameCenterFrame = requestAnimationFrame(() => {
    if (location.hash !== '#season/games' || mode !== 'list') return;
    const card=document.querySelector('.game-timeline .current-game');
    if(!card)return;
    const viewportHeight=window.visualViewport?.height || window.innerHeight;
    const dockTop=Math.min(viewportHeight,document.querySelector('.dock')?.getBoundingClientRect().top ?? viewportHeight);
    const header=document.querySelector('.season-header'),heading=header?.querySelector('h1');
    const controls=document.documentElement?.dataset?.design!=='v2'?document.querySelector('.game-control-bar'):null;
    const stickyHeight=controls?controls.getBoundingClientRect().height:header&&heading?header.getBoundingClientRect().height-(heading.getBoundingClientRect().top-header.getBoundingClientRect().top):0;
    const clubHeight=clubHeaderOffset();
    const rect=card.getBoundingClientRect(), top=clubHeight+stickyHeight+12, bottom=dockTop-12;
    // Keep the fixture below both the club selection and pinned section controls.
    const targetTop=top+Math.max(0,(bottom-top-rect.height)/2);
    window.scrollTo({top:Math.max(0,window.scrollY+rect.top-targetTop),behavior:'instant'});
  });
}

let appChromeObserver;
function measureAppChrome() {
  const top=document.querySelector('body > .top');if(!top)return;
  const measure=()=>{
    const height=top.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--app-header-height',height+'px');
    document.body.style.setProperty('--games-header-height',height+'px');
    const controls=document.querySelector('.games-mode .game-control-bar'),season=document.querySelector('.games-mode .season');
    if(controls&&season&&typeof getComputedStyle==='function'){
      const rect=season.getBoundingClientRect(),css=getComputedStyle(season),left=parseFloat(css.paddingLeft)||0,right=parseFloat(css.paddingRight)||0;
      document.body.style.setProperty('--v1-games-left',(rect.left+left)+'px');
      document.body.style.setProperty('--v1-games-width',Math.max(0,rect.width-left-right)+'px');
      document.documentElement.style.setProperty('--v1-games-controls-height',controls.getBoundingClientRect().height+'px');
    }
    const header=document.querySelector('.games-mode .season-header'),heading=header?.querySelector?.('h1');
    if(heading)document.body.style.setProperty('--games-sticky-offset',(heading.getBoundingClientRect().top-header.getBoundingClientRect().top)+'px');
  };
  measure();
  if(typeof ResizeObserver!=='undefined') {
    if(!appChromeObserver)appChromeObserver=new ResizeObserver(measure);
    appChromeObserver.disconnect();
    appChromeObserver.observe(top);
    const header=document.querySelector('.games-mode .season-header');
    if(header)appChromeObserver.observe(header);
    const controls=document.querySelector('.games-mode .game-control-bar'),season=document.querySelector('.games-mode .season');
    if(controls)appChromeObserver.observe(controls);
    if(season)appChromeObserver.observe(season);
  }
}

/* Touch navigation is limited to V1's four primary routes. Native scrolling stays in charge. */
const mainTabSwipeRoutes=['#home','#season/games','#season/table','#season/squad'];
function mainTabSwipeTarget(route,dx,dy,duration,width) {
  const index=mainTabSwipeRoutes.indexOf(route||'#home');
  const distance=Math.max(64,Math.min(96,width*.18));
  if(index<0||duration<0||duration>10000||Math.abs(dx)<distance||Math.abs(dy)>48||Math.abs(dx)<Math.abs(dy)*1.8)return null;
  return mainTabSwipeRoutes[Math.max(0,Math.min(mainTabSwipeRoutes.length-1,index+(dx<0?1:-1)))];
}
function setupMainTabSwipe() {
  const root=document.documentElement,app=document.getElementById('app');
  if(root.dataset.design==='v2'||!app)return;
  const pager=createMainTabPager(app);
  let gesture=null,settling=false;
  const blocked=()=>!!document.querySelector('dialog[open],[role="dialog"][aria-modal="true"],#compact-club-menu:not([hidden])')||window.getSelection?.()?.isCollapsed===false;
  const ownsGesture=target=>{
    if(target.closest('button,input,select,textarea,summary,[contenteditable]:not([contenteditable="false"]),[role="slider"],[data-swipe-ignore],.calendar-panel,.match-calendar,.calendar,.week-calendar'))return true;
    for(let e=target;e&&e!==app;e=e.parentElement){
      if(e.scrollWidth>e.clientWidth+2&&/auto|scroll/.test(getComputedStyle(e).overflowX))return true;
    }
    return false;
  };
  app.addEventListener('touchstart',event=>{
    gesture=null;
    if(settling||root.dataset.design==='v2'||event.touches.length!==1||blocked()||!mainTabSwipeRoutes.includes(location.hash||'#home')||ownsGesture(event.target))return;
    const t=event.touches[0];
    if(t.clientX<24||t.clientX>window.innerWidth-24)return;
    gesture={id:t.identifier,x:t.clientX,y:t.clientY,at:Date.now(),url:location.href,target:event.target};
  },{passive:true});
  app.addEventListener('touchmove',event=>{
    if(!gesture)return;
    const t=event.touches[0];
    if(event.touches.length!==1||t.identifier!==gesture.id||blocked()){gesture=null;pager.cancel();return;}
    const dx=t.clientX-gesture.x,dy=Math.abs(t.clientY-gesture.y);
    if(!gesture.locked&&dy>12&&dy>Math.abs(dx)/1.3){gesture=null;return;}
    if(!gesture.locked&&Math.abs(dx)>12&&Math.abs(dx)>dy*1.5){gesture.locked=true;pager.begin(location.hash||'#home');}
    if(gesture.locked){if(event.cancelable)event.preventDefault();pager.move(dx);}
  },{passive:false});
  app.addEventListener('touchcancel',()=>{gesture=null;pager.cancel();},{passive:true});
  app.addEventListener('touchend',async event=>{
    const start=gesture;gesture=null;
    if(!start||event.touches.length||location.href!==start.url||!start.target.isConnected||blocked()){pager.cancel();return;}
    const t=Array.from(event.changedTouches).find(t=>t.identifier===start.id);if(!t){pager.cancel();return;}
    const route=location.hash||'#home',next=mainTabSwipeTarget(route,t.clientX-start.x,t.clientY-start.y,Date.now()-start.at,window.innerWidth);
    if((start.locked||next)&&event.cancelable)event.preventDefault();
    if(!start.locked&&!next)return;
    settling=true;
    try {
      const result=pager.finish(next&&next!==route?next:null);
      const completed=result?.then?await result:result;
      if(completed===false)return;
      if(!next||next===route||location.href!==start.url||blocked()){pager.cancel();return;}
      if(next==='#season/games'){mode='list';competition='Alle';}
      location.hash=next;
    } finally {settling=false;}
  },{passive:false});
  window.addEventListener('hashchange',()=>{gesture=null;pager.routeChanged();});
}


/* Script-free preview documents isolate each page's body styles without live polling. */
function mainTabPreviewMarkup(route) {
  const savedMode=mode,savedCompetition=competition;
  try {
    if(route==='#season/games'){mode='list';competition='Alle';}
    const tab=route.split('/')[1],markup=route==='#home'?(activeClub==='fcsg'?fcsgHome():home()):(activeClub==='fcsg'?fcsgView('season',tab):season(tab));
    const container=document.createElement('div');container.innerHTML=markup;
    if(route==='#home'){
      const slot=container.querySelector('.home-matchday .live-match');
      if(slot){if(activeClub!=='fcsg')paintHandballMatchday(slot,true);else syncV1MatchAction(slot);}
    }
    return container.innerHTML;
  } finally {mode=savedMode;competition=savedCompetition;}
}
function createMainTabPager(app) {
  const host=document.createElement('div');host.className='main-tab-pager';host.setAttribute('aria-hidden','true');host.inert=true;document.body.append(host);
  let frames=new Map(),key='',timer=0,drag=null,committing=null,animations=[],generation=0;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const signature=()=>[activeClub,document.documentElement.dataset.theme,window.innerWidth,window.innerHeight,location.hash||'#home'].join('|');
  const stop=()=>{generation++;for(const a of animations)a.cancel();animations=[];};
  const hide=()=>{host.classList.remove('is-dragging');for(const entry of frames.values()){entry.frame.style.visibility='hidden';entry.frame.style.transform='translateX(0px)';}};
  const cancel=()=>{stop();drag=null;committing=null;hide();schedule();};
  function align(entry,current=false){
    const doc=entry.frame.contentDocument,win=entry.frame.contentWindow;if(!doc?.querySelector('#app'))return;
    if(current){win.scrollTo(0,window.scrollY);return;}
    win.scrollTo(0,0);
    if(entry.route==='#season/games'){
      const card=doc.querySelector('.game-timeline .current-game');if(!card)return;
      const rootTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v1-content-top'));
      const top=(Number.isFinite(rootTop)?rootTop:clubHeaderOffset())+(doc.querySelector('.game-control-bar')?.getBoundingClientRect().height||54)+12;
      const bottom=(document.querySelector('body > .dock')?.getBoundingClientRect().top||innerHeight)-12,r=card.getBoundingClientRect();
      win.scrollTo(0,Math.max(0,r.top-(top+Math.max(0,(bottom-top-r.height)/2))));
    }
  }
  function build(route){
    const frame=document.createElement('iframe');frame.title='Ansichtsvorschau';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','allow-same-origin');frame.inert=true;
    const entry={frame,route,ready:false};frames.set(route,entry);
    const root=document.documentElement,styles=[...document.querySelectorAll('link[rel="stylesheet"]')].map(e=>e.outerHTML).join('');
    const vars=['--app-header-height','--v1-content-top','--v1-games-left','--v1-games-width','--v1-games-controls-height'].map(k=>k+':'+getComputedStyle(root).getPropertyValue(k)).join(';');
    const isCurrent=route===(location.hash||'#home'),bodyClass=isCurrent?document.body.className:route==='#home'?'immersive':route==='#season/games'?'games-mode':'';
    const markup=route===(location.hash||'#home')?app.innerHTML:mainTabPreviewMarkup(route);
    const theme=root.dataset.theme==='light'?'light':'dark';
    frame.addEventListener('load',()=>{try{entry.ready=true;align(entry,route===(location.hash||'#home'));}catch{entry.ready=false;}});
    frame.srcdoc=`<!doctype html><html lang="de-CH" class="${isCurrent?root.className:''}" data-theme="${theme}" data-club="${activeClub}" style="${vars}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${location.href.split('#')[0]}">${styles}<style>html{scroll-snap-type:none!important;scroll-behavior:auto!important}*{animation:none!important;transition:none!important}.season-header,.game-control-bar,.story-dots{visibility:hidden!important}body{pointer-events:none}</style></head><body class="${bodyClass}"><main id="app">${markup}</main></body></html>`;
    host.append(frame);
  }
  function prepare(){
    if(drag||committing||reduced())return;
    const route=location.hash||'#home',index=mainTabSwipeRoutes.indexOf(route);
    if(index<0)return;
    for(const entry of frames.values())entry.frame.remove();frames=new Map();key=signature();
    for(const target of mainTabSwipeRoutes.slice(Math.max(0,index-1),index+2))build(target);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(prepare,100);}
  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(drag&&!drag.target?.isConnected)cancel();schedule();}).observe(app,{childList:true});
    new MutationObserver(records=>{if(records.some(r=>r.oldValue!==r.target.getAttribute(r.attributeName)))cancel();}).observe(document.documentElement,{attributes:true,attributeOldValue:true,attributeFilter:['data-theme','data-club']});
  }
  window.addEventListener('resize',cancel);schedule();
  return {
    begin(route){
      if(reduced())return false;
      if(key!==signature()){prepare();return false;}
      const current=frames.get(route);if(!current?.ready)return false;
      stop();align(current,true);drag={route,width:innerWidth,dx:0,current,target:app.firstElementChild};host.classList.add('is-dragging');current.frame.style.visibility='visible';return true;
    },
    move(dx){
      if(!drag)return;
      const index=mainTabSwipeRoutes.indexOf(drag.route),direction=dx<0?1:-1,next=frames.get(mainTabSwipeRoutes[index+direction]);
      const offset=next?.ready?Math.max(-drag.width,Math.min(drag.width,dx)):Math.max(-drag.width*.15,Math.min(drag.width*.15,dx*.22));
      for(const entry of frames.values())if(entry!==drag.current)entry.frame.style.visibility='hidden';
      drag.dx=offset;drag.next=next?.ready?next:null;drag.direction=direction;
      drag.current.frame.style.transform=`translateX(${offset}px)`;
      if(drag.next){align(drag.next);drag.next.frame.style.visibility='visible';drag.next.frame.style.transform=`translateX(${offset+direction*drag.width}px)`;}
    },
    async finish(next){
      if(!drag||reduced())return true;
      const state=drag,commit=next&&state.next?.route===next;
      if(next&&!commit){cancel();return true;}
      const destinations=[[state.current,commit?-state.direction*state.width:0]];
      if(state.next)destinations.push([state.next,commit?0:state.direction*state.width]);
      const token=generation;
      animations=destinations.map(([entry,x])=>entry.frame.animate([{transform:entry.frame.style.transform},{transform:`translateX(${x}px)`}],{duration:commit?220:180,easing:'cubic-bezier(.23,1,.32,1)',fill:'forwards'}));
      await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
      if(token!==generation)return false;
      if(commit){committing=next;drag=null;}else{drag=null;hide();schedule();}
      return !!commit;
    },
    routeChanged(){
      if(committing===(location.hash||'#home'))requestAnimationFrame(()=>requestAnimationFrame(()=>{stop();committing=null;hide();schedule();}));
      else cancel();
    },
    cancel
  };
}
