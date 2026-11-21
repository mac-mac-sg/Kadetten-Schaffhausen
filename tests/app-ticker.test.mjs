import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {renderTicker, eventKind, focusEvents} from '../src/kadetten/js/ticker.js';
import {percents} from '../src/kadetten/js/gewinnscore.js';

const doc = markup => parseHTML('<html><body>' + String(markup) + '</body></html>').document;
const ev = (id, seconds, action, side, code, extra = {}) => ({
  id,
  seconds,
  action,
  score: [id, 0],
  homeAction: side === 'home' ? code : null,
  awayAction: side === 'away' ? code : null,
  homePlayer: side === 'home' ? 'Meier Jan' : null,
  awayPlayer: side === 'away' ? 'Müller Justin' : null,
  ...extra
});
const events = [
  ev(1, 120, 'Tor', 'away', 'bFeldTor'),
  ev(2, 180, 'Wurf Parade', 'home', 'bParade'),
  ev(3, 240, 'Techn. Fehler', 'away', 'bTF'),
  ev(4, 300, 'Zeitstrafe', 'home', 'b2Min'),
  ev(5, 360, '7m Tor', 'home', 'b7mTor'),
  ev(6, 420, 'Team Time-Out', 'away', 'bTO'),
  ev(7, 480, 'Verwarnung', 'away', 'bVerwarnung'),
  ev(8, 540, 'Empty Goal', 'home', 'bEGOn'),
  ev(9, 600, 'Disq. ohne Bericht', 'home', 'bDoB'),
  ev(10, 3600, 'Schlusspfiff', 'away', 'bSchlussPfiff')
];
const match = {home: 'HC Kriens-Luzern', away: 'Kadetten Schaffhausen', details: {ok: true, events}};

test('Ticker-Fokus: Tore, Zeitstrafen, Disqualifikationen und Schlusspfiff', () => {
  assert.deepEqual(events.map(eventKind), ['tor', null, null, 'strafe', 'tor', null, null, null, 'strafe', 'ende']);
  assert.deepEqual(
    focusEvents(events).map(e => e.id),
    [1, 4, 5, 9, 10]
  );
});

test('Ticker: Standard nur Tore und Strafen, Umschalter zeigt alle, Mannschaft und 2′ stehen dabei', () => {
  const d = doc(renderTicker(match));
  assert.deepEqual(
    [...d.querySelectorAll('.event')].map(e => e.getAttribute('data-event-id')),
    ['10', '9', '5', '4', '1']
  );
  assert.equal(d.querySelector('.chip.on').getAttribute('data-ui'), 'tickerAll:0');
  assert.ok(d.querySelector('.chip[data-ui="tickerAll:1"]').textContent.includes('Alle Ereignisse (10)'));
  const own = d.querySelector('.event[data-event-id="1"]');
  assert.equal(own.getAttribute('data-side'), 'own', 'Tor der Kadetten');
  assert.match(own.querySelector('strong').textContent, /Tor Kadetten/);
  assert.equal(d.querySelector('.event[data-event-id="5"]').getAttribute('data-side'), 'opp');
  assert.doesNotMatch(d.querySelector('.event[data-event-id="10"] strong').textContent, /Kadetten/, 'Schlusspfiff ohne Mannschaft');
  const pen = d.querySelector('.event[data-event-id="4"]');
  assert.equal(pen.getAttribute('data-kind'), 'strafe');
  assert.equal(pen.querySelector('.event-score').textContent, '2′');
  assert.match(pen.querySelector('strong').textContent, /Zeitstrafe Kriens-Luzern/);
  const all = doc(renderTicker(match, {all: true}));
  assert.equal(all.querySelectorAll('.event').length, 10);
  assert.equal(all.querySelector('.chip.on').getAttribute('data-ui'), 'tickerAll:1');
});

test('Ticker: Quelle ohne erkennbare Tore oder Strafen (EHF) zeigt immer alles, ohne Umschalter', () => {
  const ehf = {
    league: 'European League',
    details: {
      ok: true,
      events: [
        {id: 1, seconds: 30, action: 'Anpfiff'},
        {id: 2, seconds: 90, action: 'Auszeit'}
      ]
    }
  };
  const d = doc(renderTicker(ehf));
  assert.equal(d.querySelectorAll('.event').length, 2);
  assert.equal(d.querySelector('.chip'), null);
});

test('Gewinnchance: Sieg und Niederlage nie 0 oder 100 %, Summe immer 100, Cup-Remis bleibt 0', () => {
  for (const [win, draw, loss] of [
    [1, 0, 0],
    [0, 0, 1],
    [0.999999, 0.0000005, 0.0000005],
    [0.5, 0.2, 0.3],
    [0.6, 0.4, 0]
  ]) {
    const p = percents({win, draw, loss});
    assert.equal(
      p.reduce((a, b) => a + b, 0),
      100,
      JSON.stringify(p)
    );
    assert.ok(p[0] >= 1 && p[0] <= 99 && p[2] >= 1 && p[2] <= 99, JSON.stringify(p));
    assert.ok(draw > 0 ? p[1] >= 1 : p[1] === 0, 'mögliches Remis nie 0, ein nicht vorhandenes bleibt 0: ' + JSON.stringify(p));
  }
  assert.deepEqual(percents({win: 1, draw: 0, loss: 0}), [99, 0, 1], 'Cup: kein Remis');
  assert.deepEqual(percents({win: 0, draw: 0, loss: 1}), [1, 0, 99]);
  assert.deepEqual(percents({win: 0.59, draw: 0.08, loss: 0.33}), [59, 8, 33], 'normale Werte bleiben');
});
