import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {
  findGame,
  gamePhase,
  withFinished,
  liveTable,
  reportFromEhf,
  reportMatches,
  scorers,
  teamComparison,
  displayName,
  storiesForGame,
  sameTeam
} from '../src/kadetten/js/match.js';
import {buildCalendar} from '../src/kadetten/js/calendar.js';
import {favourite, toggleFavourite, myGames, toggleMyGame} from '../src/kadetten/js/personal.js';
import {sanitizeArticle} from '../src/kadetten/js/sanitize.js';

const K = 'Kadetten Schaffhausen';
const game = {
  id: '508393',
  date: '2026-11-11',
  time: '19:15',
  home: K,
  away: 'HSC Suhr Aarau',
  league: 'QHL',
  venue: 'BBC Arena, Schaffhausen'
};
const now = Date.parse('2026-11-11T19:10:00Z');
const live = {match: {id: 508393, home: K, away: 'HSC Suhr Aarau', score: [24, 21], league: 'QHL'}};
const memory = () => {
  const m = new Map();
  return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
};

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
  const rows = [
    ['HC Kriens-Luzern', 8, 259, 213, 14],
    [K, 8, 262, 232, 13],
    ['HSC Suhr Aarau', 8, 180, 190, 6]
  ];
  const table = liveTable(rows, live.match);
  assert.deepEqual(
    table.map(r => [r.rank, r.team, r.played, r.points]),
    [
      [1, K, 9, 15],
      [2, 'HC Kriens-Luzern', 8, 14],
      [3, 'HSC Suhr Aarau', 9, 6]
    ]
  );
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
  const ehf = reportFromEhf({
    score: [39, 32],
    half: [20, 15],
    home: K,
    away: 'CSM Bucuresti',
    teamStats: {home: {sevenGoals: 3, sevenShots: 4, twoMinutes: 2}, guest: {sevenGoals: 1, sevenShots: 1, twoMinutes: 4}},
    players: [
      {id: 1, name: 'A', home: true, goals: 8},
      {id: 2, name: 'K', home: true, goalkeeper: true, saves: 12, savesFaced: 30},
      {id: 3, name: 'B', home: false, goals: 9}
    ]
  });
  assert.deepEqual([ehf.teams[0].saves, ehf.teams[0].seven, ehf.teams[1].twoMinutes], [12, 3, 4]);
  assert.equal(displayName('RIKHARDSSON Odinn'), 'Odinn Rikhardsson');
  assert.equal(displayName('Josip Perić'), 'Josip Perić');
});

test('Artikel zum Spiel: Datum und Gegner müssen passen', () => {
  const stories = [
    {id: 'a', date: '26.08.2026', title: 'Auftakt nach Mass in Aarau', text: 'Sieg gegen Suhr Aarau'},
    {id: 'b', date: '26.08.2026', title: 'Training', text: 'nichts'},
    {id: 'c', date: '01.09.2026', title: 'Suhr Aarau', text: ''}
  ];
  assert.deepEqual(
    storiesForGame(stories, {date: '2026-08-26', home: 'HSC Suhr Aarau', away: K}).map(s => s.id),
    ['a']
  );
});

test('Kalenderdatei enthält nur kommende Kadetten-Spiele in UTC', () => {
  const {text, count} = buildCalendar(
    [game, {...game, id: 'x', date: '2026-10-01', score: [30, 30]}, {...game, id: 'y', home: 'BSV Bern', away: 'Wacker Thun'}],
    Date.parse('2026-11-05T10:00:00Z')
  );
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
  const out = sanitizeArticle(
    '<h1>Titel</h1><p onclick="x()">Text <a href="javascript:alert(1)">böse</a> <a href="/news/">gut</a></p><script>alert(1)</script><img src="http://x/y.jpg"><img src="https://kadettensh.ch/a.jpg" onerror="x()" alt="Bild"><iframe src="https://x"></iframe><p> </p><div style="color:red">Rest</div>',
    {parser: DOMParser, doc: document}
  );
  assert.doesNotMatch(out, /script|onclick|onerror|javascript|iframe|style=|http:\/\/x/);
  assert.match(out, /<h2>Titel<\/h2>/);
  const link = out.match(/<a [^>]*>gut<\/a>/)?.[0] || '';
  for (const attr of ['href="https://kadettensh.ch/news/"', 'target="_blank"', 'rel="noopener noreferrer"'])
    assert.ok(link.includes(attr), attr);
  const img = out.match(/<img [^>]*>/g) || [];
  assert.equal(img.length, 1, 'nur das HTTPS-Bild bleibt');
  for (const attr of ['src="https://kadettensh.ch/a.jpg"', 'alt="Bild"', 'loading="lazy"']) assert.ok(img[0].includes(attr), attr);
  assert.match(out, /böse/);
  assert.match(out, /Rest/);
});

test('Artikel: Spielpaarung wird zur Karte mit Logos und Resultat, anderer Inhalt bleibt', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const out = sanitizeArticle(
    '<div><div><img src="https://kadettensh.ch/a.png" alt="A"><div>34</div><div><div>VS.</div><div>(12:24)</div></div><div>45</div><img src="https://kadettensh.ch/b.png" alt="B"></div></div><p>Bericht bleibt.</p><div><img src="https://kadettensh.ch/c.png"><p>Weitere Infos</p><img src="https://kadettensh.ch/d.png"></div>',
    {parser: DOMParser, doc: document}
  );
  assert.match(
    out,
    /<div class="fixture"><img [^>]*alt="A"[^>]*><div class="fixture-score"><strong>34 : 45<\/strong><small>Halbzeit 12:24<\/small><\/div><img [^>]*alt="B"[^>]*><\/div>/
  );
  assert.match(out, /Bericht bleibt/);
  assert.equal((out.match(/class="fixture"/g) || []).length, 1, 'zwei Bilder mit Text sind keine Paarung');
});

test('Artikel: Vorschau ohne Resultat verwendet dieselbe kompakte Paarungskarte wie der Spielbericht', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const source = `<div class="x-row"><div class="x-col"><div class="x-div"><span><img src="/gast.png" width="300" height="300" alt="Gast"></span><div> VS. </div><span><img src="/kadetten.png" width="884" height="1280" alt="Kadetten"></span></div></div></div>
    <div>Dienstag, 18.45 Uhr</div><p><img src="/foto.jpg" width="1500" height="1000" alt="Spielfoto"></p>
    <div><img src="/a.png">VS.<img></div><div><img src="/b.png">VS.<img src="http://example.com/c.png"></div>`;
  const out = sanitizeArticle(source, {parser: DOMParser, doc: document});
  const parsed = new DOMParser().parseFromString(out, 'text/html');
  const fixtures = [...parsed.querySelectorAll('.fixture')];
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].querySelector('.fixture-score strong').textContent, 'vs.');
  assert.equal(fixtures[0].querySelector('small'), null);
  assert.deepEqual(
    [...fixtures[0].querySelectorAll('img')].map(i => i.getAttribute('alt')),
    ['Gast', 'Kadetten']
  );
  assert.equal(fixtures[0].querySelector('[width], [height]'), null);
  assert.match(out, /Dienstag, 18.45 Uhr/);
  assert.equal(parsed.querySelector('img[alt="Spielfoto"]').getAttribute('width'), '1500');
});

test('Artikel: Autorzeile in verschachtelten Theme-DIVs bleibt vom ersten Satz getrennt', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const out = sanitizeArticle(
    '<div class="x-section"><div class="x-row"><div class="x-col"><i class="x-icon"></i><div class="x-text">Barbara Imobersteg</div></div></div></div><div class="x-text">Mit einer starken Leistung.</div><div class="x-text"><strong>Strafminuten:</strong> 10/8</div>',
    {parser: DOMParser, doc: document}
  );
  assert.equal(out, '<p>Barbara Imobersteg</p><p>Mit einer starken Leistung.</p><p><strong>Strafminuten:</strong> 10/8</p>');
});

test('Artikel: Fakten am Schluss (Ort, Zuschauer, Schiedsrichter, Aufstellung, Strafminuten) werden aus dem Zusammenhang gruppiert', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const out = sanitizeArticle(
    '<p>Bericht.</p><div>Kriens, Pilatus Arena</div><div>1904 Zuschauer</div><div>Hennig Simon/Salah Morad</div><div>Kadetten Schaffhausen</div><div>Bergmann (9 P./35 %/1), Seravalli (5 P./36%); Meister (4).</div><div><strong>Strafminuten:</strong> 10/8</div>',
    {parser: DOMParser, doc: document}
  );
  const d = new DOMParser().parseFromString(out, 'text/html');
  assert.equal(d.querySelector('p').textContent, 'Bericht.');
  const box = d.querySelector('.match-facts');
  assert.deepEqual(
    [...box.children].map(el => el.className),
    ['mf mf-venue', 'mf mf-crowd', 'mf mf-ref', 'mf mf-team', 'mf-lineup', 'mf mf-pen']
  );
  assert.equal(box.querySelector('.mf-venue').textContent, 'Kriens, Pilatus Arena');
  assert.equal(box.querySelector('.mf-crowd').textContent, '1904 Zuschauer');
  assert.equal(d.querySelectorAll('.match-facts').length, 1);
});

test('Artikel: ohne Zuschauerzahl am Schluss bleibt der Text unverändert', () => {
  const {DOMParser, document} = parseHTML('<html><body></body></html>');
  const out = sanitizeArticle('<p>Es kamen viele Zuschauer.</p><p>Kriens, Pilatus Arena</p><p>Strafminuten: 10/8</p>', {
    parser: DOMParser,
    doc: document
  });
  assert.doesNotMatch(out, /match-facts/);
});

test('Regel-Knöpfe: Beschriftung nennt den Begriff und passt zu den Regeltexten', async () => {
  const {RULE_LABELS, ruleButton} = await import('../src/kadetten/js/views/bericht.js');
  const {RULES} = await import('../src/kadetten/js/rules.js');
  for (const [id, label] of Object.entries(RULE_LABELS)) {
    assert.ok(RULES[id], 'Regel fehlt: ' + id);
    assert.ok(RULES[id][0].toLowerCase().includes(label.toLowerCase().split(' ')[0]), id + ': ' + label + ' / ' + RULES[id][0]);
  }
  assert.match(String(ruleButton('wurfquote')), /aria-label="Erklärung: Wurfquote"/);
});

test('Datenschutz: eigene Seite unter Einstellungen mit Fristen und Kontakt', async () => {
  const {parseRoute, href} = await import('../src/kadetten/js/router.js');
  const {renderDatenschutz} = await import('../src/kadetten/js/views/datenschutz.js');
  assert.deepEqual(parseRoute(href.datenschutz()), {area: 'ich', view: 'datenschutz'});
  const text = String(renderDatenschutz());
  assert.match(text, /inoffizielle Fan-App/);
  assert.match(text, /180 Tagen/);
  assert.match(text, /60 Tage/);
  assert.match(text, /github\.com\/mac-mac-sg\/Kadetten-Schaffhausen\/issues/);
});
