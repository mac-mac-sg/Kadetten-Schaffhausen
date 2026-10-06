import test from 'node:test';
import assert from 'node:assert/strict';
import {matchUrls, findEndpoints, scriptSources, preview} from '../scripts/lib/ehf-source-check.mjs';
import {main} from '../scripts/ehf-source-check.mjs';

test('Adressen: die drei Quellen enthalten die Spiel-ID', () => {
  const urls = matchUrls('202711020901029');
  assert.equal(urls.length, 3);
  assert.ok(urls.every(u => u.includes('202711020901029')) || urls[1] === 'https://ticker.ehf.eu/');
  assert.match(urls[2], /^https:\/\/ticker\.ehf\.eu\/match\/\?202711020901029$/);
});

test('findEndpoints und scriptSources erkennen Schnittstellen, Skripte und lassen Bilder aus', () => {
  const html = '<script src="/static/app.js"></script><img src="//cdn.test/logo.png"><a href="x">x</a><script>fetch("/api/ticker/events?id=1");const s="wss://ticker.ehf.eu/signalr";var u="https://ticker.ehf.eu/data/match.json";</script>';
  assert.deepEqual(scriptSources(html, 'https://ticker.ehf.eu/'), ['https://ticker.ehf.eu/static/app.js']);
  const found = findEndpoints(html, 'https://ticker.ehf.eu/');
  assert.ok(found.includes('https://ticker.ehf.eu/api/ticker/events?id=1'));
  assert.ok(found.includes('https://ticker.ehf.eu/data/match.json'));
  assert.ok(!found.some(u => u.endsWith('logo.png')));
  assert.equal(preview('  a \n\n b  ', 10), 'a b');
});

test('main: ruft die drei Adressen und den Livescore-Feed ab, schreibt nur lesend und meldet Ausfälle', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({url, method: init?.method || 'GET'});
    if (url.includes('livescoreapi')) return new Response('{"days":[]}', {headers: {'content-type': 'application/json'}});
    return new Response('<html><body>Ticker 202711020901029</body></html>', {headers: {'content-type': 'text/html'}});
  };
  assert.equal(await main({env: {}, fetchFn}), 0);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.equal(await main({env: {}, fetchFn: async () => { throw Error('blockiert'); }}), 1);
});
