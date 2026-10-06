import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTicker, withSevenMeters, matchFacts, factLines, plainReport, goalFeed} from '../server/ehf-ticker.mjs';
import {reportMessages, toReport, validReport} from '../server/report-ai.mjs';

const KAD = 'uyEpUicNjwv8hCX9B7A3sg', IZV = '2zXEaNBPEzJP81Ffhy6t9g';
const athlete = (bib, given, family, role) => ({code: given + bib, order: 1, bib, ...(role ? {role} : {}), description: {givenName: given, familyName: family}});
const side = (code, name, athletes) => ({code, description: {teamname: name}, composition: {athlete: athletes}});
let order = 0;
const shot = (when, scorerCode, bib, given, family, [h, a], result = 'GOAL', loc = 'CSD') => ({id: 's' + ++order, period: +when.split(':')[0] < 30 ? 'H1' : 'H2', order: ++order, action: 'SHOT', when, loc, result, scoreH: h, scoreA: a, competitor: [side(scorerCode, 'x', [athlete(bib, given, family, 'SCR')])]});
const tout = (when, code, score) => ({order: ++order, period: 'H1', action: 'TOUT', actionAdd: 'START', when, scoreH: score[0], scoreA: score[1], competitor: [side(code, 'x')]});
const susp = (when, code, bib, given, family) => ({order: ++order, period: 'H1', action: 'TMS', when, scoreH: 3, scoreA: 1, competitor: [side(code, 'x', [athlete(bib, given, family)])]});
// 1:0 Gast, dann Kadetten ziehen davon (5 Tore in Folge), ein Siebenmeter
const actions = [
  {order: 1, period: 'H1', action: 'STARTP', when: '0:0'},
  shot('1:0', IZV, 24, 'Mile', 'Lasic', [0, 1]),
  shot('1:37', KAD, 20, 'Luka', 'Maros', [1, 1]),
  shot('2:10', KAD, 20, 'Luka', 'Maros', [2, 1]),
  tout('3:00', IZV, [2, 1]),
  shot('4:15', KAD, 7, 'Max', 'Muster', [3, 1], 'GOAL', 'PTY'),
  susp('5:30', IZV, 22, 'Mihael', 'Bebek'),
  shot('6:00', KAD, 7, 'Max', 'Muster', [4, 1]),
  shot('7:00', KAD, 7, 'Max', 'Muster', [5, 1], 'SAVE'.replace('SAVE', 'GOAL')),
  shot('7:20', KAD, 7, 'Max', 'Muster', [5, 1], 'SAVE', 'PTY'),
  {order: 99, period: 'H1', action: 'ENDP', when: '30:0', scoreH: 5, scoreA: 1},
  shot('45:00', IZV, 24, 'Mile', 'Lasic', [5, 2]),
  {order: 100, period: 'H2', action: 'ENDP', when: '60:0', scoreH: 5, scoreA: 2}
];
const data = {playerstats: {homeTeam: {team: {id: KAD}}, guestTeam: {team: {id: IZV}}}, events: [{actions: {action: actions}, phaseScores: [{name: 'Match ended', scoreA: 5, scoreB: 2}]}]};

test('Ticker: Tore, Seite aus dem Spielstand, Siebenmeter, Auszeit und Strafe', () => {
  const t = parseTicker(data);
  assert.equal(t.goals.length, 7);
  assert.deepEqual(t.goals.map(g => g.side), ['away', 'home', 'home', 'home', 'home', 'home', 'away']);
  assert.deepEqual(t.goals[3], {sec: 255, half: 'H1', score: [3, 1], side: 'home', name: 'Max Muster', bib: 7, seven: true});
  assert.deepEqual(t.final, [5, 2]);
  assert.deepEqual(t.halftime, [5, 1]);
  assert.deepEqual(t.sevenMeters, [{side: 'home', bib: 7, goal: true}, {side: 'home', bib: 7, goal: false}]);
  assert.deepEqual(t.timeouts, [{sec: 180, half: 'H1', score: [2, 1], code: IZV, side: 'away'}]);
  assert.equal(t.suspensions.length, 1);
  assert.equal(t.suspensions[0].side, 'away');
  assert.equal(t.suspensions[0].name, 'Mihael Bebek');
});

test('Ticker: Heim/Gast stimmt auch ohne Teamkennung in playerstats', () => {
  const t = parseTicker({events: data.events});
  assert.equal(t.goals[0].side, 'away');
  assert.equal(t.timeouts[0].side, 'away'); // Kennung aus den Toren gelernt
});

test('Ticker ohne Ereignisliste oder mit unplausiblem Spielstand wirft', () => {
  assert.throws(() => parseTicker({}), /Missing ticker events/);
  assert.throws(() => parseTicker({events: [{actions: {action: [shot('1:0', KAD, 1, 'A', 'B', [0, 0])]}}]}), /Invalid ticker score/);
});

test('Siebenmeter je Spieler nur bei vollständiger Torfolge', () => {
  const t = parseTicker(data);
  const players = [{home: true, number: '7', name: 'Max Muster'}, {home: true, number: '20', name: 'Luka Maros'}, {home: false, number: '7', name: 'Anderer'}];
  const out = withSevenMeters(players, t);
  assert.deepEqual([out[0].seven, out[0].sevenShots], [1, 2]);
  assert.deepEqual([out[1].seven, out[1].sevenShots], [0, 0]);
  assert.deepEqual([out[2].seven, out[2].sevenShots], [0, 0]);
  const partial = withSevenMeters(players, {...t, final: [9, 2]});
  assert.equal(partial[0].seven, undefined);
});

test('Fakten und sachlicher Bericht: Halbzeit, Führung, Serie, Auszeit, Torschützen, Torhüter', () => {
  const t = parseTicker(data);
  const players = [
    {home: true, name: 'Max Muster', goals: 3, shots: 4, goalkeeper: false},
    {home: true, name: 'Leon Bergmann', goals: 0, shots: 0, goalkeeper: true, saves: 12, savesFaced: 14},
    {home: false, name: 'Mile Lasic', goals: 2, shots: 3, goalkeeper: false}
  ];
  const f = matchFacts({home: 'Kadetten Schaffhausen', away: 'HC Izvidac', ticker: t, players, teamStats: null});
  assert.deepEqual(f.halves, {first: [5, 1], second: [0, 1]});
  assert.equal(f.biggestLead.diff, 4);
  assert.deepEqual(f.biggestLead.score, [5, 1]);
  assert.equal(f.run.goals, 5);
  assert.deepEqual(f.run.from, [0, 1]);
  assert.equal(f.suspensions.away, 1);
  const lines = factLines(f);
  assert.ok(lines.some(l => /Halbzeitstand 5:1/.test(l)));
  assert.ok(lines.some(l => /erzielte 5 Tore in Folge \(von 0:1 auf 5:1/.test(l)));
  assert.ok(lines.some(l => /Auszeiten: HC Izvidac in der 4\. Minute beim Stand von 2:1/.test(l)));
  assert.ok(lines.some(l => /Torhüter Kadetten Schaffhausen: Leon Bergmann hielt 12 von 14 Würfen \(86 %\)/.test(l)));
  assert.ok(lines.some(l => /Beste Torschützen Kadetten Schaffhausen: Max Muster \(3 Tore bei 4 Würfen\)/.test(l)));
  const plain = plainReport(f);
  assert.match(plain.headline, /5:2/);
  assert.ok(plain.paragraphs.length >= 2);
  assert.ok(validReport(plain));
  assert.equal(goalFeed(t)[3].t, '4:15');
  assert.equal(goalFeed(t)[3].p, true);
});

test('KI-Antwort zum Matchbericht: Titel und Absätze, mehr als vier Absätze werden zusammengelegt', () => {
  const raw = 'Kadetten ziehen früh davon\n\nAbsatz eins mit genug Text für den Bericht des Spiels.\n\nAbsatz zwei mit genug Text für den Bericht des Spiels.\n\nAbsatz drei mit genug Text für den Bericht des Spiels.\n\nAbsatz vier mit genug Text für den Bericht des Spiels.\n\nAbsatz fünf mit genug Text für den Bericht des Spiels.';
  const r = toReport(raw, 'Rückfall');
  assert.equal(r.headline, 'Kadetten ziehen früh davon');
  assert.equal(r.paragraphs.length, 4);
  assert.equal(toReport('zu kurz', 'x'), null);
  const messages = reportMessages({facts: ['Spiel: A gegen B']});
  assert.match(messages[0].content, /KI-Matchbericht/);
  assert.match(messages[1].content, /- Spiel: A gegen B/);
});
