// Live-Abfrage: alle 30 Sekunden, nur solange die App sichtbar ist und ein Kadetten-Spiel
// läuft oder bald beginnt. Unsichtbare Seiten pausieren.
import {kickoff, ownGames, hasScore, competitionOf, zurichParts} from './logic.js';

export const LIVE_INTERVAL = 30000;
const BEFORE = 15 * 60000,
  AFTER = 4 * 3600000;

/** Soll gerade live abgefragt werden? */
export function liveWindow({games, live, now}) {
  if (live?.match) return true;
  return ownGames(games).some(g => {
    const at = kickoff(g);
    return !hasScore(g) && at - BEFORE <= now && now <= at + AFTER;
  });
}

export function startLive({
  store,
  doc = globalThis.document,
  now = () => Date.now(),
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout
}) {
  let timer = null,
    polling = false,
    stopped = false;
  const visible = () => !doc || doc.visibilityState !== 'hidden';
  async function tick() {
    timer = null;
    if (stopped || polling || !visible()) return;
    polling = true;
    const {data, live} = store.state;
    try {
      if (liveWindow({games: data?.games, live, now: now()})) await store.refreshLive();
    } finally {
      polling = false;
    }
    if (!stopped && visible()) timer = setTimer(tick, LIVE_INTERVAL);
  }
  const onVisibility = () => {
    if (visible() && !timer) tick();
    if (!visible() && timer) {
      clearTimer(timer);
      timer = null;
    }
  };
  doc?.addEventListener?.('visibilitychange', onVisibility);
  tick();
  return () => {
    stopped = true;
    if (timer) clearTimer(timer);
    doc?.removeEventListener?.('visibilitychange', onVisibility);
  };
}

/** Welche Quelle ist für ein Spiel zuständig: EHL-Spiele die EHF, alle anderen (QHL, Cup, Test) der SHV. */
export const sourceFor = game => (competitionOf(game) === 'EHL' ? 'EHF' : 'SHV');

/** Zeit des bestätigten Quellstands. Ein späterer Abruf eines veralteten Stands ändert diese Zeit nicht. */
export function liveScoreTime({live, liveAt}, game) {
  const source = live?.sources?.[sourceFor(game)];
  const iso = source?.stale ? source.since : live?.checkedAt;
  const time = iso ? Date.parse(iso) : liveAt;
  return Number.isFinite(time) ? zurichParts(time).time : null;
}

export function liveNotice({live, liveError}, game) {
  if (liveError) return 'Live-Daten derzeit nicht erreichbar';
  const name = sourceFor(game);
  return live?.sources?.[name]?.ok === false ? `Live-Daten von ${name} derzeit nicht erreichbar` : null;
}

export function waitingForLive(game, state, now) {
  const start = kickoff(game);
  if (start === null || start > now || now > start + AFTER) return null;
  return liveNotice(state, game) || 'Wartet auf Live-Daten';
}
