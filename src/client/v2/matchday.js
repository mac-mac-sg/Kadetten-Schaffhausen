/* V2-Designentwurf «Matchday»: nur in der Testversion unter /v2/ eingebunden (scripts/build.mjs).
   Die Startseite richtet sich nach dem Spielzustand (Alltag, Vorfreude, Live, nach dem Spiel),
   eine Live-Leiste begleitet laufende Spiele, Übergänge und Ladezustände machen die App ruhiger.
   Alles hier setzt auf die bestehenden Renderer auf und ändert keine Daten. */
const V2_NEWS_LIMIT = 6;
const v2State = {newsExpanded: false, lastScore: '', ticker: 0};

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
