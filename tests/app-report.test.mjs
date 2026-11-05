import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {goalTimeline, flow, incidents, normalizeReport, fitsGame, comparisonRows, reportText, playerInReport, pct} from '../src/kadetten/js/report.js';
import {liveReport, scoreChart} from '../src/kadetten/js/views/bericht.js';
import {streak, biggestWin, playerMilestones, scenario, lastDuel, historyOfDay, moments, tipPoints, seasonSummary} from '../src/kadetten/js/moments.js';
import {changeTip, tips} from '../src/kadetten/js/personal.js';
import {deviceToken, myVotes} from '../src/kadetten/js/fan-vote.js';
import {parseRoute} from '../src/kadetten/js/router.js';

const K = 'Kadetten Schaffhausen';
const memory = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };
const reports = JSON.parse(readFileSync('src/kadetten/data/game-reports.json', 'utf8')).reports;
const shv = Object.values(reports).find(r => r.gameId === 508338);

test('Bericht vereinheitlichen: SHV und EHF, fehlende Werte bleiben leer', () => {
  const r = normalizeReport(shv, null);
  assert.ok(fitsGame(r, {home: 'HSC Suhr Aarau', away: K, score: [20, 28]}));
  assert.equal(r.teams.length, 2);
  const rows = comparisonRows(r);
  assert.deepEqual(rows.slice(0, 3).map(x => x.label), ['Tore', '1. Halbzeit', '2. Halbzeit']);
  assert.deepEqual([rows[1].home, rows[1].away, rows[2].home, rows[2].away], [9, 12, 11, 16]);
  assert.ok(rows.find(x => x.label === 'Wurfquote').homeText.includes('%'));
  const ehf = normalizeReport(null, {score: [39, 32], half: [16, 16], home: K, away: 'CSM', teamStats: {home: {shots: 55, efficiency: 71, sevenGoals: 3, sevenShots: 4}, guest: {shots: 58}}, players: [{id: 1, name: 'A', home: true, goals: 9, shots: 11}, {id: 2, name: 'K', home: true, goalkeeper: true, saves: 12, savesFaced: 32}]});
  assert.deepEqual([ehf.teams[0].saves, ehf.teams[0].savePercentage, ehf.teams[1].saves], [12, 37.5, null]);
  assert.equal(comparisonRows(ehf).find(x => x.label === 'Paraden'), undefined, 'ohne Gegenwert keine Zeile');
  assert.equal(pct(3, 0), null);
  assert.equal(playerInReport(r, [r.teams[1].players[0].id]).name, r.teams[1].players[0].name);
});

test('Spielverlauf aus Archiv oder SHV-Ereignissen: Torfolge, grösste Führung, Lauf, Wechsel', () => {
  const archive = {goals: [{t: '01:00', s: [1, 0], h: true, n: 'A'}, {t: '05:00', s: [1, 1], h: false, n: 'B'}, {t: '07:00', s: [1, 2], h: false, n: 'B'}, {t: '09:00', s: [2, 2], h: true}, {t: '10:00', s: [3, 2], h: true}, {t: '12:00', s: [4, 2], h: true, p: true}], timeouts: [{side: 'home', sec: 600}], suspensions: [{side: 'away', sec: 300, name: 'X'}]};
  const goals = goalTimeline(archive, null);
  assert.equal(goals.length, 6); assert.equal(goals[5].seven, true);
  const f = flow(goals);
  assert.deepEqual([f.biggest.home, f.biggest.away, f.changes, f.run.side, f.run.len], [2, 1, 2, 'home', 3]);
  assert.deepEqual(incidents(archive, null).timeouts, [{sec: 600, home: true}]);
  const events = [{id: 2, seconds: 120, score: [1, 1], action: 'Tor', awayPlayer: 'B'}, {id: 1, seconds: 60, score: [1, 0], action: 'Tor', homePlayer: 'A'}, {id: 3, seconds: 200, score: null, action: 'Auszeit', homeAction: 'bTO'}];
  assert.deepEqual(goalTimeline(null, {events}).map(g => [g.sec, g.home, g.name]), [[60, true, 'A'], [120, false, 'B']]);
  assert.deepEqual(incidents(null, {events}).timeouts, [{sec: 200, home: true}]);
  const svg = String(scoreChart(goals, true));
  assert.match(svg, /role="img"/); assert.match(svg, /grösste Führung Kadetten 2 Tore/);
  assert.equal(reportText({report: {headline: 'X', paragraphs: ['A']}}).paragraphs.length, 1);
  assert.equal(reportText({report: {paragraphs: []}}), null);
});

test('Live-Werte aus /api/live ohne Ereignisliste', () => {
  const r = liveReport({home: K, away: 'GC', score: [10, 8], league: 'QHL', details: {ok: true, events: [{id: 1}], players: [{id: 1, home: true, name: 'A', goals: 4, shots: 6, seven: 1, sevenShots: 1, twoMinutes: 0, yellow: 0, red: 0}, {id: 2, home: false, name: 'B', goals: 3, shots: 7, seven: 0, sevenShots: 0, twoMinutes: 1, yellow: 1, red: 0}]}});
  assert.deepEqual([r.teams[0].shots, r.teams[1].twoMinutes, r.stale], [6, 1, false]);
  assert.equal(liveReport({home: K, away: 'GC', score: [1, 0]}), null);
});

const g = (id, date, home, away, score, league = 'QHL') => ({id, date, time: '18:00', home, away, league, ...(score ? {score} : {})});
const season = [g('1', '2026-09-01', K, 'A', [30, 20]), g('2', '2026-09-08', 'B', K, [25, 31]), g('3', '2026-09-15', K, 'C', [28, 27]), g('4', '2026-09-22', K, 'D', [29, 29]), g('5', '2026-10-01', 'A', K, [22, 30]), g('6', '2026-11-11', K, 'B')];
const now = Date.parse('2026-11-05T10:00:00Z');

test('Momente: Serie, höchster Sieg, Meilensteine, Szenario, Duell, Geschichte des Tages', () => {
  assert.deepEqual(streak(season, now), {kind: 'unbeaten', count: 5});
  assert.deepEqual(streak(season.slice(0, 3), now), {kind: 'wins', count: 3});
  assert.equal(biggestWin(season, now).game.id, '1');
  const squad = [{number: 10, name: 'Josip Perić'}, {number: 6, name: 'Odinn Rikhardsson'}];
  assert.deepEqual(playerMilestones({players: {10: {goals: 47}, 6: {goals: 30}}}, squad).map(m => [m.number, m.target, m.missing]), [[10, 50, 3]]);
  const sc = scenario(season, {QHL: [['X', 8, 1, 1, 15], [K, 8, 1, 1, 13], ['Y', 8, 1, 1, 14]]}, now);
  assert.deepEqual([sc.points, sc.rankAtLeast], [15, 2]);
  assert.equal(lastDuel(season, now).prev.id, '2');
  assert.ok(historyOfDay([{year: 'a'}, {year: 'b'}], now));
  const list = moments({data: {games: season, tables: {QHL: [[K, 8, 1, 1, 13]]}, playerSeason: {players: {10: {goals: 47}}}}, now, squad, history: [{year: '1954', title: 'Gründung', text: 'x'}], favourite: 10});
  assert.ok(list.length >= 4 && list.length <= 5);
  assert.equal(list.find(m => m.id === 'milestone').tag, 'Dein Spieler');
});

test('Tippspiel und «Deine Saison» bleiben lokal', () => {
  assert.deepEqual([tipPoints([30, 28], [30, 28]), tipPoints([31, 29], [30, 28]), tipPoints([35, 20], [30, 28]), tipPoints([20, 30], [30, 28]), tipPoints([28, 28], [28, 28])], [3, 2, 1, 0, 3]);
  const s = memory();
  changeTip('5', 0, 1, s); changeTip('5', 1, -2, s);
  assert.deepEqual(tips(s)['5'], [29, 24]);
  const sum = seasonSummary({games: season, visited: ['1', '3', '4'], tips: {5: [22, 30], 1: [30, 20], 6: [30, 25]}, now});
  assert.deepEqual([sum.visits, sum.record.S, sum.record.U, sum.goals, sum.tipped, sum.points, sum.exact], [3, 2, 1, 87, 2, 6, 2]);
});

test('Fan-Wahl: zufälliger Geräteschlüssel bleibt auf dem Gerät', () => {
  const s = memory();
  const a = deviceToken(s), b = deviceToken(s);
  assert.match(a, /^[-\w]{43}$/); assert.equal(a, b);
  assert.deepEqual(myVotes(s), {});
});

test('Push-Adressen des Datendienstes führen auf die Spielseite', () => {
  assert.deepEqual(parseRoute('#match/508393/overview'), {area: 'jetzt', view: 'spiel', id: '508393'});
  assert.deepEqual(parseRoute('#/spiel/508393/live'), {area: 'jetzt', view: 'spiel', id: '508393', tab: 'live'});
});

test('Keine style-Attribute im Markup: die CSP der App erlaubt sie nicht', () => {
  const files = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p]; });
  for (const f of files('src/kadetten/js').filter(f => f.endsWith('.js'))) assert.doesNotMatch(readFileSync(f, 'utf8'), /\sstyle="/, f);
  assert.doesNotMatch(readFileSync('src/kadetten/index.html', 'utf8'), /<body[^>]*>[\s\S]*\sstyle="(?![^"]*padding:16px)/, 'nur der noscript-Hinweis');
});
