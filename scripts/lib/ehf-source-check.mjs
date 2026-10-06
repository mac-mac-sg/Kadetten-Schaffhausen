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
