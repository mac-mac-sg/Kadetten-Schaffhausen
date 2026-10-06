// Erkundung der EHF-Quellen für den Live-Ticker (nur lesend). Reine Hilfen ohne Netzwerkzugriff; der Abruf liegt in
// scripts/ehf-source-check.mjs.

export const matchUrls = id => [
  `https://ehfel.eurohandball.com/men/2026-27/matches/details/${id}/KadettenSchaffhausen-HCIzvidac/`,
  'https://ticker.ehf.eu/',
  `https://ticker.ehf.eu/match/?${id}`,
  // Neuere Ticker-Ansicht mit Play-by-Play (Torfolge, Strafen, Time-outs), Fundstelle: Screenshot des Eigentümers vom 6. Oktober 2026.
  `https://ticker.ehf.eu/v3/${id}`
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
// Namen der Schnittstellen, deren Aufrufe in den Skripten der Spielseite gesucht werden.
export const NAMES = ['GetMatchLiveFeed', 'GetMatchDetails', 'GetMatchDetailStatistic', 'GetTeams'];
export const PARAM_NAMES = ['matchId', 'matchID', 'id'];

// Versuchsaufrufe: jede Spiel-Schnittstelle nur mit der Spiel-ID (die «id» im Livescore-Feed ist die Wettbewerbs-Kennung, keine
// Spiel-Kennung), unter den üblichen Parameternamen (nur GET).
export function candidateCalls(matchId) {
  const calls = [];
  for (const endpoint of DATA_ENDPOINTS) {
    for (const name of PARAM_NAMES) calls.push(`${API}${endpoint}?${name}=${encodeURIComponent(matchId)}`);
  }
  return calls;
}

// Aufbau einer JSON-Antwort: Schlüssel mit Typ und Länge, bis zu `depth` Ebenen tief.
export function describeShape(value, depth = 2, maxKeys = 40) {
  const type = v => Array.isArray(v) ? `Liste(${v.length})` : v === null ? 'null' : typeof v === 'object' ? 'Objekt' : typeof v;
  const lines = [];
  const walk = (v, path, level) => {
    if (level > depth || v === null || typeof v !== 'object') return;
    const entries = Array.isArray(v) ? (v.length ? [['[0]', v[0]]] : []) : Object.entries(v);
    for (const [k, child] of entries.slice(0, maxKeys)) {
      lines.push(`${path}${Array.isArray(v) ? '' : '.'}${k}`.replace(/^\./, '') + ': ' + type(child));
      walk(child, `${path}${Array.isArray(v) ? '' : '.'}${k}`.replace(/^\./, ''), level + 1);
    }
  };
  walk(value, '', 1);
  return lines;
}

// Pfade, deren Schlüssel nach Form, letzten Spielen oder Direktduellen klingen (bis zu `limit` Treffer).
export function findKeys(value, pattern, limit = 30, maxDepth = 8) {
  const found = [];
  const walk = (v, path, level) => {
    if (found.length >= limit || level > maxDepth || v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) { if (v.length) walk(v[0], path + '[0]', level + 1); return; }
    for (const [k, child] of Object.entries(v)) {
      const here = path ? path + '.' + k : k;
      if (pattern.test(k)) found.push(`${here}: ${Array.isArray(child) ? 'Liste(' + child.length + ')' : child === null ? 'null' : typeof child}`);
      walk(child, here, level + 1);
      if (found.length >= limit) return;
    }
  };
  walk(value, '', 1);
  return found;
}

// Teilbaum an einem Pfad wie «matchDetails.details.homeTeam.players[0]» (undefined, wenn er fehlt).
export function valueAt(value, path) {
  let current = value;
  for (const part of String(path).split('.')) {
    const m = part.match(/^([^[\]]+)(?:\[(\d+)\])?$/);
    if (!m || current === null || typeof current !== 'object') return undefined;
    current = current[m[1]];
    if (m[2] !== undefined) current = Array.isArray(current) ? current[Number(m[2])] : undefined;
  }
  return current;
}

// Teilbäume von GetMatchDetails, die Spieler- und Teamwerte enthalten könnten (für die Erkundung der Statistik-Daten).
export const DETAIL_PATHS = [
  'matchDetails.statistics',
  'euroStatistics',
  'topStatistics',
  'matchDetails.details.homeTeam.players[0]',
  'matchDetails.details.guestTeam.players[0]',
  'matchDetails.details.homeTeam.officials[0]'
];

// Der ganze Eintrag eines Spiels im Livescore-Feed, ohne Bild-Adressen (zeigt, mit welchen Feldern ein beendetes Spiel markiert ist).
const IMAGE_KEYS = /^(photos?|newPhoto|logo\w*|flag\w*|cssClass|url)$/i;
export function findFeedItem(feed, matchId) {
  for (const day of feed?.days || []) {
    for (const item of day.liveScoreMatches || []) if (item?.match?.matchID === matchId) return item;
  }
  return null;
}
export const withoutImages = value => JSON.stringify(value, (key, v) => (IMAGE_KEYS.test(key) ? undefined : v));

// Kurzübersicht des Feeds: je Tag Datum und Anzahl Spiele, dazu die Statusfelder («matchStats») des ersten Spiels je Tag.
export function feedOverview(feed) {
  return (feed?.days || []).map(day => {
    const items = day.liveScoreMatches || [];
    return {date: day.dayDatumFormatted || day.date, matches: items.length, firstStats: items[0]?.matchStats ?? null};
  });
}

// Stichwörter, an denen eine Seite ihre Daten nachlädt (Ausschnitte rund um die Fundstelle zeigen Adresse und Parameter).
export const LOAD_NEEDLES = ['.json', '/api/', 'ajax', 'fetch(', 'WebSocket', 'EventSource', 'signalR', 'getJSON', 'axios', 'XMLHttpRequest', '.ashx', '.aspx'];
export function loadSnippets(text, needles = LOAD_NEEDLES, perNeedle = 2, width = 150, max = 12) {
  const out = [];
  for (const needle of needles) {
    for (const snippet of contextAround(text, needle, width, perNeedle)) {
      if (out.length >= max) return out;
      out.push(`${needle}: ${snippet}`);
    }
  }
  return out;
}
