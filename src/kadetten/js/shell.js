// Hülle der App: Navigation (Verlauf, Scrollposition, Fokus), Zeichnen der Ansichten und der Klick-Verteiler.
// Die Bedienung einzelner Bereiche liegt in controllers/*; jedes Steuermodul meldet hier an:
//   actions:      [[data-Attribut, run(element, event), {ignoreAfterSwipe?}], …], Klick auf button oder [data-ui]
//   early:        [{selector, run(element, event) → true wenn behandelt}], vor den Aktionen
//   focusAttrs:   Attribute, über die der Fokus beim Neuzeichnen wiedergefunden wird
//   beforeRender(route), afterRender(route), beforeNavigate(), onEnter(route, entry)
import {parseRoute, createNavigation, href, replacesHistory, parentHash, ancestors, switchesSibling, sameHash} from './router.js';
import {readTheme} from './theme.js';
import {html} from './text.js';
import {needsWelcome, markWelcome} from './personal.js';
import {nav, setLogos} from './views/parts.js';
import {liveTile, renderLiveTile} from './views/live-kachel.js';

// Attribute, über die der Fokus beim Neuzeichnen wiedergefunden wird (die Steuermodule ergänzen ihre eigenen).
const FOCUS_ATTRS = ['data-ui'];

export function createShell({app, ui, store, api, views, controllers, gestures}) {
  const navigation = createNavigation();
  const hook = (name, ...args) => controllers.forEach(c => c[name]?.(...args));
  let lastView = '',
    scheduled = false,
    focusChips = false,
    replacing = false,
    correcting = false,
    navigationPending = true;
  const celebrated = new Map();
  const focusAttrs = [...FOCUS_ATTRS, ...controllers.flatMap(c => c.focusAttrs || [])];

  function focusSelector(el) {
    for (const attr of focusAttrs) if (el.hasAttribute?.(attr)) return `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`;
    return el.getAttribute?.('href') ? `a[href="${CSS.escape(el.getAttribute('href'))}"]` : null;
  }

  function enterRoute() {
    const previous = navigation.current;
    const known = history.state?.kadettenEntry;
    const entry = navigation.enter(location.hash || '#/', known, window.scrollY);
    if (!entry.restore) {
      // Ein ersetzter Eintrag (Wechsel innerhalb eines Wissenskapitels) zählt nicht als neuer Schritt im Verlauf.
      navigation.setDepth((previous?.depth ?? -1) + (replacing ? 0 : 1));
      if (replacing) navigation.replaceCurrent();
      history.replaceState({...history.state, kadettenEntry: entry.id}, '');
    }
    replacing = false;
    hook('onEnter', parseRoute(location.hash), entry);
    ui.backTarget = navigation.backTarget();
    // Wer in einem Spielzug von Schritt zu Schritt geht, bleibt an derselben Stelle der Seite.
    const was = previous ? parseRoute(previous.hash) : null,
      now = parseRoute(location.hash);
    const inWissen = was && was.view === 'wissen' && now.view === 'wissen' && was.chapter === now.chapter;
    navigationPending = !(inWissen && was.id && was.id === now.id && was.step !== now.step);
    // Wer in Aufstellungen oder Spielzügen eine andere Formation wählt, sieht gleich das neue Feldbild (Seite beginnt bei den Wahlknöpfen).
    focusChips = navigationPending && Boolean(inWissen) && now.chapter !== 'regeln';
  }

  function jumpToNextGame() {
    const next = app.querySelector('[data-next-game]');
    if (!next) return;
    next.scrollIntoView({block: 'center', behavior: 'instant'});
    next.focus({preventScroll: true});
  }

  function render() {
    scheduled = false;
    const route = parseRoute(location.hash);
    setLogos(store.state.data?.clubLogos);
    // Geöffnete Aufklapper, die Fokusposition und die Stelle im Ticker bleiben beim Neuzeichnen erhalten.
    const anchor = [...app.querySelectorAll('[data-event-id]')].find(el => el.getBoundingClientRect().top >= 0);
    const anchorId = anchor?.dataset.eventId,
      anchorTop = anchor?.getBoundingClientRect().top;
    const preserveTicker = window.scrollY > 250 && !navigationPending;
    const open = new Set([...app.querySelectorAll('details[open][id]')].map(d => d.id));
    const focusKey = document.activeElement?.closest?.('#app') ? focusSelector(document.activeElement) : null;
    hook('beforeRender', route);
    ui.enter = ui.enterHash !== location.hash;
    const context = {route, state: store.state, now: Date.now(), load: store.load, api, ui, theme: readTheme()};
    const tile = liveTile({state: store.state, route, now: context.now});
    app.innerHTML = String(
      html`<main id="main" tabindex="-1">${views[route.view](context)}</main>${route.area ? nav(route.area) : ''}${renderLiveTile(tile)}`
    );
    document.documentElement.classList.toggle('has-tile', Boolean(tile));
    hook('afterRender', route);
    ui.enterHash = location.hash;
    for (const id of open) document.getElementById(id)?.setAttribute('open', '');
    // Siegmoment nur beim ersten Anzeigen eines Resultats.
    for (const hero of app.querySelectorAll('.hero.celebrate')) {
      const key = hero.dataset.celebrate;
      if (!celebrated.has(key)) celebrated.set(key, performance.now());
      if (performance.now() - celebrated.get(key) > 2500 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        hero.classList.remove('celebrate');
      }
    }
    // Berechnete Breiten und Anteile per CSSOM setzen: Die CSP erlaubt keine style-Attribute.
    for (const el of app.querySelectorAll('[data-style]'))
      for (const decl of el.dataset.style.split(';')) {
        const [prop, value] = decl.split(':').map(x => x?.trim());
        if (/^(width|flex)$/.test(prop || '') && /^[0-9.]+%?$/.test(value || '')) el.style.setProperty(prop, value);
      }
    const key = route.view + ':' + (route.id || '') + ':' + (route.tab || '');
    if (key !== lastView) {
      if (lastView) document.getElementById('main')?.focus({preventScroll: true});
      lastView = key;
    } else if (focusKey) app.querySelector(focusKey)?.focus({preventScroll: true});
    if (preserveTicker && anchorId) {
      const nextAnchor = [...app.querySelectorAll('[data-event-id]')].find(el => el.dataset.eventId === anchorId);
      if (nextAnchor) window.scrollBy(0, nextAnchor.getBoundingClientRect().top - anchorTop);
    }
    const entry = navigation.current;
    if (navigationPending) {
      const chips = focusChips && !entry?.restore ? app.querySelector('nav.chips') : null;
      if (chips) chips.scrollIntoView({block: 'start', behavior: 'instant'});
      else window.scrollTo(0, entry?.restore ? entry.scroll : 0);
      navigationPending = false;
      focusChips = false;
    }
    // Wait for the asynchronously loaded games before the initial jump. Never repeat on timer renders.
    if (entry?.autoNext && store.state.data) {
      entry.autoNext = false;
      jumpToNextGame();
    }
    document.title = (document.querySelector('h1')?.textContent?.trim() || 'Jetzt') + ' · Kadetten';
  }

  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(render);
    }
  }

  // Eigene Aktionen der Hülle: Filter-Chips und «Zum nächsten Spiel».
  const own = [
    ['data-jump-next', () => jumpToNextGame()],
    [
      'data-ui',
      el => {
        const [k, v] = el.dataset.ui.split(':');
        ui[k] = v;
        if (k === 'comp' && navigation.current) navigation.current.autoNext = true;
        render();
      }
    ]
  ];
  const actions = [...controllers.flatMap(c => c.actions || []), ...own];
  const early = controllers.flatMap(c => c.early || []);

  app.addEventListener('click', event => {
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    // Innerhalb von Aufstellungen und Spielzügen ersetzt ein Wechsel den Verlaufseintrag: «Zurück» verlässt das Kapitel.
    const wissenLink = event.target.closest('a[href^="#/wissen"]');
    if (wissenLink && plain && replacesHistory(location.hash, wissenLink.getAttribute('href'))) {
      event.preventDefault();
      if (wissenLink.getAttribute('href') !== location.hash) {
        replacing = true;
        location.replace(wissenLink.getAttribute('href'));
      }
      return;
    }
    // «Zurück» und Wechsel führen die Menüstruktur entlang: Liegt das Ziel im Verlauf weiter unten, geht es dorthin zurück
    // (statt einen weiteren Eintrag anzulegen); gleichrangige Ansichten ersetzen den Eintrag.
    const link = event.target.closest('a[href^="#/"]');
    if (link && plain && !link.target && !link.hasAttribute('data-route-back')) {
      const target = link.getAttribute('href');
      if (!sameHash(target, location.hash)) {
        const steps = navigation.distanceTo(target);
        if (steps) {
          event.preventDefault();
          history.go(-steps);
          return;
        }
        if (switchesSibling(location.hash, target)) {
          event.preventDefault();
          replacing = true;
          location.replace(target);
          return;
        }
      }
    }
    const back = event.target.closest('[data-route-back]');
    const distance = navigation.backDistance();
    if (back && distance > 0 && plain) {
      event.preventDefault();
      history.go(-distance);
      return;
    }
    for (const {selector, run} of early) {
      const el = event.target.closest(selector);
      if (el && run(el, event)) return;
    }
    const t = event.target.closest('button, [data-ui]');
    if (!t) return;
    const hit = actions.find(([attr]) => t.hasAttribute(attr));
    if (!hit) return;
    const [, run, opts] = hit;
    if (opts?.ignoreAfterSwipe && gestures.justSwiped()) return;
    run(t, event);
  });

  app.addEventListener('change', event => {
    if (!event.target.matches('[data-compare]')) return;
    const route = parseRoute(location.hash);
    const next = {a: route.a, b: route.b, [event.target.dataset.compare]: event.target.value || null};
    // Die Auswahl ersetzt den Verlaufseintrag: «Zurück» führt zum Kader, nicht durch jede Auswahl.
    replacing = true;
    location.replace(href.vergleich(next.a || next.b, next.a ? next.b : null));
  });

  addEventListener('hashchange', () => {
    hook('beforeNavigate');
    const left = navigation.current;
    enterRoute();
    // Zurück (Taste, Geste, Browser) führt immer zur übergeordneten Ansicht, nicht durch die zuletzt besuchten.
    const here = navigation.current;
    if (!correcting && left && here.restore && here.depth < left.depth) {
      const want = parentHash(left.hash, left.origin?.hash);
      if (want && !sameHash(want, here.hash)) {
        const steps = navigation.distanceTo(want);
        correcting = true;
        if (steps) {
          history.go(-steps);
          return;
        }
        replacing = true;
        location.replace(want);
        return;
      }
    }
    correcting = false;
    render();
  });

  /**
   * Direktaufruf einer Unteransicht (Mitteilung, geteilter Link): Die übergeordneten Ansichten werden darunter in den Verlauf gelegt,
   * damit «Zurück» in die Menüstruktur führt statt die App zu schliessen. Ein Neuladen legt sie nicht noch einmal an.
   */
  function seedDeepLink() {
    if (history.state?.kadettenSeeded || history.state?.kadettenEntry) return;
    const hash = location.hash || '#/';
    const chain = ancestors(hash);
    if (!chain.length) return;
    const list = navigation.seed([...chain, hash]);
    history.replaceState({kadettenSeeded: 1, kadettenEntry: list[0].id}, '', chain[0]);
    for (const entry of list.slice(1)) history.pushState({kadettenSeeded: 1, kadettenEntry: entry.id}, '', entry.hash);
  }

  /** Erster Aufruf: Einführung beim ersten Start, Verlauf, erstes Zeichnen. */
  function start() {
    // Erster Start: einmalige Einführung, nur beim Öffnen der Titelseite. Danach gilt sie als gesehen.
    if (/^#?\/?$/.test(location.hash) && needsWelcome()) {
      markWelcome();
      history.replaceState(history.state, '', href.start());
    }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    seedDeepLink();
    enterRoute();
    render();
  }

  return {render, schedule, start};
}
