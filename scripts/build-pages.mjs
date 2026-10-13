import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdtempSync,renameSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function build(design='') {
 const r=spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit',env:{...process.env,KADETTEN_TARGET:'pages',KADETTEN_DESIGN:design}});
 if(r.status!==0)throw Error('Pages build failed: '+design);
 writeFileSync('dist/client/.nojekyll','');
}
build();
// Keep the original shell byte-for-byte; V2 has its own relative scope and cache namespace.
const temporary=mkdtempSync(join(tmpdir(),'fan-pages-'));
try {
 renameSync('dist/client',join(temporary,'original'));
 build('v2');
 renameSync('dist/client',join(temporary,'preview'));
 mkdirSync('dist',{recursive:true});
 renameSync(join(temporary,'original'),'dist/client');
 rmSync('dist/client/v2',{recursive:true,force:true});
 renameSync(join(temporary,'preview'),'dist/client/v2');
} finally { rmSync(temporary,{recursive:true,force:true}); }

await import('./check-preview.mjs');
