// Einstieg der Kadetten Companion App: setzt die Teile zusammen. Zeichnen, Navigation und Klick-Verteiler liegen in
// shell.js, die Bedienung einzelner Bereiche in controllers/*, die Ansichten in views/*.
import {API_ORIGIN} from './config.js';
import {createApi} from './api.js';
import {createStore} from './store.js';
import {startLive} from './live.js';
import {createPush} from './push.js';
import {createVotes} from './fan-vote.js';
import {announce} from './announce.js';
import {involves} from './logic.js';
import {noteLive} from './sammeln.js';
import {createShell} from './shell.js';
import {createGestures} from './controllers/gestures.js';
import {createWissen} from './controllers/wissen.js';
import {createPersonal} from './controllers/personal.js';
import {createVotesController} from './controllers/votes.js';
import {createStory} from './controllers/story.js';
import {createCards} from './controllers/cards.js';
import {createSharing} from './controllers/sharing.js';
import {createPushController} from './controllers/push.js';
import {renderJetzt, renderNews} from './views/jetzt.js';
import {renderSpiel} from './views/spiel.js';
import {renderSaison} from './views/saison.js';
import {renderTeam, renderSpieler, renderVergleich} from './views/team.js';
import {renderVerein} from './views/verein.js';
import {renderIch} from './views/ich.js';
import {renderArtikel} from './views/artikel.js';
import {renderQuiz} from './views/quiz.js';
import {renderStart} from './views/start.js';
import {renderRueckblick} from './views/rueckblick.js';
import {renderMein, renderSammlung, renderKarte, renderNeu} from './views/sammlung.js';

const api = createApi({origin: API_ORIGIN});
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

// Gemeinsamer Zugriff für die Steuermodule; render und schedule werden nach dem Zusammenbau der Hülle gesetzt.
const ctx = {
  app,
  ui,
  api,
  store,
  push: createPush({origin: API_ORIGIN}),
  announce,
  render: () => shell.render(),
  schedule: () => shell.schedule()
};
const gestures = createGestures(app);
const wissen = createWissen(ctx);
const pushController = createPushController(ctx);
const controllers = [
  wissen,
  createPersonal(ctx, pushController),
  createVotesController(ctx),
  createStory(ctx, gestures),
  createCards(ctx, gestures),
  createSharing(ctx),
  pushController
];

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
  vergleich: renderVergleich,
  verein: renderVerein,
  ich: renderIch,
  quiz: renderQuiz,
  mein: renderMein,
  sammlung: renderSammlung,
  karte: renderKarte,
  neu: renderNeu,
  start: renderStart,
  rueckblick: renderRueckblick,
  ...wissen.views
};
const shell = createShell({app, ui, store, api, views: VIEWS, controllers, gestures});

// «Live dabei»: Ein laufendes Kadetten-Spiel, das die App gesehen hat, bringt eine Sammelkarte.
store.subscribe(() => {
  const match = store.state.live?.match;
  if (match && involves(match)) noteLive(String(match.id));
  shell.schedule();
});
pushController.probeCalendar();
shell.start();
store.refresh().then(() => {
  startLive({store});
  pushController.restore();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') store.refresh();
});
// Countdown und Zeitgrenzen der Spielansicht ohne Netzabfrage aktualisieren.
setInterval(() => {
  if (document.visibilityState !== 'hidden' && !document.activeElement?.matches?.('input, button')) shell.schedule();
}, 15000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', {scope: './'}).catch(() => {});
}
