/* V2-Designentwurf «Matchday»: nur in der Testversion unter /v2/ eingebunden (scripts/build.mjs).
   Die Startseite richtet sich nach dem Spielzustand (Alltag, Vorfreude, Live, nach dem Spiel),
   eine Live-Leiste begleitet laufende Spiele, Übergänge und Ladezustände machen die App ruhiger.
   Alles hier setzt auf die bestehenden Renderer auf und ändert keine Daten. */
const V2_NEWS_LIMIT = 6;
const v2State = {newsExpanded: false, lastScore: '', ticker: 0};

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
    label.innerHTML = '<span>Titelbereich der Startseite</span><select data-v2-header-style><option value="arena">Arena-Fenster</option><option value="curve">Geschwungener Vereinskopf</option></select>';
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
  const status = live ? phase || 'Spiel läuft' : finished ? 'Endresultat' : '';
  const action = live ? 'Live verfolgen' : finished ? 'Rückblick und Statistiken öffnen' : 'Spielvorschau öffnen';
  const href = live ? c.liveHref(c.fixture.live) : c.matchHref(g, finished);
  const result = finished ? c.result(g)?.state || '' : '';
  return `<a id="v2-match-ticket" class="v2-match-ticket${live ? ' is-live' : ''}" href="${liveEscape(href)}" data-result="${result}">
    <span class="v2-ticket-heading"><span class="v2-ticket-day">${live ? 'Jetzt live · ' : ''}${liveEscape(day)}</span><span class="v2-ticket-league">${liveEscape(g.league || '')}</span></span>
    <span class="v2-ticket-matchup"><span class="v2-ticket-team">${c.crestOf(g, true)}<b>${liveEscape(g.home)}</b></span><span class="v2-ticket-time"><strong data-v2-score>${liveEscape(value)}</strong>${status ? `<span class="v2-ticket-status">${liveEscape(status)}</span>` : ''}</span><span class="v2-ticket-team">${c.crestOf(g, false)}<b>${liveEscape(g.away)}</b></span></span>
    <span class="v2-ticket-footer">${where}${stale && (live || finished) ? ' · Letzter verfügbarer Stand' : ''}</span>
    <span class="live-sr-context">${action}</span>
  </a>`;
}
function v2Home(football = false) {
  const c = v2Club(), info = v2MatchState(c);
  return homeNewsLayout(football ? fcsgData.stories : stories,
    `<section class="v2-ticket-section" aria-label="Aktuelles Spiel"><div class="v2-hero-media" aria-hidden="true"><img src="${v2ClubIdentity().photo}" alt="" decoding="async" fetchpriority="high"></div><div class="v2-ticket-content">${v2TicketMarkup(c, info)}</div>${v2ClubCurve().replace('v2-club-curve', 'v2-hero-curve')}</section>`, football);
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
function v2LimitNews() {
  const feed = document.querySelector('#app .story-feed');
  if (!feed) return;
  // Include date and title in the accessible link name, in their visible order.
  feed.querySelectorAll('.v1-news-link').forEach(link => link.removeAttribute('aria-labelledby'));
  if (v2State.newsExpanded) return;
  const cards = [...feed.querySelectorAll('.v1-news-card')];
  if (cards.length <= V2_NEWS_LIMIT) return;
  cards.slice(V2_NEWS_LIMIT).forEach(card => (card.hidden = true));
  if (feed.querySelector('.v2-more-news')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v2-more-news';
  button.textContent = `Alle ${cards.length} News anzeigen`;
  button.addEventListener('click', () => {
    v2State.newsExpanded = true;
    cards.forEach(card => (card.hidden = false));
    button.remove();
  });
  cards[V2_NEWS_LIMIT - 1].after(button);
}

/* Schmale Live-Leiste über der Navigation, solange ein Spiel des aktiven Vereins läuft. */
function v2SyncLiveBar() {
  let bar = document.getElementById('v2-livebar');
  if (!bar) {
    bar = document.createElement('a');
    bar.id = 'v2-livebar';
    bar.className = 'v2-livebar';
    bar.hidden = true;
    bar.setAttribute('aria-live', 'polite');
    document.body.append(bar);
  }
  const c = v2Club(), live = c.fixture.live, [page, id] = v2Page();
  const href = live ? c.liveHref(live) : '';
  const onMatch = page === 'match' && live && (href.includes('/' + encodeURIComponent(id) + '/') || id === 'live');
  if (!live || page === 'home' || onMatch) { bar.hidden = true; document.documentElement.classList.remove('v2-has-livebar'); return; }
  const score = (c.score(live) || []).join(' : ') || '– : –';
  const detail = [live.phase, live.clock].filter(Boolean).map(v => liveEscape(String(v))).join(' · ');
  const html = `<span class="v2-live-dot" aria-hidden="true"></span><span class="v2-livebar-crest">${c.crestOf(live, true)}</span><b class="v2-num" data-v2-score>${liveEscape(score)}</b><span class="v2-livebar-crest">${c.crestOf(live, false)}</span><small>${detail || 'Live'}</small>`;
  if (bar.dataset.source !== html) { bar.innerHTML = html; bar.dataset.source = html; }
  bar.href = href;
  bar.setAttribute('aria-label', `Live: ${live.home} gegen ${live.away}, ${score}`);
  bar.hidden = false;
  document.documentElement.classList.add('v2-has-livebar');
}

/* Tor: Zahl springt kurz auf, auf Android kurze Vibration. */
function v2WatchScore() {
  const node = document.querySelector('#v2-match-ticket.is-live [data-v2-score], #live-match.is-live .live-score strong, #app .fcsg-matchday.is-live .live-score strong, #v2-livebar:not([hidden]) [data-v2-score]');
  const value = node?.textContent.trim() || '';
  if (value && v2State.lastScore && value !== v2State.lastScore && /\d/.test(value)) {
    document.querySelectorAll('#v2-match-ticket [data-v2-score], #live-match .live-score strong, .fcsg-matchday .live-score strong, #v2-livebar [data-v2-score]').forEach(el => {
      el.classList.remove('v2-score-bump');
      void el.offsetWidth;
      el.classList.add('v2-score-bump');
    });
    if (!document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.([40, 60, 40]);
  }
  v2State.lastScore = value;
}

/* Fehlende Wappen und Bilder: ruhige Platzhalter statt grauer Kästen. */
function v2DecorateMedia(root = document) {
  root.querySelectorAll('#app img:not([data-v2-media]), .top img:not([data-v2-media]), #v2-livebar img:not([data-v2-media])').forEach(img => {
    img.dataset.v2Media = '1';
    const frame = img.parentElement;
    if (!img.complete) {
      frame?.classList.add('v2-loading');
      img.addEventListener('load', () => frame?.classList.remove('v2-loading'), {once: true});
    }
    // Das Bild bleibt im Dokument (nur ausgeblendet), weil bestehende Fehlerbehandler noch darauf zugreifen.
    img.addEventListener('error', () => {
      frame?.classList.remove('v2-loading');
      if (!img.isConnected) return;
      if (img.matches('.crest')) {
        const mark = document.createElement('span');
        mark.className = 'clubmark v2-crest-fallback';
        mark.setAttribute('role', 'img');
        mark.setAttribute('aria-label', img.alt || 'Wappen');
        mark.textContent = (img.alt || '').replace(/\b(FC|SC|BSC|HC|TSV)\b/g, '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        img.after(mark);
      } else {
        frame?.classList.add('v2-media-missing');
      }
      img.hidden = true;
    }, {once: true});
  });
}

/* Resultat als Bild teilen (Canvas, kein Fremdcode). */
function v2LoadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function v2ShareResult(gameId) {
  const c = v2Club(), g = c.games.find(x => String(x.id) === String(gameId)) || c.fixture.game;
  const score = g && c.score(g);
  if (!score) return;
  const r = c.result(g);
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#ff790e';
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#15191a'); bg.addColorStop(1, '#262320');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  const glow = ctx.createRadialGradient(540, 520, 40, 540, 520, 620);
  glow.addColorStop(0, accent + '66'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = accent; ctx.fillRect(90, 120, 90, 10);
  ctx.fillStyle = '#f5f5ef'; ctx.textAlign = 'left';
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText((g.league || '').toUpperCase() + ' · ' + v2ShortDate(g.date), 90, 200);
  const crestSrc = home => {
    const holder = document.createElement('div');
    holder.innerHTML = c.crestOf(g, home);
    return holder.querySelector('img')?.getAttribute('src') || '';
  };
  const [homeImg, awayImg] = await Promise.all([v2LoadImage(crestSrc(true)), v2LoadImage(crestSrc(false))]);
  const drawCrest = (img, name, x) => {
    if (img) {
      const s = Math.min(220 / img.width, 260 / img.height);
      ctx.drawImage(img, x - img.width * s / 2, 330 + (260 - img.height * s) / 2, img.width * s, img.height * s);
    } else {
      ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.arc(x, 460, 110, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5f5ef'; ctx.textAlign = 'center'; ctx.font = '700 72px system-ui, sans-serif';
      ctx.fillText(name.split(/\s+/).map(w => w[0]).slice(0, 2).join(''), x, 486);
    }
    ctx.fillStyle = '#f5f5ef'; ctx.textAlign = 'center'; ctx.font = '600 38px system-ui, sans-serif';
    const words = name.split(' '), lines = [];
    for (const w of words) { if (lines.length && (lines.at(-1) + ' ' + w).length <= 16) lines[lines.length - 1] += ' ' + w; else lines.push(w); }
    lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, x, 660 + i * 46));
  };
  drawCrest(homeImg, g.home, 270);
  drawCrest(awayImg, g.away, 810);
  await document.fonts.load('200px Anton').catch(() => {});
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
  ctx.font = '400 240px Anton, Impact, sans-serif';
  ctx.fillText(score.join(':'), 540, 1010);
  if (r) {
    const color = {win: css.getPropertyValue('--win').trim() || '#a2cf75', loss: css.getPropertyValue('--loss').trim() || '#f07d6c', draw: '#9ec5f0'}[r.state];
    ctx.fillStyle = color; ctx.font = '700 46px system-ui, sans-serif';
    ctx.fillText(r.label.toUpperCase(), 540, 1100);
  }
  ctx.fillStyle = '#ffffff99'; ctx.font = '500 34px system-ui, sans-serif';
  ctx.fillText('Matchday · ' + fanClubs[activeClub].name, 540, 1250);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) return;
  const file = new File([blob], `resultat-${g.date}.jpg`, {type: 'image/jpeg'});
  const text = `${g.home} – ${g.away} ${score.join(':')}`;
  try {
    if (navigator.canShare?.({files: [file]})) { await navigator.share({files: [file], text}); return; }
  } catch (error) { if (error?.name === 'AbortError') return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  document.body.append(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 2000);
}
function v2AddShareButton() {
  const [page, id] = v2Page();
  if (page !== 'match') return;
  const top = document.querySelector('#app .match-top, #app .fcsg-match-header');
  if (!top || top.querySelector('.v2-share')) return;
  const c = v2Club(), g = c.games.find(x => String(x.id) === String(id));
  if (!g || g.live || !c.score(g)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v2-share v2-share-inline';
  button.dataset.v2Share = String(g.id);
  button.textContent = 'Resultat teilen';
  top.append(button);
}
document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-v2-share]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  v2ShareResult(button.dataset.v2Share).finally(() => (button.disabled = false));
});

/* Fliessender Übergang von der Spielkarte zur Spielseite (View Transitions, wo verfügbar). */
document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href^="#match/"]');
  if (!link || !document.startViewTransition || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!link.closest('.v2-match-ticket, .home-matchday, .game-card, .v2-tile, .v2-livebar, .week-game, .club-match-hint')) return;
  const target = link.getAttribute('href');
  if (target === location.hash) return;
  event.preventDefault();
  const card = link.closest('.v2-match-ticket, .home-matchday, .game-card, .v2-tile, .v2-livebar, .week-game') || link;
  card.style.viewTransitionName = 'v2-match';
  const transition = document.startViewTransition(() => new Promise(resolve => {
    card.style.viewTransitionName = '';
    window.addEventListener('hashchange', () => requestAnimationFrame(() => {
      const header = document.querySelector('#app .match-top, #app .fcsg-match-header, #app .match');
      if (header) header.style.viewTransitionName = 'v2-match';
      resolve();
    }), {once: true});
    location.hash = target;
  }));
  transition.finished.finally(() => document.querySelectorAll('[style*="view-transition-name"]').forEach(el => (el.style.viewTransitionName = '')));
}, true);

/* Kompakte Kopfzeile beim Scrollen und Merkmale für die Gestaltung. */
function v2SyncChrome() {
  const [page, id] = v2Page();
  const root = document.documentElement;
  root.dataset.v2Page = page === 'season' ? id || 'games' : page;
  root.classList.toggle('v2-scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', () => document.documentElement.classList.toggle('v2-scrolled', window.scrollY > 24), {passive: true});
document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('v2-paused', document.hidden));

function v2AfterRender() {
  v2SyncChrome();
  v2SyncHome();
  v2LimitNews();
  v2SyncLiveBar();
  v2AddShareButton();
  v2DecorateMedia();
  v2WatchScore();
}
function v2Tick() {
  v2SyncHome();
  v2SyncLiveBar();
  v2WatchScore();
  v2DecorateMedia();
}

const v2BaseOpenClubSettings = openClubSettings;
openClubSettings = function (...args) {
  const result = v2BaseOpenClubSettings(...args);
  v2InstallHeaderChoice();
  return result;
};

// V2 ersetzt ausschliesslich die Startseite; Detailansichten und V1 bleiben erhalten.
home = () => v2Home();
fcsgHome = () => v2Home(true);
const v2BaseLoadFcsgData = loadFcsgData;
loadFcsgData = async function () {
  await v2BaseLoadFcsgData();
  if (activeClub === 'fcsg') v2Tick();
};
const v2BaseUpdateFcsgLiveView = updateFcsgLiveView;
updateFcsgLiveView = function () {
  v2BaseUpdateFcsgLiveView();
  if (activeClub === 'fcsg') v2Tick();
};
const v2BaseRender = render;
render = function () {
  v2BaseRender();
  v2AfterRender();
};
const v2BaseShowLiveMatch = showLiveMatch;
showLiveMatch = function () {
  v2BaseShowLiveMatch();
  if (document.getElementById('app')?.childElementCount) v2Tick();
};
v2State.ticker = setInterval(() => { if (!document.hidden) v2Tick(); }, 30000);
