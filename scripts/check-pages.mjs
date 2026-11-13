// Prüft die Pages-Ausgabe nach `npm run build:pages`: Projektpfade, Symbole und dass keine Quellen veröffentlicht werden.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = 'dist/client/';
const manifest = JSON.parse(fs.readFileSync(root + 'manifest.webmanifest', 'utf8'));
assert.equal(manifest.scope, './');
assert.equal(manifest.start_url, './');
for (const icon of manifest.icons) {
  const png = fs.readFileSync(root + icon.src),
    [width, height] = icon.sizes.split('x').map(Number);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
}
assert.ok(fs.existsSync(root + '.nojekyll'), 'GitHub Pages braucht .nojekyll');
for (const folder of ['server', 'archive', 'src']) assert.ok(!fs.existsSync(root + folder), 'Quellen dürfen nie veröffentlicht werden: ' + folder);
assert.match(fs.readFileSync(root + 'app.js', 'utf8'), /https:\/\/kadetten-api\.mac-mac-sg\.workers\.dev/);
console.log('Pages build: Kadetten-App unter / und /v2/, Pfade, Symbole und Datendienst geprüft.');
