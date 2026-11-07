// Designsprache «Schnitt»: Tokens, Kontraste, Kopfbänder, Tabs und Trennung von der bisherigen Matchday-Oberfläche.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseRoute} from '../src/kadetten/js/router.js';
import {decodeDeep} from '../src/kadetten/js/text.js';
import {setLogos, nav} from '../src/kadetten/js/views/parts.js';
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
function render(hash) {
  setLogos(data.clubLogos);
  const route = parseRoute(hash);
  const ctx = {route, state: {data, live: null}, now, load: () => ({status: 'loading'}), api: {}, ui: {comp: 'Alle', table: 'QHL'}, theme: 'system'};
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
