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
