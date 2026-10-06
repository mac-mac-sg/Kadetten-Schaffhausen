import {programmes} from './programmes.mjs';
import {previews} from './previews.mjs';
import {publicFcsgData, getFcsgLive, getFcsgPlayers} from './fcsg.mjs';
import fcsgSeed from './fcsg-seed.json' with {type: 'json'};
import {publicReadCors} from './cors.mjs';
import {isOwner, mayUpdate} from './auth.mjs';
import {getLiveMatch, getRecentGames, getHeadToHead, getArchivedReport} from './live.mjs';
import seed from './seed.json' with {type: 'json'};
import {runRefresh} from './refresh-run.mjs';
import {kvStore} from './kv-store.mjs';

const json = (x, status = 200) =>
  new Response(JSON.stringify(x), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
const getRequired = () => json({error: 'GET required'}, 405);
const MAX_BODY = 12000000;

// Speicher: Auf Sites stellt die Plattform R2 als `BUCKET` bereit, auf Cloudflare Workers KV als `DATA`.
const withStore = env => (env.BUCKET || !env.DATA ? env : {...env, BUCKET: kvStore(env.DATA)});
// Statische Dateien liefert auf Sites die Plattform (`ASSETS`), auf Cloudflare GitHub Pages; dort gibt es sie hier nicht.
const staticAsset = (request, env) =>
  env.ASSETS ? env.ASSETS.fetch(request) : json({error: 'Not found'}, 404);

// Jede Route ist eine Funktion (request, env, url) -> Response. Die Reihenfolge in `routes` entspricht der
// Auswertungsreihenfolge; die erste passende Route gewinnt. Alles andere liefert die statische Oberfläche.

// Spielstand-Snapshot aus dem Speicher; ohne gespeicherten Stand der mitgelieferte Start-/Notfallstand.
async function loadSnapshot(env) {
  const saved = await env.BUCKET.get('kadetten/current.json');
  return saved ? await saved.json() : seed;
}

async function adminLogin(request, env) {
  if (request.method !== 'GET') return getRequired();
  if (!(await isOwner(request, env))) return json({error: 'Owner login required'}, 403);
  return new Response(null, {status: 303, headers: {Location: '/', 'Cache-Control': 'no-store'}});
}

async function fcsgPlayers(request) {
  if (request.method !== 'GET') return getRequired();
  try {
    return json(await getFcsgPlayers());
  } catch {
    return json({ok: false, error: 'FCSG player source unavailable'}, 503);
  }
}

async function fcsgLive(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  const id = u.pathname === '/api/fcsg/live' ? undefined : u.pathname.split('/').at(-1);
  if (id !== undefined && !/^\/api\/fcsg\/matches\/[1-9][0-9]{0,8}$/.test(u.pathname))
    return json({error: 'Invalid match'}, 400);
  try {
    return json(await getFcsgLive(id));
  } catch {
    return json({ok: false, error: 'FCSG live source unavailable'}, 503);
  }
}

async function fcsgData(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  const saved = await env.BUCKET.get('fcsg/current.json');
  const data = saved ? await saved.json() : fcsgSeed;
  if (u.pathname === '/api/fcsg/data') return json(publicFcsgData(data));
  const story = data.stories.find(n => n.id === u.pathname.split('/').at(-1));
  return story ? json({id: story.id, html: story.html, url: story.url}) : json({error: 'Article not found'}, 404);
}

async function access(request, env) {
  if (request.method !== 'GET') return getRequired();
  return json({canUpdate: await isOwner(request, env)});
}

async function headToHead(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  try {
    return json(await getHeadToHead(u.searchParams.get('home'), u.searchParams.get('away')));
  } catch {
    return json({ok: false, error: 'Duel history unavailable'}, 503);
  }
}

async function recentGames(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  try {
    return json(await getRecentGames(u.searchParams.get('team')));
  } catch {
    return json({ok: false, error: 'Recent results unavailable'}, 503);
  }
}

async function reports(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  const id = u.pathname.slice('/api/reports/'.length);
  if (!/^(?:staefa|stgallen|[1-9][0-9]{0,8})$/.test(id)) return json({error: 'Invalid report'}, 400);
  try {
    return json(await getArchivedReport(id, env.BUCKET));
  } catch {
    return json({ok: false, error: 'Final report unavailable'}, 503);
  }
}

async function live(request) {
  if (request.method !== 'GET') return getRequired();
  try {
    return json(await getLiveMatch());
  } catch {
    return json({ok: false, match: null, error: 'Live source unavailable'}, 503);
  }
}

async function articles(request, env, u) {
  if (request.method !== 'GET') return getRequired();
  let id;
  try {
    id = decodeURIComponent(u.pathname.slice('/api/articles/'.length));
  } catch {
    return json({error: 'Invalid article'}, 400);
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return json({error: 'Invalid article'}, 400);
  const story = (await loadSnapshot(env)).stories.find(n => String(n.id) === id);
  if (!story) return json({error: 'Article not found'}, 404);
  const version = u.searchParams.get('v') || story.articleVersion;
  if (!/^[a-f0-9]{64}$/.test(version || '')) return json({error: 'Full article not stored yet'}, 404);
  const body = await env.BUCKET.get('kadetten/articles/' + id + '/' + version + '.json');
  if (!body) return json({error: 'Full article unavailable'}, 404);
  return json(await body.json());
}

async function data(request, env) {
  if (request.method !== 'GET') return getRequired();
  return json(await loadSnapshot(env));
}

// Nur für den Eigentümer und die autorisierte Automation. Reihenfolge der Prüfungen: Methode, Berechtigung,
// Herkunft, Grösse, JSON; erst danach wird der Datenstand aktualisiert und gespeichert.
async function refreshData(request, env, u) {
  if (request.method !== 'POST') return json({error: 'POST required'}, 405);
  if (!(await mayUpdate(request, env))) return json({error: 'Owner authorization required'}, 403);
  const origin = request.headers.get('Origin');
  if (origin && origin !== u.origin) return json({error: 'Origin rejected'}, 403);
  const previousObject = await env.BUCKET.get('kadetten/current.json');
  const previous = previousObject ? await previousObject.json() : seed;
  const body = await request.text();
  if (body.length > MAX_BODY) return json({error: 'Payload too large'}, 413);
  let supplied;
  try {
    supplied = body ? JSON.parse(body) : {};
  } catch {
    return json({error: 'Invalid JSON body'}, 400);
  }
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied))
    return json({error: 'JSON object required'}, 400);
  const result = await runRefresh(env.BUCKET, {previous, hadPrevious: !!previousObject, supplied});
  if (!result.ok) return json({error: 'All sources failed', status: result.next.status}, 502);
  const {next} = result;
  return json({
    fcsg: result.fcsg,
    checkedAt: next.checkedAt,
    status: next.status,
    games: next.games.length,
    news: next.stories.length,
    reports: result.reports
  });
}

// Service Worker und Manifest müssen immer frisch geprüft werden.
async function freshAsset(request, env, u) {
  if (!env.ASSETS) return json({error: 'Not found'}, 404);
  const asset = await env.ASSETS.fetch(request);
  const response = new Response(asset.body, asset);
  response.headers.set('Cache-Control', 'no-cache');
  if (u.pathname === '/sw.js') {
    response.headers.set('Content-Type', 'application/javascript');
    response.headers.set('Service-Worker-Allowed', '/');
  } else response.headers.set('Content-Type', 'application/manifest+json');
  return response;
}

const isPath = path => u => u.pathname === path;
const isUnder = prefix => u => u.pathname.startsWith(prefix);
const routes = [
  [u => u.pathname === '/api/programmes' || u.pathname.startsWith('/api/programmes/'), programmes],
  [u => u.pathname === '/api/previews' || u.pathname.startsWith('/api/previews/'), previews],
  [isPath('/admin/login'), adminLogin],
  [isPath('/api/fcsg/players'), fcsgPlayers],
  [u => u.pathname === '/api/fcsg/live' || u.pathname.startsWith('/api/fcsg/matches/'), fcsgLive],
  [u => u.pathname === '/api/fcsg/data' || /^\/api\/fcsg\/articles\/[0-9]+$/.test(u.pathname), fcsgData],
  [isPath('/api/access'), access],
  [isPath('/api/head-to-head'), headToHead],
  [isPath('/api/recent-games'), recentGames],
  [isUnder('/api/reports/'), reports],
  [isPath('/api/live'), live],
  [isUnder('/api/articles/'), articles],
  [isPath('/api/data'), data],
  [isPath('/api/refresh'), refreshData],
  [u => u.pathname === '/sw.js' || u.pathname === '/manifest.webmanifest', freshAsset]
];

async function route(request, env) {
  const u = new URL(request.url);
  try {
    for (const [matches, handler] of routes) if (matches(u)) return await handler(request, env, u);
    return staticAsset(request, env);
  } catch (e) {
    console.error('Worker error', request.method, u.pathname, e?.message || e);
    return json({error: 'Update or storage unavailable'}, 503);
  }
}

export default {
  async fetch(request, env) {
    return publicReadCors(await route(request, withStore(env)), request);
  }
};
