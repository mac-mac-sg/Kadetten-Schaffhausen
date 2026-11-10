// Positionen des Kaders und ihre Wissens-Artikel. Klein gehalten, damit das Spielerprofil verlinken kann,
// ohne den ganzen Wissensbereich zu laden (der wird erst beim Öffnen nachgeladen).
export const POSITION_IDS = [
  'pos-tor',
  'pos-fluegel-links',
  'pos-fluegel-rechts',
  'pos-rueckraum-links',
  'pos-rueckraum-mitte',
  'pos-rueckraum-rechts',
  'pos-kreis'
];

/** Kennung des Artikels zu einer Position der Kader-Daten («Rückraum mitte», «Flügel links», «Kreis», «Tor») oder null. */
export function positionArticleId(position) {
  const id =
    'pos-' +
    String(position || '')
      .toLowerCase()
      .replace(/ü/g, 'ue')
      .replace(/\s+/g, '-');
  return POSITION_IDS.includes(id) ? id : null;
}
