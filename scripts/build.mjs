import {cpSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});cpSync('src/client','dist/client',{recursive:true});
import fs from 'node:fs';
import {build} from 'esbuild';
await build({entryPoints:['server/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});

const apiOrigin=process.env.KADETTEN_TARGET==='pages'?'https://kadetten.ma-ra10.chatgpt.site':'';
fs.writeFileSync('dist/client/platform-config.js','window.KADETTEN_PLATFORM='+JSON.stringify({apiOrigin})+';\n');

// Content-version the complete shell on every build, including future UI edits.
const {createHash}=await import('node:crypto');
const shellFiles=['platform-config.js','platform.js','data/venues.js','data/squad.js','data/fcsg-fallback.js','data/fallback.js','data/club.js','js/logic.js','enhancements.js','js/core.js','js/views-news.js','js/views-season.js','js/views-match.js','js/views-player.js','js/views-club.js','js/clubs.js','js/router.js','js/data-sync.js','js/live.js','js/main.js','style.css','enhancements.css','club.css','pwa.js','manifest.webmanifest','assets/anton.ttf'];
let html=fs.readFileSync('dist/client/index.html','utf8').replace(/\?v=[a-f0-9]+/g,'');
let sw=fs.readFileSync('dist/client/sw.js','utf8').replace("const API_ORIGIN='';",'const API_ORIGIN='+JSON.stringify(apiOrigin)+';').replace(/const CACHE='[^']+';/,"const CACHE='kadetten-offline-build';").replace(/\?v=[a-f0-9]+/g,'');
const hash=createHash('sha256').update(html).update(sw);
for(const file of shellFiles)hash.update(fs.readFileSync('dist/client/'+file));
const version=hash.digest('hex').slice(0,16);
for(const file of shellFiles.filter(f=>!f.startsWith('assets/'))){html=html.replaceAll('"'+file+'"','"'+file+'?v='+version+'"').replaceAll('"/'+file+'"','"/'+file+'?v='+version+'"');sw=sw.replaceAll("'"+file+"'","'"+file+'?v='+version+"'").replaceAll("'/"+file+"'","'/"+file+'?v='+version+"'")}
sw=sw.replace("kadetten-offline-build",'kadetten-offline-'+version);
fs.writeFileSync('dist/client/index.html',html);fs.writeFileSync('dist/client/sw.js',sw);
