import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lädt alle Oberflächen-Skripte (ausser dem Startcode) in eine einfache Browser-Attrappe
// und baut die Ansichten mit dem mitgelieferten Datenstand. Fängt Tippfehler und
// kaputte Vorlagen ab, ohne einen Browser zu brauchen.
const html = fs.readFileSync('src/client/index.html', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)/g)]
  .map(m => m[1])
  .filter(s => (s.startsWith('js/') || s.startsWith('data/') || s === 'enhancements.js') && s !== 'js/main.js');
const noop = () => {};
const fakeElement = () => ({classList: {toggle: noop, add: noop, remove: noop}, style: {}, dataset: {}, setAttribute: noop});
const location = {hash: '', href: 'https://example.test/Kadetten/'};
const context = {
  location,
  navigator: {onLine: true},
  document: {
    hidden: false,
    body: fakeElement(),
    documentElement: fakeElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: noop
  },
  window: {addEventListener: noop, scrollTo: noop, scrollY: 0},
  localStorage: {getItem: () => null, setItem: noop},
  setInterval: () => 0,
  setTimeout: () => 0,
  clearTimeout: noop,
  clearInterval: noop,
  requestAnimationFrame: noop,
  cancelAnimationFrame: noop,
  fetch: () => Promise.reject(new Error('offline')),
  apiFetch: () => Promise.reject(new Error('offline')),
  console
};
vm.createContext(context);
for (const file of scripts) vm.runInContext(fs.readFileSync('src/client/' + file, 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);
const view = code => {
  const out = run(code);
  assert.equal(typeof out, 'string');
  assert.doesNotMatch(out, /undefined|NaN|\[object /, 'Ansicht enthält einen Platzhalter-Fehler: ' + out.match(/.{40}(undefined|NaN|\[object ).{20}/s)?.[0]);
  return out;
};

test('Startseite zeigt alle Nachrichten mit Titel', () => {
  const out = view('home()');
  assert.match(out, /story-feed/);
  for (const story of run('stories.slice(0, 5)')) assert.ok(out.includes(story.title), story.title);
});

test('Spielplan: Karten für gespielte Spiele mit Ergebnis-Zustand', () => {
  const out = view("season('games')");
  assert.ok((out.match(/class="game-card/g) || []).length >= 10);
  assert.match(out, /game-result-label">Sieg</);
  assert.match(out, /result-win/);
});

test('Tabelle und Kader', () => {
  assert.match(view("season('table')"), /Kadetten Schaffhausen/);
  const squad = view("season('squad')");
  assert.equal((squad.match(/class="player-card"/g) || []).length, run('players.length'));
  assert.match(squad, /Rikhardsson/);
});

test('Spielerprofil für jeden Spieler im Kader', () => {
  for (const [id, name] of run('players')) assert.ok(view(`profile(${id})`).includes(name.split(' ').at(-1)), name);
});

test('Spielseite in allen drei Reitern, gespielt und offen', () => {
  const played = run("games.find(g => g.score && g.league === 'QHL').id");
  const open = run('games.find(g => !g.score).id');
  for (const id of [played, open])
    for (const tab of ['overview', 'squad', 'stats'])
      view(`match(games.find(g => g.id === ${JSON.stringify(id)}), ${JSON.stringify(tab)})`);
});

test('Wappen und Fotos laufen über photoUrl auf WebP', () => {
  assert.equal(run("photoUrl('news-34317.jpg')"), 'assets/news-34317.webp');
  assert.equal(run("photoUrl('assets/club-1.png')"), 'assets/club-1.webp');
  assert.equal(run("photoUrl('https://example.test/a.jpg')"), 'https://example.test/a.jpg');
  assert.match(view("season('games')"), /assets\/club-\d+\.webp/);
});
