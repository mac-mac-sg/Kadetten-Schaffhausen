// Prüfung der Live-Routen beider Datendienste (Phase 3 des Cloudflare-Umzugs, docs/cloudflare-umzug.md).
// Diese Routen rufen beim Aufruf externe Quellen ab (handball.ch, EHF, FCSG). Es wird geprüft, ob der neue Dienst sie von
// Cloudflare aus erreicht, nicht ob die Werte gleich sind (Live-Werte ändern sich laufend). Reine Funktion mit eingespeister
// HTTP-Schnittstelle: http.json(url) -> {status, data, ms}.

const TEAM = 'Kadetten Schaffhausen';
const keys = d => (d && typeof d === 'object' && !Array.isArray(d) ? Object.keys(d).sort().join(',') : Array.isArray(d) ? 'Liste' : typeof d);
// Eine Antwort gilt als gesund bei HTTP 200 und ohne ausdrücklich gemeldeten Fehler (`ok: false`, `error`).
const healthy = r => r.status === 200 && r.data?.ok !== false && !r.data?.error;

export async function listLiveRoutes(http, source) {
  const first = await http.json(source + '/api/data');
  const games = first.status === 200 && Array.isArray(first.data?.games) ? first.data.games : [];
  const opponent = games.map(g => (g.home === TEAM ? g.away : g.away === TEAM ? g.home : null)).find(Boolean);
  const routes = [
    {name: 'Live-Spiel', path: '/api/live'},
    {name: 'FCSG live', path: '/api/fcsg/live'},
    {name: 'FCSG Kader (offizielle API)', path: '/api/fcsg/players'},
    {name: 'Letzte Spiele', path: '/api/recent-games?team=' + encodeURIComponent(TEAM)}
  ];
  if (opponent) routes.push({name: 'Direktvergleich', path: `/api/head-to-head?home=${encodeURIComponent(TEAM)}&away=${encodeURIComponent(opponent)}`});
  return routes;
}

// Rückgabe: {rows: [{name, path, source, target, verdict}], failed}. `failed` ist wahr, wenn der neue Dienst eine Route nicht
// liefert, die der bisherige liefert.
export async function checkLiveRoutes(http, source, target) {
  const routes = await listLiveRoutes(http, source);
  const rows = [];
  for (const route of routes) {
    const [a, b] = await Promise.all([http.json(source + route.path), http.json(target + route.path)]);
    const sa = healthy(a), sb = healthy(b);
    const verdict = sa && sb ? (keys(a.data) === keys(b.data) ? 'gleich' : 'beide gesund, andere Felder') : sa && !sb ? 'NEUER DIENST GESTÖRT' : !sa && sb ? 'nur neuer Dienst gesund' : 'beide gestört';
    rows.push({name: route.name, path: route.path.split('?')[0], source: summary(a), target: summary(b), verdict, bad: sa && !sb});
  }
  return {rows, failed: rows.some(r => r.bad)};
}

function summary(r) {
  const err = r.data?.error ? ' ' + String(r.data.error).slice(0, 50) : '';
  return `HTTP ${r.status}${err}${r.ms === undefined ? '' : ` (${r.ms} ms)`}`;
}
