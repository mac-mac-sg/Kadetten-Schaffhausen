// Vereinsartikel sicher darstellen: nur erlaubte Elemente und Attribute, nur HTTPS-Links und -Bilder.
// Skripte, Stile, Formulare, eingebettete Inhalte und Eventhandler fallen weg. Getestet in tests/app-views.test.mjs.
const ALLOWED = new Set([
  'P',
  'H2',
  'H3',
  'H4',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'STRONG',
  'B',
  'EM',
  'I',
  'A',
  'BR',
  'IMG',
  'FIGURE',
  'FIGCAPTION',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'SUP',
  'SUB',
  'CITE'
]);
const DROP = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
  'SELECT',
  'TEXTAREA',
  'LINK',
  'META',
  'NOSCRIPT',
  'TEMPLATE',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'HEAD',
  'TITLE'
]);
const RENAME = {H1: 'H2', H5: 'H4', H6: 'H4'};

function httpsUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Spielpaarung aus dem Seitenbaukasten: zwei Logos mit «34 VS. (12:24) 45» dazwischen.
// Nur eindeutige Paare werden zur Karte; alles andere bleibt Artikeltext.
const FIXTURE = /^(\d{1,3})\s*(?:VS\.?|:|[-–])\s*(?:\(\s*(\d{1,3})\s*:\s*(\d{1,3})\s*\)\s*)?(\d{1,3})$/i;
function fixtureOf(el, base) {
  const images = el.querySelectorAll('img');
  if (images.length !== 2) return null;
  const m = el.textContent.replace(/\s+/g, ' ').trim().match(FIXTURE);
  const srcs = [...images].map(img => httpsUrl(img.getAttribute('src'), base));
  return m && srcs.every(Boolean)
    ? {home: m[1], away: m[4], half: m[2] ? `${m[2]}:${m[3]}` : '', srcs, alts: [...images].map(img => img.getAttribute('alt') || '')}
    : null;
}

/** Gibt bereinigtes HTML zurück. doc: ein Document zum Erzeugen von Knoten (Browser: document). */
export function sanitizeArticle(html, {parser = globalThis.DOMParser, doc = globalThis.document, base = 'https://kadettensh.ch/'} = {}) {
  const source = new parser().parseFromString(`<!doctype html><html><head></head><body>${String(html || '')}</body></html>`, 'text/html');
  const out = doc.createElement('div');
  const copy = (node, target) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        target.appendChild(doc.createTextNode(child.textContent));
        continue;
      }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toUpperCase();
      if (DROP.has(tag)) continue;
      const name = RENAME[tag] || tag;
      if (tag === 'DIV' || tag === 'P' || tag === 'SECTION') {
        const fx = fixtureOf(child, base);
        if (fx) {
          const box = doc.createElement('div');
          box.setAttribute('class', 'fixture');
          const logo = (src, alt) => {
            const i = doc.createElement('img');
            i.setAttribute('src', src);
            i.setAttribute('alt', alt);
            i.setAttribute('loading', 'lazy');
            i.setAttribute('decoding', 'async');
            return i;
          };
          const mid = doc.createElement('div');
          mid.setAttribute('class', 'fixture-score');
          const strong = doc.createElement('strong');
          strong.textContent = `${fx.home} : ${fx.away}`;
          mid.appendChild(strong);
          if (fx.half) {
            const small = doc.createElement('small');
            small.textContent = `Halbzeit ${fx.half}`;
            mid.appendChild(small);
          }
          box.appendChild(logo(fx.srcs[0], fx.alts[0]));
          box.appendChild(mid);
          box.appendChild(logo(fx.srcs[1], fx.alts[1]));
          target.appendChild(box);
          continue;
        }
      }
      if (!ALLOWED.has(name)) {
        copy(child, target);
        continue;
      }
      const el = doc.createElement(name.toLowerCase());
      if (name === 'A') {
        const href = httpsUrl(child.getAttribute('href'), base);
        if (!href) {
          copy(child, target);
          continue;
        }
        el.setAttribute('href', href);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (name === 'IMG') {
        const src = httpsUrl(child.getAttribute('src'), base);
        if (!src) continue;
        el.setAttribute('src', src);
        el.setAttribute('alt', child.getAttribute('alt') || '');
        el.setAttribute('loading', 'lazy');
        el.setAttribute('decoding', 'async');
        for (const dim of ['width', 'height'])
          if (/^\d{1,4}$/.test(child.getAttribute(dim) || '')) el.setAttribute(dim, child.getAttribute(dim));
      }
      if ((name === 'TH' || name === 'TD') && /^\d{1,2}$/.test(child.getAttribute('colspan') || ''))
        el.setAttribute('colspan', child.getAttribute('colspan'));
      copy(child, el);
      if (['P', 'LI', 'FIGCAPTION', 'H2', 'H3', 'H4'].includes(name) && !el.textContent.trim() && !el.querySelector('img')) continue;
      target.appendChild(el);
    }
  };
  copy(source.body, out);
  return out.innerHTML;
}
