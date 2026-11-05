import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {buildApp, API_ORIGIN_PAGES} from '../scripts/build-app.mjs';

const OUT = 'dist/app-test';

function sources(dir) {
  return readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? sources(p) : [p]; });
}

test('Eigene Codebasis: keine Datei der neuen App greift auf src/client zu', () => {
  for (const file of sources('src/kadetten').filter(f => /\.(js|css|html)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /src\/client|\.\.\/\.\.\/client|from ['"]\.\.\/\.\.\/\.\./, file);
  }
});

test('Build: Hülle vollständig, Service Worker ohne Platzhalter, Datendienst nur lesend erlaubt', async () => {
  const {version, shell} = await buildApp({outDir: OUT, target: 'pages'});
  for (const file of shell.filter(f => f !== './')) assert.ok(existsSync(join(OUT, file)), 'fehlt: ' + file);
  const sw = readFileSync(join(OUT, 'sw.js'), 'utf8');
  assert.doesNotMatch(sw, /__[A-Z_]+__/);
  assert.match(sw, new RegExp(`const VERSION = "${version}"`));
  assert.match(sw, /NEVER_CACHE = \/\^\\\/api\\\/\(live\|push/);
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`connect-src 'self' ${API_ORIGIN_PAGES.replace(/[.]/g, '\\.')};`));
  assert.match(html, /script-src 'self';/);
  assert.doesNotMatch(html, /<script>(?!<)/, 'keine Inline-Skripte');
  assert.match(html, new RegExp(`app\\.js\\?v=${version}`));
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) assert.ok(existsSync(join(OUT, match[1].split('?')[0])), 'fehlt: ' + match[1]);
  // Schriften und Bilder kommen vom eigenen Host, nicht von Drittservern.
  const css = readFileSync(join(OUT, 'app.css'), 'utf8');
  assert.doesNotMatch(css + html, /fonts\.googleapis|fonts\.gstatic/);
  for (const match of css.matchAll(/url\(["']?([^"')]+)/g)) assert.ok(existsSync(join(OUT, match[1])), 'fehlt: ' + match[1]);
  assert.ok(existsSync(join(OUT, 'fonts/LICENSE-inter')) && existsSync(join(OUT, 'fonts/LICENSE-barlow-condensed')));
  const js = readFileSync(join(OUT, 'app.js'), 'utf8');
  assert.ok(js.includes(API_ORIGIN_PAGES));
  // Installierte V2-Apps laufen weiter: gleiche ID und gleicher Scope.
  const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.webmanifest'), 'utf8'));
  assert.deepEqual([manifest.id, manifest.scope, manifest.start_url], ['./', './', './']);
  assert.equal(manifest.short_name, 'Kadetten');
});

test('Build ohne Ziel liest vom eigenen Host (lokale Vorschau)', async () => {
  await buildApp({outDir: OUT, target: ''});
  assert.match(readFileSync(join(OUT, 'index.html'), 'utf8'), /connect-src 'self';/);
  assert.ok(!readFileSync(join(OUT, 'app.js'), 'utf8').includes(API_ORIGIN_PAGES));
});
