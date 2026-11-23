import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = f => readFileSync('src/kadetten/css/' + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const FILES = ['views.css', 'components.css', 'base.css'];
const tokens = read('tokens.css');

test('Schriftgrössen: Werte der Skala stehen als Token, nur layoutspezifische Zahlen sind fest', () => {
  const scale = new Map([...tokens.matchAll(/--fs-([a-z0-9]+): (\d+)px/g)].map(m => [m[2], m[1]]));
  assert.ok(scale.size >= 12, 'Skala in tokens.css');
  // Feste Grössen für Spielstand im Kopf, Diagramm-Beschriftungen und Ähnliches; eine neue Grösse ist eine bewusste Entscheidung.
  const allowed = new Set(['8', '8.5', '9', '10', '14', '16', '24', '30', '32', '38', '44', '46', '52', '64', '68', '80', '92', '96']);
  const found = [];
  for (const f of FILES)
    for (const m of read(f).matchAll(/(?<![\w-])(?:font|font-size): ([^;}]*)/g)) {
      const value = m[1].replace(/clamp\([^)]*\)/g, ''); // clamp(...) für fliessende Grössen ausgenommen
      for (const px of value.matchAll(/(?<![\w.-])(\d+(?:\.\d+)?)px/g)) found.push({file: f, size: px[1], decl: m[0].slice(0, 60)});
    }
  const duplicates = found.filter(x => scale.has(x.size));
  assert.deepEqual(duplicates, [], 'Grösse der Skala fest geschrieben, bitte var(--fs-…) verwenden');
  const unknown = found.filter(x => !allowed.has(x.size));
  assert.deepEqual(unknown, [], 'neue feste Schriftgrösse: Token ergänzen oder bewusst in die Liste aufnehmen');
});

test('Farben: keine festen Farbwerte ausser Schwarz und Weiss mit Alpha für Schatten und Masken', () => {
  const allowed = new Set(['#00000099', '#0006', '#0003', '#000', '#ffffff00', '#ededed']);
  const found = [];
  for (const f of FILES) for (const m of read(f).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(f + ' ' + m[0].toLowerCase());
  assert.deepEqual(
    found.filter(x => !allowed.has(x.split(' ')[1])),
    [],
    'fester Farbwert: als Token in tokens.css anlegen'
  );
});

test('Marken und Hinweis-Kacheln: eine gemeinsame schräge Basis, gerader Text', () => {
  const components = read('components.css');
  for (const cls of ['.pill', '.tag-ink', '.rb-tag', '.sk-tag'])
    assert.ok(components.includes(cls + '::before'), cls + ' nutzt die gemeinsame schräge Form (::before)');
  const views = read('views.css');
  for (const cls of ['.rb-tag', '.sk-tag'])
    assert.doesNotMatch(views.match(new RegExp('^\\' + cls + ' \\{[^}]*\\}', 'm'))[0], /transform: skewX/, cls + ': Text bleibt gerade');
  assert.ok(
    views.includes('.teaser {') && !views.includes('rb-teaser'),
    'eine Hinweis-Kachel «teaser» für Saisonrückblick und Spiel-Story'
  );
});
