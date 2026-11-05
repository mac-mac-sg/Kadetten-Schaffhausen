// V1 «Matchday» ist eingefroren (docs/kadetten-app.md, Entscheid «Matchday»): An V1 werden keine Änderungen mehr vorgenommen.
// Prüft nach `npm run build:pages`, dass die veröffentlichte V1-Ausgabe (dist/client ohne v2/) Byte für Byte
// der festgehaltenen Liste entspricht. Ein Unterschied bricht die Prüfung ab und nennt die betroffenen Dateien.
// Nur nach ausdrücklichem Auftrag des Eigentümers neu festhalten: node scripts/check-v1-frozen.mjs --festhalten
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const ROOT = 'dist/client', LIST = 'tests/fixtures/v1-pages.sha256';

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return relative(ROOT, path) === 'v2' ? [] : files(path);
    return [relative(ROOT, path).split('\\').join('/')];
  });
}

export function v1Digest() {
  return files(ROOT).sort().map(file => `${createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex')}  ${file}`).join('\n') + '\n';
}

const current = v1Digest();
if (process.argv.includes('--festhalten')) {
  writeFileSync(LIST, current);
  console.log(`V1-Ausgabe festgehalten: ${current.trim().split('\n').length} Dateien in ${LIST}`);
} else {
  const expected = readFileSync(LIST, 'utf8');
  if (current !== expected) {
    const a = new Map(expected.trim().split('\n').map(l => l.split('  ').reverse()));
    const b = new Map(current.trim().split('\n').map(l => l.split('  ').reverse()));
    const changed = [...new Set([...a.keys(), ...b.keys()])].filter(f => a.get(f) !== b.get(f)).sort();
    console.error('V1-Ausgabe weicht vom eingefrorenen Stand ab. An V1 werden keine Änderungen vorgenommen.\nBetroffene Dateien:\n' + changed.map(f => `  ${a.has(f) ? (b.has(f) ? 'geändert' : 'fehlt') : 'neu'}: ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`V1-Ausgabe unverändert: ${current.trim().split('\n').length} Dateien bytegleich.`);
}
