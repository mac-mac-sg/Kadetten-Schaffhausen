import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DECK, ARTS, rarityOf, earned, pending, claim, collection, progress, momentCard, cardById, noteLive, liveSeen} from '../src/kadetten/js/sammeln.js';
import {FIXED_CARDS} from '../src/kadetten/data/sammelkarten.js';
import {weeklyQuiz, weekIndex, inWeek, QUIZ_SIZE} from '../src/kadetten/js/quiz.js';
import {quizBilanz} from '../src/kadetten/js/views/sammlung.js';

const OWN = 'Kadetten Schaffhausen';
const memory = () => {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)};
};
const game = (id, home, away, score) => ({id, date: '2026-11-01', time: '18:00', home, away, league: 'QHL', ...(score ? {score} : {})});
const base = {games: [], answers: {}, visited: [], tips: {}, live: [], favourite: null};

test('Kartenstapel: über 100 Karten, eindeutige IDs, jede Art mit Seltenheit, Pflichtfelder', () => {
  assert.ok(DECK.length >= 100, String(DECK.length));
  assert.equal(new Set(DECK.map(c => c.id)).size, DECK.length);
  const arts = new Set(ARTS.map(([id]) => id));
  for (const c of DECK) {
    assert.ok(arts.has(c.art), c.id);
    assert.ok(c.title && c.kicker && c.big, c.id);
    assert.ok(['standard', 'spezial', 'legende'].includes(rarityOf(c)), c.id);
    if (c.image) assert.match(c.image, /^(assets\/|https:\/\/kadettensh\.ch\/)/, c.id);
  }
  for (const c of FIXED_CARDS) assert.ok(c.text && c.src, c.id);
  assert.equal(DECK.filter(c => c.id.startsWith('m-')).length, 15);
  assert.equal(DECK.filter(c => c.id.startsWith('c-')).length, 11);
});

test('Kartentexte: Titeljahre wie im Trophäenschrank, keine erfundenen Superlative', async () => {
  const {TROPHIES} = await import('../src/kadetten/data/club.js');
  const years = id => TROPHIES.find(t => t.id === id).years.map(String);
  assert.deepEqual(DECK.filter(c => c.id.startsWith('m-')).map(c => c.big), years('master'));
  assert.deepEqual(DECK.filter(c => c.id.startsWith('c-')).map(c => c.big), years('cup'));
  const text = readFileSync(new URL('../src/kadetten/data/sammelkarten.js', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /Rekordmeister|bester Spieler aller Zeiten/);
});

test('Belohnungen: Willkommen, Quiz, 5 von 5, Hallenbesuch, Tipp, live', () => {
  const now = Date.parse('2026-11-18T12:00:00+01:00'),
    week = weekIndex(now),
    quiz = weeklyQuiz(now);
  const g = game('7', OWN, 'Pfadi Winterthur', [31, 27]);
  const list = earned({
    ...base,
    games: [g],
    answers: {[week]: quiz.questions.map(q => q.c), [week - 1]: [0, 1]},
    visited: ['7'],
    tips: {7: [31, 27]},
    live: ['9']
  }).map(r => r.key);
  assert.deepEqual(list, ['willkommen', 'quiz:' + week, 'quiz5:' + week, 'halle:7', 'tipp:7', 'exakt:7', 'live:9']);
  const away = earned({...base, games: [game('8', 'BSV Bern', OWN, [20, 30])], visited: ['8']}).map(r => r.key);
  assert.deepEqual(away, ['willkommen'], 'Moment nur für Heimspiele');
});

test('Einlösen: jede Belohnung einmal, keine Doppelten, Moment-Karte aus dem Spielplan', () => {
  const s = memory(),
    g = game('7', OWN, 'Pfadi Winterthur', [31, 27]);
  const input = {...base, games: [g], visited: ['7'], favourite: 10};
  let i = 0;
  const rng = () => (i++ * 0.37) % 1;
  const fresh = claim(input, {s, now: 1, rng});
  assert.ok(fresh.includes('k-10') && fresh.includes('g-roots') && fresh.includes('o-arena') && fresh.includes('mo-7'));
  assert.equal(fresh.length, 5);
  assert.equal(new Set(fresh).size, fresh.length);
  assert.deepEqual(claim(input, {s, now: 2, rng}), []);
  assert.equal(pending(input, s).length, 0);
  assert.equal(cardById('mo-7', [g]).big, '31:27');
  assert.equal(momentCard(game('9', OWN, 'X')), null);
  const p = progress(s);
  assert.equal(p.have, 4);
  assert.equal(p.moments, 1);
});

test('Einlösen bis zur vollen Sammlung: nie doppelt, danach keine weiteren Karten', () => {
  const s = memory(),
    answers = {};
  for (let w = 0; w < 80; w++) answers[2900 + w] = [0, 0, 0, 0, 0];
  claim({...base, answers}, {s, rng: Math.random});
  const {cards} = collection(s);
  assert.equal(Object.keys(cards).length, DECK.length);
  assert.equal(progress(s).have, DECK.length);
});

test('Live dabei: jedes Spiel einmal vermerkt', () => {
  const s = memory();
  assert.equal(noteLive('508393', s), true);
  assert.equal(noteLive('508393', s), false);
  assert.equal(noteLive('<x>', s), false);
  assert.deepEqual(liveSeen(s), ['508393']);
});

test('Quiz-Bilanz: Serie bis zur aktuellen oder letzten Woche, Quote, Wochen ohne Fehler', () => {
  const now = Date.parse('2026-11-18T12:00:00+01:00'),
    w = weekIndex(now);
  const right = week => weeklyQuiz(inWeek(week)).questions.map(q => q.c);
  const wrong = week => right(week).map(c => (c + 1) % 4);
  assert.deepEqual(quizBilanz({}, now), {streak: 0, quote: null, perfect: 0, weeks: 0});
  const b = quizBilanz({[w - 1]: right(w - 1), [w - 2]: wrong(w - 2), [w - 4]: right(w - 4)}, now);
  assert.equal(b.streak, 2);
  assert.equal(b.perfect, 2);
  assert.equal(b.quote, Math.round((10 / 15) * 100), 'ältere Wochen zählen mit fünf Fragen');
  // Ab dieser Woche drei Fragen; gemischt mit einer alten Woche.
  const c = quizBilanz({[w]: right(w), [w - 1]: right(w - 1)}, now);
  assert.equal(right(w).length, QUIZ_SIZE);
  assert.deepEqual(c, {streak: 2, quote: 100, perfect: 2, weeks: 2});
});

test('Neue Karten als Fächer: verdeckt ausgeteilt, aufgedeckte Karten offen, am Ende aufgefächert', async () => {
  const {renderNeu} = await import('../src/kadetten/js/views/sammlung.js');
  const state = {data: {games: []}};
  const cards = ['k-10', 'g-roots', 'o-arena'];
  const closed = String(renderNeu({state, ui: {newCards: cards, revealed: [], enter: true}}));
  assert.match(closed, /class="fan fn-3 deal"/);
  assert.equal((closed.match(/data-reveal="/g) || []).length, 3);
  assert.match(closed, /data-reveal-all/);
  assert.doesNotMatch(closed, /is-open/);
  const one = String(renderNeu({state, ui: {newCards: cards, revealed: ['k-10']}}));
  assert.equal((one.match(/ is-open/g) || []).length, 1);
  const all = String(renderNeu({state, ui: {newCards: cards, revealed: cards}}));
  assert.match(all, /class="fan fn-3 spread"/);
  const top = String(renderNeu({state, ui: {newCards: cards, revealed: cards, fanTop: 'g-roots'}}));
  assert.equal((top.match(/ is-top/g) || []).length, 1);
  assert.match(top, /data-reveal="g-roots"[^>]*>|is-top" data-reveal="g-roots"/);
  assert.match(top, /Wischen oder antippen holt eine Karte nach vorne/);
  assert.doesNotMatch(all, /data-reveal-all/);
  assert.match(String(renderNeu({state, ui: {}})), /keine neuen Karten/);
});

test('Kartenansicht: Vorder- und Rückseite liegen für die Drehung übereinander', async () => {
  const {renderKarte} = await import('../src/kadetten/js/views/sammlung.js');
  globalThis.localStorage = memory();
  claim({...base, favourite: 10}, {rng: () => 0});
  const out = String(renderKarte({route: {id: 'k-10'}, state: {data: {games: []}}, ui: {flip: 'k-10'}}));
  assert.match(out, /class="sk-flip lg is-back"/);
  assert.equal((out.match(/class="sk-face/g) || []).length, 2);
  assert.match(out, /data-flipcard="k-10" role="button" tabindex="0" aria-pressed="true"/);
  delete globalThis.localStorage;
});
