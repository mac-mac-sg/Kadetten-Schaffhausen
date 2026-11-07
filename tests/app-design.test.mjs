// Designsprache «Schnitt»: Tokens, Kontraste, Kopfbänder, Tabs und Trennung von der bisherigen Matchday-Oberfläche.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseRoute} from '../src/kadetten/js/router.js';
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
