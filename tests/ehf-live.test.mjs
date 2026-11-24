import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseTicker, liveTickerEvents} from '../server/ehf-ticker.mjs';
import {ehfLiveRoute, resetEhfLive, EHF_TICKER_URL} from '../server/ehf-live.mjs';
import {publicReadCors} from '../server/cors.mjs';
import {renderTicker} from '../src/kadetten/js/ticker.js';
import {withEhfEvents} from '../src/kadetten/js/views/spiel.js';

// Echter EHF-Ticker, Kadetten – Chambéry vom 24. November 2026 bei 9:7 in der 19. Minute (gekürzt auf Ereignisse und Teams).
const fixture = JSON.parse(readFileSync('tests/fixtures/ehf-ticker-live.json', 'utf8'));
const ID = '202711020901036';
const route = (path, fetchFn, now = () => Date.parse('2026-11-24T18:10:00Z')) =>
  ehfLiveRoute(new Request('https://x.test' + path), {}, new URL('https://x.test' + path), {fetchFn, now});

test('EHF-Ticker live: Tore, Siebenmeter und Zeitstrafen im Ereignisformat des SHV', () => {
  const events = liveTickerEvents(parseTicker(fixture));
  const goals = events.filter(e => /Tor$/.test(e.action));
  assert.equal(goals.length, 16);
  assert.deepEqual(goals.at(-1), {
    id: 'g15',
    seconds: 1104,
    action: 'Tor',
    score: [9, 7],
    homePlayer: null,
    awayPlayer: 'Sveinn Jóhannsson',
    homeAction: null,
    awayAction: 'bFeldTor'
  });
  assert.equal(events.filter(e => e.action === '7m Tor').length, 2);
  assert.equal(events.filter(e => e.action === '7m verworfen').length, 1);
  assert.equal(events.filter(e => e.action === 'Zeitstrafe').length, 1);
  assert.ok(
    events.every((e, i) => i === 0 || events[i - 1].seconds <= e.seconds),
    'zeitlich sortiert'
  );
});

test('EHF-Ticker live: eigener Endpunkt mit Zwischenspeicher, letzter Stand bei Ausfall, nur gültige Spiel-IDs', async () => {
  resetEhfLive();
  let calls = 0;
  const ok = async (url, init) => {
    calls++;
    assert.equal(url, EHF_TICKER_URL);
    assert.equal(init.method, 'POST');
    assert.equal(String(init.body), 'MatchID=' + ID);
    return new Response(JSON.stringify(fixture), {headers: {'Content-Type': 'application/json'}});
  };
  const first = await route('/api/ehf-live/' + ID, ok);
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.equal(body.ok, true);
  assert.equal(body.events.filter(e => /Tor$/.test(e.action)).length, 16);
  await route('/api/ehf-live/' + ID, ok);
  assert.equal(calls, 1, 'innerhalb von 20 Sekunden aus dem Zwischenspeicher');
  const down = async () => {
    throw Error('weg');
  };
  const stale = await route('/api/ehf-live/' + ID, down, () => Date.parse('2026-11-24T18:11:00Z'));
  assert.equal((await stale.json()).ok, false, 'letzter Stand, als verzögert markiert');
  resetEhfLive();
  assert.equal((await route('/api/ehf-live/' + ID, down)).status, 503);
  for (const bad of ['/api/ehf-live/123', '/api/ehf-live/abc', '/api/ehf-live/202611020901036'])
    assert.equal((await route(bad, ok)).status, 400, bad);
  const cors = publicReadCors(new Response('{}'), new Request('https://x.test/api/ehf-live/' + ID));
  assert.equal(cors.headers.get('Access-Control-Allow-Origin'), 'https://mac-mac-sg.github.io');
});

test('EHF-Ticker live: die App übernimmt die Ereignisse in den Ticker; ohne Ticker bleibt der Hinweis', () => {
  const match = {id: ID, league: 'European League', home: 'Kadetten Schaffhausen', away: 'Chambery', details: {ok: true, events: null}};
  const events = liveTickerEvents(parseTicker(fixture));
  const merged = withEhfEvents(match, {status: 'ready', value: {ok: true, events}});
  const {document} = parseHTML('<html><body>' + String(renderTicker(merged)) + '</body></html>');
  const rows = [...document.querySelectorAll('[data-event-id]')];
  assert.equal(rows.length, 17, 'Standard: 16 Tore und 1 Zeitstrafe (ohne verworfenen Siebenmeter)');
  assert.match(rows[0].textContent, /18:24[\s\S]*Tor[\s\S]*Sveinn Jóhannsson[\s\S]*9:7/);
  assert.match(String(renderTicker(withEhfEvents(match, {status: 'error'}))), /EHF liefert während des Spiels keine einzelnen Ereignisse/);
  const qhl = {league: 'QHL', details: {events: []}};
  assert.equal(withEhfEvents(qhl, {value: {events}}), qhl, 'SHV-Spiele bleiben unverändert');
});
