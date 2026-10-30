/* V2-Designentwurf «Matchday»: nur in der Testversion unter /v2/ eingebunden (scripts/build.mjs).
   Die Startseite richtet sich nach dem Spielzustand (Alltag, Vorfreude, Live, nach dem Spiel),
   eine Live-Leiste begleitet laufende Spiele, Übergänge und Ladezustände machen die App ruhiger.
   Alles hier setzt auf die bestehenden Renderer auf und ändert keine Daten. */
const V2_NEWS_LIMIT = 6;
const v2State = {newsExpanded: false, lastScore: '', ticker: 0};

/* Magazine edition. Data, routes and live confirmation still come from the shared app. */
function v2CoverTitle(info) {
  if (info.state === 'live') return ['MITTEN', 'IM SPIEL.'];
  if (info.state === 'post') return ['NACH DEM', 'SPIEL.'];
  return Number(info.game?.time?.split(':')[0]) >= 17 ? ['UNSER', 'ABEND.'] : ['UNSER', 'SPIEL.'];
}
function v2MagazineTicket(c, info) {
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
  return `<a id="v2-match-ticket" class="v2-match-ticket${live ? ' is-live' : ''}" href="${liveEscape(href)}" data-result="${finished ? c.result(g)?.state || '' : ''}" data-effect="${effect}">
    <span class="v2-ticket-heading"><span class="v2-ticket-day">${liveEscape(label)}</span><span class="v2-ticket-league">${liveEscape(g.league || '')}</span></span>
    <span class="v2-cover-pairing">${liveEscape(g.home)}<span aria-hidden="true"> — </span><span class="live-sr-context"> gegen </span>${liveEscape(g.away)}</span>
    <span class="v2-cover-fixture"><span class="v2-cover-crests" aria-hidden="true">${c.crestOf(g, true)}${c.crestOf(g, false)}</span><strong data-v2-score>${liveEscape(value)}</strong><span class="v2-cover-action">${live ? 'Zum Liveticker' : finished ? 'Zum Rückblick' : 'Zur Vorschau'}<span aria-hidden="true"> ↗</span></span></span>
    <span class="v2-ticket-footer">${liveEscape(day)}${phase ? ' · ' + liveEscape(phase) : ''}${stale && (live || finished) ? ' · Letzter verfügbarer Stand' : ''}</span>
    <span class="live-sr-context">${c.isOwn(g.home) ? 'Heimspiel' : 'Auswärtsspiel'}${finished ? ' · Endresultat' : ''}</span>
  </a>`;
}
function v2MagazineHome(football = false) {
  const c = v2Club(), info = v2MatchState(c), title = v2CoverTitle(info);
  const news = football ? fcsgData.stories : stories;
  return `<section class="home-news v2-magazine" aria-labelledby="v2-cover-title"><div class="story-feed">
    <div class="home-front-page"><section class="v2-ticket-section v2-magazine-cover" aria-label="Aktuelles Spiel">
      <div class="v2-hero-media" aria-hidden="true"><img src="${v2HeaderPhoto()}" alt="" decoding="async" fetchpriority="high"></div>
      <div class="v2-cover-editorial"><p class="v2-cover-kicker">${liveEscape(fanClubs[activeClub].name)} · ${c.football ? 'Fussball' : 'Handball'}</p><h1 id="v2-cover-title">${title.map(line => `<span>${line}</span>`).join('')}</h1></div>
      <div class="v2-ticket-content">${v2MagazineTicket(c, info)}</div>
      ${news[0] ? homeNewsCard(news[0], 0, football) : ''}
    </section></div>
    <header class="v2-magazine-heading"><p class="v2-editorial-kicker">Aus dem Verein</p><h2>NAH DRAN.</h2><span>News & Geschichten</span></header>
    <div class="v1-news-grid">${news.slice(1).map((n, i) => homeNewsCard(n, i + 1, football)).join('') || '<p class="notice">Weitere News folgen, sobald sie veröffentlicht sind.</p>'}</div>
    <a class="v2-magazine-club" href="#club"><img src="${v2ClubIdentity().photo}" alt="" loading="lazy" decoding="async"><span><small>Mehr als ein Spiel.</small><strong>UNSER VEREIN.</strong><span>Geschichte & Erfolge ↗</span></span></a>
  </div></section>${football ? fcsgFooter() : footer()}`;
}
// Reuse the shared live updater, including its focused-link preservation.
v2TicketMarkup = v2MagazineTicket;
v2Home = v2MagazineHome;

function v2MagazineChrome() {
  document.querySelectorAll('#app aside.notice').forEach(note => note.setAttribute('role', 'note'));
  const top = document.querySelector('body > .top');
  if (top && !top.querySelector('.v2-masthead')) {
    const brand = document.createElement('a');
    brand.className = 'v2-masthead'; brand.href = '#home';
    brand.setAttribute('aria-label', 'Matchday · Magazin');
    brand.innerHTML = 'MATCH<span>DAY</span>';
    top.prepend(brand);
  }
  for (const [key, label] of [['news', 'Magazin'], ['squad', 'Team']]) {
    const link = document.querySelector(`[data-nav="${key}"]`);
    if (link) for (const node of link.childNodes) if (node.nodeType === 3 && node.textContent.trim()) node.textContent = label;
  }
  const [page, id] = v2Page();
  if (page === 'home') {
    const title = document.querySelector('#v2-cover-title');
    const lines = v2CoverTitle(v2MatchState(v2Club()));
    if (title && title.textContent !== lines.join('')) title.innerHTML = lines.map(line => `<span>${line}</span>`).join('');
  }
  if (page === 'season' && id === 'squad') {
    const section = document.querySelector('#app .season');
    if (section && !section.querySelector('.v2-team-cover')) {
      const title = section.querySelector('h1');
      const cover = document.createElement('div'); cover.className = 'v2-team-cover';
      const photo = activeClub === 'kadetten' ? 'assets/team.webp' : v2HeaderPhoto();
      cover.innerHTML = `<img src="${photo}" alt="" decoding="async" fetchpriority="high"><div><p>${liveEscape(fanClubs[activeClub].name)}</p></div>`;
      if (title) { title.className = 'v2-team-title'; title.textContent = 'DAS TEAM.'; cover.lastElementChild.append(title); }
      section.prepend(cover);
      const entry = section.querySelector('.v2-club-entry');
      if (entry) section.append(entry);
    }
  }
  if (page === 'match') {
    const header = document.querySelector('#app .match-top, #app .fcsg-match-header');
    if (header && !header.querySelector('.v2-matchcenter-title')) {
      const label = document.createElement('p'); label.className = 'v2-matchcenter-title'; label.textContent = 'MATCHCENTER'; header.prepend(label);
    }
  }
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
  v2MagazineChrome();
  v2SyncHome();
  v2LimitNews();
  v2SyncLiveBar();
  v2AddShareButton();
  v2DecorateMedia();
  v2WatchScore();
}
function v2Tick() {
  v2SyncHome();
  v2MagazineChrome();
  v2SyncLiveBar();
  v2WatchScore();
  v2DecorateMedia();
}

const v2BaseOpenClubSettings = openClubSettings;
openClubSettings = function (...args) {
  const result = v2BaseOpenClubSettings(...args);
  return result;
};

// V2 builds on the shared routes; its magazine renderers and chrome never load in V1.
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
