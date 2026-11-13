// Prüft nach `npm run build:pages`, dass unter / und unter /v2/ dieselbe Kadetten-App liegt (Matchday ist archiviert).
import assert from 'node:assert/strict';
import fs from 'node:fs';

function checkApp(root, label) {
  const html = fs.readFileSync(root + 'index.html', 'utf8');
  assert.match(html, /<title>Kadetten<\/title>/, label + ' muss die Kadetten-App sein');
  assert.match(html, /name="apple-mobile-web-app-title" content="Kadetten"/);
  assert.doesNotMatch(html, /FCSG|St\. Otmar|Meine Vereine|Matchday|data-preview/, 'Kein Rest von Matchday in ' + label);
  assert.match(html, /connect-src 'self' https:\/\/kadetten-api\.mac-mac-sg\.workers\.dev;/);
  for (const [, file] of html.matchAll(/(?:src|href)="([^"#?]+)/g)) {
    assert.ok(!file.startsWith('/') && !file.startsWith('..'), 'Pfad verlässt ' + label + ': ' + file);
    assert.ok(fs.existsSync(root + file), 'Fehlt: ' + root + file);
  }
  const manifest = JSON.parse(fs.readFileSync(root + 'manifest.webmanifest', 'utf8'));
  // Gleiche relative ID und gleicher Scope: Unter / übernimmt die Kadetten-App installierte Matchday-Apps, unter /v2/ laufen installierte V2-Apps weiter.
  assert.deepEqual([manifest.id, manifest.scope, manifest.start_url], ['./', './', './']);
  assert.deepEqual([manifest.name, manifest.short_name], ['Kadetten Fan-App', 'Kadetten']);
  for (const icon of manifest.icons) assert.ok(fs.existsSync(root + icon.src));
  const sw = fs.readFileSync(root + 'sw.js', 'utf8');
  assert.doesNotMatch(sw, /__[A-Z_]+__/);
  assert.match(sw, /const NS = encodeURIComponent\(SCOPE\.pathname\)/, 'Caches tragen den Pfad der App');
  assert.match(sw, /OLD_CACHE = /, 'Caches von Matchday und der bisherigen V2 werden abgeräumt');
  for (const file of JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1]).filter(f => f !== './')) assert.ok(fs.existsSync(root + file), 'Hülle fehlt: ' + root + file);
  assert.ok(!fs.existsSync(root + 'js/app.js'), 'Bundle von Matchday darf nicht mehr ausgeliefert werden');
  assert.ok(!fs.existsSync(root + 'platform-config.js'), 'Konfiguration von Matchday darf nicht mehr ausgeliefert werden');
}

checkApp('dist/client/', '/');
checkApp('dist/client/v2/', '/v2/');
// Beide Orte sind derselbe Stand: gleiche Hüllenversion.
const version = root => fs.readFileSync(root + 'sw.js', 'utf8').match(/const VERSION = ["']([^"']+)["']/)[1];
assert.equal(version('dist/client/'), version('dist/client/v2/'), '/ und /v2/ müssen denselben Stand ausliefern');
console.log('Kadetten-App unter / und /v2/: Pfade, Manifest, Offline-Hülle, kein Rest von Matchday.');
