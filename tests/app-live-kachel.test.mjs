import test from 'node:test';
import assert from 'node:assert/strict';
import {liveTile, renderLiveTile} from '../src/kadetten/js/views/live-kachel.js';

const OWN = 'Kadetten Schaffhausen';
const live = score => ({match: {id: 7, home: OWN, away: 'Pfadi Winterthur', score, phase: '1. Halbzeit', clock: "32'"}});
const state = (score = [17, 15]) => ({data: {games: []}, live: live(score)});
const now = Date.now();

test('Live-Kachel: erscheint auf Spiele, nicht auf Titelseite und nicht im eigenen Spiel', () => {
  assert.ok(liveTile({state: state(), route: {area: 'saison', view: 'spielplan'}, now}));
  assert.equal(liveTile({state: state(), route: {area: 'jetzt', view: 'jetzt'}, now}), null);
  assert.equal(liveTile({state: state(), route: {area: 'saison', view: 'spiel', id: '7'}, now}), null);
  assert.ok(liveTile({state: state(), route: {area: 'saison', view: 'spiel', id: '99'}, now}));
  assert.equal(liveTile({state: state(), route: {area: null, view: 'wissen'}, now}), null);
  assert.equal(liveTile({state: {data: null, live: null}, route: {area: 'team', view: 'team'}, now}), null);
});

test('Live-Kachel: zeigt Stand, Minute und führt zur Live-Ansicht', () => {
  const out = String(renderLiveTile(liveTile({state: state([3, 2]), route: {area: 'team', view: 'team'}, now})));
  assert.match(out, /3 : 2/);
  assert.match(out, /1\. Halbzeit · 32&#39;|1\. Halbzeit · 32'/);
  assert.match(out, /href="#\/spiel\/7\/live"/);
  assert.match(out, /aria-label="Live: /);
});

test('Live-Kachel: Tor der Kadetten wird kurz hervorgehoben', () => {
  const route = {area: 'team', view: 'team'};
  liveTile({state: state([4, 4]), route, now});
  const goal = liveTile({state: state([5, 4]), route, now: now + 1000});
  assert.equal(goal.goal, true);
  assert.match(String(renderLiveTile(goal)), /Tor Kadetten/);
  assert.equal(liveTile({state: state([5, 4]), route, now: now + 60000}).goal, false);
});

test('Live-Kachel: Spiel anderer Mannschaften zeigt keine Kachel', () => {
  const other = {data: {games: []}, live: {match: {id: 9, home: 'BSV Bern', away: 'Wacker Thun', score: [1, 0]}}};
  assert.equal(liveTile({state: other, route: {area: 'team', view: 'team'}, now}), null);
});
