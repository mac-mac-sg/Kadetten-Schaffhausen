// Live-Abfrage: alle 30 Sekunden, nur solange die App sichtbar ist und ein Kadetten-Spiel
// läuft oder bald beginnt. Unsichtbare Seiten pausieren.
import {kickoff, ownGames, hasScore, competitionOf} from './logic.js';

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

/** Welche Quelle ist für ein Spiel zuständig: EHL-Spiele die EHF, alle anderen (QHL, Cup, Test) der SHV. */
export const sourceFor = game => (competitionOf(game) === 'EHL' ? 'EHF' : 'SHV');

const clock = iso => new Date(iso).toLocaleTimeString('de-CH', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich'});

/** Hinweistext zum Live-Stand oder null, wenn alles in Ordnung ist. Wertet auch die Quellen des Datendiensts aus:
 * Ein Ausfall der zuständigen Quelle ist etwas anderes als «kein Spiel» und wird so gemeldet. */
export function liveNotice({live, liveError}, game) {
  if (liveError)
    return live
      ? 'Live-Stand im Moment nicht erreichbar. Es gilt der letzte bekannte Stand.'
      : 'Live-Stand im Moment nicht erreichbar. Der Abruf wird alle 30 Sekunden wiederholt.';
  const name = sourceFor(game),
    source = live?.sources?.[name];
  if (!source || source.ok !== false) return null;
  return source.stale
    ? `Die Quelle ${name} antwortet nicht. Angezeigt wird der Stand von ${clock(source.since)} Uhr.`
    : `Die Quelle ${name} antwortet im Moment nicht. Der Abruf wird alle 30 Sekunden wiederholt.`;
}
