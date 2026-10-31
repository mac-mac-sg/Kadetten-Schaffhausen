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
    fanClubs: {kadetten:{name:'Kadetten Schaffhausen',title:'KADETTEN',subtitle:'SCHAFFHAUSEN'},fcsg:{name:'FC St. Gallen',title:'FC ST. GALLEN',subtitle:'1879'},otmar:{name:'TSV St. Otmar',title:'ST. OTMAR',subtitle:'ST. GALLEN'}},
    kickoffAt: () => null, activeClub: football ? 'fcsg' : 'kadetten'});
  vm.runInContext(fs.readFileSync('src/client/js/logic.js', 'utf8'), context);
  context.kickoffAt = () => null;
  document.documentElement.dataset.preview='v2';
  vm.runInContext(fs.readFileSync('src/client/js/home-title.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/client/v2/matchday.js', 'utf8'), context);
  context.v2Now = () => new Date('2026-10-31T12:00:00Z');
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

test('Magazine fixture is one complete link with both teams, crests, time and a visible preview action', () => {
  for (const football of [false, true]) {
    const {markup, parse} = setup(football), root = parse(markup('everyday'));
    assert.equal(root.querySelectorAll('a').length, 1);
    assert.equal(root.querySelector('a').getAttribute('href'), '#match/test/overview');
    assert.equal(root.querySelector('[data-v2-score]').textContent, '19:15');
    assert.equal(root.querySelectorAll('.v2-cover-crests img').length, 2);
    assert.match(root.querySelector('.v2-cover-pairing').textContent, /gegen/);
    assert.match(root.querySelector('.v2-cover-pairing').textContent, /Ein sehr langer Gegnername/);
    assert.equal(root.querySelectorAll('.v2-ticket-arrow,svg,button,a a').length, 0);
    assert.match(root.querySelector('.v2-ticket-footer').textContent, /2026/);
    assert.equal(root.querySelectorAll('.v1-match-action,.v2-glance').length, 0);
    assert.match(root.querySelector('.v2-cover-action').textContent, /Spielvorschau öffnen/);
  }
});
test('Live and final states preserve home-away score order and route to their details', () => {
  for (const football of [false, true]) {
    const {markup, parse, club, game} = setup(football);
    game.score = [0, 1]; game.liveScore = football ? [0, 1] : undefined; game.phase = '2. Halbzeit'; game.clock = '48:12';
    club.fixture.live = game;
    let root = parse(markup('live'));
    assert.equal(root.querySelector('[data-v2-score]').textContent, '0 : 1');
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
  assert.equal(root.querySelector('[data-v2-score]').textContent, '– : –');
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
  assert.equal(link.querySelector('[data-v2-score]').textContent, '13 : 10');
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

test('V2 title uses fixed local club photos for each club and includes them in its offline shell', () => {
  const {context} = setup();
  const photos = {kadetten: 'news-34268.webp', fcsg: 'v2-header-fcsg-evening.webp', otmar: 'v2-header-otmar-heart.webp'};
  const build = fs.readFileSync('scripts/build.mjs', 'utf8');
  const sharedShell = build.slice(0, build.indexOf('let html='));
  for (const [club, name] of Object.entries(photos)) {
    context.activeClub = club;
    assert.equal(context.v2HeaderPhoto(), 'assets/' + name);
    assert.ok(fs.existsSync('src/client/assets/' + name));
    assert.ok(sharedShell.includes("'assets/" + name + "'"), 'Photo belongs to the shared offline shell');
  }
});

test('The ticket light edge progresses from calm to soon, matchday and live, then rests after the result', () => {
  for (const football of [false,true]) {
    const {markup,parse,club,game}=setup(football);
    game.date='2026-11-02';
    assert.equal(parse(markup('everyday')).querySelector('a').dataset.effect,'calm');
    assert.equal(parse(markup('pre')).querySelector('a').dataset.effect,'soon');
    game.date=club.today;
    assert.equal(parse(markup('pre')).querySelector('a').dataset.effect,'matchday');
    game.confirmed=false;game.time='';
    assert.equal(parse(markup('pre')).querySelector('a').dataset.effect,'matchday');
    club.fixture.live=game;
    assert.equal(parse(markup('live')).querySelector('a').dataset.effect,'live');
    club.fixture.live=null;game.score=[31,29];
    assert.equal(parse(markup('post')).querySelector('a').dataset.effect,'result');
  }
});

test('Countdown occupies the heading and the full Swiss date replaces the home-away footer', () => {
  for(const football of [false,true]) {
    const {context,club,game,markup,parse}=setup(football);
    context.v2Now=()=>new Date('2026-10-24T22:30:00Z'); // Already Sunday in Zurich, before the DST switch.
    for(const [date,label] of [['2026-10-25','Heute ist Matchday'],['2026-10-26','Nächstes Spiel morgen'],['2026-10-28','Nächstes Spiel in 3 Tagen'],['2026-12-01','Nächstes Spiel in 37 Tagen']]) {
      game.date=date;const root=parse(markup('everyday'));
      assert.equal(root.querySelector('.v2-ticket-day').textContent,label);
      assert.match(root.querySelector('.v2-ticket-footer').textContent,/2026/);
      assert.doesNotMatch(root.querySelector('.v2-ticket-footer').textContent,/Heimspiel|Auswärtsspiel/);
    }
    context.v2Now=()=>new Date('2026-12-31T23:30:00Z');game.date='2027-01-02';
    assert.equal(parse(markup('everyday')).querySelector('.v2-ticket-day').textContent,'Nächstes Spiel morgen');
    club.fixture.live=game;
    assert.equal(parse(markup('live')).querySelector('.v2-ticket-day').textContent,'Jetzt live');
    club.fixture.live=null;game.score=[1,0];
    assert.equal(parse(markup('post')).querySelector('.v2-ticket-day').textContent,'Heute gespielt');
  }
});

test('Magazine retains every story once, including its original route, in all three club editions', () => {
  const {context, document, club, game, parse} = setup();
  vm.runInContext(fs.readFileSync('src/client/js/views-news.js', 'utf8'), context);
  Object.assign(context, {
    photoUrl: x => x, snapshotText: x => x, footer: () => '', fcsgFooter: () => '',
    v2ClubIdentity: () => ({photo:'assets/team.webp'})});
  const news = Array.from({length:9}, (_,i) => ({id:'article-'+i, title:'Vereinsbericht '+i, image:'assets/team.webp', date:'30.10.2026'}));
  context.stories = news; context.fcsgData = {stories:news};
  for (const id of ['kadetten','fcsg','otmar']) {
    context.activeClub = id;
    const markup = context.v2MagazineHome(id === 'fcsg'), root = parse(markup);
    assert.equal(root.querySelectorAll('h1').length, 1);
    assert.equal(root.querySelector('.v1-news-grid .v1-news-link').getAttribute('href'),'#news/article-0');
    assert.equal(root.querySelector('h1').textContent,[context.fanClubs[id].title,context.fanClubs[id].subtitle].join(''));
    assert.equal(root.querySelectorAll('.v1-news-card').length, news.length);
    assert.equal(root.querySelectorAll('.v2-magazine-cover .v1-news-card').length, 0);
    for (const story of news) assert.equal(root.querySelectorAll(`a[href="#news/${story.id}"]`).length,1);
    assert.equal(root.querySelectorAll('a[href="#club"]').length,0);
    document.getElementById('app').innerHTML = markup;
    context.v2LimitNews();
    assert.equal(document.querySelectorAll('.v1-news-card:not([hidden])').length,6);
    document.querySelector('.v2-more-news').click();
    assert.equal(document.querySelectorAll('.v1-news-card:not([hidden])').length,9);
    vm.runInContext('v2State.newsExpanded=false',context);
  }
  for (const state of ['pre','live','post','everyday']) {
    assert.deepEqual([...context.v2CoverTitle({game,state})],['ST. OTMAR','ST. GALLEN']);
  }
  club.fixture.live=null;
});

test('Magazine team chrome preserves the single heading, every player link and the full club entry', () => {
  const {context, document} = setup();
  context.fanClubs = {kadetten:{name:'Kadetten Schaffhausen'}};
  context.location.hash='#season/squad';
  document.getElementById('app').innerHTML='<section class="season"><header class="season-header"><h1>Kader</h1></header><a class="v2-club-entry" href="#club">Geschichte</a><aside class="notice">Weitere Saisonspiele folgen.</aside><h2>Torhüter</h2><a class="player-card" href="#player/1">Leon</a><a class="player-card" href="#player/12">Gwendal</a></section>';
  context.v2MagazineChrome();context.v2MagazineChrome();
  assert.equal(document.querySelectorAll('.v2-team-cover').length,1);
  assert.equal(document.querySelector('aside.notice').getAttribute('role'),'note');
  assert.equal(document.querySelectorAll('h1').length,1);
  assert.equal(document.querySelector('h1').textContent,'DAS TEAM.');
  assert.equal(document.querySelectorAll('.player-card').length,2);
  assert.equal(document.querySelector('.v2-team-cover').nextElementSibling.getAttribute('href'),'#club');
});


test('Dock aligns its recess with the active destination without replacing links or losing labels', () => {
  const {context,document}=setup();
  const dock=document.createElement('nav');dock.className='dock';
  dock.innerHTML=['Magazin','Spiele','Tabelle','Team'].map((label,i)=>`<a data-nav="${i}" href="#${i}" class="${i===0?'active':''}"><svg></svg>${label}</a>`).join('');
  document.body.append(dock);
  Object.defineProperty(dock,'clientWidth',{value:390});
  const links=[...dock.querySelectorAll('a')];
  links.forEach((link,i)=>{Object.defineProperty(link,'offsetLeft',{value:8+i*93.5});Object.defineProperty(link,'offsetWidth',{value:93.5});});
  context.v2SyncDock();context.v2SyncDock();
  assert.equal(dock.style.getPropertyValue('--v2-dock-offset'),'-140.25px');
  assert.equal(dock.querySelectorAll('.v2-dock-label').length,4);
  assert.equal(links[0].textContent,'Magazin');
  assert.equal(links[3].getAttribute('href'),'#3');
  links[0].classList.remove('active');links[3].classList.add('active');context.v2SyncDock();
  assert.equal(dock.style.getPropertyValue('--v2-dock-offset'),'140.25px');
  assert.equal(dock.querySelectorAll('svg').length,4);
  assert.equal(dock.querySelectorAll('a')[3],links[3]);
});


test('V2 removes the competition selector and resets stale filters without changing the schedule view', () => {
  const {context,parse}=setup();
  context.gameViewToggle=()=>['list','calendar','week'].map(mode=>`<button data-mode="${mode}">${mode}</button>`).join('');
  for(const club of ['kadetten','fcsg','otmar'])for(const mode of ['list','calendar','week']) {
    Object.assign(context,{activeClub:club,mode,competition:'EHL'});
    const root=parse(context.gameControls());
    assert.equal(root.querySelectorAll('select,#competition').length,0);
    assert.equal(root.querySelectorAll('[data-mode]').length,3);
    assert.equal(context.competition,'Alle');
    assert.equal(context.mode,mode);
    assert.ok(root.querySelector('.game-control-bar'));
  }
});


test('The club entry precedes the first position heading and every player in all V2 club editions', () => {
  for (const id of ['kadetten','fcsg','otmar']) {
    const {context,document}=setup(id==='fcsg');context.activeClub=id;
    document.getElementById('app').innerHTML='<section class="season"><header><h1>Kader</h1></header><h2>Torhüter</h2><div class="players"><a class="player-card" href="#player/1">Torhüter</a></div><a class="v2-club-entry" href="#club"><h2>Unser Verein</h2><p>Geschichte</p></a><h2>Feldspieler</h2><div class="players"><a class="player-card" href="#player/2">Feldspieler</a></div></section>';
    const section=document.querySelector('.season'),entry=section.querySelector('.v2-club-entry'),players=[...section.querySelectorAll('.player-card')],firstHeading=section.querySelector('h2');
    context.v2MagazineTeamCover(section);context.v2MagazineTeamCover(section);
    assert.equal(section.querySelector('.v2-team-cover').nextElementSibling,entry);
    assert.ok([...section.children].indexOf(entry)<[...section.children].indexOf(firstHeading));
    assert.equal(section.querySelectorAll('.v2-club-entry').length,1);
    assert.equal(entry.getAttribute('href'),'#club');
    assert.deepEqual([...section.querySelectorAll('.player-card')],players);
    assert.equal(entry.querySelector('h2').textContent,'Geschichte & Erfolge');
  }
});
