// Lesender Zugriff auf den Datendienst kadetten-api. Nie schreibend, nie mit Anmeldedaten.
import {decodeDeep} from './text.js';

export const TIMEOUT = 10000;

export function createApi({origin = '', fetchImpl = globalThis.fetch, timeout = TIMEOUT} = {}) {
  async function get(path, {fresh = false, decode = true} = {}) {
    if (typeof path !== 'string' || !path.startsWith('/api/') || path.includes('..')) throw Error('Ungültiger API-Pfad');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetchImpl(origin + path, {
        method: 'GET',
        credentials: origin ? 'omit' : 'same-origin',
        mode: origin ? 'cors' : 'same-origin',
        cache: fresh ? 'no-store' : 'default',
        headers: {Accept: 'application/json'},
        signal: controller.signal
      });
      if (!response.ok) throw Object.assign(Error(`Datendienst antwortet mit ${response.status}`), {status: response.status});
      if (!/json/.test(response.headers.get('content-type') || '')) throw Error('Datendienst liefert kein JSON');
      const body = await response.json();
      return decode ? decodeDeep(body) : body;
    } finally {
      clearTimeout(timer);
    }
  }
  const id = value => encodeURIComponent(String(value));
  return {
    get,
    data: () => get('/api/data'),
    // Live-Antworten kommen nie aus einem Cache.
    live: () => get('/api/live', {fresh: true}),
    report: gameId => get('/api/reports/' + id(gameId)),
    ehfReport: gameId => get('/api/ehf-reports/' + id(gameId)),
    headToHead: (home, away) => get('/api/head-to-head?home=' + id(home) + '&away=' + id(away)),
    recentGames: team => get('/api/recent-games?team=' + id(team)),
    preview: gameId => get('/api/previews/kadetten/' + id(gameId)),
    programme: gameId => get('/api/programmes/' + id(gameId)),
    // Artikel-HTML bleibt unverändert und läuft durch sanitize.js.
    article: (storyId, version) => get('/api/articles/' + id(storyId) + (version ? '?v=' + id(version) : ''), {decode: false})
  };
}
