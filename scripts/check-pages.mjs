import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='dist/client/';
const html=fs.readFileSync(root+'index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const path=match[1];if(path.startsWith('#')||/^https?:/.test(path))continue;
 assert.ok(!path.startsWith('/'),'Asset escapes the GitHub project path: '+path);
 assert.ok(fs.existsSync(root+path.split('?')[0]),'Missing asset: '+path);
}
const m=JSON.parse(fs.readFileSync(root+'manifest.webmanifest'));
assert.equal(m.scope,'./');assert.equal(m.start_url,'./');
for(const icon of m.icons)assert.ok(fs.existsSync(root+icon.src));
assert.match(fs.readFileSync(root+'platform-config.js','utf8'),/https:\/\/kadetten-api\.mac-mac-sg\.workers\.dev/);
assert.ok(!fs.existsSync(root+'server'),'Server source must never be published as static assets');
console.log('Pages build: project paths, PWA, icons and API configuration verified.');
