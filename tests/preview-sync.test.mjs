import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildPreview, tableFor} from '../server/preview-text.mjs';
import {syncPreviews as sync} from '../scripts/lib/preview-sync.mjs';
import {collectFacts} from '../scripts/lib/preview-facts.mjs';
import {previews, fixtureKey, validPreview} from '../server/previews.mjs';

const NOW = new Date('2026-10-06T11:00:00Z');
// Die Gültigkeitsprüfung des Datendienstes vergleicht mit der Uhr; sie wird auf den angenommenen Zeitpunkt gesetzt.
async function syncPreviews(bucket, data, opts) {
  const real = Date.now;
  Date.now = () => opts.now.getTime();
  try { return await sync(bucket, data, opts); } finally { Date.now = real; }
}
const kGame = {id: 'staefa', date: '2026-10-10', time: '18:00', home: 'Kadetten Schaffhausen', away: 'Handball Stäfa', league: 'QHL', venue: 'Schaffhausen BBC Arena A, Schaffhausen', url: 'https://kadettensh.ch/matchcenter/'};
const table = {QHL: [['HC Kriens-Luzern', 7, 259, 213, 14], ['Kadetten Schaffhausen', 8, 262, 232, 13], ['Handball Stäfa', 7, 184, 255, 0]]};
const snapshot = {games: [{id: 'alt', date: '2026-08-01', home: 'A', away: 'B', league: 'QHL', score: [1, 2]}, kGame], tables: table};
const duel = {id: '9', date: '2026-03-14', home: 'Handball Stäfa', away: 'Kadetten Schaffhausen', score: [27, 31], externalUrl: 'https://www.handball.ch/de/matchcenter/spiele/9'};
const fGame = {id: '458', home: 'FC St.Gallen 1879', away: 'FC Lausanne-Sport', league: 'Brack Super League', date: '2026-10-11', time: '16:30', confirmed: true, status: 'NOT STARTED', venue: 'Berit Sitterstadion', url: 'https://www.fcsg.ch/pages/match-center/458'};
const fcsg = {games: [fGame], table: [{rank: 1, name: 'FC St. Gallen', played: 9, gf: 20, ga: 10, points: 18}, {rank: 4, name: 'FC Lausanne-Sport', played: 9, gf: 15, ga: 14, points: 12}]};

function memBucket(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {map, writes: [], async get(k) { return map.has(k) ? {json: async () => JSON.parse(map.get(k))} : null; }, async put(k, v) { this.writes.push(k); map.set(k, v); }};
}

test('Vorschau-Text: nur bestätigte Angaben, keine Siege/Niederlagen-Zähler, letztes Direktduell, gültig nach den Regeln des Datendienstes', () => {
  const p = buildPreview({club: 'kadetten', game: kGame, table: table.QHL, duel, now: NOW});
  assert.equal(p.headline, 'Kadetten Schaffhausen gegen Handball Stäfa');
  assert.equal(p.paragraphs.length, 3);
  assert.equal(p.paragraphs[0], 'Kadetten Schaffhausen empfängt Handball Stäfa (QHL), Samstag, 10. Oktober 2026, 18:00 Uhr in Schaffhausen BBC Arena A, Schaffhausen.');
  assert.match(p.paragraphs[1], /Kadetten Schaffhausen auf dem 2\. Rang \(13 Punkte aus 8 Spielen, Torverhältnis 262:232\), Handball Stäfa auf dem 3\. Rang \(0 Punkte aus 7 Spielen, Torverhältnis 184:255\)/);
  assert.equal(p.paragraphs[2], 'Das letzte Direktduell (14.03.2026, Handball Stäfa – Kadetten Schaffhausen) endete 27:31.');
  assert.doesNotMatch(p.paragraphs.join(' '), /Siege|Niederlagen|Unentschieden/);
  assert.deepEqual(p.sources.map(s => s.url), ['https://kadettensh.ch/matchcenter/', duel.externalUrl]);
  assert.equal(p.fixtureKey, fixtureKey(kGame));
  assert.equal(validPreview(p), true);
});

test('Vorschau-Text: fehlende Angaben entfallen, ohne genug Daten gibt es keine Vorschau, Tabelle nur im passenden Wettbewerb', () => {
  const noTable = buildPreview({club: 'kadetten', game: kGame, table: null, duel: null, now: NOW});
  assert.equal(noTable, null, 'nur Spielangaben genügen nicht');
  const dueOnly = buildPreview({club: 'kadetten', game: kGame, table: null, duel, now: NOW});
  assert.equal(dueOnly.paragraphs.length, 2);
  const unconfirmed = buildPreview({club: 'fcsg', game: {...fGame, confirmed: false}, table: fcsg.table, now: NOW});
  assert.match(unconfirmed.paragraphs[0], /Anspielzeit noch nicht bestätigt/);
  assert.doesNotMatch(unconfirmed.paragraphs[0], /16:30/);
  assert.equal(tableFor('fcsg', {...fGame, league: 'Schweizer Cup'}, snapshot, fcsg), null, 'Cup-Spiele werden nicht mit der Liga-Tabelle verglichen');
  assert.equal(tableFor('kadetten', {...kGame, league: 'EHL'}, snapshot, fcsg), null, 'unbekannter Wettbewerb ohne Tabelle');
  const f = buildPreview({club: 'fcsg', game: fGame, table: tableFor('fcsg', fGame, snapshot, fcsg), now: NOW});
  assert.match(f.paragraphs[1], /FC St\.Gallen 1879 auf dem 1\. Rang \(18 Punkte aus 9 Spielen, Torverhältnis 20:10\), FC Lausanne-Sport auf dem 2\. Rang/);
  assert.equal(f.sources[0].url, fGame.url);
});

test('Vorschauen schreiben: nächste Spiele beider Vereine, öffentlich lesbar über den Datendienst, unverändert nicht neu geschrieben', async () => {
  const bucket = memBucket({'kadetten/current.json': snapshot, 'fcsg/current.json': fcsg});
  const headToHead = async () => ({games: [duel]});
  const first = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: NOW});
  assert.deepEqual([first.written, first.unchanged, first.errors], [2, 0, 0]);
  assert.deepEqual(bucket.writes.sort(), ['previews/fcsg/458.json', 'previews/kadetten/staefa.json']);
  const env = {BUCKET: bucket};
  const real = Date.now;
  Date.now = () => NOW.getTime() + 60000;
  try {
    for (const route of ['kadetten/staefa', 'fcsg/458']) {
      const r = await previews(new Request('https://x.test/api/previews/' + route), env);
      assert.equal(r.status, 200, route);
      assert.ok(Array.isArray((await r.json()).paragraphs));
    }
  } finally { Date.now = real; }
  const again = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: new Date(NOW.getTime() + 3 * 3600000)});
  assert.deepEqual([again.written, again.unchanged], [0, 2]);
  assert.equal(bucket.writes.length, 2, 'keine weiteren Schreibzugriffe');
  const later = await syncPreviews(bucket, {snapshot, fcsgData: fcsg}, {headToHead, now: new Date(NOW.getTime() + 13 * 3600000)});
  assert.equal(later.written, 2, 'nach 12 Stunden wird der Zeitstempel erneuert, damit die Vorschau sichtbar bleibt');
});

test('Vorschauen schreiben: gültige bestehende Vorschau anderer Herkunft bleibt, veraltete wird ersetzt, Fehler bei Direktduell und Schreibfehler stören nicht', async () => {
  const ai = {club: 'kadetten', id: 'staefa', fixtureKey: fixtureKey(kGame), headline: 'Von ChatGPT', paragraphs: ['a'.repeat(40), 'b'.repeat(40)], sources: [{label: 'Q', url: 'https://kadettensh.ch/'}], generatedAt: new Date(NOW.getTime() - 3600000).toISOString()};
  const bucket = memBucket({'previews/kadetten/staefa.json': ai});
  const r = await syncPreviews(bucket, {snapshot, fcsgData: {games: []}}, {headToHead: async () => { throw Error('Quelle weg'); }, now: NOW});
  assert.equal(r.kept, 1);
  assert.equal(bucket.writes.length, 0, 'bestehende Vorschau bleibt unberührt');

  const stale = memBucket({'previews/kadetten/staefa.json': {...ai, fixtureKey: 'alt'}});
  const s = await syncPreviews(stale, {snapshot, fcsgData: {games: []}}, {headToHead: async () => { throw Error('Quelle weg'); }, now: NOW});
  assert.equal(s.written, 1, 'ohne Direktduell reicht die Tabelle; Fehler der Duell-Quelle stört nicht');
  assert.equal(JSON.parse(stale.map.get('previews/kadetten/staefa.json')).generator, 'daten');

  const broken = memBucket();
  broken.put = async () => { throw Error('KV'); };
  const e = await syncPreviews(broken, {snapshot, fcsgData: fcsg}, {now: NOW});
  assert.equal(e.errors, 2);
});

const KI_KADETTEN = `Kadetten wollen gegen Stäfa nachlegen

Am Samstag, 10. Oktober 2026, um 18:00 Uhr empfängt Kadetten Schaffhausen den Handball Stäfa in Schaffhausen BBC Arena A. Es ist ein Spiel der QHL.

In der Tabelle stehen die Kadetten mit 13 Punkten aus 8 Spielen auf dem 2. Rang, Stäfa ist mit 0 Punkten aus 7 Spielen auf dem 3. Rang. Das Torverhältnis lautet 262:232 gegen 184:255.

Das letzte Direktduell am 14.03.2026 gewannen die Kadetten mit 31:27.`;
const KI_FCSG = `FC St.Gallen 1879 gegen FC Lausanne-Sport

Die Mannschaft von Trainer Peter Zeidler empfängt am 11. Oktober 2026 um 16:30 Uhr den FC Lausanne-Sport im Berit Sitterstadion.

Beide Teams kämpfen um den Klassenerhalt, St.Gallen liegt mit 13 Punkten aus 9 Spielen auf dem 5. Rang.`;
function rewriter(log, {fail = false, texts = {}} = {}) {
  return async baseline => {
    log.push(baseline.club);
    if (fail) return {ok: false, error: 'HTTP 500'};
    return {ok: true, text: texts[baseline.club] ?? (baseline.club === 'kadetten' ? KI_KADETTEN : KI_FCSG)};
  };
}
const fcsgTable = [...Array(4)].map((_, i) => ({name: 'FC T' + i, played: 9, gf: 20, ga: 10, points: 30 - i})).concat([{name: 'FC St. Gallen', played: 9, gf: 16, ga: 19, points: 13}]);
const fcsg2 = {games: [fGame], table: [...fcsgTable, {name: 'FC Lausanne-Sport', played: 9, gf: 7, ga: 15, points: 6}]};

test('KI-Vorschau: der Text der KI wird unverändert übernommen (keine inhaltliche Prüfung), derselbe Text wird wiederverwendet', async () => {
  const bucket = memBucket();
  const calls = [];
  const headToHead = async () => ({games: [duel]});
  const first = await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, rewrite: rewriter(calls), now: NOW});
  assert.deepEqual([first.written, first.ki, first.fallback], [2, 2, 0]);
  const k = JSON.parse(bucket.map.get('previews/kadetten/staefa.json')), f = JSON.parse(bucket.map.get('previews/fcsg/458.json'));
  assert.deepEqual([k.generator, f.generator], ['ki', 'ki']);
  assert.equal(k.facts, undefined, 'die Faktenliste wird nicht gespeichert');
  assert.equal(k.headline, 'Kadetten wollen gegen Stäfa nachlegen');
  assert.match(f.paragraphs.join(' '), /Trainer Peter Zeidler/, 'Text wie von der KI geliefert');
  assert.match(k.baseHash, /^[a-f0-9]{64}$/);

  // Später: gleiche Fakten, kein neuer Aufruf
  calls.length = 0;
  const again = await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, rewrite: rewriter(calls), now: new Date(NOW.getTime() + 3 * 3600000)});
  assert.deepEqual([calls.length, again.written, again.unchanged], [0, 0, 2]);

  // 13 Stunden später: nur der Zeitstempel wird erneuert
  const later = new Date(NOW.getTime() + 13 * 3600000);
  await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, rewrite: rewriter(calls), now: later});
  assert.equal(calls.length, 0);
  const k2 = JSON.parse(bucket.map.get('previews/kadetten/staefa.json'));
  assert.deepEqual([k2.paragraphs, k2.generatedAt], [k.paragraphs, later.toISOString()]);

  // Ändern sich die Fakten (Tabelle), wird neu formuliert
  const changed = {...snapshot, tables: {QHL: [table[1], table[0], table[2]]}};
  await syncPreviews(bucket, {snapshot: changed, fcsgData: fcsg2}, {headToHead, rewrite: rewriter(calls), now: later});
  assert.ok(calls.includes('kadetten'));
});

test('KI-Vorschau: nur technische Regeln des Datendienstes gelten; sonst, bei Ausfall oder ohne KI bleibt der sachliche Text', async () => {
  const headToHead = async () => ({games: [duel]});
  const run = async texts => {
    const bucket = memBucket();
    const r = await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, rewrite: rewriter([], {texts}), now: NOW});
    return {r, k: JSON.parse(bucket.map.get('previews/kadetten/staefa.json'))};
  };
  const four = KI_KADETTEN + '\n\nEin vierter Absatz mit genug Zeichen für die Regel.';
  const merged = await run({kadetten: four});
  assert.equal(merged.k.generator, 'ki');
  assert.equal(merged.k.paragraphs.length, 3, 'überzählige Absätze werden dem dritten angehängt');
  assert.match(merged.k.paragraphs[2], /vierter Absatz/);

  const unparseable = await run({kadetten: 'nur ein Absatz ohne Titel'});
  assert.equal(unparseable.k.generator, 'daten');
  assert.match(unparseable.r.rejected[0].problems[0], /nicht in Titel und Absätze/);
  const tags = await run({kadetten: KI_KADETTEN.replace('Es ist', '<b>Es</b> ist')});
  assert.equal(tags.k.generator, 'daten', 'Sonderzeichen < und > bleiben ausgeschlossen');

  const bucket = memBucket();
  const calls = [];
  const down = await syncPreviews(bucket, {snapshot, fcsgData: fcsg2}, {headToHead, rewrite: rewriter(calls, {fail: true}), now: NOW});
  assert.deepEqual(calls, ['kadetten'], 'nach dem ersten Ausfall kein weiterer Aufruf');
  assert.deepEqual([down.written, down.ki, down.fallback], [2, 0, 2]);
  assert.equal(JSON.parse(bucket.map.get('previews/fcsg/458.json')).generator, 'daten');
  assert.equal(JSON.parse(bucket.map.get('previews/fcsg/458.json')).facts, undefined);

  const off = memBucket();
  const o = await syncPreviews(off, {snapshot, fcsgData: fcsg2}, {headToHead, now: NOW});
  assert.deepEqual([o.ki, o.fallback, o.written], [0, 0, 2]);

  const legacy = {club: 'kadetten', id: 'staefa', fixtureKey: fixtureKey(kGame), headline: 'Von ChatGPT', paragraphs: ['a'.repeat(40), 'b'.repeat(40)], sources: [{label: 'Q', url: 'https://kadettensh.ch/'}], generatedAt: new Date(NOW.getTime() - 3600000).toISOString()};
  const keep = memBucket({'previews/kadetten/staefa.json': legacy});
  const calls2 = [];
  const kept = await syncPreviews(keep, {snapshot, fcsgData: {games: []}}, {rewrite: rewriter(calls2), now: NOW});
  assert.deepEqual([kept.kept, calls2.length, keep.writes.length], [1, 0, 0]);
});

test('KI-Vorschau: Antwort ohne Titelzeile wird mit dem bisherigen Titel gespeichert', async () => {
  const bucket = memBucket();
  const ohne = 'Kadetten Schaffhausen empfängt Handball Stäfa am Samstag, 10. Oktober 2026, um 18:00 Uhr in Schaffhausen BBC Arena A. Es ist ein Spiel der QHL. Kadetten Schaffhausen liegt mit 13 Punkten aus 8 Spielen auf dem 2. Rang. Handball Stäfa liegt mit 0 Punkten aus 7 Spielen auf dem 3. Rang.';
  const r = await syncPreviews(bucket, {snapshot, fcsgData: {games: []}}, {headToHead: async () => ({games: [duel]}), rewrite: rewriter([], {texts: {kadetten: ohne}}), now: NOW});
  const k = JSON.parse(bucket.map.get('previews/kadetten/staefa.json'));
  assert.deepEqual([r.ki, r.fallback, k.generator], [1, 0, 'ki']);
  assert.equal(k.headline, 'Kadetten Schaffhausen gegen Handball Stäfa');
  assert.equal(k.paragraphs.length, 2);
});

test('Fakten: letzte Resultate des eigenen Teams aus dem Datenstand, des QHL-Gegners aus der SHV-Quelle, Direktduelle; Fehler und fehlende Quellen lassen Angaben weg', async () => {
  const played = (id, date, home, away, score) => ({id, date, home, away, score, league: 'QHL'});
  const snap = {tables: {QHL: table}, games: [
    played('a', '2026-09-01', 'Kadetten Schaffhausen', 'A', [30, 20]), played('b', '2026-09-08', 'B', 'Kadetten Schaffhausen', [25, 28]),
    played('c', '2026-09-15', 'Kadetten Schaffhausen', 'C', [31, 31]), played('d', '2026-09-22', 'D', 'Kadetten Schaffhausen', [20, 27]),
    {id: 'offen', date: '2026-09-29', home: 'Kadetten Schaffhausen', away: 'E', league: 'QHL'}, kGame]};
  const recentGames = async team => ({games: [played('x', '2026-10-01', team, 'Z', [22, 21]), played('y', '2026-09-20', 'Y', team, [18, 19]), played('spaeter', '2026-10-20', team, 'Q', [1, 2])]});
  const f = await collectFacts('kadetten', kGame, {snapshot: snap, fcsgData: fcsg}, {headToHead: async () => ({games: [duel, duel, duel, duel]}), recentGames});
  assert.deepEqual(f.recent[0].games.map(x => x.id ?? x.date), ['2026-09-22', '2026-09-15', '2026-09-08'], 'drei neueste abgeschlossene, ohne offene und spätere');
  assert.equal(f.recent[1].team, 'Handball Stäfa');
  assert.deepEqual(f.recent[1].games.map(x => x.date), ['2026-10-01', '2026-09-20'], 'Resultate nach dem Spieltag werden ignoriert');
  assert.equal(f.recent[1].shv, true);
  assert.equal(f.duels.length, 3);
  assert.equal(f.table, table);

  const ehl = await collectFacts('kadetten', {...kGame, league: 'EHL'}, {snapshot: {...snap, tables: {EHL: table}}, fcsgData: fcsg}, {headToHead: async () => { throw Error('nie'); }, recentGames: async () => { throw Error('nie'); }});
  assert.deepEqual([ehl.recent.length, ehl.duels.length], [1, 0], 'EHL: nur das eigene Team, keine SHV-Abfragen');

  const broken = await collectFacts('kadetten', kGame, {snapshot: snap, fcsgData: fcsg}, {headToHead: async () => { throw Error('weg'); }, recentGames: async () => { throw Error('weg'); }});
  assert.deepEqual([broken.duels.length, broken.recent[1].games.length], [0, 0]);

  const fc = await collectFacts('fcsg', fGame, {snapshot: snap, fcsgData: {...fcsg, games: [{...fGame, id: 'v1', date: '2026-10-04', home: 'FC Basel', away: 'FC St.Gallen 1879', score: [1, 2], status: 'FINISHED'}, fGame]}}, {});
  assert.deepEqual([fc.recent.length, fc.recent[0].team, fc.recent[0].games.length], [1, 'FC St.Gallen 1879', 1], 'FCSG: nur eigene Resultate, Gegner ohne Angabe');
});

test('Vorschau-Text mit letzten Resultaten und mehreren Direktduellen: Absatz drei, höchstens drei Absätze, Quellen', () => {
  const g1 = {date: '2026-09-22', home: 'D', away: 'Kadetten Schaffhausen', score: [20, 27]};
  const g2 = {date: '2026-09-15', home: 'Kadetten Schaffhausen', away: 'C', score: [31, 31]};
  const d2 = {...duel, id: '8', date: '2025-11-02', home: 'Kadetten Schaffhausen', away: 'Handball Stäfa', score: [35, 26], externalUrl: 'https://www.handball.ch/de/matchcenter/spiele/8'};
  const p = buildPreview({club: 'kadetten', game: kGame, table: table.QHL, duels: [duel, d2], recent: [{team: 'Kadetten Schaffhausen', games: [g1, g2]}, {team: 'Handball Stäfa', games: [{date: '2026-10-03', home: 'Handball Stäfa', away: 'BSV Bern', score: [24, 30]}], shv: true}], now: NOW});
  assert.equal(p.paragraphs.length, 3);
  assert.equal(p.paragraphs[2], 'Die letzten Direktduelle: 14.03.2026 Handball Stäfa – Kadetten Schaffhausen 27:31; 02.11.2025 Kadetten Schaffhausen – Handball Stäfa 35:26. Zuletzt spielte Kadetten Schaffhausen: 22.09. D – Kadetten Schaffhausen 20:27; 15.09. Kadetten Schaffhausen – C 31:31. Zuletzt spielte Handball Stäfa: 03.10. Handball Stäfa – BSV Bern 24:30.');
  assert.deepEqual(p.sources.map(s => s.label), ['Kadetten Schaffhausen: Matchcenter', 'handball.ch: Direktduell vom 14.03.2026', 'handball.ch: Direktduell vom 02.11.2025', 'handball.ch: Matchcenter']);
  assert.equal(validPreview(p), true);
  const onlyForm = buildPreview({club: 'kadetten', game: kGame, table: null, recent: [{team: 'Kadetten Schaffhausen', games: [g1]}], now: NOW});
  assert.equal(onlyForm.paragraphs.length, 2, 'Spielangaben und letzte Resultate genügen');
  const broken = buildPreview({club: 'kadetten', game: kGame, table: table.QHL, recent: [{team: 'X', games: [{date: 'kaputt', home: 'a', away: 'b', score: ['1', 2]}]}], now: NOW});
  assert.equal(broken.paragraphs.length, 2, 'ungültige Resultate werden ignoriert');
});

test('Schreiblauf: die KI und der sachliche Text erhalten die gesammelten Fakten (letzte Resultate, Direktduelle)', async () => {
  const snap = {...snapshot, games: [{id: 'c', date: '2026-09-15', home: 'Kadetten Schaffhausen', away: 'C', score: [31, 31], league: 'QHL'}, kGame]};
  const seen = [];
  const bucket = memBucket();
  await syncPreviews(bucket, {snapshot: snap, fcsgData: {games: []}}, {
    headToHead: async () => ({games: [duel]}),
    recentGames: async team => ({games: [{id: 'z', date: '2026-10-01', home: team, away: 'Z', score: [22, 21]}]}),
    rewrite: async baseline => { seen.push(baseline.paragraphs.at(-1)); return {ok: false, error: 'HTTP 500'}; },
    now: NOW
  });
  assert.match(seen[0], /Das letzte Direktduell/);
  assert.match(seen[0], /Zuletzt spielte Kadetten Schaffhausen: 15\.09\. Kadetten Schaffhausen – C 31:31\./);
  assert.match(seen[0], /Zuletzt spielte Handball Stäfa: 01\.10\. Handball Stäfa – Z 22:21\./);
  assert.equal(JSON.parse(bucket.map.get('previews/kadetten/staefa.json')).paragraphs.at(-1), seen[0], 'Rückfalltext enthält dieselben Fakten');
});

test('Oberfläche: «KI-Match-Vorschau» nur für KI-Texte und ältere Einsendungen, «Match-Vorschau» für Texte aus Daten', () => {
  const src = fs.readFileSync('src/client/js/views-match.js', 'utf8');
  assert.match(src, /const ai=p\.generator!=='daten'/);
  assert.match(src, /ai\?'KI-Match-Vorschau':'Match-Vorschau'/);
  assert.match(src, /generator==='ki'\?'Von einer KI aus bestätigten Spiel- und Tabellendaten formuliert/);
});
