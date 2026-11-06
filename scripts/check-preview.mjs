// Prüft nach `npm run build:pages`, dass unter /v2/ die Kadetten Companion App liegt und sauber von V1 getrennt ist.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const v2='dist/client/v2/';
const html=fs.readFileSync(v2+'index.html','utf8');
assert.match(html,/<title>Kadetten<\/title>/,'V2 muss die Kadetten Companion App sein');
assert.match(html,/name="apple-mobile-web-app-title" content="Kadetten"/);
assert.match(html,/data-club-layout="modern" data-home-title="modern"/,'V2 verwendet die Matchday-Hülle');
assert.doesNotMatch(html,/data-preview|arena-head/,'Kein eigener Designentwurf über Matchday');
assert.match(html,/connect-src 'self' https:\/\/kadetten-api\.mac-mac-sg\.workers\.dev;/);
for(const [,file] of html.matchAll(/(?:src|href)="([^"#?]+)/g)){assert.ok(!file.startsWith('/')&&!file.startsWith('..'),'Pfad verlässt /v2/: '+file);assert.ok(fs.existsSync(v2+file),'Fehlt: '+v2+file);}
const manifest=JSON.parse(fs.readFileSync(v2+'manifest.webmanifest','utf8'));
// Installierte V2-Apps laufen weiter: gleiche ID, gleicher Scope, gleiche Symbole.
assert.deepEqual([manifest.id,manifest.scope,manifest.start_url],['./','./','./']);
assert.deepEqual([manifest.name,manifest.short_name],['Kadetten Fan-App','Kadetten']);
assert.deepEqual(manifest.icons.map(i=>i.src),['assets/icon-192.png','assets/icon-512.png','assets/icon-maskable-512.png']);
for(const icon of manifest.icons)assert.ok(fs.existsSync(v2+icon.src));
const sw=fs.readFileSync(v2+'sw.js','utf8');
assert.doesNotMatch(sw,/__[A-Z_]+__/);
assert.match(sw,/const NS = encodeURIComponent\(SCOPE\.pathname\)/,'Caches sind auf /v2/ beschränkt');
assert.match(sw,/OLD_V2 = /,'Caches der bisherigen V2 werden abgeräumt');
for(const file of JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1]).filter(f=>f!=='./'))assert.ok(fs.existsSync(v2+file),'Hülle fehlt: '+file);
// V1 lädt nichts aus der neuen App und umgekehrt.
const v1=fs.readFileSync('dist/client/index.html','utf8');
assert.doesNotMatch(v1,/kadetten-app|app\.js\?v=.*type="module"/);
assert.ok(!fs.readFileSync(v2+'app.js','utf8').includes('platform-config.js'));
assert.ok(!fs.existsSync(v2+'js/app.js'),'Bundle der bisherigen V2 darf nicht mehr ausgeliefert werden');
console.log('V2 = Matchday-Layout mit Companion-Funktionen: Pfade, Manifest, Offline-Hülle und Trennung von V1 geprüft.');
