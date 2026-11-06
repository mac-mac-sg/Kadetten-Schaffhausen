// Zusätzliche Endpunkte der Kadetten Companion App unter /api/app/ (docs/kadetten-app.md, «Datendienst»).
// - GET  /api/app/calendar.ics      Kalender-Abo mit allen Kadetten-Spielen (nur lesend)
// - GET  /api/app/votes/:id         Fan-Wahl «Spieler des Matchs»: Stand, Kandidaten, Zeitfenster
// - POST /api/app/votes/:id         eine Stimme pro Gerät und Spiel (Entscheid des Eigentümers, 5.11.2026)
// Die Fan-Wahl ist der einzige öffentliche Schreibweg neben dem Push-Abo. Sie speichert nur gezählte Stimmen
// unter zufälligen, gehashten Geräteschlüsseln, keine Personendaten, und ist auf die App-Herkunft beschränkt.
import {pushKickoff} from './push-monitor.mjs';

export const APP_ORIGIN = 'https://mac-mac-sg.github.io';
const OWN = 'Kadetten Schaffhausen';
const HOUR = 3600000;
export const VOTE_OPEN_AFTER = 90 * 60000;   // frühestens 90 Minuten nach Anpfiff (Spiel vorbei)
export const VOTE_CLOSE_AFTER = 26 * HOUR;   // bis etwa 24 Stunden nach Spielende
export const VOTES_PER_IP = 6;               // pro Spiel und Anschluss (Haushalte teilen sich eine Adresse)

const sha = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const reply = (data, status = 200, extra = {}) => new Response(status === 204 ? null : JSON.stringify(data), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': APP_ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin', ...extra}});
const norm = n => String(n || '').replace(/^TSV /, '').trim();
const isOwn = n => norm(n) === OWN;

async function snapshot(env) {
  const saved = await env.BUCKET?.get('kadetten/current.json');
  return saved ? saved.json() : null;
}

/** Kandidaten aus dem gesicherten Spielbericht (QHL/Cup: SHV, EHL: EHF-Archiv). Ohne Bericht keine Wahl. */
export async function candidates(env, game) {
  if (game.league === 'EHL') {
    const stored = await env.BUCKET?.get('kadetten/ehf/' + game.id + '.json');
    const record = stored ? await stored.json() : null;
    if (!record || !Array.isArray(record.players)) return [];
    const ownHome = isOwn(record.home);
    return record.players.filter(p => p.home === ownHome && Number.isInteger(p.id) && p.name && !(p.goalkeeper && !p.savesFaced))
      .map(p => ({id: String(p.id), name: p.name, goals: p.goals ?? null, saves: p.goalkeeper ? p.saves ?? null : null}));
  }
  if (!/^[1-9][0-9]{0,8}$/.test(String(game.id))) return [];
  const stored = await env.BUCKET?.get('kadetten/reports/' + game.id + '.json');
  const report = stored ? await stored.json() : null;
  const team = report?.teams?.find(t => isOwn(t.name));
  if (!team || !Array.isArray(report.score) || report.score.some((v, i) => v !== game.score?.[i])) return [];
  return team.players.filter(p => Number.isInteger(p.id) && p.name && !(p.keeper && !p.keeperShots && !p.saves))
    .map(p => ({id: String(p.id), name: p.name, goals: p.goals ?? null, saves: p.keeper ? p.saves ?? null : null}));
}

/** Zeitfenster der Wahl: nach Spielende (bestätigtes Resultat) bis etwa 24 Stunden danach. */
export function voteWindow(game, now) {
  const kickoff = pushKickoff(game);
  if (!Number.isFinite(kickoff) || !Array.isArray(game.score)) return {open: false, opensAt: null, closesAt: null};
  const opensAt = kickoff + VOTE_OPEN_AFTER, closesAt = kickoff + VOTE_CLOSE_AFTER;
  return {open: now >= opensAt && now < closesAt, opensAt, closesAt};
}

async function tally(kv, id) {
  const cached = await kv.get('app/votes/' + id + '/tally', 'json');
  if (cached) return cached;
  const counts = {};
  let cursor, total = 0;
  do {
    const page = await kv.list({prefix: 'app/votes/' + id + '/v/', cursor, limit: 1000});
    for (const key of page.keys) { const p = key.metadata?.p; if (p) { counts[p] = (counts[p] || 0) + 1; total++; } }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  const value = {counts, total};
  await kv.put('app/votes/' + id + '/tally', JSON.stringify(value), {expirationTtl: 60});
  return value;
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 2000) throw Error('body');
  return JSON.parse(text);
}

export function buildCalendar(games, now) {
  const stamp = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = v => String(v ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const fold = line => line.length <= 74 ? line : line.match(/.{1,74}/g).join('\r\n ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kadetten Fan-App//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Kadetten Schaffhausen', 'X-WR-TIMEZONE:Europe/Zurich', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  for (const g of games || []) {
    if (!isOwn(g.home) && !isOwn(g.away)) continue;
    const start = pushKickoff(g);
    if (!Number.isFinite(start) || start < now - 30 * 24 * HOUR) continue;
    const result = Array.isArray(g.score) ? ` ${g.score[0]}:${g.score[1]}` : '';
    lines.push('BEGIN:VEVENT', `UID:kadetten-${esc(g.id)}@kadetten-fan-app`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + 2 * HOUR)}`,
      `SUMMARY:${esc(`${norm(g.home)} – ${norm(g.away)}${result} (${g.league})`)}`, `LOCATION:${esc(g.venue || '')}`,
      `DESCRIPTION:${esc((isOwn(g.home) ? 'Heimspiel' : 'Auswärtsspiel') + '. Spielseite: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/#/spiel/' + g.id)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export async function appRoute(request, env, url, now = Date.now()) {
  if (url.pathname === '/api/app/calendar.ics') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply({error: 'GET required'}, 405);
    const data = await snapshot(env);
    return new Response(buildCalendar(data?.games, now), {headers: {'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=900', 'Content-Disposition': 'inline; filename="kadetten.ics"', 'Access-Control-Allow-Origin': APP_ORIGIN}});
  }
  const m = /^\/api\/app\/votes\/([a-zA-Z0-9_-]{1,80})$/.exec(url.pathname);
  if (!m) return reply({error: 'Not found'}, 404);
  if (request.method === 'OPTIONS') return request.headers.get('Origin') === APP_ORIGIN ? reply(null, 204) : new Response(null, {status: 403});
  if (!env.DATA) return reply({error: 'Die Fan-Wahl ist noch nicht eingerichtet.'}, 503);
  const id = m[1], data = await snapshot(env);
  const game = data?.games?.find(g => String(g.id) === id && (isOwn(g.home) || isOwn(g.away)));
  if (!game) return reply({error: 'Spiel nicht gefunden'}, 404);
  const window = voteWindow(game, now);
  const list = window.opensAt && now >= window.opensAt ? await candidates(env, game) : [];
  const state = async () => ({ok: true, open: window.open && list.length > 0, opensAt: window.opensAt, closesAt: window.closesAt, candidates: list, ...(await tally(env.DATA, id))});
  if (request.method === 'GET') return reply(await state());
  if (request.method !== 'POST') return reply({error: 'Method not allowed'}, 405);
  if (request.headers.get('Origin') !== APP_ORIGIN) return new Response('Origin rejected', {status: 403});
  let input;
  try { input = await readJson(request); } catch { return reply({error: 'Ungültige Anfrage'}, 400); }
  if (typeof input?.device !== 'string' || !/^[-\w]{43}$/.test(input.device)) return reply({error: 'Gerät nicht erkannt'}, 400);
  if (!window.open || !list.length) return reply({error: 'Die Wahl ist nicht offen.', ...(await state())}, 409);
  const player = list.find(p => p.id === String(input.player));
  if (!player) return reply({error: 'Dieser Spieler steht nicht zur Wahl.'}, 400);
  const voteKey = 'app/votes/' + id + '/v/' + await sha(input.device);
  if (await env.DATA.get(voteKey)) return reply({error: 'Von diesem Gerät wurde schon abgestimmt.', ...(await state())}, 409);
  const ipKey = 'app/votes/' + id + '/ip/' + await sha(request.headers.get('CF-Connecting-IP') || 'unknown');
  const used = Number(await env.DATA.get(ipKey)) || 0;
  if (used >= VOTES_PER_IP) return reply({error: 'Von diesem Anschluss wurden schon viele Stimmen abgegeben.'}, 429);
  const ttl = Math.max(60, Math.ceil((window.closesAt - now) / 1000) + 30 * 86400);
  await env.DATA.put(voteKey, player.id, {metadata: {p: player.id}, expirationTtl: ttl});
  await env.DATA.put(ipKey, String(used + 1), {expirationTtl: Math.max(60, Math.ceil((window.closesAt - now) / 1000))});
  await env.DATA.delete('app/votes/' + id + '/tally');
  return reply({...(await state()), voted: player.id});
}
