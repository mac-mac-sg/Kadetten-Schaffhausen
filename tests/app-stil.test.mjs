import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {kpis} from '../src/kadetten/js/views/parts.js';
import {formCurve, smoothPath} from '../src/kadetten/js/views/team.js';
import {storyShell, storyHeadlineMixed, storyHeadline} from '../src/kadetten/js/views/story.js';

const doc = markup => parseHTML('<html><body>' + String(markup) + '</body></html>').document;
const OWN = 'Kadetten Schaffhausen';
const now = Date.parse('2027-03-20T12:00:00+01:00');

test('Kennzahl-Kacheln: erste orange, übrige Tinte und Papier, Unterzeile nur mit Inhalt', () => {
  const d = doc(
    kpis([
      [84, 'Tore', 'davon 23 vom 7-m-Punkt'],
      [14, 'Spiele'],
      ['6,0', 'Tore pro Spiel']
    ])
  );
  const tiles = [...d.querySelectorAll('.kz-t')];
  assert.deepEqual(
    tiles.map(t => t.className),
    ['kz-t hot', 'kz-t ink', 'kz-t paper']
  );
  assert.ok(d.querySelector('.kz.odd'), 'drei Werte: erste Kachel über die ganze Breite');
  assert.equal(tiles[0].querySelector('.v').textContent, '84');
  assert.equal(tiles[0].querySelector('.s').textContent, 'davon 23 vom 7-m-Punkt');
  assert.equal(tiles[1].querySelector('.s'), null);
  assert.equal(doc(kpis([[null, 'Tore']])).querySelector('.v').textContent, '–');
});

const g = (id, date, away) => ({id, date, time: '18:00', home: OWN, away, league: 'QHL', score: [30, 28]});
const rows = [
  {game: g('3', '2027-03-14', 'Pfadi Winterthur'), value: {goals: 8, shots: 10}},
  {game: g('2', '2027-03-07', 'HC Kriens-Luzern'), value: null},
  {game: g('1', '2027-02-28', 'Wacker Thun'), value: {goals: 5, shots: 9}}
];

test('Formkurve: älteste Partie links, jüngste gewählt, Spiele ohne Bericht nicht wählbar', () => {
  const d = doc(formCurve({rows, num: 'goals', den: 'shots', keeper: false, now}));
  const buttons = [...d.querySelectorAll('.fc-games button')];
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].getAttribute('data-ui'), 'formGame:1', 'älteste links');
  assert.ok(buttons[1].hasAttribute('disabled'), 'ohne Spielbericht');
  assert.equal(buttons[2].getAttribute('aria-pressed'), 'true', 'jüngstes Spiel vorgewählt');
  assert.match(d.querySelector('.fc-d').textContent, /8 Tore gegen Pfadi.* 8 von 10 Würfen/);
  assert.equal(d.querySelector('.fc-d a').getAttribute('href'), '#/spiel/3/bericht');
  assert.match(d.querySelector('svg').getAttribute('aria-label'), /^Tore je Spiel: Wacker Thun 5, Pfadi Winterthur 8$/);
  assert.equal(d.querySelectorAll('.fc-pt').length, 2);
  const pick = doc(formCurve({rows, num: 'goals', den: 'shots', keeper: false, now, sel: '1'}));
  assert.match(pick.querySelector('.fc-d').textContent, /5 Tore gegen Wacker Thun/);
  assert.equal(pick.querySelector('.fc-games button.on').getAttribute('data-ui'), 'formGame:1');
  const keeper = doc(
    formCurve({rows: [{game: rows[0].game, value: {saves: 1, keeperShots: 4}}], num: 'saves', den: 'keeperShots', keeper: true, now})
  );
  assert.match(keeper.querySelector('.fc-d').textContent, /1 Parade gegen Pfadi.* von 4 Würfen aufs Tor/);
  assert.equal(keeper.querySelector('.fc-line'), null, 'ein Punkt: keine Linie');
  assert.equal(String(formCurve({rows: [rows[1]], num: 'goals', den: 'shots', now})), '', 'ohne Werte keine Kurve');
});

test('Formkurve: glatte Linie läuft durch alle Punkte', () => {
  assert.equal(smoothPath([]), '');
  const d = smoothPath([
    [0, 10],
    [50, 0],
    [100, 20]
  ]);
  assert.match(d, /^M0 10 C/);
  assert.match(d, / 50 0 C/);
  assert.match(d, / 100 20$/);
});

test('Spiel-Story: Schlagzeile gemischt mit Wettbewerb als Marke, Fotokarte mit Korn', () => {
  const game = {
    id: '9',
    date: '2027-03-14',
    home: OWN,
    away: 'HC Kriens-Luzern',
    league: 'QHL',
    venue: 'BBC Arena, Schaffhausen',
    score: [34, 29]
  };
  const h = doc(storyHeadlineMixed(game)).querySelector('.rb-head');
  assert.deepEqual(
    [...h.querySelectorAll('b')].map(b => b.textContent),
    ['Sieg', 'BBC Arena']
  );
  assert.equal(h.querySelector('.rb-tag').textContent, 'QHL');
  assert.equal(h.textContent.replace(/\s+/g, ' ').trim(), 'Der Sieg QHL in der BBC Arena');
  assert.equal(storyHeadline(game), 'Der Sieg in der BBC Arena');
  const slides = [
    {id: 'a', body: 'Eins', photo: 'assets/players/10.webp'},
    {id: 'b', body: 'Zwei'}
  ];
  const first = doc(storyShell({slides, step: 0, close: '#/', closeLabel: 'Zu'}));
  assert.ok(first.querySelector('.rb.rb-ph'));
  assert.equal(first.querySelector('img.rb-photo').getAttribute('src'), 'assets/players/10.webp');
  assert.equal(first.querySelector('img.rb-photo').getAttribute('alt'), '', 'Bild ist Schmuck');
  assert.ok(first.querySelector('.rb-grain[aria-hidden="true"]'));
  const second = doc(storyShell({slides, step: 1, close: '#/', closeLabel: 'Zu'}));
  assert.ok(!second.querySelector('.rb-photo') && second.querySelector('.rb.rb-bk'), 'andere Karten wie bisher');
});
