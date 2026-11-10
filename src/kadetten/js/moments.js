// «Momente»: kleine Überraschungen aus vorhandenen Daten (Serien, Meilensteine, Rekorde, Geschichte des Tages).
// Nichts wird erfunden: Jeder Moment entsteht nur, wenn die Daten ihn belegen. Getestet in tests/app-fan.test.mjs.
import {OWN_TEAM, ownGames, hasScore, outcome, kickoff, standings, shortTeam, nextGame, zurichParts} from './logic.js';
import {sameTeam} from './match.js';

const played = (games, now) => ownGames(games).filter(g => hasScore(g) && kickoff(g) <= now);

/** Aktuelle Serie: Siege in Folge oder ungeschlagen (mindestens 3 Spiele). */
export function streak(games, now) {
  const list = played(games, now).reverse();
  let wins = 0,
    unbeaten = 0;
  for (const g of list) {
    if (outcome(g) === 'S') wins++;
    else break;
  }
  for (const g of list) {
    if (outcome(g) !== 'N') unbeaten++;
    else break;
  }
  if (wins >= 3) return {kind: 'wins', count: wins};
  if (unbeaten >= 4) return {kind: 'unbeaten', count: unbeaten};
  return null;
}

/** Höchster Sieg der Saison. */
export function biggestWin(games, now) {
  let best = null;
  for (const g of played(games, now)) {
    if (outcome(g) !== 'S') continue;
    const margin = Math.abs(g.score[0] - g.score[1]);
    if (!best || margin > best.margin) best = {game: g, margin};
  }
  return best && best.margin >= 5 ? best : null;
}

/** Nächster runder Torwert eines Spielers (10er-, 25er-, 50er-Schritte), wenn höchstens 5 Tore fehlen. */
export function playerMilestones(season, squad) {
  const out = [];
  for (const [nr, p] of Object.entries(season?.players || {})) {
    if (!Number.isInteger(p.goals) || p.goals < 5) continue;
    const step = p.goals < 50 ? 10 : p.goals < 100 ? 25 : 50;
    const target = Math.ceil((p.goals + 1) / step) * step,
      missing = target - p.goals;
    const info = squad.find(s => s.number === Number(nr));
    if (info && missing <= 5) out.push({number: Number(nr), name: info.name, goals: p.goals, target, missing});
  }
  return out.sort((a, b) => a.missing - b.missing || b.goals - a.goals);
}

/** Was ein Sieg im nächsten QHL-Spiel in der Tabelle bedeuten würde. */
export function scenario(games, tables, now) {
  const next = nextGame(games, now);
  if (!next || next.league !== 'QHL') return null;
  const rows = standings(tables?.QHL),
    own = rows.find(r => r.team === OWN_TEAM);
  if (!own || own.points === null) return null;
  const after = own.points + 2;
  const ahead = rows.filter(r => r.team !== OWN_TEAM && r.points !== null && r.points >= after);
  return {
    game: next,
    points: after,
    rankAtLeast: ahead.length + 1,
    tied: rows.some(r => r.team !== OWN_TEAM && r.points === after),
    leaderNow: rows[0]
  };
}

/** Letztes Duell dieser Saison mit dem nächsten Gegner. */
export function lastDuel(games, now) {
  const next = nextGame(games, now);
  if (!next) return null;
  const opp = next.home === OWN_TEAM ? next.away : next.home;
  const prev = played(games, now)
    .filter(g => sameTeam(g.home, opp) || sameTeam(g.away, opp))
    .at(-1);
  return prev ? {next, prev, opp} : null;
}

/** Geschichte des Tages: wechselt täglich durch die Vereinsgeschichte. */
export function historyOfDay(history, now) {
  if (!history?.length) return null;
  const day = Math.floor(Date.parse(zurichParts(now).date) / 86400000);
  return history[day % history.length];
}

/** Alle Momente für «Jetzt», höchstens vier, wichtigste zuerst. */
export function moments({data, now, squad, history, favourite}) {
  const out = [];
  const s = streak(data.games, now);
  if (s)
    out.push({
      id: 'streak',
      tag: 'Serie',
      title: s.kind === 'wins' ? `${s.count} Siege in Folge` : `${s.count} Spiele ungeschlagen`,
      text:
        s.kind === 'wins'
          ? 'So lange haben die Kadetten in dieser Saison nicht mehr verloren.'
          : 'Kein Spiel mehr verloren seit dem letzten Rückschlag.'
    });
  const sc = scenario(data.games, data.tables, now);
  if (sc)
    out.push({
      id: 'scenario',
      tag: 'Mit einem Sieg',
      title: `${sc.points} Punkte`,
      text: sc.tied
        ? 'Bei Punktgleichheit entscheidet die Rangfolge des Wettbewerbs. Andere Spiele können den Tabellenstand ändern.'
        : sc.rankAtLeast === 1
          ? `Gegen ${shortTeam(sc.game.home === OWN_TEAM ? sc.game.away : sc.game.home)} wären die Kadetten beim aktuellen Tabellenstand Leader. Andere Spiele können das ändern.`
          : `Beim aktuellen Tabellenstand danach auf Platz ${sc.rankAtLeast}. Andere Spiele und die Rangfolge bei Punktgleichheit können das ändern.`,
      link: sc.game.id
    });
  const fav = favourite ? data.playerSeason?.players?.[favourite] : null;
  const ms = playerMilestones(data.playerSeason, squad);
  const favMs = ms.find(m => m.number === favourite);
  const m = favMs || ms[0];
  if (m)
    out.push({
      id: 'milestone',
      tag: m.number === favourite ? 'Dein Spieler' : 'Meilenstein',
      title: `Noch ${m.missing} ${m.missing === 1 ? 'Tor' : 'Tore'}`,
      text: `${m.name} steht bei ${m.goals} QHL-Toren – ${m.target} sind in Reichweite.`,
      player: m.number
    });
  else if (fav && Number.isInteger(fav.goals)) {
    const rank = Object.values(data.playerSeason.players).filter(p => Number.isInteger(p.goals) && p.goals > fav.goals).length + 1;
    const name = squad.find(p => p.number === favourite)?.name;
    if (name)
      out.push({
        id: 'favourite',
        tag: 'Dein Spieler',
        title: `${fav.goals} Tore`,
        text: `${name} ist mit ${fav.goals} QHL-Toren Nummer ${rank} im Team.`,
        player: favourite
      });
  }
  const d = lastDuel(data.games, now);
  if (d)
    out.push({
      id: 'duel',
      tag: 'Letztes Duell',
      title: `${d.prev.score[0]}:${d.prev.score[1]}`,
      text: `${shortTeam(d.prev.home)} – ${shortTeam(d.prev.away)}. Nächstes Wiedersehen: ${d.next.date.split('-').reverse().slice(0, 2).join('.')}.`,
      link: d.prev.id
    });
  const big = biggestWin(data.games, now);
  if (big)
    out.push({
      id: 'record',
      tag: 'Höchster Saisonsieg',
      title: `${big.game.score[0]}:${big.game.score[1]}`,
      text: `${shortTeam(big.game.home)} – ${shortTeam(big.game.away)}, ${big.margin} Tore Differenz.`,
      link: big.game.id
    });
  const h = historyOfDay(history, now);
  if (h) out.push({id: 'history', tag: `Geschichte · ${h.year}`, title: h.title, text: h.text});
  return out.slice(0, 5);
}

/** Tipp-Punkte: exakt 3, richtige Differenz 2, richtige Tendenz 1, sonst 0. */
export function tipPoints(tip, score) {
  if (!Array.isArray(tip) || !Array.isArray(score)) return null;
  if (tip[0] === score[0] && tip[1] === score[1]) return 3;
  if (tip[0] - tip[1] === score[0] - score[1]) return 2;
  return Math.sign(tip[0] - tip[1]) === Math.sign(score[0] - score[1]) ? 1 : 0;
}

/** «Deine Saison»: Bilanz der besuchten Spiele und der Tipps. */
export function seasonSummary({games, visited, tips, now}) {
  const seen = played(games, now).filter(g => visited.includes(String(g.id)));
  const record = {S: 0, U: 0, N: 0};
  let goals = 0;
  for (const g of seen) {
    record[outcome(g)]++;
    goals += g.home === OWN_TEAM ? g.score[0] : g.score[1];
  }
  const tipped = played(games, now).filter(g => Array.isArray(tips[g.id]));
  const points = tipped.reduce((n, g) => n + tipPoints(tips[g.id], g.score), 0);
  const exact = tipped.filter(g => tipPoints(tips[g.id], g.score) === 3).length;
  const best =
    seen.filter(g => outcome(g) === 'S').sort((a, b) => Math.abs(b.score[0] - b.score[1]) - Math.abs(a.score[0] - a.score[1]))[0] || null;
  return {visits: seen.length, record, goals, tipped: tipped.length, points, exact, best};
}
