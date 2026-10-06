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
 const overview=run('liveMatchPage({id:"live"},"overview")');
 assert.match(overview,/1st Half · 18:47</);assert.doesNotMatch(overview,/18:47′/);
 assert.match(overview,/European League liefert die EHF keinen Ereignisverlauf/);assert.doesNotMatch(overview,/noch kein Ereignisverlauf/);
 assert.match(overview,/Offiziellen Liveticker öffnen/);
 const stats=run('liveMatchPage({id:"live"},"stats")');
 assert.match(stats,/Teamstatistik/);assert.match(stats,/Wurfquote/);assert.match(stats,/84 %/);assert.match(stats,/2\/2/);assert.match(stats,/Teamwerte der EHF/);assert.doesNotMatch(stats,/keine Spielerstatistiken verfügbar/);
 run('liveState=null;lastLiveMatch=null;lastLiveAt=null;lastLiveDate=null;liveRequestFailed=false');
});

test('European League live game mit Spielerwerten: Tabellen je Team, Paraden nur für Torhüter, Teamstatistik darüber',()=>{
 run(`liveState={ok:true,checkedAt:new Date().toISOString(),match:{id:'202711020901029',home:'Kadetten Schaffhausen',away:'HC Izvidac',league:'European League',score:[24,11],clock:'35:10',phase:'2nd Half',url:'https://ehfel.eurohandball.com/x',details:{ok:true,updatedAt:new Date().toISOString(),events:null,teamStats:{isLive:true,home:{goals:24,shots:29,misses:5,efficiency:83,sevenGoals:1,sevenShots:1,twoMinutes:0,warnings:0,disqualifications:0,technicalFaults:4},guest:{goals:11,shots:24,misses:13,efficiency:46,sevenGoals:2,sevenShots:2,twoMinutes:1,warnings:0,disqualifications:0,technicalFaults:9}},players:[{id:'a',name:'Leon Bergmann',home:true,goalkeeper:true,goals:0,shots:0,seven:null,sevenShots:null,twoMinutes:0,yellow:0,red:0,saves:8,savesFaced:17},{id:'b',name:'Max Muster',home:true,goalkeeper:false,goals:5,shots:7,seven:null,sevenShots:null,twoMinutes:1,yellow:1,red:0,saves:0,savesFaced:0},{id:'c',name:'Marko Culjak',home:false,goalkeeper:false,goals:3,shots:4,seven:null,sevenShots:null,twoMinutes:null,yellow:0,red:0,saves:null,savesFaced:null}]}}};liveRequestFailed=false;lastLiveMatch=liveState.match;lastLiveAt=liveState.checkedAt;lastLiveDate=swissToday()`);
 const stats=run('liveMatchPage({id:"live"},"stats")');
 assert.match(stats,/Teamstatistik/);assert.match(stats,/83 %/);
 assert.match(stats,/Leon Bergmann/);assert.match(stats,/Max Muster/);assert.match(stats,/Marko Culjak/);assert.match(stats,/Toptorschützen/);assert.match(stats,/5\/7/);
 assert.match(stats,/<th scope="col">Paraden<\/th>/);assert.match(stats,/<td>8\/17<\/td>/);
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

test('Archivierter Rückblick zeigt Balken, Spielerwerte und Torverlauf ohne fehlende Werte als Null zu deuten',()=>{
 run(`globalThis.reportFixture=games.find(g=>g.id==='stgallen'); gameReports.stgallen={gameId:508367,score:reportFixture.score,half:[12,16],checkedAt:'2026-10-04T00:00:00Z',spectators:null,referees:[],source:'https://www.handball.ch/de/matchcenter/spiele/508367',teams:[{id:41571,name:reportFixture.home,shots:48,saves:6,turnovers:9,throwPercentage:52,savePercentage:17,twoMinutes:2,warnings:0,timeouts:3,players:[{id:1,name:'A & B',keeper:false,goals:null,shots:4,seven:0,sevenShots:0,twoMinutes:0,warnings:0,redCards:0}]},{id:41473,name:reportFixture.away,shots:40,saves:14,turnovers:13,throwPercentage:78,savePercentage:36,twoMinutes:3,warnings:0,timeouts:2,players:[{id:2,name:'C',keeper:false,goals:31,shots:40,seven:5,sevenShots:7,twoMinutes:3,warnings:0,redCards:0}]}],events:[{id:1,seconds:90,time:'01:30',score:[1,0],action:'Tor',homePlayer:'A & B'}]};`);
 try{
  const stats=view('reportStats(reportFixture)');assert.match(stats,/report-bars/);assert.match(stats,/Technische Fehler/);assert.match(stats,/A &amp; B/);assert.match(stats,/–\/4<\/td><td>–/);
  const history=view('reportHistory(reportFixture)');assert.match(history,/report-score-chart/);assert.match(history,/01:30/);assert.match(history,/Spielverlauf/);
  assert.match(view("matchOverview(reportFixture)"),/Torverlauf/);
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
