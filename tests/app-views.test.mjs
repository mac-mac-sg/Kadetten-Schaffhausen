// Baut alle Ansichten mit dem mitgelieferten Datenstand in verschiedenen Zuständen und prüft auf Vorlagenfehler.
// Ersetzt keinen Blick im Browser (siehe AGENTS.md), fängt aber kaputte Vorlagen und fehlende Werte ab.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRoute} from '../src/kadetten/js/router.js';
import {decodeDeep} from '../src/kadetten/js/text.js';
import {setLogos, nav} from '../src/kadetten/js/views/parts.js';
import {renderJetzt, renderNews} from '../src/kadetten/js/views/jetzt.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {renderSaison} from '../src/kadetten/js/views/saison.js';
import {renderTeam, renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderVerein} from '../src/kadetten/js/views/verein.js';
import {renderIch} from '../src/kadetten/js/views/ich.js';
import {renderArtikel} from '../src/kadetten/js/views/artikel.js';

const data = decodeDeep(JSON.parse(readFileSync('server/seed.json', 'utf8')));
data.playerSeason = {season: '2026/27', teamGames: 8, players: {10: {shvPlayerId: 1, games: 8, goals: 30, sevenMeterGoals: 4, goalsPerGame: 3.8, twoMinutes: 1}, 6: {shvPlayerId: 2, games: 8, goals: 41, sevenMeterGoals: 20, goalsPerGame: 5.1, twoMinutes: 0}}};
const VIEWS = {jetzt: renderJetzt, news: renderNews, artikel: renderArtikel, spiel: renderSpiel, spielplan: renderSaison, tabellen: renderSaison, statistik: renderSaison, team: renderTeam, spieler: renderSpieler, verein: renderVerein, ich: renderIch};
const load = () => ({status: 'loading'});
const api = {};

function render(hash, {now, live = null, state = {}} = {}) {
  setLogos(data.clubLogos);
  const route = parseRoute(hash);
  const ctx = {route, state: {data, live, liveAt: now - 5000, ...state}, now, load, api, ui: {comp: 'Alle', table: 'QHL'}, theme: 'system'};
  return String(VIEWS[route.view](ctx)) + (route.area ? String(nav(route.area)) : '');
}

function check(out, hash) {
  assert.doesNotMatch(out, /\bundefined\b|\bNaN\b|\[object |\bnull\b/, `${hash}: Platzhalterfehler`);
  assert.equal((out.match(/<h1[\s>]/g) || []).length, 1, `${hash}: genau eine h1`);
  for (const [, href] of out.matchAll(/href="([^"]*)"/g)) assert.ok(href === '../' || /^(#\/|https:\/\/|assets\/)/.test(href) || /^https:/.test(href), `${hash}: Link ${href}`);
}

const HASHES = ['#/', '#/news', '#/news/bukarest', '#/news/gibts-nicht', '#/spiel/508338', '#/spiel/508338/vorschau', '#/spiel/508338/live', '#/spiel/508393', '#/spiel/508393/bericht', '#/spiel/000', '#/saison', '#/saison/tabellen', '#/saison/statistik', '#/team', '#/team/10', '#/team/99', '#/verein', '#/ich'];
const MOMENTS = {
  alltag: {now: Date.parse('2026-11-05T10:00:00Z')},
  spieltag: {now: Date.parse('2026-11-11T14:30:00Z')},
  live: {now: Date.parse('2026-11-11T19:10:00Z'), live: {ok: true, match: {id: 508393, home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', score: [24, 21], league: 'QHL', phase: '2. Halbzeit', clock: '47:12', half: [13, 11]}}},
  nachspiel: {now: Date.parse('2026-11-11T22:30:00Z'), live: {ok: true, match: null, finished: {id: 508393, home: 'Kadetten Schaffhausen', away: 'HSC Suhr Aarau', score: [33, 27], half: [16, 13], date: '2026-11-11', status: 'finished', league: 'QHL'}}},
  offline: {now: Date.parse('2026-11-05T10:00:00Z'), state: {dataError: Error('weg')}}
};

for (const [name, moment] of Object.entries(MOMENTS)) {
  test(`Alle Ansichten im Zustand «${name}»`, () => {
    for (const hash of HASHES) check(render(hash, moment), hash);
  });
}

test('Jetzt zeigt je Zustand das Passende', () => {
  assert.match(render('#/', MOMENTS.alltag), /Nächstes Spiel[\s\S]*Letztes Resultat[\s\S]*News[\s\S]*Tabelle in Kürze/);
  assert.match(render('#/', MOMENTS.spieltag), /noch 3:45 h[\s\S]*Push zum Anpfiff[\s\S]*Ausgangslage/);
  const live = render('#/', MOMENTS.live);
  assert.match(live, /24:21[\s\S]*Halbzeit 13:11[\s\S]*Stand vor 5 s[\s\S]*Live-Tabelle[\s\S]*Bei diesem Stand Leader/);
  assert.doesNotMatch(live, /Torschütze[^n]/, 'live keine Torschützen');
  assert.match(render('#/', MOMENTS.nachspiel), /S · Sieg[\s\S]*33:27[\s\S]*Spielbericht[\s\S]*Teilen/);
  assert.match(render('#/', MOMENTS.offline), /zuletzt gespeicherte Stand/);
});

test('Spielseite wechselt Vorschau → Live → Bericht', () => {
  assert.match(render('#/spiel/508393', MOMENTS.alltag), /aria-current="page">Vorschau/);
  assert.match(render('#/spiel/508393', MOMENTS.live), /aria-current="page"><i class="dot"><\/i>Live/);
  assert.match(render('#/spiel/508393', MOMENTS.nachspiel), /aria-current="page">Bericht/);
  assert.match(render('#/spiel/508338', MOMENTS.alltag), /Spielbericht wird geladen/);
});

test('Statistik und Spielerprofil nutzen die SHV-Saisonwerte', () => {
  const stat = render('#/saison/statistik', MOMENTS.alltag);
  assert.ok(stat.indexOf('Odinn Rikhardsson') < stat.indexOf('Josip Perić'), 'nach Toren sortiert');
  assert.match(render('#/team/10', MOMENTS.alltag), /Josip Perić[\s\S]*>30<[\s\S]*Tore/);
});
