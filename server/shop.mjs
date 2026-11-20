// Fanshop: Produktkatalog aus dem Online-Shop der Kadetten (WooCommerce, öffentliche Store-API, nur lesen).
// Zwei Abrufe je Lauf: alle Produkte und alle Ausführungen (Grösse, Farbe) mit Lagerstand. Die App zeigt daraus
// Shop, Produkt und Warenkorb; bestellt wird nichts über die App.

export const SHOP_ORIGIN = 'https://kadettensh.ch';
export const SHOP_PRODUCTS_URL = SHOP_ORIGIN + '/wp-json/wc/store/v1/products?per_page=100';
export const SHOP_VARIATIONS_URL = SHOP_ORIGIN + '/wp-json/wc/store/v1/products?type=variation&per_page=100';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Text ohne HTML, Steuerzeichen und überlange Inhalte. */
export function shopText(value, max = 400) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#8217;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8211;/g, '–')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Nur Bilder aus dem Upload-Ordner der Kadetten-Seite über https. */
export function shopImage(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' && u.hostname === 'kadettensh.ch' && u.pathname.startsWith('/wp-content/uploads/') && /\.(jpe?g|png|webp)$/i.test(u.pathname) && !u.search
      ? u.href
      : null;
  } catch {
    return null;
  }
}

const productLink = value => {
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' && u.hostname === 'kadettensh.ch' && u.pathname.startsWith('/produkt/') ? u.href : null;
  } catch {
    return null;
  }
};

const rappen = value => (/^\d{1,7}$/.test(String(value ?? '')) ? Number(value) : null);

/** Art für die Filter der App: Trikots, Bekleidung, Fanartikel. */
export function shopKind(name) {
  if (/trikot/i.test(name)) return 'trikot';
  if (/hoodie|sweat|shirt|body|beanie|cap|jacke|hose/i.test(name)) return 'bekleidung';
  return 'fanartikel';
}

/** «Farbe: Mint, Grösse: XL» → {Farbe: 'Mint', Grösse: 'XL'} */
export function variationValues(text) {
  const out = {};
  for (const part of shopText(text, 200).split(/,\s*/)) {
    const m = /^([^:]{1,30}):\s*(.{1,40})$/.exec(part);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const sortValues = (name, values) => {
  const list = [...new Set(values)];
  if (/gr(ö|oe)sse/i.test(name)) {
    const rank = v => {
      const i = SIZE_ORDER.indexOf(v.toUpperCase());
      if (i >= 0) return i;
      const n = parseFloat(v);
      return Number.isFinite(n) ? 100 + n : 1000;
    };
    return list.sort((a, b) => rank(a) - rank(b));
  }
  return list;
};

/** Katalog für die App aus den Antworten der Store-API. */
export function parseShop(products, variations = []) {
  if (!Array.isArray(products) || !products.length) throw Error('Shop: keine Produkte');
  const byParent = new Map();
  for (const v of Array.isArray(variations) ? variations : []) {
    const parent = String(v?.parent ?? '');
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(v);
  }
  const list = [];
  for (const p of products) {
    const id = String(p?.id ?? '');
    const name = shopText(p?.name, 80);
    const price = rappen(p?.prices?.price);
    if (!/^\d{1,10}$/.test(id) || !name || price === null || p?.prices?.currency_code !== 'CHF') continue;
    const images = (p.images || [])
      .map(i => ({id: String(i?.id ?? ''), src: shopImage(i?.src)}))
      .filter(i => /^\d{1,10}$/.test(i.id) && i.src)
      .slice(0, 6);
    const variants = (byParent.get(id) || [])
      .map(v => {
        const vid = String(v?.id ?? '');
        const values = variationValues(v?.variation);
        const img = (v?.images || []).map(i => ({id: String(i?.id ?? ''), src: shopImage(i?.src)})).find(i => /^\d{1,10}$/.test(i.id) && i.src);
        const vprice = rappen(v?.prices?.price);
        return /^\d{1,10}$/.test(vid) && Object.keys(values).length
          ? {id: vid, values, price: vprice ?? price, stock: v?.is_in_stock === true, ...(img ? {image: img} : {})}
          : null;
      })
      .filter(Boolean);
    const names = [...new Set(variants.flatMap(v => Object.keys(v.values)))];
    const options = names.map(n => ({name: n, values: sortValues(n, variants.map(v => v.values[n]).filter(Boolean))}));
    if (p.type === 'variable' && !variants.length) continue;
    list.push({
      id,
      name,
      kind: shopKind(name),
      price,
      ...(p.on_sale && rappen(p.prices.regular_price) > price ? {regular: rappen(p.prices.regular_price)} : {}),
      stock: variants.length ? variants.some(v => v.stock) : p.is_in_stock === true,
      images,
      note: shopText(p.short_description || p.description, 400),
      url: productLink(p.permalink) || SHOP_ORIGIN + '/shop/',
      options,
      variants
    });
  }
  if (!list.length) throw Error('Shop: keine gültigen Produkte');
  return {products: list};
}

/** Abruf beider Listen (Store-API, öffentlich). */
export async function fetchShop(get) {
  const [products, variations] = await Promise.all([get(SHOP_PRODUCTS_URL, true), get(SHOP_VARIATIONS_URL, true)]);
  return parseShop(products, variations);
}
