import {cpSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});cpSync('src/client','dist/client',{recursive:true});
import fs from 'node:fs';
fs.mkdirSync('dist/client/vendor',{recursive:true});
for(const name of ['pdf.mjs','pdf.worker.mjs'])cpSync('node_modules/pdfjs-dist/build/'+name,'dist/client/vendor/'+name);
cpSync('node_modules/pdfjs-dist/LICENSE','dist/client/vendor/PDFJS-LICENSE');
import {build} from 'esbuild';
await build({entryPoints:['server/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});

const apiOrigin=process.env.KADETTEN_TARGET==='pages'?'https://kadetten-api.mac-mac-sg.workers.dev':'';
fs.writeFileSync('dist/client/platform-config.js','window.KADETTEN_PLATFORM='+JSON.stringify({apiOrigin})+';\n');

// Content-version the complete shell on every build, including future UI edits.
const {createHash}=await import('node:crypto');
const shellFiles=['platform-config.js','platform.js','data/venues.js','data/squad.js','data/otmar-fallback.js','data/otmar-history.js','data/fcsg-fallback.js','data/fallback.js','data/club.js','js/logic.js','enhancements.js','js/core.js','js/views-news.js','js/views-season.js','js/views-week.js','js/views-match.js','js/views-player.js','js/views-club.js','js/clubs.js','js/push-settings.js','js/fcsg-live.js','js/fcsg-match.js','js/fcsg-history.js','js/view-state.js','js/match-header.js','js/router.js','js/data-sync.js','js/live.js','js/club-design.js','js/main.js','style.css','enhancements.css','fcsg-match.css','v1-theme.css','club.css','club-design.css','pwa.js','manifest.webmanifest','assets/anton.ttf','assets/bbc-arena-hall.webp','assets/fcsg-stadium.jpg','assets/otmar-kreuzbleiche.webp'];
let html=fs.readFileSync('dist/client/index.html','utf8').replace(/\?v=[a-f0-9]+/g,'');
const v2=process.env.KADETTEN_DESIGN==='v2';
if(v2){
  shellFiles.push('v2/qhl-clubs.js','v2/qhl-map.js','v2/qhl-map.css');
  html=html.replace('</head>','<link rel="stylesheet" href="v2/qhl-map.css"></head>').replace('<script src="js/main.js"></script>','<script src="v2/qhl-clubs.js"></script><script src="v2/qhl-map.js"></script><script src="js/main.js"></script>');
  html=html.replace("connect-src 'self'", "connect-src 'self' https://tiles.openfreemap.org");
  html=html.replace('<html lang="de-CH"', '<html data-preview="v2" lang="de-CH"').replace("if(!location.pathname.split('/').includes('v2'))","if(true)").replace("localStorage.getItem('fan-v1-theme')","localStorage.getItem('v2:fan-v1-theme')");
  html=html.replace("img-src 'self' https: data:", "img-src 'self' https: data: blob:");
  const themeInit=html.match(/<script data-v1-theme-init>([\s\S]*?)<\/script>/)[1];
  html=html.replace("script-src 'self'","script-src 'self' 'sha256-"+createHash('sha256').update(themeInit).digest('base64')+"'");
  const manifest=JSON.parse(fs.readFileSync('dist/client/manifest.webmanifest','utf8'));
  Object.assign(manifest,{name:'Meine Vereine · V2 Test',short_name:'Vereine V2',description:'Separate Design-Testversion der Vereins-App'});
  fs.writeFileSync('dist/client/manifest.webmanifest',JSON.stringify(manifest,null,2));
}
let sw=fs.readFileSync('dist/client/sw.js','utf8').replace("const API_ORIGIN='';",'const API_ORIGIN='+JSON.stringify(apiOrigin)+';').replace(/const CACHE='[^']+';/,"const CACHE='kadetten-offline-build';").replace(/\?v=[a-f0-9]+/g,'');
// Die Quellmodule bleiben getrennt; die öffentliche Hülle lädt zwei verzögerte Skripte und ein Stylesheet.
const scripts=[...html.matchAll(/<script src="([^"?]+)"[^>]*><\/script>/g)].map(m=>m[1]).filter(file=>file!=='platform-config.js');
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"?]+)"[^>]*>/g)].map(m=>m[1]);
fs.mkdirSync('dist/client/js',{recursive:true});
await build({stdin:{contents:(v2?`const v2Storage={getItem:k=>window.localStorage.getItem('v2:'+k),setItem:(k,v)=>window.localStorage.setItem('v2:'+k,v),removeItem:k=>window.localStorage.removeItem('v2:'+k)};\n`:'')+scripts.map(file=>{const text=fs.readFileSync('dist/client/'+file,'utf8');return v2?text.replace(/\blocalStorage\b/g,'v2Storage'):text;}).join('\n;\n'),sourcefile:'client-source.js'},outfile:'dist/client/js/app.js',format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
const {transform}=await import('esbuild');
const css=await transform(styles.map(file=>fs.readFileSync('dist/client/'+file,'utf8')).join('\n'),{loader:'css',target:'es2022',minify:true,legalComments:'none'});
fs.writeFileSync('dist/client/app.css',css.code);
html=html.replace(/<link rel="stylesheet" href="[^"?]+"[^>]*>/g,'').replace('</head>','<link rel="stylesheet" href="app.css"></head>');
html=html.replace(/<script src="([^"?]+)"[^>]*><\/script>/g,(_,file)=>file==='platform-config.js'?'<script src="platform-config.js" defer></script>':'').replace('</body>','<script src="js/app.js" defer></script></body>');
const emittedShell=['platform-config.js','js/app.js','app.css','manifest.webmanifest',...shellFiles.filter(file=>file.startsWith('assets/'))];
sw=sw.replace(/const SHELL=\[[^\]]*\]/,'const SHELL='+JSON.stringify(['./',...emittedShell]));
const hash=createHash('sha256').update(html).update(sw);
for(const file of shellFiles)hash.update(fs.readFileSync('dist/client/'+file));
if(v2)for(const file of fs.readdirSync('dist/client/assets/maplibre-6.15.0'))hash.update(fs.readFileSync('dist/client/assets/maplibre-6.15.0/'+file));
for(const file of ['js/app.js','app.css'])hash.update(fs.readFileSync('dist/client/'+file));
const version=hash.digest('hex').slice(0,16);
for(const file of emittedShell.filter(f=>!f.startsWith('assets/'))){html=html.replaceAll('"'+file+'"','"'+file+'?v='+version+'"');sw=sw.replaceAll(JSON.stringify(file),JSON.stringify(file+'?v='+version));}
sw=sw.replace("kadetten-offline-build",'kadetten-offline-'+version);
fs.writeFileSync('dist/client/index.html',html);fs.writeFileSync('dist/client/sw.js',sw);
