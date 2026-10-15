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
  if(index<0||duration<0||duration>800||Math.abs(dx)<distance||Math.abs(dy)>48||Math.abs(dx)<Math.abs(dy)*1.8)return null;
  return mainTabSwipeRoutes[Math.max(0,Math.min(mainTabSwipeRoutes.length-1,index+(dx<0?1:-1)))];
}
function setupMainTabSwipe() {
  const root=document.documentElement,app=document.getElementById('app');
  if(root.dataset.design==='v2'||!app)return;
  let gesture=null,pending=null;
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
    if(root.dataset.design==='v2'||event.touches.length!==1||blocked()||!mainTabSwipeRoutes.includes(location.hash||'#home')||ownsGesture(event.target))return;
    const t=event.touches[0];
    if(t.clientX<24||t.clientX>window.innerWidth-24)return;
    gesture={id:t.identifier,x:t.clientX,y:t.clientY,at:Date.now(),url:location.href,target:event.target};
  },{passive:true});
  app.addEventListener('touchmove',event=>{
    if(!gesture)return;
    const t=event.touches[0];
    if(event.touches.length!==1||t.identifier!==gesture.id||blocked()){gesture=null;return;}
    const dx=Math.abs(t.clientX-gesture.x),dy=Math.abs(t.clientY-gesture.y);
    if(dy>12&&dy>dx/1.3)gesture=null;
  },{passive:true});
  app.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
  app.addEventListener('touchend',event=>{
    const start=gesture;gesture=null;
    if(!start||event.touches.length||location.href!==start.url||!start.target.isConnected||blocked())return;
    const t=Array.from(event.changedTouches).find(t=>t.identifier===start.id);if(!t)return;
    const route=location.hash||'#home',next=mainTabSwipeTarget(route,t.clientX-start.x,t.clientY-start.y,Date.now()-start.at,window.innerWidth);
    if(!next)return;
    if(event.cancelable)event.preventDefault();
    if(next===route)return;
    if(next==='#season/games'){mode='list';competition='Alle';}
    pending=next;location.hash=next;
  },{passive:false});
  window.addEventListener('hashchange',()=>{
    const target=pending;pending=null;
    if(!target||location.hash!==target||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    // Opacity keeps pinned controls in place; transforming #app would move its fixed children.
    app.animate?.([{opacity:.9},{opacity:1}],{duration:140,easing:'cubic-bezier(.23,1,.32,1)'});
  });
}
