import test from 'node:test';
import assert from 'node:assert/strict';
import {matchUrls, findEndpoints, scriptSources, preview, contextAround, findFeedMatch, candidateCalls, describeShape, findKeys, valueAt, findFeedItem, withoutImages, feedOverview, loadSnippets, TICKER_NEEDLES, tickerProbeUrls} from '../scripts/lib/ehf-source-check.mjs';
import {main} from '../scripts/ehf-source-check.mjs';

test('Adressen: die drei Quellen enthalten die Spiel-ID', () => {
  const urls = matchUrls('202711020901029');
  assert.equal(urls.length, 4);
  assert.equal(urls[3], 'https://ticker.ehf.eu/v3/202711020901029');
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
  const calls = candidateCalls('202711020901029');
  assert.ok(calls.includes('https://ehfel.eurohandball.com/umbraco/api/matchdetailsinfoapi/GetMatchLiveFeed?matchId=202711020901029'));
  assert.ok(!calls.some(c => c.includes('GUID1')), 'die Kennung aus dem Feed ist keine Spiel-ID');
  assert.ok(calls.includes('https://ehfel.eurohandball.com/umbraco/api/matchdetailapi/GetMatchDetails?id=202711020901029'));
  assert.ok(calls.every(c => c.startsWith('https://ehfel.eurohandball.com/umbraco/api/')));
  assert.equal(candidateCalls('5').length, 9);
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
    if (url.includes('GetMatchLiveFeed?matchId=202711020901029')) return new Response('{"events":[{"minute":1,"text":"Tor"}]}', {headers: {'content-type': 'application/json'}});
    if (url.includes('/matches/details/')) return new Response('<script src="/assets/js/matchdetails_vue.js"></script>', {headers: {'content-type': 'text/html'}});
    return new Response('', {status: 404});
  };
  assert.equal(await main({env: {}, fetchFn}), 0);
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.ok(calls.some(c => c.url.includes('GetMatchLiveFeed?matchId=202711020901029')));
  assert.equal(calls.filter(c => c.url.includes('GetMatchLiveFeed')).length, 1, 'nach dem ersten brauchbaren Treffer keine weiteren Versuche');
});

test('Skript startet als Programm ohne Initialisierungsfehler (Netzwerk gesperrt)', async () => {
  const {spawnSync} = await import('node:child_process');
  const r = spawnSync(process.execPath, ['scripts/ehf-source-check.mjs'], {encoding: 'utf8', env: {...process.env, HTTPS_PROXY: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9', NODE_USE_ENV_PROXY: '1'}, timeout: 60000});
  assert.doesNotMatch(r.stderr + r.stdout, /ReferenceError|before initialization/);
});

test('describeShape und findKeys zeigen Aufbau und Schlüssel zu Form und Ereignissen', () => {
  const json = {matchDetails: {details: {matchID: '1'}, lastMatches: [{home: 'a', score: 3}], headToHead: null}, actions: [{minute: 1}]};
  const shape = describeShape(json, 2);
  assert.ok(shape.includes('matchDetails: Objekt'));
  assert.ok(shape.includes('matchDetails.lastMatches: Liste(1)'));
  assert.ok(shape.includes('actions: Liste(1)'));
  const keys = findKeys(json, /last|head|action/i);
  assert.ok(keys.includes('matchDetails.lastMatches: Liste(1)'));
  assert.ok(keys.includes('matchDetails.headToHead: null'));
  assert.ok(keys.includes('actions: Liste(1)'));
  assert.deepEqual(findKeys(null, /x/), []);
});

test('valueAt liest Pfade mit Listenindex und liefert undefined, wenn etwas fehlt', () => {
  const json = {matchDetails: {details: {homeTeam: {players: [{person: {lastName: 'A'}, goals: 3}]}}}, euroStatistics: {x: 1}};
  assert.equal(valueAt(json, 'matchDetails.details.homeTeam.players[0].goals'), 3);
  assert.deepEqual(valueAt(json, 'euroStatistics'), {x: 1});
  assert.equal(valueAt(json, 'matchDetails.details.guestTeam.players[0]'), undefined);
  assert.equal(valueAt(json, 'matchDetails.details.homeTeam.players[5]'), undefined);
  assert.equal(valueAt(null, 'a'), undefined);
});

test('Feed-Eintrag eines Spiels: ohne Bild-Adressen, Tagesübersicht mit Statusfeldern', () => {
  const feed = {days: [
    {dayDatumFormatted: '2026-10-06', liveScoreMatches: [{match: {matchID: '1', homeTeam: {fullName: 'A', logoBig: 'https://x/img', photos: {big: 'https://x/p'}}}, matchStats: {isLive: false, time: '60:00', phase: 'Finished'}, homeStats: {totalGoals: 30}}]},
    {dayDatumFormatted: '2026-10-05', liveScoreMatches: []}
  ]};
  const item = findFeedItem(feed, '1');
  assert.equal(item.homeStats.totalGoals, 30);
  assert.equal(findFeedItem(feed, '2'), null);
  const text = withoutImages(item);
  assert.match(text, /"fullName":"A"/);assert.match(text, /"phase":"Finished"/);assert.doesNotMatch(text, /logoBig|photos|https:\/\/x/);
  assert.deepEqual(feedOverview(feed), [{date: '2026-10-06', matches: 1, firstStats: {isLive: false, time: '60:00', phase: 'Finished'}}, {date: '2026-10-05', matches: 0, firstStats: null}]);
  assert.deepEqual(feedOverview(null), []);
});

test('loadSnippets findet Stellen, an denen eine Seite Daten nachlädt, und begrenzt die Anzahl', () => {
  const js = 'var a=1;$.getJSON("/v3/data/match.json?id="+id);new WebSocket("wss://ticker.ehf.eu/hub");fetch("/api/events")';
  const found = loadSnippets(js);
  assert.ok(found.some(x => x.startsWith('.json:') && x.includes('/v3/data/match.json')));
  assert.ok(found.some(x => x.startsWith('WebSocket:')));
  assert.ok(found.some(x => x.startsWith('fetch(:')));
  assert.equal(loadSnippets(js, ['a'], 5, 3, 2).length, 2);
  assert.deepEqual(loadSnippets('nichts'), []);
});

test('Ticker-Erkundung: Stichwörter und Probe-Adressen mit der Spiel-ID, nur ticker.ehf.eu', () => {
  assert.ok(TICKER_NEEDLES.includes('$.post(') && TICKER_NEEDLES.includes('iBall'));
  const urls = tickerProbeUrls('202711020901029');
  assert.deepEqual(urls, ['https://ticker.ehf.eu/iBall/Static/202711020901029', 'https://ticker.ehf.eu/iBall/StaticGoal/202711020901029']);
  const js = 'x=1;$.post("/v3/Ticker/Events",{id:i});var u={url:"/iBall/Static/"}';
  const found = loadSnippets(js, TICKER_NEEDLES, 4, 80, 40);
  assert.ok(found.some(x => x.startsWith('$.post(:') && x.includes('/v3/Ticker/Events')));
  assert.ok(found.some(x => x.startsWith('iBall:')));
});
