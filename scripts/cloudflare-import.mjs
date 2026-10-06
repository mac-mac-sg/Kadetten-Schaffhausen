// Phase 1 des Cloudflare-Umzugs: Inhalte des bisherigen Datendienstes in den KV-Speicher von Cloudflare übernehmen und
// beide Dienste vergleichen. Aufruf (siehe Workflow «Cloudflare-Import und Vergleich»):
//   node scripts/cloudflare-import.mjs import             Trockenlauf: zeigt, was übernommen würde
//   node scripts/cloudflare-import.mjs import --schreiben schreibt in den KV-Speicher (braucht CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID)
//   node scripts/cloudflare-import.mjs compare            vergleicht beide Dienste
// Umgebungsvariablen: SOURCE_URL (bisheriger Dienst), TARGET_URL (Cloudflare). Zugangsdaten werden nie ausgegeben.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {collect, bulkWrite, compareServices} from './lib/cloudflare-migration.mjs';

const SOURCE = (process.env.SOURCE_URL || 'https://kadetten.ma-ra10.chatgpt.site').replace(/\/$/, '');
const TARGET = (process.env.TARGET_URL || 'https://kadetten-api.mac-mac-sg.workers.dev').replace(/\/$/, '');
const headers = {'User-Agent': 'kadetten-app-import'};

export const http = {
  async json(url) {
    const r = await fetch(url, {headers, signal: AbortSignal.timeout(30000)});
    let data = null;
    try { data = await r.json(); } catch {}
    return {status: r.status, data};
  },
  async bytes(url) {
    const r = await fetch(url, {headers, signal: AbortSignal.timeout(60000)});
    return {status: r.status, bytes: new Uint8Array(await r.arrayBuffer())};
  }
};

const namespaceId = () => fs.readFileSync('cloudflare/api/wrangler.toml', 'utf8').match(/^id = "([a-f0-9]{32})"/m)?.[1];
const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runImport(schreiben) {
  const {entries, summary} = await collect(http, SOURCE);
  write(`### Import aus dem bisherigen Dienst (${schreiben ? 'geschrieben' : 'Trockenlauf'})\n\n| Gruppe | gelesen | übersprungen |\n|---|---|---|`);
  for (const [group, s] of Object.entries(summary)) write(`| ${group} | ${s.read} | ${s.skipped} |`);
  write(`\n${entries.length} KV-Einträge, ${Math.round(entries.reduce((n, e) => n + e.value.length, 0) / 1024)} KB.`);
  if (!schreiben) return write('\nTrockenlauf: nichts geschrieben.');
  const {CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId} = process.env;
  if (!token || !accountId) throw Error('CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID fehlen.');
  const ns = namespaceId();
  if (!ns) throw Error('KV-Namespace-ID nicht in cloudflare/api/wrangler.toml gefunden.');
  const n = await bulkWrite(fetch, {accountId, namespaceId: ns, token}, entries);
  write(`\n${n} Einträge in den KV-Speicher geschrieben.`);
}

async function runCompare() {
  let result;
  // KV kann Änderungen kurz verzögert ausliefern; bei Abweichungen mehrmals nachfragen.
  for (let attempt = 1; attempt <= 4; attempt++) {
    result = await compareServices(http, SOURCE, TARGET);
    if (result.rows.every(r => r.different === 0)) break;
    if (attempt < 4) await sleep(20000);
  }
  write(`### Vergleich: bisheriger Dienst gegen Cloudflare\n\n| Gruppe | verglichen | gleich | abweichend | erste Abweichung |\n|---|---|---|---|---|`);
  for (const r of result.rows) write(`| ${r.group} | ${r.compared} | ${r.equal} | ${r.different} | ${r.first || ''} |`);
  if (result.rows.some(r => r.different > 0)) { write('\nAbweichungen vorhanden.'); process.exitCode = 1; }
  else write('\nAlle verglichenen Antworten sind gleich.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  try {
    if (mode === 'import') await runImport(process.argv.includes('--schreiben'));
    else if (mode === 'compare') await runCompare();
    else { console.error('Aufruf: node scripts/cloudflare-import.mjs import [--schreiben] | compare'); process.exitCode = 2; }
  } catch (e) {
    console.error('Fehler:', e.message);
    process.exitCode = 1;
  }
}
