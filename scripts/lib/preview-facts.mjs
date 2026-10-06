// Fakten für die Match-Vorschau sammeln (Tabelle, letzte Direktduelle, letzte Resultate beider Teams). Gemeinsam genutzt vom
// Schreiblauf (scripts/lib/preview-sync.mjs) und vom Stilvergleich (scripts/cloudflare-ai-compare.mjs).
// Nur bestätigte Daten: Resultate des eigenen Teams aus dem gespeicherten Datenstand, Resultate des Gegners und Direktduelle aus der
// SHV-Quelle (nur QHL). Fehlt eine Quelle, fehlt die Angabe; es wird nichts geschätzt.
import {tableFor} from '../../server/preview-text.mjs';

const finished = g => g && Array.isArray(g.score) && g.score.length === 2 && g.score.every(Number.isInteger);
const lastGames = (games, team, before, n = 3) =>
  (games || []).filter(g => finished(g) && g.date < before && (g.home === team || g.away === team))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, n).map(({date, home, away, score, externalUrl}) => ({date, home, away, score, externalUrl}));

// deps.headToHead(home, away) -> {games}; deps.recentGames(team) -> {games}; beide dürfen wirft/fehlen.
export async function collectFacts(club, g, {snapshot, fcsgData}, {headToHead = null, recentGames = null} = {}) {
  const table = tableFor(club, g, snapshot, fcsgData);
  const data = club === 'kadetten' ? snapshot : fcsgData;
  const own = club === 'kadetten' ? 'Kadetten Schaffhausen' : [g.home, g.away].find(t => /gallen/i.test(t));
  const recent = [];
  let duels = [];
  for (const team of [g.home, g.away]) {
    if (team === own) {
      recent.push({team, games: lastGames(data?.games, team, g.date)});
    } else if (club === 'kadetten' && g.league === 'QHL' && recentGames) {
      try {
        const games = lastGames((await recentGames(team)).games, team, g.date);
        recent.push({team, games, shv: games.length > 0});
      } catch { recent.push({team, games: []}); }
    }
  }
  if (club === 'kadetten' && g.league === 'QHL' && headToHead) {
    try { duels = ((await headToHead(g.home, g.away)).games || []).slice(0, 3); } catch {}
  }
  return {table, duels, recent};
}
