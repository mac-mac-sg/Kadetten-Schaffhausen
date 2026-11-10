// Hash-Routen: statisches Hosting unter /v2/ braucht keine Server-Weiterleitungen.

export const AREAS = [
  {id: 'jetzt', label: 'News', href: '#/', icon: 'news'},
  {id: 'saison', label: 'Spiele', href: '#/saison', icon: 'saison'},
  {id: 'statistik', label: 'Tabelle', href: '#/statistik', icon: 'statistik'},
  {id: 'team', label: 'Kader', href: '#/team', icon: 'team'}
];

const SAISON_TABS = ['spielplan', 'tabellen', 'statistik'];
const VEREIN_TABS = ['geschichte', 'titel'];
export const WISSEN_CHAPTERS = ['regeln', 'aufstellungen', 'spielzuege'];
export const GAME_TABS = ['vorschau', 'live', 'bericht', 'rueckblick', 'wahl'];

/** Zerlegt einen Hash in Bereich, Ansicht und Parameter. Unbekanntes führt zu «Jetzt». */
export function parseRoute(hash = '') {
  const parts = String(hash)
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(p => {
      try {
        return decodeURIComponent(p);
      } catch {
        return '';
      }
    });
  const [first, second] = parts;
  const safeId = v => (/^[A-Za-z0-9_-]{1,80}$/.test(v || '') ? v : null);
  switch (first) {
    case undefined:
      return {area: 'jetzt', view: 'jetzt'};
    case 'saison':
      return {
        area: ['tabellen', 'statistik'].includes(second) ? 'statistik' : 'saison',
        view: SAISON_TABS.includes(second) ? second : 'spielplan'
      };
    case 'statistik':
      return {area: 'statistik', view: second === 'spieler' ? 'statistik' : 'tabellen'};
    case 'team':
      return safeId(second) ? {area: 'team', view: 'spieler', id: second} : {area: 'team', view: 'team'};
    case 'verein':
      return {area: 'verein', view: 'verein', ...(VEREIN_TABS.includes(second) ? {tab: second} : {})};
    case 'ich':
      return {area: null, view: 'ich'};
    case 'wissen':
      return {
        area: null,
        view: 'wissen',
        chapter: WISSEN_CHAPTERS.includes(second) ? second : 'regeln',
        ...(WISSEN_CHAPTERS.includes(second) && safeId(parts[2]) ? {id: parts[2]} : {}),
        ...(/^[1-9]$/.test(parts[3] || '') ? {step: Number(parts[3])} : {})
      };
    case 'spiel':
      return safeId(second)
        ? {area: 'saison', view: 'spiel', id: second, ...(GAME_TABS.includes(parts[2]) ? {tab: parts[2]} : {})}
        : {area: 'jetzt', view: 'jetzt'};
    // Adressen aus Push-Mitteilungen des Datendienstes (#match/<id>/…).
    case 'match':
      return safeId(second) ? {area: 'saison', view: 'spiel', id: second} : {area: 'jetzt', view: 'jetzt'};
    case 'news':
      return safeId(second) ? {area: 'jetzt', view: 'artikel', id: second} : {area: 'jetzt', view: 'news'};
    default:
      return {area: 'jetzt', view: 'jetzt'};
  }
}

export const href = {
  jetzt: () => '#/',
  saison: tab => '#/saison' + (tab && tab !== 'spielplan' ? '/' + tab : ''),
  team: () => '#/team',
  spieler: id => '#/team/' + encodeURIComponent(id),
  verein: tab => '#/verein' + (tab ? '/' + tab : ''),
  ich: () => '#/ich',
  wissen: (chapter, id, step) =>
    '#/wissen' +
    (chapter && (chapter !== 'regeln' || id) ? '/' + chapter : '') +
    (id ? '/' + encodeURIComponent(id) + (step ? '/' + step : '') : ''),
  spiel: (id, tab) => '#/spiel/' + encodeURIComponent(id) + (tab ? '/' + tab : ''),
  news: () => '#/news',
  artikel: id => '#/news/' + encodeURIComponent(id)
};

/** Sitzungsnavigation: echte History-Einträge behalten Herkunft und Scrollposition.
 * Ein Direktlink hat keine Herkunft und fällt auf die normale Bereichsadresse zurück.
 */
export function createNavigation(session = String(Date.now()) + Math.random().toString(36).slice(2)) {
  const entries = new Map();
  let current = null,
    sequence = 0;
  const gameId = hash => {
    const r = parseRoute(hash);
    return r.view === 'spiel' ? r.id : null;
  };
  return {
    get current() {
      return current;
    },
    enter(hash, id, scroll = 0) {
      if (current) current.scroll = scroll;
      if (id && entries.has(id)) {
        current = entries.get(id);
        current.restore = true;
        return current;
      }
      const previous = current;
      const game = gameId(hash);
      current = {id: session + ':' + ++sequence, hash, scroll: 0, restore: false, autoNext: parseRoute(hash).view === 'spielplan'};
      if (game && previous) current.origin = gameId(previous.hash) === game ? previous.origin : previous;
      entries.set(current.id, current);
      return current;
    },
    backTarget() {
      return current?.origin?.hash || null;
    },
    backDistance() {
      if (!current?.origin) return null;
      // Count actual entries on this branch; numeric IDs may have gaps after browser back + new navigation.
      return current.depth - current.origin.depth;
    },
    setDepth(depth) {
      if (current) current.depth = depth;
    }
  };
}
