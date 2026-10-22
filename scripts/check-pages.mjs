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
for(const icon of m.icons){
 assert.ok(fs.existsSync(root+icon.src));
 const png=fs.readFileSync(root+icon.src),[width,height]=icon.sizes.split('x').map(Number);
 assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
}
assert.match(html,/rel="apple-touch-icon" href="assets\/app-v1-scarf-glow-apple-180.png"/);
assert.match(html,/rel="icon"[^>]*href="assets\/app-v1-scarf-glow-favicon-64.png"/);
assert.match(fs.readFileSync(root+'platform-config.js','utf8'),/https:\/\/kadetten-api\.mac-mac-sg\.workers\.dev/);
assert.ok(!fs.existsSync(root+'server'),'Server source must never be published as static assets');
// Prüft die veröffentlichte Hülle, nicht die ungebündelten Entwicklungsdateien.
const scripts=[...html.matchAll(/<script([^>]*)src="([^"?]+)(?:\?v=([^" ]+))?"([^>]*)>/g)];
assert.deepEqual(scripts.map(m=>m[2]),['platform-config.js','js/app.js']);
assert.ok(scripts.every(m=>/\bdefer\b/.test(m[1]+m[4])),'Client scripts must defer execution');
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"?]+)(?:\?v=([^" ]+))?"/g)];
assert.deepEqual(styles.map(m=>m[1]),['app.css']);
const sw=fs.readFileSync(root+'sw.js','utf8');
const shell=JSON.parse(sw.match(/const SHELL=(\[[^\]]*\])/)[1]);
const version=sw.match(/const CACHE='kadetten-offline-([a-f0-9]+)'/)[1];
for(const icon of [...m.icons.map(i=>i.src),'assets/app-v1-scarf-glow-apple-180.png','assets/app-v1-scarf-glow-favicon-64.png'])assert.ok(shell.includes(icon),'App icon must be available offline: '+icon);
for(const script of scripts){assert.equal(script[3],version);assert.ok(shell.includes(script[2]+'?v='+version));}
for(const style of styles){assert.equal(style[2],version);assert.ok(shell.includes(style[1]+'?v='+version));}
assert.ok(fs.existsSync(root+'vendor/pdf.mjs')&&fs.existsSync(root+'vendor/pdf.worker.mjs'),'Lazy PDF renderer must remain available');
console.log('Pages build: project paths, PWA, icons and API configuration verified.');
