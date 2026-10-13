import assert from 'node:assert/strict';
import fs from 'node:fs';
const original=fs.readFileSync('dist/client/js/app.js','utf8'),preview=fs.readFileSync('dist/client/v2/js/app.js','utf8');
assert.ok(!original.includes('v2-match-layers'),'Original must not load V2');
assert.ok(preview.includes('v2-match-layers'),'V2 layer code missing');
assert.ok(preview.includes('v2:'),'V2 storage namespace missing');
const manifest=JSON.parse(fs.readFileSync('dist/client/v2/manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');assert.equal(manifest.short_name,'Vereine V2');
for(const base of ['dist/client','dist/client/v2']) {
 const html=fs.readFileSync(base+'/index.html','utf8');
 for(const [,file] of html.matchAll(/(?:src|href)="((?:assets|js)\/[^"?#]+|app.css|platform-config.js|manifest.webmanifest)/g))assert.ok(fs.existsSync(base+'/'+file),'Missing asset: '+base+'/'+file);
 const sw=fs.readFileSync(base+'/sw.js','utf8');assert.ok(sw.includes('encodeURIComponent(BASE.pathname)'),'Worker cache scope missing');
}
console.log('Original/V2 isolation, PWA scopes, cache namespaces and assets verified.');
