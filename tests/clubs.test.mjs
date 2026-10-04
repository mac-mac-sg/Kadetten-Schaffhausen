import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const source = fs.readFileSync('src/client/js/clubs.js', 'utf8');
function app(url, saved, storageFails = false) {
  const {document} = parseHTML(fs.readFileSync('src/client/index.html', 'utf8'));
  const location = {href: url, hash: new URL(url).hash};
  const store = new Map([['fan-app-active-club-v1', saved]]);
  let renders = 0, polls = 0;
  const context = vm.createContext({document, location, URL, localStorage: {
    getItem: key => { if (storageFails) throw Error('unavailable'); return store.get(key); },
    setItem: (key, value) => { if (storageFails) throw Error('unavailable'); store.set(key, value); }
  }, history: {replaceState: (_, __, href) => {location.href = href; location.hash = new URL(href).hash;}},
    liveTimer: 0, dayTimer: 0, highlightObserver: null, clearTimeout() {}, clearInterval() {}, competition: 'QHL', render() {renders++;}, window: {scrollTo() {}},
    appFeedback() {}, checkLiveMatch() {polls++;}, ext: (url, label) => `<a href="${url}">${label}</a>`
  });
  document.getElementById('app').focus = () => {};
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  return {run, document, store, location, counts: () => [renders, polls]};
}
test('Vereinswahl: Kadetten als Standard, gespeichert und per teilbarem Link', () => {
  for (const [url, saved, expected] of [
    ['https://example.test/', null, 'kadetten'],
    ['https://example.test/', 'fcsg', 'fcsg'],
    ['https://example.test/?club=kadetten', 'fcsg', 'kadetten'],
    ['https://example.test/?club=fcsg', null, 'fcsg'],
    ['https://example.test/?club=other', null, 'kadetten'],
    ['https://example.test/?club=__proto__', null, 'kadetten']
  ]) {
    const a = app(url, saved); a.run('restoreActiveClub()'); assert.equal(a.run('activeClub'), expected);
  }
  const a = app('https://example.test/?club=fcsg', null, true);
  a.run('restoreActiveClub()'); assert.equal(a.run('activeClub'), 'fcsg');
});
test('Wechsel bewahrt Bereiche, setzt Details zurück und pollt nur für Kadetten', () => {
  for (const [hash, next] of [['#home','#home'], ['#season/table','#season/table'], ['#season/games','#season/games'], ['#season/squad','#season/squad'], ['#match/stgallen/stats','#season/games'], ['#player/7','#season/squad'], ['#news/34300','#home'], ['#club','#club']]) {
    const a = app('https://example.test/app/?extra=keep' + hash);
    a.run("switchClub('fcsg')");
    assert.equal(a.location.hash, next);
    assert.equal(new URL(a.location.href).searchParams.get('extra'), 'keep');
    assert.equal(a.store.get('fan-app-active-club-v1'), 'fcsg');
    assert.deepEqual(a.counts(), [1, 0]);
    a.run("switchClub('kadetten')"); assert.deepEqual(a.counts(), [2, 1]);
  }
  const a = app('https://example.test/', null, true);
  assert.doesNotThrow(() => a.run("switchClub('fcsg')"));
});
test('Header, Titel und FCSG-Seiten enthalten keine fremden Vereinsdaten', () => {
  const a = app('https://example.test/?club=fcsg');
  a.run('restoreActiveClub(); updateClubHeader()');
  assert.equal(a.document.documentElement.dataset.club, 'fcsg');
  assert.match(a.document.querySelector('.brand').textContent, /FC ST. GALLEN/);
  assert.match(a.document.getElementById('club-switch').getAttribute('aria-label'), /Kadetten/);
  for (const [page, id] of [['home',''], ['season','games'], ['season','table'], ['season','squad'], ['club','']]) {
    const html = a.run(`fcsgView('${page}', '${id}')`);
    assert.match(html, /Datenanbindung folgt/);
    assert.doesNotMatch(html, /undefined|NaN|Quickline|Strafminuten|Rikhardsson/);
  }
  a.run("activeClub='kadetten'; updateClubHeader()");
  assert.equal(a.document.documentElement.dataset.club, 'kadetten');
  assert.match(a.document.querySelector('.brand').textContent, /KADETTEN/);
});
