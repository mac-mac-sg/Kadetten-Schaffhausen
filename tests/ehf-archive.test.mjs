import test from 'node:test';
import assert from 'node:assert/strict';
import {syncEhfArchive, archiveKey} from '../scripts/lib/ehf-archive.mjs';
import worker from '../server/worker.mjs';

const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
const KAD = 'uyEpUicNjwv8hCX9B7A3sg', IZV = '2zXEaNBPEzJP81Ffhy6t9g';
const game = {id: 'izvidac', league: 'EHL', home: 'Kadetten Schaffhausen', away: 'HC Izvidac', date: today};
const feed = (ended = true, goals = [5, 2]) => ({days: [{dayDatumFormatted: today, liveScoreMatches: [
  {match: {competitionShortName: 'EHF EL - M', matchID: '202711020901029', url: '/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/', homeTeam: {id: KAD, name: 'Kadetten Schaffhausen'}, guestTeam: {id: IZV, name: 'HC Izvidac'}},
   homeStats: {totalGoals: goals[0]}, guestStats: {totalGoals: goals[1]}, matchStats: {time: '60:00', phase: ended ? 'Match ended' : '2nd Half', state: ended ? 2 : 1, stateEnum: ended ? 2 : 1, isLive: !ended}}
]}]});
const statistic = {id: '202711020901029', isLive: false, homeStatistics: {totalGoals: 5, totalShots: 6, shotEfficiency: 83, goals7meters: 1, shots7meters: 2, suspensions2minutes: 0}, guestStatistics: {totalGoals: 2, totalShots: 5, shotEfficiency: 40, suspensions2minutes: 1}};
const player = (id, bib, first, last, score, extra = {}) => ({id, shirtNumber: String(bib), playingPosition: extra.gk ? 'Goalkeeper' : 'Left Wing', isPlayer: true, isGoalkeeper: !!extra.gk, person: {firstName: first, lastName: last}, score});
const details = {matchDetails: {details: {homeTeam: {players: [player('a', 7, 'Max', 'Muster', {goals: 4, shots: 5}), player('c', 1, 'Leon', 'Bergmann', {goalkeeperSaves: 3, goalkeeperRecievedShots: 5}, {gk: true})]}, guestTeam: {players: [player('b', 24, 'Mile', 'Lasic', {goals: 2, shots: 3})]}}}};
let n = 0;
const comp = (code, bib, given, family) => [{code, composition: {athlete: [{bib, role: 'SCR', description: {givenName: given, familyName: family}}]}}];
const goal = (when, code, bib, given, family, h, a, loc = 'CSD') => ({order: ++n, period: 'H1', action: 'SHOT', when, loc, result: 'GOAL', scoreH: h, scoreA: a, competitor: comp(code, bib, given, family)});
const ticker = {playerstats: {homeTeam: {team: {id: KAD}}, guestTeam: {team: {id: IZV}}}, events: [{phaseScores: [{name: 'Match ended', scoreA: 5, scoreB: 2}], actions: {action: [
  goal('1:00', IZV, 24, 'Mile', 'Lasic', 0, 1), goal('2:00', KAD, 7, 'Max', 'Muster', 1, 1, 'PTY'), goal('3:00', KAD, 7, 'Max', 'Muster', 2, 1), goal('4:00', KAD, 7, 'Max', 'Muster', 3, 1), goal('5:00', KAD, 7, 'Max', 'Muster', 4, 1),
  goal('6:00', KAD, 7, 'Max', 'Muster', 5, 1), goal('35:00', IZV, 24, 'Mile', 'Lasic', 5, 2),
  {order: 80, period: 'H1', action: 'ENDP', when: '30:0', scoreH: 5, scoreA: 1}]}}]};
const memory = () => {
  const m = new Map();
  return {m, get: async k => (m.has(k) ? {json: async () => JSON.parse(m.get(k))} : null), put: async (k, v) => { m.set(k, v); }};
};
const mockFetch = (calls, {feedBody = feed(), tickerBody = ticker, tickerStatus = 200} = {}) => async (url, init) => {
  const u = String(url);
  calls.push(u);
  if (u.includes('GetLiveScoreMatches')) return Response.json(feedBody);
  if (u.includes('GetMatchDetailStatistic')) return Response.json(statistic);
  if (u.includes('GetMatchDetails')) return Response.json(details);
  if (u.includes('ticker.ehf.eu/v3/TickerData')) {
    assert.equal(init.method, 'POST');
    assert.equal(init.body.get('MatchID'), '202711020901029');
    return tickerStatus === 200 ? Response.json(tickerBody) : new Response('x', {status: tickerStatus});
  }
  return new Response('{}', {status: 404});
};
const kiWriter = async messages => {
  assert.match(messages[1].content, /Halbzeitstand 5:1/);
  return {ok: true, text: 'Kadetten gewinnen klar\n\nUnsere Kadetten gewinnen gegen HC Izvidac mit 5:2 und führen zur Pause mit 5:1.\n\nNach dem frühen 0:1 folgten fünf Tore in Folge zum 5:1 für die Kadetten.\n\nMax Muster erzielte vier Tore, Leon Bergmann hielt drei von fünf Würfen.'};
};

test('Endstand und KI-Matchbericht werden gesichert; Rohereignisse entfallen, Torfolge und 7 m bleiben', async () => {
  const bucket = memory(), calls = [];
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(calls), write: kiWriter});
  assert.equal(out.written, 1);assert.equal(out.ki, 1);
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.matchId, '202711020901029');assert.deepEqual(rec.score, [5, 2]);assert.deepEqual(rec.half, [5, 1]);
  assert.equal(rec.report.generator, 'ki');assert.equal(rec.report.headline, 'Kadetten gewinnen klar');assert.equal(rec.report.paragraphs.length, 3);
  assert.equal(rec.ticker, undefined);
  assert.equal(rec.goals.length, 7);assert.deepEqual(rec.goals[1], {t: '2:00', s: [1, 1], h: true, n: 'Max Muster', p: true});
  const muster = rec.players.find(p => p.name === 'Max Muster');
  assert.deepEqual([muster.seven, muster.sevenShots], [1, 1]);
  assert.equal(rec.teamStats.home.goals, 5);
  // Der Worker liefert den Eintrag öffentlich, nur lesend.
  const res = await worker.fetch(new Request('https://app.test/api/ehf-reports/izvidac'), {BUCKET: bucket});
  assert.equal(res.status, 200);assert.equal((await res.json()).report.report.headline, 'Kadetten gewinnen klar');
  assert.equal((await worker.fetch(new Request('https://app.test/api/ehf-reports/nope'), {BUCKET: bucket})).status, 404);
  assert.equal((await worker.fetch(new Request('https://app.test/api/ehf-reports/izvidac', {method: 'POST'}), {BUCKET: bucket})).status, 405);
  // Ein fertiger KI-Bericht wird nicht erneut erzeugt und es gibt keine Netzwerkzugriffe.
  const again = []; const second = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(again), write: kiWriter});
  assert.equal(second.kept, 1);assert.equal(again.length, 0);
});

test('Fällt die KI aus, steht ein sachlicher Bericht; der nächste Lauf ersetzt ihn durch den KI-Text', async () => {
  const bucket = memory();
  const first = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([]), write: async () => ({ok: false, error: 'HTTP 500'})});
  assert.equal(first.reports, 1);assert.equal(first.ki, 0);
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.report.generator, 'daten');assert.ok(rec.ticker);assert.match(rec.report.headline, /5:2/);
  const second = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([]), write: kiWriter});
  assert.equal(second.ki, 1);
  const upgraded = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(upgraded.report.generator, 'ki');assert.equal(upgraded.ticker, undefined);
});

test('Ohne KI-Zugang entsteht der sachliche Bericht und gilt als fertig', async () => {
  const bucket = memory();
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([]), write: null});
  assert.equal(out.reports, 1);
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.report.generator, 'daten');assert.equal(rec.ticker, undefined);
});

test('Ereignisse, die nicht zum Endstand passen, ergeben keinen Bericht, aber Statistik und Torfolge-Verzicht', async () => {
  const bucket = memory();
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([], {feedBody: feed(true, [6, 2])}), write: kiWriter});
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.report, undefined);assert.equal(rec.goals, null);assert.match(rec.tickerError, /nicht zum Endstand/);
  assert.equal(rec.players.length, 3);
  assert.match(out.notes[0], /ohne Bericht/);
});

test('Ticker nicht erreichbar: Statistik wird gesichert, der Bericht folgt im nächsten Lauf', async () => {
  const bucket = memory();
  await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([], {tickerStatus: 503}), write: kiWriter});
  assert.match(JSON.parse(bucket.m.get(archiveKey('izvidac'))).tickerError, /503/);
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([]), write: kiWriter});
  assert.equal(out.ki, 1);
  assert.equal(JSON.parse(bucket.m.get(archiveKey('izvidac'))).report.generator, 'ki');
});

test('Nur am Spieltag und am Folgetag, nur für beendete Spiele der Kadetten in der European League', async () => {
  const bucket = memory(), calls = [];
  const none = await syncEhfArchive(bucket, {games: [{...game, date: '2020-01-01'}, {...game, league: 'QHL'}], fetchFn: mockFetch(calls), write: kiWriter});
  assert.equal(none.checked, 0);assert.equal(calls.length, 0);
  const live = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(calls, {feedBody: feed(false)}), write: kiWriter});
  assert.equal(live.written, 0);assert.match(live.notes[0], /nicht als beendet/);
  assert.equal(bucket.m.size, 0);
});

test('Ticker: ein abgebrochener Abruf wird wiederholt, die Fehlermeldung nennt die Ursache', async () => {
  let tickerCalls = 0;
  const flaky = failures => async (url, init) => {
    if (String(url).includes('TickerData')) {
      tickerCalls++;
      if (tickerCalls <= failures) throw Object.assign(TypeError('fetch failed'), {cause: {code: 'ECONNRESET', message: 'read ECONNRESET'}});
    }
    return mockFetch([])(url, init);
  };
  const ok = memory();
  const out = await syncEhfArchive(ok, {games: [game], fetchFn: flaky(2), write: kiWriter});
  assert.equal(out.ki, 1);assert.equal(tickerCalls, 3);
  tickerCalls = 0;
  const bad = memory();
  await syncEhfArchive(bad, {games: [game], fetchFn: flaky(9), write: kiWriter});
  assert.equal(tickerCalls, 3);
  assert.match(JSON.parse(bad.m.get(archiveKey('izvidac'))).tickerError, /Versuch 3: fetch failed: ECONNRESET/);
});
