import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {matchImageModel} from '../src/kadetten/js/share-image.js';

const game = {
  league: 'Mobiliar-Cup M',
  date: '2026-11-21',
  home: 'HC Kriens-Luzern',
  away: 'Kadetten Schaffhausen',
  homeShort: 'Kriens-Luzern',
  awayShort: 'Kadetten',
  score: [26, 33]
};

test('Story-Bild: Endstand mit Stempel, Halbzeit und Spielstand mit Minute', () => {
  const end = matchImageModel({kind: 'end', game, outcome: 'S'});
  assert.deepEqual([end.label, end.stamp, end.result], ['Endstand', 'Weiter im Cup!', null]);
  assert.match(end.tag, /^Mobiliar-Cup M · /);
  assert.deepEqual([end.home.name, end.home.own, end.away.name, end.away.own], ['Kriens-Luzern', false, 'Kadetten', true]);
  assert.equal(matchImageModel({kind: 'end', game: {...game, league: 'QHL'}, outcome: 'S'}).stamp, 'Sieg!');
  const lost = matchImageModel({kind: 'end', game, outcome: 'N'});
  assert.deepEqual([lost.stamp, lost.result], [null, 'Niederlage']);
  assert.equal(matchImageModel({kind: 'end', game, outcome: 'U'}).result, 'Unentschieden');
  const half = matchImageModel({kind: 'half', game: {...game, score: [9, 19]}, outcome: 'S'});
  assert.deepEqual([half.label, half.stamp, half.result, half.minute], ['Halbzeit', null, null, null], 'kein Stempel vor dem Ende');
  const live = matchImageModel({kind: 'live', game: {...game, score: [12, 24]}, minute: 36.7});
  assert.deepEqual([live.label, live.minute], ['Spielstand', 36]);
  assert.equal(matchImageModel({kind: 'live', game, minute: null}).minute, null, 'ohne Spieluhr keine Minute');
});

test('Story-Bild: ohne gültigen Spielstand oder mit unbekannter Art kein Bild', () => {
  assert.equal(matchImageModel({kind: 'end', game: {...game, score: null}}), null);
  assert.equal(matchImageModel({kind: 'end', game: {...game, score: [1]}}), null);
  assert.equal(matchImageModel({kind: 'end', game: {...game, score: ['a', 2]}}), null);
  assert.equal(matchImageModel({kind: 'zeitlupe', game}), null);
  assert.equal(matchImageModel({kind: 'end', game: null}), null);
});

test('Live-Reiter: Knopf «Spielstand teilen» bzw. «Halbzeitstand teilen» nur mit gültigem Spielstand', async () => {
  const {renderSpiel} = await import('../src/kadetten/js/views/spiel.js');
  const {parseRoute} = await import('../src/kadetten/js/router.js');
  const games = [
    {
      id: '5',
      date: '2027-03-14',
      time: '18:00',
      home: 'Kadetten Schaffhausen',
      away: 'Pfadi Winterthur',
      league: 'QHL',
      venue: 'BBC Arena, Schaffhausen'
    }
  ];
  const render = match => {
    const html = String(
      renderSpiel({
        route: parseRoute('#/spiel/5/live'),
        state: {data: {games, tables: {}}, live: {match}},
        now: Date.parse('2027-03-14T18:20:00+01:00'),
        load: () => ({status: 'loading'}),
        api: {},
        ui: {}
      })
    );
    return parseHTML('<html><body>' + html + '</body></html>').document;
  };
  const base = {
    id: 5,
    home: 'Kadetten Schaffhausen',
    away: 'Pfadi Winterthur',
    league: 'QHL',
    clock: '12:00',
    details: {ok: true, events: []}
  };
  assert.equal(
    render({...base, score: [5, 4], phase: '1. Halbzeit'})
      .querySelector('[data-share-live]')
      .textContent.trim(),
    'Spielstand teilen'
  );
  assert.equal(
    render({...base, score: [14, 12], phase: 'Halbzeit'})
      .querySelector('[data-share-live]')
      .textContent.trim(),
    'Halbzeitstand teilen'
  );
  assert.equal(render({...base, score: null}).querySelector('[data-share-live]'), null);
});
