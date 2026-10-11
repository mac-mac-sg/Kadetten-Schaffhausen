import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const testDocument=parseHTML('<html><body></body></html>').document;
class DOMParser {parseFromString(html){return parseHTML('<html><body>'+html+'</body></html>').document;}}

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
  DOMParser,
  location,
  navigator: {onLine: true},
  document: {
    hidden: false,
    createElement: tag=>testDocument.createElement(tag),
    createTextNode: text=>testDocument.createTextNode(text),
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

test('Spielerabschnitt zeigt ausschliesslich QHL und alle vorhandenen Feldspielerwerte; beide Tabellen bleiben gleich', () => {
  const saved = run('updateState'), savedLeague = run('tableLeague');
  run("tableLeague='QHL'"); const qhlTable = view("season('table')");
  run("tableLeague='EHL'"); const ehlTable = view("season('table')");
  context.__playerSnapshot = {...saved,
    playerSeason: {players: {6: {goals:67, games:9, goalsPerGame:7.4, fieldGoals:34, sevenMeterGoals:33, yellowCards:0, twoMinutes:0, disqualifications:0}}},
    ehlPlayerSeason: {players: {6: {goals:23}}}};
  try {
    run('updateState=__playerSnapshot');
    const out = view('playerStats(6)');
    assert.match(out, /<span>Tore<\/span><strong>67<\/strong>/);
    assert.match(out, /<span>Feldtore<\/span><strong>34<\/strong>/);
    assert.match(out, /<span>Verwarnungen<\/span><strong>0<\/strong>/);
    assert.doesNotMatch(view('profile(6)'), /data-player-competition|European League|EHF-Werte/);
    assert.match(view('playerStats(12)'), /keine QHL-Saisonstatistik/);
    context.__playerSnapshot.playerSeason = saved?.playerSeason;
    run("tableLeague='QHL'"); assert.equal(view("season('table')"), qhlTable);
    run("tableLeague='EHL'"); assert.equal(view("season('table')"), ehlTable);
  } finally {context.__previousPlayers = saved; run('updateState=__previousPlayers'); context.__previousLeague = savedLeague; run('tableLeague=__previousLeague');}
});

test('Bento: Toranteil ist keine Wurfquote, fehlende Werte bleiben leer und Torhüter erhalten Einsätze', () => {
  const saved = run('updateState');
  const intro = parseHTML(view('profile(6)')).document.querySelector('#profile-intro').outerHTML;
  context.__bento = {playerSeason: {players: {
    6: {goals:67, games:9, goalsPerGame:7.4, fieldGoals:34, sevenMeterGoals:33, yellowCards:0, twoMinutes:0, disqualifications:0},
    1: {games:9, yellowCards:0, twoMinutes:0, disqualifications:0}
  }}};
  try {
    run('updateState=__bento');
    const field = parseHTML(view('playerStats(6)')).document;
    assert.equal(field.querySelector('.bento-primary strong').textContent, '67');
    assert.equal(field.querySelector('.bento-ring').getAttribute('aria-label'), '49 Prozent der Tore durch 7-Meter');
    assert.equal(parseHTML(view('profile(6)')).document.querySelector('#profile-intro').outerHTML, intro);
    const keeper = parseHTML(view('playerStats(1)')).document;
    assert.equal(keeper.querySelector('.bento-primary strong').textContent, '–');
    assert.equal(keeper.querySelector('.player-bento > .bento-metric:nth-child(2) strong').textContent,'9');
    assert.equal(keeper.querySelectorAll('.keeper-metrics strong').length, 3);
    for (const value of keeper.querySelectorAll('.keeper-metrics strong')) assert.equal(value.textContent, '–');
    assert.equal(keeper.querySelector('.bento-ring'), null);
    const missing = parseHTML(view('playerStats(13)')).document;
    assert.equal(missing.querySelector('.bento-primary strong').textContent, '–');
    assert.equal(missing.querySelector('.bento-ring'), null);
    context.__bento.playerSeason.players[6] = {goals:0, games:0, fieldGoals:0, sevenMeterGoals:0};
    assert.match(view('playerStats(6)'), /Noch keine Tore/);
    assert.doesNotMatch(view('playerStats(6)'), /class="bento-ring"/);
    context.__bento.playerSeason.players[6] = {goals:10, fieldGoals:9, sevenMeterGoals:9};
    assert.doesNotMatch(view('playerStats(6)'), /class="bento-ring"/);
  } finally {context.__savedBento = saved; run('updateState=__savedBento');}
});

test('FCSG Bento Performance: Wettbewerb/Saison wechseln nur Statistikwerte, fehlende Minuten erzeugen keine Rate', () => {
  const savedClub = run('activeClub');
  const p = {id:'5426', position:'Mittelfeld', url:'https://www.fcsg.ch/pages/kader/goertler-lukas', seasons:[
    {season:'2026/2027',competition:'Schweizer Pokal',appearances:0,minutes:0,goals:0,assists:0,yellow:0,secondYellow:0,red:0},
    {season:'2026/2027',competition:'Super League',appearances:6,minutes:502,goals:2,assists:1,yellow:3,secondYellow:0,red:0},
    {season:'2026/2027',competition:'UEFA Conference League',appearances:4,minutes:343,goals:1,assists:1,yellow:2,secondYellow:0,red:0},
    {season:'2025/2026',competition:'Super League',appearances:33,minutes:2598,goals:9,assists:6,yellow:10,secondYellow:1,red:1}
  ]};
  context.__fcsgBentoPlayer = p;
  const savedDetails = run("fcsgPlayerDetails.get('5426')");
  run("activeClub='fcsg'; fcsgPlayerDetails.set('5426', __fcsgBentoPlayer); fcsgPlayerStatChoices.delete('5426')");
  const squad = view('fcsgSquad()'), table = view('fcsgStanding()'), facts = view('fcsgPlayerFacts(__fcsgBentoPlayer)');
  const doc = parseHTML(view('fcsgPlayerStats(__fcsgBentoPlayer)')).document;
  const dashboard = doc.querySelector('.fcsg-player-bento');
  const choose = (selector, value) => {
    const select = dashboard.querySelector(selector);
    for(const option of select.querySelectorAll('option')) {
      if(option.getAttribute('value') === value)option.setAttribute('selected','');
      else option.removeAttribute('selected');
    }
    context.__fcsgBentoEvent = {target:select};
    run('changeFcsgPlayerStats(__fcsgBentoEvent)');
  };
  try {
    assert.equal(dashboard.querySelector('[data-fcsg-stat-competition]').value, 'Super League');
    assert.equal(dashboard.querySelector('.fcsg-bento-primary strong').textContent, '502');
    assert.equal(dashboard.querySelector('.fcsg-bento-rate strong').textContent, '0,54');
    choose('[data-fcsg-stat-competition]', 'UEFA Conference League');
    assert.equal(dashboard.querySelector('.fcsg-bento-primary strong').textContent, '343');
    assert.equal(dashboard.querySelector('.fcsg-bento-rate strong').textContent, '0,52');
    choose('[data-fcsg-stat-season]', '2025/2026');
    assert.equal(dashboard.querySelector('[data-fcsg-stat-competition]').value, 'Super League');
    assert.equal(dashboard.querySelectorAll('[data-fcsg-stat-competition] option').length, 1);
    assert.match(dashboard.querySelector('.fcsg-bento-primary strong').textContent, /^2['’]598$/);
    assert.match(view('fcsgPlayerStats(__fcsgBentoPlayer)'), /value="2025\/2026" selected/);
    choose('[data-fcsg-stat-season]', '2026/2027');
    choose('[data-fcsg-stat-competition]', 'Schweizer Pokal');
    assert.equal(dashboard.querySelector('.fcsg-bento-primary strong').textContent, '0');
    assert.equal(dashboard.querySelector('.fcsg-bento-rate strong').textContent, '–');
    p.seasons[0].minutes = null;
    choose('[data-fcsg-stat-competition]', 'Schweizer Pokal');
    assert.equal(dashboard.querySelector('.fcsg-bento-primary strong').textContent, '–');
    assert.equal(view('fcsgSquad()'), squad);
    assert.equal(view('fcsgStanding()'), table);
    assert.equal(view('fcsgPlayerFacts(__fcsgBentoPlayer)'), facts);
    context.__fcsgKeeper = {...p, position:'Tor'};
    assert.match(view('fcsgPlayerStats(__fcsgKeeper)'), /keine Paraden oder Fangquoten/);
    assert.doesNotMatch(view('fcsgPlayerStats(__fcsgKeeper)'), /Paradenquote.*0/);
  } finally {
    context.__savedFcsgBentoClub = savedClub; context.__savedFcsgBentoDetails = savedDetails;
    run("activeClub=__savedFcsgBentoClub; fcsgPlayerStatChoices.delete('5426'); if(__savedFcsgBentoDetails)fcsgPlayerDetails.set('5426',__savedFcsgBentoDetails);else fcsgPlayerDetails.delete('5426')");
  }
});

test('EHL-Vorschau: Gegnerform und Resultate nutzen EHF-Saisondaten im bestehenden Layout, QHL bleibt gleich', () => {
  const saved = run('updateState');
  const qhlBefore = view("formComparison({id:'qhl',league:'QHL',home:'Kadetten Schaffhausen',away:'Handball Stäfa'})");
  try {
    context.__ehl = {ehlRecentGames: {'Chambéry': {ok: true, games: [
      {id:'ehf-2', date:'2026-10-06', home:'CSM Bucuresti', away:'Chambéry', score:[25,33], externalUrl:'https://ehfel.eurohandball.com/men/2026-27/matches/details/2/Teams/'},
      {id:'ehf-1', date:'2026-09-29', home:'HC Izvidac', away:'Chambéry', score:[34,33], externalUrl:'https://ehfel.eurohandball.com/men/2026-27/matches/details/1/Teams/'}
    ]}}};
    run('updateState=__ehl');
    const form = view("formComparison({id:'chambery',league:'EHL',home:'Chambéry',away:'Kadetten Schaffhausen'})");
    assert.match(form, /form-result loss[^>]*>N<\/span>.*form-result win[^>]*>S<\/span>/s);
    const recent = view("recentGamesMarkup({league:'EHL'},'Chambéry')");
    assert.match(recent, /25:33/); assert.match(recent, /34:33/); assert.match(recent, /Quelle: EHF/);
    assert.equal(view("formComparison({id:'qhl',league:'QHL',home:'Kadetten Schaffhausen',away:'Handball Stäfa'})"), qhlBefore);
  } finally { context.__savedEhl = saved; run('updateState=__savedEhl'); }
});

test('Startseite zeigt alle Nachrichten mit Titel', () => {
  const out = view('home()');
  assert.match(out, /story-feed/);
  for (const story of run('stories.slice(0, 5)')) assert.ok(out.includes(story.title), story.title);
});

test('Barrierefreiheit: Startseiten haben genau eine h1, Meldungstitel sind h2', () => {
  const count = (out, tag) => (out.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length;
  const kadetten = view('home()');
  assert.equal(count(kadetten, 'h1'), 1);
  assert.equal(count(kadetten, 'h2'), run('stories.length'));
  run("activeClub='fcsg'");
  try {
    const fcsg = view("fcsgView('home')");
    assert.equal(count(fcsg, 'h1'), 1);
    assert.equal(count(fcsg, 'h2'), run('fcsgData.stories.length'));
  } finally {
    run("activeClub='kadetten'");
  }
});

test('Manipulierter Datenstand erzeugt kein rohes Markup in den Ansichten', () => {
  const X = '<img src=x onerror=PWN>';
  const taint = (o, key) =>
    typeof o === 'string'
      ? ['id', 'date', 'time', 'url', 'image', 'articleVersion', 'logo'].includes(key) || /^\\d/.test(o) ? o : X
      : Array.isArray(o)
        ? o.map(x => taint(x, key))
        : o && typeof o === 'object'
          ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, taint(v, k)]))
          : o;
  context.__saved = run('({games, tables, teamRecords, stories, clubLogos, updateState})');
  context.__hostile = taint(JSON.parse(fs.readFileSync('server/seed.json', 'utf8')));
  try {
    run('setCurrentData(__hostile)');
    const views = [view('home()'), ...['games', 'table', 'squad'].map(t => view(`season('${t}')`))];
    for (const g of run('games')) for (const tab of ['overview', 'squad', 'stats']) views.push(view(`match(games.find(g => g.id === ${JSON.stringify(g.id)}), ${JSON.stringify(tab)})`));
    for (const n of run('stories')) views.push(view(`article(${JSON.stringify(n.id)})`));
    for (const out of views) assert.ok(!out.includes(X), out.slice(Math.max(0, out.indexOf(X) - 60), out.indexOf(X) + 30));
    assert.ok(views[0].includes('&lt;img src=x onerror=PWN&gt;'));
  } finally {
    run('({games, tables, teamRecords, stories, clubLogos, updateState} = __saved)');
  }
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

test('European League live game: Spielzeit als mm:ss, Hinweis ohne Ereignisverlauf, Teamstatistik statt Spielerwerte',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',league:'European League',score:[17,9],clock:'18:47',phase:'1st Half',url:'https://ehfel.eurohandball.com/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/',details:{ok:true,updatedAt:new Date().toISOString(),events:null,players:null,teamStats:{isLive:true,home:{goals:16,shots:19,misses:3,efficiency:84,sevenGoals:0,sevenShots:0,twoMinutes:0,warnings:0,disqualifications:0,technicalFaults:2},guest:{goals:8,shots:18,misses:10,efficiency:44,sevenGoals:2,sevenShots:2,twoMinutes:null,warnings:0,disqualifications:0,technicalFaults:4}}}}};liveRequestFailed=false;lastLiveMatch=liveState.match;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const overview=run('liveMatchPage({id:"live"},"report")');
 assert.match(run('liveMatchPage({id:"live"},"overview")'),/Teamstatistik/);
 assert.match(overview,/1st Half · 18:47</);assert.doesNotMatch(overview,/18:47′/);
 assert.match(overview,/European League liefert die EHF während des Spiels keinen Ereignisverlauf/);assert.match(overview,/KI-Matchbericht/);assert.doesNotMatch(overview,/noch kein Ereignisverlauf/);
 assert.match(overview,/Offiziellen Liveticker öffnen/);
 const stats=run('liveMatchPage({id:"live"},"stats")');
 assert.match(stats,/Teamstatistik/);assert.match(stats,/Wurfquote/);assert.match(stats,/84 %/);assert.match(stats,/2\/2/);assert.match(stats,/Teamwerte der EHF/);assert.doesNotMatch(stats,/keine Spielerstatistiken verfügbar/);
 run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;liveRequestFailed=false');
});

test('European League live game mit Spielerwerten: Tabellen je Team, Paraden nur für Torhüter, Teamstatistik darüber',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',league:'European League',score:[24,11],clock:'35:10',phase:'2nd Half',url:'https://ehfel.eurohandball.com/x',details:{ok:true,updatedAt:new Date().toISOString(),events:null,teamStats:{isLive:true,home:{goals:24,shots:29,misses:5,efficiency:83,sevenGoals:1,sevenShots:1,twoMinutes:0,warnings:0,disqualifications:0,technicalFaults:4},guest:{goals:11,shots:24,misses:13,efficiency:46,sevenGoals:2,sevenShots:2,twoMinutes:1,warnings:0,disqualifications:0,technicalFaults:9}},players:[{id:'a',name:'Leon Bergmann',home:true,goalkeeper:true,goals:0,shots:0,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0,saves:8,savesFaced:17},{id:'b',name:'Max Muster',home:true,goalkeeper:false,goals:5,shots:7,seven:null,sevenShots:null,twoMinutes:1,yellow:1,red:0,saves:0,savesFaced:0},{id:'c',name:'Marko Culjak',home:false,goalkeeper:false,goals:3,shots:4,seven:null,sevenShots:null,twoMinutes:null,yellow:0,red:0,saves:null,savesFaced:null}]}}};liveRequestFailed=false;lastLiveMatch=liveState.match;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const stats=run('liveMatchPage({id:"live"},"stats")');
 assert.match(stats,/Teamstatistik/);assert.match(stats,/83 %/);
 assert.match(stats,/Leon Bergmann/);assert.match(stats,/Max Muster/);assert.match(stats,/Marko Culjak/);assert.match(stats,/Toptorschützen/);assert.match(stats,/<th scope="row">Max Muster<\/th><td>1<\/td><td>1<\/td><td>0<\/td><td>7<\/td><td>5<\/td>/);
 assert.match(stats,/<th scope="col" title="Fangquote">SV%<\/th>/);assert.match(stats,/<td>8<\/td><td>17<\/td><td>47 %<\/td>/);
 assert.match(stats,/<h3>Feldspieler<\/h3>/);assert.match(stats,/<h3>Torhüter<\/h3>/);assert.match(stats,/data-stats-team="home" aria-pressed="true"/);assert.match(stats,/data-stats-team="away" aria-pressed="false"/);assert.match(stats,/data-stats-panel="away" hidden/);
 assert.doesNotMatch(stats,/keine Spielerwerte für dieses Spiel/);assert.doesNotMatch(stats,/keine Spielerstatistiken verfügbar/);
 run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;liveRequestFailed=false');
});

test('European League: bestätigtes Endresultat setzt die Karte auf beendet und zeigt Endstand mit Statistik',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:null,finished:{id:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',league:'European League',score:[42,30],clock:'60:00',phase:'Match ended',status:'finished',date:swissToday(),url:'https://ehfel.eurohandball.com/x',details:{ok:true,updatedAt:new Date().toISOString(),events:null,players:null,teamStats:{isLive:false,home:{goals:42,shots:50,misses:8,efficiency:84,sevenGoals:2,sevenShots:2,twoMinutes:1,warnings:0,disqualifications:0,technicalFaults:5},guest:{goals:30,shots:52,misses:22,efficiency:58,sevenGoals:3,sevenShots:3,twoMinutes:3,warnings:1,disqualifications:0,technicalFaults:11}}}}};liveRequestFailed=false;lastLiveMatch=liveState.finished;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const page=run('liveMatchPage({id:"live"},"stats")');
 assert.match(page,/Spiel beendet/);assert.match(page,/Beendet · Endresultat/);assert.match(page,/42 : 30/);assert.match(page,/Teamstatistik/);assert.match(page,/84 %/);
 run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;liveRequestFailed=false');
});

test('Live game opens internal details with verified events and player statistics',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:508373,home:'Kadetten Schaffhausen',away:'Handball Stäfa',league:'QHL',score:[21,14],clock:'30:00',phase:'1. Halbzeit',url:'https://www.handball.ch/de/matchcenter/spiele/508373',details:{ok:true,events:[{id:1,time:'19:36',seconds:1176,action:'Tor',homePlayer:'LUTZ Milan',awayPlayer:null,score:[13,7]}],players:[{id:1,name:'LUTZ Milan',home:true,goals:3,shots:null,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0}]}}};liveRequestFailed=false;lastLiveMatch=liveState.match;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const href=run('liveMatchHref(liveState.match)');assert.match(href,/^#match\//);
 const overview=run('liveMatchPage({id:"live"},"report")');assert.match(overview,/19:36/);assert.match(overview,/LUTZ Milan/);assert.match(overview,/Spielverlauf/);
 const stats=run('liveMatchPage({id:"live"},"stats")');assert.match(stats,/<td>–<\/td><td>3<\/td>/);assert.match(stats,/Toptorschützen/);
 run('liveRequestFailed=true');const stale=run('liveMatchPage({id:"live"},"report")');assert.match(stale,/Verbindung unterbrochen/);assert.match(stale,/21 : 14/);assert.equal(run('freshLive()'),null);
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
 const markup=run('card(testFixture,true)');assert.match(markup,/home-matchday games-matchday/);assert.match(markup,/id="live-match"/);assert.match(markup,/#match\/live-test\/stats/);
 run(`applyFinishedMatch({status:'finished',date:swissToday(),home:testFixture.home,away:testFixture.away,score:[45,34],half:[21,14]});liveState.match=null`);
 assert.match(run('card(games[0])'),/45 : 34/);assert.match(run('card(games[0])'),/Rückblick/);
 run('games=beforeGames;liveState=null;liveRequestFailed=false');
});

test('Archivierter Rückblick zeigt Balken, Spielerwerte und Torverlauf ohne fehlende Werte als Null zu deuten',()=>{
 run(`globalThis.reportFixture=games.find(g=>g.id==='stgallen'); gameReports.stgallen={gameId:508367,score:reportFixture.score,half:[12,16],checkedAt:'2026-10-04T00:00:00Z',spectators:null,referees:[],source:'https://www.handball.ch/de/matchcenter/spiele/508367',teams:[{id:41571,name:reportFixture.home,shots:48,saves:6,turnovers:9,throwPercentage:52,savePercentage:17,twoMinutes:2,warnings:0,timeouts:3,players:[{id:1,name:'A & B',keeper:false,goals:null,shots:4,seven:0,sevenShots:0,twoMinutes:0,warnings:0,redCards:0}]},{id:41473,name:reportFixture.away,shots:40,saves:14,turnovers:13,throwPercentage:78,savePercentage:36,twoMinutes:3,warnings:0,timeouts:2,players:[{id:2,name:'C',keeper:false,goals:31,shots:40,seven:5,sevenShots:7,twoMinutes:3,warnings:0,redCards:0}]}],events:[{id:1,seconds:90,time:'01:30',score:[1,0],action:'Tor',homePlayer:'A & B'}]};`);
 try{
  const stats=view('reportStats(reportFixture)');assert.match(stats,/report-bars/);assert.match(stats,/Technische Fehler/);assert.match(stats,/A &amp; B/);assert.match(stats,/data-stats-team="home"/);assert.match(stats,/<h3>Feldspieler<\/h3>/);assert.doesNotMatch(stats,/<h3>Torhüter<\/h3>/);assert.doesNotMatch(stats,/Zwischen den Pfosten/);
  const history=view('reportHistory(reportFixture)');assert.match(history,/report-score-chart/);assert.match(history,/01:30/);assert.match(history,/Spielverlauf/);
  assert.match(view("matchOverview(reportFixture)"),/Torverlauf/);
  assert.match(history,/<details class="report-feed"><summary>Spielverlauf<\/summary>/);assert.doesNotMatch(history,/Alle Spielereignisse/);assert.doesNotMatch(history,/<details class="report-feed" open/);
  const overview=view("matchOverview(reportFixture)");
  assert.match(overview,/match-preview-facts/);assert.match(overview,/<span>Spieldatum<\/span>/);assert.match(overview,/<span>Anspielzeit<\/span><strong>[^<]*Beendet<\/strong>/);assert.match(overview,/venue-preview/);
  assert.doesNotMatch(overview,/Offizieller Spielplan|Originalbericht lesen/);
  assert.doesNotMatch(overview,/Schiedsrichter/);
  assert.doesNotMatch(view("matchOverview({...reportFixture,home:'Kadetten Schaffhausen'})"),/data-match-programme/);assert.match(view("matchOverview({...reportFixture,home:'Kadetten Schaffhausen',score:null})"),/data-match-programme/);
  assert.doesNotMatch(stats,/Paradenquote gemäss SHV/);assert.match(stats,/<th scope="col" class="name">Spieler<\/th>/);
 }finally{run('delete gameReports.stgallen;delete globalThis.reportFixture');}
});

test('FCSG: alle News-, Saison-, Spiel- und Spieleransichten ohne Kadetten-Werte',()=>{
 run("activeClub='fcsg'");
 try {
  assert.match(view("fcsgView('home')"),/story-feed/);
  assert.match(view("fcsgView('season','table')"),/Brack Super League/);
  assert.match(view("fcsgView('season','games')"),/game-timeline/);
  const roster=view("fcsgView('season','squad')");assert.equal((roster.match(/class="player-card"/g)||[]).length,run('fcsgData.players.length'));
  for(const p of run('fcsgData.players'))view(`fcsgView('player','${p.id}')`);
  for(const n of run('fcsgData.stories'))view(`fcsgView('news','${n.id}')`);
  for(const g of run('fcsgData.games'))for(const tab of ['overview','squad','stats'])view(`fcsgView('match','${g.id}','${tab}')`);
  run("mode='calendar'");assert.match(view("fcsgView('season','games')"),/calendar-fixture/);
 }finally{run("activeClub='kadetten';mode='list'")}
});

test('FCSG club history reuses the trophy controls with its own years and chapter anchors',()=>{
 run("activeClub='fcsg'");const out=run('fcsgClubPage()');assert.ok(out.includes('Grün-Weisse'));assert.ok(out.includes('Cupsieg 2026'));assert.ok(!out.includes('Kadetten'));
 for(const c of run('fcsgHistory'))assert.ok(out.includes(`id="club-history-${c.id}"`));
 for(const t of run('fcsgTrophies'))for(const year of t.years){const panel=run(`fcsgTrophyYears('${t.id}',${year})`);assert.ok(panel.includes(`aria-pressed="true">${year}</button>`));assert.ok(panel.includes('Diesen Moment entdecken'));}
 run("activeClub='kadetten'");
});
test('FCSG live view shows a provisional score and ticker, separate from completed season results',()=>{
 run("activeClub='fcsg'; fcsgLiveGames.set('458',{...fcsgData.games.find(g=>g.id==='458'),live:true,liveScore:[2,1],phase:'2. Halbzeit',clock:'70′',ticker:[{id:'1',minute:'69',title:'Tor!',html:'<p>Grün-Weiss trifft.</p>'}]})");
 assert.ok(run("fcsgMatch('458','ticker')").includes('Grün-Weiss trifft.'));
 assert.ok(run("fcsgCard(fcsgGame('458'))").includes('2 : 1'));
 assert.equal(run("fcsgData.games.find(g=>g.id==='458').score"),null);
 assert.ok(run("fcsgLiveState(fcsgGame('458'))").includes('JETZT LIVE'));
 run("fcsgLiveGames.clear();activeClub='kadetten'");
});

test('European League: gesicherter Endstand erscheint wie ein abgeschlossenes QHL-Spiel (Blueprint)',()=>{
 run(`ehfArchive={izvidac:{fixtureId:'izvidac',matchId:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',score:[42,30],half:[23,11],spectators:1145,checkedAt:'2026-10-06T20:06:00Z',source:{url:'https://ehfel.eurohandball.com/x'},
  report:{headline:'Kadetten ziehen früh davon',paragraphs:['Unsere Kadetten gewinnen 42:30 und führen zur Pause 23:11.','Nach dem Rückstand zu Beginn folgten viele Tore in Folge.'],generator:'ki',generatedAt:new Date().toISOString()},
  goals:[{t:'1:00',s:[0,1],h:false,n:'Mile Lasic',p:false},{t:'1:37',s:[1,1],h:true,n:'Luka Maros',p:true},{t:'2:20',s:[2,1],h:true,n:'Luka Maros',p:false}],
  timeouts:[{side:'away',sec:210}],suspensions:[{side:'away',sec:330,name:'Mihael Bebek'}],
  teamStats:{home:{goals:42,shots:54,misses:12,efficiency:78,sevenGoals:1,sevenShots:1,twoMinutes:0,warnings:0,disqualifications:0,technicalFaults:9},guest:{goals:30,shots:49,misses:19,efficiency:61,sevenGoals:4,sevenShots:4,twoMinutes:4,warnings:1,disqualifications:0,technicalFaults:14}},
  players:[{id:'a',number:'20',name:'Luka Maros',home:true,goalkeeper:false,goals:7,shots:8,seven:1,sevenShots:1,twoMinutes:0,yellow:0,red:0,saves:null,savesFaced:null},{id:'g',number:'1',name:'Leon Bergmann',home:true,goalkeeper:true,goals:0,shots:0,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0,saves:12,savesFaced:27},{id:'g2',number:'30',name:'Reservetorhüter',home:true,goalkeeper:true,goals:0,shots:0,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0,saves:0,savesFaced:0},{id:'b',number:'24',name:'Mile Lasic',home:false,goalkeeper:false,goals:6,shots:9,seven:null,sevenShots:null,twoMinutes:1,yellow:1,red:0,saves:null,savesFaced:null}]}};
  globalThis.__g={id:'izvidac',league:'EHL',home:'Kadetten Schaffhausen',away:'HC Izvidac',date:'2026-10-06',time:'18:45',venue:'BBC Arena',url:'https://kadettensh.ch/matchcenter/',score:[42,30],half:[23,11]};gameReports.izvidac=ehfAsReport(ehfArchive.izvidac)`);
 try{
  const stats=run('match(__g,"stats")');
  assert.match(stats,/Das Spiel in Zahlen/);assert.match(stats,/Auszeiten/);assert.match(stats,/1\. Halbzeit/);
  assert.match(stats,/<th scope="col" class="name">Spieler<\/th><th scope="col">Tore\/ Würfe<\/th><th scope="col">Quote<\/th><th scope="col">7 m<\/th><th scope="col">2 min<\/th><th scope="col">Gelb<\/th><th scope="col">Rot<\/th>/);
  assert.doesNotMatch(stats,/<th scope="col" class="num">#/);
  assert.match(stats,/<h3>Feldspieler<\/h3>/);assert.match(stats,/<h3>Zwischen den Pfosten<\/h3>/);
  assert.match(stats,/Leon Bergmann(<\/a>)?<\/span><strong>12 Paraden<\/strong><p class="muted nowrap">44[.,]4 % Fangquote/);
  assert.doesNotMatch(stats,/Reservetorhüter/);
  assert.match(stats,/data-stats-team="home" aria-pressed="true"/);assert.match(stats,/data-stats-panel="away" hidden/);
  assert.doesNotMatch(stats,/Quelle & Datenstand|Zweite Halbzeit aus/);
  const report=run('match(__g,"report")');
  assert.match(report,/KI-Matchbericht/);assert.match(report,/Kadetten ziehen früh davon/);
  assert.match(report,/match-preview-facts/);assert.match(report,/<span>Zuschauer<\/span><strong>1[’'.,]?145<\/strong>/);assert.doesNotMatch(report,/Offizieller Spielplan|Schiedsrichter/);
  assert.match(report,/Torverlauf/);assert.match(report,/<details class="report-feed"><summary>Spielverlauf<\/summary>/);
  assert.match(report,/Zeitstrafe/);assert.match(report,/Mihael Bebek/);assert.match(report,/Time-out/);assert.match(report,/Tor \(Siebenmeter\)/);
  assert.doesNotMatch(report,/Torfolge \(/);
  // Auch am Spieltag ersetzt die Blueprint-Ansicht die Live-Seite, sobald der Eintrag da ist.
  run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:null,finished:{id:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',league:'European League',score:[42,30],status:'finished',date:swissToday(),url:'https://x',details:{ok:true,teamStats:null,players:null}}};lastLiveMatch=liveState.finished;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday();__g.date=swissToday()`);
  assert.doesNotMatch(run('match(__g,"stats")'),/live-match-page/);
  run('delete gameReports.izvidac');
  assert.match(run('match(__g,"stats")'),/live-match-page/);
  // Abweichender Endstand: der gesicherte Eintrag wird nicht verwendet.
  run('gameReports.izvidac=ehfAsReport(ehfArchive.izvidac);__g.score=[41,30]');
  assert.doesNotMatch(run('match(__g,"report")'),/Kadetten ziehen früh davon/);
 }finally{run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;delete gameReports.izvidac;ehfArchive={};liveStatsTeam=null');}
});

test('Beendete QHL-Spiele: Statistik zuerst, Rückblick im zweiten Tab',()=>{
 run(`globalThis.__q={id:'qhl-test',league:'QHL',home:'Kadetten Schaffhausen',away:'Handball Stäfa',date:'2026-10-03',time:'18:00',venue:'BBC Arena',url:'https://kadettensh.ch/matchcenter/',score:[45,34],half:[21,14]}`);
 const open=run('match(__q,"overview")');
 assert.match(open,/Endresultat/);assert.ok(open.indexOf('>Statistik<')<open.indexOf('>Rückblick<'));
 assert.match(open,/#match\/qhl-test\/report/);assert.doesNotMatch(open,/Aufgebot/);assert.match(run('match(__q,"squad")'),/Endresultat/);
 assert.match(run('match(__q,"report")'),/Der Rückblick/);
 run('globalThis.__q.score=null');
 assert.match(run('match(__q,"overview")'),/>Vorschau</);
});

test('Statistik abgeschlossener QHL-Spiele: Mannschaftswahl, Feldspieler mit Tore/Würfe, Quote, 7 m, Gelb, Rot; Torhüter als Kacheln «Zwischen den Pfosten»',()=>{
 run(`globalThis.__r=games.find(g=>g.id==='stgallen'); gameReports.stgallen={gameId:508367,score:__r.score,half:[12,16],checkedAt:'2026-10-04T00:00:00Z',spectators:null,referees:[],source:'https://www.handball.ch/de/matchcenter/spiele/508367',teams:[{id:41571,name:__r.home,shots:48,saves:6,turnovers:9,throwPercentage:52,savePercentage:17,twoMinutes:2,warnings:0,timeouts:3,players:[{id:1,name:'MUSTER Max',keeper:false,goals:5,shots:8,seven:1,sevenShots:2,twoMinutes:1,warnings:1,redCards:0},{id:3,name:'KEEPER Karl',keeper:true,goals:0,shots:0,seven:0,sevenShots:0,twoMinutes:0,warnings:0,redCards:0,saves:6,keeperShots:20}]},{id:41473,name:__r.away,shots:40,saves:14,turnovers:13,throwPercentage:78,savePercentage:36,twoMinutes:3,warnings:0,timeouts:2,players:[{id:2,name:'C',keeper:false,goals:31,shots:40,seven:5,sevenShots:7,twoMinutes:3,warnings:0,redCards:0}]}],events:[]};liveStatsTeam=null`);
 try{
  const stats=view('reportStats(__r)');
  const field=stats.slice(stats.indexOf('<h3>Feldspieler</h3>'),stats.indexOf('<h3>Zwischen den Pfosten</h3>'));
  assert.match(field,/MUSTER Max/);assert.doesNotMatch(field,/KEEPER Karl/);
  assert.match(field,/<th scope="col">Tore\/ Würfe<\/th><th scope="col">Quote<\/th><th scope="col">7 m<\/th><th scope="col">2 min<\/th><th scope="col">Gelb<\/th><th scope="col">Rot<\/th>/);
  assert.match(field,/<td>5\/8<\/td><td>62[.,]5 %<\/td><td>1\/2<\/td><td>1<\/td><td>1<\/td><td>0<\/td>/);
  assert.doesNotMatch(stats,/gehaltene Siebenmeter/);
  assert.match(stats,/<h3>Zwischen den Pfosten<\/h3><div class="facts"><div><span>KEEPER Karl<\/span><strong>6 Paraden<\/strong><p class="muted nowrap">30 % Fangquote<\/p>/);
  assert.doesNotMatch(stats,/Quelle &amp; Datenstand|Quelle & Datenstand/);
  assert.doesNotMatch(stats,/Zweite Halbzeit aus End- und Halbzeitstand berechnet/);assert.doesNotMatch(stats,/Siebenmeter-Tore\/Versuche/);assert.doesNotMatch(stats,/<h4>/);
  assert.doesNotMatch(stats,/<h3>Torhüter<\/h3>/);
  assert.match(stats,/data-stats-team="away"/);assert.match(stats,/data-stats-panel="(home|away)" hidden/);
  assert.match(stats,/Das Spiel in Zahlen/);assert.match(stats,/1\. Halbzeit/);
 }finally{run('delete gameReports.stgallen;delete globalThis.__r');}
});

test('Router kennt den Tab «report»',()=>{
 assert.match(fs.readFileSync('src/client/js/router.js','utf8'),/\['overview', 'report', 'squad', 'stats'\]\.includes\(tab\)/);
});

test('European-League-Tabelle: Siege, Unentschieden und Niederlagen folgen aus Spielen und Punkten', () => {
  run(`tableLeague = 'EHL'; tables.EHL = [['Kadetten Schaffhausen',2,81,62,4],['Chambery Savoie Mont Blanc HB',2,66,59,2],['HC Izvidac',2,64,75,2],['CSM Bucuresti',2,57,72,0]]`);
  try {
    const bars = name => run(`recordBar(${JSON.stringify(name)}, 2)`).match(/\d+ S · \d+ U · \d+ N/)[0];
    assert.equal(bars('Kadetten Schaffhausen'), '2 S · 0 U · 0 N');
    assert.equal(bars('Chambery Savoie Mont Blanc HB'), '1 S · 0 U · 1 N');
    assert.equal(bars('HC Izvidac'), '1 S · 0 U · 1 N');
    assert.equal(bars('CSM Bucuresti'), '0 S · 0 U · 2 N');
  } finally {
    run(`tableLeague = 'QHL'`);
  }
});

test('FCSG arena pulse uses confirmed kickoff and lights its crest at home and away',()=>{
 const saved=run('fcsgFixture');
 try {
  for(const away of [false,true]){
   context.pulseFixture={id:'pulse-test',date:'2099-10-10',time:'18:00',confirmed:true,league:'Super League',home:away?'FC Zürich':'FC St. Gallen 1879',away:away?'FC St. Gallen 1879':'FC Zürich'};
   run('fcsgFixture=()=>pulseFixture');
   const markup=run('fcsgMatchday()');
   assert.match(markup,/data-pulse="distant"/);
   assert.equal((markup.match(/class="arena-team"/g)||[]).length,1);
   assert.match(markup,/class="arena-team">[\s\S]*?St. Gallen/);
  }
  run('pulseFixture.confirmed=false');assert.equal(run('fcsgPulsePhase(pulseFixture)'), 'quiet');
  run('pulseFixture.score=[2,1]');assert.equal(run('fcsgPulsePhase(pulseFixture)'), 'off');
  run('pulseFixture.live=true');assert.equal(run('fcsgPulsePhase(pulseFixture)'), 'live');
 } finally { context.savedPulseFixture=saved;run('fcsgFixture=savedPulseFixture');delete context.pulseFixture;delete context.savedPulseFixture; }
});


test('Glas-Torverlauf beginnt bei 0:0, wird geglättet und ordnet Farben auch auswärts korrekt zu', () => {
 context.chartGame={id:'chart-test',home:'Kadetten Schaffhausen',away:'A & B'};
 context.chartReport={score:[3,2],teams:[{id:41473},{id:41571}],events:[
  {id:4,seconds:3000,score:[3,2]}, {id:2,seconds:1200,score:[1,1]},
  {id:1,seconds:600,score:[1,0]}, {id:3,seconds:1800,score:[2,1]}
 ]};
 try {
  const doc=parseHTML(view('reportScoreChart(chartGame,chartReport)')).document;
  const lines=doc.querySelectorAll('.chart-line');
  assert.equal(lines.length,2);
  assert.match(lines[0].getAttribute('d'),/^M36 182 C/);
  assert.match(lines[0].getAttribute('d'),/93\.33 166 C/);
  assert.match(lines[0].getAttribute('d'),/208 150 C/);
  assert.match(lines[0].getAttribute('d'),/380 134$/);
  assert.match(lines[1].getAttribute('d'),/^M36 182 C/);
  assert.match(lines[1].getAttribute('d'),/150\.67 166 C/);
  assert.match(lines[1].getAttribute('d'),/380 150$/);
  assert.match(doc.querySelector('.report-score-caption').textContent,/Geglätteter Verlauf/);
  assert.ok(lines[0].classList.contains('chart-kadetten'));
  assert.ok(lines[1].classList.contains('chart-opponent'));
  assert.equal(doc.querySelectorAll('.chart-area').length,2);
  for(const line of lines){
   const gradientId=line.getAttribute('style').match(/url\(#([^)]*)\)/)[1];
   const gradient=doc.getElementById(gradientId);
   assert.equal(gradient.getAttribute('x2'),'1');
   assert.equal(gradient.querySelectorAll('stop').length,2);
  }
  assert.equal(doc.getElementById('report-score-chart-test-0').querySelector('stop').getAttribute('stop-opacity'),'.38');
  assert.equal(doc.querySelectorAll('.chart-end').length,2);
  assert.match(doc.querySelector('svg').textContent,/30′ · Pause/);
  assert.equal(doc.querySelectorAll('.report-score-team')[1].textContent,'A & B2Tore');
  context.chartReport.teams.reverse();
  const away=parseHTML(view('reportScoreChart(chartGame,chartReport)')).document;
  assert.ok(away.querySelectorAll('.chart-line')[1].classList.contains('chart-kadetten'));
  context.chartReport.events=[];
  assert.equal(run('reportScoreChart(chartGame,chartReport)'), '');
  context.chartReport.events=[{id:1,seconds:1200,score:[1,0]}];
  const partial=parseHTML(view('reportScoreChart(chartGame,chartReport)')).document;
  assert.match(partial.querySelector('.report-score-caption').textContent,/Torfolge unvollständig/);
  assert.match(partial.querySelector('.chart-line').getAttribute('d'),/^M36 182 C.*150\.67 166$/);
  context.chartReport.events=[{id:1,seconds:4500,score:[3,2]}];
  assert.match(view('reportScoreChart(chartGame,chartReport)'),/75′/);
 } finally {delete context.chartGame;delete context.chartReport;}
});


test('Geglättete Torkurven überschwingen nicht, bleiben monoton und verarbeiten gleiche Zeitpunkte', () => {
 const points=[{x:0,y:100},{x:1,y:98},{x:2,y:50},{x:4,y:50},{x:5,y:49},{x:10,y:0}];
 context.curvePoints=points;
 try {
  const curve=run('reportScoreCurve(curvePoints)');
  const segments=[...curve.matchAll(/C([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)/g)];
  assert.equal(segments.length,points.length-1);
  segments.forEach((segment,i)=>{
   const [,x1,y1,x2,y2,x3,y3]=segment.map(Number), a=points[i], b=points[i+1];
   assert.equal(x3,b.x);assert.equal(y3,b.y);
   let previous=a.y;
   for(let step=0;step<=100;step++){
    const t=step/100,u=1-t,v=u*u*u*a.y+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
    assert.ok(v<=a.y+1e-9&&v>=b.y-1e-9);
    assert.ok(v<=previous+1e-9);previous=v;
   }
   assert.ok(x1>=a.x&&x2<=b.x);
  });
  context.curvePoints=[{x:0,y:100},{x:1,y:90},{x:1,y:80},{x:2,y:70}];
  assert.doesNotMatch(run('reportScoreCurve(curvePoints)'),/NaN|Infinity/);
  assert.equal(run('reportScoreCurve([])'), '');
 } finally {delete context.curvePoints;}
});


test('Spieler-Verläufe nutzen nur bestätigte QHL-Berichte und gewichten Fangquoten nach Würfen', () => {
 const saved={state:run('updateState'),games:run('games'),reports:run('gameReports')};
 const fixtures=Array.from({length:6},(_,i)=>({id:'recent-'+i,date:'2026-09-'+String(10+i).padStart(2,'0'),league:'QHL',home:'Kadetten Schaffhausen',away:'Gegner',score:[30,20]}));
 context.__recentFixtures=[...fixtures,{...fixtures[5],id:'ehf-recent',league:'EHL'}];
 context.__recentState={playerSeason:{players:{1:{shvPlayerId:101,games:9},6:{shvPlayerId:106,games:9,goals:67,fieldGoals:34,sevenMeterGoals:33,goalsPerGame:7.4}}}};
 context.__recentReports=Object.fromEntries(fixtures.map((g,i)=>[g.id,{score:[30,20],teams:[{id:41473,players:[{id:101,saves:i===5?10:2,keeperShots:i===5?20:10,sevenSaves:null},{id:106,goals:i,shots:i+2}]},{id:5,players:[]}]}]));
 // One unavailable report and one corrected score must both remain gaps.
 delete context.__recentReports['recent-2'];context.__recentReports['recent-3'].score=[31,20];
 try {
  run('updateState=__recentState;games=__recentFixtures;gameReports=__recentReports');
  const keeper=parseHTML(view('playerStats(1)')).document;
  assert.equal(keeper.querySelector('.bento-primary strong').textContent,'35 %'); // (2+2+10)/(10+10+20)
  assert.match(keeper.querySelector('.bento-primary small').textContent,/3 von 5/);
  assert.equal(keeper.querySelectorAll('.player-mini-bars a').length,5);
  assert.equal(keeper.querySelectorAll('.player-mini-bars .is-missing').length,2);
  assert.equal(keeper.querySelector('.keeper-metrics .bento-metric strong').textContent,'14');
  assert.equal(keeper.querySelector('.keeper-metrics .bento-metric:nth-child(3) strong').textContent,'–');
  const field=parseHTML(view('playerStats(6)')).document;
  assert.equal(field.querySelector('.bento-primary strong').textContent,'67');
  assert.equal(field.querySelector('.player-form-panel .keeper-metrics .bento-metric:nth-child(3) strong').textContent,'62,5 %');
  assert.doesNotMatch(field.querySelector('.player-mini-bars').outerHTML,/recent-0|ehf-recent/);
  const first=field.querySelector('.player-mini-bars a');
  assert.equal(first.getAttribute('href'),'#match/recent-1/stats');
  context.__recentReports['recent-1'].teams[0].players[1].goals=0;
  assert.equal(parseHTML(view('playerStats(6)')).document.querySelector('.player-mini-bars a span').textContent,'0');
  assert.equal(run("playerMiniBars([{game:games[0],player:null}], 'goals', 'Tore')"),'');
 } finally {context.__restoreRecent=saved;run('updateState=__restoreRecent.state;games=__restoreRecent.games;gameReports=__restoreRecent.reports');}
});

test('FCSG verbindet Tore, Vorlagen und 90-Minuten-Wert im Offensivblock und zeichnet keine erfundene Form', () => {
 context.__offensePlayer={position:'Mittelfeld'};context.__offenseRow={minutes:450,appearances:5,goals:2,assists:1,yellow:0,secondYellow:0,red:0};
 const doc=parseHTML(view('fcsgPlayerBento(__offensePlayer,__offenseRow)')).document;
 assert.equal(doc.querySelector('.fcsg-bento-offense h3').textContent,'Offensivbeitrag');
 assert.equal(doc.querySelector('.fcsg-bento-offense .fcsg-bento-rate strong').textContent,'0,60');
 assert.equal(doc.querySelectorAll('.fcsg-bento-offense .fcsg-bento-duo strong').length,2);
 assert.equal(doc.querySelector('.player-mini-bars'),null);
 assert.match(doc.querySelector('.fcsg-bento-note').textContent,/Einzelspielverläufe sind nicht verfügbar/);
 delete context.__offensePlayer;delete context.__offenseRow;
});

test('Spielerberichte laden nur letzte QHL-Spiele, bewahren gültige Berichte bei Fehlern und überschreiben keine andere Seite', async () => {
 const saved={club:run('activeClub'),games:run('games'),reports:run('gameReports'),hash:location.hash,fetch:context.apiFetch,get:context.document.getElementById};
 const fixture={id:'load-recent',date:'2026-09-30',league:'QHL',home:'Kadetten Schaffhausen',away:'Gegner',score:[30,20]};
 const original={score:[30,20],teams:[{id:41473,name:fixture.home,players:[]},{id:5,name:fixture.away,players:[]}]};
 context.__loadFixtures=[fixture,{...fixture,id:'load-ehf',league:'EHL'}];context.__loadReports={'load-recent':original};
 context.AbortSignal=AbortSignal;
 const target={innerHTML:'unchanged'},calls=[];
 context.document.getElementById=()=>target;
 try {
  run("activeClub='kadetten';games=__loadFixtures;gameReports=__loadReports;playerReportAttempts.clear()");location.hash='#player/6';
  context.apiFetch=async url=>{calls.push(url);return {ok:true,json:async()=>({report:{...original,score:[99,20]}})}};
  await run('loadPlayerReports()');
  assert.deepEqual(calls,['/api/reports/load-recent']);
  assert.equal(run("gameReports['load-recent']"),original);
  assert.match(target.innerHTML,/QHL · Saisonwerte/);
  await run('loadPlayerReports()');assert.equal(calls.length,1);
  run('playerReportAttempts.clear()');target.innerHTML='another page';
  context.apiFetch=async()=>{location.hash='#season/squad';throw Error('offline')};location.hash='#player/6';
  await run('loadPlayerReports()');assert.equal(target.innerHTML,'another page');
  run("activeClub='fcsg';playerReportAttempts.clear()");location.hash='#player/6';
  await run('loadPlayerReports()');assert.equal(calls.length,1);
 } finally {context.__restoreLoader=saved;run('activeClub=__restoreLoader.club;games=__restoreLoader.games;gameReports=__restoreLoader.reports;playerReportAttempts.clear()');location.hash=saved.hash;context.apiFetch=saved.fetch;context.document.getElementById=saved.get;}
});

test('FCSG match dashboard presents source momentum, all statistic sections and null values without misleading bars',()=>{
 context.__dashboard={id:'458',home:'FC St.Gallen 1879',away:'FC Lausanne-Sport',score:[1,0],homeStats:{possessionPercentage:41.3,totalScoringAtt:14,shotOffTarget:7,totalCross:11},awayStats:{possessionPercentage:58.7,totalScoringAtt:9,shotOffTarget:3,totalCross:25},momentum:[{period:1,minute:47,value:.02},{period:2,minute:46,value:-.01}]};
 const doc=parseHTML(view('fcsgTeamStats(__dashboard)')).document;
 assert.deepEqual([...doc.querySelectorAll('h2')].map(e=>e.textContent),['Torgefährlichkeit','Hauptstatistiken','Schüsse','Pässe','Strafen']);
 assert.match(doc.querySelector('svg').getAttribute('aria-label'),/oberhalb.*unterhalb/);
 assert.match(doc.querySelector('.fcsg-match-dashboard, .fcsg-lineup-dashboard').textContent,/kein xG-Wert/);assert.match(doc.querySelector('.fcsg-match-dashboard, .fcsg-lineup-dashboard').textContent,/41[,.]3%/);assert.equal(doc.querySelectorAll('.fcsg-stat-row').length,15);
 assert.match(view("fcsgStatRow(__dashboard,'Pfostenschüsse','hitWoodwork')"),/is-empty/);
 assert.match(view("fcsgMomentum({...__dashboard,momentum:[]})"),/noch kein Opta-Verlauf/);
 assert.equal(doc.querySelectorAll('details tbody tr').length,2);
});
test('FCSG lineup renders a switchable pitch, bench, coach and verified event badges with escaped names',()=>{
 context.__lineupGame={id:'458',home:'FC St.Gallen 1879',away:'FC Lausanne-Sport',homeLineup:{formation:'3142',coach:{name:'Enrico Maassen'},players:[{name:'Lawrence Zigi',shortName:'Zigi',number:1,position:'Goalkeeper',bench:false},{name:'Jozo <Stanic>',shortName:'<Stanic>',eventName:'J. Stanić',number:4,position:'Defender',side:'Centre',bench:false},{name:'Carlo Boukhalfa',eventName:'C. Boukhalfa',number:11,bench:true}]},awayLineup:null,events:[{type:'Gelb',minute:10,player:'J. Stanić',home:true}],substitutions:[{minute:46,on:'C. Boukhalfa',off:'J. Stanić',home:true}]};
 const doc=parseHTML(view('fcsgLineups(__lineupGame)')).document;
 assert.equal(doc.querySelectorAll('button').length,2);assert.equal(doc.querySelector('button').getAttribute('aria-pressed'),'true');assert.equal(doc.querySelectorAll('.fcsg-pitch-row').length,2);assert.equal(doc.querySelectorAll('.fcsg-bench li').length,1);assert.match(doc.querySelector('.fcsg-match-dashboard, .fcsg-lineup-dashboard').textContent,/Enrico Maassen/);assert.match(doc.querySelector('.fcsg-match-dashboard, .fcsg-lineup-dashboard').textContent,/Gelb 10′/);assert.match(doc.querySelector('.fcsg-match-dashboard, .fcsg-lineup-dashboard').textContent,/↑ 46′/);assert.equal(doc.querySelector('Stanic'),null);
 run("fcsgLineupChoices.set('458',false)");assert.match(view('fcsgLineups(__lineupGame)'),/Aufstellung noch nicht veröffentlicht/);run('fcsgLineupChoices.clear()');
});
