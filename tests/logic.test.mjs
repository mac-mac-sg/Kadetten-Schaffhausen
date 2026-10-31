import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lädt js/logic.js in einer leeren Umgebung mit festgelegter Uhrzeit.
function logic(nowIso, games = []) {
  const NOW = Date.parse(nowIso);
  class FixedDate extends Date {
    constructor(...args) {
      args.length ? super(...args) : super(NOW);
    }
    static now() {
      return NOW;
    }
  }
  const context = {Date: FixedDate, Intl, games, liveState: null, offlineData: false, navigator: {onLine: true}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/client/js/logic.js', 'utf8'), context);
  return context;
}
const game = (date, time, extra = {}) => ({
  id: date + time,
  date,
  time,
  home: 'Kadetten Schaffhausen',
  away: 'Handball Stäfa',
  league: 'QHL',
  ...extra
});

test('Spieltag wird nach Zürcher Zeit bestimmt, nicht nach UTC', () => {
  assert.equal(logic('2026-10-03T12:00:00Z').swissToday(), '2026-10-03');
  // 22:30 UTC ist in Zürich (Sommerzeit) schon 00:30 des Folgetags
  assert.equal(logic('2026-10-03T22:30:00Z').swissToday(), '2026-10-04');
});

test('Anpfiffzeit berücksichtigt Sommer- und Winterzeit', () => {
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.kickoffAt(game('2026-10-03', '18:00')).toISOString(), '2026-10-03T16:00:00.000Z');
  assert.equal(l.kickoffAt(game('2026-12-05', '18:00')).toISOString(), '2026-12-05T17:00:00.000Z');
  assert.equal(l.kickoffAt(game('2026-10-03', undefined)), null);
});

test('Countdown zeigt Minuten, Stunden und die Zustände nach dem Anpfiff', () => {
  const g = game('2026-10-03', '18:00'); // 16:00 UTC
  const at = iso => logic(iso).countdownText(g, new Date(iso));
  assert.equal(at('2026-10-03T15:29:55Z'), 'Anpfiff in 30:05');
  assert.equal(at('2026-10-03T14:00:00Z'), 'Anpfiff in 02:00:00');
  assert.equal(at('2026-10-03T16:00:01Z'), 'Anspielzeit erreicht · Live-Status wird geprüft');
  assert.equal(logic('2026-10-03T12:00:00Z').countdownText(game('2026-10-03', undefined)), 'Anspielzeit noch offen');
  const offline = logic('2026-10-03T12:00:00Z');
  offline.offlineData = true;
  assert.equal(offline.countdownText(g, new Date('2026-10-03T16:30:00Z')), 'Live-Status offline nicht verfügbar');
});

test('Countdown wird nur in der letzten Stunde vor dem Anpfiff "bald"', () => {
  const g = game('2026-10-03', '18:00');
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T15:01:00Z')), true);
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T14:59:00Z')), false);
  assert.equal(l.countdownSoon(g, new Date('2026-10-03T16:00:01Z')), false);
  assert.equal(l.countdownSoon(game('2026-10-03', undefined), new Date('2026-10-03T15:30:00Z')), false);
});

test('Heutige Pflichtspiele einschliesslich Cup, nach Anspielzeit sortiert', () => {
  const l = logic('2026-10-03T08:00:00Z', [
    game('2026-10-03', '20:00'),
    game('2026-10-03', '18:00'),
    game('2026-10-03', '19:00', {league: 'Test'}),
    game('2026-10-03', '19:30', {league: 'Mobiliar-Cup M'}),
    game('2026-10-04', '18:00')
  ]);
  assert.deepEqual(
    l.todayGames().map(g => g.time),
    ['18:00', '19:30', '20:00']
  );
});

test('Startseiten-Spiel: heutiges Endresultat behalten, sonst das nächste', () => {
  const played = game('2026-10-03', '14:00', {score: [30, 20]});
  const open = game('2026-10-03', '18:00');
  const next = game('2026-10-17', '18:00');
  assert.equal(logic('2026-10-03T08:00:00Z', [played, open, next]).homeFixture().game, played);
  assert.equal(logic('2026-10-03T18:00:00Z', [played, next]).homeFixture().game, played);
  assert.equal(logic('2026-10-10T08:00:00Z', [played, next]).homeFixture().game, next);
  assert.equal(logic('2026-12-01T08:00:00Z', [played, next]).nextPreviewGame(), null);
});

test('Ergebnis aus Sicht der Kadetten, auch auswärts und mit "TSV"-Präfix', () => {
  const l = logic('2026-10-03T12:00:00Z');
  const home = l.teamResult({home: 'Kadetten Schaffhausen', away: 'X', score: [30, 20]}, 'Kadetten Schaffhausen');
  assert.deepEqual({...home}, {state: 'win', short: 'S', label: 'Sieg', for: 30, against: 20});
  const away = l.teamResult({home: 'X', away: 'Kadetten Schaffhausen', score: [30, 20]}, 'Kadetten Schaffhausen');
  assert.equal(away.state, 'loss');
  assert.equal(away.label, 'Niederlage');
  assert.equal(l.teamResult({home: 'X', away: 'Kadetten Schaffhausen', score: [25, 25]}, 'Kadetten Schaffhausen').state, 'draw');
  assert.equal(l.teamName('TSV St. Otmar St. Gallen'), 'St. Otmar St. Gallen');
});

test('Relative Tagesangabe: Morgen, Übermorgen, in N Tagen', () => {
  const l = logic('2026-10-03T12:00:00Z');
  assert.equal(l.relativeDay('2026-10-03'), '');
  assert.equal(l.relativeDay('2026-10-04'), 'Morgen');
  assert.equal(l.relativeDay('2026-10-05'), 'Übermorgen');
  assert.equal(l.relativeDay('2026-10-08'), 'in 5 Tagen');
  assert.equal(l.relativeDay('2026-10-02'), '');
  assert.equal(l.relativeDay('2027-01-01'), '');
  // kurz nach Mitternacht in Zürich zählt schon der neue Tag
  assert.equal(l.relativeDay('2026-10-05', new Date('2026-10-03T22:30:00Z')), 'Morgen');
});

test('Result remains at 23:59:59 in Switzerland and becomes next preview at 00:00',()=>{
 const played=game('2026-10-03','18:00',{score:[45,34]}),next=game('2026-10-06','18:45');
 assert.equal(logic('2026-10-03T21:59:59Z',[played,next]).homeFixture().game,played);
 assert.equal(logic('2026-10-03T22:00:00Z',[played,next]).homeFixture().game,next);
 const winter=game('2026-12-05','18:00',{score:[30,25]}),winterNext=game('2026-12-12','18:00');
 assert.equal(logic('2026-12-05T22:59:59Z',[winter,winterNext]).homeFixture().game,winter);
 assert.equal(logic('2026-12-05T23:00:00Z',[winter,winterNext]).homeFixture().game,winterNext);
});
test('Confirmed API result takes precedence over an older snapshot only on its matchday',()=>{
 const old=game('2026-10-03','18:00'),next=game('2026-10-06','18:45');
 const finished={status:'finished',date:'2026-10-03',home:old.home,away:old.away,score:[45,34]};
 const before=logic('2026-10-03T21:59:59Z',[old,next]);before.liveState={finished};
 assert.deepEqual([...before.homeFixture().game.score],[45,34]);assert.equal(before.homeFixture().game.id,old.id);
 const after=logic('2026-10-03T22:00:00Z',[old,next]);after.liveState={finished};
 assert.equal(after.homeFixture().game,next);
});

test('Datenstand: Texte im Serverformat bleiben unverändert, rohes Markup wird maskiert', () => {
  const {snapshotText, sanitiseSnapshot} = logic('2026-10-05T12:00:00Z');
  assert.equal(snapshotText('A &amp; B'), 'A &amp; B');
  assert.equal(snapshotText('A & B'), 'A &amp; B');
  assert.equal(snapshotText('&amp;amp;'), '&amp;amp;');
  assert.equal(snapshotText(snapshotText('<b>"x"</b>')), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(snapshotText(42), 42);
  const seed = JSON.parse(fs.readFileSync('server/seed.json', 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(sanitiseSnapshot(seed))), seed);
});

test('Datenstand: ungültige IDs, Resultate und Wappenpfade werden verworfen', () => {
  const {sanitiseSnapshot} = logic('2026-10-05T12:00:00Z');
  const clean = sanitiseSnapshot({
    games: [
      {id: 'ok-1', home: 'A', away: 'B', score: [1, 2]},
      {id: '"><img src=x>', home: 'A', away: 'B'},
      {id: 'ok-2', home: 'A', away: 'B', score: ['<i>', 2]}
    ],
    stories: [{id: 'x y', title: 't'}, {id: '42', title: '<u>t</u>'}],
    tables: {QHL: [['<b>Team</b>', 1]]},
    clubLogos: {A: 'assets/club-1.png', B: '" onerror="x', C: 'javascript:alert(1)', D: 'https://example.test/l.png'}
  });
  assert.deepEqual(clean.games.map(g => g.id), ['ok-1', 'ok-2']);
  assert.equal('score' in clean.games[1], false);
  assert.deepEqual(clean.stories.map(n => n.title), ['&lt;u&gt;t&lt;/u&gt;']);
  assert.equal(clean.tables.QHL[0][0], '&lt;b&gt;Team&lt;/b&gt;');
  assert.deepEqual(Object.keys(clean.clubLogos), ['A', 'D']);
});

test('Arena-Puls beschleunigt zum Zürcher Anpfiff und erfindet keinen Live-Status', () => {
  const g = game('2026-10-03', '18:00');
  const phase = iso => logic(iso).matchPulsePhase(g, false);
  assert.equal(phase('2026-10-02T15:00:00Z'), 'distant');
  assert.equal(phase('2026-10-02T16:00:00Z'), 'anticipation');
  assert.equal(phase('2026-10-02T17:00:00Z'), 'anticipation');
  assert.equal(phase('2026-10-03T10:00:00Z'), 'matchday');
  assert.equal(phase('2026-10-03T14:00:00Z'), 'close');
  assert.equal(phase('2026-10-03T15:45:00Z'), 'imminent');
  assert.equal(phase('2026-10-03T16:00:00Z'), 'quiet');
  const l = logic('2026-10-03T15:50:00Z');
  assert.equal(l.matchPulsePhase({...g, time: ''}), 'quiet');
  assert.equal(l.matchPulsePhase({...g, score: [30, 20]}), 'off');
  assert.equal(l.matchPulsePhase(g, true), 'live');
});

test('Matchday rim uses 8/5/3 seconds, Zurich day boundaries and only confirmed live status',()=>{
 const g=game('2026-10-13','18:45'),l=logic('2026-10-13T04:52:00Z');
 assert.equal(l.matchdayOrbitState(g).active,true);assert.equal(l.matchdayOrbitState(g).seconds,8);
 assert.equal(logic('2026-10-13T15:45:00Z').matchdayOrbitState(g).seconds,5);
 assert.equal(logic('2026-10-13T16:30:00Z').matchdayOrbitState(g).seconds,5);
 assert.equal(logic('2026-10-13T16:46:00Z').matchdayOrbitState(g).seconds,8,'kickoff alone is not a live signal');
 assert.equal(l.matchdayOrbitState(g,true).seconds,3);
 assert.equal(logic('2026-10-12T21:59:00Z').matchdayOrbitState(g).active,false);
 assert.equal(logic('2026-10-12T22:00:00Z').matchdayOrbitState(g).active,true);
 assert.equal(l.matchdayOrbitState({...g,score:[25,23]}).active,false);
 assert.equal(l.matchdayOrbitState({...g,score:[null,null]}).active,true);
 assert.equal(logic('2026-10-13T16:30:00Z').matchdayOrbitState({...g,confirmed:false}).seconds,8);
 assert.equal(l.matchdayOrbitState({...g,time:''}).active,true);
 assert.equal(l.matchdayOrbitState(null).active,false);
});
test('Rim contour preserves unequal corners, handles zero/oversized radii and never draws outside its box',()=>{
 const l=logic('2026-10-13T04:52:00Z');
 const path=l.matchdayOrbitPath(350,180,[{x:8,y:8},{x:32,y:32},{x:8,y:8},{x:32,y:32}],1);
 assert.match(path,/A31 31/);assert.match(path,/A7 7/);assert.ok(path.endsWith('Z'));assert.doesNotMatch(path,/NaN|Infinity/);
 const square=l.matchdayOrbitPath(350,180,Array(4).fill({x:0,y:0}),1);assert.doesNotMatch(square,/A/);
 const oversized=l.matchdayOrbitPath(40,20,Array(4).fill({x:100,y:100}),1);assert.doesNotMatch(oversized,/NaN|Infinity/);assert.match(oversized,/A9 9/);
 assert.equal(l.matchdayOrbitPath(0,20,Array(4).fill({x:8,y:8})), '');
});

test('Gemeinsame Vorschau nutzt Zürcher Kalendertage und volle Termine mit Jahr',()=>{
 const l=logic('2026-10-20T09:00:00Z');
 assert.equal(l.matchPreviewLabel(game('2026-10-24','18:00')),'Nächstes Spiel · in 4 Tagen');
 assert.equal(l.matchPreviewLabel(game('2026-10-21','19:15')),'Nächstes Spiel · morgen');assert.equal(l.matchPreviewLabel(game('2026-10-20','18:00')),'Spieltag · heute');
 assert.equal(l.matchPreviewSchedule(game('2026-10-24','18:00')),'Samstag, 24.10.2026 · 18:00 Uhr');assert.equal(l.matchPreviewSchedule(game('2026-10-24','18:00'),false),'Samstag, 24.10.2026 · Zeit noch offen');assert.equal(l.matchPreviewSchedule(game('2026-10-24','')),'Samstag, 24.10.2026 · Zeit noch offen');
 assert.equal(logic('2026-10-24T22:30:00Z').matchPreviewLabel(game('2026-10-26','18:00')),'Nächstes Spiel · morgen');assert.equal(logic('2026-10-25T22:30:00Z').matchPreviewLabel(game('2026-10-26','18:00')),'Nächstes Spiel · morgen');assert.equal(logic('2026-12-31T23:15:00Z').matchPreviewLabel(game('2027-01-02','18:00')),'Nächstes Spiel · morgen');
});


test('A cup fixture remains the current match after kickoff even before or without a fresh live response',()=>{
 const cup=game('2026-10-31','20:00',{id:'517266',home:'Handball Emmen',away:'Kadetten Schaffhausen',league:'Mobiliar-Cup M'}),next=game('2026-11-11','19:15');
 for(const now of ['2026-10-31T18:59:00Z','2026-10-31T19:04:00Z','2026-10-31T21:30:00Z']) {
  const l=logic(now,[cup,next]);
  assert.equal(l.homeFixture().game,cup);assert.equal(l.homeFixture().live,null);
  l.liveState={checkedAt:'2026-10-31T18:00:00Z',match:{...cup,score:[1,1]}};
  assert.equal(l.homeFixture().game,cup,'An expired live response must not send the reader to the next match');
 }
 assert.equal(logic('2026-10-31T23:00:00Z',[cup,next]).homeFixture().game,next);
});
test('Cup live names with SHV division qualifiers match the schedule and keep the correct club identity',()=>{
 const cup=game('2026-10-31','20:00',{id:'517266',home:'Handball Emmen',away:'Kadetten Schaffhausen',league:'Mobiliar-Cup M'}),next=game('2026-11-11','19:15');
 const l=logic('2026-10-31T19:04:00Z',[cup,next]),live={id:517266,home:'Handball Emmen (MNLB)',away:'Kadetten Schaffhausen (QHL)',league:'Mobiliar-Cup M',score:[1,1]};
 assert.equal(l.sameFixture(cup,live),true);assert.equal(l.isOwnHandballTeam(live.away),true);
 assert.equal(l.teamResult({...live,score:[20,30]},'Kadetten Schaffhausen').state,'win');
 l.liveState={checkedAt:'2026-10-31T19:03:55Z',match:live};assert.equal(l.homeFixture().live,live);assert.equal(l.homeFixture().game.date,cup.date);assert.equal(l.homeFixture().game.time,cup.time);assert.equal(l.homeFixture().game.id,cup.id);assert.equal(l.homeFixture().game.home,cup.home);
 l.liveState={match:null,finished:{...live,status:'finished',date:cup.date,score:[20,30]}};
 assert.equal(l.homeFixture().game.id,cup.id);assert.deepEqual([...l.homeFixture().game.score],[20,30]);
 const withoutSchedule=logic('2026-10-31T19:04:00Z');withoutSchedule.liveState={checkedAt:'2026-10-31T19:03:55Z',match:live};assert.equal(withoutSchedule.homeFixture().game.date,'2026-10-31');
 assert.equal(l.handballLiveSource(live),'SHV');assert.equal(l.handballLiveSource({league:'QHL'}),'SHV');assert.equal(l.handballLiveSource({league:'European League'}),'EHF');
 assert.equal(l.sameFixture(cup,{...live,home:'Ein anderer Verein (MNLB)'}),false);
});
