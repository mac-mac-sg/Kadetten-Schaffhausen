import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const original=fs.readFileSync('dist/client/js/app.js','utf8'),preview=fs.readFileSync('dist/client/v2/js/app.js','utf8');
assert.ok(!original.includes('v2-match-layers'),'Original must not load V2');
assert.ok(!preview.includes('v2-match-layers'),'Retired V2 layer code must not load');
assert.ok(!original.includes('v2Storage'),'Original must retain existing storage');
const originalCss=fs.readFileSync('dist/client/app.css','utf8'),previewCss=fs.readFileSync('dist/client/v2/app.css','utf8');
assert.ok(!originalCss.includes('.qhl-map-screen')&&previewCss.includes('.qhl-map-screen'),'QHL explorer must remain V2-only');
assert.ok(!original.includes('qhl-map-screen')&&preview.includes('qhl-map-screen'),'QHL explorer code must remain V2-only');
assert.ok(originalCss.includes('.v2-club-entry')&&originalCss.includes('data-club-layout=modern'),'Shared club layout missing');
const previewHtml=fs.readFileSync('dist/client/v2/index.html','utf8');
assert.match(previewHtml,/data-preview="v2"/);
assert.doesNotMatch(previewHtml,/data-design="v2"/);
assert.match(previewHtml,/localStorage.getItem\('v2:fan-v1-theme'\)/,'Early theme must use isolated V2 preference');
assert.ok(preview.includes('v2:'),'V2 storage namespace missing');
const manifest=JSON.parse(fs.readFileSync('dist/client/v2/manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');assert.equal(manifest.name,'Meine Vereine');assert.equal(manifest.short_name,'Meine Vereine');
for(const base of ['dist/client','dist/client/v2']) {
 const appManifest=JSON.parse(fs.readFileSync(base+'/manifest.webmanifest','utf8'));
 assert.equal(appManifest.name,'Meine Vereine');assert.equal(appManifest.short_name,'Meine Vereine');
 const html=fs.readFileSync(base+'/index.html','utf8');
 assert.match(html,/data-club-layout="modern"/);
 if(base==='dist/client')assert.doesNotMatch(html,/data-preview="v2"/);
 for(const [,file] of html.matchAll(/(?:src|href)="((?:assets|js)\/[^"?#]+|app.css|platform-config.js|manifest.webmanifest)/g))assert.ok(fs.existsSync(base+'/'+file),'Missing asset: '+base+'/'+file);
 const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 if(base.endsWith('/v2'))for(const [,code] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)){if(code)assert.ok(csp.includes("'sha256-"+createHash('sha256').update(code).digest('base64')+"'"),'V2 inline script blocked by CSP');}
 const sw=fs.readFileSync(base+'/sw.js','utf8');assert.ok(sw.includes('encodeURIComponent(BASE.pathname)'),'Worker cache scope missing');
}
console.log('Original/V2 isolation, PWA scopes, cache namespaces and assets verified.');
