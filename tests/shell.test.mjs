import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('src/client/index.html', 'utf8');
const sw = fs.readFileSync('src/client/sw.js', 'utf8');
const build = fs.readFileSync('scripts/build.mjs', 'utf8');
const list = (text, re) => text.match(re)[1].split(',').map(x => x.trim().replace(/^'|'$/g, ''));

test('Jede Skript- und Stildatei der Seite liegt im Service Worker und im Build-Hash', () => {
  const used = [...html.matchAll(/<script src="([^"]+)"|<link rel="stylesheet" href="([^"?]+)/g)].map(m => (m[1] || m[2]).split('?')[0]);
  assert.ok(used.includes('js/main.js'), 'Startdatei fehlt in index.html');
  const shell = list(sw, /const SHELL=\[([^\]]*)\]/).filter(x => x !== './' && !x.includes('manifest') && !x.includes('anton'));
  const hashed = list(build, /const shellFiles=\[([^\]]*)\]/).filter(x => !x.includes('manifest') && !x.includes('anton'));
  for (const file of used) {
    assert.ok(fs.existsSync('src/client/' + file), 'Datei fehlt: ' + file);
    assert.ok(shell.includes(file), 'Nicht im Service Worker (Offline-Hülle): ' + file);
    assert.ok(hashed.includes(file), 'Nicht im Build-Hash (veraltete Caches): ' + file);
  }
  assert.deepEqual([...shell].sort(), [...hashed].sort(), 'Service Worker und Build-Hash müssen dieselben Dateien kennen');
});

test('Startdatei wird zuletzt geladen, damit alle Funktionen vorher definiert sind', () => {
  const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
  const app = scripts.filter(s => s.startsWith('js/') || s.startsWith('data/') || s === 'enhancements.js');
  assert.equal(app.at(-1), 'js/main.js');
  assert.ok(scripts.indexOf('js/logic.js') < scripts.indexOf('enhancements.js'));
  assert.ok(scripts.indexOf('data/fallback.js') < scripts.indexOf('js/core.js'));
});

test('Alle lokalen Bilder in den Skripten und Daten gibt es als Datei', () => {
  const files = [...fs.readdirSync('src/client/js').map(f => 'js/' + f), ...fs.readdirSync('src/client/data').map(f => 'data/' + f), 'enhancements.js'];
  const missing = [];
  for (const file of files) {
    const text = fs.readFileSync('src/client/' + file, 'utf8');
    for (const [, path] of text.matchAll(/'(assets\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp))'/g)) {
      const webp = path.replace(/\.(png|jpe?g)$/i, '.webp');
      if (!fs.existsSync('src/client/' + path) && !fs.existsSync('src/client/' + webp)) missing.push(file + ': ' + path);
    }
  }
  assert.deepEqual(missing, []);
});
