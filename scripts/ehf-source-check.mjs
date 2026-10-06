// Ruft die EHF-Quellen ab (nur lesend, keine Zugangsdaten) und zeigt Statuscode, Inhaltstyp, Aufbau und gefundene
// Daten-Schnittstellen. Aufruf: node scripts/ehf-source-check.mjs   (Umgebungsvariable SPIEL_ID, Standard 202711020901029)
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {matchUrls, findEndpoints, scriptSources, preview, contextAround, findFeedMatch, candidateCalls, describeShape, findKeys, valueAt, DETAIL_PATHS, findFeedItem, withoutImages, feedOverview, loadSnippets, TICKER_NEEDLES, tickerProbeUrls, parseAppContext, appContextUrls, probeTargets, summarizeTicker, tickerValueCounts, htmlText, excerptFrom, API, NAMES} from './lib/ehf-source-check.mjs';

const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};
const code = text => '```\n' + text.replaceAll('```', "'''") + '\n```';
const LIVESCORE = 'https://ehfel.eurohandball.com/umbraco/api/livescoreapi/GetLiveScoreMatches/138790';

async function get(fetchFn, url) {
  const t = Date.now();
  try {
    const r = await fetchFn(url, {headers: {'User-Agent': 'Mozilla/5.0 (kadetten-app-quellenpruefung)', Accept: '*/*'}, signal: AbortSignal.timeout(20000)});
    return {url, status: r.status, type: r.headers.get('content-type') || '', text: await r.text(), ms: Date.now() - t};
  } catch (e) {
    return {url, status: 0, type: '', text: '', error: String(e?.message || e), ms: Date.now() - t};
  }
}

export async function main({env = process.env, fetchFn = fetch} = {}) {
  const id = env.SPIEL_ID || '202711020901029';
  write(`### EHF-Quellen für Spiel ${id} (nur lesend)\n`);
  const pages = [];
  for (const url of [...matchUrls(id), LIVESCORE]) {
    const r = await get(fetchFn, url);
    pages.push(r);
    write(`\n#### ${url}\n\nStatus ${r.status || 'Fehler'}${r.error ? ' (' + r.error + ')' : ''}, ${r.type || 'kein Inhaltstyp'}, ${r.text.length} Zeichen, ${r.ms} ms`);
    if (!r.text) continue;
    if (/json/i.test(r.type) || /^\s*[\[{]/.test(r.text)) {
      write('\nAnfang der Antwort:\n\n' + code(preview(r.text, 1500)));
      const mine = r.text.includes(id) ? 'Die Spiel-ID kommt in der Antwort vor.' : 'Die Spiel-ID kommt in der Antwort nicht vor.';
      write(mine);
      continue;
    }
    write('\nAnfang der Seite:\n\n' + code(preview(r.text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '), 600)));
    const scripts = scriptSources(r.text, url);
    write(`\nSkripte (${scripts.length}):\n\n${scripts.slice(0, 15).map(s => '- ' + s).join('\n') || '- keine'}`);
    const endpoints = findEndpoints(r.text, url);
    write(`\nAdressen im HTML, die nach Schnittstellen aussehen (${endpoints.length}):\n\n${endpoints.slice(0, 25).map(s => '- ' + s).join('\n') || '- keine'}`);
    // Erste Ebene der eigenen Skripte nach Schnittstellen durchsuchen (nur Skripte der EHF-Hosts).
    if (/ticker\.ehf\.eu\/v3\//.test(url)) write('\nAnfang des HTML-Quelltexts:\n\n' + code(preview(r.text, 1500)) + '\n\nDaten-Hinweise im HTML:\n\n' + (loadSnippets(r.text).map(x => '- ' + x).join('\n') || '- keine'));
    const own = scripts.filter(s => /(^|\.)ehf\.eu\b|eurohandball\.com/.test(new URL(s).hostname)).slice(0, 10);
    for (const s of own) {
      const js = await get(fetchFn, s);
      if (/ticker\.ehf\.eu\/v3\/bundles\/tickerApp/.test(s)) pages.push(js);
      const found = findEndpoints(js.text, s).filter(u => /api|socket|signalr|feed|ticker|livescore/i.test(u)).slice(0, 15);
      if (found.length) write(`\nSchnittstellen in ${s} (${found.length}):\n\n${found.map(u => '- ' + u).join('\n')}`);
      if (/ticker\.ehf\.eu\/v3\/bundles\/tickerApp/.test(s)) {
        const calls = loadSnippets(js.text, TICKER_NEEDLES, 4, 220, 40);
        write(`\nAufrufe und Adressen im Ticker-Skript ${s.split('?')[0]} (${js.text.length} Zeichen):\n\n${calls.map(x => '- ' + x).join('\n') || '- keine'}`);
      }
      if (/ticker\.ehf\.eu\/v3\//.test(url) || /ticker\.ehf\.eu/.test(s)) {
        const hints = loadSnippets(js.text);
        if (hints.length) write(`\nDaten-Hinweise in ${s} (${js.text.length} Zeichen):\n\n${hints.map(x => '- ' + x).join('\n')}`);
      }
    }
  }
  await tickerData({id, pages, fetchFn, env});
  const tickerPage = pages.find(p => p.url.includes('ticker.ehf.eu/v3/') && p.text);
  if (tickerPage) {
    const disclaimer = excerptFrom(htmlText(tickerPage.text), 'Disclaimer x', 2500) || excerptFrom(htmlText(tickerPage.text), 'The EHF does not guarantee', 2500);
    write(`\n### Disclaimer der Ticker-Seite (Text aus dem HTML)\n\n${disclaimer ? code(disclaimer) : 'nicht gefunden'}`);
  }
  const terms = await get(fetchFn, 'https://ticker.ehf.eu/Disclaimer.aspx');
  write(`\n### https://ticker.ehf.eu/Disclaimer.aspx\n\nStatus ${terms.status || 'Fehler'}, ${terms.text.length} Zeichen\n\n${terms.text ? code(preview(htmlText(terms.text), 3500)) : ''}`);
  for (const url of tickerProbeUrls(id)) {
    const r = await get(fetchFn, url);
    write(`\n#### ${url}\n\nStatus ${r.status || 'Fehler'}, ${r.type || 'kein Inhaltstyp'}, ${r.text.length} Zeichen${r.error ? ' (' + r.error + ')' : ''}`);
    if (r.text) write('\nAnfang der Antwort:\n\n' + code(preview(r.text, 1500)));
  }
  await probeApis({id, pages, fetchFn});
  return pages.every(p => p.status === 0) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) process.exitCode = await main();

// Zweiter Teil: Aufrufe der Seitenskripte lesen und die Daten-Schnittstellen der EHF-Seite versuchsweise abrufen.
async function probeApis({id, pages, fetchFn}) {
  write('\n### Schnittstellen der EHF-Spielseite\n');
  const page = pages.find(p => p.url.includes('/matches/details/'));
  const scripts = page?.text ? scriptSources(page.text, page.url).concat(findEndpoints(page.text, page.url).filter(u => /\/assets\/js\/.*_vue\.js/.test(u))) : [];
  for (const src of [...new Set(scripts)].filter(s => /_vue\.js/.test(s)).slice(0, 6)) {
    const js = await get(fetchFn, src);
    for (const name of NAMES) {
      const snippets = contextAround(js.text, name);
      if (snippets.length) write(`\nAufruf von ${name} in ${src.split('?')[0]}:\n\n${snippets.map(x => code(x)).join('\n')}`);
    }
  }
  const feed = pages.find(p => p.url.includes('GetLiveScoreMatches'));
  let match = null;
  try { match = findFeedMatch(JSON.parse(feed?.text || '{}'), id); } catch { /* kein JSON */ }
  write(`\nKennungen des Spiels im Livescore-Feed: ${match ? JSON.stringify(match) : 'Spiel dort nicht gelistet'}`);
  try {
    const feedJson = JSON.parse(feed?.text || '{}');
    const item = findFeedItem(feedJson, id);
    write(`\nEintrag des Spiels im Livescore-Feed (ohne Bilder):\n\n${item ? code(preview(withoutImages(item), 3500)) : 'nicht vorhanden'}`);
    write(`\nTage im Livescore-Feed:\n\n${feedOverview(feedJson).map(d => `- ${d.date}: ${d.matches} Spiele, erstes Spiel matchStats ${JSON.stringify(d.firstStats)}`).join('\n') || '- keine'}`);
  } catch { /* kein JSON */ }
  const calls = [...candidateCalls(id), `${API}homeofhandballapi/GetTeams/1171`, `${API}homeofhandballapi/GetTeams`];
  const worked = new Set();
  for (const url of calls) {
    const endpoint = url.split('?')[0];
    if (worked.has(endpoint)) continue;
    const r = await get(fetchFn, url);
    const usable = r.status === 200 && r.text.length > 20 && !/^\s*(\[\]|\{\})\s*$/.test(r.text);
    write(`\n- ${url.replace(API, '')}: Status ${r.status || 'Fehler'}, ${r.type || 'kein Inhaltstyp'}, ${r.text.length} Zeichen${usable ? ' (brauchbar)' : ''}`);
    if (usable) {
      worked.add(endpoint);
      write('\n' + code(preview(r.text, 1500)));
      let json = null;
      try { json = JSON.parse(r.text); } catch { /* kein JSON */ }
      if (json && /GetMatchDetails|GetMatchLiveFeed|GetMatchDetailStatistic/.test(endpoint)) {
        write('\nAufbau der Antwort (zwei Ebenen):\n\n' + code(describeShape(json, 2).join('\n')));
        const keys = findKeys(json, /last|form|head|h2h|duel|result|previous|recent|standing|table|ranking|action|event|ticker/i);
        write(`\nSchlüssel zu Form, letzten Spielen, Direktduellen, Tabelle oder Ereignissen (${keys.length}):\n\n${keys.map(k => '- ' + k).join('\n') || '- keine'}`);
        if (/GetMatchDetails/.test(endpoint)) {
          for (const path of DETAIL_PATHS) {
            const part = valueAt(json, path);
            write(`\nTeilbaum ${path}: ${part === undefined ? 'nicht vorhanden' : Array.isArray(part) ? 'Liste(' + part.length + ')' : typeof part}`);
            if (part !== undefined && part !== null && typeof part === 'object') {
              write(code(describeShape(part, 4, 60).join('\n')));
              write('Inhalt (gekürzt):\n\n' + code(preview(JSON.stringify(part), 1800)));
            }
          }
          const players = valueAt(json, 'matchDetails.details.homeTeam.players');
          write(`\nAnzahl Spieler im Heimteam: ${Array.isArray(players) ? players.length : 'unbekannt'}`);
        }
      }
    }
  }
}

// Ticker-Ansicht (ticker.ehf.eu/v3): zeigt die Einstellungen der Seite (window.appContext) und, nur auf ausdrücklichen Wunsch
// (POST_PROBE=1), einen einzigen lesenden POST je Datenpfad mit der Spiel-ID, wie ihn die Seite selbst im Browser sendet.
async function tickerData({id, pages, fetchFn, env}) {
  const page = pages.find(p => p.url.includes('ticker.ehf.eu/v3/') && p.text);
  if (!page) return;
  write('\n### Ticker-Ansicht: Einstellungen der Seite (appContext)\n');
  const bundle = pages.find(p => /ticker\.ehf\.eu\/v3\/bundles\/tickerApp/.test(p.url));
  if (bundle?.text) write('\nParameter des Datenaufrufs im Ticker-Skript:\n\n' + loadSnippets(bundle.text, ['VersionmotiondataStatistics', 'window.appContext.surl', 'appContext.ticket'], 2, 700, 6).map(x => '- ' + x).join('\n'));
  const hints = loadSnippets(page.text, ['appContext', 'baseUrl', 'MatchID'], 3, 400, 9);
  write(hints.map(x => '- ' + x).join('\n') || '- keine Fundstellen im HTML');
  const context = parseAppContext(page.text);
  const targets = appContextUrls(context, page.url);
  write(`\nBasisadresse: ${context.base ?? 'nicht gefunden'}\n\nDatenpfade (${targets.length}):\n\n${targets.map(t => `- ${t.key}: ${t.url}`).join('\n') || '- keine'}`);
  if (env.POST_PROBE !== '1') return write('\nPOST-Versuch ausgeschaltet (Eingabe «post_probe» des Workflows).');
  for (const target of probeTargets(targets)) {
    const t = Date.now();
    try {
      const r = await fetchFn(target.url, {method: 'POST', headers: {'User-Agent': 'Mozilla/5.0 (kadetten-app-quellenpruefung)', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest'}, body: new URLSearchParams({MatchID: id}), signal: AbortSignal.timeout(20000)});
      const text = await r.text();
      write(`\n#### POST ${target.url}\n\nStatus ${r.status}, ${r.headers.get('content-type') || 'kein Inhaltstyp'}, ${text.length} Zeichen, ${Date.now() - t} ms\n\n${code(preview(text, 600))}`);
      let json = null;
      try { json = JSON.parse(text); } catch { /* kein JSON */ }
      if (json) {
        const sum = summarizeTicker(json);
        write(`\nOberste Schlüssel der Antwort:\n\n${code(sum.top.join('\n'))}\nSchlüssel des Ereignisbereichs: ${sum.eventKeys.join(', ') || 'keiner'}\n\nEreignisse insgesamt: ${sum.total}\n\nAnzahl je Art:\n\n${code(Object.entries(sum.counts).map(([k, n]) => k + ': ' + n).join('\n'))}`);
        write(`\nDie ersten ${sum.firstActions.length} Ereignisse:\n\n${code(preview(JSON.stringify(sum.firstActions), 3500))}`);
        write(`\nEin Beispiel je Art:\n\n${Object.entries(sum.samples).map(([k, list]) => '- ' + k + ': ' + preview(JSON.stringify(list[0]), 380)).join('\n')}`);
        const counts = tickerValueCounts(json);
        write(`\nWerte der Würfe und Ereignisse:\n\n${code(['Wurfergebnis (result): ' + JSON.stringify(counts.shotResult), 'Wurfzone (loc): ' + JSON.stringify(counts.shotLoc), 'Zusatz (actionAdd): ' + JSON.stringify(counts.actionAdd), 'Abschnitt je Art: ' + JSON.stringify(counts.periodByAction), 'Rollen je Art: ' + JSON.stringify(counts.roleByAction), 'Phasenstände (phaseScores): ' + preview(JSON.stringify(counts.phaseScores), 600)].join('\n'))}`);
        if (json.playerstats) write(`\nAufbau von playerstats:\n\n${code(describeShape(json.playerstats, 3, 40).join('\n'))}`);
        for (const key of ['livescores', 'matchstats', 'motiondataStatistics', 'lineup']) if (json[key] !== undefined) write(`\nAufbau von ${key}:\n\n${code(describeShape(json[key], 2, 40).join('\n'))}`);
      }
    } catch (e) {
      write(`\n#### POST ${target.url}\n\nFehler: ${String(e?.message || e)}`);
    }
  }
}
