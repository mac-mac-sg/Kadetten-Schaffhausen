import {getLiveMatch, getRecentGames} from '../../server/live.mjs';
import {getFcsgLive, getFcsgPlayers} from '../../server/fcsg.mjs';
import {fetchPlayerSeason} from '../../server/shv.mjs';

// Machbarkeitstest für den Umzug auf Cloudflare (docs/cloudflare-umzug.md, Phase 0).
// Ruft die Quellen der App mit dem echten Anwendungscode von Cloudflare aus ab und meldet nur
// Erfolg, Dauer und eine gekürzte Fehlermeldung. Keine Antwortinhalte, keine Geheimnisse.
// Der Test-Worker ist nur für die Dauer des Tests gedacht und wird danach gelöscht.

const plainFetch = async url => {
  const r = await fetch(url, {signal: AbortSignal.timeout(12000), headers: {'User-Agent': 'kadetten-app-probe'}});
  if (!r.ok) throw Error('HTTP ' + r.status);
  return {status: r.status, bytes: (await r.arrayBuffer()).byteLength};
};

export const checks = [
  ['kadettensh.ch Matchcenter (HTML)', () => plainFetch('https://kadettensh.ch/matchcenter/')],
  ['kadettensh.ch News (WordPress-API)', () => plainFetch('https://kadettensh.ch/wp-json/wp/v2/posts?per_page=1')],
  ['SHV handball.ch Live (getLiveMatch)', async () => ({match: !!(await getLiveMatch()).match})],
  ['SHV handball.ch Spielerwerte', async () => (await fetchPlayerSeason(), {ok: true})],
  ['SHV handball.ch Letzte Spiele', async () => (await getRecentGames('Kadetten Schaffhausen'), {ok: true})],
  ['FCSG Spielerdaten (fcsg-api-cdn)', async () => (await getFcsgPlayers(), {ok: true})],
  ['FCSG Live (fcsg-api-cdn)', async () => (await getFcsgLive(), {ok: true})],
  ['fcsg.ch Webseite', () => plainFetch('https://www.fcsg.ch/')]
];

export async function runProbe(list = checks, now = () => Date.now()) {
  return Promise.all(
    list.map(async ([name, run]) => {
      const start = now();
      try {
        return {name, ok: true, ms: now() - start, detail: await run()};
      } catch (e) {
        return {name, ok: false, ms: now() - start, error: String(e?.message || e).slice(0, 200)};
      }
    })
  );
}

const json = (x, status = 200) =>
  new Response(JSON.stringify(x, null, 1), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});

export function createProbe(list = checks) {
  return {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (path !== '/probe') return json({error: 'Not found'}, 404);
      if (request.method !== 'GET') return json({error: 'GET required'}, 405);
      const results = await runProbe(list);
      return json({
        checkedAt: new Date().toISOString(),
        colo: request.cf?.colo ?? null,
        country: request.cf?.country ?? null,
        allOk: results.every(r => r.ok),
        results
      });
    }
  };
}

export default createProbe();
