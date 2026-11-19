import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {personalCards, nextAfter} from '../src/kadetten/js/kurz.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {parseRoute} from '../src/kadetten/js/router.js';

const OWN = 'Kadetten Schaffhausen';
const g = (id, date, home, away, score) => ({id, date, time: '18:00', home, away, league: 'QHL', venue: 'BBC Arena, Schaffhausen', ...(score ? {score} : {})});
const games = [
  g('1', '2027-03-07', OWN, 'Pfadi Winterthur', [30, 28]),
  g('2', '2027-03-14', OWN, 'HC Kriens-Luzern', [34, 29]),
  g('3', '2027-03-18', 'Pfadi Winterthur', OWN)
];
const now = Date.parse('2027-03-15T09:00:00+01:00');
const report = {teams: [{players: [{number: 22, name: 'Perić Josip', goals: 4, shots: 6, seven: 1}]}, {players: []}]};

test('Spieltag: persönliche Karten nur mit Daten', () => {
  assert.deepEqual(personalCards({game: games[1], now, games}), []);
  const cards = personalCards({game: games[1], report, favourite: 22, tips: {1: [30, 28], 2: [33, 29]}, visited: ['1', '2'], games, now});
  assert.deepEqual(
    cards.map(c => c.id),
    ['spieler', 'tipp', 'halle']
  );
  assert.match(cards[0].text, /4 Tore aus 6 Würfen, davon 1 vom 7-m-Punkt/);
  assert.equal(cards[1].figure, '33:29');
  assert.equal(cards[1].title, 'Richtiger Sieger');
  assert.match(cards[1].text, /1 Punkt\. Saison bisher: 4 Punkte/);
  assert.equal(cards[1].badge, '+1 Sammelkarte');
  assert.equal(cards[2].figure, '2.');
  assert.match(cards[2].text, /2 Siege aus 2 Spielen/);
  const away = personalCards({game: {...games[1], home: 'HC Kriens-Luzern', away: OWN, score: [29, 34]}, visited: ['2'], games, now});
  assert.equal(away.length, 0, 'Hallenbesuch nur bei Heimspielen');
  assert.equal(nextAfter(games, games[1], now).id, '3');
  assert.equal(nextAfter(games.slice(0, 2), games[1], now), null);
});

test('Spieltag in Karten: Geschichte mit Balken, Schliessen zum Spiel, letzte Karte mit Tipp und Teilen', () => {
  const route = parseRoute('#/spiel/2/kurz');
  const render = step =>
    parseHTML(
      '<html><body>' +
        String(renderSpiel({route, state: {data: {games, tables: {}}, live: null}, now, load: () => ({status: 'loading'}), api: {}, ui: {rbStep: step}})) +
        '</body></html>'
    ).document;
  const first = render(0);
  assert.ok(first.querySelector('.rb'));
  assert.equal(first.querySelector('.rb-close').getAttribute('href'), '#/spiel/2/bericht');
  assert.match(first.querySelector('.rb-slide').textContent, /34:29/);
  const last = render(99);
  assert.equal(last.querySelector('.rb-slide').getAttribute('data-rb-id'), 'weiter');
  assert.ok(last.querySelector('a[href="#/spiel/3"]'), 'Jetzt tippen fürs nächste Spiel');
  assert.ok(last.querySelector('[data-share-image="2"]'));
});
