// Trockenlauf für die Matchprogramme: sucht auf kadettensh.ch nach PDF-Verweisen und zeigt, ob eines zum nächsten Heimspiel
// passt. Schreibt nichts, braucht keine Zugangsdaten. Das Spiel kommt aus dem Cloudflare-Datendienst (TARGET_URL).
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {inspectProgrammes} from './lib/programmes-source.mjs';

const TARGET = (process.env.TARGET_URL || 'https://kadetten-api.mac-mac-sg.workers.dev').replace(/\/$/, '');
const headers = {'User-Agent': 'Mozilla/5.0 (compatible; kadetten-app-programmes)'};
const http = {
  async text(url) {
    const r = await fetch(url, {headers, signal: AbortSignal.timeout(30000)});
    return {status: r.status, text: await r.text()};
  },
  async bytes(url) {
    const r = await fetch(url, {headers, signal: AbortSignal.timeout(60000)});
    return {status: r.status, bytes: new Uint8Array(await r.arrayBuffer()), type: r.headers.get('content-type') || ''};
  }
};
const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};
const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ');

export async function main(httpImpl = http, games) {
  if (!games) {
    const r = await fetch(TARGET + '/api/data', {signal: AbortSignal.timeout(30000)});
    if (!r.ok) throw Error('Datenstand nicht lesbar (HTTP ' + r.status + ')');
    games = (await r.json()).games;
  }
  const {game, sources, pdfs} = await inspectProgrammes(httpImpl, games);
  write('### Matchprogramme (Trockenlauf)\n');
  write(game ? `Nächstes Heimspiel: **${game.home} – ${game.away}**, ${game.date}${game.time ? ' ' + game.time : ''} (ID ${game.id}).` : 'Kein künftiges Heimspiel ohne Ergebnis im Datenstand.');
  write('\n| Quelle | HTTP | PDF-Verweise |\n|---|---|---|');
  for (const s of sources) write(`| ${cell(s.url)} | ${s.status} | ${s.links} |`);
  write('\n| PDF | HTTP | Typ | Bytes | gültig | passt zum Spiel | Beginn der ersten Seite |\n|---|---|---|---|---|---|---|');
  for (const p of pdfs) write(`| ${cell(p.url)} | ${p.status} | ${cell(p.type)} | ${p.bytes} | ${p.isPdf ? 'ja' : 'nein'} | ${p.matches ? 'JA' : 'nein'} | ${cell(p.error || p.text)} |`);
  write(pdfs.some(p => p.matches) ? '\nEin PDF passt zum nächsten Heimspiel.' : '\nKein PDF passt zum nächsten Heimspiel. Trockenlauf: nichts geschrieben.');
  return {game, sources, pdfs};
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(e => {
    console.error('Fehler:', e.message);
    process.exitCode = 1;
  });
}
