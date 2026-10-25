import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

function setup(football = false, storage = new Map()) {
  const {document} = parseHTML('<html><body><main id="app"><section class="v2-ticket-section"><div class="v2-hero-media"></div><div class="v2-ticket-content"></div><svg class="v2-hero-curve"></svg></section></main></body></html>');
  const noop = () => {};
  const context = vm.createContext({document, location: {hash: '#home'}, window: {addEventListener: noop},
    setInterval: noop, render: noop, showLiveMatch: noop, updateFcsgLiveView: noop, loadFcsgData: noop, openClubSettings: noop,
    localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)},
    liveEscape: x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    liveRequestFailed: false, fcsgLiveErrors: new Set(), v2ArrowSvg: () => '<svg aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>',
    kickoffAt: () => null, activeClub: football ? 'fcsg' : 'kadetten'});
  vm.runInContext(fs.readFileSync('src/client/v2/matchday.js', 'utf8'), context);
  const game = {id: 'test', home: football ? 'FC St.Gallen 1879' : 'Kadetten Schaffhausen', away: 'Ein sehr langer Gegnername', date: '2026-10-31', time: '19:15', league: 'QHL', confirmed: true};
  const club = {football, fixture: {game, live: null}, today: '2026-10-31', games: [game],
    score: g => g.liveScore || g.score, isOwn: n => n === game.home,
    result: () => ({state: 'win'}), crestOf: (g, h) => `<img alt="${h ? 'Heim' : 'Gast'}" src="crest.webp">`,
    matchHref: (g, finished) => '#match/' + g.id + '/' + (finished ? 'stats' : 'overview'), liveHref: () => '#match/test/live'};
  context.club = club;
  context.v2Club = () => club;
  const markup = state => { context.info = {game, state}; return context.v2TicketMarkup(club, context.info); };
  const parse = html => { const el = document.createElement('div'); el.innerHTML = html; return el; };
  return {context, document, club, game, markup, parse};
}

test('V2 ticket is one complete preview link with time between both teams and no separate arrow', () => {
  for (const football of [false, true]) {
    const {markup, parse} = setup(football), root = parse(markup('everyday'));
    assert.equal(root.querySelectorAll('a').length, 1);
    assert.equal(root.querySelector('a').getAttribute('href'), '#match/test/overview');
    assert.equal(root.querySelector('[data-v2-score]').textContent, '19:15');
    assert.equal(root.querySelectorAll('.v2-ticket-team').length, 2);
    const matchup = root.querySelector('.v2-ticket-matchup');
    assert.equal(matchup.children.length, 3);
    assert.equal(matchup.children[0].className, 'v2-ticket-team');
    assert.equal(matchup.children[1].className, 'v2-ticket-time');
    assert.equal(matchup.children[2].className, 'v2-ticket-team');
    assert.equal(root.querySelectorAll('.v2-ticket-arrow,svg,button,a a').length, 0);
    assert.match(root.querySelector('.v2-ticket-heading').textContent, /2026/);
    assert.equal(root.querySelectorAll('.v1-match-action,.v2-glance').length, 0);
    assert.match(root.querySelector('a').textContent, /2026[\s\S]*Spielvorschau öffnen/);
  }
});
test('Live and final states preserve home-away score order and route to their details', () => {
  for (const football of [false, true]) {
    const {markup, parse, club, game} = setup(football);
    game.score = [0, 1]; game.liveScore = football ? [0, 1] : undefined; game.phase = '2. Halbzeit'; game.clock = '48:12';
    club.fixture.live = game;
    let root = parse(markup('live'));
    assert.equal(root.querySelector('[data-v2-score]').textContent, '0:1');
    assert.equal(root.querySelector('a').getAttribute('href'), '#match/test/live');
    assert.match(root.textContent, /Jetzt live.*2. Halbzeit · 48:12/s);
    club.fixture.live = null;
    root = parse(markup('post'));
    assert.match(root.textContent, /Endresultat/);
    assert.equal(root.querySelector('a').getAttribute('href'), '#match/test/stats');
    assert.equal(root.querySelector('a').getAttribute('data-result'), 'win');
  }
});
test('Unknown kickoff/score, escaped names, away fixtures and absent fixtures remain honest', () => {
  const {markup, parse, club, game, context} = setup(true);
  game.confirmed = false; game.home = '<script>untrusted</script>'; club.isOwn = () => false;
  let root = parse(markup('everyday'));
  assert.equal(root.querySelector('[data-v2-score]').textContent, 'Offen');
  assert.match(root.textContent, /Auswärtsspiel/);
  assert.equal(root.querySelectorAll('script').length, 0);
  game.score = null; club.fixture.live = game;
  root = parse(markup('live'));
  assert.equal(root.querySelector('[data-v2-score]').textContent, '–:–');
  assert.match(context.v2TicketMarkup(club, {game: null}), /Noch kein nächstes Spiel/);
});
test('Refresh keeps the ticket link node, updates scores immediately, and avoids unnecessary rebuilds', () => {
  const {context, document, club, game} = setup();
  game.score = [12, 10]; club.fixture.live = game;
  context.v2SyncHome();
  const link = document.getElementById('v2-match-ticket'), first = link.firstElementChild, photo = document.querySelector('.v2-hero-media'), curve = document.querySelector('.v2-hero-curve');
  context.v2SyncHome(); assert.equal(link.firstElementChild, first);
  game.score = [13, 10]; context.v2SyncHome();
  assert.equal(document.getElementById('v2-match-ticket'), link);
  assert.equal(link.querySelector('[data-v2-score]').textContent, '13:10');
  context.liveRequestFailed = true; context.v2SyncHome();
  assert.match(link.textContent, /Letzter verfügbarer Stand/);
  club.fixture = {game: null, live: null}; club.games = []; context.v2SyncHome();
  assert.match(document.querySelector('.v2-ticket-content').textContent, /Noch kein nächstes Spiel/);
  club.fixture = {game, live: game}; context.v2SyncHome();
  assert.equal(document.querySelector('.v2-hero-media'), photo);
  assert.equal(document.querySelector('.v2-hero-curve'), curve);
  assert.equal(document.querySelectorAll('#v2-match-ticket').length, 1);
});

test('Header variants restore and persist one valid preference, with a usable storage fallback', () => {
  const key = 'fan-v2-header-style', storage = new Map([[key, 'curve']]);
  const {context, document} = setup(false, storage);
  assert.equal(document.documentElement.dataset.v2Header, 'curve');
  assert.equal(context.v2SetHeaderStyle('arena'), true);
  assert.equal(storage.get(key), 'arena');
  assert.equal(context.v2SetHeaderStyle('invalid'), false);
  assert.equal(document.documentElement.dataset.v2Header, 'arena');
  context.localStorage = {getItem: () => {throw Error('blocked');}, setItem: () => {throw Error('blocked');}};
  assert.equal(context.v2ReadHeaderStyle(), 'arena');
  assert.equal(context.v2SetHeaderStyle('curve'), true);
  assert.equal(document.documentElement.dataset.v2Header, 'curve');
  assert.equal(setup(false, new Map([[key, 'invalid']])).document.documentElement.dataset.v2Header, 'arena');
});
test('Settings expose one labelled selector and changing its value keeps the existing match link', () => {
  const {context, document} = setup();
  const group = document.createElement('section'); group.className = 'theme-settings';
  const dialog = document.createElement('dialog'); dialog.className = 'club-settings-dialog'; dialog.append(group); document.body.append(dialog);
  context.v2SyncHome();
  const ticket = document.getElementById('v2-match-ticket');
  context.v2InstallHeaderChoice(); context.v2InstallHeaderChoice();
  assert.equal(group.querySelectorAll('select').length, 1);
  assert.equal(group.querySelector('label > span').textContent, 'Titelbereich der Startseite');
  const select = group.querySelector('select');
  select.querySelector('option[value="arena"]').selected = false;
  select.querySelector('option[value="curve"]').selected = true;
  select.dispatchEvent(new document.defaultView.Event('change'));
  assert.equal(document.documentElement.dataset.v2Header, 'curve');
  assert.equal(document.getElementById('v2-match-ticket'), ticket);
});

test('V2 title uses fixed local action photos for each club and includes them in its offline shell', () => {
  const {context} = setup();
  const photos = {kadetten: 'news-34268.webp', fcsg: 'v2-header-fcsg.webp', otmar: 'v2-header-otmar.webp'};
  const build = fs.readFileSync('scripts/build.mjs', 'utf8');
  const v2Only = build.slice(build.indexOf('if(v2){'), build.indexOf("let sw="));
  for (const [club, name] of Object.entries(photos)) {
    context.activeClub = club;
    assert.equal(context.v2HeaderPhoto(), 'assets/' + name);
    assert.ok(fs.existsSync('src/client/assets/' + name));
    assert.ok(v2Only.includes("'assets/" + name + "'"), 'Photo belongs to the V2 offline shell');
  }
});
