import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for (const folder of ['server','scripts','src/client','src/client/js','src/client/data','src/kadetten','src/kadetten/js','src/kadetten/js/views','src/kadetten/js/wissen','src/kadetten/data']) {
  for (const name of readdirSync(folder).filter(x=>/\.(mjs|js)$/.test(x))) {
    const result=spawnSync(process.execPath,['--check',`${folder}/${name}`],{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
  }
}
// Formatierung der V2-App (Prettier, Einstellungen in .prettierrc.json). V1 bleibt eingefroren und wird nicht formatiert.
const format = spawnSync(process.execPath, ['node_modules/prettier/bin/prettier.cjs', '--check', 'src/kadetten/js'], {stdio: 'inherit'});
if (format.status !== 0) { console.error('Formatierung abweichend: npm run format'); process.exit(format.status || 1); }
