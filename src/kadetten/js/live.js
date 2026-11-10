// Live-Abfrage: alle 30 Sekunden, nur solange die App sichtbar ist und ein Kadetten-Spiel
// läuft oder bald beginnt. Unsichtbare Seiten pausieren.
import {kickoff, ownGames, hasScore} from './logic.js';

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
    stopped = false;
  const visible = () => !doc || doc.visibilityState !== 'hidden';
  async function tick() {
    timer = null;
    if (stopped || !visible()) return;
    const {data, live} = store.state;
    if (liveWindow({games: data?.games, live, now: now()})) await store.refreshLive();
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
