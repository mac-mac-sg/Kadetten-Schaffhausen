// Sammelkarten: Stapel, Belohnungen und Sammlung. Alles bleibt auf dem Gerät (localStorage), nichts wird übertragen.
// Karten gibt es nur für Dinge, die Fans ohnehin tun: Quiz lösen, in die Halle gehen, tippen, ein Spiel live verfolgen.
// Gezogen wird nur unter fehlenden Karten, darum gibt es keine Doppelten und keinen Tausch.
import {FIXED_CARDS} from '../data/sammelkarten.js';
import {SQUAD} from '../data/squad.js';
import {HISTORY} from '../data/club.js';
import {OWN_TEAM, hasScore, shortTeam, shortDate} from './logic.js';
import {tipPoints} from './moments.js';
import {weekResult} from './quiz.js';
import {storage} from './storage.js';

export const CARDS_KEY = 'v2:app-cards';
export const LIVE_KEY = 'v2:app-live-seen';

/** Arten in der Reihenfolge der Filter, mit Seltenheit (standard, spezial, legende). */
export const ARTS = [
  ['kader', 'Kader', 'standard'],
  ['geschichte', 'Geschichte', 'standard'],
  ['ort', 'Orte', 'standard'],
  ['titel', 'Titel', 'spezial'],
  ['spiel', 'Spiele', 'spezial'],
  ['legende', 'Legenden', 'legende'],
  ['trainer', 'Trainer', 'legende'],
  ['macher', 'Macher', 'legende'],
  ['moment', 'Momente', 'moment']
];
const RARITY = Object.fromEntries(ARTS.map(([id, , r]) => [id, r]));
export const rarityOf = card => RARITY[card?.art] || 'standard';
export const RARITY_LABEL = {standard: 'Standard', spezial: 'Spezial', legende: 'Legende', moment: 'Moment'};

const squadCards = () =>
  SQUAD.map(p => ({
    id: 'k-' + p.number,
    art: 'kader',
    title: p.name,
    kicker: p.position,
    big: String(p.number),
    number: p.number,
    image: `assets/players/${p.number}.webp`,
    facts: p.facts,
    src: 'kader'
  }));
const historyCards = () =>
  HISTORY.map((h, i) => ({
    id: 'g-' + h.id,
    art: 'geschichte',
    title: h.title,
    kicker: `Kapitel ${i + 1} von ${HISTORY.length}`,
    big: h.nav || h.year,
    text: [h.text, h.detail].filter(Boolean).join(' '),
    // Das Vereinswappen ist kein Archivbild: Die Karte zeigt dann die Jahreszahl.
    image: /^https:|team\.webp$/.test(h.image || '') ? h.image : null,
    src: 'ks'
  }));

/** Alle festen Karten (ohne Momente), in Sammelreihenfolge. */
export const DECK = [
  ...squadCards(),
  ...historyCards(),
  ...FIXED_CARDS.filter(c => c.art === 'ort'),
  ...FIXED_CARDS.filter(c => c.art !== 'ort')
];
const BY_ID = new Map(DECK.map(c => [c.id, c]));

/** Momentkarte eines Kadetten-Spiels aus dem Spielplan (Hallenbesuch). */
export function momentCard(game) {
  if (!game || !hasScore(game)) return null;
  const home = game.home === OWN_TEAM;
  return {
    id: 'mo-' + game.id,
    art: 'moment',
    title: `${shortTeam(game.home)} – ${shortTeam(game.away)}`,
    kicker: `${game.league || ''} · ${home ? 'Heim' : 'auswärts'}`.replace(/^ · /, ''),
    big: `${game.score[0]}:${game.score[1]}`,
    text: `Du warst am ${shortDate(game.date)} in der Halle.`,
    image: 'assets/team.webp',
    game: String(game.id)
  };
}
export function cardById(id, games = []) {
  if (BY_ID.has(id)) return BY_ID.get(id);
  if (String(id).startsWith('mo-')) return momentCard(games.find(g => 'mo-' + g.id === id));
  return null;
}

/** Sammlung: Karten-IDs mit Zeitpunkt und bereits eingelöste Belohnungen. */
export function collection(s = storage()) {
  try {
    const v = JSON.parse(s?.getItem(CARDS_KEY) ?? 'null');
    const ok = id => typeof id === 'string' && /^[a-z]{1,3}-[\w-]{1,80}$/.test(id);
    const cards =
      v && typeof v.cards === 'object' && !Array.isArray(v.cards)
        ? Object.fromEntries(Object.entries(v.cards).filter(([id, at]) => ok(id) && Number.isFinite(at)))
        : {};
    const claimed = Array.isArray(v?.claimed) ? v.claimed.filter(k => typeof k === 'string' && k.length <= 100).slice(-2000) : [];
    return {cards, claimed};
  } catch {
    return {cards: {}, claimed: []};
  }
}
const save = (value, s = storage()) => {
  try {
    s?.setItem(CARDS_KEY, JSON.stringify(value));
  } catch {}
};

/** Laufendes Kadetten-Spiel gesehen (für die Belohnung «Live dabei»). */
export function liveSeen(s = storage()) {
  try {
    const v = JSON.parse(s?.getItem(LIVE_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(-300) : [];
  } catch {
    return [];
  }
}
export function noteLive(id, s = storage()) {
  const list = liveSeen(s),
    key = String(id);
  if (!/^[\w-]{1,80}$/.test(key) || list.includes(key)) return false;
  try {
    s?.setItem(LIVE_KEY, JSON.stringify([...list, key]));
  } catch {}
  return true;
}

/** Belohnungen, die das Gerät verdient hat. Jede hat einen festen Schlüssel und wird nur einmal eingelöst.
 * pick: Anzahl zufälliger Karten und erlaubte Seltenheiten; fixed: bestimmte Karten. */
export function earned({games = [], answers = {}, visited = [], tips = {}, live = [], favourite = null}) {
  const list = [
    {
      key: 'willkommen',
      label: 'Willkommen in deiner Sammlung',
      fixed: [favourite && BY_ID.has('k-' + favourite) ? 'k-' + favourite : null, 'g-roots', 'o-arena'].filter(Boolean),
      pick: favourite ? 0 : 1,
      from: ['standard']
    }
  ];
  for (const [week, given] of Object.entries(answers)) {
    const result = weekResult(week, given);
    if (!result.done) continue;
    list.push({key: 'quiz:' + week, label: 'Quiz der Woche abgeschlossen', pick: 2, from: ['standard', 'spezial', 'legende']});
    // Schlüssel «quiz5» bleibt, damit früher eingelöste Belohnungen nicht doppelt kommen.
    if (result.right === result.size) list.push({key: 'quiz5:' + week, label: 'Quiz ohne Fehler', pick: 1, from: ['spezial', 'legende']});
  }
  const own = games.filter(g => (g.home === OWN_TEAM || g.away === OWN_TEAM) && hasScore(g));
  for (const g of own) {
    const id = String(g.id);
    if (visited.includes(id) && g.home === OWN_TEAM)
      list.push({
        key: 'halle:' + id,
        label: `In der Halle: ${shortTeam(g.away)}`,
        fixed: ['mo-' + id],
        pick: 1,
        from: ['standard', 'spezial', 'legende']
      });
    const points = tipPoints(tips[id], g.score);
    if (points > 0)
      list.push({
        key: 'tipp:' + id,
        label: `Tipp gegen ${shortTeam(g.home === OWN_TEAM ? g.away : g.home)}`,
        pick: 1,
        from: ['standard', 'spezial']
      });
    if (points === 3) list.push({key: 'exakt:' + id, label: 'Tipp exakt richtig', pick: 1, from: ['legende', 'spezial']});
  }
  for (const id of live) list.push({key: 'live:' + id, label: 'Ein Spiel live verfolgt', pick: 1, from: ['standard', 'spezial']});
  return list;
}

export function pending(input, s = storage()) {
  const {claimed} = collection(s);
  return earned(input).filter(r => !claimed.includes(r.key));
}

/** Löst alle offenen Belohnungen ein und gibt die neuen Karten zurück. rng ist austauschbar (Tests). */
export function claim(input, {s = storage(), now = Date.now(), rng = Math.random} = {}) {
  const state = collection(s),
    open = earned(input).filter(r => !state.claimed.includes(r.key)),
    fresh = [];
  const add = id => {
    if (!id || state.cards[id]) return;
    state.cards[id] = now;
    fresh.push(id);
  };
  for (const reward of open) {
    for (const id of reward.fixed || []) if (BY_ID.has(id) || id.startsWith('mo-')) add(id);
    for (let i = 0; i < (reward.pick || 0); i++) {
      // Fehlende Karten der erlaubten Seltenheiten; sind sie alle gesammelt, jede fehlende Karte.
      let pool = DECK.filter(c => !state.cards[c.id] && reward.from.includes(rarityOf(c)));
      if (!pool.length) pool = DECK.filter(c => !state.cards[c.id]);
      if (!pool.length) break;
      add(pool[Math.floor(rng() * pool.length) % pool.length].id);
    }
    state.claimed.push(reward.key);
  }
  save(state, s);
  return fresh;
}

/** Fortschritt je Art und gesamt (Momente zählen extra, sie haben keine feste Zahl). */
export function progress(s = storage()) {
  const {cards} = collection(s);
  const per = Object.fromEntries(ARTS.map(([id]) => [id, {have: 0, total: 0}]));
  for (const c of DECK) {
    per[c.art].total++;
    if (cards[c.id]) per[c.art].have++;
  }
  per.moment.have = Object.keys(cards).filter(id => id.startsWith('mo-')).length;
  const have = DECK.filter(c => cards[c.id]).length;
  return {have, total: DECK.length, per, moments: per.moment.have};
}

/** Zuletzt gesammelte Karten, neueste zuerst. */
export function recent(count, games = [], s = storage()) {
  const {cards} = collection(s);
  return Object.entries(cards)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => cardById(id, games))
    .filter(Boolean)
    .slice(0, count);
}
