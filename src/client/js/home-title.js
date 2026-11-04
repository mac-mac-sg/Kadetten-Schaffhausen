/* Shared approved title area: V1 and V2 use identical rendering, photos and match state. */
document.documentElement.dataset.homeTitle="modern";
/* Zwei lokale Testvarianten für den bebilderten Startbereich. */
const V2_HEADER_STYLE_KEY = 'fan-v2-header-style';
function v2ReadHeaderStyle() {
  try { return localStorage.getItem(V2_HEADER_STYLE_KEY) === 'curve' ? 'curve' : 'arena'; }
  catch { return 'arena'; }
}
function v2SetHeaderStyle(style) {
  if (!['arena', 'curve'].includes(style)) return false;
  document.documentElement.dataset.v2Header = style;
  document.querySelectorAll('[data-v2-header-style]').forEach(select => (select.value = style));
  try { localStorage.setItem(V2_HEADER_STYLE_KEY, style); } catch { /* Die Auswahl gilt auch ohne Speicher für diese Sitzung. */ }
  return true;
}
document.documentElement.dataset.v2Header = v2ReadHeaderStyle();
function v2InstallHeaderChoice() {
  const group = document.querySelector('.club-settings-dialog .theme-settings');
  if (!group) return;
  let select = group.querySelector('[data-v2-header-style]');
  if (!select) {
    const label = document.createElement('label');
    label.className = 'v2-header-setting';
    label.innerHTML = '<span>Titelbereich der Startseite</span><select data-v2-header-style><option value="arena">Bild-Fenster</option><option value="curve">Geschwungener Vereinskopf</option></select>';
    select = label.querySelector('select');
    select.addEventListener('change', () => v2SetHeaderStyle(select.value));
    group.append(label);
  }
  select.value = document.documentElement.dataset.v2Header;
}

function v2Page() {
  return (location.hash.slice(1) || 'home').split('/');
}
function v2Now() {
  return new Date();
}
function v2SwissMinutes(now = v2Now()) {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(now);
  return Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
}
function v2ShortDate(date) {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('de-CH', {timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit'});
}

/* Gemeinsamer Zugriff auf Spiele, Tabelle und Wappen beider Sportarten. */
function v2Club() {
  const today = swissToday();
  if (activeClub === 'fcsg') {
    const own = name => /St\.?\s?Gallen/i.test(String(name));
    const list = (fcsgData.games || []).slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const fixture = fcsgFixture();
    return {
      football: true,
      ownName: 'FC St.Gallen 1879',
      isOwn: own,
      games: list,
      fixture: fixture ? {game: fixture, live: fixture.live ? fixture : null} : {game: null, live: null},
      score: g => (g.live ? g.liveScore : g.score) || null,
      result: g => fcsgResult(g),
      crest: (name, logo) => fcsgBadge(name, logo),
      crestOf: (g, home) => fcsgBadge(home ? g.home : g.away, home ? g.homeLogo : g.awayLogo),
      table: (fcsgData.table || []).map(r => ({rank: r.rank, name: r.name, points: r.points})),
      matchHref: (g, finished) => '#match/' + encodeURIComponent(g.id) + '/' + (g.live ? 'ticker' : finished ? 'ticker' : 'overview'),
      liveHref: g => '#match/' + encodeURIComponent(g.id) + '/ticker',
      today
    };
  }
  const team = handballTeamName();
  const fixture = homeFixture();
  return {
    football: false,
    ownName: team,
    isOwn: name => isOwnHandballTeam(String(name)),
    games: games.slice().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))),
    fixture,
    score: g => g.score || null,
    result: g => teamResult(g, team),
    crest: name => badge(name),
    crestOf: (g, home) => badge(home ? g.home : g.away),
    table: (tables.QHL || []).map((r, i) => ({rank: i + 1, name: r[0], points: r[4]})),
    matchHref: (g, finished) => '#match/' + encodeURIComponent(g.id) + '/' + (finished ? 'stats' : 'overview'),
    liveHref: live => liveMatchHref(live),
    today
  };
}
function v2LastResult(c) {
  return c.games.filter(g => c.score(g) && !g.live && g.league !== 'Testspiel' && g.date <= c.today).at(-1) || null;
}
function v2NextGame(c) {
  return c.games.find(g => !g.score && !g.live && g.date >= c.today && g.league !== 'Testspiel') || null;
}

/* Spielzustand der Startseite. */
function v2MatchState(c) {
  const {game, live} = c.fixture;
  if (live) return {state: 'live', game};
  if (game && game.date === c.today && c.score(game)) return {state: 'post', game};
  const next = game && !c.score(game) ? game : v2NextGame(c);
  if (next) {
    const at = kickoffAt(next);
    const mins = at ? Math.round((at - v2Now()) / 60000) : null;
    if (next.date === c.today || (mins !== null && mins <= 24 * 60)) return {state: 'pre', game: next, mins};
  }
  return {state: 'everyday', game: next};
}

/* Ein einziges Match-Band: Heimteam, Zeit/Resultat, Gastteam nebeneinander. */
function v2TicketMarkup(c, info) {
  const g = info.game;
  if (!g) return '<p class="v2-ticket-empty">Noch kein nächstes Spiel veröffentlicht.</p>';
  const live = info.state === 'live', finished = info.state === 'post';
  const score = live ? c.score(c.fixture.live) : finished ? c.score(g) : null;
  const time = !c.football || g.confirmed ? g.time : null;
  const value = live || finished ? (score ? score.join(':') : '–:–') : time || 'Offen';
  const day = new Date(g.date + 'T12:00:00Z').toLocaleDateString('de-CH', {
    timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const phase = live ? [c.fixture.live.phase, c.fixture.live.clock].filter(Boolean).join(' · ') : '';
  const stale = c.football ? fcsgLiveErrors.has(g.id) || fcsgLiveErrors.has('latest') : liveRequestFailed;
  const where = c.isOwn(g.home) ? 'Heimspiel' : 'Auswärtsspiel';
  const remaining = daysUntil(g.date, v2Now());
  const label = live ? 'Jetzt live' : finished ? 'Beendet' : remaining === 0 ? 'Heute' : remaining === 1 ? 'Morgen' : remaining > 1 ? `In ${remaining} Tagen` : 'Nächstes Spiel';
  const status = live ? phase || 'Spiel läuft' : finished ? 'Endresultat' : '';
  const action = live ? 'Live verfolgen' : finished ? 'Rückblick und Statistiken öffnen' : 'Spielvorschau öffnen';
  const href = live ? c.liveHref(c.fixture.live) : c.matchHref(g, finished);
  const result = finished ? c.result(g)?.state || '' : '';
  const effect = live ? 'live' : finished ? 'result' : g.date === c.today ? 'matchday' : info.state === 'pre' ? 'soon' : 'calm';
  return `<a id="v2-match-ticket" class="v2-match-ticket${live ? ' is-live' : ''}" href="${liveEscape(href)}" data-result="${result}" data-effect="${effect}">
    <span class="v2-ticket-heading"><span class="v2-ticket-day">${liveEscape(label)}</span><span class="v2-ticket-league">${liveEscape(g.league || '')}</span></span>
    <span class="v2-ticket-matchup"><span class="v2-ticket-team">${c.crestOf(g, true)}<b>${liveEscape(g.home)}</b></span><span class="v2-ticket-time"><strong data-v2-score>${liveEscape(value)}</strong>${status ? `<span class="v2-ticket-status">${liveEscape(status)}</span>` : ''}</span><span class="v2-ticket-team">${c.crestOf(g, false)}<b>${liveEscape(g.away)}</b></span></span>
    <span class="v2-ticket-footer">${liveEscape(day)}${stale && (live || finished) ? ' · Letzter verfügbarer Stand' : ''}</span>
    <span class="live-sr-context">${where} · ${action}</span>
  </a>`;
}
/* Feste Vereinsmotive statt zufälliger Newsbilder. */
function v2HeaderPhoto() {
  return {
    kadetten: 'assets/news-34268.webp',
    fcsg: 'assets/v2-header-fcsg-evening.webp',
    otmar: 'assets/v2-header-otmar-heart.webp'
  }[activeClub] || 'assets/news-34268.webp';
}
function v2Home(football = false) {
  const c = v2Club(), info = v2MatchState(c);
  return homeNewsLayout(football ? fcsgData.stories : stories,
    `<section class="v2-ticket-section" aria-label="Aktuelles Spiel"><div class="v2-hero-media" aria-hidden="true"><img src="${v2HeaderPhoto()}" alt="" decoding="async" fetchpriority="high"></div><div class="v2-ticket-content">${v2TicketMarkup(c, info)}</div>${v2ClubCurve().replace('v2-club-curve', 'v2-hero-curve')}</section>`, football);
}
function v2SyncHome() {
  if (v2Page()[0] !== 'home') return;
  const section = document.querySelector('#app .v2-ticket-section');
  if (!section) return;
  const content = section.querySelector('.v2-ticket-content') || section;
  const c = v2Club(), info = v2MatchState(c), html = v2TicketMarkup(c, info);
  document.documentElement.dataset.v2State = info.state;
  if (content.dataset.source === html) return;
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const old = content.querySelector('#v2-match-ticket'), next = holder.querySelector('#v2-match-ticket');
  // Preserve the focused link during live updates; only replace its contents and attributes.
  if (old && next) {
    old.innerHTML = next.innerHTML;
    for (const attr of [...next.attributes]) old.setAttribute(attr.name, attr.value);
  } else content.innerHTML = html;
  content.dataset.source = html;
}

function v1StartTicket(c, info) {
  const g = info.game;
  if (!g) return '<p class="v2-ticket-empty">Noch kein nächstes Spiel veröffentlicht.</p>';
  const live = info.state === 'live', finished = info.state === 'post';
  const score = live ? c.score(c.fixture.live) : finished ? c.score(g) : null;
  const time = !c.football || g.confirmed ? g.time : null;
  const value = live || finished ? (score ? score.join(' : ') : '– : –') : time || 'Offen';
  const day = new Date(g.date + 'T12:00:00Z').toLocaleDateString('de-CH', {
    timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const remaining = daysUntil(g.date, v2Now());
  const label = live ? 'Jetzt live' : finished ? 'Heute gespielt' : remaining === 0 ? 'Heute ist Matchday' : remaining === 1 ? 'Nächstes Spiel morgen' : remaining > 1 ? `Nächstes Spiel in ${remaining} Tagen` : 'Nächstes Spiel';
  const phase = live ? [c.fixture.live.phase, c.fixture.live.clock].filter(Boolean).join(' · ') : '';
  const stale = c.football ? fcsgLiveErrors.has(g.id) || fcsgLiveErrors.has('latest') : liveRequestFailed;
  const href = live ? c.liveHref(c.fixture.live) : c.matchHref(g, finished);
  const effect = live ? 'live' : finished ? 'result' : g.date === c.today ? 'matchday' : info.state === 'pre' ? 'soon' : 'calm';
  const action = live ? 'Zum Liveticker' : finished ? 'Zum Rückblick' : 'Zur Spielvorschau';
  const wide = value.length > 7 ? ' is-wide-score' : '', open = value === 'Offen' ? ' is-open-time' : '';
  return `<a id="v2-match-ticket" class="v2-match-ticket v2-match-deck${live ? ' is-live' : ''}${wide}${open}" href="${liveEscape(href)}" data-result="${finished ? c.result(g)?.state || '' : ''}" data-effect="${effect}">
    <span class="v2-ticket-heading"><span class="v2-ticket-day">${liveEscape(label)}</span><span class="v2-ticket-league">${liveEscape(g.league || '')}</span></span>
    <span class="v2-cover-pairing live-sr-context">${liveEscape(g.home)} gegen ${liveEscape(g.away)}</span>
    <span class="v2-cover-crests v2-deck-matchup">
      <span class="v2-deck-team">${c.crestOf(g, true)}<b>${liveEscape(g.home)}</b></span>
      <span class="v2-deck-center"><strong data-v2-score>${liveEscape(value)}</strong><span class="v2-ticket-footer">${liveEscape(day)}</span>${phase ? `<span class="v2-deck-phase">${liveEscape(phase)}</span>` : ''}</span>
      <span class="v2-deck-team">${c.crestOf(g, false)}<b>${liveEscape(g.away)}</b></span>
    </span>
    ${stale && (live || finished) ? '<span class="v2-deck-stale">Letzter verfügbarer Stand</span>' : ''}
    <span class="v2-cover-action">${action}<span aria-hidden="true"> ↗</span></span>
    <span class="live-sr-context">${c.isOwn(g.home) ? 'Heimspiel' : 'Auswärtsspiel'}${finished ? ' · Endresultat' : ''}</span>
  </a>`;
}
function v1StartHome(football=false) {
  const c=v2Club(),info=v2MatchState(c);
  const top=`<section class="v1-start v2-ticket-section" aria-label="Aktuelles Spiel"><div class="v1-start-identity"><div class="v2-hero-media" aria-hidden="true"><img src="${v2HeaderPhoto()}" alt="" decoding="async" fetchpriority="high"></div><p class="v1-start-title">${liveEscape(fanClubs[activeClub].name)}</p></div><div class="v2-ticket-content">${v1StartTicket(c,info)}</div></section>`;
  return homeNewsLayout(football?fcsgData.stories:stories,top,football);
}
function v1HeaderChrome() {
  const top=document.querySelector('body > .top');if(!top)return;
  document.documentElement.dataset.v1Header='matchday';
  let brand=top.querySelector('.v1-start-masthead');
  if(!brand){brand=document.createElement('a');brand.className='v1-start-masthead';brand.href='#home';brand.setAttribute('aria-label','Matchday · Startseite');brand.innerHTML='MATCH<span>DAY</span>';top.prepend(brand);}
  const label=top.querySelector('.compact-club-trigger > span');if(label)label.textContent=fanClubs[activeClub].short.toUpperCase();
  if(typeof measureAppChrome==='function')measureAppChrome();
}


function v1HeaderInstallAction() {
  const dialog=document.querySelector('.club-settings-dialog'),install=document.getElementById('install-app');
  if(!dialog||!install)return;
  const existing=dialog.querySelector('[data-v1-install]');
  if(install.hidden){existing?.remove();return;}
  if(existing)return;
  const button=document.createElement('button');button.type='button';button.className='button';button.dataset.v1Install='';button.textContent='Matchday installieren';
  button.onclick=()=>{dialog.querySelector('[aria-label="Einstellungen schliessen"]')?.click();install.click();};
  dialog.append(button);
}
/* V1 shares the approved header across routes; V2 keeps its own chrome hooks. */
function homeTitleMedia() {
  document.querySelectorAll('.v2-hero-media img:not([data-home-title-media])').forEach(img=>{
    img.dataset.homeTitleMedia='1';
    const failed=()=>{img.parentElement?.classList.add('v2-media-missing');img.hidden=true;};
    img.addEventListener('error',failed,{once:true});
    if(img.complete&&!img.naturalWidth)failed();
  });
}
if(document.documentElement.dataset.preview!=='v2') {
  v2TicketMarkup=v1StartTicket;
  home=()=>v1StartHome();fcsgHome=()=>v1StartHome(true);
  const titleBaseRender=render;
  render=function(...args){const result=titleBaseRender(...args);v2SyncHome();homeTitleMedia();v1HeaderChrome();return result;};
  const titleBaseShowLive=showLiveMatch;
  showLiveMatch=function(...args){const result=titleBaseShowLive(...args);v2SyncHome();return result;};
  const titleBaseFcsgLive=updateFcsgLiveView;
  updateFcsgLiveView=function(...args){const result=titleBaseFcsgLive(...args);v2SyncHome();return result;};
  const titleBaseFcsgData=loadFcsgData;
  loadFcsgData=async function(...args){const result=await titleBaseFcsgData(...args);v2SyncHome();return result;};
  const headerBaseSettings=openClubSettings;
  openClubSettings=function(...args){const result=headerBaseSettings(...args);v1HeaderInstallAction();return result;};
  setInterval(()=>{if(!document.hidden)v2SyncHome();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)v2SyncHome();});
}
