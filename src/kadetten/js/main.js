// Einstieg der Kadetten Companion App.
import {API_ORIGIN} from './config.js';
import {createApi} from './api.js';
import {createStore} from './store.js';
import {startLive} from './live.js';
import {parseRoute} from './router.js';
import {readTheme, applyTheme} from './theme.js';
import {html} from './text.js';
import {nav} from './views/parts.js';
import {renderJetzt} from './views/jetzt.js';
import {renderSaison, renderTeam, renderSpieler, renderVerein, renderSpiel, renderIch} from './views/pages.js';

const api = createApi({origin: API_ORIGIN});
const store = createStore({api});
const app = document.getElementById('app');
let lastView = '';

const VIEWS = {
  jetzt: () => renderJetzt({state: store.state, now: Date.now()}),
  spielplan: renderSaison, tabellen: renderSaison, statistik: renderSaison,
  team: renderTeam, spieler: renderSpieler, verein: renderVerein, spiel: renderSpiel,
  ich: () => renderIch({theme: readTheme()})
};

function render() {
  const route = parseRoute(location.hash);
  const content = VIEWS[route.view](route);
  app.innerHTML = String(html`<main id="main" tabindex="-1">${content}</main>${route.area ? nav(route.area) : ''}`);
  const key = route.view + ':' + (route.id || '');
  if (key !== lastView) {
    if (lastView) { window.scrollTo(0, 0); document.getElementById('main')?.focus({preventScroll: true}); }
    lastView = key;
  }
  document.title = (document.querySelector('h1')?.textContent?.trim() || 'Jetzt') + ' · Kadetten';
}

app.addEventListener('click', event => {
  const choice = event.target.closest('[data-theme-choice]');
  if (choice) { applyTheme(choice.dataset.themeChoice); render(); }
});

addEventListener('hashchange', render);
store.subscribe(render);
render();
store.refresh().then(() => startLive({store}));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') store.refresh(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {});
}
