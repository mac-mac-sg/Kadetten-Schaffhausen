// Live-Ticker für Spiele der European League: holt den EHF-Ticker (ticker.ehf.eu/v3, 200–450 KB) und gibt nur die Ereignisse
// weiter (Tore, Siebenmeter, Zeitstrafen, Auszeiten). Eigener Endpunkt GET /api/ehf-live/<Spiel-ID>, damit ein Ausfall oder die
// Rechenzeitgrenze des Workers nur den Ticker trifft, nie den Live-Stand (/api/live). Je Spiel 20 Sekunden zwischengespeichert.
import {parseTicker, liveTickerEvents} from './ehf-ticker.mjs';
import {EHF_MATCH_ID_PREFIX} from './season.mjs';

export const EHF_TICKER_URL = 'https://ticker.ehf.eu/v3/TickerData';
const TTL = 20000;
const cache = new Map();

const json = (x, status = 200) =>
  new Response(JSON.stringify(x), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});

export const validEhfMatchId = id => new RegExp('^' + EHF_MATCH_ID_PREFIX + '\\d{9}$').test(String(id || ''));

export async function fetchEhfLiveEvents(matchId, fetchFn = fetch) {
  const r = await fetchFn(EHF_TICKER_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: 'https://ticker.ehf.eu',
      Referer: 'https://ticker.ehf.eu/v3/' + matchId
    },
    body: new URLSearchParams({MatchID: matchId}),
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) throw Error('EHF ticker unavailable');
  return liveTickerEvents(parseTicker(await r.json()));
}

export function resetEhfLive() {
  cache.clear();
}

export async function ehfLiveRoute(request, env, u, {fetchFn = fetch, now = Date.now} = {}) {
  if (request.method !== 'GET') return json({error: 'GET required'}, 405);
  const id = u.pathname.split('/').at(-1);
  if (!/^\/api\/ehf-live\/[0-9]{15}$/.test(u.pathname) || !validEhfMatchId(id)) return json({error: 'Invalid match'}, 400);
  const hit = cache.get(id);
  if (hit && now() - hit.at < TTL) return json(hit.value);
  try {
    const value = {ok: true, updatedAt: new Date(now()).toISOString(), events: await fetchEhfLiveEvents(id, fetchFn)};
    cache.set(id, {at: now(), value});
    if (cache.size > 20) cache.delete(cache.keys().next().value);
    return json(value);
  } catch {
    // Letzter gültiger Stand bleibt als verzögert markiert nutzbar.
    return hit ? json({...hit.value, ok: false}) : json({ok: false, events: null}, 503);
  }
}
