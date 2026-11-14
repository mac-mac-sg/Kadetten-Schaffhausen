// «Spiel in 30 Sekunden»: höchstens fünf Karten aus dem bestätigten Spielbericht. Eine Karte entfällt, wenn ihre Werte fehlen.
import {OWN_TEAM, outcome, shortTeam, standings, ownGames, hasScore, kickoff} from './logic.js';
import {isOwn, scorers, displayName} from './match.js';
import {flow, pct} from './report.js';

const RESULT = {S: 'Sieg', U: 'Unentschieden', N: 'Niederlage'};

export function shortCards({game, report = null, goals = [], tables = null, games = []}) {
  if (!hasScore(game)) return [];
  const ownHome = isOwn(game.home),
    opp = shortTeam(ownHome ? game.away : game.home),
    result = outcome(game);
  const half = Array.isArray(game.half) && game.half.every(Number.isInteger) ? game.half : report?.half;
  const cards = [
    {
      kicker: RESULT[result] || 'Endresultat',
      figure: `${game.score[0]}:${game.score[1]}`,
      title: `${shortTeam(game.home)} – ${shortTeam(game.away)}`,
      text: Array.isArray(half) && half.every(Number.isInteger) ? `Halbzeit ${half[0]}:${half[1]}` : game.league || ''
    }
  ];
  const f = goals.length ? flow(goals) : null;
  if (f?.run?.len >= 3) {
    const own = (f.run.side === 'home') === ownHome;
    cards.push({
      kicker: 'Wendepunkt',
      figure: `${f.run.len}:0`,
      title: `Lauf ${own ? 'der Kadetten' : 'von ' + opp}`,
      text: `Von ${f.run.from[0]}:${f.run.from[1]} auf ${f.run.to[0]}:${f.run.to[1]}. ${f.changes} Führungswechsel im ganzen Spiel.`
    });
  }
  const team = report?.teams?.[ownHome ? 0 : 1];
  const best = scorers(team)[0];
  if (best)
    cards.push({
      kicker: 'Bester Werfer',
      figure: String(best.goals),
      title: displayName(best.name),
      text:
        `${best.goals === 1 ? 'Tor' : 'Tore'}` +
        (Number.isInteger(best.shots) && best.shots >= best.goals ? ` aus ${best.shots} Würfen` : '') +
        (Number.isInteger(best.seven) && best.seven > 0 ? `, davon ${best.seven} vom 7-m-Punkt` : '') +
        '.',
      number: best.number
    });
  const keeper = (team?.players || []).filter(p => Number.isInteger(p.saves) && p.saves > 0).sort((a, b) => b.saves - a.saves)[0];
  const quote = team && Number.isInteger(team.shots) && team.shots > 0 ? pct(game.score[ownHome ? 0 : 1], team.shots) : null;
  if (keeper) {
    const rate = Number.isInteger(keeper.keeperShots) && keeper.keeperShots > 0 ? pct(keeper.saves, keeper.keeperShots) : null;
    cards.push({
      kicker: 'Zahl des Spiels',
      figure: String(keeper.saves),
      title: `Paraden von ${displayName(keeper.name)}`,
      text: rate !== null ? `Fangquote ${Math.round(rate)} %.` : 'Aus dem bestätigten Spielbericht.'
    });
  } else if (quote !== null)
    cards.push({
      kicker: 'Zahl des Spiels',
      figure: `${Math.round(quote)} %`,
      title: 'Wurfquote der Kadetten',
      text: `${team.shots} Würfe.`
    });
  // Die Tabelle gilt nur für das letzte abgeschlossene QHL-Spiel: für ältere Spiele kennt die Quelle den damaligen Stand nicht.
  const lastQhl = ownGames(games)
    .filter(g => g.league === 'QHL' && hasScore(g))
    .sort((a, b) => kickoff(b) - kickoff(a))[0];
  const row = standings(tables?.QHL).find(r => r.team === OWN_TEAM);
  if (row && game.league === 'QHL' && lastQhl && String(lastQhl.id) === String(game.id))
    cards.push({
      kicker: 'Tabelle danach',
      figure: `${row.rank}.`,
      title: 'Rang in der QHL',
      text: `${row.points} Punkte aus ${row.played} Spielen.`
    });
  return cards.slice(0, 5);
}
