// Zeigergesten: Halten und seitliches Wischen in Zonen (CSS-Selektor). Ein Klick unmittelbar nach einem Wischen oder
// langen Halten wird unterdrückt (justSwiped), damit eine Geste nicht zusätzlich als Antippen zählt.
const SWIPE_MIN = 40; // Pixel
const SUPPRESS_MS = 400;

/**
 * Zone: {selector, press?(event), release?({held}), swipe?(dir)}; dir ist +1 (nach links gewischt: weiter) oder −1.
 * press und release kommen für jede Berührung in der Zone, swipe nur bei einer deutlich waagrechten Bewegung.
 */
export function createGestures(app) {
  const zones = [];
  let active = null,
    swiped = false;
  const suppressClick = () => {
    swiped = true;
    setTimeout(() => (swiped = false), SUPPRESS_MS);
  };
  app.addEventListener('pointerdown', event => {
    const zone = zones.find(z => event.target.closest(z.selector));
    if (!zone) return;
    active = {zone, x: event.clientX, y: event.clientY, at: performance.now()};
    zone.press?.(event);
  });
  const finish = (event, cancelled) => {
    if (!active) return;
    const {zone, x, y, at} = active;
    active = null;
    zone.release?.({held: performance.now() - at});
    if (cancelled) return;
    const dx = event.clientX - x,
      dy = event.clientY - y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressClick();
    zone.swipe?.(dx < 0 ? 1 : -1);
  };
  app.addEventListener('pointerup', event => finish(event, false));
  app.addEventListener('pointercancel', event => finish(event, true));
  return {zone: zone => zones.push(zone), suppressClick, justSwiped: () => swiped};
}
