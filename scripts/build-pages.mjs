import {spawnSync} from 'node:child_process';
import {writeFileSync,rmSync} from 'node:fs';
import {buildApp} from './build-app.mjs';
function build(design='') {
 const r=spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit',env:{...process.env,KADETTEN_TARGET:'pages',KADETTEN_DESIGN:design}});
 if(r.status!==0)throw Error('Pages build failed: '+design);
 writeFileSync('dist/client/.nojekyll','');
}
// V1 «Matchday» unter / bleibt Byte für Byte unverändert (scripts/check-v1-frozen.mjs).
build();
// Unter /v2/ liegt die Kadetten Companion App aus src/kadetten (docs/kadetten-app.md, Schritt 6).
// Gleicher Ort, gleiche Manifest-ID und gleicher Scope wie die bisherige V2, damit installierte Apps weiterlaufen.
rmSync('dist/client/v2',{recursive:true,force:true});
await buildApp({outDir:'dist/client/v2',target:'pages'});

await import('./check-preview.mjs');
