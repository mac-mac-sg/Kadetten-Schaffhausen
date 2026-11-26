import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {dataFreshness, OWN_TEAM} from '../src/kadetten/js/logic.js';
import {createNavigation} from '../src/kadetten/js/router.js';
import {moments} from '../src/kadetten/js/moments.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderJetzt} from '../src/kadetten/js/views/jetzt.js';
import {renderIch} from '../src/kadetten/js/views/ich.js';
import {renderSaison} from '../src/kadetten/js/views/saison.js';

const now = Date.parse('2026-11-06T10:00:00Z');
const game = {id: 'next', date: '2026-11-11', time: '19:15', league: 'QHL', home: OWN_TEAM, away: 'HSC Suhr Aarau'};
const previous = {...game, id: 'old', date: '2026-10-24', score: [30, 20]};
const cup = {...previous, id: 'cup', date: '2026-10-31', league: 'Mobiliar-Cup M', score: [20, 30]};
const data = {
  checkedAt: '2026-11-06T08:20:00Z',
  games: [previous, cup, game],
  tables: {
    QHL: [
      ['Leader', 10, 300, 200, 22],
      [OWN_TEAM, 12, 400, 300, 21]
    ]
  },
  stories: [],
  playerSeason: {players: {1: {shvPlayerId: 7, games: 12, goals: 0}}}
};
const ctx = {now, state: {data}, ui: {}, load: () => ({status: 'error'}), api: {}};
const dom = value => parseHTML('<html><body>' + String(value) + '</body></html>').document;

test('Datenfrische bewertet Quelldatum statt Empfang; Nachtfenster, Alter, Zukunft und unbekannter Stand', () => {
  assert.equal(dataFreshness(data, now).stale, false);
  const partial = dataFreshness({...data, status: {players: {ok: false, updatedAt: '2026-10-31T20:20:00Z'}}}, now);
  assert.equal(partial.stale, true);
  assert.match(partial.message, /Spielerwerte/);
  assert.match(partial.sources[0].label, /31.10.2026/);
  assert.match(dataFreshness(data, now).label, /09:20/);
  assert.equal(dataFreshness({checkedAt: '2026-11-05T21:20:00Z'}, Date.parse('2026-11-06T05:00:00Z')).stale, false);
  for (const value of [undefined, null, '', 'ungültig', '2026-11-07T08:00:00Z', '2026-11-05T08:00:00Z'])
    assert.equal(dataFreshness({checkedAt: value}, now).stale, true);
});

test('Zurück aus Spiel und Spiellaschen erreicht Ursprung mit Scrollposition; Browser vor/zurück und neue Abzweigung', () => {
  const nav = createNavigation('test');
  const visit = (hash, id, y) => {
    const prev = nav.current;
    const entry = nav.enter(hash, id, y);
    if (!entry.restore) nav.setDepth((prev?.depth ?? -1) + 1);
    return entry;
  };
  const plan = visit('#/saison');
  visit('#/spiel/next', null, 640);
  visit('#/spiel/next/bericht', null, 30);
  assert.equal(nav.backTarget(), '#/saison');
  assert.equal(nav.backDistance(), 2);
  assert.equal(visit('#/saison', plan.id, 50).scroll, 640);
  const profile = visit('#/team/1', null, 640);
  visit('#/spiel/old/bericht', null, 375);
  assert.equal(nav.backTarget(), '#/team/1');
  assert.equal(nav.backDistance(), 1);
  assert.equal(visit('#/team/1', profile.id, 20).scroll, 375);
  assert.equal(visit('#/spiel/next', null, 375).restore, false);
  assert.equal(nav.backDistance(), 1);
  const direct = createNavigation('other');
  direct.enter('#/spiel/next', null, 0);
  assert.equal(direct.backTarget(), null);
  assert.notEqual(direct.current.id, plan.id, 'keine Kollision mit History-Einträgen früherer Sitzungen');
});

test('Vorschau zeigt QHL-Form und steht vor «Mein Tipp» auf der Spielseite; die Startseite verlinkt sie bei der Ausgangslage', () => {
  const previewCtx = {
    ...ctx,
    now: Date.parse('2026-11-11T14:30:00Z'),
    load: key =>
      key === 'preview:next' ? {status: 'ready', value: {generator: 'daten', paragraphs: ['Text zur Vorschau.']}} : {status: 'error'}
  };
  const out = dom(renderSpiel({...previewCtx, route: {id: 'next'}, ui: {backTarget: '#/saison'}}));
  const headings = [...out.querySelectorAll('h2')].map(h => h.textContent);
  assert.ok(headings.indexOf('Ausgangslage') >= 0 && headings.indexOf('Ausgangslage') < headings.indexOf('Mein Tipp'));
  assert.equal(headings.indexOf('Vorschau'), -1, 'kein Vorschautext mehr');
  const start = dom(renderJetzt(previewCtx));
  const startHeadings = [...start.querySelectorAll('h2')].map(h => h.textContent);
  assert.equal(startHeadings.indexOf('Vorschau'), -1, 'kein abgeschnittener Vorschautext auf der Startseite');
  assert.equal(start.querySelector('#j-lage').closest('section').querySelector('a').getAttribute('href'), '#/spiel/next');
  const form = out.querySelector('[aria-labelledby="g-lage"]');
  assert.equal(form.querySelector('[role="img"]').getAttribute('aria-label'), 'Form: Sieg');
  assert.doesNotMatch(form.textContent, /neuestes zuerst/, 'keine erklärenden Sätze');
  assert.equal(out.querySelector('[data-route-back]').getAttribute('href'), '#/saison');
});

test('Vorschau- und Rückblick-Texte erscheinen nicht mehr, auch wenn der Datendienst sie liefert', () => {
  for (const generator of ['ki', 'daten', undefined]) {
    const out = dom(
      renderSpiel({
        ...ctx,
        now: Date.parse('2026-11-11T14:30:00Z'),
        load: key =>
          key === 'preview:next' ? {status: 'ready', value: {generator, paragraphs: ['Text zur Vorschau.']}} : {status: 'error'},
        route: {id: 'next'},
        ui: {}
      })
    );
    assert.equal(
      [...out.querySelectorAll('h2')].some(h => h.textContent === 'Vorschau'),
      false,
      String(generator)
    );
    assert.doesNotMatch(out.body.textContent, /Text zur Vorschau/, String(generator));
  }
});

test('Torhüter eröffnet mit Fangquote und Paraden, weist drei fehlende Berichte aus und priorisiert keine Tore', () => {
  const games = Array.from({length: 5}, (_, i) => ({...previous, id: String(i), date: `2026-10-${20 + i}`}));
  const load = key => ({
    status: 'ready',
    value: {
      shv: {
        gameId: Number(key.split(':')[1]),
        score: [30, 20],
        teams: [
          {name: OWN_TEAM, players: [{id: 7, keeper: true, saves: 10, keeperShots: 25}]},
          {name: 'HSC Suhr Aarau', players: []}
        ]
      }
    }
  });
  const output = String(
    renderSpieler({
      ...ctx,
      route: {id: '1'},
      state: {data: {...data, games}},
      load: key => (['0', '1'].includes(key.split(':')[1]) ? load(key) : {status: 'error'})
    })
  );
  assert.ok(output.indexOf('Fangquote · letzte QHL-Spiele') < output.indexOf('Saison 2026/27 · QHL'));
  assert.match(output, /40 %/);
  assert.match(output, /Aus 2 von 5 Spielberichten/);
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

test('«Ich»: Aktualitätswerte stehen eingeklappt unter dem Datenschutz, die Kurzzeile nennt verzögerte Quellen', () => {
  const ich = state => dom(renderIch({theme: 'system', state, ui: {}, now}));
  const status = key => ({ok: true, updatedAt: '2026-11-06T08:20:00Z', ...key});
  const fresh = ich({data: {...data, status: {games: status(), table: status(), news: status(), players: status()}}});
  const box = fresh.querySelector('details#i-fresh');
  assert.ok(box, 'aufklappbarer Punkt');
  assert.ok(!box.hasAttribute('open'), 'standardmässig zu');
  assert.equal(box.querySelector('summary .t').textContent, 'Aktualität der Daten');
  assert.equal(box.querySelector('summary .s').textContent, 'Alle Quellen aktuell');
  assert.equal(box.querySelectorAll('.rl').length, 4, 'alle Quellen innen');
  assert.match(box.textContent, /Daten aktualisiert: 06\.11\.2026, 09:20 Uhr/);
  const privacy = [...fresh.querySelectorAll('.rl')].find(r => /Datenschutz/.test(r.textContent));
  assert.ok(privacy, 'Datenschutz bleibt sichtbar');
  const order = [...fresh.querySelectorAll('.rl, details#i-fresh')];
  assert.ok(order.indexOf(privacy) < order.indexOf(box), 'Aktualität folgt auf den Datenschutz');
  assert.equal(fresh.querySelectorAll('.card.list .rl.compact').length, 0, 'keine Quellenzeilen ausserhalb des Menüs');
  const late = ich({data: {...data, status: {games: status(), players: {ok: false, updatedAt: '2026-10-31T20:20:00Z'}}}});
  assert.equal(late.querySelector('details#i-fresh summary .s').textContent, 'Verzögert: Spielerwerte');
  assert.match(late.querySelector('details#i-fresh').textContent, /Verzögert/);
  assert.equal(ich({data}).querySelector('details#i-fresh summary .s').textContent, 'Zeitpunkt der letzten Aktualisierung');
});

test('Zurück führt in die Menüstruktur: Elternansichten, Direktaufruf, gleichrangige Wechsel, Rückweg im Verlauf', async () => {
  const {parentHash, ancestors, switchesSibling, isRootHash, createNavigation: create} = await import('../src/kadetten/js/router.js');
  assert.equal(parentHash('#/'), null, 'vom Start verlässt Zurück die App');
  for (const tab of ['#/saison', '#/statistik', '#/team', '#/ich', '#/news', '#/quiz']) assert.equal(parentHash(tab), '#/', tab);
  assert.equal(parentHash('#/team/10'), '#/team');
  assert.equal(parentHash('#/team/vergleich/10/7'), '#/team');
  assert.equal(parentHash('#/news/bukarest'), '#/news');
  assert.equal(parentHash('#/ich/einstellungen'), '#/ich');
  assert.equal(parentHash('#/ich/datenschutz'), '#/ich/einstellungen');
  assert.equal(parentHash('#/shop/33928'), '#/shop');
  assert.equal(parentHash('#/kasse/uebersicht'), '#/kasse/adresse');
  assert.equal(parentHash('#/kasse/adresse'), '#/kasse');
  assert.equal(parentHash('#/kasse'), '#/warenkorb');
  assert.equal(parentHash('#/sammlung/abc'), '#/sammlung');
  assert.equal(parentHash('#/wissen'), '#/ich');
  assert.equal(parentHash('#/wissen/regeln/7m'), '#/wissen');
  assert.equal(parentHash('#/wissen/aufstellungen/abwehr-6-0'), '#/wissen/aufstellungen');
  assert.equal(parentHash('#/verein/geschichte'), '#/verein');
  assert.equal(parentHash('#/verein'), '#/team');
  assert.equal(parentHash('#/spiel/1/bericht'), '#/saison', 'ohne Herkunft: Spielplan');
  assert.equal(parentHash('#/spiel/1/bericht', '#/team/10'), '#/team/10', 'mit Herkunft dorthin');
  assert.equal(parentHash('#/spiel/1/wahl'), '#/spiel/1');
  assert.deepEqual(ancestors('#/spiel/1'), ['#/', '#/saison']);
  assert.deepEqual(ancestors('#/ich/datenschutz'), ['#/', '#/ich', '#/ich/einstellungen']);
  assert.deepEqual(ancestors('#/'), []);
  assert.ok(isRootHash('#/team') && isRootHash('') && !isRootHash('#/team/10'));
  assert.equal(switchesSibling('#/saison', '#/team'), true, 'Hauptreiter ersetzen sich');
  assert.equal(switchesSibling('#/', '#/saison'), false, 'vom Start aus bleibt der Start darunter');
  assert.equal(switchesSibling('#/spiel/1/bericht', '#/spiel/1/live'), true, 'Reiter eines Spiels');
  assert.equal(switchesSibling('#/spiel/1/bericht', '#/spiel/2/bericht'), false);
  assert.equal(switchesSibling('#/team', '#/team/10'), false);

  // Der Verlauf kennt den Weg zurück: Ein Ziel weiter unten wird durch «Zurück» erreicht, nicht durch einen neuen Eintrag.
  const nav = create('chain');
  const visit = hash => {
    const prev = nav.current;
    const entry = nav.enter(hash, null, 0);
    if (!entry.restore) nav.setDepth((prev?.depth ?? -1) + 1);
  };
  visit('#/');
  visit('#/team');
  visit('#/team/10');
  assert.equal(nav.distanceTo('#/team'), 1);
  assert.equal(nav.distanceTo('#/'), 2);
  assert.equal(nav.distanceTo('#/saison'), null);
  // Ersetzter Eintrag übernimmt den Vorgänger des ersetzten.
  const before = nav.current;
  nav.enter('#/team/vergleich/10/7', null, 0);
  nav.setDepth(before.depth);
  nav.replaceCurrent();
  assert.equal(nav.distanceTo('#/team'), 1);
  // Direktaufruf: Eltern liegen schon darunter.
  const deep = create('deep');
  const list = deep.seed(['#/', '#/saison', '#/spiel/9']);
  assert.deepEqual(
    list.map(e => e.depth),
    [0, 1, 2]
  );
  deep.enter('#/spiel/9', list[2].id, 0);
  assert.equal(deep.backTarget(), '#/saison');
  assert.equal(deep.distanceTo('#/'), 2);
});
