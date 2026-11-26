import test from 'node:test';
import assert from 'node:assert/strict';
import {syncEhfArchive, archiveKey, RECORD_VERSION} from '../scripts/lib/ehf-archive.mjs';
import worker from '../server/worker.mjs';

const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
const KAD = 'uyEpUicNjwv8hCX9B7A3sg',
  IZV = '2zXEaNBPEzJP81Ffhy6t9g';
const game = {id: 'izvidac', league: 'EHL', home: 'Kadetten Schaffhausen', away: 'HC Izvidac', date: today};
const feed = (ended = true, goals = [5, 2]) => ({
  days: [
    {
      dayDatumFormatted: today,
      liveScoreMatches: [
        {
          match: {
            competitionShortName: 'EHF EL - M',
            matchID: '202711020901029',
            url: '/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/',
            homeTeam: {id: KAD, name: 'Kadetten Schaffhausen'},
            guestTeam: {id: IZV, name: 'HC Izvidac'}
          },
          homeStats: {totalGoals: goals[0]},
          guestStats: {totalGoals: goals[1]},
          matchStats: {
            time: '60:00',
            phase: ended ? 'Match ended' : '2nd Half',
            state: ended ? 2 : 1,
            stateEnum: ended ? 2 : 1,
            isLive: !ended
          }
        }
      ]
    }
  ]
});
const statistic = {
  id: '202711020901029',
  isLive: false,
  homeStatistics: {totalGoals: 5, totalShots: 6, shotEfficiency: 83, goals7meters: 1, shots7meters: 2, suspensions2minutes: 0},
  guestStatistics: {totalGoals: 2, totalShots: 5, shotEfficiency: 40, suspensions2minutes: 1}
};
const player = (id, bib, first, last, score, extra = {}) => ({
  id,
  shirtNumber: String(bib),
  playingPosition: extra.gk ? 'Goalkeeper' : 'Left Wing',
  isPlayer: true,
  isGoalkeeper: !!extra.gk,
  person: {firstName: first, lastName: last},
  score
});
const details = {
  matchDetails: {
    details: {
      venue: {place: {spectatorsCount: 1145}},
      homeTeam: {
        players: [
          player('a', 7, 'Max', 'Muster', {goals: 4, shots: 5}),
          player('c', 1, 'Leon', 'Bergmann', {goalkeeperSaves: 3, goalkeeperRecievedShots: 5}, {gk: true})
        ]
      },
      guestTeam: {players: [player('b', 24, 'Mile', 'Lasic', {goals: 2, shots: 3})]}
    }
  }
};
let n = 0;
const comp = (code, bib, given, family) => [
  {code, composition: {athlete: [{bib, role: 'SCR', description: {givenName: given, familyName: family}}]}}
];
const goal = (when, code, bib, given, family, h, a, loc = 'CSD') => ({
  order: ++n,
  period: 'H1',
  action: 'SHOT',
  when,
  loc,
  result: 'GOAL',
  scoreH: h,
  scoreA: a,
  competitor: comp(code, bib, given, family)
});
const ticker = {
  playerstats: {homeTeam: {team: {id: KAD}}, guestTeam: {team: {id: IZV}}},
  events: [
    {
      phaseScores: [{name: 'Match ended', scoreA: 5, scoreB: 2}],
      actions: {
        action: [
          goal('1:00', IZV, 24, 'Mile', 'Lasic', 0, 1),
          goal('2:00', KAD, 7, 'Max', 'Muster', 1, 1, 'PTY'),
          goal('3:00', KAD, 7, 'Max', 'Muster', 2, 1),
          goal('4:00', KAD, 7, 'Max', 'Muster', 3, 1),
          goal('5:00', KAD, 7, 'Max', 'Muster', 4, 1),
          goal('6:00', KAD, 7, 'Max', 'Muster', 5, 1),
          goal('35:00', IZV, 24, 'Mile', 'Lasic', 5, 2),
          {order: 50, period: 'H2', action: 'SHOT', when: '36:00', loc: 'CLD', result: 'MISS', competitor: comp(KAD, 7, 'Max', 'Muster')},
          ...['37:00', '38:00', '39:00'].map((when, i) => ({
            order: 51 + i,
            period: 'H2',
            action: 'SHOT',
            when,
            loc: 'PTY',
            result: 'SAVE',
            competitor: [
              ...comp(IZV, 24, 'Mile', 'Lasic'),
              {
                code: KAD,
                composition: {athlete: [{code: 'c', bib: 1, role: 'GK', description: {givenName: 'Leon', familyName: 'Bergmann'}}]}
              }
            ]
          })),
          {order: 70, period: 'H1', action: 'TOUT', actionAdd: 'START', when: '3:30', scoreH: 2, scoreA: 1, competitor: [{code: IZV}]},
          {
            order: 71,
            period: 'H1',
            action: 'TMS',
            when: '5:30',
            scoreH: 3,
            scoreA: 1,
            competitor: [{code: IZV, composition: {athlete: [{bib: 22, description: {givenName: 'Mihael', familyName: 'Bebek'}}]}}]
          },
          {order: 80, period: 'H1', action: 'ENDP', when: '30:0', scoreH: 5, scoreA: 1}
        ]
      }
    }
  ]
};
for (const a of ticker.events[0].actions.action)
  if (a.action === 'SHOT' && a.result === 'GOAL' && a.competitor[0].code === IZV)
    a.competitor.push({
      code: KAD,
      composition: {athlete: [{code: 'c', bib: 1, role: 'GK', description: {givenName: 'Leon', familyName: 'Bergmann'}}]}
    });
const memory = () => {
  const m = new Map();
  return {
    m,
    get: async k => (m.has(k) ? {json: async () => JSON.parse(m.get(k))} : null),
    put: async (k, v) => {
      m.set(k, v);
    }
  };
};
const mockFetch =
  (calls, {feedBody = feed(), tickerBody = ticker, tickerStatus = 200, statisticBody = statistic} = {}) =>
  async (url, init) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('GetLiveScoreMatches')) return Response.json(feedBody);
    if (u.includes('GetMatchDetailStatistic')) return Response.json(statisticBody);
    if (u.includes('GetMatchDetails')) return Response.json(details);
    if (u.includes('ticker.ehf.eu/v3/TickerData')) {
      assert.equal(init.method, 'POST');
      assert.match(init.body.get('MatchID'), /^202711020901\d{3}$/);
      return tickerStatus === 200 ? Response.json(tickerBody) : new Response('x', {status: tickerStatus});
    }
    return new Response('{}', {status: 404});
  };
test('Endstand und sachlicher Matchbericht werden gesichert; Rohereignisse entfallen, Torfolge und 7 m bleiben', async () => {
  const bucket = memory(),
    calls = [];
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(calls)});
  assert.equal(out.written, 1);
  assert.equal(out.reports, 1);
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.matchId, '202711020901029');
  assert.deepEqual(rec.score, [5, 2]);
  assert.deepEqual(rec.half, [5, 1]);
  assert.equal(rec.report.generator, 'daten');
  assert.match(rec.report.headline, /5:2/);
  assert.ok(rec.report.paragraphs.length >= 2);
  assert.equal(rec.ticker, undefined);
  assert.equal(rec.goals.length, 7);
  assert.deepEqual(rec.goals[1], {t: '2:00', s: [1, 1], h: true, n: 'Max Muster', p: true});
  const muster = rec.players.find(p => p.name === 'Max Muster');
  assert.deepEqual([muster.seven, muster.sevenShots], [1, 1]);
  assert.equal(rec.teamStats.home.goals, 5);
  // Der Worker liefert den Eintrag öffentlich, nur lesend.
  const res = await worker.fetch(new Request('https://app.test/api/ehf-reports/izvidac'), {BUCKET: bucket});
  assert.equal(res.status, 200);
  assert.match((await res.json()).report.report.headline, /5:2/);
  assert.equal((await worker.fetch(new Request('https://app.test/api/ehf-reports/nope'), {BUCKET: bucket})).status, 404);
  assert.equal(
    (await worker.fetch(new Request('https://app.test/api/ehf-reports/izvidac', {method: 'POST'}), {BUCKET: bucket})).status,
    405
  );
  // Ein fertiger Bericht wird nicht erneut erzeugt und es gibt keine Netzwerkzugriffe.
  const again = [];
  const second = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(again)});
  assert.equal(second.kept, 1);
  assert.equal(again.length, 0);
});

test('Der sachliche Bericht gilt als fertig', async () => {
  const bucket = memory();
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([])});
  assert.equal(out.reports, 1);
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.report.generator, 'daten');
  assert.equal(rec.ticker, undefined);
});

test('Ereignisse, die nicht zum Endstand passen, ergeben keinen Bericht, aber Statistik und Torfolge-Verzicht', async () => {
  const bucket = memory();
  const out = await syncEhfArchive(bucket, {
    games: [game],
    fetchFn: mockFetch([], {
      feedBody: feed(true, [6, 2]),
      statisticBody: {...statistic, homeStatistics: {...statistic.homeStatistics, totalGoals: 6}}
    })
  });
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.report, undefined);
  assert.equal(rec.goals, null);
  assert.match(rec.tickerError, /nicht zum Endstand/);
  assert.equal(rec.players.length, 3);
  assert.match(out.notes[0], /ohne Bericht/);
});

test('Ticker nicht erreichbar: Statistik wird gesichert, der Bericht folgt im nächsten Lauf', async () => {
  const bucket = memory();
  await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([], {tickerStatus: 503})});
  assert.match(JSON.parse(bucket.m.get(archiveKey('izvidac'))).tickerError, /503/);
  const out = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([])});
  assert.equal(out.reports, 1);
  assert.equal(JSON.parse(bucket.m.get(archiveKey('izvidac'))).report.generator, 'daten');
});

test('Nur am Spieltag und am Folgetag, nur für beendete Spiele der Kadetten in der European League', async () => {
  const bucket = memory(),
    calls = [];
  const none = await syncEhfArchive(bucket, {
    games: [
      {...game, date: '2020-01-01'},
      {...game, league: 'QHL'}
    ],
    fetchFn: mockFetch(calls)
  });
  assert.equal(none.checked, 0);
  assert.equal(calls.length, 0);
  const live = await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch(calls, {feedBody: feed(false)})});
  assert.equal(live.written, 0);
  assert.match(live.notes[0], /nicht als beendet/);
  assert.equal(bucket.m.size, 0);
});

test('Ticker: ein abgebrochener Abruf wird wiederholt, die Fehlermeldung nennt die Ursache', async () => {
  let tickerCalls = 0;
  const flaky = failures => async (url, init) => {
    if (String(url).includes('TickerData')) {
      tickerCalls++;
      if (tickerCalls <= failures)
        throw Object.assign(TypeError('fetch failed'), {cause: {code: 'ECONNRESET', message: 'read ECONNRESET'}});
    }
    return mockFetch([])(url, init);
  };
  const ok = memory();
  const out = await syncEhfArchive(ok, {games: [game], fetchFn: flaky(2)});
  assert.equal(out.reports, 1);
  assert.equal(tickerCalls, 3);
  tickerCalls = 0;
  const bad = memory();
  await syncEhfArchive(bad, {games: [game], fetchFn: flaky(9)});
  assert.equal(tickerCalls, 3);
  assert.match(JSON.parse(bad.m.get(archiveKey('izvidac'))).tickerError, /Versuch 3: fetch failed: ECONNRESET/);
});

test('Berichte sind für die Pages-Oberfläche lesbar freigegeben (CORS), nur lesend', async () => {
  const bucket = memory();
  bucket.m.set('kadetten/ehf/izvidac.json', JSON.stringify({score: [1, 0]}));
  bucket.m.set('kadetten/matchreports/staefa.json', JSON.stringify({score: [1, 0]}));
  for (const path of ['/api/ehf-reports/izvidac', '/api/match-reports/staefa']) {
    const r = await worker.fetch(new Request('https://app.test' + path), {BUCKET: bucket});
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://mac-mac-sg.github.io');
  }
  const unknown = await worker.fetch(new Request('https://app.test/api/match-reports/nicht-da'), {BUCKET: bucket});
  assert.equal(unknown.status, 404);
});

test('Neuer Eintrag enthält Wurfdetails, Torhüter-Zonen, Zuschauer, Auszeiten und Zeitstrafen', async () => {
  const bucket = memory();
  await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([])});
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.v, RECORD_VERSION);
  assert.equal(rec.spectators, 1145);
  assert.equal(rec.shotStats.home.shots, 6);
  assert.equal(rec.shotStats.home.missed, 1);
  assert.equal(rec.shotStats.away.saved, 3);
  assert.equal(rec.shotStats.home.keepers[0].sevenSaves, 3);
  assert.deepEqual(rec.timeouts, [{side: 'away', sec: 210}]);
  assert.deepEqual(rec.suspensions, [{side: 'away', sec: 330, name: 'Mihael Bebek'}]);
});

test('Version 2 erhält Wurfdetails ohne neuen Bericht; Quellenfehler erhalten bestehende Daten', async () => {
  const bucket = memory();
  await syncEhfArchive(bucket, {games: [game], fetchFn: mockFetch([])});
  const old = JSON.parse(bucket.m.get(archiveKey(game.id))),
    report = old.report;
  old.v = 2;
  delete old.shotStats;
  bucket.m.set(archiveKey(game.id), JSON.stringify(old));
  await syncEhfArchive(bucket, {
    games: [{...game, score: [5, 2]}],
    fetchFn: mockFetch([])
  });
  const upgraded = JSON.parse(bucket.m.get(archiveKey(game.id)));
  assert.deepEqual(upgraded.report, report);
  assert.equal(upgraded.shotStats.home.shots, 6);
  upgraded.v = 2;
  bucket.m.set(archiveKey(game.id), JSON.stringify(upgraded));
  await syncEhfArchive(bucket, {games: [{...game, score: [5, 2]}], fetchFn: mockFetch([], {tickerStatus: 503})});
  const retained = JSON.parse(bucket.m.get(archiveKey(game.id)));
  assert.deepEqual(retained.shotStats, upgraded.shotStats);
  assert.deepEqual(retained.goals, upgraded.goals);
  assert.deepEqual(retained.report, report);
});

test('Alter Eintrag (Version 1) wird ergänzt: Bericht bleibt, Spiel-ID aus dem Eintrag, kein Feed nötig', async () => {
  const bucket = memory();
  const oldReport = {
    headline: 'Alter Titel',
    paragraphs: ['Absatz eins mit genug Text für den Bericht.', 'Absatz zwei mit genug Text für den Bericht.'],
    generator: 'ki',
    generatedAt: '2026-10-06T20:06:00Z',
    attempts: 1
  };
  bucket.m.set(
    archiveKey('izvidac'),
    JSON.stringify({
      v: 1,
      fixtureId: 'izvidac',
      matchId: '202711020901029',
      home: 'Kadetten Schaffhausen',
      away: 'HC Izvidac',
      date: today,
      score: [5, 2],
      report: oldReport,
      facts: ['Fakt'],
      source: {url: 'https://ehfel.eurohandball.com/x'}
    })
  );
  const calls = [];
  const out = await syncEhfArchive(bucket, {
    games: [{...game, score: [5, 2], date: '2020-01-01'}],
    fetchFn: mockFetch(calls)
  });
  assert.equal(out.written, 1);
  assert.equal(out.reports, 0);
  assert.ok(!calls.some(u => u.includes('GetLiveScoreMatches')));
  const rec = JSON.parse(bucket.m.get(archiveKey('izvidac')));
  assert.equal(rec.v, RECORD_VERSION);
  assert.deepEqual(rec.report, oldReport);
  assert.equal(rec.spectators, 1145);
  assert.equal(rec.goals.length, 7);
  assert.equal(rec.ticker, undefined);
  const again = await syncEhfArchive(bucket, {games: [{...game, score: [5, 2]}], fetchFn: mockFetch([])});
  assert.equal(again.kept, 1);
});

test('Bekanntes älteres Spiel (Bukarest) wird ohne Feed nachgeladen, mit Bericht', async () => {
  const bucket = memory(),
    calls = [];
  const bukarest = {id: 'bukarest', league: 'EHL', home: 'Kadetten Schaffhausen', away: 'CSM Bucuresti', date: '2026-09-30', score: [5, 2]};
  const out = await syncEhfArchive(bucket, {games: [bukarest], fetchFn: mockFetch(calls)});
  assert.equal(out.written, 1);
  assert.ok(calls.some(u => u.includes('matchId=202711020901026')));
  assert.ok(!calls.some(u => u.includes('GetLiveScoreMatches')));
  const rec = JSON.parse(bucket.m.get(archiveKey('bukarest')));
  assert.equal(rec.matchId, '202711020901026');
  assert.equal(rec.away, 'CSM Bucuresti');
  assert.equal(rec.report.generator, 'daten');
  // Unbekanntes älteres Spiel ohne Eintrag: Hinweis, kein Abruf
  const other = await syncEhfArchive(memory(), {games: [{...bukarest, id: 'sonstiges'}], fetchFn: mockFetch([])});
  assert.equal(other.written, 0);
  assert.match(other.notes[0], /nicht mehr im Feed/);
});
