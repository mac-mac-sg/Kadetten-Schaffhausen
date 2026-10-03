import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for (const folder of ['server','scripts','src/client','src/client/js','src/client/data']) {
  for (const name of readdirSync(folder).filter(x=>/\.(mjs|js)$/.test(x))) {
    const result=spawnSync(process.execPath,['--check',`${folder}/${name}`],{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
  }
}
