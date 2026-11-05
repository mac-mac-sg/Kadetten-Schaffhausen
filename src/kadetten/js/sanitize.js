// Vereinsartikel sicher darstellen: nur erlaubte Elemente und Attribute, nur HTTPS-Links und -Bilder.
// Skripte, Stile, Formulare, eingebettete Inhalte und Eventhandler fallen weg. Getestet in tests/app-views.test.mjs.
const ALLOWED = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'A', 'BR', 'IMG', 'FIGURE', 'FIGCAPTION', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SUP', 'SUB', 'CITE']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'CANVAS', 'VIDEO', 'AUDIO', 'HEAD', 'TITLE']);
const RENAME = {H1: 'H2', H5: 'H4', H6: 'H4'};

function httpsUrl(value, base) {
  try { const url = new URL(value, base); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}

/** Gibt bereinigtes HTML zurück. doc: ein Document zum Erzeugen von Knoten (Browser: document). */
export function sanitizeArticle(html, {parser = globalThis.DOMParser, doc = globalThis.document, base = 'https://kadettensh.ch/'} = {}) {
  const source = new parser().parseFromString(`<!doctype html><html><head></head><body>${String(html || '')}</body></html>`, 'text/html');
  const out = doc.createElement('div');
  const copy = (node, target) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) { target.appendChild(doc.createTextNode(child.textContent)); continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toUpperCase();
      if (DROP.has(tag)) continue;
      const name = RENAME[tag] || tag;
      if (!ALLOWED.has(name)) { copy(child, target); continue; }
      const el = doc.createElement(name.toLowerCase());
      if (name === 'A') {
        const href = httpsUrl(child.getAttribute('href'), base);
        if (!href) { copy(child, target); continue; }
        el.setAttribute('href', href); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer');
      }
      if (name === 'IMG') {
        const src = httpsUrl(child.getAttribute('src'), base);
        if (!src) continue;
        el.setAttribute('src', src); el.setAttribute('alt', child.getAttribute('alt') || ''); el.setAttribute('loading', 'lazy'); el.setAttribute('decoding', 'async');
        for (const dim of ['width', 'height']) if (/^\d{1,4}$/.test(child.getAttribute(dim) || '')) el.setAttribute(dim, child.getAttribute(dim));
      }
      if ((name === 'TH' || name === 'TD') && /^\d{1,2}$/.test(child.getAttribute('colspan') || '')) el.setAttribute('colspan', child.getAttribute('colspan'));
      copy(child, el);
      if (['P', 'LI', 'FIGCAPTION', 'H2', 'H3', 'H4'].includes(name) && !el.textContent.trim() && !el.querySelector('img')) continue;
      target.appendChild(el);
    }
  };
  copy(source.body, out);
  return out.innerHTML;
}
