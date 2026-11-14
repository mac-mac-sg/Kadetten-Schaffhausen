// Gegner-Check: beste Werfer eines QHL-Gegners aus der Spielerliste der SHV-Schnittstelle.
// Die Liste zählt laut Quelle alle Wettbewerbsspiele der Mannschaft (auch Cup). Sie wird nur gelesen und geprüft, nie ergänzt.
import {liveQuery} from './live.mjs';

const OWN_ID = 41473;
const gamesQuery = 'query($teamId:Int){games(teamId:$teamId){seasonId homeTeamId homeTeamName awayTeamId awayTeamName}}';
const staffQuery =
  'query($teamId:Int){teamDashboard(teamId:$teamId){teamId name gamesTotal totalScoreTeam} playerStaff(teamId:$teamId){player{playerId teamId firstName lastName games totalScore totalScore7m total2Minutes}}}';
const norm = n => String(n || '').replace(/^TSV /, '').trim();
const count = v => Number.isInteger(v) && v >= 0;
const cache = new Map();

/** SHV-Team-ID eines Gegners aus der Spielliste der Kadetten (Saison 2026). */
export function opponentId(games, team) {
  let id = null;
  for (const g of (Array.isArray(games) ? games : []).filter(g => g.seasonId === 2026)) {
    if (norm(g.homeTeamName) === norm(team)) id = g.homeTeamId;
    if (norm(g.awayTeamName) === norm(team)) id = g.awayTeamId;
  }
  return Number.isInteger(id) && id > 0 && id !== OWN_ID ? id : null;
}

/** Prüft die Antwort der Quelle und liefert die fünf besten Werfer. Wirft bei unerwarteter Form. */
export function parseOpponent(data, teamId, team) {
  const dash = data?.teamDashboard?.[0],
    staff = data?.playerStaff?.[0]?.player;
  if (dash?.teamId !== teamId || !Array.isArray(staff)) throw Error('Unexpected opponent data');
  const players = staff
    .filter(p => p?.teamId === teamId && Number.isInteger(p.playerId) && count(p.games) && p.games > 0 && count(p.totalScore) && p.totalScore > 0)
    .map(p => ({
      name: [p.firstName, p.lastName].map(x => String(x || '').trim()).filter(Boolean).join(' ').slice(0, 80),
      games: p.games,
      goals: p.totalScore,
      sevenMeterGoals: count(p.totalScore7m) ? p.totalScore7m : null,
      twoMinutes: count(p.total2Minutes) ? p.total2Minutes : null
    }))
    .filter(p => p.name && p.goals <= p.games * 30)
    .sort((a, b) => b.goals - a.goals || a.games - b.games)
    .slice(0, 5);
  if (!players.length) throw Error('No opponent scorers');
  return {
    ok: true,
    team,
    games: count(dash.gamesTotal) ? dash.gamesTotal : null,
    goals: count(dash.totalScoreTeam) ? dash.totalScoreTeam : null,
    players,
    source: 'https://www.handball.ch/de/matchcenter/teams/' + teamId
  };
}

export async function getOpponent(team, query = liveQuery, now = Date.now()) {
  const key = String(team || '');
  if (!key || key.length > 100) throw Error('Invalid team');
  const hit = cache.get(key);
  if (hit && now - hit.at < 900000) return hit.value;
  const own = await query(gamesQuery, {teamId: OWN_ID});
  const teamId = opponentId(own?.games, key);
  if (!teamId) throw Error('Team not found');
  const value = {...parseOpponent(await query(staffQuery, {teamId}), teamId, key), checkedAt: new Date(now).toISOString()};
  cache.set(key, {at: now, value});
  return value;
}
