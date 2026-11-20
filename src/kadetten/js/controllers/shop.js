// Fanshop: Auswahl von Grösse und Farbe, Warenkorb, Lieferart und Angaben. Alles bleibt auf dem Gerät.
import {parseRoute, href} from '../router.js';
import {
  productById,
  variantFor,
  addToCart,
  changeQty,
  cartLines,
  setDelivery,
  setAddressField,
  checkout,
  addressErrors,
  forgetCheckout
} from '../shop.js';

export function createShop({ui, store, render, announce}) {
  const product = () => {
    const route = parseRoute(location.hash);
    return route.view === 'produkt' ? productById(store.state.data, route.id) : null;
  };

  // Eingaben der Adresse sofort sichern: ein Neuzeichnen (Live-Daten) behält so den Text.
  document.addEventListener('input', event => {
    const field = event.target.closest?.('[data-shop-field]');
    if (field) setAddressField(field.dataset.shopField, field.value);
  });
  const next = () => {
    const c = checkout();
    const errors = addressErrors(c.address, c.delivery);
    if (Object.keys(errors).length) {
      ui.shopTried = true;
      render();
      document.querySelector('[aria-invalid="true"]')?.focus();
      announce('Bitte die markierten Angaben ergänzen.');
      return;
    }
    ui.shopTried = false;
    location.hash = href.kasse('uebersicht');
  };
  document.addEventListener('submit', event => {
    if (!event.target.closest?.('[data-shop-form]')) return;
    event.preventDefault();
    next();
  });

  return {
    focusAttrs: ['data-shop-opt', 'data-shop-qty', 'data-shop-delivery', 'data-shop-field'],
    onEnter(route) {
      if (route.view !== 'produkt') ui.shopAdded = null;
      if (route.view === 'kasse' && route.step === 'adresse') ui.shopTried = false;
      if (route.view === 'produkt' && ui.shopSel?.id !== route.id) {
        // Optionen mit nur einem Wert (z. B. eine Farbe) sind gleich gewählt.
        const p = productById(store.state.data, route.id);
        ui.shopSel = {
          id: route.id,
          values: Object.fromEntries((p?.options || []).filter(o => o.values.length === 1).map(o => [o.name, o.values[0]]))
        };
        ui.shopAdded = null;
      }
    },
    actions: [
      [
        'data-shop-opt',
        el => {
          const p = product();
          if (!p) return;
          const [name, value] = el.dataset.shopOpt.split('|');
          const values = ui.shopSel?.id === p.id ? ui.shopSel.values : {};
          ui.shopSel = {id: p.id, values: {...values, [name]: value}};
          ui.shopAdded = null;
          render();
        }
      ],
      [
        'data-shop-add',
        () => {
          const p = product();
          if (!p) return;
          const variant = variantFor(p, ui.shopSel?.id === p.id ? ui.shopSel.values : {});
          if (p.options.length ? !variant?.stock : !p.stock) return;
          addToCart(p.id, variant?.id || '');
          ui.shopAdded = p.id;
          render();
          announce(`${p.name} ist im Warenkorb.`);
          document.querySelector('.buy-ok a')?.focus({preventScroll: true});
        }
      ],
      [
        'data-shop-added-close',
        () => {
          ui.shopAdded = null;
          render();
        }
      ],
      [
        'data-shop-qty',
        el => {
          const [index, delta] = el.dataset.shopQty.split(':').map(Number);
          const line = cartLines(store.state.data)[index];
          const items = changeQty(index, delta);
          render();
          if (line && !items.some(i => i.p === line.item.p && i.v === line.item.v))
            announce(`${line.product?.name || 'Artikel'} entfernt.`);
        }
      ],
      [
        'data-shop-delivery',
        el => {
          setDelivery(el.dataset.shopDelivery);
          render();
        }
      ],
      [
        'data-shop-forget',
        () => {
          forgetCheckout();
          announce('Angaben gelöscht.');
          location.hash = href.warenkorb();
        }
      ]
    ]
  };
}
