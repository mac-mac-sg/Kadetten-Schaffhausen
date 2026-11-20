// Fanshop: Übersicht, Produkt, Warenkorb und Kasse bis vor die Zahlung. Katalog aus dem Datendienst (data.shop),
// Warenkorb und Angaben nur auf dem Gerät (js/shop.js). Bestellt wird über die App nichts.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {subBand, backLink, sectionHead, notice, loading, chips} from './parts.js';
import {dayLabel, shortTeam} from '../logic.js';
import {
  KINDS,
  SHOP_URL,
  FREE_FROM,
  SHIPPING,
  ADDRESS_FIELDS,
  money,
  imageSrc,
  catalog,
  productById,
  variantFor,
  valueInStock,
  imageFor,
  cart,
  cartCount,
  cartLines,
  totals,
  checkout,
  addressErrors,
  nextHomeGame
} from '../shop.js';

const CHF = r => `CHF ${money(r)}`;

/** Warenkorb-Knopf oben rechts im Band, mit Anzahl. */
function cartButton() {
  const n = cartCount();
  return html`<a class="icb shop-cart" href="${href.warenkorb()}" aria-label="${n ? `Warenkorb, ${n} ${n === 1 ? 'Artikel' : 'Artikel'}` : 'Warenkorb, leer'}">${icon('bag', 22)}${
    n ? html`<i class="num" aria-hidden="true">${n}</i>` : ''
  }</a>`;
}

const img = (image, alt = '', cls = '', eager = false) => {
  const src = imageSrc(image);
  return src
    ? html`<img class="${cls}" src="${src}" alt="${alt}" width="720" height="720"${eager ? '' : html` loading="lazy"`} decoding="async">`
    : '';
};

function tile(p) {
  return html`<a class="pt" href="${href.produkt(p.id)}">
    <span class="pt-img">${img(p.images[0])}${p.stock ? '' : html`<span class="pt-tag">Ausverkauft</span>`}</span>
    <span class="pt-n">${p.name}</span>
    <span class="pt-p num">${p.options.length && new Set(p.variants.map(v => v.price)).size > 1 ? 'ab ' : ''}${CHF(p.price)}</span></a>`;
}

/** Kachel für «Mein Bereich»: dunkel mit Streifenrand wie Spiel-Story und Rückblick, links ein Produktbild, rechts Knopf. */
export function shopTile(data) {
  const products = catalog(data);
  const pick = products.find(p => p.kind === 'trikot' && p.stock && p.images[0]) || products.find(p => p.stock && p.images[0]);
  const n = cartCount();
  const names = ['Trikots', 'Bekleidung', 'Fanartikel'].join(', ');
  return html`<section class="sec" aria-labelledby="m-shop"><a class="card shop-tile" href="${href.shop()}">
    ${pick ? html`<span class="ft-img">${img(pick.images[0])}</span>` : html`<span class="ft-img ft-ph">${icon('bag', 36)}</span>`}
    <span class="ft-txt"><span class="ft-kick" id="m-shop">Kadetten Fanshop</span><b>${names}</b>
    <span class="ft-sub">${n ? `${n} ${n === 1 ? 'Artikel' : 'Artikel'} im Warenkorb` : products.length ? 'Direkt aus dem Online-Shop' : 'Online-Shop der Kadetten'}</span>
    <span class="ft-btn">${n ? 'Zum Warenkorb' : 'Zum Shop'}${icon('go', 16)}</span></span>
    ${n ? html`<i class="ft-num num" aria-hidden="true">${n}</i>` : ''}</a></section>`;
}

/** Hinweis, dass die App nicht bestellt; mit Link in den Online-Shop. */
const previewNote = () =>
  html`<section class="sec"><div class="shop-stop"><b>Bestellen über den Online-Shop</b><span>In der App stellst du den Warenkorb zusammen und gehst die Kasse bis vor die Zahlung durch. Bezahlen und bestellen kannst du im Online-Shop der Kadetten.</span>
    <a href="${SHOP_URL}" target="_blank" rel="noopener">Zum Online-Shop ${icon('ext', 16)}</a></div></section>`;

function missing(state) {
  return state.data
    ? html`<section class="sec">${notice('Der Shop ist gerade nicht erreichbar. Versuche es später wieder oder öffne den Online-Shop.', 'offline')}
      <p class="pad-top"><a class="btn wide" href="${SHOP_URL}" target="_blank" rel="noopener">Online-Shop öffnen ${icon('ext')}</a></p></section>`
    : html`<section class="sec">${loading('Shop wird geladen …')}</section>`;
}

export function renderShop({state, ui = {}}) {
  const products = catalog(state.data);
  const kind = KINDS.some(([id]) => id === ui.shopKind) ? ui.shopKind : 'alle';
  const band = subBand(backLink('Mein Bereich', href.ich()), 'Fanshop', 'Kadetten Schaffhausen', cartButton());
  if (!products.length) return html`${band}${missing(state)}`;
  const groups = KINDS.filter(([id]) => id !== 'alle' && (kind === 'alle' || id === kind))
    .map(([id, label]) => [id, label, products.filter(p => p.kind === id).sort((a, b) => Number(b.stock) - Number(a.stock))])
    .filter(([, , list]) => list.length);
  return html`${band}
    ${chips('shopKind', KINDS, kind, 'Produktart')}
    ${groups.map(
      ([id, label, list]) => html`<section class="sec" aria-labelledby="${'sh-' + id}">${sectionHead(label, '', '', 'sh-' + id)}
      <div class="pgrid shop">${list.map(tile)}</div></section>`
    )}
    <p class="fine pad sec">Versand pauschal ${CHF(SHIPPING)}, ab ${CHF(FREE_FROM)} gratis. Abholen am Heimspiel gratis.</p>
    ${previewNote()}`;
}

/** Hinweistext des Shops mit klickbarer E-Mail-Adresse der Geschäftsstelle. */
function noteText(text) {
  const parts = String(text || '').split(/([\w.+-]+@kadettensh\.ch)/);
  return parts.map((part, i) => (i % 2 ? html`<a href="${'mailto:' + part}">${part}</a>` : part));
}

export function renderProdukt({route, state, ui = {}}) {
  const p = productById(state.data, route.id);
  const back = backLink('Fanshop', href.shop(), true);
  if (!p)
    return html`${subBand(back, 'Produkt', '', cartButton())}${
      catalog(state.data).length
        ? html`<section class="sec">${notice('Dieses Produkt gibt es im Shop nicht mehr.', 'offline')}</section>`
        : missing(state)
    }`;
  const sel = ui.shopSel?.id === p.id ? ui.shopSel.values : {};
  const variant = variantFor(p, sel);
  const complete = !p.options.length || Boolean(variant);
  const stock = p.options.length ? Boolean(variant?.stock) : p.stock;
  const price = variant?.price ?? p.price;
  const lead = imageFor(p, sel);
  const images = [lead, ...p.images.filter(i => i.id !== lead?.id)].filter(Boolean);
  const open = p.options.find(o => !sel[o.name]);
  const added = ui.shopAdded === p.id;
  const t = totals(cartLines(state.data), checkout().delivery);
  const more = catalog(state.data)
    .filter(x => x.id !== p.id && x.stock)
    .sort((a, b) => Number(b.kind === p.kind) - Number(a.kind === p.kind))
    .slice(0, 4);
  return html`${subBand(back, p.name, p.kind === 'trikot' ? 'Trikots' : p.kind === 'bekleidung' ? 'Bekleidung' : 'Fanartikel', cartButton())}
    <section class="sec first">
      <div class="pg" aria-label="Bilder">${images.map((im, i) => img(im, i ? '' : p.name, 'pg-img', !i))}</div>
      <div class="pd-head"><p class="pd-p num">${CHF(price)}</p>${p.stock ? '' : html`<span class="tag-ink">Ausverkauft</span>`}</div>
    </section>
    ${p.options.map(
      o => html`<section class="sec tight" aria-labelledby="${'opt-' + o.name}"><h2 class="pd-l" id="${'opt-' + o.name}">${o.name}${sel[o.name] ? html`: <b>${sel[o.name]}</b>` : ''}</h2>
      <div class="chips opt" role="group" aria-labelledby="${'opt-' + o.name}">${o.values.map(v => {
        const on = sel[o.name] === v;
        const ok = valueInStock(p, o.name, v, sel);
        return html`<button type="button" class="${'chip' + (on ? ' on' : '') + (ok ? '' : ' out')}" data-shop-opt="${o.name + '|' + v}" aria-pressed="${String(on)}"${
          ok ? '' : html` aria-label="${v + ', ausverkauft'}"`
        }>${v}</button>`;
      })}</div></section>`
    )}
    ${p.note ? html`<section class="sec"><p class="pd-note">${noteText(p.note)}</p></section>` : ''}
    <section class="sec"><a class="pd-ext" href="${p.url}" target="_blank" rel="noopener">Im Online-Shop ansehen ${icon('ext', 16)}</a></section>
    <div class="buy" role="region" aria-label="Kaufen">${
      added
        ? html`<div class="buy-ok" role="status"><p class="buy-k">${icon('check', 18)}Im Warenkorb</p>${freeBar(t)}
        <div class="buy-two"><a class="btn pri" href="${href.warenkorb()}">Zum Warenkorb</a><button class="btn" type="button" data-shop-added-close>Weiter einkaufen</button></div></div>`
        : html`<button class="btn pri wide" type="button" data-shop-add="${p.id}"${complete && stock ? '' : html` disabled`}>${
            !complete ? `Bitte ${open.name} wählen` : stock ? `In den Warenkorb · ${CHF(price)}` : 'Ausverkauft'
          }</button>`
    }</div>
    ${more.length ? html`<section class="sec" aria-labelledby="sh-more">${sectionHead('Passt dazu', '', '', 'sh-more')}<div class="pgrid shop">${more.map(tile)}</div></section>` : ''}`;
}

/** Balken bis zum Gratisversand. */
function freeBar(t) {
  const pct = Math.min(100, Math.round((t.items / FREE_FROM) * 100));
  return html`<div class="free"><span class="free-bar" aria-hidden="true"><i data-style="${'width:' + Math.max(2, pct) + '%'}"></i></span>
    <span class="free-t">${t.free ? 'Gratisversand erreicht.' : html`Noch <b class="num">${CHF(t.missing)}</b> bis zum Gratisversand.`}</span></div>`;
}

function line(l, edit = true) {
  const name = l.product?.name || 'Produkt nicht mehr im Shop';
  return html`<div class="cl${l.known && l.stock ? '' : ' gone'}">
    <span class="cl-img">${l.product ? img(l.variant?.image || l.product.images[0]) : ''}</span>
    <span class="cl-t">${l.product ? html`<a href="${href.produkt(l.product.id)}">${name}</a>` : name}${l.label ? html`<small>${l.label}</small>` : ''}${
      l.known && !l.stock
        ? html`<small class="warn">Ausverkauft, wird nicht berechnet</small>`
        : l.known
          ? ''
          : html`<small class="warn">Nicht mehr erhältlich</small>`
    }<b class="num">${CHF(l.sum)}</b></span>
    ${
      edit
        ? html`<span class="qty">
      <button type="button" class="icb sm" data-shop-qty="${l.index + ':-1'}" aria-label="${l.item.q === 1 ? `${name} entfernen` : `${name}: eins weniger`}">${icon(l.item.q === 1 ? 'trash' : 'minus', 18)}</button>
      <b class="num" aria-label="${'Menge ' + l.item.q}">${l.item.q}</b>
      <button type="button" class="icb sm" data-shop-qty="${l.index + ':1'}" aria-label="${name + ': eins mehr'}"${l.item.q >= 9 || !l.known ? html` disabled` : ''}>${icon('plus', 18)}</button></span>`
        : html`<span class="qty"><b class="num">${l.item.q}×</b></span>`
    }</div>`;
}

function summary(t, delivery, chosen) {
  return html`<dl class="card list sum">
    <div class="rl"><dt>Artikel (${t.count})</dt><dd class="num">${CHF(t.items)}</dd></div>
    <div class="rl"><dt>${chosen ? (delivery === 'abholung' ? 'Abholen am Heimspiel' : 'Postversand') : 'Versand'}</dt><dd class="num">${
      chosen ? (t.shipping ? CHF(t.shipping) : 'gratis') : t.free ? 'gratis' : `${CHF(SHIPPING)} oder Abholung gratis`
    }</dd></div>
    <div class="rl tot"><dt>${chosen ? 'Total' : 'Zwischensumme'}</dt><dd class="num">${CHF(chosen ? t.total : t.items)}</dd></div></dl>`;
}

export function renderWarenkorb({state}) {
  const lines = cartLines(state.data);
  const count = cartCount();
  const band = subBand(backLink('Fanshop', href.shop(), true), 'Warenkorb', count ? `${count} Artikel` : 'leer');
  if (!lines.length)
    return html`${band}<section class="sec">${notice('Dein Warenkorb ist leer.', 'bag')}<p class="pad-top"><a class="btn pri wide" href="${href.shop()}">Zum Fanshop</a></p></section>`;
  if (!catalog(state.data).length) return html`${band}${missing(state)}`;
  const t = totals(lines, checkout().delivery);
  return html`${band}
    <section class="sec first"><div class="card cart">${lines.map(l => line(l))}</div></section>
    <section class="sec tight"><div class="card pad">${freeBar(t)}</div></section>
    <section class="sec tight">${summary(t, 'post', false)}</section>
    <div class="buy">${
      t.count
        ? html`<a class="btn pri wide" href="${href.kasse()}">Zur Kasse · ${CHF(t.items)}</a>`
        : html`<button class="btn pri wide" type="button" disabled>Nichts Bestellbares im Warenkorb</button>`
    }</div>`;
}

const STEPS = [
  ['lieferung', 'Lieferung'],
  ['adresse', 'Angaben'],
  ['uebersicht', 'Übersicht']
];

function steps(current) {
  const at = STEPS.findIndex(([id]) => id === current);
  return html`<ol class="steps" aria-label="Schritte der Kasse">${STEPS.map(
    ([id, label], i) =>
      html`<li class="${i <= at ? 'on' : ''}"${i === at ? html` aria-current="step"` : ''}><span class="num">${i + 1}</span>${label}</li>`
  )}</ol>`;
}

export function renderKasse({route, state, now, ui = {}}) {
  const lines = cartLines(state.data);
  const c = checkout();
  const t = totals(lines, c.delivery);
  const step = route.step;
  const title = STEPS.find(([id]) => id === step)[1];
  const backTarget = step === 'uebersicht' ? href.kasse('adresse') : step === 'adresse' ? href.kasse() : href.warenkorb();
  const band = subBand(
    backLink(step === 'lieferung' ? 'Warenkorb' : 'Zurück', backTarget),
    title,
    `Kasse · Schritt ${STEPS.findIndex(([id]) => id === step) + 1} von 3`
  );
  if (!t.count)
    return html`${band}<section class="sec">${
      catalog(state.data).length || !state.data
        ? notice('Im Warenkorb ist nichts Bestellbares.', 'bag')
        : notice('Der Shop ist gerade nicht erreichbar.', 'offline')
    }<p class="pad-top"><a class="btn pri wide" href="${href.shop()}">Zum Fanshop</a></p></section>`;
  if (step === 'lieferung') {
    const game = nextHomeGame(state.data?.games, now);
    const opt = (id, label, price, text) =>
      html`<button type="button" class="${'opt-card' + (c.delivery === id ? ' on' : '')}" data-shop-delivery="${id}" aria-pressed="${String(c.delivery === id)}">
        <span class="opt-r" aria-hidden="true"></span><span class="opt-t"><b>${label} <span class="tag-ink">${price}</span></b><small>${text}</small></span></button>`;
    return html`${band}${steps(step)}
      <section class="sec" aria-label="Lieferart"><div class="opts">
      ${opt('post', 'Postversand', t.items >= FREE_FROM ? 'gratis' : CHF(SHIPPING), `Lieferung per Post in 3 bis 5 Werktagen. Ab ${CHF(FREE_FROM)} gratis.`)}
      ${opt(
        'abholung',
        'Abholen am Heimspiel',
        'gratis',
        game
          ? `Am Fanshop-Stand in der BBC Arena. Nächstes Heimspiel: ${dayLabel(game, now)}${game.time ? ', ' + game.time : ''} gegen ${shortTeam(game.away)}.`
          : 'Am Fanshop-Stand in der BBC Arena beim nächsten Heimspiel.'
      )}</div></section>
      <section class="sec tight">${summary(t, c.delivery, true)}</section>
      <div class="buy end"><a class="btn pri wide" href="${href.kasse('adresse')}">Weiter zu den Angaben</a></div>`;
  }
  if (step === 'adresse') {
    const pickup = c.delivery === 'abholung';
    const fields = ADDRESS_FIELDS.filter(([k]) => !pickup || ['first', 'last', 'email'].includes(k));
    const errors = ui.shopTried ? addressErrors(c.address, c.delivery) : {};
    return html`${band}${steps(step)}
      <section class="sec"><form class="card pad form" id="kasse-form" data-shop-form novalidate>
      ${fields.map(
        ([
          k,
          label,
          auto
        ]) => html`<label class="${'fld' + (k === 'zip' ? ' half' : '') + (k === 'city' ? ' grow' : '')}"><span>${label}</span>
        <input data-shop-field="${k}" name="${k}" value="${c.address[k] || ''}" autocomplete="${auto}"${k === 'email' ? html` type="email" inputmode="email"` : k === 'zip' ? html` inputmode="numeric" maxlength="4"` : ''}${
          errors[k] ? html` aria-invalid="true" aria-describedby="${'err-' + k}"` : ''
        } maxlength="80">${errors[k] ? html`<small class="err" id="${'err-' + k}">${errors[k]}</small>` : ''}</label>`
      )}</form>
      <p class="fine pad-top">${pickup ? 'Name und E-Mail für die Abholung.' : 'Lieferung nur in die Schweiz.'} Die Angaben bleiben auf diesem Gerät und werden nicht gesendet.</p></section>
      <div class="buy end"><button class="btn pri wide" type="submit" form="kasse-form" data-shop-address-next>Weiter zur Übersicht</button></div>`;
  }
  const a = c.address;
  const ready = !Object.keys(addressErrors(a, c.delivery)).length;
  return html`${band}${steps(step)}
    <section class="sec"><div class="card cart">${lines.filter(l => l.known && l.stock).map(l => line(l, false))}</div></section>
    <section class="sec tight">${summary(t, c.delivery, true)}</section>
    <section class="sec tight"><div class="card pad adr">
      <p class="adr-k">${c.delivery === 'abholung' ? 'Abholung durch' : 'Lieferadresse'}</p>
      ${
        ready
          ? html`<p><b>${a.first} ${a.last}</b>${c.delivery === 'abholung' ? '' : html`<br>${a.street}<br>${a.zip} ${a.city}`}<br>${a.email}</p>`
          : notice('Angaben fehlen noch.', 'doc')
      }
      <a href="${href.kasse('adresse')}">Ändern</a></div></section>
    <section class="sec"><div class="shop-stop" role="note"><b>Hier endet die Kasse in der App</b><span>Bezahlen ist in der App nicht möglich, es wird nichts bestellt. Bestelle diese Artikel im Online-Shop der Kadetten.</span>
      <a href="${SHOP_URL}" target="_blank" rel="noopener">Zum Online-Shop ${icon('ext', 16)}</a></div>
      <p class="pad-top"><button class="btn wide" type="button" data-shop-forget>Angaben auf diesem Gerät löschen</button></p></section>
    <div class="buy end"><button class="btn pri wide" type="button" disabled>Zahlung · in der App nicht verfügbar</button></div>`;
}
