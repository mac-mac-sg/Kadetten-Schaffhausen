// Baut alle Ansichten mit dem mitgelieferten Datenstand in verschiedenen Zuständen und prüft auf Vorlagenfehler.
// Ersetzt keinen Blick im Browser (siehe AGENTS.md), fängt aber kaputte Vorlagen und fehlende Werte ab.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MY_GAMES_KEY, TIPS_KEY} from '../src/kadetten/js/personal.js';
import {parseRoute} from '../src/kadetten/js/router.js';
import {decodeDeep} from '../src/kadetten/js/text.js';
import {setLogos, nav} from '../src/kadetten/js/views/parts.js';
import {renderJetzt, renderNews} from '../src/kadetten/js/views/jetzt.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {renderSaison} from '../src/kadetten/js/views/saison.js';
import {renderTeam, renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderVerein} from '../src/kadetten/js/views/verein.js';
import {renderIch} from '../src/kadetten/js/views/ich.js';
import {renderMein, renderSammlung, renderKarte, renderNeu} from '../src/kadetten/js/views/sammlung.js';
import {renderArtikel} from '../src/kadetten/js/views/artikel.js';

const data = decodeDeep(JSON.parse(readFileSync('server/seed.json', 'utf8')));
data.playerSeason = {
  season: '2026/27',
  teamGames: 8,
  players: {
    10: {shvPlayerId: 1, games: 8, goals: 30, sevenMeterGoals: 4, goalsPerGame: 3.8, twoMinutes: 1},
    6: {shvPlayerId: 2, games: 8, goals: 41, sevenMeterGoals: 20, goalsPerGame: 5.1, twoMinutes: 0}
  }
};
const VIEWS = {
  jetzt: renderJetzt,
  news: renderNews,
  artikel: renderArtikel,
  spiel: renderSpiel,
  spielplan: renderSaison,
  tabellen: renderSaison,
  statistik: renderSaison,
  team: renderTeam,
  spieler: renderSpieler,
  verein: renderVerein,
  ich: renderIch,
  mein: renderMein,
  sammlung: renderSammlung,
  karte: renderKarte,
  neu: renderNeu
};
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
  for (const [, href] of out.matchAll(/href="([^"]*)"/g))
    assert.ok(href === '../' || /^(#\/|https:\/\/|assets\/)/.test(href) || /^https:/.test(href), `${hash}: Link ${href}`);
}

const HASHES = [
  '#/',
  '#/ich',
  '#/ich/einstellungen',
  '#/sammlung',
  '#/sammlung/k-10',
  '#/sammlung/neu',
  '#/news',
  '#/news/bukarest',
  '#/news/gibts-nicht',
  '#/spiel/508338',
  '#/spiel/508338/vorschau',
  '#/spiel/508338/live',
  '#/spiel/508393',
  '#/spiel/508393/bericht',
  '#/spiel/000',
  '#/saison',
  '#/saison/tabellen',
  '#/saison/statistik',
  '#/team',
  '#/team/10',
  '#/team/99',
  '#/verein',
  '#/ich'
];
const MOMENTS = {
  alltag: {now: Date.parse('2026-11-05T10:00:00Z')},
  spieltag: {now: Date.parse('2026-11-11T14:30:00Z')},
  live: {
    now: Date.parse('2026-11-11T19:10:00Z'),
    live: {
      ok: true,
      match: {
        id: 508393,
        home: 'Kadetten Schaffhausen',
        away: 'HSC Suhr Aarau',
        score: [24, 21],
        league: 'QHL',
        phase: '2. Halbzeit',
        clock: '47:12',
        half: [13, 11]
      }
    }
  },
  nachspiel: {
    now: Date.parse('2026-11-11T22:30:00Z'),
    live: {
      ok: true,
      match: null,
      finished: {
        id: 508393,
        home: 'Kadetten Schaffhausen',
        away: 'HSC Suhr Aarau',
        score: [33, 27],
        half: [16, 13],
        date: '2026-11-11',
        status: 'finished',
        league: 'QHL'
      }
    }
  },
  offline: {now: Date.parse('2026-11-05T10:00:00Z'), state: {dataError: Error('weg')}}
};

for (const [name, moment] of Object.entries(MOMENTS)) {
  test(`Alle Ansichten im Zustand «${name}»`, () => {
    for (const hash of HASHES) check(render(hash, moment), hash);
  });
}

test('Jetzt zeigt je Zustand das Passende', () => {
  assert.match(
    render('#/', MOMENTS.alltag),
    /band-home[\s\S]*Nächstes Spiel[\s\S]*Neues aus dem Verein[\s\S]*Unsere Saison[\s\S]*Letztes Resultat/
  );
  assert.match(render('#/', MOMENTS.spieltag), /noch 3:45 h[\s\S]*Push zum Anpfiff[\s\S]*Ausgangslage/);
  const live = render('#/', MOMENTS.live);
  assert.match(live, /24:21[\s\S]*Halbzeit 13:11[\s\S]*Stand von 20:09 Uhr[\s\S]*Live-Tabelle[\s\S]*Bei diesem Stand Leader/);
  assert.doesNotMatch(live, /Torschütze[^n]/, 'live keine Torschützen');
  assert.match(render('#/', MOMENTS.nachspiel), /S · Sieg[\s\S]*33:27[\s\S]*Spielbericht[\s\S]*Teilen/);
  assert.match(render('#/', MOMENTS.offline), /zuletzt gespeicherte Stand/);
});

test('Spielseite wechselt Vorschau → Live → Bericht', () => {
  const before = render('#/spiel/508393', MOMENTS.alltag);
  assert.doesNotMatch(before, /aria-label="Spielseite"/, 'vor Anpfiff keine Reiterleiste');
  assert.match(before, /Ausgangslage/);
  assert.match(render('#/spiel/508393', MOMENTS.live), /aria-current="page"><i class="dot"><\/i>Ticker/);
  const done = render('#/spiel/508393', MOMENTS.nachspiel);
  assert.match(done, /aria-current="page">Statistik/);
  assert.doesNotMatch(done, />Ticker<|>Übersicht</, 'abgeschlossenes QHL-Spiel: nur Statistik und Rückblick');
  assert.match(render('#/spiel/508338', MOMENTS.alltag), /Spielbericht wird geladen/);
});

test('Statistik und Spielerprofil nutzen die SHV-Saisonwerte', () => {
  const stat = render('#/saison/statistik', MOMENTS.alltag);
  assert.ok(stat.indexOf('Odinn Rikhardsson') < stat.indexOf('Josip Perić'), 'nach Toren sortiert');
  assert.match(render('#/team/10', MOMENTS.alltag), /Josip Perić[\s\S]*>30<[\s\S]*Tore/);
});

test('Live-Status steht beim Resultat auf Startseite und in allen Spielreitern', () => {
  const after = Date.parse('2026-11-11T18:30:00Z');
  const healthy = {ok: true, sources: {SHV: {ok: true}, EHF: {ok: true}}};
  const shvDown = {...healthy, sources: {...healthy.sources, SHV: {ok: false}}};
  const ehfDown = {...healthy, sources: {...healthy.sources, EHF: {ok: false}}};
  for (const route of ['#/', '#/spiel/508393']) {
    assert.match(render(route, {now: after, live: healthy}), /Wartet auf Live-Daten/);
    assert.match(render(route, {now: after, live: shvDown}), /Live-Daten von SHV derzeit nicht erreichbar/);
    assert.match(render(route, {now: after, live: ehfDown}), /Wartet auf Live-Daten/);
    assert.match(render(route, {now: after, state: {liveError: Error('timeout')}}), /Live-Daten derzeit nicht erreichbar/);
    assert.doesNotMatch(render(route, MOMENTS.spieltag), /Wartet auf Live-Daten/);
    assert.match(render(route, MOMENTS.nachspiel), /33:27[\s\S]*Endresultat bestätigt/);
  }
  const checkedAt = '2026-11-11T19:09:10Z';
  const stale = {...MOMENTS.live.live, checkedAt, sources: {SHV: {ok: false, stale: true, since: '2026-11-11T18:42:00Z'}}};
  for (const route of ['#/', '#/spiel/508393/live', '#/spiel/508393/bericht']) {
    assert.match(render(route, {now: MOMENTS.live.now, live: {...MOMENTS.live.live, checkedAt}}), /Stand von 20:09 Uhr/);
    assert.match(
      render(route, {now: MOMENTS.live.now, live: stale}),
      /Stand von 19:42 Uhr[\s\S]*Live-Daten von SHV derzeit nicht erreichbar/
    );
    assert.match(
      render(route, {...MOMENTS.live, state: {liveError: Error('offline')}}),
      /Stand von 20:09 Uhr[\s\S]*Live-Daten derzeit nicht erreichbar/
    );
  }
});

test('Bestätigter Abpfiff hat Vorrang vor dem geplanten Spielfenster und dem nächsten Anpfiff', () => {
  const now = Date.parse('2026-11-11T19:45:00Z');
  const next = {id: 'next-game', date: '2026-11-12', time: '18:00', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern', league: 'QHL'};
  const out = render('#/', {...MOMENTS.nachspiel, now, state: {data: {...data, games: [...data.games, next]}}});
  assert.match(out, /33:27[\s\S]*Endresultat bestätigt[\s\S]*Nächstes Spiel[\s\S]*#\/spiel\/next-game/);
});

test('QHL, Cup und EHL wechseln über den bestätigten Live-Stand zum Endresultat', () => {
  const now = Date.parse('2026-11-11T19:05:00Z');
  for (const [league, source] of [
    ['QHL', 'SHV'],
    ['Mobiliar-Cup M', 'SHV'],
    ['EHL', 'EHF']
  ]) {
    const fixture = {id: 'phase-test', date: '2026-11-11', time: '19:15', home: 'Kadetten Schaffhausen', away: 'HC Kriens-Luzern', league};
    const sources = {[source]: {ok: true}};
    const state = {data: {...data, games: [fixture]}};
    const route = '#/spiel/phase-test';
    assert.match(render(route, {now, state, live: {sources}}), /Wartet auf Live-Daten/);
    const match = {...fixture, score: [22, 19], phase: '2. Halbzeit', clock: '60:00'};
    assert.match(render(route, {now, state, live: {sources, match}}), /22:19[\s\S]*Stand von/);
    assert.doesNotMatch(render(route, {now, state, live: {sources, match}}), /Endresultat bestätigt/);
    const finished = {...fixture, score: [23, 19], status: 'finished'};
    const out = render(route, {now, state, live: {sources, match, finished}});
    assert.match(out, /23:19[\s\S]*Endresultat bestätigt/);
    assert.doesNotMatch(out, />Ticker</);
  }
});

test('Die Spieltags-Ausgangslage nutzt den Wettbewerb der Partie', () => {
  const now = Date.parse('2026-11-17T16:00:00Z');
  const own = 'Kadetten Schaffhausen',
    away = 'HC Izvidac';
  const fixture = {id: 'test-matchday', date: '2026-11-17', time: '18:45', home: own, away};
  const tables = {
    QHL: [
      [away, 13, 300, 290, 26],
      [own, 13, 298, 290, 23]
    ],
    EHL: [
      [own, 3, 110, 95, 6],
      [away, 3, 99, 90, 4]
    ]
  };
  const matchday = (league, round, isAway = false) => {
    const teams = isAway ? {home: away, away: own} : {};
    return render('#/', {now, state: {data: {...data, tables, games: [{...fixture, ...teams, league, round}]}}});
  };
  assert.match(matchday('EHL'), /<span class="rank-own">1\.<\/span> <small>vs\.<\/small> 2\.[\s\S]*EHL-Gruppenrang/);
  assert.match(matchday('EHL', undefined, true), /2\. <small>vs\.<\/small> <span class="rank-own">1\.<\/span>/);
  assert.match(matchday('QHL', undefined, true), /1\. <small>vs\.<\/small> <span class="rank-own">2\.<\/span>/);
  assert.doesNotMatch(matchday('EHL'), /QHL|Punkte mit Sieg/);
  assert.match(
    matchday('QHL'),
    /<span class="rank-own">2\.<\/span> <small>vs\.<\/small> 1\.[\s\S]*QHL-Rang[\s\S]*25[\s\S]*Punkte mit Sieg/
  );
  assert.match(matchday('Mobiliar-Cup M', '85'), /Viertelfinal/);
  assert.match(matchday('Mobiliar-Cup M', '1\/2-Final'), /1\/2-Final/);
  assert.doesNotMatch(matchday('Mobiliar-Cup M', '85'), /QHL-Rang|Punkte mit Sieg/);
});

test('Startseite priorisiert das letzte Resultat vor dem Quiz und Spielplan bietet einen Sprung', () => {
  assert.match(render('#/', {now: Date.parse('2026-11-16T12:00:00Z')}), /Letztes Resultat[\s\S]*Quiz der Woche/);
  const schedule = render('#/saison', MOMENTS.alltag);
  assert.match(schedule, /data-jump-next>Zum nächsten Spiel[\s\S]*data-next-game/);
  assert.doesNotMatch(render('#/saison', {now: Date.parse('2027-06-30T12:00:00Z')}), /data-jump-next/);
});

test('Mein Bereich zeigt vorhandene Hallenbesuche sowie offene und gewertete Tipps', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => (previous ? Object.defineProperty(globalThis, 'localStorage', previous) : delete globalThis.localStorage));
  const stored = {[MY_GAMES_KEY]: ['508338'], [TIPS_KEY]: {508338: [20, 28], 508393: [33, 27], old: [26, 29]}};
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {getItem: k => JSON.stringify(stored[k] ?? null)}});
  const upcoming = render('#/ich', MOMENTS.spieltag);
  assert.match(upcoming, /Meine Spiele[\s\S]*1 in der Halle[\s\S]*#\/spiel\/508338/);
  assert.match(upcoming, /Meine Tipps[\s\S]*3 gespeichert[\s\S]*33:27[\s\S]*Bis Anpfiff änderbar/);
  assert.match(upcoming, /1 gespeicherte Tipps ohne Eintrag/);
  const done = render('#/ich', MOMENTS.nachspiel);
  assert.match(done, /33:27<\/b> · 3 Punkte/);
});
