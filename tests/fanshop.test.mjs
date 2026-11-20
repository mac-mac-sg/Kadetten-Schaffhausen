import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseShop, shopImage, shopText, variationValues, shopKind} from '../server/shop.mjs';
import {refresh} from '../server/update.mjs';
import {parseRoute, href} from '../src/kadetten/js/router.js';

const raw = JSON.parse(readFileSync('tests/fixtures/shop-store-api.json', 'utf8'));
const shop = JSON.parse(readFileSync('tests/fixtures/shop.json', 'utf8'));

// Gerätespeicher für die App-Logik
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
beforeEach(() => mem.clear());
const S = await import('../src/kadetten/js/shop.js');
const V = await import('../src/kadetten/js/views/shop.js');
const doc = markup => parseHTML('<html><body>' + String(markup) + '</body></html>').document;
const data = {shop, games: []};

test('Datendienst: Katalog aus der Store-API mit Grössen, Farben, Lager und sicheren Bildern', () => {
  const {products} = parseShop(raw.products, raw.variations);
  const heim = products.find(p => p.name === 'Trikot Heim');
  assert.equal(heim.price, 7400);
  assert.equal(heim.kind, 'trikot');
  assert.deepEqual(heim.options, [{name: 'Grösse', values: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']}]);
  assert.ok(heim.images.every(i => i.src.startsWith('https://kadettensh.ch/wp-content/uploads/')));
  assert.match(heim.note, /Geschäftsstelle melden: geschaeftsstelle@kadettensh\.ch/);
  assert.doesNotMatch(heim.note, /</, 'kein HTML im Hinweis');
  const goalie = products.find(p => p.name.startsWith('Goalie'));
  assert.deepEqual(
    goalie.options.map(o => o.name),
    ['Farbe', 'Grösse']
  );
  assert.ok(
    goalie.variants.every(v => v.image),
    'Farbbild je Ausführung'
  );
  const kids = products.find(p => p.name === 'Sweatshirt Kids');
  assert.equal(kids.stock, false, 'alle Grössen ausverkauft');
  const pin = products.find(p => p.name === 'Pin');
  assert.equal(pin.options.length, 0);
  assert.equal(pin.price, 200);
  assert.equal(pin.url, 'https://kadettensh.ch/produkt/pin/');
});

test('Datendienst: fremde Bilder, Links und HTML werden verworfen, leerer Katalog ist ein Fehler', () => {
  assert.equal(shopImage('https://evil.example/wp-content/uploads/a.jpg'), null);
  assert.equal(shopImage('http://kadettensh.ch/wp-content/uploads/a.jpg'), null);
  assert.equal(shopImage('https://kadettensh.ch/wp-content/uploads/a.svg'), null);
  assert.equal(shopImage('https://kadettensh.ch/wp-content/uploads/a.jpg?x=1'), null);
  assert.equal(shopText('<script>x</script><p>Hallo&nbsp;<b>Fans</b></p>'), 'xHallo Fans');
  assert.deepEqual(variationValues('Farbe: Mint, Grösse: XL'), {Farbe: 'Mint', Grösse: 'XL'});
  assert.equal(shopKind('Hoodie Kids'), 'bekleidung');
  assert.equal(shopKind('Pin'), 'fanartikel');
  assert.throws(() => parseShop([]), /keine Produkte/);
  assert.throws(() => parseShop([{id: 1, name: 'X', prices: {price: 'abc', currency_code: 'CHF'}}]), /keine gültigen/);
  const evil = parseShop([{...raw.products.find(p => p.name === 'Pin'), permalink: 'https://evil.example/produkt/pin/'}]);
  assert.equal(evil.products[0].url, 'https://kadettensh.ch/shop/');
});

test('Datendienst: Shop-Lauf liest die Store-API, behält bei Fehlern den letzten Stand und meldet ihn', async t => {
  const seed = JSON.parse(readFileSync('server/seed.json', 'utf8'));
  let answer = raw;
  // Nur die Store-API antwortet; alle anderen Quellen fallen aus und behalten ihren Stand.
  t.mock.method(globalThis, 'fetch', async url => {
    if (!String(url).includes('/wp-json/wc/store/v1/products')) throw Error('offline');
    const body = String(url).includes('type=variation') ? answer.variations : answer.products;
    return new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}});
  });
  const ok = await refresh(seed, {posts: []});
  assert.equal(ok.status.shop.ok, true);
  assert.equal(ok.shop.products.length, 4);
  assert.equal(ok.shop.updatedAt, ok.checkedAt);
  answer = {products: [], variations: []};
  const broken = await refresh({...seed, shop: ok.shop, status: ok.status}, {posts: []});
  assert.equal(broken.status.shop.ok, false);
  assert.equal(broken.shop.products.length, 4, 'letzter Katalog bleibt');
  const none = await refresh(seed, {matchHtml: '<table></table>', posts: []});
  assert.equal(none.status.shop, undefined, 'mit gelieferten Quellen ohne Katalog keine Abfrage');
});

test('Routen: Shop, Produkt, Warenkorb, Kasse', () => {
  assert.deepEqual(parseRoute('#/shop'), {area: 'ich', view: 'shop'});
  assert.deepEqual(parseRoute('#/shop/33904'), {area: 'ich', view: 'produkt', id: '33904'});
  assert.deepEqual(parseRoute('#/shop/abc'), {area: 'ich', view: 'shop'});
  assert.deepEqual(parseRoute('#/warenkorb'), {area: 'ich', view: 'warenkorb'});
  assert.deepEqual(parseRoute('#/kasse/adresse'), {area: null, view: 'kasse', step: 'adresse'});
  assert.deepEqual(parseRoute('#/kasse/zahlung'), {area: null, view: 'kasse', step: 'lieferung'});
  assert.equal(href.kasse('uebersicht'), '#/kasse/uebersicht');
  assert.equal(href.kasse(), '#/kasse');
});

test('Warenkorb: gleiche Ausführung zusammenfassen, Menge begrenzen, entfernen', () => {
  S.addToCart('33904', '33924');
  S.addToCart('33904', '33924', 2);
  S.addToCart('30146');
  assert.deepEqual(S.cart(), [
    {p: '33904', v: '33924', q: 3},
    {p: '30146', v: '', q: 1}
  ]);
  S.addToCart('30146', '', 20);
  assert.equal(S.cart()[1].q, 9, 'höchstens 9');
  S.changeQty(0, -3);
  assert.deepEqual(S.cart(), [{p: '30146', v: '', q: 9}]);
  mem.set(
    'v2:shop-cart',
    JSON.stringify([
      {p: '<x>', v: '', q: 1},
      {p: '1', v: '', q: -2},
      {p: '30146', v: '', q: 1}
    ])
  );
  assert.deepEqual(S.cart(), [{p: '30146', v: '', q: 1}], 'Ungültiges fällt weg');
});

test('Versand: CHF 10 pauschal, ab CHF 100 gratis, Abholung gratis; Ausverkauftes zählt nicht', () => {
  const heim = shop.products.find(p => p.name === 'Trikot Heim');
  const size = heim.variants.find(v => v.stock);
  S.addToCart(heim.id, size.id);
  let t = S.totals(S.cartLines(data));
  assert.deepEqual([t.items, t.shipping, t.total, t.missing], [7400, 1000, 8400, 2600]);
  assert.equal(S.totals(S.cartLines(data), 'abholung').shipping, 0);
  S.addToCart(heim.id, size.id);
  t = S.totals(S.cartLines(data));
  assert.deepEqual([t.items, t.shipping, t.free], [14800, 0, true]);
  const kids = shop.products.find(p => p.name === 'Sweatshirt Kids');
  S.addToCart(kids.id, kids.variants[0].id);
  S.addToCart('99999');
  const lines = S.cartLines(data);
  assert.equal(lines[1].stock, false);
  assert.equal(lines[2].known, false);
  assert.equal(S.totals(lines).count, 2);
  assert.equal(S.money(7400), '74.–');
  assert.equal(S.money(450), '4.50');
});

test('Auswahl: Ausführung, Lager je Wert, Bild der Farbe', () => {
  const goalie = shop.products.find(p => p.name.startsWith('Goalie'));
  assert.equal(S.variantFor(goalie, {Farbe: 'Mint'}), null, 'unvollständig');
  const v = S.variantFor(goalie, {Farbe: 'Mint', Grösse: 'L'});
  assert.deepEqual(v.values, {Farbe: 'Mint', Grösse: 'L'});
  assert.equal(S.imageFor(goalie, {Farbe: 'Mint'}).id, goalie.variants.find(x => x.values.Farbe === 'Mint').image.id);
  const away = shop.products.find(p => p.name === 'Trikot Auswärts');
  assert.equal(S.valueInStock(away, 'Grösse', 'L'), false, 'L ausverkauft');
  assert.equal(S.valueInStock(away, 'Grösse', 'M'), true);
  assert.match(S.imageSrc(away.images[0]), /^assets\/shop\/\d+\.webp$/, 'verkleinerte Kopie');
  assert.equal(
    S.imageSrc({id: '1', src: 'https://kadettensh.ch/wp-content/uploads/x.jpg'}),
    'https://kadettensh.ch/wp-content/uploads/x.jpg'
  );
});

test('Angaben: Pflichtfelder je Lieferart, PLZ und E-Mail geprüft, nur auf dem Gerät', () => {
  assert.deepEqual(Object.keys(S.addressErrors({}, 'abholung')), ['first', 'last', 'email']);
  assert.equal(Object.keys(S.addressErrors({})).length, 6);
  const a = {first: 'A', last: 'B', street: 'C 1', zip: '820', city: 'Schaffhausen', email: 'x@y'};
  assert.deepEqual(Object.keys(S.addressErrors(a)), ['zip', 'email']);
  assert.deepEqual(S.addressErrors({...a, zip: '8200', email: 'fan@example.ch'}), {});
  S.setAddressField('first', 'Ana');
  S.setAddressField('evil', 'x');
  S.setDelivery('abholung');
  assert.deepEqual(S.checkout(), {delivery: 'abholung', address: {first: 'Ana'}});
  S.forgetCheckout();
  assert.deepEqual(S.checkout(), {delivery: 'post', address: {}});
});

test('Ansichten: Shop mit Filtern, Produkt mit Auswahl und gesperrtem Knopf, Kasse endet vor der Zahlung', () => {
  const state = {data};
  const list = doc(V.renderShop({state, ui: {shopKind: 'fanartikel'}}));
  assert.ok(list.querySelector('.chip.on[data-ui="shopKind:fanartikel"]'));
  assert.ok([...list.querySelectorAll('.pt')].every(a => /^#\/shop\/\d+$/.test(a.getAttribute('href'))));
  assert.equal(list.querySelectorAll('#sh-trikot').length, 0);
  const away = shop.products.find(p => p.name === 'Trikot Auswärts');
  const page = doc(V.renderProdukt({route: {id: away.id}, state, ui: {}}));
  assert.equal(page.querySelector('[data-shop-add]').hasAttribute('disabled'), true);
  assert.match(page.querySelector('[data-shop-add]').textContent, /Bitte Grösse wählen/);
  assert.ok(page.querySelector('.chip.out[data-shop-opt="Grösse|L"]'), 'ausverkaufte Grösse markiert');
  assert.equal(page.querySelector('.pd-note a').getAttribute('href'), 'mailto:geschaeftsstelle@kadettensh.ch');
  const picked = doc(V.renderProdukt({route: {id: away.id}, state, ui: {shopSel: {id: away.id, values: {Grösse: 'M'}}}}));
  assert.match(picked.querySelector('[data-shop-add]').textContent, /In den Warenkorb · CHF 74\.–/);
  S.addToCart(away.id, away.variants.find(v => v.values.Grösse === 'M').id);
  S.setDelivery('post');
  const end = doc(V.renderKasse({route: {step: 'uebersicht'}, state, now: Date.parse('2026-11-19T07:00:00+01:00'), ui: {}}));
  assert.match(end.querySelector('.shop-stop').textContent, /Bezahlen ist in der App nicht möglich/);
  assert.ok(end.querySelector('.buy button[disabled]'), 'Zahlung gesperrt');
  assert.equal(end.querySelectorAll('form').length, 0);
  assert.match(end.querySelector('.sum .tot').textContent, /CHF 84\.–/);
  const empty = doc(V.renderShop({state: {data: {games: []}}, ui: {}}));
  assert.match(empty.body.textContent, /nicht erreichbar/);
});

test('Mein Bereich: Fanshop-Kachel mit Trikotbild, Zähler und Knopf; ohne Katalog ohne Bild', () => {
  const tile = doc(V.shopTile(data));
  assert.equal(tile.querySelector('a.shop-tile').getAttribute('href'), '#/shop');
  assert.match(tile.querySelector('.ft-img img').getAttribute('src'), /^assets\/shop\/\d+\.webp$/);
  assert.equal(tile.querySelector('.ft-btn').textContent.trim(), 'Zum Shop');
  assert.equal(tile.querySelector('.ft-num'), null);
  S.addToCart('30146');
  S.addToCart('30146');
  const full = doc(V.shopTile(data));
  assert.equal(full.querySelector('.ft-num').textContent, '2');
  assert.match(full.querySelector('.ft-sub').textContent, /2 Artikel im Warenkorb/);
  assert.equal(full.querySelector('.ft-btn').textContent.trim(), 'Zum Warenkorb');
  const none = doc(V.shopTile({games: []}));
  assert.ok(none.querySelector('.ft-ph'), 'Platzhalter statt Bild');
  assert.equal(none.querySelector('a.shop-tile').getAttribute('href'), '#/shop');
});
