// Hash-Routen: statisches Hosting unter /v2/ braucht keine Server-Weiterleitungen.

export const AREAS = [
  {id: 'jetzt', label: 'Jetzt', href: '#/'},
  {id: 'saison', label: 'Saison', href: '#/saison'},
  {id: 'team', label: 'Team', href: '#/team'},
  {id: 'verein', label: 'Verein', href: '#/verein'}
];

const SAISON_TABS = ['spielplan', 'tabellen', 'statistik'];

/** Zerlegt einen Hash in Bereich, Ansicht und Parameter. Unbekanntes führt zu «Jetzt». */
export function parseRoute(hash = '') {
  const parts = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return ''; } });
  const [first, second] = parts;
  const safeId = v => /^[A-Za-z0-9_-]{1,80}$/.test(v || '') ? v : null;
  switch (first) {
    case undefined: return {area: 'jetzt', view: 'jetzt'};
    case 'saison': return {area: 'saison', view: SAISON_TABS.includes(second) ? second : 'spielplan'};
    case 'team': return safeId(second) ? {area: 'team', view: 'spieler', id: second} : {area: 'team', view: 'team'};
    case 'verein': return {area: 'verein', view: 'verein'};
    case 'ich': return {area: null, view: 'ich'};
    case 'spiel': return safeId(second) ? {area: 'jetzt', view: 'spiel', id: second} : {area: 'jetzt', view: 'jetzt'};
    default: return {area: 'jetzt', view: 'jetzt'};
  }
}

export const href = {
  jetzt: () => '#/',
  saison: tab => '#/saison' + (tab && tab !== 'spielplan' ? '/' + tab : ''),
  team: () => '#/team',
  spieler: id => '#/team/' + encodeURIComponent(id),
  verein: () => '#/verein',
  ich: () => '#/ich',
  spiel: id => '#/spiel/' + encodeURIComponent(id)
};
