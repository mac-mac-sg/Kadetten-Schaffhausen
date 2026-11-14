// Rang der Kadetten in der QHL nach jeder eigenen Runde. Die Tabelle der Quelle kennt nur den aktuellen Stand,
// darum hält jede Aktualisierung den Rang zur aktuellen Zahl eigener Spiele fest (der letzte Stand je Runde gilt).
const OWN = 'Kadetten Schaffhausen';
const valid = e =>
  e && Number.isInteger(e.played) && e.played > 0 && Number.isInteger(e.rank) && e.rank > 0 && Number.isInteger(e.points) && e.points >= 0;

export function updateRankHistory(history, table, date, team = OWN) {
  const list = Array.isArray(history) ? history.filter(valid) : [];
  const index = Array.isArray(table) ? table.findIndex(r => Array.isArray(r) && r[0] === team) : -1;
  if (index < 0) return list;
  const entry = {played: table[index][1], rank: index + 1, points: table[index][4], date: String(date || '').slice(0, 10)};
  if (!valid(entry)) return list;
  return [...list.filter(e => e.played !== entry.played), entry].sort((a, b) => a.played - b.played).slice(-60);
}
