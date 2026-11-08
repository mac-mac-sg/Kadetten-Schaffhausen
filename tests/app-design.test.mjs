// Designsprache «Schnitt»: Tokens, Kontraste, Kopfbänder, Tabs und Trennung von der bisherigen Matchday-Oberfläche.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseRoute} from '../src/kadetten/js/router.js';
import {competitionOf} from '../src/kadetten/js/logic.js';
import {decodeDeep} from '../src/kadetten/js/text.js';
import {setLogos, nav, venueShort, LOGO} from '../src/kadetten/js/views/parts.js';
import {renderJetzt, renderNews} from '../src/kadetten/js/views/jetzt.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {renderSaison} from '../src/kadetten/js/views/saison.js';
import {renderTeam, renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderVerein} from '../src/kadetten/js/views/verein.js';
import {renderIch} from '../src/kadetten/js/views/ich.js';

const read = path => readFileSync(path, 'utf8');
const tokens = read('src/kadetten/css/tokens.css');
const data = decodeDeep(JSON.parse(read('server/seed.json')));
const now = Date.parse('2026-11-05T10:00:00Z');
const VIEWS = {jetzt: renderJetzt, news: renderNews, spiel: renderSpiel, spielplan: renderSaison, tabellen: renderSaison, statistik: renderSaison, team: renderTeam, spieler: renderSpieler, verein: renderVerein, ich: renderIch};
function render(hash, ui = {}, load = () => ({status: 'loading'})) {
  setLogos(data.clubLogos);
  const route = parseRoute(hash);
  const ctx = {route, state: {data, live: null}, now, load, api: {}, ui: {comp: 'Alle', table: 'QHL', ...ui}, theme: 'system'};
  return parseHTML('<html><body>' + String(VIEWS[route.view](ctx)) + '</body></html>').document;
}

// Werte eines Tokens in einem Block (Hell: :root, Dunkel: data-theme='dark').
function tokenValues(block) {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}
const light = tokenValues(tokens.slice(0, tokens.indexOf('@media (prefers-color-scheme: dark)')));
const dark = {...light, ...tokenValues(tokens.slice(tokens.indexOf(":root[data-theme='dark']")))};
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

test('Tokens: Kadettenorange aus dem Wappen, Schnitt von 8° und passende Streifen', () => {
  assert.equal(light['c-accent'], '#ff5d00', 'Wappenorange');
  assert.equal(light.skew, '-8deg');
  assert.ok(Math.abs(Number(light.slope) - Math.tan(8 * Math.PI / 180)) < 0.001, 'Steigung = tan(8°)');
  assert.match(light.stripes, /repeating-linear-gradient\(120deg/);
  const components = read('src/kadetten/css/components.css');
  assert.match(components, /\.band \{[^}]*clip-path: polygon\(0 0, 100% 0, 100% calc\(100% - var\(--cut\)\), 0 100%\)/, 'Kopfband mit geschnittener Unterkante');
  assert.match(components, /\.nav a\.on::before/, 'aktiver Tab: schräger Balken');
});

test('Kontraste (WCAG AA): Text, Orange als Schrift und Schrift auf Orange in Hell und Dunkel', () => {
  for (const [name, t] of [['hell', light], ['dunkel', dark]]) {
    for (const surface of ['c-bg', 'c-surface']) {
      assert.ok(contrast(t['c-text'], t[surface]) >= 7, `${name}: Text auf ${surface}`);
      assert.ok(contrast(t['c-text-muted'], t[surface]) >= 4.5, `${name}: Nebentext auf ${surface}`);
      assert.ok(contrast(t['c-accent-text'], t[surface]) >= 4.5, `${name}: Orange als Schrift auf ${surface}`);
    }
    assert.ok(contrast(t['c-on-accent'], t['c-accent']) >= 4.5, `${name}: Tinte auf Orange`);
    assert.ok(contrast(t['c-text'], t['c-chip']) >= 4.5, `${name}: Text auf Chip`);
  }
  assert.ok(contrast('#fafafa', light['c-ink']) >= 7, 'weisse Schrift auf Tinte (Etikett im Kopfband)');
});

test('Jede Hauptseite hat ein Kopfband mit genau einer h1 sowie Zugang zu Verein und «Ich»', () => {
  for (const hash of ['#/saison', '#/statistik', '#/statistik/spieler', '#/team', '#/verein', '#/news']) {
    const d = render(hash);
    assert.equal(d.querySelectorAll('h1').length, 1, hash);
    assert.ok(d.querySelector('header.band .band-t'), hash + ': Kopfband mit Titel');
    const links = [...d.querySelectorAll('.band-acts a')].map(a => a.getAttribute('href'));
    assert.deepEqual(links, ['#/verein', '#/ich'], hash);
    for (const a of d.querySelectorAll('.band-acts a')) assert.ok(a.getAttribute('aria-label'), 'Symbolknopf braucht einen Namen');
  }
  assert.equal(render('#/saison').querySelector('.band-t').textContent, 'Spiele');
  assert.equal(render('#/statistik').querySelector('.band-t').textContent, 'Tabelle');
  assert.equal(render('#/team').querySelector('.band-t').textContent, 'Kader');
});

test('Unterseiten: schmales Kopfband mit Zurück; Spielkarte der Spielseite liegt im Band', () => {
  const player = render('#/team/10');
  assert.ok(player.querySelector('header.band-slim a.back[href="#/team"]'));
  assert.match(player.querySelector('.big-hero .no').textContent, /^10$/, 'Rückennummer gross');
  const game = render('#/spiel/508393');
  assert.ok(game.querySelector('header.band-match .match-score .hero'), 'Spielstand im Kopfband');
  assert.equal(game.querySelectorAll('h1').length, 1);
  assert.ok(game.querySelector('header.band-match a.back'));
});

test('Kader: Karten zeigen Porträt, grosse Nummer, Name und Position', () => {
  const card = render('#/team').querySelector('a.pc[href="#/team/10"]');
  assert.ok(card);
  assert.match(card.querySelector('img').getAttribute('src'), /assets\/players\/10\.webp/);
  assert.equal(card.querySelector('.no').textContent, '10');
  assert.match(card.textContent, /Perić/);
  assert.match(card.textContent, /Rückraum/);
});

test('Navigation: vier Tabs mit Symbol und sichtbarer Beschriftung, kein Verein-Tab', () => {
  const d = parseHTML('<html><body>' + String(nav('saison')) + '</body></html>').document;
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.textContent.trim()), ['News', 'Spiele', 'Tabelle', 'Kader']);
  assert.equal(d.querySelectorAll('a.on').length, 1);
});

test('Content-Security-Policy: Ansichten setzen keine style-Attribute und keine style-Elemente', () => {
  for (const hash of ['#/', '#/saison', '#/statistik', '#/team', '#/team/10', '#/spiel/508393', '#/verein', '#/ich', '#/news']) {
    const d = render(hash);
    assert.equal(d.querySelectorAll('[style], style').length, 0, hash);
  }
  assert.match(read('src/kadetten/index.html'), /style-src 'self';/);
});

test('Die App ist reine Kadetten-App: keine Vereinsauswahl und kein Rest der Matchday-Oberfläche', () => {
  assert.ok(!existsSync('src/kadetten/matchday'), 'Matchday-Quellstand entfernt');
  const html = read('src/kadetten/index.html');
  assert.doesNotMatch(html, /club-switch|data-club-layout|FCSG|St\. Otmar/);
  const home = render('#/');
  assert.doesNotMatch(home.body.textContent, /FC St\. Gallen|Vereinsauswahl|Meine Vereine/);
  assert.match(home.querySelector('.band-tag').textContent, /Tradition seit 1791/, '1791 = Gründung des Kadettencorps');
});

test('Schriften: Barlow Condensed kursiv wird mit der App ausgeliefert, nichts von Drittservern', () => {
  const fonts = read('src/kadetten/css/fonts.css');
  assert.match(fonts, /font-family: 'Barlow Condensed'; font-style: italic; font-weight: 600/);
  assert.doesNotMatch(fonts + read('src/kadetten/css/components.css') + read('src/kadetten/css/views.css'), /https?:\/\//);
});

test('Kader nach Skizze: Positions-Chips, ein Raster nach Nummern, Filter nach Position', () => {
  const all = render('#/team');
  assert.deepEqual([...all.querySelectorAll('.chips .chip')].map(c => c.textContent), ['Alle', 'Tor', 'Rückraum', 'Flügel', 'Kreis']);
  assert.equal(all.querySelector('.chip.on').textContent, 'Alle');
  assert.equal(all.querySelectorAll('.pgrid').length, 1, 'ein gemeinsames Raster statt Gruppen');
  const numbers = [...all.querySelectorAll('.pc .no')].map(n => Number(n.textContent));
  assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b), 'nach Rückennummer sortiert');
  const keepers = render('#/team', {pos: 'Tor'});
  assert.equal(keepers.querySelector('.chip.on').textContent, 'Tor');
  assert.ok(keepers.querySelectorAll('.pc').length > 0 && keepers.querySelectorAll('.pc').length < numbers.length);
  for (const card of keepers.querySelectorAll('.pc')) assert.match(card.textContent, /Tor/);
  assert.equal(render('#/team', {pos: 'unbekannt'}).querySelector('.chip.on').textContent, 'Alle');
});

test('Verein nach Skizze: Titelzahlen, 1791-Karte, Hallenfoto und zwei Verweise; Details auf Unterseiten', () => {
  const d = render('#/verein');
  assert.deepEqual([...d.querySelectorAll('.stats.big .k')].map(k => k.textContent), ['Meisterschaften', 'Cupsiege', 'Supercups']);
  assert.deepEqual([...d.querySelectorAll('.stats.big .v')].map(v => v.textContent), ['15', '11', '16']);
  assert.equal(d.querySelector('.roots .yr').textContent, '1791');
  assert.match(d.querySelector('.roots p').textContent, /noch nicht die des Handballteams/);
  assert.match(d.querySelector('.club-photo img').getAttribute('alt'), /BBC Arena/);
  assert.deepEqual([...d.querySelectorAll('.plain-list a')].map(a => a.getAttribute('href')), ['#/verein/geschichte', '#/verein/titel']);
  assert.equal(d.querySelectorAll('.timeline').length, 0, 'Zeitreise liegt auf der Unterseite');
  const history = render('#/verein/geschichte');
  assert.ok(history.querySelector('.timeline li') && history.querySelector('a.back[href="#/verein"]'));
  assert.equal(history.querySelectorAll('h1').length, 1);
  const titles = render('#/verein/titel');
  assert.equal(titles.querySelectorAll('details').length, 3);
  assert.equal(titles.querySelectorAll('h1').length, 1);
  assert.equal(parseRoute('#/verein/titel').tab, 'titel');
  assert.equal(parseRoute('#/verein/unbekannt').tab, undefined);
});

test('Spiele: Datumsblock statt Gegnerwappen, wie in der Skizze; nächstes Spiel mit Streifenrand', () => {
  const d = render('#/saison');
  const row = d.querySelector('.card.list a.rl');
  assert.match(row.querySelector('.dt b').textContent, /^\d{1,2}$/, 'Tag als grosse Ziffer');
  assert.match(row.querySelector('.dt small').textContent, /^(Jan\.|Feb\.|März|Apr\.|Mai|Juni|Juli|Aug\.|Sept\.|Okt\.|Nov\.|Dez\.)$/);
  assert.ok(!row.querySelector('.crest'), 'kein Wappen in der Zeile');
  assert.doesNotMatch(row.querySelector('.s').textContent, /\d{2}\.\d{2}\./, 'Datum steht nur im Block');
  assert.equal(d.querySelectorAll('.next-wrap').length, 1);
});

test('News: Aufmacher und schlichte Zeilen; Tabelle behält den Titel «Tabelle» auch bei den Spielerwerten', () => {
  const d = render('#/news');
  assert.ok(d.querySelector('.lead-story h2'), 'Aufmacher');
  assert.ok(d.querySelectorAll('.plain-list.news-rows a.rl').length > 3);
  assert.equal(d.querySelectorAll('h1').length, 1);
  for (const hash of ['#/statistik', '#/statistik/spieler']) assert.equal(render(hash).querySelector('.band-t').textContent, 'Tabelle', hash);
  assert.ok(render('#/statistik/spieler').querySelector('.seg ~ .chips'), 'Auswahl unter dem Umschalter');
});

test('Spielerseite: Name und Position unter dem Porträt statt über dem Trikot', () => {
  const d = render('#/team/10');
  assert.equal(d.querySelector('.big-hero h1'), null);
  assert.match(d.querySelector('.pl-head h1').textContent, /Perić/);
  assert.match(d.querySelector('.pl-head p').textContent, /Rückraum/);
  assert.equal(d.querySelector('.big-hero .no').textContent, '10');
});

test('Unterseiten mit Titel im Kopfband: Ich, Geschichte, Trophäenschrank', () => {
  for (const [hash, title, back] of [['#/ich', 'Ich', '#/'], ['#/verein/geschichte', 'Geschichte', '#/verein'], ['#/verein/titel', 'Trophäenschrank', '#/verein']]) {
    const d = render(hash);
    assert.equal(d.querySelector('header.band-sub .band-t').textContent, title, hash);
    assert.equal(d.querySelector('header.band-sub a.back').getAttribute('href'), back, hash);
    assert.equal(d.querySelectorAll('h1').length, 1, hash);
  }
});

test('Wappen: eigener Zuschnitt ohne Sterne und Rahmen; Spielort kurz', () => {
  assert.equal(LOGO, 'assets/kadetten-wappen.png');
  assert.ok(existsSync('src/kadetten/assets/kadetten-wappen.png'));
  assert.match(read('src/kadetten/css/components.css'), /url\('assets\/kadetten-wappen\.png'\)/);
  assert.equal(venueShort('Schaffhausen BBC Arena A, Schaffhausen'), 'BBC Arena');
  assert.equal(venueShort('Sportska Dvorana Ljubuski, Ljubuski'), 'Sportska Dvorana Ljubuski');
  assert.equal(venueShort(undefined), '');
  const home = render('#/');
  assert.match(home.querySelector('.match-score .meta').textContent, /BBC Arena/);
  assert.doesNotMatch(home.querySelector('.match-score .meta').textContent, /Schaffhausen BBC/);
});

test('Statistik: Spielverlauf mit zwei Kurven, Legende mit Toren und Tordifferenz', () => {
  const shv = Object.values(JSON.parse(read('src/kadetten/data/game-reports.json')).reports).find(r => r.gameId === 508338);
  const d = render('#/spiel/508338/bericht', {}, () => ({status: 'ready', value: {shv, archive: {goals: [{t: '05:00', s: [0, 1], h: false, n: 'A'}, {t: '12:00', s: [1, 1], h: true, n: 'B'}, {t: '25:00', s: [5, 9], h: false, n: 'A'}, {t: '40:00', s: [11, 18], h: false, n: 'A'}, {t: '59:00', s: [20, 28], h: false, n: 'A'}]}}}));
  const section = d.querySelector('[aria-labelledby="g-verlauf"]');
  assert.ok(section, 'Spielverlauf');
  assert.equal(section.querySelectorAll('svg.curve .cv-line').length, 2);
  assert.deepEqual([...section.querySelectorAll('.cv-team b')].map(b => b.textContent), ['28', '20']);
  assert.match(section.querySelector('.cv-diff').textContent, /\+8/);
  assert.ok(section.querySelector('.card > .h4'), 'Tordifferenz als zweite Grafik');
});

// ---- Spielerwahl, Variante C, Stufe 1 ----
import {suggestions, livePicks, numberFor, surname} from '../src/kadetten/js/wahl.js';
import {picks, pickFor, togglePick, PICKS_KEY} from '../src/kadetten/js/personal.js';
import {voteSection, pickSection} from '../src/kadetten/js/views/bericht.js';
const mem = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };
const cands = [{id: '1', name: 'LIOI Alessio', goals: 2, saves: null}, {id: '2', name: 'PERIC Josip', goals: 7, saves: null}, {id: '3', name: 'SERAVALLI Mathieu', goals: null, saves: 11}, {id: '4', name: 'KUETTEL Dimitrij', goals: 4, saves: null}, {id: '5', name: 'MEIER Max', goals: 0, saves: null}];
const dom2 = v => parseHTML('<html><body>' + String(v) + '</body></html>').document;

test('Vorschläge nach Spieldaten: meiste Tore, zweitmeiste Tore, meiste Paraden; Rest nach Beitrag', () => {
  const {picked, rest} = suggestions(cands);
  assert.deepEqual(picked.map(p => [p.candidate.id, p.reason]), [['2', 'Meiste Tore'], ['4', 'Zweitmeiste Tore'], ['3', 'Meiste Paraden']]);
  assert.deepEqual(rest.map(c => c.id), ['1', '5'], 'übrige nach Tore und Paraden, dann Name');
  assert.equal(suggestions([{id: '1', name: 'A', goals: 3}, {id: '2', name: 'B', goals: 3}]).picked[1].reason, 'Gleich viele Tore');
  assert.deepEqual(suggestions(null), {picked: [], rest: []});
  assert.deepEqual(suggestions([{id: '9', name: 'X', goals: 0}]).picked, [], 'ohne gemeldete Werte keine Begründung erfunden');
  assert.deepEqual(livePicks([{id: 1, name: 'A', goals: 1}, {id: 2, name: 'B', goals: 5}, {id: 3, name: 'C', goals: 0}, {id: 4, name: 'D', goals: 3}, {id: 5, name: 'E', goals: 2}]).map(p => p.id), [2, 4, 5]);
  assert.equal(numberFor({playerSeason: {players: {10: {shvPlayerId: 7}}}}, '7'), 10);
  assert.equal(numberFor({}, '7'), null);
  assert.equal(surname('Josip Perić'), 'Perić');
});

test('Favorit merken: nur lokal, je Spiel, nochmals tippen entfernt, ungültige Werte werden ignoriert', () => {
  const s = mem();
  assert.equal(pickFor('508393', s), null);
  assert.deepEqual(togglePick('508393', {id: 2, name: 'PERIC Josip'}, s), {id: '2', name: 'PERIC Josip'});
  assert.deepEqual(pickFor('508393', s), {id: '2', name: 'PERIC Josip'});
  assert.deepEqual(togglePick('508393', {id: 4, name: 'KUETTEL Dimitrij'}, s), {id: '4', name: 'KUETTEL Dimitrij'}, 'anderer Spieler ersetzt');
  assert.equal(togglePick('508393', {id: 4, name: 'KUETTEL Dimitrij'}, s), null, 'gleicher Spieler entfernt');
  assert.equal(s.getItem(PICKS_KEY), null, 'leer: Schlüssel entfernt');
  assert.equal(togglePick('../x', {id: 1, name: 'A'}, s), null);
  assert.equal(togglePick('1', {id: '<b>', name: 'A'}, s), null);
  s.setItem(PICKS_KEY, '{"1":{"id":"5","name":"X"},"2":{"id":"<","name":"Y"},"3":7}');
  assert.deepEqual(Object.keys(picks(s)), ['1']);
  s.setItem(PICKS_KEY, 'kaputt');
  assert.deepEqual(picks(s), {});
});

test('Wahlliste: Vorschläge mit Begründung, weitere Spieler eingeklappt, Favorit vorgewählt, Bestätigung nennt den Namen', () => {
  const vote = {status: 'ready', value: {open: true, total: 0, counts: {}, closesAt: Date.parse('2026-11-09T20:45:00Z'), candidates: cands}};
  const data = {playerSeason: {players: {10: {shvPlayerId: 2}}}};
  const d = dom2(voteSection({vote, now: Date.parse('2026-11-08T21:00:00Z'), data, selected: '2', pickId: '2'}));
  const rows = [...d.querySelectorAll('.vote-rows > button.vote-player')];
  assert.deepEqual(rows.map(r => r.getAttribute('data-vote-select')), ['2', '4', '3']);
  assert.deepEqual(rows.map(r => r.querySelector('.why')?.textContent), ['Meiste Tore', 'Zweitmeiste Tore', 'Meiste Paraden']);
  assert.equal(rows[0].getAttribute('aria-pressed'), 'true');
  assert.match(rows[0].textContent, /Dein Favorit/); assert.match(rows[0].querySelector('.pk').textContent, /Gewählt/);
  assert.match(rows[1].querySelector('.pk').textContent, /Wählen/);
  assert.equal(d.querySelectorAll('details.vote-rest .vote-player').length, 2);
  assert.ok(!d.querySelector('details.vote-rest').hasAttribute('open'));
  const confirm = d.querySelector('[data-vote-confirm]');
  assert.ok(!confirm.hasAttribute('disabled')); assert.match(confirm.textContent, /Stimme für Peric abgeben/);
  assert.ok(dom2(voteSection({vote, now: 0, data})).querySelector('[data-vote-confirm]').hasAttribute('disabled'), 'ohne Auswahl gesperrt');
  assert.match(dom2(voteSection({vote, now: 0, data})).body.textContent, /Inoffizielle Fan-Wahl, keine Auszeichnung/);
  const noData = dom2(voteSection({vote: {...vote, value: {...vote.value, candidates: [{id: '9', name: 'X Y'}]}}, now: 0}));
  assert.ok(noData.querySelector('details.vote-rest').hasAttribute('open'), 'ohne Vorschläge sind alle Spieler sichtbar');
});

test('Live-Spiel: «Dein Favorit?» mit Chips der besten Torschützen, Alle-Schalter, Favorit bleibt sichtbar', () => {
  const players = [{id: 2, home: true, name: 'PERIC Josip', goals: 7}, {id: 4, home: true, name: 'KUETTEL Dimitrij', goals: 4}, {id: 1, home: true, name: 'LIOI Alessio', goals: 2}, {id: 8, home: true, name: 'MEIER Max', goals: 1}, {id: 20, home: false, name: 'GEGNER Gerd', goals: 9}];
  const match = {id: 'x', home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', score: [24, 21], league: 'QHL', details: {ok: true, players}};
  const game = {id: 'x', home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', league: 'QHL'};
  const data = {playerSeason: {players: {10: {shvPlayerId: 2}}}};
  const d = dom2(pickSection({match, game, data, ui: {}}));
  const chips = [...d.querySelectorAll('.pick-chips [data-pick]')];
  assert.deepEqual(chips.map(c => c.getAttribute('data-pick')), ['2', '4', '1'], 'drei beste eigene Torschützen, nie der Gegner');
  assert.equal(chips[0].querySelector('b').textContent, '10');
  assert.ok(d.querySelector('[data-ui="pickAll:1"]'), 'Alle einblenden');
  assert.match(d.body.textContent, /Die Wahl öffnet nach dem Abpfiff/);
  assert.equal(d.querySelectorAll('[data-vote-confirm],[data-vote]').length, 0, 'live wird nichts abgestimmt');
  const all = dom2(pickSection({match, game, data, ui: {pickAll: '1'}}));
  assert.equal(all.querySelectorAll('[data-pick]').length, 4);
  assert.ok(all.querySelector('[data-ui="pickAll:0"]'));
  assert.equal(dom2(pickSection({match: {...match, details: null}, game, data, ui: {}})).querySelectorAll('[data-pick]').length, 0);
  assert.equal(pickSection({match, game: {id: 'y', home: 'A', away: 'B'}, data, ui: {}}), '', 'nur Spiele der Kadetten');
  const mem2 = mem();
  assert.equal(togglePick('x', {id: 8, name: 'MEIER Max'}, mem2).id, '8');
});

// ---- Schusseffizienz in der Saison-Torschützenliste ----
import {shotTotals, renderSaison as renderStat} from '../src/kadetten/js/views/saison.js';
import {normalizeReport, comparisonRows} from '../src/kadetten/js/report.js';

test('Schusseffizienz: Würfe und Quote je Spieler aus den Spielberichten, nur wo beide Werte gemeldet sind', () => {
  const shv = Object.values(JSON.parse(read('src/kadetten/data/game-reports.json')).reports).find(r => r.gameId === 508338);
  const report = normalizeReport(shv, null);
  // KÜTTEL 2/4, MAROS 4/8 aus dem Bericht; ein zweiter Bericht addiert sich; ein Torhüter und unbekannte IDs zählen nicht.
  const totals = shotTotals([report, report], {9: 261608, 20: 271116, 99: 1, 1: 999});
  assert.deepEqual(totals[9], {goals: 4, shots: 8, games: 2});
  assert.deepEqual(totals[20], {goals: 8, shots: 16, games: 2});
  assert.equal(totals[99], undefined); assert.equal(totals[1], undefined);
  const broken = {teams: [{players: [{id: 5, keeper: false, goals: 3, shots: null}, {id: 6, keeper: false, goals: 5, shots: 2}, {id: 7, keeper: true, goals: 0, shots: 0}]}]};
  assert.deepEqual(shotTotals([broken], {1: 5, 2: 6, 3: 7}), {}, 'fehlende oder unmögliche Würfe werden nicht gezählt');
  assert.deepEqual(shotTotals([], {1: 5}), {});
});

test('Torschützenliste QHL: Spalten Würfe und Quote mit Quellenhinweis; ohne Berichte «–», nichts geschätzt', () => {
  const shv = Object.values(JSON.parse(read('src/kadetten/data/game-reports.json')).reports).find(r => r.gameId === 508338);
  const season = {season: '2026/27', players: {9: {shvPlayerId: 261608, games: 8, goals: 10, sevenMeterGoals: 0, twoMinutes: 0}, 20: {shvPlayerId: 271116, games: 8, goals: 20, sevenMeterGoals: 0, twoMinutes: 1}, 21: {shvPlayerId: 5, games: 3, goals: 5, sevenMeterGoals: 0, twoMinutes: 0}}};
  const ctxFor = load => ({route: {view: 'statistik'}, state: {data: {...data, playerSeason: season}, live: null}, now, load, api: {}, ui: {stat: 'qhl'}});
  const ready = dom2(renderStat(ctxFor(() => ({status: 'ready', value: {shv, archive: null}}))));
  const head = [...ready.querySelectorAll('.tbl-real thead th')].map(th => th.textContent);
  assert.deepEqual(head.slice(0, 5), ['Spieler', 'Sp', 'Tore', 'Würfe', 'Quote']);
  const rows = [...ready.querySelectorAll('.tbl-real tbody tr')];
  const cellsOf = nr => [...rows.find(r => r.querySelector('a').getAttribute('href') === '#/team/' + nr).querySelectorAll('td')].map(td => td.textContent.trim());
  assert.deepEqual(cellsOf(20).slice(2, 5), ['20', '8', '50 %'], 'Würfe und Quote stammen aus dem Bericht (4/8), Tore der Saison bleiben 20');
  assert.deepEqual(cellsOf(21).slice(3, 5), ['–', '–'], 'kein Bericht: nichts geschätzt');
  assert.match(ready.body.textContent, /aus 1 von \d+ QHL-Spielberichten/);
  assert.match(ready.body.textContent, /Quote \(Tore\/Würfe\)/);
  const loading = dom2(renderStat(ctxFor(() => ({status: 'loading'}))));
  assert.match(loading.body.textContent, /werden noch geladen/);
  assert.ok([...loading.querySelectorAll('.tbl-real tbody td.muted')].some(td => td.textContent === '…'));
  const ehl = dom2(renderStat({...ctxFor(() => ({status: 'loading'})), ui: {stat: 'ehl'}, state: {data: {...data, playerSeason: season, ehlPlayerSeason: {players: {9: {goals: 3}}}}, live: null}}));
  assert.ok(![...ehl.querySelectorAll('.tbl-real thead th')].some(th => th.textContent === 'Würfe'), 'EHL liefert keine verlässlichen Würfe');
});

// ---- Abgeschlossene QHL-Spiele: nur «Statistik» und «Rückblick» ----
test('Abgeschlossenes QHL-Spiel (ebenso Cup und Test): genau zwei Reiter, Statistik mit allen Zahlen, Rückblick nur mit dem erzeugten Bericht', () => {
  const shv = Object.values(JSON.parse(read('src/kadetten/data/game-reports.json')).reports).find(r => r.gameId === 508338);
  const archive = {report: {headline: 'Kadetten schlagen Suhr Aarau', paragraphs: ['Die Kadetten gewinnen 28:20.', 'Der Sieg war nie gefährdet.']}, generator: 'daten', goals: [{t: '05:00', s: [0, 1], h: false, n: 'A'}, {t: '59:00', s: [20, 28], h: false, n: 'A'}]};
  const ready = () => ({status: 'ready', value: {shv, archive}});
  const tabsOf = d => [...d.querySelectorAll('nav.seg a')].map(a => [a.textContent.trim(), a.getAttribute('href'), a.hasAttribute('aria-current')]);

  const stat = render('#/spiel/508338/bericht', {}, ready);
  assert.deepEqual(tabsOf(stat).map(t => t[0]), ['Statistik', 'Rückblick'], 'kein Ticker, keine Übersicht');
  assert.deepEqual(tabsOf(stat)[0].slice(1), ['#/spiel/508338/bericht', true]);
  assert.equal(tabsOf(stat)[1][1], '#/spiel/508338/rueckblick');
  assert.ok(stat.querySelector('[aria-labelledby="g-verlauf"]') && stat.querySelector('[aria-labelledby="g-cmp"]') && stat.querySelector('[aria-labelledby="g-spieler"]'), 'Spielverlauf, Teamvergleich, Spielerwerte');
  assert.equal(stat.querySelector('[aria-labelledby="g-text"]'), null, 'der Text gehört in den Rückblick');
  assert.doesNotMatch(stat.body.textContent, /Die Kadetten gewinnen 28:20/);

  const back = render('#/spiel/508338/rueckblick', {}, ready);
  assert.deepEqual(tabsOf(back).map(t => [t[0], t[2]]), [['Statistik', false], ['Rückblick', true]]);
  assert.match(back.querySelector('.prose h3').textContent, /Kadetten schlagen Suhr Aarau/);
  assert.equal(back.querySelectorAll('.prose p').length, 3, 'zwei Absätze und der Quellenhinweis');
  assert.match(back.body.textContent, /Aus den bestätigten Spieldaten zusammengestellt/);
  for (const sel of ['[aria-labelledby="g-verlauf"]', '[aria-labelledby="g-cmp"]', '[aria-labelledby="g-spieler"]', '[data-my-game]', '.vote-teaser', '[aria-labelledby="g-art"]', '.chart', '.curve']) assert.equal(back.querySelector(sel), null, 'Rückblick enthält nichts ausser dem Text: ' + sel);

  for (const hash of ['#/spiel/508338', '#/spiel/508338/live', '#/spiel/508338/vorschau']) {
    const d = render(hash, {}, ready);
    assert.deepEqual(tabsOf(d).filter(t => t[2]).map(t => t[0]), ['Statistik'], hash + ' führt zur Statistik');
  }
  const noText = render('#/spiel/508338/rueckblick', {}, () => ({status: 'ready', value: {shv, archive: {goals: archive.goals}}}));
  assert.match(noText.body.textContent, /keinen Rückblick/);
  assert.match(render('#/spiel/508338/rueckblick', {}, () => ({status: 'loading'})).body.textContent, /Rückblick wird geladen/);
  assert.match(render('#/spiel/508338/rueckblick', {}, () => ({status: 'error'})).body.textContent, /Rückblick erscheint/);
  assert.equal(parseRoute('#/spiel/508338/rueckblick').tab, 'rueckblick');
});

test('Bevorstehende Spiele behalten Übersicht, Ticker und Statistik', () => {
  const next = render('#/spiel/508393');
  assert.deepEqual([...next.querySelectorAll('nav.seg a')].map(a => a.textContent.trim()), ['Übersicht', 'Ticker', 'Statistik']);
});

test('Cup, Testspiele und European League: dieselben zwei Reiter wie bei der QHL', () => {
  const find = c => data.games.find(g => competitionOf(g) === c && Array.isArray(g.score));
  const [test, cup, ehl] = ['Test', 'Cup', 'EHL'].map(find);
  assert.ok(test && cup && ehl, 'Beispielspiele der drei Wettbewerbe im Datenbestand');
  const tabs = d => [...d.querySelectorAll('nav.seg a')].map(a => a.textContent.trim());
  const text = {report: {headline: 'Test gewonnen', paragraphs: ['Ein deutlicher Sieg im Cup.']}, goals: []};

  const t = render('#/spiel/' + test.id);
  assert.deepEqual(tabs(t), ['Statistik', 'Rückblick'], 'Testspiel');
  assert.match(t.body.textContent, /liefert die Quelle keine Spielwerte/, 'ehrlicher Hinweis statt Wartemeldung');
  assert.match(render('#/spiel/' + test.id + '/rueckblick').body.textContent, /keinen Spielbericht, deshalb gibt es keinen Rückblick/);
  assert.deepEqual(tabs(render('#/spiel/' + test.id + '/live')), ['Statistik', 'Rückblick']);

  const c = render('#/spiel/' + cup.id + '/rueckblick', {}, () => ({status: 'ready', value: {shv: null, archive: text}}));
  assert.deepEqual(tabs(c), ['Statistik', 'Rückblick'], 'Cup');
  assert.match(c.querySelector('.prose').textContent, /Test gewonnen/);

  assert.deepEqual(tabs(render('#/spiel/' + ehl.id)), ['Statistik', 'Rückblick'], 'EHL: ebenfalls zwei Reiter');
});

// ---- European League: alle Statistiken der Matchday-App ----
const ehlGame = data.games.find(g => g.league === 'EHL' && Array.isArray(g.score));
const ehlCounts = (shots, goals, saved, post, missed, blocked) => ({shots, goals, saved, post, missed, blocked});
const ehlArchive = () => {
  const [hs, as] = ehlGame.score;
  const zone = (z, shots, goals) => ({zone: z, shots, goals, saved: shots - goals, post: 0, missed: 0, blocked: 0});
  return {
    home: ehlGame.home, away: ehlGame.away, score: ehlGame.score, half: [Math.floor(hs / 2), Math.floor(as / 2)],
    report: {headline: 'Klarer Sieg in der European League', paragraphs: ['Ein deutlicher Heimsieg.'], generator: 'daten'},
    goals: [{t: '10:00', s: [1, 0], h: true, n: 'Josip Perić'}, {t: '59:00', s: ehlGame.score, h: true, n: 'Odinn Rikhardsson'}],
    teamStats: {
      home: {goals: hs, shots: 60, misses: 14, efficiency: 65, sevenGoals: 3, sevenShots: 4, twoMinutes: 2, warnings: 1, disqualifications: 1, technicalFaults: 9},
      guest: {goals: as, shots: 58, misses: 17, efficiency: 55, sevenGoals: 2, sevenShots: 3, twoMinutes: 4, warnings: 2, disqualifications: 0, technicalFaults: 12}
    },
    players: [
      {id: 11, number: 10, home: true, name: 'PERIC Josip', goals: 9, shots: 11, seven: 2, sevenShots: 2, twoMinutes: 0, yellow: 1, red: 1},
      {id: 12, number: 6, home: true, name: 'RIKHARDSSON Odinn', goals: 6, shots: 8, seven: 1, sevenShots: 2, twoMinutes: 1, yellow: 0, red: 0},
      {id: 13, number: 1, home: true, name: 'BERGMANN Leon', goalkeeper: true, saves: 12, savesFaced: 30},
      {id: 22, number: 12, home: false, name: 'TORWART Tom', goalkeeper: true, saves: 9, savesFaced: 28},
      {id: 21, number: 7, home: false, name: 'GEGNER Gerd', goals: 8, shots: 12, seven: 1, sevenShots: 1, twoMinutes: 2, yellow: 0, red: 0}
    ],
    shotStats: {
      home: {...ehlCounts(60, hs, 14, 3, 14, 5), zones: [zone('LLD', 10, 5), zone('PTY', 4, 3), zone('XYZ', 2, 1)], halves: [{half: 'H1', shots: 30, goals: 18}, {half: 'H2', shots: 30, goals: hs - 18}],
        keepers: [{id: 13, name: 'BERGMANN Leon', shots: 30, saves: 12, sevenShots: 3, sevenSaves: 1, zones: [{zone: 'LLD', shots: 10, saved: 5}, {zone: 'PTY', shots: 3, saved: 1}]}]},
      away: {...ehlCounts(58, as, 12, 4, 17, 3), zones: [zone('CLD', 8, 4)], halves: null, keepers: []}
    }
  };
};

test('European League: Statistik mit allen Werten der Matchday-App', () => {
  assert.ok(ehlGame, 'Beispielspiel der European League im Datenbestand');
  const d = render('#/spiel/' + ehlGame.id, {}, () => ({status: 'ready', value: {shv: null, archive: ehlArchive()}}));
  assert.deepEqual([...d.querySelectorAll('nav.seg a')].map(a => a.textContent.trim()), ['Statistik', 'Rückblick']);
  // Teamvergleich: Würfe, Fehlwürfe, Disqualifikationen kommen neben den bisherigen Zeilen dazu.
  const labels = [...d.querySelectorAll('[aria-labelledby="g-cmp"] .cmp .bar > span')].map(n => n.textContent.replace('?', '').trim());
  for (const l of ['Tore', 'Würfe', 'Fehlwürfe', 'Wurfquote', 'Paraden', '7-m', 'Zeitstrafen', 'Verwarnungen', 'Disqualifikationen', 'Technische Fehler']) assert.ok(labels.includes(l), 'Teamvergleich: ' + l + ' in ' + labels.join(', '));
  assert.ok(labels.indexOf('Würfe') < labels.indexOf('Fehlwürfe') && labels.indexOf('Fehlwürfe') < labels.indexOf('Wurfquote'));
  // Spieler: Rückennummer, Disqualifikationen, Toptorschützen
  const players = d.querySelector('[aria-labelledby="g-spieler"]');
  assert.deepEqual([...players.querySelectorAll('thead th')].map(th => th.textContent), ['Spieler', 'Tore/W', 'Quote', '7-m', '2′', 'G', 'R']);
  assert.match(players.querySelector('tbody tr th').textContent, /^10\s/, 'Rückennummer vor dem Namen');
  assert.deepEqual([...players.querySelectorAll('.scorers li')].map(li => li.textContent.replace(/\s+/g, ' ').trim().slice(0, 1)), ['9', '6']);
  // Wurfanalyse: wie die Würfe endeten, Zonen inkl. weitere, Halbzeitquoten, Paraden nach Zone
  const wurf = d.querySelector('[aria-labelledby="g-wurf"]');
  assert.ok(wurf);
  assert.deepEqual([...wurf.querySelectorAll('.cmp .bar > span')].map(n => n.textContent.trim()), ['Tore', 'Vom Torhüter gehalten', 'Pfosten / Latte', 'Daneben', 'Geblockt']);
  assert.match(wurf.textContent, /Weitere Wurfzone/);
  assert.deepEqual([...wurf.querySelectorAll('.halves > div span')].map(n => n.textContent), ['1. Halbzeit', '2. Halbzeit'], 'Quote je Halbzeit nur dort, wo die Quelle sie liefert');
  assert.equal(wurf.querySelectorAll('.halves').length, 1);
  const keeper = wurf.querySelector('details.keeper-zones');
  assert.ok(keeper); assert.match(keeper.textContent, /Paraden nach Wurfzone/); assert.match(keeper.textContent, /Siebenmeter gehalten: 1 \/ 3/);
  assert.equal(keeper.querySelectorAll('tbody tr').length, 2);
  assert.match(keeper.textContent, /Links · Distanz/);
  // Rückblick enthält nur den Text
  const back = render('#/spiel/' + ehlGame.id + '/rueckblick', {}, () => ({status: 'ready', value: {shv: null, archive: ehlArchive()}}));
  assert.match(back.querySelector('.prose').textContent, /Klarer Sieg in der European League/);
  assert.equal(back.querySelector('[aria-labelledby="g-wurf"]'), null);
});

test('Teamvergleich: Zeilen nur mit Werten beider Teams, keine erfundenen Disqualifikationen bei QHL', () => {
  const shv = Object.values(JSON.parse(read('src/kadetten/data/game-reports.json')).reports).find(r => r.gameId === 508338);
  const rows = comparisonRows(normalizeReport(shv, null)).map(r => r.label);
  assert.ok(rows.includes('Würfe'));
  assert.ok(!rows.includes('Fehlwürfe') && !rows.includes('Disqualifikationen'), 'Quelle meldet sie nicht: keine Zeile');
});
