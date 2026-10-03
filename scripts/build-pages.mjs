import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const r=spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit',env:{...process.env,KADETTEN_TARGET:'pages'}});
if(r.status!==0)process.exit(r.status||1);
writeFileSync('dist/client/.nojekyll','');
