// Stilvergleich der Workers-AI-Modelle für die Match-Vorschau (nur lesend, schreibt nichts).
// Nimmt je einen künftigen Kadetten- und FCSG-Termin aus dem Cloudflare-Datendienst, bildet den nüchternen Grundtext (Weg B) und lässt
// jedes Modell daraus eine lebendigere Fassung schreiben; Zahlen, «ß», Markup und Teamnamen werden geprüft.
//   Umgebung: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (Workers AI), MODELLE (kommagetrennt, optional), TARGET_URL (optional)
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildPreview, tableFor} from '../server/preview-text.mjs';
import {aiMessages, parseAiText, checkAi} from '../server/preview-ai.mjs';
import {getHeadToHead} from '../server/live.mjs';
import {runModel} from './lib/workers-ai.mjs';

export const DEFAULT_MODELS = ['@cf/mistralai/mistral-small-3.1-24b-instruct'];
const TARGET = (process.env.TARGET_URL || 'https://kadetten-api.mac-mac-sg.workers.dev').replace(/\/$/, '');
const write = text => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
};
const quote = text => text.split('\n').map(l => '> ' + l).join('\n');

async function loadData(fetchFn) {
  const get = async path => {
    const r = await fetchFn(TARGET + path, {signal: AbortSignal.timeout(30000)});
    if (!r.ok) throw Error(`${path}: HTTP ${r.status}`);
    return r.json();
  };
  return {snapshot: await get('/api/data'), fcsgData: await get('/api/fcsg/data')};
}

// Erste künftige Partie je Verein, für die es einen Grundtext gibt.
export async function pickBaselines({snapshot, fcsgData}, {now = new Date(), headToHead = getHeadToHead} = {}) {
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
  const out = [];
  for (const [club, data] of [['kadetten', snapshot], ['fcsg', fcsgData]]) {
    const games = (data.games || []).filter(g => !g.score && !g.live && g.status !== 'FINISHED' && g.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    for (const g of games) {
      let duel = null;
      if (club === 'kadetten' && g.league === 'QHL') { try { duel = (await headToHead(g.home, g.away)).games?.[0] || null; } catch {} }
      const baseline = buildPreview({club, game: g, table: tableFor(club, g, snapshot, fcsgData), duel, now});
      if (baseline) { out.push(baseline); break; }
    }
  }
  return out;
}

export async function main({env = process.env, fetchFn = fetch, data = null, headToHead = getHeadToHead, now = new Date()} = {}) {
  const {CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId} = env;
  if (!token || !accountId) throw Error('CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID fehlen.');
  const models = (env.MODELLE || '').split(',').map(m => m.trim()).filter(Boolean);
  const list = models.length ? models : DEFAULT_MODELS;
  const baselines = await pickBaselines(data || await loadData(fetchFn), {now, headToHead});
  write('### KI-Stilvergleich Workers AI (nur lesend)\n');
  if (!baselines.length) { write('Keine künftige Partie mit genug Daten gefunden.'); return {rows: []}; }
  const rows = [];
  for (const baseline of baselines) {
    write(`\n## ${baseline.headline} (${baseline.club})\n\n**Grundtext (Weg B, sachlich):**\n\n${quote(baseline.paragraphs.join('\n\n'))}`);
    for (const model of list) {
      const res = await runModel({accountId, token, model, messages: aiMessages(baseline), fetchFn});
      const row = {club: baseline.club, model, ok: res.ok, ms: res.ms, problems: []};
      rows.push(row);
      if (!res.ok) { row.problems.push(res.error); write(`\n**${model}**: ❌ ${res.error} (${res.ms} ms)`); continue; }
      const parsed = parseAiText(res.text, baseline.headline);
      row.problems = checkAi(parsed, baseline);
      const verdict = row.problems.length ? `⚠️ ${row.problems.join('; ')}` : '✅ Prüfung bestanden';
      const tokens = res.usage ? `, ${res.usage.prompt_tokens ?? '?'} Eingabe-/${res.usage.completion_tokens ?? '?'} Ausgabe-Tokens` : '';
      write(`\n**${model}**: ${verdict} (${res.ms} ms${tokens})\n\n${quote(parsed ? [parsed.headline, ...parsed.paragraphs].join('\n\n') : res.text.slice(0, 1200))}`);
    }
  }
  write('\n---\n\nTabelle: ' + rows.map(r => `${r.model.split('/').at(-1)} ${r.club}: ${r.ok ? (r.problems.length ? 'Befund' : 'bestanden') : 'Fehler'}`).join(' · '));
  return {rows};
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(e => {
    console.error('Fehler:', e.message);
    process.exitCode = 1;
  });
}
