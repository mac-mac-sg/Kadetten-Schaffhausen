import {cpSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});cpSync('src/client','dist/client',{recursive:true});
import fs from 'node:fs';
fs.mkdirSync('dist/server',{recursive:true});let shv=fs.readFileSync('server/shv.mjs','utf8').replaceAll('export const','const').replaceAll('export function','function').replaceAll('export async function','async function');let update=fs.readFileSync('server/update.mjs','utf8').replace(/import \{parsePlayerSeason,fetchPlayerSeason\}[^\n]+\n/,'').replaceAll('export function','function').replaceAll('export async function','async function');let live=fs.readFileSync('server/live.mjs','utf8').replaceAll('export function','function').replaceAll('export async function','async function');let worker=fs.readFileSync('server/worker.mjs','utf8').replace(/import \{getLiveMatch,getRecentGames,getHeadToHead\}[^\n]+\n/,'').replace(/import seed[^\n]+\n/,'const seed='+fs.readFileSync('server/seed.json','utf8')+';\n').replace(/import \{refresh\}[^\n]+\n/,'');fs.writeFileSync('dist/server/index.js',shv+'\n'+update+'\n'+live+'\n'+worker);

// Content-version the complete shell on every build, including future UI edits.
const {createHash}=await import('node:crypto');
const shellFiles=['app.js','enhancements.js','style.css','enhancements.css','pwa.js','manifest.webmanifest','assets/anton.ttf'];
let html=fs.readFileSync('dist/client/index.html','utf8').replace(/\?v=[a-f0-9]+/g,'');
let sw=fs.readFileSync('dist/client/sw.js','utf8').replace(/const CACHE='[^']+';/,"const CACHE='kadetten-offline-build';").replace(/\?v=[a-f0-9]+/g,'');
const hash=createHash('sha256').update(html).update(sw);
for(const file of shellFiles)hash.update(fs.readFileSync('dist/client/'+file));
const version=hash.digest('hex').slice(0,16);
for(const file of shellFiles.filter(f=>!f.startsWith('assets/'))){html=html.replaceAll('"'+file+'"','"'+file+'?v='+version+'"').replaceAll('"/'+file+'"','"/'+file+'?v='+version+'"');sw=sw.replaceAll("'/"+file+"'","'/"+file+'?v='+version+"'")}
sw=sw.replace("kadetten-offline-build",'kadetten-offline-'+version);
fs.writeFileSync('dist/client/index.html',html);fs.writeFileSync('dist/client/sw.js',sw);
