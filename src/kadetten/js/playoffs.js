// Playoffs: Serien der Kadetten aus dem Spielplan. Ein Spiel zählt als Playoff-Spiel, wenn Wettbewerb oder Runde es so nennen
// (Playoff, Viertelfinal, Halbfinal, Final). Cup- und Europacup-Spiele zählen nie dazu.
import {OWN_TEAM, ownGames, hasScore, kickoff, outcome, competitionOf} from './logic.js';

const STAGES = [
  [/viertel|\bvf\b|quarter/i, 'Viertelfinal'],
  [/halb|\bhf\b|semi/i, 'Halbfinal'],
  [/final/i, 'Final'],
  [/play-?offs?/i, 'Playoff']
];
export function playoffStage(game) {
  if (!game || ['Cup', 'EHL'].includes(competitionOf(game))) return null;
  const text = `${game.league || ''} ${game.round || ''}`;
  if (!/play-?off|viertel|halb|final|\bvf\b|\bhf\b/i.test(text)) return null;
  return STAGES.find(([re]) => re.test(text))[1];
}

/** Serien der Kadetten, älteste zuerst. bestOf: aus der Zahl angesetzter Spiele, sonst 5 (Annahme, als solche gekennzeichnet). */
export function playoffSeries(games, team = OWN_TEAM) {
  const map = new Map();
  for (const g of ownGames(games, team)) {
    const stage = playoffStage(g);
    if (!stage) continue;
    const opponent = g.home === team ? g.away : g.home,
      key = stage + '|' + opponent;
    if (!map.has(key)) map.set(key, {stage, opponent, games: []});
    map.get(key).games.push(g);
  }
  return [...map.values()]
    .map(s => {
      const list = s.games.sort((a, b) => kickoff(a) - kickoff(b));
      const wins = list.filter(g => hasScore(g) && outcome(g, team) === 'S').length,
        losses = list.filter(g => hasScore(g) && outcome(g, team) === 'N').length;
      const scheduled = list.length % 2 === 1 && list.length >= 3;
      const bestOf = scheduled ? list.length : Math.max(5, 2 * Math.max(wins, losses) - 1),
        target = Math.ceil(bestOf / 2);
      const state = wins >= target ? 'won' : losses >= target ? 'lost' : 'open';
      return {
        ...s,
        games: list,
        wins,
        losses,
        bestOf,
        assumed: !scheduled,
        target,
        needed: Math.max(0, target - wins),
        state,
        next: list.find(g => !hasScore(g)) || null
      };
    })
    .sort((a, b) => kickoff(a.games[0]) - kickoff(b.games[0]));
}

export function seriesText(s) {
  if (s.state === 'won') return `Serie gewonnen ${s.wins}:${s.losses}`;
  if (s.state === 'lost') return `Serie verloren ${s.wins}:${s.losses}`;
  const need = `${s.needed === 1 ? 'Noch 1 Sieg' : `Noch ${s.needed} Siege`} zum Weiterkommen`;
  return `Stand ${s.wins}:${s.losses} · ${need}`;
}
