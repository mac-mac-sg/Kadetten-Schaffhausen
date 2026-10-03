import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lädt alle Oberflächen-Skripte (ausser dem Startcode) in eine einfache Browser-Attrappe
// und baut die Ansichten mit dem mitgelieferten Datenstand. Fängt Tippfehler und
// kaputte Vorlagen ab, ohne einen Browser zu brauchen.
const html = fs.readFileSync('src/client/index.html', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)/g)]
  .map(m => m[1])
  .filter(s => (s.startsWith('js/') || s.startsWith('data/') || s === 'enhancements.js') && s !== 'js/main.js');
const noop = () => {};
const fakeElement = () => ({classList: {toggle: noop, add: noop, remove: noop}, style: {}, dataset: {}, setAttribute: noop});
const location = {hash: '', href: 'https://example.test/Kadetten/'};
const context = {
  location,
  navigator: {onLine: true},
  document: {
    hidden: false,
    body: fakeElement(),
    documentElement: fakeElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: noop
  },
  window: {addEventListener: noop, scrollTo: noop, scrollY: 0},
  localStorage: {getItem: () => null, setItem: noop},
  setInterval: () => 0,
  setTimeout: () => 0,
  clearTimeout: noop,
  clearInterval: noop,
  requestAnimationFrame: noop,
  cancelAnimationFrame: noop,
  fetch: () => Promise.reject(new Error('offline')),
  apiFetch: () => Promise.reject(new Error('offline')),
  console
};
vm.createContext(context);
for (const file of scripts) vm.runInContext(fs.readFileSync('src/client/' + file, 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);
const view = code => {
  const out = run(code);
  assert.equal(typeof out, 'string');
  assert.doesNotMatch(out, /undefined|NaN|\[object /, 'Ansicht enthält einen Platzhalter-Fehler: ' + out.match(/.{40}(undefined|NaN|\[object ).{20}/s)?.[0]);
  return out;
};

test('Startseite zeigt alle Nachrichten mit Titel', () => {
  const out = view('home()');
  assert.match(out, /story-feed/);
  for (const story of run('stories.slice(0, 5)')) assert.ok(out.includes(story.title), story.title);
});

test('Spielplan: Karten für gespielte Spiele mit Ergebnis-Zustand', () => {
  const out = view("season('games')");
  assert.ok((out.match(/class="game-card/g) || []).length >= 10);
  assert.match(out, /game-result-label">Sieg</);
  assert.match(out, /result-win/);
});

test('Tabelle und Kader', () => {
  assert.match(view("season('table')"), /Kadetten Schaffhausen/);
  const squad = view("season('squad')");
  assert.equal((squad.match(/class="player-card"/g) || []).length, run('players.length'));
  assert.match(squad, /Rikhardsson/);
});

test('Spielerprofil für jeden Spieler im Kader', () => {
  for (const [id, name] of run('players')) assert.ok(view(`profile(${id})`).includes(name.split(' ').at(-1)), name);
});

test('Spielseite in allen drei Reitern, gespielt und offen', () => {
  const played = run("games.find(g => g.score && g.league === 'QHL').id");
  const open = run('games.find(g => !g.score).id');
  for (const id of [played, open])
    for (const tab of ['overview', 'squad', 'stats'])
      view(`match(games.find(g => g.id === ${JSON.stringify(id)}), ${JSON.stringify(tab)})`);
});

test('Wappen und Fotos laufen über photoUrl auf WebP', () => {
  assert.equal(run("photoUrl('news-34317.jpg')"), 'assets/news-34317.webp');
  assert.equal(run("photoUrl('assets/club-1.png')"), 'assets/club-1.webp');
  assert.equal(run("photoUrl('https://example.test/a.jpg')"), 'https://example.test/a.jpg');
  assert.match(view("season('games')"), /assets\/club-\d+\.webp/);
});

test('Vereinsseite: alle Stationen, nachvollziehbare Quellen und gültige Sprungziele', () => {
  const out = view('clubPage()');
  for (const chapter of run('clubHistory')) assert.ok(out.includes(`id="club-history-${chapter.id}"`));
  for (const [, target] of out.matchAll(/data-club-jump="([^"]+)"/g)) assert.ok(out.includes(`id="${target}"`), target);
  assert.match(out, /Finalist/);
  assert.match(out, /noch nicht die des Handballteams/);
  assert.match(out, /Quellen & Bildnachweise/);
  assert.match(html, /href="#club" class="club-entry" aria-label="Unser Verein: Geschichte und Erfolge"/);
});

test('Trophäenschrank: Kategorien, Jahresauswahl und historische Verknüpfungen', () => {
  assert.deepEqual(JSON.parse(run('JSON.stringify(clubTrophies.map(t => t.years.length))')), [15,11,16]);
  for (const trophy of run('clubTrophies')) {
    const out = view(`clubTrophyYears('${trophy.id}', ${trophy.years[0]})`);
    assert.equal((out.match(/data-club-year=/g) || []).length, trophy.years.length);
    assert.equal((out.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal(new Set(trophy.years).size, trophy.years.length);
  }
  assert.match(view("clubTrophyYears('cup',1999)"), /data-club-jump="club-history-1999"/);
  assert.match(view("clubTrophyYears('master',1900)"), /<strong>2025<\/strong>/);
});

test('Vereinsnavigation funktioniert nach Kategorie- und Jahreswechsel', () => {
  let handler;
  const panel = {innerHTML: ''};
  let focused = false;
  const categories = ['master','cup','super'].map(id => ({dataset:{clubTrophy:id},setAttribute:(key,value)=>{ if(key==='aria-pressed') categories.find(b=>b.dataset.clubTrophy===id).pressed=value; }}));
  const root = {addEventListener: (name,fn)=>{handler=fn;}, contains:()=>true, querySelectorAll: selector => selector === '.club-trophy' ? categories : []};
  const oldQuery = context.document.querySelector, oldId = context.document.getElementById;
  context.document.querySelector = selector => selector === '.club-page' ? root : {focus:()=>{focused=true;}};
  context.document.getElementById = () => panel;
  try {
    run('setupClubPage()');
    handler({target:{closest:()=>({dataset:{clubTrophy:'cup'}})}});
    assert.match(panel.innerHTML, /Schweizer Cupsieger/);
    assert.equal(categories[1].pressed, 'true');
    handler({target:{closest:()=>({dataset:{clubCategory:'cup',clubYear:'1999'}})}});
    assert.match(panel.innerHTML, /<strong>1999<\/strong>/);
    assert.ok(focused);
  } finally { context.document.querySelector=oldQuery; context.document.getElementById=oldId; }
});

test('Live game opens internal details with verified events and player statistics',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:508373,home:'Kadetten Schaffhausen',away:'Handball Stäfa',league:'QHL',score:[21,14],clock:'30:00',phase:'1. Halbzeit',url:'https://www.handball.ch/de/matchcenter/spiele/508373',details:{ok:true,events:[{id:1,time:'19:36',seconds:1176,action:'Tor',homePlayer:'LUTZ Milan',awayPlayer:null,score:[13,7]}],players:[{id:1,name:'LUTZ Milan',home:true,goals:3,shots:null,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0}]}}};liveRequestFailed=false;lastLiveMatch=liveState.match;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const href=run('liveMatchHref(liveState.match)');assert.match(href,/^#match\//);
 const overview=run('liveMatchPage({id:"live"},"overview")');assert.match(overview,/19:36/);assert.match(overview,/LUTZ Milan/);assert.match(overview,/Spielverlauf/);
 const stats=run('liveMatchPage({id:"live"},"stats")');assert.match(stats,/3\/–/);assert.match(stats,/Toptorschützen/);
 run('liveRequestFailed=true');const stale=run('liveMatchPage({id:"live"},"overview")');assert.match(stale,/Verbindung unterbrochen/);assert.match(stale,/21 : 14/);assert.equal(run('freshLive()'),null);
 run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;liveRequestFailed=false');
});

test('Direct live statistics route works before a local fixture exists',()=>{
 location.hash='#match/live/stats';
 assert.equal(run('verifiedReport(undefined)'),null);
 assert.doesNotThrow(()=>run('liveMatchPage({id:"live"},"stats")'));
 location.hash='';
});

test('Live fixture uses the shared matchday ticker and confirmed completion updates the fixture',()=>{
 run(`globalThis.beforeGames=games;globalThis.testFixture={id:'live-test',date:swissToday(),home:'Kadetten Schaffhausen',away:'Handball Stäfa',league:'QHL',url:'https://kadettensh.ch/',venue:'BBC Arena'};games=[testFixture];liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:508373,home:testFixture.home,away:testFixture.away,league:'QHL',score:[33,23],clock:'44:00',url:'https://www.handball.ch/de/matchcenter/spiele/508373'}};liveRequestFailed=false`);
 const markup=run('card(testFixture,true)');assert.match(markup,/home-matchday games-matchday/);assert.match(markup,/id="live-match"/);assert.match(markup,/#match\/live-test\/overview/);
 run(`applyFinishedMatch({status:'finished',date:swissToday(),home:testFixture.home,away:testFixture.away,score:[45,34],half:[21,14]});liveState.match=null`);
 assert.match(run('card(games[0])'),/45 : 34/);assert.match(run('card(games[0])'),/Rückblick/);
 run('games=beforeGames;liveState=null;liveRequestFailed=false');
});
