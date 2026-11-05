// Texte aus dem Datendienst kommen HTML-maskiert an. Beim Einlesen werden sie einmal dekodiert,
// bei der Ausgabe immer maskiert. So erscheint «&amp;» nie doppelt und nie als aktives HTML.

const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};

export function decodeEntities(value) {
  if (typeof value !== 'string' || !value.includes('&')) return value;
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Dekodiert alle Zeichenketten eines Datenstands rekursiv (Objekte und Listen). */
export function decodeDeep(value) {
  if (typeof value === 'string') return decodeEntities(value);
  if (Array.isArray(value)) return value.map(decodeDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeDeep(v)]));
  return value;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

/** Vertrauenswürdiges, bereits maskiertes HTML. */
export class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

function part(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(part).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

/** Vorlagen-Tag: Werte werden maskiert, verschachtelte html``-Ergebnisse bleiben erhalten. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += part(value) + strings[i + 1]; });
  return new SafeHtml(out);
}

/** Nur für feste, im Code definierte Zeichenketten (z. B. SVG-Symbole). */
export const raw = value => new SafeHtml(String(value));
