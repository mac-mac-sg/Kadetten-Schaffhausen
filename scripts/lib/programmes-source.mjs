// Matchprogramme von der offiziellen Kadetten-Homepage (Phase 2b des Cloudflare-Umzugs, docs/cloudflare-umzug.md).
// Findet PDF-Verweise auf der Startseite (HTML und WordPress-Schnittstelle), liest die erste PDF-Seite und prüft mit
// `programmeMatches` (server/programmes.mjs), ob sie zum nächsten Heimspiel gehört. Reine Funktionen mit eingespeister
// HTTP-Schnittstelle: http.text(url) -> {status, text}; http.bytes(url) -> {status, bytes, type}.
import {programmeMatches, identity} from '../../server/programmes.mjs';

export const HOME = 'https://kadettensh.ch/';
export const PAGE_SOURCES = [HOME, 'https://kadettensh.ch/wp-json/wp/v2/pages?slug=home&_fields=slug,content', 'https://kadettensh.ch/wp-json/wp/v2/pages?slug=matchcenter&_fields=slug,content'];
const allowedHost = host => host === 'kadettensh.ch' || host.endsWith('.kadettensh.ch');

// Alle https-PDF-Adressen auf kadettensh.ch aus HTML oder JSON-Text (Schrägstriche in JSON sind maskiert).
export function findPdfLinks(text, base = HOME) {
  const cleaned = String(text).replaceAll('\\/', '/').replaceAll('&amp;', '&').replaceAll('&#038;', '&');
  const found = new Set();
  for (const m of cleaned.matchAll(/(?:href|src|data-[a-z-]+)\s*=\s*["']([^"']+?\.pdf(?:\?[^"']*)?)["']|(https?:\/\/[^\s"'<>\\]+?\.pdf(?:\?[^\s"'<>\\]*)?)/gi)) {
    try {
      const url = new URL(m[1] || m[2], base);
      if (url.protocol === 'https:' && allowedHost(url.hostname)) found.add(url.href);
    } catch {}
  }
  return [...found];
}

// Text der ersten PDF-Seite (die Titelseite nennt Heimteam, Gegner und Datum).
export async function firstPageText(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false, disableFontFace: true, verbosity: 0}).promise;
  try {
    const page = await doc.getPage(1);
    return (await page.getTextContent()).items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
  } finally {
    await doc.destroy();
  }
}

// Nächstes Heimspiel der Kadetten, das noch kein Ergebnis hat (Datum in Schweizer Zeit).
export function nextHomeGame(games, now = new Date()) {
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
  return (games || []).filter(g => g.home === 'Kadetten Schaffhausen' && !g.score && g.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0] || null;
}

// Trockenlauf: nichts wird gespeichert. Rückgabe: {game, sources: [{url, status, links}], pdfs: [{url, status, type, bytes, isPdf, text, matches, error}]}
export async function inspectProgrammes(http, games, now = new Date()) {
  const game = nextHomeGame(games, now);
  const sources = [];
  const links = new Set();
  for (const url of PAGE_SOURCES) {
    let status = 0, found = [];
    try {
      const r = await http.text(url);
      status = r.status;
      if (r.status === 200) found = findPdfLinks(r.text, url);
    } catch {}
    found.forEach(l => links.add(l));
    sources.push({url, status, links: found.length});
  }
  const pdfs = [];
  for (const url of links) {
    const row = {url, status: 0, type: '', bytes: 0, isPdf: false, text: '', matches: false, error: ''};
    pdfs.push(row);
    try {
      const r = await http.bytes(url);
      Object.assign(row, {status: r.status, type: r.type || '', bytes: r.bytes?.length || 0});
      row.isPdf = r.status === 200 && new TextDecoder().decode(r.bytes.slice(0, 5)) === '%PDF-';
      if (!row.isPdf) continue;
      const text = await firstPageText(r.bytes);
      row.text = text.slice(0, 240);
      row.matches = !!game && programmeMatches(game, text);
      if (row.matches) row.data = r.bytes;
    } catch (e) {
      row.error = String(e?.message || e).slice(0, 120);
    }
  }
  return {game, sources, pdfs};
}

// Gleiche Prüfung wie der Datendienst beim Annehmen eines Programms (server/programmes.mjs): PDF-Kopf, Dateiende, Grösse.
const MAX_PDF = 8 * 1024 * 1024;
export function validPdf(bytes) {
  return bytes.length >= 1000 && bytes.length <= MAX_PDF && new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' && new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF');
}

// Speichert das passende Programm im selben Format wie POST /api/programmes (Metadaten `kadetten/programmes/<id>.json`, PDF unter
// `kadetten/programmes/<id>/<sha256>.pdf`). Die Datei wird zuerst geschrieben, damit die Metadaten nie auf Fehlendes zeigen.
// Rückgabe: 'gespeichert', 'unveraendert' oder 'ungueltig'.
export async function storeProgramme(bucket, game, row, now = new Date()) {
  if (!row?.matches || !row.data || !validPdf(row.data)) return 'ungueltig';
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', row.data)), b => b.toString(16).padStart(2, '0')).join('');
  const key = `kadetten/programmes/${game.id}`;
  const existing = await bucket.get(key + '.json');
  if (existing) {
    const meta = await existing.json();
    if (meta.version === hash && meta.fixtureKey === identity(game)) return 'unveraendert';
  }
  await bucket.put(`${key}/${hash}.pdf`, row.data);
  await bucket.put(key + '.json', JSON.stringify({id: game.id, fixtureKey: identity(game), sourceUrl: row.url, version: hash, bytes: row.data.length, updatedAt: now.toISOString(), home: game.home, away: game.away, date: game.date}));
  return 'gespeichert';
}

// Findet und speichert das Programm des nächsten Heimspiels. Fehler lassen das bisherige Programm unverändert.
export async function syncProgrammes(http, bucket, games, now = new Date()) {
  const r = await inspectProgrammes(http, games, now);
  const hit = r.pdfs.find(p => p.matches);
  if (!r.game) return {game: null, result: 'kein Heimspiel'};
  if (!hit) return {game: r.game, result: 'kein passendes PDF', pdfs: r.pdfs.length};
  return {game: r.game, result: await storeProgramme(bucket, r.game, hit, now), url: hit.url};
}
