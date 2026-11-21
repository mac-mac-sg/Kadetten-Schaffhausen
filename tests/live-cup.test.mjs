import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLiveMatch, parseFinishedMatch, cleanTeamName} from '../server/live.mjs';
import {cleanTeam, normTeam, sameTeam, isOwn, findGame} from '../src/kadetten/js/match.js';
import {involves} from '../src/kadetten/js/logic.js';
import {createStore} from '../src/kadetten/js/store.js';

// Im Mobiliar-Cup nennt die SHV die Liga hinter den Teams (so geliefert am 21.11.2026 für Spiel 517411).
const cup = {
  gameId: 517411,
  isLive: true,
  seasonId: 2026,
  gameDateTime: '2026-11-21T20:00:00',
  homeTeamId: 41439,
  homeTeamName: 'HC Kriens-Luzern (QHL)',
  homeTeamScore: 3,
  awayTeamId: 41473,
  awayTeamName: 'Kadetten Schaffhausen (QHL)',
  awayTeamScore: 2,
  leagueShortName: 'Mobiliar-Cup M',
  ltGameTime: '05:12',
  ltCurrentGamePhaseText: '1. Halbzeit'
};

test('Datendienst: Liga-Zusatz der Cup-Teams wird entfernt, Live- und Endstand', () => {
  assert.equal(cleanTeamName('Handball Emmen (MNLB)'), 'Handball Emmen');
  assert.equal(cleanTeamName('HC Kriens-Luzern'), 'HC Kriens-Luzern');
  assert.equal(cleanTeamName(null), '');
  const live = parseLiveMatch(cup);
  assert.deepEqual(
    [live.home, live.away, live.score, live.league],
    ['HC Kriens-Luzern', 'Kadetten Schaffhausen', [3, 2], 'Mobiliar-Cup M']
  );
  const done = parseFinishedMatch({...cup, isLive: false, gameStatusId: 2, ltGameStatusId: 4, homeTeamScore: 30, awayTeamScore: 31});
  assert.equal(done.away, 'Kadetten Schaffhausen');
  assert.equal(done.status, 'finished');
});

test('App: Liga-Zusatz stört weder Teamvergleich noch Zuordnung zum Spielplan', () => {
  assert.equal(cleanTeam('Kadetten Schaffhausen (QHL)'), 'Kadetten Schaffhausen');
  assert.equal(normTeam('HC Kriens-Luzern (QHL)'), 'hc kriens-luzern');
  assert.equal(sameTeam('HC Kriens-Luzern (QHL)', 'HC Kriens-Luzern'), true);
  assert.equal(isOwn('Kadetten Schaffhausen (QHL)'), true);
  assert.equal(sameTeam('SG Kriens-Emmen (M1)', 'HC Kriens-Luzern'), false);
  const games = [{id: 'cup', date: '2026-11-21', home: 'HC Kriens-Luzern', away: 'Kadetten Schaffhausen'}];
  assert.equal(findGame(games, {date: '2026-11-21', home: 'HC Kriens-Luzern (QHL)', away: 'Kadetten Schaffhausen (QHL)'}, 0).id, 'cup');
});

test('Store: Live-Stand eines Cup-Spiels hat bereinigte Namen, so zählt die App es als Kadetten-Spiel', async () => {
  const raw = {home: 'HC Kriens-Luzern (QHL)', away: 'Kadetten Schaffhausen (QHL)', score: [3, 2], id: 517411};
  const api = {
    data: async () => ({games: [], tables: {}}),
    live: async () => ({
      ok: true,
      checkedAt: new Date().toISOString(),
      match: raw,
      finished: {...raw, status: 'finished', date: '2026-11-21'}
    })
  };
  const store = createStore({api, storage: null});
  await store.refreshLive({source: 'SHV', includeDetails: false});
  const {match, finished} = store.state.live;
  assert.equal(match.away, 'Kadetten Schaffhausen');
  assert.equal(finished.home, 'HC Kriens-Luzern');
  assert.equal(involves(match), true, 'Live-Kachel und «Live dabei» erkennen das Spiel');
});
