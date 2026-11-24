import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export const FORMATTED = [
  'src/kadetten/js',
  'server/**/*.mjs',
  'scripts/**/*.mjs',
  'tests/**/*.mjs',
  'cloudflare/**/*.mjs',
  'eslint.config.mjs'
];
for (const folder of [
  'server',
  'scripts',
  'src/kadetten',
  'src/kadetten/js',
  'src/kadetten/js/views',
  'src/kadetten/js/wissen',
  'src/kadetten/data'
]) {
  for (const name of readdirSync(folder).filter(x => /\.(mjs|js)$/.test(x))) {
    const result = spawnSync(process.execPath, ['--check', `${folder}/${name}`], {stdio: 'inherit'});
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
// Formatierung (Prettier, Einstellungen in .prettierrc.json): App, Datendienst, Skripte und Tests. Das Archiv (Matchday) bleibt unverändert.
const format = spawnSync(process.execPath, ['node_modules/prettier/bin/prettier.cjs', '--check', ...FORMATTED], {stdio: 'inherit'});
if (format.status !== 0) {
  console.error('Formatierung abweichend: npm run format');
  process.exit(format.status || 1);
}

// Wenige Regeln gegen echte Fehler (eslint.config.mjs): unbenutzte und undefinierte Namen, doppelte Schlüssel, toter Code.
const lint = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '.'], {stdio: 'inherit'});
if (lint.status !== 0) {
  console.error('ESLint meldet Fehler: npx eslint .');
  process.exit(lint.status || 1);
}
