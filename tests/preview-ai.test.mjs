import test from 'node:test';
import assert from 'node:assert/strict';
import {aiMessages, parseAiText, checkAi, toAiPreview} from '../server/preview-ai.mjs';
import {buildPreview} from '../server/preview-text.mjs';
import {validPreview} from '../server/previews.mjs';
import {extractText, runModel} from '../scripts/lib/workers-ai.mjs';
import {main, pickBaselines} from '../scripts/cloudflare-ai-compare.mjs';

const NOW = new Date('2026-10-06T11:00:00Z');
const game = {id: 'staefa', date: '2026-10-10', time: '18:00', home: 'Kadetten Schaffhausen', away: 'Handball Stäfa', league: 'QHL', venue: 'Schaffhausen BBC Arena A, Schaffhausen', url: 'https://kadettensh.ch/matchcenter/'};
const table = [['HC Kriens-Luzern', 7, 259, 213, 14], ['Kadetten Schaffhausen', 8, 262, 232, 13], ['Handball Stäfa', 7, 184, 255, 0]];
const duel = {id: '9', date: '2026-03-14', home: 'Handball Stäfa', away: 'Kadetten Schaffhausen', score: [27, 31], externalUrl: 'https://www.handball.ch/de/matchcenter/spiele/9'};
const baseline = buildPreview({club: 'kadetten', game, table, duel, now: NOW});
const GOOD = `Kadetten wollen gegen Stäfa nachlegen

Am Samstag, 10. Oktober 2026, um 18:00 Uhr empfängt Kadetten Schaffhausen den Handball Stäfa in Schaffhausen BBC Arena A. Es ist ein Spiel der QHL.

In der Tabelle stehen die Kadetten mit 13 Punkten aus 8 Spielen auf dem 2. Rang, Stäfa ist mit 0 Punkten aus 7 Spielen auf dem 3. Rang. Das Torverhältnis lautet 262:232 gegen 184:255.

Das letzte Direktduell am 14.03.2026 gewannen die Kadetten mit 31:27.`;

test('Prompt: nur Fakten, Schweizer Schreibweise, Format; Antwort wird in Titel und Absätze zerlegt', () => {
  const [system, user] = aiMessages(baseline);
  assert.match(system.content, /kein «ß»/);
  assert.match(system.content, /ausschliesslich die gelieferten Fakten/);
  assert.ok(user.content.includes(baseline.paragraphs[1]), 'Fakten stehen im Auftrag');
  const p = parseAiText('<think>Überlegung mit 99 Zahlen</think>\n\n**Titel:** Test\n\nAbsatz eins.\n\nAbsatz zwei.');
  assert.equal(p.paragraphs.length, 2);
  assert.doesNotMatch(JSON.stringify(p), /99|\*\*/);
  assert.equal(parseAiText('nur ein Absatz'), null);
});

test('Prüfung: gute Antwort besteht und ergibt eine gültige KI-Vorschau; Erfundenes, ß, Markup und fehlende Teams werden erkannt', () => {
  const parsed = parseAiText(GOOD);
  assert.deepEqual(checkAi(parsed, baseline), []);
  const p = toAiPreview(baseline, parsed, NOW);
  assert.equal(p.generator, 'ki');
  assert.equal(p.fixtureKey, baseline.fixtureKey);
  assert.deepEqual(p.sources, baseline.sources);
  const real = Date.now; Date.now = () => NOW.getTime();
  try { assert.equal(validPreview(p), true); } finally { Date.now = real; }

  assert.match(checkAi(parseAiText(GOOD.replace('13 Punkten', '15 Punkten')), baseline).join(), /Zahlen.*15/);
  assert.match(checkAi(parseAiText(GOOD.replace('Kadetten wollen', 'Grosse Kadetten wollen').replace('nachlegen', 'nachlegen ß')), baseline).join(), /ß/);
  assert.match(checkAi(parseAiText(GOOD.replace('Das letzte Direktduell', '- Das letzte Direktduell')), baseline).join(), /Markup|Aufzählung/);
  assert.match(checkAi(parseAiText(GOOD.replaceAll('Stäfa', 'Gegner')), baseline).join(), /Team fehlt/);
  assert.match(checkAi(null, baseline).join(), /zerlegbar/);
});

test('Workers AI: beide Antwortformen, Fehler mit Hinweis auf die Berechtigung, Token nie in der Meldung', async () => {
  assert.equal(extractText({result: {response: 'A'}}), 'A');
  assert.equal(extractText({result: {choices: [{message: {content: 'B'}}]}}), 'B');
  assert.equal(extractText({result: {}}), '');
  const calls = [];
  const fetchFn = body => async (url, init) => { calls.push({url, init}); return new Response(JSON.stringify(body.json), {status: body.status}); };
  const ok = await runModel({accountId: 'konto', token: 'GEHEIM', model: '@cf/x/y', messages: [], fetchFn: fetchFn({status: 200, json: {success: true, result: {response: 'Hallo', usage: {prompt_tokens: 3}}}})});
  assert.deepEqual([ok.ok, ok.text], [true, 'Hallo']);
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/konto/ai/run/@cf/x/y');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer GEHEIM');
  const denied = await runModel({accountId: 'k', token: 'GEHEIM', model: 'm', messages: [], fetchFn: fetchFn({status: 403, json: {success: false, errors: [{code: 10000, message: 'Authentication error'}]}})});
  assert.equal(denied.ok, false);
  assert.match(denied.error, /HTTP 403.*Workers AI: Edit/);
  assert.doesNotMatch(JSON.stringify(denied), /GEHEIM/);
  const empty = await runModel({accountId: 'k', token: 't', model: 'm', messages: [], fetchFn: fetchFn({status: 200, json: {success: true, result: {response: ''}}})});
  assert.match(empty.error, /leere Antwort/);
  const down = await runModel({accountId: 'k', token: 't', model: 'm', messages: [], fetchFn: async () => { throw new Error('offline'); }});
  assert.match(down.error, /Netzwerk: offline/);
});

test('Stilvergleich: wählt je Verein die nächste Partie, zeigt Texte und Befunde je Modell, schreibt nichts und gibt den Token nicht aus', async () => {
  const fcsgGame = {id: '458', home: 'FC St.Gallen 1879', away: 'FC Lausanne-Sport', league: 'Brack Super League', date: '2026-10-11', time: '16:30', confirmed: true, status: 'NOT STARTED', url: 'https://www.fcsg.ch/pages/match-center/458'};
  const data = {snapshot: {games: [{id: 'alt', date: '2026-08-01', home: 'A', away: 'B', league: 'QHL', score: [1, 2]}, game], tables: {QHL: table}}, fcsgData: {games: [fcsgGame], table: [{name: 'FC St. Gallen', played: 9, gf: 20, ga: 10, points: 18}, {name: 'FC Lausanne-Sport', played: 9, gf: 15, ga: 14, points: 12}]}};
  const picked = await pickBaselines(data, {now: NOW, headToHead: async () => ({games: [duel]})});
  assert.deepEqual(picked.map(p => p.club), ['kadetten', 'fcsg']);

  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({url, method: init?.method});
    assert.match(url, /\/ai\/run\//, 'nur Modellaufrufe, kein Speicherzugriff');
    if (url.includes('model-gut')) return new Response(JSON.stringify({success: true, result: {response: GOOD}}), {status: 200});
    if (url.includes('model-schlecht')) return new Response(JSON.stringify({success: true, result: {response: GOOD.replace('13 Punkten', '17 Punkten')}}), {status: 200});
    return new Response(JSON.stringify({success: false, errors: [{code: 10000, message: 'Authentication error'}]}), {status: 403});
  };
  const lines = [];
  const log = console.log;
  console.log = x => lines.push(String(x));
  let result;
  try {
    result = await main({env: {CLOUDFLARE_API_TOKEN: 'GEHEIM-TOKEN', CLOUDFLARE_ACCOUNT_ID: 'konto', MODELLE: '@cf/a/model-gut, @cf/a/model-schlecht, @cf/a/model-gesperrt'}, fetchFn, data, headToHead: async () => ({games: [duel]}), now: NOW});
  } finally { console.log = log; }
  const out = lines.join('\n');
  assert.equal(calls.length, 6, 'zwei Spiele mal drei Modelle');
  assert.ok(calls.every(c => c.method === 'POST'));
  assert.match(out, /Grundtext \(Weg B, sachlich\)/);
  assert.match(out, /model-gut\*\*: ✅ Prüfung bestanden/);
  assert.match(out, /model-schlecht\*\*: ⚠️ Zahlen, die nicht in den Fakten stehen: 17/);
  assert.match(out, /model-gesperrt\*\*: ❌ HTTP 403.*Workers AI: Edit/);
  assert.doesNotMatch(out, /GEHEIM-TOKEN/);
  assert.equal(result.rows.filter(r => r.ok && !r.problems.length).length >= 1, true);
  await assert.rejects(main({env: {}, fetchFn, data}), /fehlen/);
});
