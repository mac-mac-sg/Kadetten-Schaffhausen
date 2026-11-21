import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gewinnscore, liveScore, chances, formValue, elapsed, percents, priorOf, strength} from '../src/kadetten/js/gewinnscore.js';
import {gewinnCard, gewinnLive} from '../src/kadetten/js/views/gewinnscore.js';

const row = (team, played, gf, ga) => ({team, played, goalsFor: gf, goalsAgainst: ga, points: 0});
const home = {id: 1, league: 'QHL', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern'};

test('chances: erwartete Differenz 1,5 bei Streuung 4,5 wie in der Prüfrechnung', () => {
  const c = chances(1.5);
  assert.equal(Math.round(c.win * 100), 59);
  assert.equal(Math.round(c.draw * 100), 8);
  assert.ok(Math.abs(c.win + c.draw + c.loss - 1) < 1e-9);
  assert.deepEqual(chances(2, 0), {win: 1, draw: 0, loss: 0});
});

test('Stärke zieht zu Saisonbeginn zur Vorsaison', () => {
  assert.equal(priorOf('TSV Kadetten Schaffhausen'), 4);
  assert.equal(priorOf('Aufsteiger'), 0);
  assert.equal(strength(row('Kadetten Schaffhausen', 0, 0, 0)), 8);
  assert.equal(strength(row('Kadetten Schaffhausen', 3, 90, 90)), 4);
});

test('Form zählt erst ab drei Spielen', () => {
  assert.equal(formValue(['S', 'S']), 0);
  assert.equal(formValue(['S', 'S', 'S', 'S', 'S']), 1);
  assert.equal(formValue(['N', 'N', 'N']), -1);
  assert.equal(formValue(['S', 'U', 'N']), 0);
});

test('gewinnscore: nur QHL und ab drei Spielen; Heimvorteil wechselt die Seite', () => {
  const own = row('Kadetten Schaffhausen', 10, 320, 280),
    opp = row('HC Kriens-Luzern', 10, 310, 290);
  assert.equal(gewinnscore({game: {...home, league: 'EHL'}, own, opp}), null);
  assert.equal(gewinnscore({game: home, own: row('Kadetten Schaffhausen', 2, 60, 50), opp}), null);
  const h = gewinnscore({game: home, own, opp}),
    a = gewinnscore({game: {...home, home: home.away, away: home.home}, own, opp});
  assert.equal(h.home, 1.5);
  assert.equal(a.home, -1.5);
  assert.ok(Math.abs(h.margin - a.margin - 3) < 1e-9);
  assert.ok(h.win > a.win);
});

test('elapsed liest Spieluhr und Halbzeit', () => {
  assert.equal(elapsed({clock: '42:30'}), 42.5);
  assert.equal(elapsed({clock: '61:00'}), 60);
  assert.equal(elapsed({phase: 'Halbzeit'}), 30);
  assert.equal(elapsed({phase: '2. Halbzeit'}), null);
  assert.equal(elapsed({}), null);
});

test('liveScore: Vorsprung zählt, am Schluss steht das Resultat fest', () => {
  const pre = {margin: 1.5, win: 0.59, draw: 0.08, loss: 0.33};
  const mid = liveScore(pre, {score: [21, 18], clock: '42:00'}, home);
  assert.equal(Math.round(mid.win * 100), 88);
  const away = liveScore(pre, {score: [21, 18], clock: '42:00'}, {...home, home: home.away, away: home.home});
  assert.ok(away.win > 0.05 && away.win < 0.15);
  assert.equal(away.lead, -3);
  assert.equal(liveScore(pre, {score: [30, 29], clock: '60:00'}, home).win, 1);
  assert.equal(liveScore(pre, {score: null, clock: '10:00'}, home), null);
  assert.equal(liveScore(null, {score: [1, 0], clock: '10:00'}, home), null);
});

test('percents ergeben zusammen 100', () => {
  assert.deepEqual(percents({win: 0.333, draw: 0.333, loss: 0.334}), [33, 33, 34]);
  assert.equal(
    percents(chances(0.7)).reduce((a, b) => a + b),
    100
  );
});

test('Karten zeigen Siegchance, Gründe und Veränderung seit Anpfiff', () => {
  const own = row('Kadetten Schaffhausen', 10, 320, 280),
    opp = row('HC Kriens-Luzern', 10, 310, 290);
  const score = {
    ...gewinnscore({game: home, own, opp, ownForm: ['S', 'S', 'S', 'N', 'S'], oppForm: ['S', 'N', 'S']}),
    opponent: home.away,
    ownForm: ['S', 'S', 'S', 'N', 'S'],
    oppForm: ['S', 'N', 'S']
  };
  const card = String(gewinnCard(score));
  assert.match(card, /Kadetten-Gewinnscore/);
  assert.match(card, /Siegchance/);
  assert.match(card, /Kadetten \+1,5 Tore/);
  assert.match(card, /8 zu 4/);
  assert.equal(String(gewinnCard(null)), '');
  const live = String(gewinnLive(score, {score: [21, 18], clock: '42:00'}, home));
  assert.match(live, /seit Anpfiff/);
  assert.equal(String(gewinnLive(score, {score: [21, 18]}, home)), '');
});

test('Schweizer Cup zwischen QHL-Teams: Heimvorteil 2 Tore, kein Remis, Weiterkommen', async () => {
  const {isSwissCup, isScored, advance, MODEL} = await import('../src/kadetten/js/gewinnscore.js');
  const own = row('Kadetten Schaffhausen', 10, 320, 280),
    opp = row('HC Kriens-Luzern', 10, 310, 290);
  const cup = {id: 2, league: 'Mobiliar-Cup M', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern'};
  assert.equal(isSwissCup(cup), true);
  assert.equal(isSwissCup({league: 'Falkencup'}), false, 'andere Turniere nicht');
  assert.equal(isScored(cup) && isScored(home), true);
  assert.equal(isScored({league: 'EHL'}), false);
  const c = gewinnscore({game: cup, own, opp}),
    q = gewinnscore({game: home, own, opp});
  assert.equal(c.cup, true);
  assert.equal(c.home, MODEL.cupHome);
  assert.equal(c.draw, 0);
  assert.ok(Math.abs(c.win + c.loss - 1) < 1e-9);
  assert.ok(c.win > q.win, 'grösserer Heimvorteil, Remis-Anteil kommt dazu');
  assert.deepEqual(percents(c).map(Number).length, 3);
  assert.equal(percents(c)[1], 0);
  const away = gewinnscore({game: {...cup, home: cup.away, away: cup.home}, own, opp});
  assert.equal(away.home, -MODEL.cupHome);
  assert.deepEqual(advance({win: 0.5, draw: 0.2, loss: 0.3}), {win: 0.6, draw: 0, loss: 0.4});
  // Ohne QHL-Tabellenzeile des Gegners (Team aus tieferer Liga) kein Score.
  assert.equal(gewinnscore({game: cup, own, opp: null}), null);
  // Live: nach 60 Minuten Gleichstand = je 50 %, Vorsprung entscheidet.
  const live = liveScore(c, {score: [30, 30], clock: '60:00'}, cup);
  assert.equal(live.cup, true);
  assert.equal(Math.round(live.win * 100), 50);
  assert.equal(liveScore(c, {score: [31, 30], clock: '60:00'}, cup).win, 1);
});

test('Cup-Karte: «Weiterkommen» ohne Remis, Heimvorteil und Verlängerung erklärt', () => {
  const own = row('Kadetten Schaffhausen', 10, 320, 280),
    opp = row('HC Kriens-Luzern', 10, 310, 290);
  const cup = {id: 2, league: 'Mobiliar-Cup M', home: 'HC Kriens-Luzern', away: 'Kadetten Schaffhausen'};
  const score = {...gewinnscore({game: cup, own, opp}), opponent: 'HC Kriens-Luzern', ownForm: [], oppForm: []};
  const html = String(gewinnCard(score));
  assert.match(html, /Weiterkommen/);
  assert.doesNotMatch(html, /Remis \d+ %/);
  assert.doesNotMatch(html, /Siegchance/);
  assert.match(html, /Kriens-Luzern \+2 Tore/);
  assert.match(html, /Verlängerung/);
  assert.match(html, /Weiterkommen \d+ %, Ausscheiden \d+ %/);
  const pre = {...score};
  const live = String(gewinnLive(pre, {score: [10, 12], clock: '30:00'}, cup));
  assert.match(live, /Weiterkommen/);
  assert.doesNotMatch(live, /Siegchance/);
  const league = String(gewinnCard({...gewinnscore({game: home, own, opp}), opponent: 'HC Kriens-Luzern', ownForm: [], oppForm: []}));
  assert.match(league, /Siegchance/);
  assert.match(league, /Remis \d+ %/);
});
