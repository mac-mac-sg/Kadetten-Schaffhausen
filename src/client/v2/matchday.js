/* V2-Designentwurf «Matchday»: nur in der Testversion unter /v2/ eingebunden (scripts/build.mjs).
   Die Startseite richtet sich nach dem Spielzustand (Alltag, Vorfreude, Live, nach dem Spiel),
   eine Live-Leiste begleitet laufende Spiele, Übergänge und Ladezustände machen die App ruhiger.
   Alles hier setzt auf die bestehenden Renderer auf und ändert keine Daten. */
const V2_NEWS_LIMIT = 6;
const v2State = {newsExpanded: false, lastScore: '', ticker: 0};

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

function v2Tile(href, label, body, note, extra = '') {
  return `<a class="v2-tile ${extra}" href="${href}"><span class="v2-tile-label">${label}</span>${body}<small>${note}</small></a>`;
}
function v2LastTile(c, last) {
  const r = c.result(last), score = c.score(last);
  return v2Tile(c.matchHref(last, true), 'Zuletzt', `<div class="v2-mini-score">${c.crestOf(last, true)}<b class="v2-num">${score.join(':')}</b>${c.crestOf(last, false)}</div>`, `${r ? r.label + ' · ' : ''}${liveEscape(last.league || '')} · ${v2ShortDate(last.date)}`, 'v2-result-' + (r?.state || 'none'));
}
function v2TableTile(c) {
  const rows = c.table, own = rows.find(row => c.isOwn(row.name));
  if (!own) return '';
  const above = rows.find(row => row.rank === own.rank - 1), leader = rows[0];
  const shortName = name => liveEscape(String(name).replace(/^(FC|HC|BSC|TSV|HSC|RTV|BSV|SC) /, '').split(/[ -]/)[0]);
  const gap = own.rank === 1
    ? (rows[1] ? `${own.points - rows[1].points} Punkte Vorsprung` : 'Leader')
    : (above?.points ?? leader.points) === own.points
      ? `punktgleich mit ${shortName(above?.name || leader.name)}`
      : `${(above?.points ?? leader.points) - own.points} hinter ${shortName(above?.name || leader.name)}`;
  return v2Tile('#season/table', 'Tabelle', `<b class="v2-num v2-rank">${own.rank}.</b>`, `${own.points} Punkte · ${gap}`);
}
function v2CountdownTile(g, mins) {
  const count = mins > 0 ? `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}` : 'Anpfiff';
  const where = g.venue ? ' · ' + liveEscape(g.venue.split(',')[0]) : '';
  return `<div class="v2-countdown"><span class="v2-tile-label">Vorfreude</span><b class="v2-num" data-v2-countdown>${count}</b><small>${mins > 0 ? 'Stunden bis Anpfiff' : 'Resultat folgt'}${where}</small></div>`;
}
function v2ShareTile(g, r) {
  return `<button type="button" class="v2-tile v2-share-tile v2-result-${r?.state || 'none'}" data-v2-share="${liveEscape(String(g.id))}"><span class="v2-tile-label">Nach dem Spiel</span><b class="v2-tile-title">Resultat teilen</b><small>Als Bild für Chat und Story</small></button>`;
}
/* Kacheln ergänzen die Spieltag-Karte, ohne ihre Aktion zu wiederholen. */
function v2GlanceMarkup(c, info) {
  const last = v2LastResult(c), table = v2TableTile(c), tiles = [];
  if (info.state === 'live') return '';
  if (info.state === 'post') {
    tiles.push(v2ShareTile(info.game, c.result(info.game)), table);
  } else if (info.state === 'pre' && info.game.date !== c.today && info.mins !== null) {
    tiles.push(v2CountdownTile(info.game, info.mins), last ? v2LastTile(c, last) : table);
  } else {
    tiles.push(last ? v2LastTile(c, last) : '', table);
  }
  const html = tiles.filter(Boolean).join('');
  return html ? `<section class="v2-glance v2-glance-${info.state}" aria-label="Auf einen Blick">${html}</section>` : '';
}
function v2SyncHome() {
  const [page] = v2Page();
  const zone = document.querySelector('#app .home-title-zone');
  if (page !== 'home' || !zone) return;
  const c = v2Club(), info = v2MatchState(c);
  document.documentElement.dataset.v2State = info.state;
  const html = v2GlanceMarkup(c, info);
  let glance = zone.querySelector(':scope > .v2-glance');
  if (glance?.dataset.source === html) return;
  if (!html) { glance?.remove(); return; }
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const next = holder.firstElementChild;
  next.dataset.source = html;
  if (glance) glance.replaceWith(next);
  else zone.querySelector('.home-news-heading')?.before(next);
}
function v2LimitNews() {
  const feed = document.querySelector('#app .story-feed');
  if (!feed || v2State.newsExpanded) return;
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
  const node = document.querySelector('#live-match.is-live .live-score strong, #app .fcsg-matchday.is-live .live-score strong, #v2-livebar:not([hidden]) [data-v2-score]');
  const value = node?.textContent.trim() || '';
  if (value && v2State.lastScore && value !== v2State.lastScore && /\d/.test(value)) {
    document.querySelectorAll('#live-match .live-score strong, .fcsg-matchday .live-score strong, #v2-livebar [data-v2-score]').forEach(el => {
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
  if (!link.closest('.home-matchday, .game-card, .v2-tile, .v2-livebar, .week-game, .club-match-hint')) return;
  const target = link.getAttribute('href');
  if (target === location.hash) return;
  event.preventDefault();
  const card = link.closest('.home-matchday, .game-card, .v2-tile, .v2-livebar, .week-game') || link;
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

// Die bestehenden Renderer bleiben unverändert; V2 ergänzt nach jedem Zeichnen.
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
