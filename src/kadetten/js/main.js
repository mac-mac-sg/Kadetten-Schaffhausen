// Einstieg der Kadetten Companion App.
import {API_ORIGIN} from './config.js';
import {createApi} from './api.js';
import {createStore} from './store.js';
import {startLive} from './live.js';
import {parseRoute} from './router.js';
import {readTheme, applyTheme} from './theme.js';
import {html} from './text.js';
import {toggleFavourite, toggleMyGame} from './personal.js';
import {createPush, PUSH_TYPES} from './push.js';
import {buildCalendar} from './calendar.js';
import {nav, setLogos} from './views/parts.js';
import {renderJetzt, renderNews} from './views/jetzt.js';
import {renderSpiel} from './views/spiel.js';
import {renderSaison} from './views/saison.js';
import {renderTeam, renderSpieler} from './views/team.js';
import {renderVerein} from './views/verein.js';
import {renderIch} from './views/ich.js';
import {renderArtikel} from './views/artikel.js';

const api = createApi({origin: API_ORIGIN});
const push = createPush({origin: API_ORIGIN});
const store = createStore({api});
const app = document.getElementById('app');
const ui = {comp: 'Alle', table: 'QHL', pushBusy: false, pushMessage: '', canInstall: false};
let installPrompt = null, lastView = '', scheduled = false;

const VIEWS = {
  jetzt: renderJetzt, news: renderNews, artikel: renderArtikel, spiel: renderSpiel,
  spielplan: renderSaison, tabellen: renderSaison, statistik: renderSaison,
  team: renderTeam, spieler: renderSpieler, verein: renderVerein, ich: renderIch
};

function render() {
  scheduled = false;
  const route = parseRoute(location.hash);
  setLogos(store.state.data?.clubLogos);
  // Geöffnete Aufklapper und die Fokusposition bleiben beim Neuzeichnen erhalten.
  const open = new Set([...app.querySelectorAll('details[open][id]')].map(d => d.id));
  const focusKey = document.activeElement?.closest?.('#app') ? focusSelector(document.activeElement) : null;
  const context = {route, state: store.state, now: Date.now(), load: store.load, api, ui, theme: readTheme()};
  app.innerHTML = String(html`<main id="main" tabindex="-1">${VIEWS[route.view](context)}</main>${route.area ? nav(route.area) : ''}`);
  for (const id of open) document.getElementById(id)?.setAttribute('open', '');
  const key = route.view + ':' + (route.id || '') + ':' + (route.tab || '');
  if (key !== lastView) {
    if (lastView) { window.scrollTo(0, 0); document.getElementById('main')?.focus({preventScroll: true}); }
    lastView = key;
  } else if (focusKey) app.querySelector(focusKey)?.focus({preventScroll: true});
  document.title = (document.querySelector('h1')?.textContent?.trim() || 'Jetzt') + ' · Kadetten';
}
function focusSelector(el) {
  for (const attr of ['data-ui', 'data-push-type', 'data-push', 'data-theme-choice', 'data-favourite', 'data-my-game']) if (el.hasAttribute?.(attr)) return `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
  return el.getAttribute?.('href') ? `a[href="${CSS.escape(el.getAttribute('href'))}"]` : null;
}
const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(render); } };

async function pushAction(action) {
  if (ui.pushBusy) return;
  const types = [...app.querySelectorAll('[data-push-type]:checked')].map(i => i.dataset.pushType);
  Object.assign(ui, {pushBusy: true, pushMessage: 'Wird eingerichtet …'}); render();
  try {
    if (action === 'enable') { await push.enable(types.length ? types : PUSH_TYPES.map(t => t[0])); ui.pushMessage = 'Benachrichtigungen sind eingeschaltet.'; }
    if (action === 'disable') { await push.disable(); ui.pushMessage = 'Benachrichtigungen sind ausgeschaltet.'; }
    if (action === 'test') { await push.test(); ui.pushMessage = 'Test an den Push-Dienst übergeben. Bitte die Mitteilungen auf dem Gerät prüfen.'; }
    if (action === 'update') { await push.update(types); ui.pushMessage = 'Auswahl gespeichert.'; }
  } catch (error) {
    ui.pushMessage = error.message || 'Das hat nicht geklappt. Bitte erneut versuchen.';
  }
  ui.pushBusy = false; render();
}

async function share(text) {
  const url = new URL('./', location.href).href;
  try {
    if (navigator.share) await navigator.share({title: 'Kadetten', text, url});
    else { await navigator.clipboard.writeText(`${text} ${url}`); ui.pushMessage = ''; announce('Resultat kopiert.'); }
  } catch {}
}
function announce(text) {
  let live = document.getElementById('announce');
  if (!live) { live = Object.assign(document.createElement('p'), {id: 'announce', className: 'sr'}); live.setAttribute('role', 'status'); document.body.append(live); }
  live.textContent = text;
}

function downloadCalendar() {
  const {text, count} = buildCalendar(store.state.data?.games, Date.now());
  const url = URL.createObjectURL(new Blob([text], {type: 'text/calendar;charset=utf-8'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: 'kadetten-spiele.ics'});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  announce(`${count} Spiele als Kalenderdatei gespeichert.`);
}

app.addEventListener('click', event => {
  const t = event.target.closest('button, [data-ui]');
  if (!t) return;
  if (t.dataset.themeChoice) { applyTheme(t.dataset.themeChoice); render(); }
  else if (t.dataset.ui) { const [k, v] = t.dataset.ui.split(':'); ui[k] = v; render(); }
  else if (t.dataset.favourite) { const next = toggleFavourite(Number(t.dataset.favourite)); announce(next ? 'Als Lieblingsspieler gemerkt.' : 'Lieblingsspieler entfernt.'); render(); }
  else if (t.dataset.myGame) { toggleMyGame(t.dataset.myGame); render(); }
  else if (t.dataset.share) share(t.dataset.share);
  else if (t.dataset.push) pushAction(t.dataset.push);
  else if (t.hasAttribute('data-calendar')) downloadCalendar();
  else if (t.hasAttribute('data-install') && installPrompt) { installPrompt.prompt(); installPrompt = null; ui.canInstall = false; render(); }
});
app.addEventListener('change', event => {
  if (event.target.matches('[data-push-type]') && push.device()?.active) pushAction('update');
});
addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; ui.canInstall = true; schedule(); });

addEventListener('hashchange', render);
store.subscribe(schedule);
render();
store.refresh().then(() => startLive({store}));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') store.refresh(); });
// Countdown und «Stand vor x s» aktuell halten, ohne Netzabfrage.
setInterval(() => { if (document.visibilityState !== 'hidden' && !document.activeElement?.matches?.('input, button')) schedule(); }, 15000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {});
}
