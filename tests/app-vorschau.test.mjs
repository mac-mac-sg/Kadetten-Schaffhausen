import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {streak, duelRecord, leadStory, travelInfo} from '../src/kadetten/js/vorschau.js';
import {routeFor, distanceKm, HOME} from '../src/kadetten/js/reise.js';
import {reiseBlock} from '../src/kadetten/js/views/vorschau.js';
import {leadBlock, cupStakes, anreiseBlock} from '../src/kadetten/js/views/vorschau.js';
import {standings} from '../src/kadetten/js/logic.js';

const doc = markup => parseHTML('<html><body>' + String(markup) + '</body></html>').document;
const table = standings([
  ['HC Kriens-Luzern', 8, 260, 214, 14],
  ['Kadetten Schaffhausen', 8, 262, 232, 13],
  ['Pfadi Winterthur', 8, 250, 234, 12],
  ['BSV Bern', 8, 219, 207, 7]
]);
const row = name => table.find(r => r.team === name);
const OWN = 'Kadetten Schaffhausen';
const game = (home, away, league = 'QHL', extra = {}) => ({
  id: 1,
  date: '2026-12-05',
  time: '18:00',
  home,
  away,
  league,
  venue: 'BBC Arena, Schaffhausen',
  ...extra
});

test('Serie und Direktduelle aus den Daten', () => {
  assert.deepEqual(streak(['S', 'S', 'S', 'N', 'S']), {kind: 'S', n: 3});
  assert.deepEqual(streak(['N', 'N', 'S']), {kind: 'N', n: 2});
  assert.deepEqual(streak([]), {kind: null, n: 0});
  const duels = [
    {home: OWN, away: 'Pfadi Winterthur', score: [30, 28]},
    {home: 'Pfadi Winterthur', away: OWN, score: [26, 31]},
    {home: OWN, away: 'Pfadi Winterthur', score: [27, 27]},
    {home: 'Pfadi Winterthur', away: OWN, score: null}
  ];
  assert.deepEqual(duelRecord(duels), {n: 3, w: 2, d: 1, l: 0});
});

test('Aufmacher: Einsatz vor Serie vor Duell vor Standard', () => {
  const base = {table, ownForm: [], duels: []};
  // Platz 2 gegen Platz 1: Spitzenspiel
  const top = leadStory({...base, game: game('HC Kriens-Luzern', OWN), own: row(OWN), opp: row('HC Kriens-Luzern')});
  assert.equal(top.headline, 'Spitzenspiel: Platz 2 gegen Platz 1.');
  // Sieg bringt Tabellenspitze (13 + 2 > 14)
  const first = leadStory({...base, game: game(OWN, 'BSV Bern'), own: row(OWN), opp: row('BSV Bern')});
  assert.equal(first.headline, 'Ein Sieg bringt die Kadetten an die Tabellenspitze.');
  // Serie, wenn kein Einsatz (Kadetten weit hinten)
  const far = standings([
    ['A', 8, 1, 1, 20],
    ['B', 8, 1, 1, 18],
    ['C', 8, 1, 1, 16],
    [OWN, 8, 1, 1, 10],
    ['D', 8, 1, 1, 5]
  ]);
  const f = r => far.find(x => x.team === r);
  const serie = leadStory({game: game(OWN, 'D'), table: far, own: f(OWN), opp: f('D'), ownForm: ['S', 'S', 'S', 'N']});
  assert.equal(serie.headline, '3 Siege in Folge: Die Kadetten kommen mit Rückenwind.');
  assert.equal(serie.facts[0].hot, true);
  const lose = leadStory({game: game(OWN, 'D'), table: far, own: f(OWN), opp: f('D'), ownForm: ['N', 'N', 'S']});
  assert.equal(lose.headline, 'Nach 2 Niederlagen in Folge wollen die Kadetten die Wende.');
  const duels = [1, 2, 3].map(() => ({home: OWN, away: 'D', score: [30, 20]}));
  const duel = leadStory({game: game(OWN, 'D'), table: far, own: f(OWN), opp: f('D'), ownForm: ['S', 'N'], duels});
  assert.equal(duel.headline, 'Gegen D gewannen die Kadetten die letzten 3 Duelle.');
  assert.ok(duel.facts.some(x => x.text === 'Duelle 3:0'));
  const plain = leadStory({game: game(OWN, 'D'), table: far, own: f(OWN), opp: f('D'), ownForm: ['S', 'N']});
  assert.equal(plain.headline, 'Platz 4 gegen Platz 5.');
  assert.equal(plain.kicker, 'Vorschau');
});

test('Aufmacher: Cup, kein Aufmacher bei EHL, Testspiel oder gespieltem Spiel', () => {
  const cup = game('HC Kriens-Luzern', OWN, 'Mobiliar-Cup M');
  const c = leadStory({game: cup, table, own: row(OWN), opp: row('HC Kriens-Luzern'), score: {win: 0.28, draw: 0, loss: 0.72}});
  assert.equal(c.headline, 'Wer gewinnt, steht in der nächsten Runde.');
  assert.equal(c.kicker, 'Vorschau · Cup');
  assert.deepEqual(
    c.facts.map(x => x.text),
    ['Weiterkommen 28 %', 'Heim: Kriens-Luzern']
  );
  const noOpp = leadStory({game: game('SG Yellow', OWN, 'Mobiliar-Cup M'), table, own: row(OWN)});
  assert.equal(noOpp.headline, 'Wer gewinnt, steht in der nächsten Runde.', 'auch gegen Teams aus tieferen Ligen');
  assert.equal(leadStory({game: game(OWN, 'X', 'EHL'), table}), null);
  assert.equal(leadStory({game: game(OWN, 'X', 'Falkencup'), table}), null);
  assert.equal(leadStory({game: game(OWN, 'BSV Bern', 'QHL', {score: [30, 20]}), table, own: row(OWN), opp: row('BSV Bern')}), null);
});

test('Anreise nur bei Auswärtsspielen in der Schweiz, mit Karten-Links', () => {
  const away = game('HC Kriens-Luzern', OWN, 'Mobiliar-Cup M', {venue: 'Kriens Pilatus Arena, Kriens'});
  const t = travelInfo(away);
  assert.deepEqual([t.name, t.place], ['Pilatus Arena', 'Kriens']);
  assert.match(
    t.route,
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=Kriens%20Pilatus%20Arena%2C%20Kriens&travelmode=driving$/
  );
  assert.match(t.transit, /travelmode=transit$/);
  assert.equal(travelInfo(game(OWN, 'X')), null, 'Heimspiel');
  assert.equal(travelInfo({...away, league: 'EHL'}), null, 'Europacup');
  assert.equal(travelInfo({...away, score: [20, 25]}), null, 'schon gespielt');
  assert.equal(travelInfo({...away, venue: ''}), null);
});

test('Reise: Luftlinie, Karte je nach Ort, nichts bei Heimspiel, Resultat oder unbekanntem Ort', () => {
  const thun = routeFor(game('Wacker Thun', OWN, 'QHL', {venue: 'Thun Lachen, Thun'}));
  assert.deepEqual([thun.kind, thun.name, thun.km], ['ch', 'Thun', 129]);
  const euro = routeFor(game('CSM Bucuresti', OWN, 'EHL', {venue: 'Sala Polivalenta, București'}));
  assert.deepEqual([euro.kind, euro.name, euro.km], ['eu', 'Bukarest', 1393]);
  assert.equal(routeFor(game('Chambery Savoie Mont Blanc HB', OWN, 'EHL', {venue: 'Le Phare, Chambéry'})).km, 314);
  assert.equal(routeFor(game(OWN, 'X', 'QHL', {venue: 'BBC Arena, Schaffhausen'})), null, 'Heimspiel');
  assert.equal(routeFor(game('Wacker Thun', OWN, 'QHL', {venue: 'Thun Lachen, Thun', score: [20, 25]})), null, 'schon gespielt');
  assert.equal(routeFor(game('X', OWN, 'QHL', {venue: 'Halle, Nirgendwo'})), null, 'unbekannter Ort');
  assert.equal(routeFor(game('X', OWN, 'QHL', {venue: ''})), null);
  assert.equal(distanceKm(HOME, HOME), 0);
  for (const r of [thun, euro]) assert.match(r.path, /^M[-\d. ]+Q[-\d. ]+ [-\d. ]+ [-\d. ]+$/);
  const thunGame = game('Wacker Thun', OWN, 'QHL', {venue: 'Thun Lachen, Thun'});
  const out = String(reiseBlock(thun, {game: thunGame, travel: travelInfo(thunGame)}));
  assert.match(out, /Die Reise[\s\S]*Lachen[\s\S]*129[\s\S]*Route planen[\s\S]*ÖV-Verbindung/);
  assert.doesNotMatch(out, /In Karten öffnen/, 'mit bekannter Anreise Route und ÖV statt Kartenlink');
  assert.match(out, /animateMotion/, 'Linie und Punkt bewegen sich');
  assert.doesNotMatch(out, /style=/, 'keine Stilattribute');
  assert.doesNotMatch(out.match(/<svg class="rz-map"[\s\S]*?<\/svg>/)[0], /https?:\/\//, 'Karte ohne externe Adressen');
  const euroGame = game('CSM Bucuresti', OWN, 'EHL', {venue: 'Sala Polivalenta, București'});
  const dark = String(reiseBlock(euro, {game: euroGame, travel: travelInfo(euroGame)}));
  assert.match(dark, /rz-dots[\s\S]*Sala Polivalenta[\s\S]*1393[\s\S]*In Karten öffnen/);
  assert.doesNotMatch(dark, /Route planen/, 'Europacup ohne Route und ÖV');
  assert.equal(reiseBlock(null), '');
  assert.equal(reiseBlock(thun, {game: {}}), '');
});

test('Ansicht: Aufmacher mit Marken, Cup-Einsatz ohne Remis, Anreise mit sicheren Links', () => {
  const lead = doc(
    leadBlock({
      kicker: 'Vorschau · Cup',
      headline: 'Wer gewinnt, steht in der nächsten Runde.',
      facts: [{text: '2 Siege in Folge', hot: true}, {text: 'Weiterkommen 28 %'}]
    })
  );
  assert.equal(lead.querySelector('h2').textContent, 'Wer gewinnt, steht in der nächsten Runde.');
  assert.deepEqual(
    [...lead.querySelectorAll('.lead-fact')].map(x => x.className),
    ['lead-fact hot', 'lead-fact']
  );
  assert.equal(String(leadBlock(null)), '');
  const stakes = doc(cupStakes());
  assert.deepEqual(
    [...stakes.querySelectorAll('.kz-t .v')].map(x => x.textContent),
    ['Weiter', 'Aus']
  );
  assert.match(stakes.body.textContent, /Kein Remis/);
  const anr = doc(anreiseBlock(travelInfo(game('HC Kriens-Luzern', OWN, 'Mobiliar-Cup M', {venue: 'Kriens Pilatus Arena, Kriens'}))));
  const links = [...anr.querySelectorAll('a')];
  assert.equal(links.length, 2);
  assert.ok(
    links.every(
      a =>
        a.getAttribute('target') === '_blank' &&
        /noopener/.test(a.getAttribute('rel')) &&
        a.getAttribute('href').startsWith('https://www.google.com/maps/dir/')
    )
  );
  assert.equal(String(anreiseBlock(null)), '');
});
