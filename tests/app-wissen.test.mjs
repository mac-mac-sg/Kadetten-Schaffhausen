import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseRoute, href} from '../src/kadetten/js/router.js';
import {ARTICLES, GROUPS, CHAPTERS, article, positionArticle} from '../src/kadetten/js/wissen/inhalt.js';
import {feldbild, stepPlayers, arrowPath} from '../src/kadetten/js/wissen/feld.js';
import {RULES} from '../src/kadetten/js/rules.js';
import {renderWissen} from '../src/kadetten/js/views/wissen.js';
import {renderIch} from '../src/kadetten/js/views/ich.js';
import {renderTeam, renderSpieler} from '../src/kadetten/js/views/team.js';
import {renderJetzt} from '../src/kadetten/js/views/jetzt.js';
import {decodeDeep} from '../src/kadetten/js/text.js';
import {setLogos} from '../src/kadetten/js/views/parts.js';

const data = decodeDeep(JSON.parse(readFileSync('server/seed.json', 'utf8')));
const now = Date.parse('2026-11-05T10:00:00Z');
const dom = fragment => parseHTML('<html><body>' + String(fragment) + '</body></html>').document;
function page(hash, ui = {}) {
  setLogos(data.clubLogos);
  const route = parseRoute(hash);
  return dom(renderWissen({route, ui}));
}

test('Routen: Wissen mit Kapitel, Artikel und Schritt; unbekannte Kapitel führen zu den Regeln', () => {
  assert.deepEqual(parseRoute('#/wissen'), {area: null, view: 'wissen', chapter: 'regeln'});
  assert.deepEqual(parseRoute('#/wissen/aufstellungen'), {area: null, view: 'wissen', chapter: 'aufstellungen'});
  assert.deepEqual(parseRoute('#/wissen/regeln/7m'), {area: null, view: 'wissen', chapter: 'regeln', id: '7m'});
  assert.deepEqual(parseRoute('#/wissen/spielzuege/kreuzen/2'), {area: null, view: 'wissen', chapter: 'spielzuege', id: 'kreuzen', step: 2});
  assert.equal(parseRoute('#/wissen/quatsch/kreuzen').id, undefined);
  assert.equal(parseRoute('#/wissen/regeln/a b').id, undefined);
  assert.equal(href.wissen(), '#/wissen');
  assert.equal(href.wissen('regeln'), '#/wissen');
  assert.equal(href.wissen('aufstellungen'), '#/wissen/aufstellungen');
  assert.equal(href.wissen('spielzuege', 'kreuzen', 2), '#/wissen/spielzuege/kreuzen/2');
});

test('Inhalte: eindeutige Kennungen, vollständige Texte, gültige Verweise', () => {
  const ids = ARTICLES.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'Kennungen sind eindeutig');
  assert.ok(ARTICLES.filter(a => a.chapter === 'regeln').length >= 20, 'rund 20 Regelartikel');
  for (const a of ARTICLES) {
    assert.ok(CHAPTERS.some(([c]) => c === a.chapter), a.id + ': Kapitel');
    assert.ok(GROUPS[a.chapter].some(([g]) => g === a.group), a.id + ': Gruppe');
    assert.ok(a.title && a.short && a.body.length, a.id + ': Titel, Kurzfassung und Text');
    assert.match(a.id, /^[A-Za-z0-9_-]{1,80}$/, a.id + ': gültige Adresse');
    for (const r of a.related || []) assert.ok(article(r), `${a.id}: Verweis auf ${r}`);
  }
  for (const [chapter] of CHAPTERS) for (const [group] of GROUPS[chapter]) assert.ok(ARTICLES.some(a => a.chapter === chapter && a.group === group), group + ' ist nicht leer');
});

test('Regeln: die bisherigen Kurztexte bleiben die Quelle der «?»-Blätter', () => {
  for (const id of ['7m', '2min', 'gelb', 'rot', 'parade', 'wurfquote', 'tf', 'passiv', 'auszeit', 'tordifferenz', 'punkte']) assert.ok(RULES[id], id);
  assert.equal(RULES['7m'][0], 'Siebenmeter (7-m)');
  assert.ok(RULES.wurfzonen, 'neue Begriffe stehen ebenfalls im Blatt');
  assert.equal(RULES['abwehr-6-0'], undefined, 'nur Regeln, keine Formationen');
});

test('Feldbilder: Spieler liegen im Feld, Spielzüge haben drei Schritte mit Text, Wege und Ball', () => {
  for (const a of ARTICLES.filter(x => x.field)) for (const p of a.field.players) assert.ok(p.x >= 0 && p.x <= 220 && p.y >= 0 && p.y <= 150, `${a.id}: ${p.l} liegt im Feld`);
  const zuege = ARTICLES.filter(a => a.chapter === 'spielzuege');
  assert.equal(zuege.length, 8);
  for (const z of zuege) {
    assert.equal(z.steps.length, 3, z.id);
    z.steps.forEach((s, i) => {
      assert.ok(s.text.length > 10, `${z.id} Schritt ${i + 1}: Text`);
      const players = stepPlayers(z, i);
      for (const p of players) assert.ok(p.x >= 0 && p.x <= 220 && p.y >= 0 && p.y <= 150, `${z.id} Schritt ${i + 1}: ${p.l} liegt im Feld`);
      if (s.ball) assert.ok(players.some(p => p.l === s.ball && p.team === 'a'), `${z.id} Schritt ${i + 1}: Ballführender ${s.ball} existiert`);
    });
  }
  const svg = dom(feldbild({label: 'Test', players: [{l: 'RM', x: 110, y: 100, team: 'a'}, {l: '1', x: 90, y: 70, team: 'd'}], moves: [{k: 'pass', from: [110, 100], to: [200, 100]}], ball: 'RM'})).querySelector('svg');
  assert.equal(svg.getAttribute('role'), 'img');
  assert.equal(svg.getAttribute('aria-label'), 'Test');
  assert.equal(svg.querySelectorAll('.fb-p').length, 2);
  assert.equal(svg.querySelectorAll('.fb-ball').length, 1);
  assert.ok(!/style=/.test(svg.outerHTML), 'keine style-Attribute (CSP)');
  assert.equal(arrowPath([0, 0], [5, 0]), '', 'zu kurze Wege ergeben keinen Pfeil');
});

test('Übersicht: drei Kapitel als Reiter, Gruppen mit Verweisen, Buch-Symbol im Band markiert', () => {
  const d = page('#/wissen');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.equal(d.querySelector('h1').textContent, 'Wissen');
  assert.deepEqual([...d.querySelectorAll('nav.seg a')].map(a => a.textContent.trim()), ['Regeln', 'Aufstellungen', 'Spielzüge']);
  assert.equal(d.querySelector('nav.seg a[aria-current="page"]').textContent.trim(), 'Regeln');
  assert.equal(d.querySelector('.band-acts a[href="#/wissen"]').getAttribute('aria-current'), 'page');
  assert.ok(d.querySelectorAll('.plain-list a').length >= 20);
  assert.ok(d.querySelector('a[href="#/wissen/regeln/7m"]'));
  assert.ok(page('#/wissen/aufstellungen').querySelector('a[href="#/wissen/aufstellungen/abwehr-6-0"]'));
  assert.ok(page('#/wissen/spielzuege').querySelector('a[href="#/wissen/spielzuege/kreuzen"]'));
});

test('Artikel: Regel mit Text und Verweisen, Formation mit Feldbild und drei Karten, Position mit Feldbild', () => {
  const rule = page('#/wissen/regeln/7m');
  assert.equal(rule.querySelector('h1').textContent, 'Siebenmeter (7-m)');
  assert.match(rule.body.textContent, /vier Tore aus fünf Würfen/);
  assert.ok(rule.querySelector('a[href="#/wissen/regeln/spielfeld"]'), 'Verweis auf verwandten Artikel');
  const form = page('#/wissen/aufstellungen/abwehr-5-1');
  assert.ok(form.querySelector('.wk-main figure.fb svg'));
  assert.equal(form.querySelectorAll('.wk-main .wk-three .card').length, 3);
  const pos = page('#/wissen/aufstellungen/pos-kreis');
  assert.equal(pos.querySelectorAll('.wk-main .fb-hl').length, 1, 'genau eine Position hervorgehoben');
  assert.equal(pos.querySelectorAll('.wk-main .fb-ghost').length, 5);
  assert.equal(page('#/wissen/regeln/gibt-es-nicht').querySelector('h1').textContent, 'Wissen', 'unbekannt führt zur Übersicht');
});

test('Spielzug: Schritt aus der Adresse, Zurück/Weiter als Links, Textfassung aller Schritte', () => {
  const d = page('#/wissen/spielzuege/kreuzen/2');
  assert.match(d.querySelector('.wk-step').textContent, /Schritt 2 von 3/);
  assert.equal(d.querySelector('.wk-nums a[aria-current="step"]').getAttribute('href'), '#/wissen/spielzuege/kreuzen/2');
  assert.equal([...d.querySelectorAll('.wk-go a')].map(a => a.getAttribute('href')).join(), '#/wissen/spielzuege/kreuzen/1,#/wissen/spielzuege/kreuzen/3');
  assert.equal(d.querySelectorAll('.wk-list li').length, 3);
  assert.ok(d.querySelector('figure.fb svg').getAttribute('aria-label').includes('Schritt 2 von 3'));
  const first = page('#/wissen/spielzuege/kreuzen');
  assert.match(first.querySelector('.wk-step').textContent, /Schritt 1 von 3/);
  assert.equal(first.querySelectorAll('.wk-go a').length, 1, 'am Anfang nur Weiter');
  const last = page('#/wissen/spielzuege/kreuzen/3');
  assert.equal([...last.querySelectorAll('.wk-go a')].map(a => a.textContent.trim()).join(), 'Zurück');
  assert.match(page('#/wissen/spielzuege/kreuzen/9').querySelector('.wk-step').textContent, /Schritt 1 von 3/, 'ungültiger Schritt fällt auf 1');
  assert.ok(d.querySelector('[data-wissen-play="kreuzen"]'), 'Abspielen');
  assert.equal(page('#/wissen/spielzuege/kreuzen/2', {wissenPlay: 'kreuzen'}).querySelector('[data-wissen-play]').textContent, 'Anhalten');
});

test('«Ich» ohne Regelliste; Startseite und Spielerprofil führen ins Wissen', () => {
  const ich = dom(renderIch({theme: 'system', state: {data, live: null}, ui: {}, now}));
  assert.ok(!ich.querySelector('[data-rule]'), 'keine Regelliste mehr');
  assert.doesNotMatch(ich.body.textContent, /Regeln kurz erklärt/);
  setLogos(data.clubLogos);
  const home = dom(renderJetzt({route: parseRoute('#/'), state: {data, live: null}, now, load: () => ({status: 'loading'}), api: {}, ui: {}, theme: 'system'}));
  assert.ok(home.querySelector('.band-acts a[href="#/wissen"]'), 'Buch-Symbol auf der Titelseite');
  const kreis = data.players?.find?.(p => p.position === 'Kreis');
  assert.equal(positionArticle('Kreis').id, 'pos-kreis');
  assert.equal(positionArticle('Rückraum mitte').id, 'pos-rueckraum-mitte');
  assert.equal(positionArticle('Flügel links').id, 'pos-fluegel-links');
  assert.equal(positionArticle('Tor').id, 'pos-tor');
  assert.equal(positionArticle('Trainer'), null);
  void kreis;
});

test('Quellcode: Buch-Symbol, Wissen-Ansicht und Blatt «Mehr dazu» sind eingebunden', () => {
  const main = readFileSync('src/kadetten/js/main.js', 'utf8');
  assert.match(main, /wissen: renderWissen/);
  assert.match(main, /Mehr dazu/);
  assert.match(main, /data-wissen-play|wissenPlay/);
  const bericht = readFileSync('src/kadetten/js/views/bericht.js', 'utf8');
  assert.match(bericht, /ruleButton\('wurfzonen'\)/);
});

test('Aufstellungen: Art und Formation per Wahlknopf, Feldbild am selben Ort, Vergleich aller Formationen', () => {
  const d = page('#/wissen/aufstellungen');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.equal(d.querySelector('.wk-main h2').textContent, 'Abwehr 6-0', 'Standard: Abwehr 6-0');
  assert.deepEqual([...d.querySelectorAll('nav.chips[aria-label="Art"] a')].map(a => a.textContent.trim()), ['Abwehrformationen', 'Angriffsformen', 'Positionen']);
  assert.equal(d.querySelector('nav.chips[aria-label="Art"] a[aria-current]').textContent.trim(), 'Abwehrformationen');
  const chips = [...d.querySelectorAll('nav.chips[aria-label="Abwehrformationen"] a')];
  assert.deepEqual(chips.map(a => a.textContent.trim()), ['6-0', '5-1', '3-2-1', '4-2', 'Mann']);
  assert.equal(chips[1].getAttribute('href'), '#/wissen/aufstellungen/abwehr-5-1');
  assert.equal(d.querySelectorAll('.wk-cmp .wk-mini').length, 5, 'alle fünf im Vergleich');
  assert.equal(d.querySelectorAll('.wk-cmp .wk-mini[aria-current]').length, 1);
  for (const svg of d.querySelectorAll('.wk-cmp svg')) assert.equal(svg.getAttribute('aria-hidden'), 'true', 'Vergleichsbilder sind Zierde, der Titel steht im Link');
  assert.match(d.querySelector('.wk-cmp .wk-mini').textContent, /kompakt/i);
  const angriff = page('#/wissen/aufstellungen/angriff-7-6');
  assert.equal(angriff.querySelector('nav.chips[aria-label="Angriffsformen"] a[aria-current]').textContent.trim(), '7 gegen 6');
  assert.equal(angriff.querySelectorAll('.wk-cmp .wk-mini').length, 3);
  const positionen = page('#/wissen/aufstellungen/pos-tor');
  assert.equal(positionen.querySelectorAll('.wk-cmp .wk-mini').length, 7);
  assert.equal(positionen.querySelector('nav.chips[aria-label="Art"] a[aria-current]').textContent.trim(), 'Positionen');
  assert.equal(page('#/wissen/aufstellungen/gibt-es-nicht').querySelector('.wk-main h2').textContent, 'Abwehr 6-0', 'unbekannt führt zum Standard');
});

test('Spielzüge: Art und Spielzug per Wahlknopf, Schritte am selben Ort, Vergleich mit dem ersten Schritt', () => {
  const d = page('#/wissen/spielzuege');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.equal(d.querySelector('.wk-main h2').textContent, 'Kreuzen', 'Standard: Kreuzen');
  assert.deepEqual([...d.querySelectorAll('nav.chips[aria-label="Art"] a')].map(a => a.textContent.trim()), ['Rückraum', 'Kreisläufer', 'Sonderlagen']);
  assert.deepEqual([...d.querySelectorAll('nav.chips[aria-label="Rückraum"] a')].map(a => a.textContent.trim()), ['Kreuzen', 'Doppelpass']);
  const sonder = page('#/wissen/spielzuege/gegenstoss/2');
  assert.equal(sonder.querySelector('nav.chips[aria-label="Art"] a[aria-current]').textContent.trim(), 'Sonderlagen');
  assert.deepEqual([...sonder.querySelectorAll('nav.chips[aria-label="Sonderlagen"] a')].map(a => a.textContent.trim()), ['Überzahl', 'Gegenstoss', 'Freiwurf', '7-m']);
  assert.match(sonder.querySelector('.wk-step').textContent, /Schritt 2 von 3/);
  assert.equal(sonder.querySelectorAll('.wk-cmp .wk-mini').length, 4);
  assert.equal(sonder.querySelectorAll('.wk-cmp .wk-mini[aria-current]').length, 1);
  for (const a of sonder.querySelectorAll('.wk-cmp .wk-mini')) assert.match(a.getAttribute('href'), /^#\/wissen\/spielzuege\/[a-z-]+$/, 'Vergleichskarten führen zum ersten Schritt');
  const zug = article('gegenstoss');
  const mini = sonder.querySelector('.wk-cmp .wk-mini[aria-current] svg');
  assert.equal(mini.getAttribute('aria-hidden'), 'true');
  assert.equal(mini.querySelectorAll('.fb-m').length, zug.steps[0].moves.length, 'Mini-Bild zeigt die Wege des ersten Schritts');
  assert.equal(page('#/wissen/spielzuege/gibt-es-nicht').querySelector('.wk-main h2').textContent, 'Kreuzen', 'unbekannt führt zum Standard');
});
