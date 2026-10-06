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
