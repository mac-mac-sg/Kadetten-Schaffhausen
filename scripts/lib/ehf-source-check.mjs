// Erkundung der EHF-Quellen für den Live-Ticker (nur lesend). Reine Hilfen ohne Netzwerkzugriff; der Abruf liegt in
// scripts/ehf-source-check.mjs.

export const matchUrls = id => [
  `https://ehfel.eurohandball.com/men/2026-27/matches/details/${id}/KadettenSchaffhausen-HCIzvidac/`,
  'https://ticker.ehf.eu/',
  `https://ticker.ehf.eu/match/?${id}`
];

// Adressen aus HTML oder JavaScript, die nach Daten-Schnittstellen aussehen (api, json, socket, signalr, feed, ticker, livescore).
export function findEndpoints(text, base) {
  const found = new Set();
  const pattern = /(?:https?:)?\/\/[^\s"'`<>\\)]+|["'`](\/[A-Za-z0-9_\-./?=&%]+)["'`]/g;
  for (const m of String(text).matchAll(pattern)) {
    const raw = m[1] || m[0];
    let url;
    try { url = new URL(raw.startsWith('//') ? 'https:' + raw : raw, base).href; } catch { continue; }
    if (/api|json|socket|signalr|feed|ticker|livescore|event|match/i.test(url) && !/\.(png|jpe?g|svg|gif|woff2?|ico|css)(\?|$)/i.test(url)) found.add(url);
  }
  return [...found].sort();
}

export function scriptSources(html, base) {
  const out = [];
  for (const m of String(html).matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try { out.push(new URL(m[1], base).href); } catch { /* ungültige Adresse ignorieren */ }
  }
  return [...new Set(out)];
}

export function preview(text, length = 1200) {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, length);
}

// Ausschnitte um eine Fundstelle (zeigt, mit welchen Parametern eine Schnittstelle in den Skripten der Seite aufgerufen wird).
export function contextAround(text, needle, width = 220, max = 3) {
  const out = [];
  const source = String(text);
  for (let i = source.indexOf(needle); i !== -1 && out.length < max; i = source.indexOf(needle, i + needle.length)) {
    out.push(preview(source.slice(Math.max(0, i - width), i + needle.length + width), 2 * width + needle.length));
  }
  return out;
}

// Die internen Kennungen eines Spiels aus dem Livescore-Feed (days[].liveScoreMatches[].match).
export function findFeedMatch(feed, matchId) {
  for (const day of feed?.days || []) {
    for (const item of day.liveScoreMatches || []) {
      if (item?.match?.matchID === matchId) return {id: item.match.id, matchID: item.match.matchID, home: item.match.homeTeam?.id, guest: item.match.guestTeam?.id};
    }
  }
  return null;
}

export const API = 'https://ehfel.eurohandball.com/umbraco/api/';
export const DATA_ENDPOINTS = ['matchdetailsinfoapi/GetMatchLiveFeed', 'matchdetailapi/GetMatchDetails', 'matchdetailapi/GetMatchDetailStatistic'];
export const PARAM_NAMES = ['matchId', 'matchID', 'id'];

// Versuchsaufrufe: jede Schnittstelle mit den bekannten Kennungen unter den üblichen Parameternamen (nur GET).
export function candidateCalls(match, matchId) {
  const values = [...new Set([match?.id, matchId].filter(Boolean))];
  const calls = [];
  for (const endpoint of DATA_ENDPOINTS) {
    for (const name of PARAM_NAMES) for (const value of values) calls.push(`${API}${endpoint}?${name}=${encodeURIComponent(value)}`);
  }
  return calls;
}
