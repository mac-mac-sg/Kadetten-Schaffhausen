// Einstieg der Kadetten Companion App.
import {API_ORIGIN} from './config.js';
import {createApi} from './api.js';
import {createStore} from './store.js';
import {startLive} from './live.js';
import {parseRoute, createNavigation, href} from './router.js';
import {readTheme, applyTheme} from './theme.js';
import {html} from './text.js';
import {toggleFavourite, toggleMyGame, changeTip, myGames, tips, togglePick} from './personal.js';
import {resultImage, seasonCard, shareImage} from './share-image.js';
import {seasonSummary} from './moments.js';
import {outcome, shortTeam} from './logic.js';
import {withFinished} from './match.js';
import {crestSrc, RESULT_TEXT} from './views/parts.js';
import {shareText} from './views/jetzt.js';
import {createPush, PUSH_TYPES} from './push.js';
import {createVotes} from './fan-vote.js';
import {favourite} from './personal.js';
import {buildCalendar} from './calendar.js';
import {RULES} from './rules.js';
import {nav, setLogos} from './views/parts.js';
import {renderJetzt, renderNews} from './views/jetzt.js';
import {renderSpiel} from './views/spiel.js';
import {renderSaison} from './views/saison.js';
import {renderTeam, renderSpieler} from './views/team.js';
import {renderVerein} from './views/verein.js';
import {renderIch} from './views/ich.js';
import {renderArtikel} from './views/artikel.js';
import {renderWissen} from './views/wissen.js';
import {createWissenSteuerung} from './wissen/steuerung.js';

const api = createApi({origin: API_ORIGIN});
const push = createPush({origin: API_ORIGIN});
const store = createStore({api});
const app = document.getElementById('app');
const ui = {
  comp: 'Alle',
  table: 'QHL',
  pushBusy: false,
  pushMessage: '',
  canInstall: false,
  votes: createVotes({origin: API_ORIGIN}),
  voteBusy: false,
  voteMessage: '',
  voteSelections: {},
  voteGame: '',
  calendarUrl: '',
  pushFavourite: false
};
let installPrompt = null,
  lastView = '',
  scheduled = false,
  focusChips = false;
const celebrated = new Map();
const navigation = createNavigation();
const wissenSteuerung = createWissenSteuerung({ui, render});
let navigationPending = true;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function enterRoute() {
  const previous = navigation.current;
  const known = history.state?.kadettenEntry;
  const entry = navigation.enter(location.hash || '#/', known, window.scrollY);
  if (!entry.restore) {
    navigation.setDepth((previous?.depth ?? -1) + 1);
    history.replaceState({...history.state, kadettenEntry: entry.id}, '');
  }
  ui.backTarget = navigation.backTarget();
  // Wer in einem Spielzug von Schritt zu Schritt geht, bleibt an derselben Stelle der Seite.
  const was = previous ? parseRoute(previous.hash) : null,
    now = parseRoute(location.hash);
  const inWissen = was && was.view === 'wissen' && now.view === 'wissen' && was.chapter === now.chapter;
  navigationPending = !(inWissen && was.id && was.id === now.id && was.step !== now.step);
  // Wer in Aufstellungen oder Spielzügen eine andere Formation wählt, sieht gleich das neue Feldbild (Seite beginnt bei den Wahlknöpfen).
  focusChips = navigationPending && Boolean(inWissen) && now.chapter !== 'regeln';
}
enterRoute();

const VIEWS = {
  jetzt: renderJetzt,
  news: renderNews,
  artikel: renderArtikel,
  spiel: renderSpiel,
  spielplan: renderSaison,
  tabellen: renderSaison,
  statistik: renderSaison,
  team: renderTeam,
  spieler: renderSpieler,
  verein: renderVerein,
  ich: renderIch,
  wissen: renderWissen
};

function render() {
  scheduled = false;
  const route = parseRoute(location.hash);
  setLogos(store.state.data?.clubLogos);
  // Geöffnete Aufklapper und die Fokusposition bleiben beim Neuzeichnen erhalten.
  const anchor = [...app.querySelectorAll('[data-event-id]')].find(el => el.getBoundingClientRect().top >= 0);
  const anchorId = anchor?.dataset.eventId,
    anchorTop = anchor?.getBoundingClientRect().top;
  const preserveTicker = window.scrollY > 250 && !navigationPending;
  const open = new Set([...app.querySelectorAll('details[open][id]')].map(d => d.id));
  const focusKey = document.activeElement?.closest?.('#app') ? focusSelector(document.activeElement) : null;
  wissenSteuerung.sync(route);
  const context = {route, state: store.state, now: Date.now(), load: store.load, api, ui, theme: readTheme()};
  app.innerHTML = String(html`<main id="main" tabindex="-1">${VIEWS[route.view](context)}</main>${route.area ? nav(route.area) : ''}`);
  wissenSteuerung.paint();
  for (const id of open) document.getElementById(id)?.setAttribute('open', '');
  // Siegmoment nur beim ersten Anzeigen eines Resultats.
  for (const hero of app.querySelectorAll('.hero.celebrate')) {
    const key = hero.dataset.celebrate;
    if (!celebrated.has(key)) celebrated.set(key, performance.now());
    if (performance.now() - celebrated.get(key) > 2500 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.classList.remove('celebrate');
    }
  }
  // Berechnete Breiten und Anteile per CSSOM setzen: Die CSP erlaubt keine style-Attribute.
  for (const el of app.querySelectorAll('[data-style]'))
    for (const decl of el.dataset.style.split(';')) {
      const [prop, value] = decl.split(':').map(x => x?.trim());
      if (/^(width|flex)$/.test(prop || '') && /^[0-9.]+%?$/.test(value || '')) el.style.setProperty(prop, value);
    }
  const key = route.view + ':' + (route.id || '') + ':' + (route.tab || '');
  if (key !== lastView) {
    if (lastView) document.getElementById('main')?.focus({preventScroll: true});
    lastView = key;
  } else if (focusKey) app.querySelector(focusKey)?.focus({preventScroll: true});
  if (preserveTicker && anchorId) {
    const nextAnchor = [...app.querySelectorAll('[data-event-id]')].find(el => el.dataset.eventId === anchorId);
    if (nextAnchor) window.scrollBy(0, nextAnchor.getBoundingClientRect().top - anchorTop);
  }
  const entry = navigation.current;
  if (navigationPending) {
    const chips = focusChips && !entry?.restore ? app.querySelector('nav.chips') : null;
    if (chips) chips.scrollIntoView({block: 'start', behavior: 'instant'});
    else window.scrollTo(0, entry?.restore ? entry.scroll : 0);
    navigationPending = false;
    focusChips = false;
  }
  // Wait for the asynchronously loaded games before the initial jump. Never repeat on timer renders.
  if (entry?.autoNext && store.state.data) {
    entry.autoNext = false;
    const next = app.querySelector('[data-next-game]');
    if (next) {
      next.scrollIntoView({block: 'center', behavior: 'instant'});
      next.focus({preventScroll: true});
    }
  }
  document.title = (document.querySelector('h1')?.textContent?.trim() || 'Jetzt') + ' · Kadetten';
}
function focusSelector(el) {
  for (const attr of [
    'data-wk',
    'data-ui',
    'data-push-type',
    'data-push',
    'data-theme-choice',
    'data-favourite',
    'data-my-game',
    'data-vote-select',
    'data-vote-confirm',
    'data-pick'
  ])
    if (el.hasAttribute?.(attr)) return `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
  return el.getAttribute?.('href') ? `a[href="${CSS.escape(el.getAttribute('href'))}"]` : null;
}
const schedule = () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(render);
  }
};

const favouriteShv = () => {
  const nr = favourite();
  return nr ? store.state.data?.playerSeason?.players?.[nr]?.shvPlayerId || null : null;
};

async function pushAction(action) {
  if (ui.pushBusy) return;
  const shv = favouriteShv();
  const types = [...app.querySelectorAll('[data-push-type]:checked')].map(i => i.dataset.pushType).filter(t => t !== 'favourite' || shv);
  Object.assign(ui, {pushBusy: true, pushMessage: 'Wird eingerichtet …'});
  render();
  try {
    if (action === 'enable') {
      await push.enable(types.length ? types : PUSH_TYPES.map(t => t[0]).filter(t => t !== 'favourite' || (shv && ui.pushFavourite)), shv);
      ui.pushMessage = 'Benachrichtigungen sind eingeschaltet.';
    }
    if (action === 'disable') {
      await push.disable();
      ui.pushMessage = 'Benachrichtigungen sind ausgeschaltet.';
    }
    if (action === 'test') {
      await push.test();
      ui.pushMessage = 'Test an den Push-Dienst übergeben. Bitte die Mitteilungen auf dem Gerät prüfen.';
    }
    if (action === 'update') {
      await push.update(types, shv);
      ui.pushMessage = 'Auswahl gespeichert.';
    }
  } catch (error) {
    ui.pushMessage = error.message || 'Das hat nicht geklappt. Bitte erneut versuchen.';
  }
  ui.pushBusy = false;
  render();
}

async function castVote(player) {
  const id = parseRoute(location.hash).id;
  if (!id || ui.voteBusy) return;
  Object.assign(ui, {voteGame: String(id), voteBusy: true, voteMessage: 'Stimme wird gespeichert …'});
  render();
  try {
    await ui.votes.vote(id, player);
    ui.voteMessage = 'Deine Stimme ist gezählt.';
  } catch (error) {
    ui.voteMessage = error.message;
  }
  ui.voteBusy = false;
  store.invalidate('votes:' + id);
  render();
}

// Kalender-Abo und Tor-Mitteilungen erst anbieten, wenn der Datendienst die neuen Endpunkte bereitstellt.
fetch((API_ORIGIN || '') + '/api/app/calendar.ics', {method: 'HEAD', credentials: 'omit', cache: 'no-store'})
  .then(r => {
    if (!r.ok) return;
    const url = new URL((API_ORIGIN || location.origin) + '/api/app/calendar.ics');
    ui.calendarUrl = url.protocol === 'https:' ? 'webcal://' + url.host + url.pathname : url.href;
    ui.pushFavourite = true;
    schedule();
  })
  .catch(() => {});

async function share(text) {
  const url = new URL('./', location.href).href;
  try {
    if (navigator.share) await navigator.share({title: 'Kadetten', text, url});
    else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      ui.pushMessage = '';
      announce('Resultat kopiert.');
    }
  } catch {}
}
async function shareResult(id) {
  const raw = store.state.data?.games.find(g => String(g.id) === id);
  const game = raw && withFinished(raw, store.state.live, Date.now());
  if (!game?.score) return;
  announce('Bild wird erstellt …');
  const blob = await resultImage({
    game: {...game, homeShort: shortTeam(game.home), awayShort: shortTeam(game.away)},
    label: RESULT_TEXT[outcome(game)] || '',
    crests: [crestSrc(game.home), crestSrc(game.away)]
  });
  await shareImage(blob, `kadetten-${game.date}.png`, shareText(game));
}
async function shareSeason() {
  const summary = seasonSummary({games: store.state.data?.games || [], visited: myGames(), tips: tips(), now: Date.now()});
  announce('Bild wird erstellt …');
  await shareImage(await seasonCard(summary), 'kadetten-meine-saison.png', 'Meine Kadetten-Saison');
}

function announce(text) {
  let live = document.getElementById('announce');
  if (!live) {
    live = Object.assign(document.createElement('p'), {id: 'announce', className: 'sr'});
    live.setAttribute('role', 'status');
    document.body.append(live);
  }
  live.textContent = text;
}

function openRule(id, trigger) {
  const rule = RULES[id];
  if (!rule) return;
  let dialog = document.getElementById('rule-dialog');
  if (!dialog) {
    dialog = Object.assign(document.createElement('dialog'), {id: 'rule-dialog', className: 'sheet'});
    dialog.setAttribute('aria-labelledby', 'rule-title');
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
    dialog.addEventListener('close', () => dialog._trigger?.focus());
    document.body.append(dialog);
  }
  dialog._trigger = trigger;
  dialog.innerHTML = String(
    html`<div class="sheet-body">
      <h2 class="h2" id="rule-title">${rule[0]}</h2>
      <p>${rule[1]}</p>
      <div class="acts">
      <a class="btn" href="${href.wissen('regeln', id)}" data-close>Mehr dazu</a><button type="button" class="btn pri" data-close autofocus>Schliessen</button></div>
      </div>`
  );
  dialog.showModal();
}

function downloadCalendar() {
  const {text, count} = buildCalendar(store.state.data?.games, Date.now());
  const url = URL.createObjectURL(new Blob([text], {type: 'text/calendar;charset=utf-8'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: 'kadetten-spiele.ics'});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  announce(`${count} Spiele als Kalenderdatei gespeichert.`);
}

app.addEventListener('click', event => {
  const back = event.target.closest('[data-route-back]');
  const distance = navigation.backDistance();
  if (back && distance > 0 && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    history.go(-distance);
    return;
  }
  const t = event.target.closest('button, [data-ui]');
  if (!t) return;
  if (t.dataset.rule) {
    openRule(t.dataset.rule, t);
    return;
  }
  if (t.dataset.wk) {
    wissenSteuerung.click(t.dataset.wk);
    return;
  }
  if (t.dataset.themeChoice) {
    applyTheme(t.dataset.themeChoice);
    render();
  } else if (t.dataset.ui) {
    const [k, v] = t.dataset.ui.split(':');
    ui[k] = v;
    if (k === 'comp' && navigation.current) navigation.current.autoNext = true;
    render();
  } else if (t.dataset.favourite) {
    const next = toggleFavourite(Number(t.dataset.favourite));
    announce(next ? 'Als Lieblingsspieler gemerkt.' : 'Lieblingsspieler entfernt.');
    // Ein bestehendes Push-Abo mit Tor-Mitteilungen folgt dem neuen Lieblingsspieler.
    const device = push.device();
    if (device?.active && device.types?.includes('favourite')) {
      const shv = favouriteShv();
      push.update(shv ? device.types : device.types.filter(x => x !== 'favourite'), shv).catch(() => {});
    }
    render();
  } else if (t.dataset.pick) {
    const next = togglePick(parseRoute(location.hash).id, {id: t.dataset.pick, name: t.dataset.pickName});
    announce(next ? 'Favorit gemerkt. Abstimmen kannst du nach dem Abpfiff.' : 'Favorit entfernt.');
    render();
  } else if (t.dataset.voteSelect) {
    const id = parseRoute(location.hash).id;
    ui.voteSelections[id] = t.dataset.voteSelect;
    ui.voteMessage = '';
    render();
  } else if (t.hasAttribute('data-vote-confirm')) {
    const id = parseRoute(location.hash).id;
    if (ui.voteSelections[id]) castVote(ui.voteSelections[id]);
  } else if (t.dataset.myGame) {
    toggleMyGame(t.dataset.myGame);
    render();
  } else if (t.dataset.share) share(t.dataset.share);
  else if (t.dataset.tip) {
    const [id, team, delta] = t.dataset.tip.split(':');
    changeTip(id, Number(team), Number(delta));
    render();
  } else if (t.dataset.shareImage) shareResult(t.dataset.shareImage);
  else if (t.hasAttribute('data-season-image')) shareSeason();
  else if (t.dataset.push) pushAction(t.dataset.push);
  else if (t.hasAttribute('data-calendar')) downloadCalendar();
  else if (t.hasAttribute('data-install') && installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    ui.canInstall = false;
    render();
  }
});
app.addEventListener('change', event => {
  if (event.target.matches('[data-push-type]') && push.device()?.active) pushAction('update');
});
addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  ui.canInstall = true;
  schedule();
});

addEventListener('hashchange', () => {
  wissenSteuerung.stop();
  enterRoute();
  render();
});
app.addEventListener('input', event => {
  if (event.target.matches?.('.wk-scrub')) wissenSteuerung.seek(Number(event.target.value));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) wissenSteuerung.stop();
});
store.subscribe(schedule);
render();
store.refresh().then(() => startLive({store}));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') store.refresh();
});
// Countdown und «Stand vor x s» aktuell halten, ohne Netzabfrage.
setInterval(() => {
  if (document.visibilityState !== 'hidden' && !document.activeElement?.matches?.('input, button')) schedule();
}, 15000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {});
}
