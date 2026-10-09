// Aktualisierung des Datenstands in GitHub Actions (Phase 2 des Cloudflare-Umzugs, docs/cloudflare-umzug.md).
// Ruft die Quellen selbst ab (kadettensh.ch, SHV, FCSG), rechnet mit dem Code des Datendienstes und schreibt das Ergebnis in den
// KV-Namespace. Quellenfehler behalten den letzten gültigen Stand.
//   node scripts/cloudflare-update.mjs              Trockenlauf: ruft die Quellen ab, schreibt nichts
//   node scripts/cloudflare-update.mjs --schreiben  schreibt in den KV-Speicher
// Braucht CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import seed from '../server/seed.json' with {type: 'json'};
import fcsgSeed from '../server/fcsg-seed.json' with {type: 'json'};
import {runRefresh} from '../server/refresh-run.mjs';
import {refreshFcsg} from '../server/fcsg.mjs';
import {kvRestStore} from './lib/kv-rest-store.mjs';
import {syncProgrammes} from './lib/programmes-source.mjs';
import {syncPreviews} from './lib/preview-sync.mjs';
import {makeRewriter, makeReportWriter} from './lib/preview-rewrite.mjs';
import {syncEhfArchive, syncQhlReports} from './lib/ehf-archive.mjs';
import {getHeadToHead, getRecentGames} from '../server/live.mjs';
import {refreshEhlResults} from './lib/ehl-results.mjs';

const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};
const statusRows = status =>
  Object.entries(status || {}).map(([k, v]) => `| ${k} | ${v.ok ? '✅' : '❌'} | ${v.updatedAt || ''} | ${v.error ? String(v.error).slice(0, 120) : ''} |`);
const table = (title, status) => [`\n**${title}**\n`, '| Quelle | Ergebnis | Stand | Fehler |', '|---|---|---|---|', ...statusRows(status)].join('\n');

const programmeHttp = {
  async text(url) {
    const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (compatible; kadetten-app-programmes)'}, signal: AbortSignal.timeout(30000)});
    return {status: r.status, text: await r.text()};
  },
  async bytes(url) {
    const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (compatible; kadetten-app-programmes)'}, signal: AbortSignal.timeout(60000)});
    return {status: r.status, bytes: new Uint8Array(await r.arrayBuffer()), type: r.headers.get('content-type') || ''};
  }
};

export async function main({schreiben = false, env = process.env, fetchFn = fetch, supplied = {}, programmeFetch = programmeHttp, previewDuels = getHeadToHead, previewRecent = getRecentGames, rewrite = makeRewriter(env), reportWriter = makeReportWriter(env), ehfFetch = fetch} = {}) {
  const {CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId} = env;
  if (!token || !accountId) throw Error('CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID fehlen.');
  const namespaceId = fs.readFileSync(new URL('../cloudflare/api/wrangler.toml', import.meta.url), 'utf8').match(/^id = "([a-f0-9]{32})"/m)?.[1];
  if (!namespaceId) throw Error('KV-Namespace-ID nicht in cloudflare/api/wrangler.toml gefunden.');
  const bucket = kvRestStore({accountId, namespaceId, token, fetchFn});

  const savedObject = await bucket.get('kadetten/current.json');
  const previous = savedObject ? await savedObject.json() : seed;
  write(`### Aktualisierung (${schreiben ? 'geschrieben' : 'Trockenlauf'})\n\nAusgangsstand: ${savedObject ? 'aus dem KV-Speicher' : 'mitgelieferter Startstand (Speicher leer)'}, ${previous.games.length} Spiele, ${previous.stories.length} Meldungen.`);

  const result = await runRefresh(bucket, {previous, hadPrevious: !!savedObject, supplied, write: schreiben});
  write(table('Kadetten', result.next.status));
  write(`\nNach der Aktualisierung: ${result.next.games.length} Spiele, ${result.next.stories.length} Meldungen.`);
  if (!result.ok) throw Error('Alle Quellen der Kadetten sind fehlgeschlagen; es wurde nichts geschrieben.');

  result.next.ehlRecentGames = await refreshEhlResults(result.next, {fetchFn: ehfFetch});
  write(table('EHL-Saisonresultate', Object.fromEntries(Object.entries(result.next.ehlRecentGames).map(([team, value]) => [team, {...value, updatedAt: value.checkedAt}]))));
  if (schreiben) await bucket.put('kadetten/current.json', JSON.stringify(result.next));

  if (schreiben) {
    write(table('FCSG', result.fcsg.status));
    write(`\nFCSG: ${result.fcsg.games} Spiele, ${result.fcsg.news} Meldungen, ${result.fcsg.players} Spieler.`);
    write(`\nSpielberichte: ${result.reports.ok ? 'ok' : 'mit Fehlern'}, ${result.reports.reports.length} geprüft.`);
    // Matchprogramm des nächsten Heimspiels (Phase 2b). Ein Fehler hier lässt den Datenstand unberührt und das bisherige Programm stehen.
    try {
      const p = await syncProgrammes(programmeFetch, bucket, result.next.games);
      write(`\nMatchprogramm${p.game ? ` (${p.game.home} – ${p.game.away}, ${p.game.date})` : ''}: ${p.result}.`);
    } catch (e) {
      write(`\nMatchprogramm: Fehler (${String(e.message).slice(0, 120)}); bisheriges Programm bleibt.`);
    }
    // Match-Vorschauen ohne KI aus den bestätigten Daten (Weg B, docs/vorschauen.md). Fehler lassen alles Übrige unberührt.
    try {
      const savedFcsg = await bucket.get('fcsg/current.json');
      const v = await syncPreviews(bucket, {snapshot: result.next, fcsgData: savedFcsg ? await savedFcsg.json() : fcsgSeed}, {headToHead: previewDuels, recentGames: previewRecent, rewrite});
      write(`\nVorschauen: ${v.written} geschrieben, ${v.unchanged} unverändert, ${v.kept} bestehende bleiben, ${v.skipped} ohne genug Daten${v.errors ? `, ${v.errors} Fehler` : ''}. KI: ${rewrite ? `${v.ki} Texte, ${v.fallback} Rückfälle auf den sachlichen Text` : 'aus'}.`);
      for (const r of v.rejected.slice(0, 4)) write(`- KI-Text für ${r.id} nicht verwendet: ${r.problems.join('; ').slice(0, 200)}`);
    } catch (e) {
      write(`\nVorschauen: Fehler (${String(e.message).slice(0, 120)}); bestehende bleiben.`);
    }
    // Endstand und KI-Matchbericht der European League (nur am Spieltag und am Tag danach). Fehler lassen alles Übrige unberührt.
    try {
      const e = await syncEhfArchive(bucket, {games: result.next.games, fetchFn: ehfFetch, write: reportWriter});
      write(`\nEuropean League (Endstand und Matchbericht): ${e.checked} Spiele geprüft, ${e.written} geschrieben, ${e.kept} fertig vorhanden, ${e.reports} Berichte (${e.ki} mit KI).`);
      for (const note of e.notes) write(`- ${note}`);
    } catch (e) {
      write(`\nEuropean League: Fehler (${String(e.message).slice(0, 120)}); bestehende Einträge bleiben.`);
    }
    // KI-Matchbericht zu abgeschlossenen QHL-Spielen (aus dem gesicherten SHV-Spielbericht).
    try {
      const q = await syncQhlReports(bucket, {games: result.next.games, write: reportWriter});
      write(`\nQHL-Matchberichte: ${q.checked} abgeschlossene Spiele, ${q.written} geschrieben, ${q.kept} fertig vorhanden, ${q.reports} Berichte (${q.ki} mit KI).`);
      for (const note of q.notes) write(`- ${note}`);
    } catch (e) {
      write(`\nQHL-Matchberichte: Fehler (${String(e.message).slice(0, 120)}); bestehende bleiben.`);
    }
    write('\nDer KV-Speicher ist aktualisiert.');
  } else {
    const savedFcsg = await bucket.get('fcsg/current.json');
    const fcsg = await refreshFcsg(savedFcsg ? await savedFcsg.json() : fcsgSeed);
    write(table('FCSG', fcsg.status));
    write('\nTrockenlauf: nichts geschrieben.');
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main({schreiben: process.argv.includes('--schreiben')}).catch(e => {
    console.error('Fehler:', e.message);
    process.exitCode = 1;
  });
}
