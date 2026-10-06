import test from 'node:test';
import assert from 'node:assert/strict';
import {matchUrls, findEndpoints, scriptSources, preview, contextAround, findFeedMatch, candidateCalls} from '../scripts/lib/ehf-source-check.mjs';
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
  assert.ok(calls.length >= 4);
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.equal(await main({env: {}, fetchFn: async () => { throw Error('blockiert'); }}), 1);
});

test('Erweiterung: Kennungen aus dem Feed, Versuchsaufrufe und Ausschnitte aus Skripten', () => {
  const feed = {days: [{liveScoreMatches: [{match: {id: 'GUID1', matchID: '202711020901029', homeTeam: {id: 'h'}, guestTeam: {id: 'g'}}}]}]};
  assert.deepEqual(findFeedMatch(feed, '202711020901029'), {id: 'GUID1', matchID: '202711020901029', home: 'h', guest: 'g'});
  assert.equal(findFeedMatch(feed, '1'), null);
  const calls = candidateCalls({id: 'GUID1'}, '202711020901029');
  assert.ok(calls.includes('https://ehfel.eurohandball.com/umbraco/api/matchdetailsinfoapi/GetMatchLiveFeed?matchId=GUID1'));
  assert.ok(calls.includes('https://ehfel.eurohandball.com/umbraco/api/matchdetailapi/GetMatchDetails?id=202711020901029'));
  assert.ok(calls.every(c => c.startsWith('https://ehfel.eurohandball.com/umbraco/api/')));
  assert.equal(candidateCalls(null, '5').length, 9);
  const snippets = contextAround('aaa GetMatchLiveFeed?matchId=1 bbb', 'GetMatchLiveFeed', 5, 3);
  assert.equal(snippets.length, 1);
  assert.match(snippets[0], /GetMatchLiveFeed\?ma/);
});

test('main mit Erweiterung: ruft nur per GET ab und schreibt die brauchbare Antwort', async () => {
  const calls = [];
  const feed = JSON.stringify({days: [{liveScoreMatches: [{match: {id: 'GUID1', matchID: '202711020901029'}}]}]});
  const fetchFn = async (url, init) => {
    calls.push({url, method: init?.method || 'GET'});
    if (url.includes('livescoreapi')) return new Response(feed, {headers: {'content-type': 'application/json'}});
    if (url.endsWith('matchdetails_vue.js')) return new Response('axios.get("/umbraco/api/matchdetailsinfoapi/GetMatchLiveFeed", {params: {matchId: id}})');
    if (url.includes('GetMatchLiveFeed?matchId=GUID1')) return new Response('{"events":[{"minute":1,"text":"Tor"}]}', {headers: {'content-type': 'application/json'}});
    if (url.includes('/matches/details/')) return new Response('<script src="/assets/js/matchdetails_vue.js"></script>', {headers: {'content-type': 'text/html'}});
    return new Response('', {status: 404});
  };
  assert.equal(await main({env: {}, fetchFn}), 0);
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.ok(calls.some(c => c.url.includes('GetMatchLiveFeed?matchId=GUID1')));
  assert.equal(calls.filter(c => c.url.includes('GetMatchLiveFeed')).length, 1, 'nach dem ersten brauchbaren Treffer keine weiteren Versuche');
});
