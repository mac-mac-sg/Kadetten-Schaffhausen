import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {findGame, gamePhase, withFinished, liveTable, reportFromEhf, reportMatches, scorers, teamComparison, displayName, storiesForGame, sameTeam} from '../src/kadetten/js/match.js';
import {buildCalendar} from '../src/kadetten/js/calendar.js';
import {favourite, toggleFavourite, myGames, toggleMyGame} from '../src/kadetten/js/personal.js';
import {sanitizeArticle} from '../src/kadetten/js/sanitize.js';

const K = 'Kadetten Schaffhausen';
const game = {id: '508393', date: '2026-11-11', time: '19:15', home: K, away: 'HSC Suhr Aarau', league: 'QHL', venue: 'BBC Arena, Schaffhausen'};
const now = Date.parse('2026-11-11T19:10:00Z');
const live = {match: {id: 508393, home: K, away: 'HSC Suhr Aarau', score: [24, 21], league: 'QHL'}};
const memory = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };

test('Live- und Endstände werden dem Spiel im Spielplan zugeordnet', () => {
  assert.ok(sameTeam('TSV St. Otmar St. Gallen', 'St. Otmar St. Gallen'));
  assert.equal(findGame([game], live.match, now), game);
  assert.equal(gamePhase(game, live, now), 'live');
  assert.equal(gamePhase(game, {match: null}, now), 'vorschau');
  const finished = {match: null, finished: {...live.match, score: [33, 27], half: [16, 13], date: '2026-11-11', status: 'finished'}};
  assert.equal(gamePhase(game, finished, now), 'bericht');
  assert.deepEqual(withFinished(game, finished, now).score, [33, 27]);
  // Ein anderes Spiel am selben Tag wird nicht verwechselt.
  assert.equal(gamePhase({...game, away: 'BSV Bern'}, live, now), 'vorschau');
});

test('Live-Tabelle: Punkte, Tore und Rang, wenn das Spiel so endet', () => {
  const rows = [['HC Kriens-Luzern', 8, 259, 213, 14], [K, 8, 262, 232, 13], ['HSC Suhr Aarau', 8, 180, 190, 6]];
  const table = liveTable(rows, live.match);
  assert.deepEqual(table.map(r => [r.rank, r.team, r.played, r.points]), [[1, K, 9, 15], [2, 'HC Kriens-Luzern', 8, 14], [3, 'HSC Suhr Aarau', 9, 6]]);
  assert.equal(table[0].goalsFor, 286);
  assert.deepEqual(liveTable(rows, {...live.match, score: [20, 20]}).find(r => r.team === K).points, 14);
  assert.equal(liveTable(rows, {...live.match, league: 'European League'}), null);
  assert.equal(liveTable(rows, {...live.match, away: 'Unbekannt'}), null);
});

test('Spielberichte: Prüfung, Torschützen, Teamvergleich, EHF-Format', () => {
  const stored = JSON.parse(readFileSync('src/kadetten/data/game-reports.json', 'utf8')).reports;
  const report = Object.values(stored).find(r => r.gameId === 508338);
  const g = {id: '508338', home: 'HSC Suhr Aarau', away: K, score: [20, 28]};
  assert.ok(reportMatches(report, g));
  assert.ok(!reportMatches(report, {...g, score: [21, 28]}));
  const top = scorers(report.teams[1]);
  assert.ok(top.length > 3 && top.every((p, i) => i === 0 || top[i - 1].goals >= p.goals));
  assert.ok(top.every(p => p.goals > 0));
  const cmp = teamComparison(report);
  assert.ok(cmp.some(c => c.label === 'Paraden'));
  assert.ok(cmp.every(c => c.share >= 0 && c.share <= 1));
  assert.equal(teamComparison({teams: [{saves: null}, {saves: 3}]}).length, 0, 'fehlende Werte erscheinen nicht als 0');
  const ehf = reportFromEhf({score: [39, 32], half: [20, 15], home: K, away: 'CSM Bucuresti', teamStats: {home: {sevenGoals: 3, sevenShots: 4, twoMinutes: 2}, guest: {sevenGoals: 1, sevenShots: 1, twoMinutes: 4}},
    players: [{id: 1, name: 'A', home: true, goals: 8}, {id: 2, name: 'K', home: true, goalkeeper: true, saves: 12, savesFaced: 30}, {id: 3, name: 'B', home: false, goals: 9}]});
  assert.deepEqual([ehf.teams[0].saves, ehf.teams[0].seven, ehf.teams[1].twoMinutes], [12, 3, 4]);
  assert.equal(displayName('RIKHARDSSON Odinn'), 'Odinn Rikhardsson');
  assert.equal(displayName('Josip Perić'), 'Josip Perić');
});

test('Artikel zum Spiel: Datum und Gegner müssen passen', () => {
  const stories = [{id: 'a', date: '26.08.2026', title: 'Auftakt nach Mass in Aarau', text: 'Sieg gegen Suhr Aarau'}, {id: 'b', date: '26.08.2026', title: 'Training', text: 'nichts'}, {id: 'c', date: '01.09.2026', title: 'Suhr Aarau', text: ''}];
  assert.deepEqual(storiesForGame(stories, {date: '2026-08-26', home: 'HSC Suhr Aarau', away: K}).map(s => s.id), ['a']);
});

test('Kalenderdatei enthält nur kommende Kadetten-Spiele in UTC', () => {
  const {text, count} = buildCalendar([game, {...game, id: 'x', date: '2026-10-01', score: [30, 30]}, {...game, id: 'y', home: 'BSV Bern', away: 'Wacker Thun'}], Date.parse('2026-11-05T10:00:00Z'));
  assert.equal(count, 1);
  assert.match(text, /DTSTART:20261111T181500Z/);
  assert.match(text, /SUMMARY:Kadetten Schaffhausen – HSC Suhr Aarau \(QHL\)/);
  assert.match(text, /LOCATION:BBC Arena\\, Schaffhausen/);
  assert.ok(text.split('\r\n').every(line => line.length <= 75));
});

test('Persönliches bleibt lokal unter v2:-Schlüsseln', () => {
  const s = memory();
  assert.equal(favourite(s), null);
  assert.equal(toggleFavourite(10, s), 10);
  assert.equal(favourite(s), 10);
  assert.equal(toggleFavourite(10, s), null);
  assert.equal(toggleMyGame('508393', s), true);
  assert.deepEqual(myGames(s), ['508393']);
  assert.equal(toggleMyGame('508393', s), false);
});

test('Artikel-HTML wird bereinigt', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const out = sanitizeArticle('<h1>Titel</h1><p onclick="x()">Text <a href="javascript:alert(1)">böse</a> <a href="/news/">gut</a></p><script>alert(1)</script><img src="http://x/y.jpg"><img src="https://kadettensh.ch/a.jpg" onerror="x()" alt="Bild"><iframe src="https://x"></iframe><p> </p><div style="color:red">Rest</div>', {parser: DOMParser, doc: document});
  assert.doesNotMatch(out, /script|onclick|onerror|javascript|iframe|style=|http:\/\/x/);
  assert.match(out, /<h2>Titel<\/h2>/);
  const link = out.match(/<a [^>]*>gut<\/a>/)?.[0] || '';
  for (const attr of ['href="https://kadettensh.ch/news/"', 'target="_blank"', 'rel="noopener noreferrer"']) assert.ok(link.includes(attr), attr);
  const img = out.match(/<img [^>]*>/g) || [];
  assert.equal(img.length, 1, 'nur das HTTPS-Bild bleibt');
  for (const attr of ['src="https://kadettensh.ch/a.jpg"', 'alt="Bild"', 'loading="lazy"']) assert.ok(img[0].includes(attr), attr);
  assert.match(out, /böse/);
  assert.match(out, /Rest/);
});
