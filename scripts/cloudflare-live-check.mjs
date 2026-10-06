// Prüft die Live-Routen des bisherigen und des neuen Datendienstes (nur lesend, keine Zugangsdaten).
// Aufruf: node scripts/cloudflare-live-check.mjs   (Umgebungsvariablen SOURCE_URL, TARGET_URL wie bei cloudflare-import.mjs)
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkLiveRoutes} from './lib/live-check.mjs';

const SOURCE = (process.env.SOURCE_URL || 'https://kadetten.ma-ra10.chatgpt.site').replace(/\/$/, '');
const TARGET = (process.env.TARGET_URL || 'https://kadetten-api.mac-mac-sg.workers.dev').replace(/\/$/, '');

const http = {
  async json(url) {
    const t = Date.now();
    try {
      const r = await fetch(url, {headers: {'User-Agent': 'kadetten-app-livecheck'}, signal: AbortSignal.timeout(30000)});
      let data = null;
      try { data = await r.json(); } catch {}
      return {status: r.status, data, ms: Date.now() - t};
    } catch (e) {
      return {status: 0, data: {error: String(e?.message || e)}, ms: Date.now() - t};
    }
  }
};
const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};

export async function main(httpImpl = http, source = SOURCE, target = TARGET) {
  const {rows, failed} = await checkLiveRoutes(httpImpl, source, target);
  write('### Live-Routen: bisheriger Dienst gegen Cloudflare\n\n| Route | Pfad | bisher | Cloudflare | Urteil |\n|---|---|---|---|---|');
  for (const r of rows) write(`| ${r.name} | ${r.path} | ${r.source} | ${r.target} | ${r.verdict} |`);
  write(failed ? '\nMindestens eine Route liefert der neue Dienst nicht, obwohl der bisherige sie liefert.' : '\nKeine Route ist auf dem neuen Dienst schlechter als auf dem bisherigen.');
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exitCode = await main();
