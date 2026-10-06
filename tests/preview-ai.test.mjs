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
  assert.match(system.content, /Die gelieferten Fakten sind vollständig/);
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
  const blocked = await runModel({accountId: 'k', token: 'GEHEIM', model: 'm', messages: [], fetchFn: fetchFn({status: 403, json: {success: false, errors: [{code: 5018, message: 'AiError: Ai: This account is not allowed to access @cf/x/y.'}]}})});
  assert.match(blocked.error, /nicht freigeschaltet/);
  assert.doesNotMatch(blocked.error, /Token ohne Berechtigung/);
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

// Die beiden Texte stammen aus dem Stilvergleich (Lauf 37474406123) mit Mistral Small 3.1.
const FCSG_GAME = {id: '458', home: 'FC St.Gallen 1879', away: 'FC Lausanne-Sport', league: 'Brack Super League', date: '2026-10-11', time: '16:30', confirmed: true, status: 'NOT STARTED', venue: 'Berit Sitterstadion', url: 'https://www.fcsg.ch/pages/match-center/458'};
const FCSG_TABLE = [{name: 'FC Lugano', played: 9, gf: 27, ga: 7, points: 25}, {name: 'BSC Young Boys', played: 9, gf: 31, ga: 18, points: 19}, {name: 'FC Basel', played: 9, gf: 20, ga: 15, points: 17}, {name: 'FC Zürich', played: 9, gf: 18, ga: 14, points: 15}, {name: 'FC St. Gallen', played: 9, gf: 16, ga: 19, points: 13}, {name: 'FC X', played: 9, gf: 10, ga: 10, points: 12}, {name: 'FC Y', played: 9, gf: 10, ga: 10, points: 11}, {name: 'FC Z', played: 9, gf: 10, ga: 10, points: 10}, {name: 'FC V', played: 9, gf: 10, ga: 10, points: 9}, {name: 'FC W', played: 9, gf: 10, ga: 10, points: 8}, {name: 'FC U', played: 9, gf: 10, ga: 10, points: 7}, {name: 'FC Lausanne-Sport', played: 9, gf: 7, ga: 15, points: 6}];
const FCSG_BASE = buildPreview({club: 'fcsg', game: FCSG_GAME, table: FCSG_TABLE, now: NOW});
const FCSG_KI = `FC St.Gallen 1879 gegen FC Lausanne-Sport

Der FC St.Gallen 1879 hat am kommenden Sonntag die Chance, seine Heimbilanz zu verbessern. Die Espen sind auf dem 5. Rang der Brack Super League und haben aus 9 Spielen 13 Punkte geholt. Das Torverhältnis von 16:19 zeigt, dass die Mannschaft von Trainer Peter Zeidler noch an der Abwehrarbeit feilen muss.

Der FC Lausanne-Sport hingegen kämpft um den Klassenerhalt. Mit nur 6 Punkten aus 9 Spielen und einem Torverhältnis von 7:15 steht der FC Lausanne-Sport auf dem 12. Rang. Die Waadtländer müssen sich gegen die St.Galler steigen, um den Abstiegskampf nicht noch schwieriger zu machen. Das Spiel beginnt um 16:30 Uhr im Berit Sitterstadion.`;
const KADETTEN_KI = `Kadetten Schaffhausen gegen HC Izvidac

In der BBC Arena in Schaffhausen steht am Dienstag, 6. Oktober 2026, ein spannendes Duell in der EHL bevor. Um 18:45 Uhr treffen die Kadetten Schaffhausen auf den HC Izvidac. Der Tabellenführer aus Schaffhausen hat nach einem Spiel zwei Punkte auf dem Konto und ein Torverhältnis von 39:32. Auch der HC Izvidac hat zwei Punkte aus einem Spiel, allerdings mit einem Torverhältnis von 34:33.

Die Fans dürfen sich auf ein packendes Spiel freuen, bei dem jeder Treffer zählt.`;
const KADETTEN_BASE = buildPreview({club: 'kadetten', game: {id: 'izvidac', date: '2026-10-06', time: '18:45', home: 'Kadetten Schaffhausen', away: 'HC Izvidac', league: 'EHL', venue: 'BBC Arena, Schaffhausen'}, table: [['Kadetten Schaffhausen', 1, 39, 32, 2], ['HC Izvidac', 1, 34, 33, 2]], now: NOW});

test('Strenge Prüfung: die erfundenen Angaben aus dem echten FCSG-Text werden abgewiesen, der korrekte Kadetten-Text besteht', () => {
  const bad = checkAi(parseAiText(FCSG_KI), FCSG_BASE).join(' | ');
  assert.match(bad, /Personen- oder Eigennamen.*Peter Zeidler/);
  assert.match(bad, /Aussagen, die nicht in den Fakten stehen: .*trainer/);
  assert.match(bad, /klassenerhalt/);
  assert.match(bad, /abstieg/);
  assert.match(bad, /bilanz/);
  assert.deepEqual(checkAi(parseAiText(KADETTEN_KI), KADETTEN_BASE), []);
  assert.deepEqual(checkAi(parseAiText(KADETTEN_KI.replace('Der Tabellenführer', 'Der Gastgeber')), KADETTEN_BASE), [], 'ohne Tabellenführer-Aussage kein Befund');
  // Tabellenführer ohne 1. Rang in den Fakten
  const nobody = buildPreview({club: 'kadetten', game: {id: 'x', date: '2026-10-06', time: '18:45', home: 'Kadetten Schaffhausen', away: 'HC Izvidac', league: 'EHL', venue: 'BBC Arena, Schaffhausen'}, table: [['HC Izvidac', 1, 34, 33, 2], ['Kadetten Schaffhausen', 1, 39, 32, 2]], now: NOW});
  assert.match(checkAi(parseAiText(KADETTEN_KI), nobody).join(), /Tabellenführer/);
  // Satzanfänge und einzelne Hauptwörter sind kein Befund, zwei unbekannte Grossgeschriebene hintereinander schon
  assert.deepEqual(checkAi(parseAiText(KADETTEN_KI.replace('Die Fans dürfen', 'Die Fans von Schaffhausen dürfen')), KADETTEN_BASE), []);
  assert.match(checkAi(parseAiText(KADETTEN_KI.replace('Die Fans dürfen', 'Die Fans Peter Muster dürfen')), KADETTEN_BASE).join(), /Peter Muster/);
});

test('Prompt verbietet Personen und Spekulation ausdrücklich', () => {
  const [system] = aiMessages(KADETTEN_BASE);
  for (const phrase of [/erstes Heimspiel», «erstes Duell», «Saisonstart»/, /Direktduell nur, wenn die Fakten eines mit Datum und Ergebnis nennen/, /Was dort nicht steht, existiert für diesen Text nicht/, /Waadtländer/, /Wiederhole keinen Fakt/, /keine Trainer, Spieler/, /Meisterschaft, Abstieg, Klassenerhalt/, /Tabellenführer, wenn die Fakten es auf dem 1\. Rang nennen/, /grammatikalisch einwandfreie/]) assert.match(system.content, phrase);
});
