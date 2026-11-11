import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.mjs';

test('/api/live: fallen alle Quellen aus, nennt die Antwort je Quelle den Grund (ohne Zugangsdaten) und bleibt 503', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes('ehfel.eurohandball.com')) throw Error('EHF nicht erreichbar');
    return new Response('{}', {status: 502});
  };
  try {
    const r = await worker.fetch(new Request('https://example.test/api/live'), {});
    assert.equal(r.status, 503);
    const body = await r.json();
    assert.equal(body.ok, false);assert.equal(body.match, null);assert.equal(body.error, 'Live source unavailable');
    assert.equal(body.sources.SHV.ok, false);assert.equal(body.sources.EHF.ok, false);
    assert.match(body.sources.EHF.error, /EHF nicht erreichbar/);
    assert.ok(body.sources.SHV.error.length > 0 && body.sources.SHV.error.length <= 120);
  } finally { globalThis.fetch = realFetch; }
});

// Regressionstest: /api/live läuft einmal vollständig durch beide Quellen (SHV ohne Spiel, EHF mit beendetem Spiel).
// Ein fehlender Baustein im Live-Modul (zum Beispiel eine versehentlich entfernte Funktion) fällt hier sofort auf.
test('/api/live: SHV ohne Spiel und EHF-Spiel beendet liefert finished mit Endstand, Teamwerten und Spielerwerten', async () => {
  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Zurich'});
  const feed = {days: [{dayDatumFormatted: today, liveScoreMatches: [
    {match: null, matchStats: null},
    {match: {competitionShortName: 'EHF EL - M', matchID: '202711020901029', url: '/men/2026-27/matches/details/202711020901029/KadettenSchaffhausen-HCIzvidac/', homeTeam: {id: 'uyEpUicNjwv8hCX9B7A3sg', name: 'Kadetten Schaffhausen'}, guestTeam: {id: '2zXEaNBPEzJP81Ffhy6t9g', name: 'HC Izvidac'}},
     homeStats: {totalGoals: 42}, guestStats: {totalGoals: 30}, matchStats: {time: '60:00', phase: 'Match ended', state: 2, stateEnum: 2, isLive: false}}
  ]}]};
  const statistic = {id: '202711020901029', isLive: false, homeStatistics: {totalGoals: 42, totalShots: 50, shotEfficiency: 84}, guestStatistics: {totalGoals: 30, totalShots: 52, shotEfficiency: 58}};
  const player = (id, first, last, score) => ({id, shirtNumber: '7', playingPosition: 'Left Wing', isPlayer: true, isGoalkeeper: false, person: {firstName: first, lastName: last}, score});
  const details = {matchDetails: {details: {homeTeam: {players: [player('a', 'Max', 'Muster', {goals: 5, shots: 7})]}, guestTeam: {players: [player('b', 'Marko', 'Culjak', {goals: 3, shots: 4})]}}}};
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('handball.ch')) return new Response(JSON.stringify({data: {games: []}}), {headers: {'content-type': 'application/json'}});
    if (u.includes('GetLiveScoreMatches')) return Response.json(feed);
    if (u.includes('GetMatchDetailStatistic')) return Response.json(statistic);
    if (u.includes('GetMatchDetails')) return Response.json(details);
    return new Response('{}', {status: 404});
  };
  try {
    const r = await worker.fetch(new Request('https://example.test/api/live'), {});
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.ok, true);assert.equal(body.match, null);
    assert.equal(body.sources.SHV.ok, true);assert.equal(body.sources.EHF.ok, true);
    assert.equal(body.finished.status, 'finished');assert.deepEqual(body.finished.score, [42, 30]);assert.equal(body.finished.date, today);
    assert.equal(body.finished.details.teamStats.home.goals, 42);assert.equal(body.finished.details.teamStats.guest.efficiency, 58);
    assert.deepEqual(body.finished.details.players.map(p => [p.name, p.goals, p.home]), [['Max Muster', 5, true], ['Marko Culjak', 3, false]]);
  } finally { globalThis.fetch = realFetch; }
});

// ---- Teilausfall einer Quelle: klare Meldung, letzter Stand bleibt kurz als «veraltet» nutzbar ----
import {resetLiveState, getLiveMatch} from '../server/live.mjs';

const liveGame = {objectId: 508393, gameId: 508393, isLive: true, gameStatusId: 1, ltGameStatusId: 2, seasonId: 2026, gameDateTime: '2026-11-11T19:15:00', homeTeamId: 41473, homeTeamName: 'Kadetten Schaffhausen', homeTeamScore: 12, awayTeamId: 9, awayTeamName: 'HSC Suhr Aarau', awayTeamScore: 10, leagueShortName: 'QHL', ltGameTime: '28:10', ltCurrentGamePhaseText: '1. Halbzeit'};
function sources({shv = 'live', ehf = 'leer'}) {
  return async (url, init) => {
    const u = String(url);
    if (u.includes('handball.ch')) {
      if (shv === 'aus') throw Object.assign(new Error('The operation was aborted due to timeout'), {name: 'TimeoutError'});
      const body = JSON.parse(init.body), json = data => new Response(JSON.stringify({data}), {headers: {'content-type': 'application/json'}});
      if (shv === 'leer') return json({games: []});
      return /game\(gameId/.test(body.query) ? json({game: [liveGame]}) : json({games: [liveGame]});
    }
    if (u.includes('GetLiveScoreMatches')) {
      if (ehf === 'aus') throw Error('EHF nicht erreichbar');
      return Response.json({days: [{dayDatumFormatted: '2000-01-01', liveScoreMatches: []}]});
    }
    return new Response('{}', {status: 404});
  };
}
async function withSources(fn) {
  const realFetch = globalThis.fetch, realNow = Date.now;
  resetLiveState();
  try { await fn(mode => { globalThis.fetch = sources(mode); }, ms => { const base = realNow(); Date.now = () => base + ms; }); }
  finally { globalThis.fetch = realFetch; Date.now = realNow; resetLiveState(); }
}

test('/api/live: gesunde Quellen melden degraded=false und werden 20 s zwischengespeichert', async () => {
  await withSources(async setFetch => {
    setFetch({shv: 'live'});
    const a = await getLiveMatch();
    assert.equal(a.degraded, false);assert.deepEqual(a.sources, {SHV: {ok: true}, EHF: {ok: true}});
    assert.deepEqual(a.match.score, [12, 10]);
    setFetch({shv: 'aus'});
    assert.equal(await getLiveMatch(), a, 'innerhalb von 20 s derselbe Eintrag');
  });
});

test('/api/live: fällt die SHV-Quelle aus und es gibt keinen letzten Stand, steht das in der Antwort (nicht «kein Spiel»)', async () => {
  await withSources(async setFetch => {
    setFetch({shv: 'aus'});
    const r = await getLiveMatch();
    assert.equal(r.ok, true);assert.equal(r.match, null);
    assert.equal(r.degraded, true, 'Teilausfall ist erkennbar');
    assert.equal(r.sources.SHV.ok, false);assert.match(r.sources.SHV.error, /timeout/);assert.equal(r.sources.SHV.stale, undefined);
    assert.equal(r.sources.EHF.ok, true);
    // Zum Vergleich: SHV antwortet und meldet wirklich kein Spiel.
  });
  await withSources(async setFetch => {
    setFetch({shv: 'leer'});
    const r = await getLiveMatch();
    assert.equal(r.degraded, false);assert.equal(r.match, null);assert.deepEqual(r.sources.SHV, {ok: true});
  });
});

test('/api/live: kurzer Ausfall der SHV-Quelle behält den letzten Stand als «veraltet»; nach 10 Minuten verschwindet er', async () => {
  await withSources(async (setFetch, advance) => {
    setFetch({shv: 'live'});
    const first = await getLiveMatch();
    assert.deepEqual(first.match.score, [12, 10]);
    setFetch({shv: 'aus'});
    advance(30000);
    const stale = await getLiveMatch();
    assert.equal(stale.ok, true);assert.equal(stale.degraded, true);
    assert.deepEqual(stale.match.score, [12, 10], 'das laufende Spiel verschwindet nicht');
    assert.equal(stale.sources.SHV.ok, false);assert.equal(stale.sources.SHV.stale, true);
    assert.equal(stale.sources.SHV.since, first.checkedAt, '«veraltet seit»: Zeitpunkt des letzten gültigen Stands');
    advance(11 * 60000);
    const gone = await getLiveMatch();
    assert.equal(gone.match, null, 'nach 10 Minuten gilt die Quelle als ausgefallen');
    assert.equal(gone.sources.SHV.stale, undefined);assert.equal(gone.degraded, true);
  });
});

test('/api/live: Teilausfälle werden nur 5 Sekunden zwischengespeichert, die Quelle wird bald wieder versucht', async () => {
  await withSources(async (setFetch, advance) => {
    setFetch({shv: 'aus'});
    const a = await getLiveMatch();
    assert.equal(a.degraded, true);
    setFetch({shv: 'live'});
    advance(3000);
    assert.equal(await getLiveMatch(), a, 'nach 3 s noch der Teilausfall aus dem Zwischenspeicher');
    advance(6000);
    const b = await getLiveMatch();
    assert.equal(b.degraded, false);assert.deepEqual(b.match.score, [12, 10], 'nach 6 s erholt sich die Quelle');
  });
});

test('/api/live: fällt die EHF-Quelle aus, bleibt ein SHV-Spiel sichtbar; der Ausfall steht je Quelle in der Antwort', async () => {
  await withSources(async setFetch => {
    setFetch({shv: 'live', ehf: 'aus'});
    const r = await getLiveMatch();
    assert.deepEqual(r.match.score, [12, 10]);assert.equal(r.degraded, true);
    assert.equal(r.sources.SHV.ok, true);assert.equal(r.sources.EHF.ok, false);assert.match(r.sources.EHF.error, /EHF nicht erreichbar/);
  });
});
