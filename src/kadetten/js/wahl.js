// Spielerwahl: Vorschläge aus den Spieldaten und Zuordnung zur Rückennummer. Reine Funktionen ohne Netz und Speicher.
const count = v => (Number.isInteger(v) && v > 0 ? v : 0);
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'de');

/** Vorschläge nach Spieldaten: meiste Tore, zweitmeiste Tore (oder gleich viele), meiste Paraden.
 * Es zählen nur gemeldete Werte; wer keine Tore und keine Paraden hat, erscheint unter «weitere Spieler». */
export function suggestions(candidates) {
  const list = (Array.isArray(candidates) ? candidates : []).filter(c => c && c.id != null && c.name);
  const scorers = list.filter(c => count(c.goals)).sort((a, b) => count(b.goals) - count(a.goals) || byName(a, b));
  const keepers = list.filter(c => count(c.saves)).sort((a, b) => count(b.saves) - count(a.saves) || byName(a, b));
  const picked = [];
  const add = (candidate, reason) => {
    if (candidate && !picked.some(p => p.candidate.id === candidate.id)) picked.push({candidate, reason});
  };
  add(scorers[0], 'Meiste Tore');
  if (scorers[1]) add(scorers[1], count(scorers[1].goals) === count(scorers[0].goals) ? 'Gleich viele Tore' : 'Zweitmeiste Tore');
  add(keepers[0], 'Meiste Paraden');
  const rest = list
    .filter(c => !picked.some(p => p.candidate.id === c.id))
    .sort((a, b) => count(b.goals) + count(b.saves) - count(a.goals) - count(a.saves) || byName(a, b));
  return {picked, rest};
}

/** Rückennummer eines Spielers anhand der Quellen-ID (SHV oder EHF) aus den Saisonwerten, sonst null. */
export function numberFor(data, id) {
  const find = (season, key) => Object.entries(season?.players || {}).find(([, p]) => String(p[key]) === String(id))?.[0];
  const nr = find(data?.playerSeason, 'shvPlayerId') ?? find(data?.ehlPlayerSeason, 'ehfPlayerId');
  return nr === undefined ? null : Number(nr);
}

export const surname = name =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(-1)[0] || '';
