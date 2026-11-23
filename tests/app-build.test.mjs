import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {buildApp, API_ORIGIN_PAGES} from '../scripts/build-app.mjs';

const OUT = 'dist/app-test';

function sources(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sources(p) : [p];
  });
}

test('Eigene Codebasis: keine Datei der Kadetten-App greift auf das Archiv von Matchday zu', () => {
  for (const file of sources('src/kadetten').filter(f => /\.(js|css|html)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /src\/client|archive\/matchday|\.\.\/\.\.\/client|from ['"]\.\.\/\.\.\/\.\./, file);
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
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g))
    assert.ok(existsSync(join(OUT, match[1].split('?')[0])), 'fehlt: ' + match[1]);
  // Schriften und Bilder kommen vom eigenen Host, nicht von Drittservern.
  const css = readFileSync(join(OUT, 'app.css'), 'utf8');
  assert.doesNotMatch(css + html, /fonts\.googleapis|fonts\.gstatic/);
  for (const match of css.matchAll(/url\(["']?([^"')]+)/g)) assert.ok(existsSync(join(OUT, match[1])), 'fehlt: ' + match[1]);
  assert.ok(existsSync(join(OUT, 'fonts/LICENSE-inter')) && existsSync(join(OUT, 'fonts/LICENSE-barlow-condensed')));
  const js = readFileSync(join(OUT, 'app.js'), 'utf8');
  assert.ok(js.includes(API_ORIGIN_PAGES));
  // Wissensbereich als eigene, nachgeladene Datei; offline in der Hülle; gemeinsamer Teil wird vorgeladen.
  const chunks = shell.filter(f => f.startsWith('chunks/'));
  assert.ok(
    chunks.some(f => /^chunks\/modul-[A-Z0-9]+\.js$/.test(f)),
    'Wissen als eigene Datei in der Hülle'
  );
  assert.ok(!js.includes('Spielfeld und Torraum'), 'Wissensinhalte nicht im Start-Bündel');
  assert.match(js, /import\("\.\/chunks\/modul-[A-Z0-9]+\.js"\)/);
  for (const [, c] of js.matchAll(/from\s*"\.\/(chunks\/[^"]+)"/g))
    assert.match(html, new RegExp(`<link rel="modulepreload" href="${c.replace(/[.]/g, '\\.')}">`), 'Vorladen: ' + c);
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

test('Versionsnummer: aus package.json und Git-Commit, sichtbar in Einstellungen', async () => {
  const {buildInfo} = await import('../scripts/build-app.mjs');
  const {versionLabel} = await import('../src/kadetten/js/config.js');
  const info = buildInfo();
  assert.match(info.version, /^\d+\.\d+\.\d+$/);
  assert.match(info.commit, /^([0-9a-f]{7})?$/);
  assert.equal(versionLabel('1.2.3', 'abc1234'), 'Version 1.2.3 (abc1234)');
  assert.equal(versionLabel('1.2.3', ''), 'Version 1.2.3');
  assert.equal(versionLabel('', 'abc1234'), '', 'ohne Build keine Angabe');
  const app = readFileSync(join(OUT, 'app.js'), 'utf8');
  assert.ok(app.includes(JSON.stringify(info.version)), 'Version im ausgelieferten Code');
});

test('Cloudflare Web Analytics: nur mit Site-Token, dann Skript und CSP genau für Cloudflare', async () => {
  const {ANALYTICS_SCRIPT, ANALYTICS_ENDPOINT} = await import('../scripts/build-app.mjs');
  const token = '0123456789abcdef0123456789abcdef';
  const on = await buildApp({outDir: OUT + '-wa', target: 'pages', analyticsToken: token});
  const html = readFileSync(join(OUT + '-wa', 'index.html'), 'utf8');
  assert.equal(on.analytics, true);
  assert.match(html, new RegExp(`script-src 'self' ${ANALYTICS_SCRIPT.replace(/[./]/g, '\\$&')};`));
  assert.match(
    html,
    new RegExp(`connect-src 'self' ${API_ORIGIN_PAGES.replace(/[./]/g, '\\$&')} ${ANALYTICS_ENDPOINT.replace(/[./]/g, '\\$&')};`)
  );
  assert.ok(html.includes(`<script defer src="${ANALYTICS_SCRIPT}" data-cf-beacon='{"token": "${token}"}'></script>`));
  const {renderDatenschutz} = await import('../src/kadetten/js/views/datenschutz.js');
  assert.match(String(renderDatenschutz({analytics: true})), /Cloudflare Web Analytics anonym/);
  assert.match(String(renderDatenschutz({analytics: false})), /keine Cookies und kein Tracking/);
  for (const [target, analyticsToken] of [
    ['pages', ''],
    ['pages', 'kein-token'],
    ['', token]
  ]) {
    const off = await buildApp({outDir: OUT + '-wa', target, analyticsToken});
    const plain = readFileSync(join(OUT + '-wa', 'index.html'), 'utf8');
    assert.equal(off.analytics, false, target + '/' + analyticsToken);
    assert.doesNotMatch(plain, /cloudflareinsights/);
  }
});
