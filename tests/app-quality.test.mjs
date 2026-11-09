import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {dataFreshness, OWN_TEAM} from '../src/kadetten/js/logic.js';
import {createNavigation} from '../src/kadetten/js/router.js';
import {moments} from '../src/kadetten/js/moments.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderJetzt} from '../src/kadetten/js/views/jetzt.js';
import {renderSaison} from '../src/kadetten/js/views/saison.js';

const now = Date.parse('2026-11-06T10:00:00Z');
const game = {id: 'next', date: '2026-11-11', time: '19:15', league: 'QHL', home: OWN_TEAM, away: 'HSC Suhr Aarau'};
const previous = {...game, id: 'old', date: '2026-10-24', score: [30, 20]};
const cup = {...previous, id: 'cup', date: '2026-10-31', league: 'Mobiliar-Cup M', score: [20, 30]};
const data = {checkedAt: '2026-11-06T08:20:00Z', games: [previous, cup, game], tables: {QHL: [['Leader', 10, 300, 200, 22], [OWN_TEAM, 12, 400, 300, 21]]}, stories: [], playerSeason: {players: {1: {shvPlayerId: 7, games: 12, goals: 0}}}};
const ctx = {now, state: {data}, ui: {}, load: () => ({status: 'error'}), api: {}};
const dom = value => parseHTML('<html><body>' + String(value) + '</body></html>').document;

test('Datenfrische bewertet Quelldatum statt Empfang; Nachtfenster, Alter, Zukunft und unbekannter Stand', () => {
  assert.equal(dataFreshness(data, now).stale, false);
  const partial = dataFreshness({...data, status: {players: {ok: false, updatedAt: '2026-10-31T20:20:00Z'}}}, now);
  assert.equal(partial.stale, true); assert.match(partial.message, /Spielerwerte/);
  assert.match(partial.sources[0].label, /31.10.2026/);
  assert.match(dataFreshness(data, now).label, /09:20/);
  assert.equal(dataFreshness({checkedAt: '2026-11-05T21:20:00Z'}, Date.parse('2026-11-06T05:00:00Z')).stale, false);
  for (const value of [undefined, null, '', 'ungültig', '2026-11-07T08:00:00Z', '2026-11-05T08:00:00Z']) assert.equal(dataFreshness({checkedAt: value}, now).stale, true);
});

test('Zurück aus Spiel und Spiellaschen erreicht Ursprung mit Scrollposition; Browser vor/zurück und neue Abzweigung', () => {
  const nav = createNavigation('test');
  const visit = (hash, id, y) => {const prev = nav.current; const entry = nav.enter(hash, id, y); if (!entry.restore) nav.setDepth((prev?.depth ?? -1) + 1); return entry;};
  const plan = visit('#/saison');
  visit('#/spiel/next', null, 640);
  visit('#/spiel/next/bericht', null, 30);
  assert.equal(nav.backTarget(), '#/saison'); assert.equal(nav.backDistance(), 2);
  assert.equal(visit('#/saison', plan.id, 50).scroll, 640);
  const profile = visit('#/team/1', null, 640);
  visit('#/spiel/old/bericht', null, 375);
  assert.equal(nav.backTarget(), '#/team/1'); assert.equal(nav.backDistance(), 1);
  assert.equal(visit('#/team/1', profile.id, 20).scroll, 375);
  assert.equal(visit('#/spiel/next', null, 375).restore, false);
  assert.equal(nav.backDistance(), 1);
  const direct = createNavigation('other'); direct.enter('#/spiel/next', null, 0);
  assert.equal(direct.backTarget(), null);
  assert.notEqual(direct.current.id, plan.id, 'keine Kollision mit History-Einträgen früherer Sitzungen');
});

test('Vorschau zeigt QHL-Form ohne Cup-Niederlage; Tipp folgt nach Ausgangslage und Zurück erhält Herkunft', () => {
  const out = dom(renderSpiel({...ctx, route: {id: 'next'}, ui: {backTarget: '#/saison'}}));
  const sections = [...out.querySelectorAll('section')];
  assert.ok(sections.findIndex(s => s.textContent.includes('Ausgangslage')) < sections.findIndex(s => s.textContent.includes('Dein Tipp')));
  const form = out.querySelector('[aria-labelledby="g-lage"]');
  assert.equal(form.querySelector('[role="img"]').getAttribute('aria-label'), 'Form: Sieg');
  assert.doesNotMatch(form.textContent, /neuestes zuerst/, 'keine erklärenden Sätze');
  assert.equal(out.querySelector('[data-route-back]').getAttribute('href'), '#/saison');
});

test('Torhüter eröffnet mit Fangquote und Paraden, weist drei fehlende Berichte aus und priorisiert keine Tore', () => {
  const games = Array.from({length: 5}, (_, i) => ({...previous, id: String(i), date: `2026-10-${20 + i}`}));
  const load = key => ({status: 'ready', value: {shv: {gameId: Number(key.split(':')[1]), score: [30, 20], teams: [{name: OWN_TEAM, players: [{id: 7, keeper: true, saves: 10, keeperShots: 25}]}, {name: 'HSC Suhr Aarau', players: []}]}}});
  const output = String(renderSpieler({...ctx, route: {id: '1'}, state: {data: {...data, games}}, load: (key) => ['0','1'].includes(key.split(':')[1]) ? load(key) : {status: 'error'}}));
  assert.ok(output.indexOf('Fangquote · letzte QHL-Spiele') < output.indexOf('Saison 2026/27 · QHL'));
  assert.match(output, /40 %/); assert.match(output, /Aus 2 von 5 Spielberichten/);
  const season = dom(output).querySelector('[aria-labelledby="sp-saison"]');
  assert.doesNotMatch(season.textContent, /Tore/);
});

test('Startseite beschränkt Momente auf zwei; Szenarien berücksichtigen Punktgleichheit ohne feste Rangzusage', () => {
  const all = moments({data, now, squad: [], history: []});
  assert.match(all.find(m => m.id === 'scenario').text, /aktuellen Tabellenstand/);
  assert.doesNotMatch(all.find(m => m.id === 'scenario').text, /unabhängig|mindestens/);
  const tied = moments({data: {...data, tables: {QHL: [['Leader', 10, 300, 200, 23], data.tables.QHL[1]]}}, now, squad: [], history: []});
  assert.match(tied.find(m => m.id === 'scenario').text, /Punktgleichheit/);
  assert.ok(dom(renderJetzt(ctx)).querySelectorAll('.moment').length <= 2);
  const plan = dom(renderSaison({...ctx, route: {view: 'spielplan'}}));
  assert.equal(plan.querySelectorAll('[data-next-game]').length, 1);
  assert.equal(plan.querySelector('[data-next-game] a').getAttribute('href'), '#/spiel/next');
});
