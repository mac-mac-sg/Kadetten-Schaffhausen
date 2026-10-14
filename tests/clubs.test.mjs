import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const source = fs.readFileSync('src/client/js/clubs.js', 'utf8');
test('FCSG-Tordifferenz skaliert nach Fussballresultaten und berücksichtigt Auswärtsspiele', () => {
  const a = app('https://example.test/?club=fcsg');
  const html = a.run(`fcsgGoalDifferenceChart([
    {id:'home',date:'2026-10-01',home:'FC St.Gallen 1879',away:'FC Sion',score:[2,1]},
    {id:'away',date:'2026-10-02',home:'FC Lugano',away:'FC St.Gallen 1879',score:[4,1]},
    {id:'draw',date:'2026-10-03',home:'FC St.Gallen 1879',away:'FC Luzern',score:[0,0]}
  ])`);
  const {document} = parseHTML(html), rows = [...document.querySelectorAll('.difference-game')];
  assert.match(document.querySelector('.difference-axis').textContent, /−30\+3/);
  assert.equal(rows[0].querySelector('.difference-value').textContent, '+1');
  assert.match(rows[0].querySelector('.difference-bar').getAttribute('style'), /16\.666/);
  assert.equal(rows[1].querySelector('.difference-value').textContent, '−3');
  assert.equal(rows[1].classList.contains('loss'), true);
  assert.match(rows[1].querySelector('.difference-bar').getAttribute('style'), /50%/);
  assert.equal(rows[2].classList.contains('draw'), true);
  assert.equal(rows[2].querySelector('.difference-value').textContent, '0');
});
function app(url, saved, storageFails = false) {
  const {document} = parseHTML(fs.readFileSync('src/client/index.html', 'utf8'));
  const location = {href: url, hash: new URL(url).hash};
  const store = new Map([['fan-app-active-club-v1', saved]]);
  let renders = 0, polls = 0;
  const context = vm.createContext({document, location, URL, setInterval() {}, navigator:{onLine:true}, apiFetch:()=>Promise.reject(Error("offline")), AbortSignal, liveEscape:s=>String(s), safeUrl:s=>s, backLink:(url,label)=>`<a href="${url}">${label}</a>`, Date, swissToday:()=>"2026-10-04", date:g=>g.date, mode:"list", calendarYear:2026, month:9, localStorage: {
    getItem: key => { if (storageFails) throw Error('unavailable'); return store.get(key); },
    setItem: (key, value) => { if (storageFails) throw Error('unavailable'); store.set(key, value); }
  }, history: {replaceState: (_, __, href) => {location.href = href; location.hash = new URL(href).hash;}},
    liveTimer: 0, dayTimer: 0, highlightObserver: null, clearTimeout() {}, clearInterval() {}, competition: 'QHL', sourceNotice:()=>'', render() {renders++;}, window: {innerWidth: 375, innerHeight: 812, scrollTo() {}},
    loadCurrentData() {}, syncOfflineNotice() {}, appFeedback() {}, checkLiveMatch() {polls++;}, ext: (url, label) => `<a href="${url}">${label}</a>`
  });
  document.getElementById('app').focus = () => {};
  vm.runInContext(fs.readFileSync("src/client/data/fcsg-fallback.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/data/club.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/views-club.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/views-news.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/logic.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/views-match.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/views-week.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/views-season.js", "utf8"), context);
  vm.runInContext(source, context);
  vm.runInContext(fs.readFileSync("src/client/js/fcsg-live.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/fcsg-match.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("src/client/js/fcsg-history.js", "utf8"), context);
  const run = code => vm.runInContext(code, context);
  return {run, document, store, location, counts: () => [renders, polls]};
}
test('Vereinswahl: Kadetten als Start trotz letzter Vereinswahl; direkte Vereinslinks bleiben gültig', () => {
  for (const [url, saved, expected] of [
    ['https://example.test/', null, 'kadetten'],
    ['https://example.test/', 'fcsg', 'kadetten'],
    ['https://example.test/?club=kadetten', 'fcsg', 'kadetten'],
    ['https://example.test/?club=fcsg', null, 'fcsg'],
    ['https://example.test/?club=other', null, 'kadetten'],
    ['https://example.test/?club=__proto__', null, 'kadetten']
  ]) {
    const a = app(url, saved); a.run('restoreActiveClub()'); assert.equal(a.run('activeClub'), expected);
  }
  const a = app('https://example.test/?club=fcsg', null, true);
  a.run('restoreActiveClub()'); assert.equal(a.run('activeClub'), 'fcsg');
});
test('Wechsel bewahrt Bereiche, setzt Details zurück und pollt nur für Kadetten', () => {
  for (const [hash, next] of [['#home','#home'], ['#season/table','#season/table'], ['#season/games','#season/games'], ['#season/squad','#season/squad'], ['#match/stgallen/stats','#season/games'], ['#player/7','#season/squad'], ['#news/34300','#home'], ['#club','#club']]) {
    const a = app('https://example.test/app/?extra=keep' + hash);
    a.run("switchClub('fcsg')");
    assert.equal(a.location.hash, next);
    assert.equal(new URL(a.location.href).searchParams.get('extra'), 'keep');
    assert.equal(a.store.get('fan-app-active-club-v1'), 'fcsg');
    assert.deepEqual(a.counts(), [1, 0]);
    a.run("switchClub('kadetten')"); assert.deepEqual(a.counts(), [2, 1]);
  }
  const a = app('https://example.test/', null, true);
  assert.doesNotThrow(() => a.run("switchClub('fcsg')"));
});
test('Header, Titel und FCSG-Seiten enthalten keine fremden Vereinsdaten', () => {
  const a = app('https://example.test/?club=fcsg');
  a.run('restoreActiveClub(); updateClubHeader()');
  assert.equal(a.document.documentElement.dataset.club, 'fcsg');
  assert.match(a.document.querySelector('.brand').textContent, /FC ST. GALLEN/);
  assert.equal(a.document.querySelectorAll('[data-select-club]').length,3);
  assert.equal(a.document.querySelector('[data-select-club=fcsg]').getAttribute('aria-pressed'),'true');
  for (const [page, id] of [['home',''], ['season','games'], ['season','table'], ['season','squad'], ['club','']]) {
    const html = a.run(`fcsgView('${page}', '${id}')`);
    assert.match(html, /FC St.Gallen 1879|Vereinsgeschichte/);
    assert.doesNotMatch(html, /undefined|NaN|Quickline|Strafminuten|Rikhardsson/);
  }
  a.run("activeClub='kadetten'; updateClubHeader()");
  assert.equal(a.document.documentElement.dataset.club, 'kadetten');
  assert.match(a.document.querySelector('.brand').textContent, /KADETTEN/);
});
test('Farbwelle wechselt genau einmal und gibt den Schalter nach abgebrochenem Übergang frei', async () => {
  const a = app('https://example.test/#season/table');
  let update, reject;
  a.document.getElementById('club-switch').getBoundingClientRect = () => ({left: 200, top: 20, width: 44, height: 44});
  a.document.startViewTransition = callback => {
    update = callback;
    return {ready: Promise.resolve(), finished: new Promise((_, fail) => {reject = fail;})};
  };
  a.run("switchClub('fcsg'); switchClub('fcsg')");
  assert.equal(a.document.getElementById('club-switch').disabled, true);
  assert.equal(a.run('activeClub'), 'kadetten');
  assert.equal(a.document.documentElement.style.getPropertyValue('--club-wave-x'), '222px');
  update(); update();
  assert.deepEqual(a.counts(), [1, 0]);
  assert.equal(a.location.hash, '#season/table');
  reject(Error('transition interrupted'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.document.getElementById('club-switch').disabled, false);
  assert.equal(a.document.documentElement.classList.contains('club-transition'), false);
  assert.equal(a.document.documentElement.style.getPropertyValue('--club-wave-x'), '');
});
test('Reduzierte Bewegung nutzt eine kurze Überblendung, ohne unterstützte Animation bleibt der Wechsel nutzbar', async () => {
  const a = app('https://example.test/');
  a.run("window.matchMedia = () => ({matches:true})");
  let frames, options;
  a.document.getElementById('app').animate = (f, o) => {frames = f; options = o; return {finished: Promise.resolve()};};
  a.run("switchClub('fcsg')");
  assert.equal(options.duration, 120);
  assert.equal(frames.some(f => 'clipPath' in f), false);
  assert.equal(a.document.querySelector('.club-color-wave'), null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(a.document.getElementById('club-switch').disabled, false);
  delete a.document.getElementById('app').animate;
  a.run("switchClub('kadetten')");
  assert.equal(a.run('activeClub'), 'kadetten');
  assert.equal(a.document.getElementById('club-switch').disabled, false);
});
test('FCSG player profile displays source facts and separates seasons without inventing missing values',()=>{
 const a=app('https://example.test/?club=fcsg#player/7470');a.run(`fcsgData.players=[{id:'7470',name:'Lukas Daschner',position:'Mittelfeld',height:185,nationality:'Deutschland',debutDate:'2025-02-05',debutOpponent:'FC Lugano',seasons:[{season:'2026/2027',competition:'Super League',appearances:9,goals:0,assists:null,minutes:708,yellow:2,red:0,secondYellow:null},{season:'2025/2026',competition:'Schweizer Pokal',appearances:4,goals:1}],url:'https://www.fcsg.ch/pages/kader/daschner-lukas'}]`);
 const html=a.run("fcsgPlayer('7470')");
 assert.match(html,/185 cm/);assert.match(html,/Deutschland/);assert.match(html,/05\.02\.2025/);assert.match(html,/FC Lugano/);
 assert.match(html,/value="2026\/2027" selected/);assert.match(html,/value="2025\/2026"/);
 assert.match(html,/<span>Tore<\/span><strong>0<\/strong>/);assert.match(html,/<span>Vorlagen<\/span><strong>–<\/strong>/);
 assert.doesNotMatch(html,/undefined|NaN/);
 a.run("fcsgPlayerStatChoices.set('7470',{season:'2025/2026',competition:'Schweizer Pokal'})");
 const older=a.run("fcsgPlayer('7470')");
 assert.match(older,/Schweizer Cup/);assert.match(older,/<span>Tore<\/span><strong>1<\/strong>/);
 assert.match(older,/<span>Spielminuten<\/span><strong>–<\/strong>/);

});

test('FCSG-Spieler haben zwei stabile Scroll-Abschnitte, auch nach dem Nachladen der Statistik', async () => {
 const a=app('https://example.test/?club=fcsg#player/5426');
 a.run("restoreActiveClub(); document.getElementById('app').innerHTML=fcsgPlayer('5426')");
 const intro=a.document.getElementById('fcsg-profile-intro'), stats=a.document.getElementById('fcsg-profile-stats');
 assert.equal(a.document.querySelectorAll('.fcsg-profile-slide').length,2);
 assert.ok(intro.querySelector('h1'));assert.ok(intro.querySelector('.fcsg-player-photo'));
 assert.equal(intro.querySelector('.fcsg-player-bento'),null);
 assert.ok(stats.querySelector('#fcsg-player-stats'));
 for(const button of a.document.querySelectorAll('.fcsg-profile-jumps button'))assert.ok(a.document.getElementById(button.dataset.section));
 a.run("apiFetch=async()=>({ok:true,json:async()=>({ok:true,players:fcsgData.players.map(p=>({...p,seasons:[{season:'2026/2027',competition:'Super League',appearances:6,minutes:502,goals:2,assists:1}]}))})})");
 await a.run('loadFcsgPlayerDetails()');
 assert.equal(a.document.getElementById('fcsg-profile-intro'),intro);
 assert.equal(a.document.getElementById('fcsg-profile-stats'),stats);
 assert.equal(intro.querySelector('.fcsg-player-bento'),null);
 assert.equal(stats.querySelector('.fcsg-bento-primary strong').textContent,'502');
});

test('Punkt am Vereinsknopf: ruhig vor Anspielzeit, 2 Stunden pulsierend, danach Farbe des Resultats, ohne Resultat grau', () => {
  const a = app('https://example.test/?club=kadetten');
  const dot = (time, now, result) => a.run(`clubMatchDot({time:${JSON.stringify(time)}}, ${now}, ${JSON.stringify(result)}).state`);
  assert.equal(dot('18:00', 17 * 60 + 59, null), 'soon');
  assert.equal(dot('18:00', 18 * 60, null), 'live');
  assert.equal(dot('18:00', 19 * 60 + 59, 'win'), 'live', 'Resultat erst nach den zwei Stunden');
  assert.equal(dot('18:00', 20 * 60, 'win'), 'win');
  assert.equal(dot('18:00', 20 * 60, 'draw'), 'draw');
  assert.equal(dot('18:00', 21 * 60, 'loss'), 'loss');
  assert.equal(dot('18:00', 20 * 60, null), 'pending');
  assert.equal(dot('', 20 * 60, null), 'soon', 'ohne Anspielzeit nur «heute»');
});

test('Drei Vereine: Auswahl speichern, letzten Verein behalten, aktiven ausgeschalteten Verein ersetzen',()=>{
 const a=app('https://example.test/#season/squad');a.run('restoreActiveClub();updateClubHeader()');
 assert.equal(a.document.querySelector('.club-entry').hidden,false);
 a.run("switchClub('otmar');updateClubHeader()");assert.equal(a.run('activeClub'),'otmar');assert.equal(a.location.hash,'#season/squad');
 assert.match(a.document.querySelector('.brand').textContent,/ST. OTMAR/);
 a.run("setClubSelected('kadetten',false);setClubSelected('fcsg',false)");
 assert.equal(a.document.getElementById('club-switch').hidden,true);
 assert.deepEqual(JSON.parse(a.store.get('fan-app-selected-clubs-v1')),['otmar']);
 a.run("setClubSelected('otmar',false)");assert.equal(a.run('activeClub'),'otmar');
 a.run("setClubSelected('fcsg',true);setClubSelected('otmar',false)");assert.equal(a.run('activeClub'),'fcsg');assert.equal(a.location.hash,'#season/squad');
 a.location.href='https://example.test/';a.run('restoreActiveClub()');assert.equal(a.run('activeClub'),'fcsg');
 a.location.hash='#home';a.run('updateClubHeader()');assert.equal(a.document.querySelector('.club-entry').hidden,true);
});

test('Heute-Hinweis im Spiele-Menü gilt für alle Vereine, auch vor Anpfiff und nach Spielende',()=>{
 const a=app('https://example.test/');
 a.run("globalThis.games=[{date:swissToday(),league:'Cup',score:[23,20]}];fcsgData.games=[{date:swissToday(),time:'23:00'}]");
 for(const club of ['kadetten','otmar','fcsg']){
  a.run(`activeClub='${club}';syncMatchdayNavigation()`);
  const link=a.document.querySelector('[data-nav=games]');assert.equal(link.classList.contains('is-matchday'),true,club);assert.match(link.getAttribute('aria-label'),/Heute/);
 }
 a.run("games=[];fcsgData.games=[{date:'2027-01-01'}]");
 for(const club of ['kadetten','otmar','fcsg']){
  a.run(`activeClub='${club}';syncMatchdayNavigation()`);
  assert.equal(a.document.querySelector('[data-nav=games]').classList.contains('is-matchday'),false,club);
 }
});

test('V1 compact header uses one club trigger and a dropdown instead of the permanent club row',()=>{
 const a=app('https://example.test/#season/table');a.run('restoreActiveClub();updateClubHeader();updateClubHeader()');
 assert.equal(a.document.querySelectorAll('[data-compact-clubs]').length,1);
 assert.equal(a.document.getElementById('club-switch').hidden,true);
 assert.equal(a.document.getElementById('club-settings').hidden,false);
 const trigger=a.document.querySelector('[data-compact-clubs]');
 assert.equal(trigger,a.document.querySelector('.brand'));assert.equal(trigger.tagName,'BUTTON');assert.equal(trigger.hasAttribute('href'),false);
 assert.match(trigger.textContent,/KADETTEN/);assert.match(trigger.getAttribute('aria-label'),/Verein wechseln/);
 assert.equal(trigger.querySelectorAll('.compact-club-chevron').length,1);
 assert.equal(trigger.getAttribute('aria-controls'),'compact-club-menu');
 assert.equal(trigger.getAttribute('aria-expanded'),'false');
 a.run('openCompactClubMenu()');
 const menu=a.document.getElementById('compact-club-menu');
 assert.equal(menu.hidden,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');
 assert.equal(menu.querySelectorAll('[data-compact-pick]').length,3);
 assert.equal(menu.querySelector('[data-compact-pick="kadetten"]').getAttribute('aria-pressed'),'true');
 assert.ok(menu.querySelector('a[href="#club"]'));assert.ok(menu.querySelector('[data-compact-manage]'));
 a.run('openCompactClubMenu()');assert.equal(menu.hidden,true);
 a.run("selectedClubs=['fcsg'];activeClub='fcsg';updateClubHeader();openCompactClubMenu()");
 assert.equal(trigger.querySelectorAll('.compact-club-chevron').length,1);assert.match(trigger.getAttribute('aria-label'),/FC St. Gallen/);
 assert.equal(menu.querySelectorAll('[data-compact-pick]').length,1);
 assert.match(menu.textContent,/FC St. Gallen/);
});
test('V1 compact header does not change V2 controls',()=>{
 const a=app('https://example.test/');a.document.documentElement.dataset.design='v2';
 a.run('restoreActiveClub();updateClubHeader()');
 assert.equal(a.document.querySelector('[data-compact-clubs]'),null);
 assert.equal(a.document.querySelector('.v1-compact-header'),null);
});

test('V1 light mode persists independently, restores safely and never changes V2',()=>{
 const a=app('https://example.test/');a.run('restoreV1Theme()');assert.equal(a.document.documentElement.dataset.theme,'dark');
 a.run("setV1Theme('light')");assert.equal(a.store.get('fan-v1-theme'),'light');assert.equal(a.document.documentElement.style.colorScheme,'light');
 a.document.documentElement.dataset.club='otmar';a.run('restoreV1Theme()');assert.equal(a.document.documentElement.dataset.theme,'light');
 a.document.documentElement.dataset.design='v2';a.document.documentElement.dataset.theme='dark';a.run("setV1Theme('light');restoreV1Theme()");assert.equal(a.document.documentElement.dataset.theme,'dark');
 const blocked=app('https://example.test/',null,true);assert.doesNotThrow(()=>blocked.run("restoreV1Theme();setV1Theme('light')"));assert.equal(blocked.document.documentElement.dataset.theme,'light');
});
test('Settings switch applies light mode immediately and reflects the saved state when reopened',()=>{
 const a=app('https://example.test/'),create=a.document.createElement.bind(a.document);
 a.document.createElement=tag=>{const el=create(tag);if(tag==='dialog'){el.showModal=()=>el.setAttribute('open','');el.close=()=>el.removeAttribute('open');}return el;};
 a.run('openClubSettings()');const input=a.document.querySelector('[data-v1-light-mode]');assert.ok(input);input.checked=true;input.dispatchEvent(new a.document.defaultView.Event('change',{bubbles:true}));
 assert.equal(a.document.documentElement.dataset.theme,'light');assert.equal(a.store.get('fan-v1-theme'),'light');a.run('openClubSettings()');assert.equal(input.checked,true);
});
test('Saved V1 theme is applied before the app bundle without touching V2',()=>{
 const html=fs.readFileSync('src/client/index.html','utf8'),script=html.match(/<script data-v1-theme-init>([\s\S]*?)<\/script>/)[1];
 for(const [pathname,stored,expected] of [['/Kadetten-Schaffhausen/','light','light'],['/','invalid','dark'],['/Kadetten-Schaffhausen/v2/','light',undefined]]){
  const {document}=parseHTML(html);vm.runInNewContext(script,{document,location:{pathname},localStorage:{getItem:()=>stored}});assert.equal(document.documentElement.dataset.theme,expected);
 }
});


test('V1 club fallback fades without a colour wave; V2 keeps its own transition',async()=>{
 for(const design of ['v1','v2']){
  const a=app('https://example.test/');if(design==='v2')a.document.documentElement.dataset.design='v2';
  let frames,options;
  const animate=(f,o)=>{frames=f;options=o;return {finished:Promise.resolve()};};
  a.document.getElementById('app').animate=animate;
  const create=a.document.createElement.bind(a.document);a.document.createElement=tag=>{const e=create(tag);e.animate=animate;return e;};
  a.run("switchClub('fcsg')");
  assert.equal(a.run('activeClub'),'fcsg');
  assert.equal(options.duration,design==='v1'?160:280);
  assert.equal(frames.some(f=>'clipPath' in f),design==='v2');
  assert.equal(a.document.querySelector('.club-color-wave')!==null,design==='v2');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.document.querySelector('.club-color-wave'),null);
  assert.equal(a.document.getElementById('app')!==null,true);
  assert.equal(a.document.getElementById('club-switch').disabled,false);
 }
});


test('A live FCSG fixture retains a prominent card and live details',()=>{
 const a=app('https://example.test/?club=fcsg#season/games');
 const markup=a.run("fcsgLiveGames.set(fcsgData.games[0].id,{...fcsgData.games[0],live:true,score:[1,0]});fcsgCard(fcsgData.games[0])");
 const {document}=parseHTML(markup);
 assert.ok(document.querySelector('.game-card.fcsg-game-live'));
 assert.match(document.querySelector('.actions a').textContent,/Live verfolgen/);
 assert.ok(document.querySelector('[data-fcsg-score]'));
 assert.ok(document.querySelector('[data-fcsg-phase]'));
});
