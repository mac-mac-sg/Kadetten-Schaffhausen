// Fanshop: Katalog aus dem Datendienst, Warenkorb und Kasse nur auf dem Gerät. Die App bestellt nichts und sendet nichts;
// die Kasse endet vor der Zahlung. Versand laut Verein: pauschal CHF 10, ab CHF 100 gratis, Abholung am Heimspiel gratis.
import {readJson, writeJson} from './storage.js';
import {SHOP_IMAGES} from '../data/shop-bilder.js';
import {ownGames, kickoff, OWN_TEAM} from './logic.js';

export const SHIPPING = 1000;
export const FREE_FROM = 10000;
export const SHOP_URL = 'https://kadettensh.ch/shop/';
const CART = 'v2:shop-cart';
const CHECKOUT = 'v2:shop-checkout';
const MAX_QTY = 9;

export const KINDS = [
  ['alle', 'Alle'],
  ['trikot', 'Trikots'],
  ['bekleidung', 'Bekleidung'],
  ['fanartikel', 'Fanartikel']
];

/** Rappen als Preis: «74.–» oder «4.50». */
export const money = r => (r % 100 ? (r / 100).toFixed(2) : `${r / 100}.–`);

/** Bild: verkleinerte Kopie in der App, sonst das Original aus dem Online-Shop. */
export const imageSrc = img => (img ? (SHOP_IMAGES.has(String(img.id)) ? `assets/shop/${img.id}.webp` : img.src) : null);

export const catalog = data => (Array.isArray(data?.shop?.products) ? data.shop.products : []);
export const productById = (data, id) => catalog(data).find(p => p.id === String(id)) || null;

/** Ausführung zu einer vollständigen Auswahl, sonst null. */
export function variantFor(product, sel = {}) {
  if (!product?.options?.length) return null;
  return product.variants.find(v => product.options.every(o => v.values[o.name] === sel[o.name])) || null;
}

/** Ist ein Wert noch zu haben, wenn die übrigen Optionen so gewählt sind? */
export function valueInStock(product, name, value, sel = {}) {
  return product.variants.some(
    v =>
      v.stock && v.values[name] === value && product.options.every(o => o.name === name || !sel[o.name] || v.values[o.name] === sel[o.name])
  );
}

/** Bild für die Auswahl: Bild der Ausführung (z. B. Farbe), sonst das erste Produktbild. */
export function imageFor(product, sel = {}) {
  const match = product.variants.find(
    v => v.image && product.options.some(o => sel[o.name]) && product.options.every(o => !sel[o.name] || v.values[o.name] === sel[o.name])
  );
  return match?.image || product.images[0] || null;
}

// Warenkorb: [{p: Produkt-ID, v: Ausführungs-ID oder '', q: Menge}]
const valid = item => item && /^\d{1,10}$/.test(item.p) && /^(\d{1,10})?$/.test(item.v) && Number.isInteger(item.q) && item.q > 0;
export const cart = () => readJson(CART, []).filter(valid).slice(0, 50);
const saveCart = items => writeJson(CART, items.length ? items : null);

export function addToCart(productId, variantId = '', qty = 1) {
  const items = cart();
  const hit = items.find(i => i.p === String(productId) && i.v === String(variantId || ''));
  if (hit) hit.q = Math.min(MAX_QTY, hit.q + qty);
  else items.push({p: String(productId), v: String(variantId || ''), q: Math.min(MAX_QTY, qty)});
  saveCart(items);
  return items;
}

export function changeQty(index, delta) {
  const items = cart();
  if (!items[index]) return items;
  items[index].q = Math.min(MAX_QTY, items[index].q + delta);
  const next = items.filter(i => i.q > 0);
  saveCart(next);
  return next;
}

export const removeLine = index => {
  const items = cart().filter((_, i) => i !== index);
  saveCart(items);
  return items;
};
export const clearCart = () => saveCart([]);
export const cartCount = () => cart().reduce((n, i) => n + i.q, 0);

/** Zeilen mit Produkt, Ausführung und Preis; Unbekanntes oder Ausverkauftes wird markiert, nicht still entfernt. */
export function cartLines(data, items = cart()) {
  return items.map((item, index) => {
    const product = productById(data, item.p);
    const variant = product?.variants.find(v => v.id === item.v) || null;
    const known = Boolean(product && (item.v ? variant : !product.options.length));
    const price = variant?.price ?? product?.price ?? 0;
    return {
      index,
      item,
      product,
      variant,
      known,
      stock: known && (variant ? variant.stock : product.stock),
      price,
      sum: price * item.q,
      label: variant ? Object.values(variant.values).join(' · ') : ''
    };
  });
}

/** Beträge: Versand pauschal, ab FREE_FROM oder bei Abholung gratis. Nur bestellbare Zeilen zählen. */
export function totals(lines, delivery = 'post') {
  const ok = lines.filter(l => l.known && l.stock);
  const items = ok.reduce((n, l) => n + l.sum, 0);
  const count = ok.reduce((n, l) => n + l.item.q, 0);
  const shipping = !items || delivery === 'abholung' || items >= FREE_FROM ? 0 : SHIPPING;
  return {items, count, shipping, total: items + shipping, missing: Math.max(0, FREE_FROM - items), free: items >= FREE_FROM};
}

/** Nächstes Heimspiel ab jetzt (für «Abholen am Heimspiel»). */
export function nextHomeGame(games = [], now = Date.now()) {
  return ownGames(games)
    .filter(g => g.home === OWN_TEAM && !Array.isArray(g.score) && kickoff(g) > now)
    .sort((a, b) => kickoff(a) - kickoff(b))[0];
}

// Kasse: Lieferart und Adresse bleiben auf dem Gerät und lassen sich löschen.
export const ADDRESS_FIELDS = [
  ['first', 'Vorname', 'given-name'],
  ['last', 'Nachname', 'family-name'],
  ['street', 'Strasse und Nummer', 'street-address'],
  ['zip', 'PLZ', 'postal-code'],
  ['city', 'Ort', 'address-level2'],
  ['email', 'E-Mail', 'email']
];

export function checkout() {
  const c = readJson(CHECKOUT, {});
  const address = {};
  for (const [k] of ADDRESS_FIELDS) if (typeof c.address?.[k] === 'string') address[k] = c.address[k].slice(0, 80);
  return {delivery: c.delivery === 'abholung' ? 'abholung' : 'post', address};
}
export const setDelivery = delivery => writeJson(CHECKOUT, {...checkout(), delivery: delivery === 'abholung' ? 'abholung' : 'post'});
export const setAddressField = (key, value) => {
  if (!ADDRESS_FIELDS.some(([k]) => k === key)) return;
  const c = checkout();
  writeJson(CHECKOUT, {...c, address: {...c.address, [key]: String(value).slice(0, 80)}});
};
export const forgetCheckout = () => writeJson(CHECKOUT, null);

/** Fehlende oder ungültige Felder der Adresse (leer = vollständig). */
export function addressErrors(a = {}, delivery = 'post') {
  const errors = {};
  const needed = delivery === 'abholung' ? ['first', 'last', 'email'] : ADDRESS_FIELDS.map(([k]) => k);
  for (const [k, label] of ADDRESS_FIELDS) if (needed.includes(k) && !String(a[k] || '').trim()) errors[k] = `${label} fehlt.`;
  if (needed.includes('zip') && a.zip && !/^\d{4}$/.test(a.zip.trim())) errors.zip = 'PLZ: vier Ziffern (Schweiz).';
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) errors.email = 'E-Mail-Adresse prüfen.';
  return errors;
}
