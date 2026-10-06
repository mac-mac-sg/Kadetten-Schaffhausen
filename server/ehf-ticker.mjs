// Auswertung der Daten des EHF-Livetickers (ticker.ehf.eu/v3, Antwort von «TickerData») für den Matchbericht der European League.
// Reine Funktionen ohne Netzwerkzugriff: Torfolge, Auszeiten und Zeitstrafen aus den Ereignissen, daraus berechnete Fakten
// (Halbzeitstand, grösste Führung, Serien, Flauten, Torschützen, Torhüter) und ein sachlicher Bericht ohne KI als Rückfall.
// Ereigniscodes (aus dem Spiel Kadetten – HC Izvidac vom 6. Oktober 2026 abgeglichen mit der Teamstatistik der EHF):
// SHOT = Wurf (Ergebnis GOAL, SAVE, POST, MISS, BLC; Zone PTY = Siebenmeter), TOUT = Auszeit, TMS = Zwei-Minuten-Strafe.
// Die übrigen Codes (TE, TO, RFP, FRP, TBP) werden nicht verwendet.

const clockSeconds = when => {
  const m = /^(\d{1,3}):(\d{1,2})$/.exec(String(when ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const minuteOf = seconds => Math.floor(seconds / 60) + 1;
export const clockText = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const person = athlete => [athlete?.description?.givenName, athlete?.description?.familyName].filter(Boolean).join(' ');
const scorerOf = competitors => {
  for (const c of competitors || []) {
    const a = (c.composition?.athlete || []).find(x => x.role === 'SCR');
    if (a) return {code: c.code, name: person(a), bib: Number.isInteger(a.bib) ? a.bib : null};
  }
  return null;
};
const teamOf = competitors => {
  const c = (competitors || []).find(x => x.code);
  return c ? {code: c.code, name: person((c.composition?.athlete || [])[0]) || null, bib: Number.isInteger(c.composition?.athlete?.[0]?.bib) ? c.composition.athlete[0].bib : null} : null;
};

// Liefert {goals, sevenMeters, timeouts, suspensions, halftime, final}. Wirft, wenn die Antwort keine Ereignisliste enthält.
// Heim/Gast ergibt sich aus der Entwicklung des Spielstands (scoreH = Heimteam), nicht aus Teamnamen.
export function parseTicker(data) {
  const block = Array.isArray(data?.events) ? data.events[0] : data?.events;
  const list = block?.actions?.action;
  if (!Array.isArray(list)) throw Error('Missing ticker events');
  const actions = [...list].filter(a => a && typeof a.action === 'string').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const codeSide = new Map();
  for (const [side, key] of [['home', 'homeTeam'], ['away', 'guestTeam']]) {
    const id = data?.playerstats?.[key]?.team?.id;
    if (id) codeSide.set(id, side);
  }
  const goals = [], sevenMeters = [], timeouts = [], suspensions = [];
  let prev = [0, 0], halftime = null;
  for (const a of actions) {
    const sec = clockSeconds(a.when);
    if (a.action === 'SHOT') {
      const s = scorerOf(a.competitor);
      if (!s) continue;
      const seven = a.loc === 'PTY';
      if (a.result === 'GOAL') {
        if (!Number.isInteger(a.scoreH) || !Number.isInteger(a.scoreA) || sec === null) throw Error('Invalid ticker goal');
        const side = a.scoreH > prev[0] ? 'home' : a.scoreA > prev[1] ? 'away' : null;
        if (!side) throw Error('Invalid ticker score');
        codeSide.set(s.code, side);
        goals.push({sec, half: a.period || null, score: [a.scoreH, a.scoreA], side, name: s.name, bib: s.bib, seven});
        prev = [a.scoreH, a.scoreA];
      }
      if (seven) sevenMeters.push({code: s.code, bib: s.bib, goal: a.result === 'GOAL'});
    } else if (a.action === 'TOUT' && a.actionAdd === 'START' && sec !== null) {
      timeouts.push({sec, half: a.period || null, score: [a.scoreH ?? null, a.scoreA ?? null], code: teamOf(a.competitor)?.code ?? null});
    } else if (a.action === 'TMS' && sec !== null) {
      const t = teamOf(a.competitor);
      suspensions.push({sec, half: a.period || null, code: t?.code ?? null, name: t?.name ?? null, bib: t?.bib ?? null});
    } else if (a.action === 'ENDP' && a.period === 'H1' && Number.isInteger(a.scoreH) && Number.isInteger(a.scoreA)) {
      halftime = [a.scoreH, a.scoreA];
    }
  }
  const sideOf = code => codeSide.get(code) ?? null;
  const phaseEnd = (Array.isArray(data?.events?.[0]?.phaseScores) ? data.events[0].phaseScores : []).find(p => /match ended/i.test(p?.name || ''));
  const last = goals.at(-1)?.score;
  const final = Number.isInteger(phaseEnd?.scoreA) && Number.isInteger(phaseEnd?.scoreB) ? [phaseEnd.scoreA, phaseEnd.scoreB] : last || null;
  return {
    goals,
    sevenMeters: sevenMeters.map(s => ({side: sideOf(s.code), bib: s.bib, goal: s.goal})),
    timeouts: timeouts.map(t => ({...t, side: sideOf(t.code)})),
    suspensions: suspensions.map(s => ({...s, side: sideOf(s.code)})),
    halftime,
    final
  };
}

// Siebenmeter je Spieler (Tore/Würfe) aus der Torfolge; nur wenn die Ereignisliste zum Endstand passt (sonst bleibt null).
export function withSevenMeters(players, ticker) {
  if (!Array.isArray(players) || !ticker?.final || ticker.goals.length !== ticker.final[0] + ticker.final[1]) return players;
  return players.map(p => {
    const mine = ticker.sevenMeters.filter(s => s.side === (p.home ? 'home' : 'away') && String(s.bib) === String(p.number));
    return {...p, seven: mine.filter(s => s.goal).length, sevenShots: mine.length};
  });
}

// --- Fakten ---------------------------------------------------------------------------------------------------------------

const MIN_RUN = 4, MIN_DROUGHT = 8 * 60;
const scoreText = s => `${s[0]}:${s[1]}`;

function leadFacts(goals) {
  let best = null, flips = 0, lastLeader = null;
  const minDiff = {home: 0, away: 0};
  for (const g of goals) {
    const diff = g.score[0] - g.score[1];
    minDiff.home = Math.min(minDiff.home, diff);
    minDiff.away = Math.min(minDiff.away, -diff);
    const leader = diff > 0 ? 'home' : diff < 0 ? 'away' : null;
    if (leader && lastLeader && leader !== lastLeader) flips++;
    if (leader) lastLeader = leader;
    if (leader && (!best || Math.abs(diff) > best.diff)) best = {side: leader, diff: Math.abs(diff), score: g.score, sec: g.sec};
  }
  return {biggestLead: best, leadChanges: flips, neverTrailed: minDiff.home === 0 ? 'home' : minDiff.away === 0 ? 'away' : null};
}

function longestRun(goals) {
  let best = null, start = 0;
  for (let i = 1; i <= goals.length; i++) {
    if (i === goals.length || goals[i].side !== goals[start].side) {
      const len = i - start;
      if (len >= MIN_RUN && (!best || len > best.goals)) {
        const before = start ? goals[start - 1].score : [0, 0];
        best = {side: goals[start].side, goals: len, from: before, to: goals[i - 1].score, fromSec: goals[start].sec, toSec: goals[i - 1].sec};
      }
      start = i;
    }
  }
  return best;
}

function longestDrought(goals) {
  let best = null;
  for (const side of ['home', 'away']) {
    let lastSec = 0;
    for (const g of goals.filter(x => x.side === side)) {
      if (g.sec - lastSec >= MIN_DROUGHT && (!best || g.sec - lastSec > best.seconds)) best = {side, seconds: g.sec - lastSec, fromSec: lastSec, toSec: g.sec};
      lastSec = g.sec;
    }
  }
  return best;
}

const percent = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? Math.round((a / b) * 100) : null);

// players: [{home, name, goals, shots, goalkeeper, saves, savesFaced}] (parseEhfPlayers); teamStats: parseEhfTeamStats. Beides darf fehlen.
export function matchFacts({home, away, ticker, players = null, teamStats = null, league = 'European League'}) {
  const goals = ticker.goals, final = ticker.final;
  const halves = ticker.halftime && final ? {first: ticker.halftime, second: [final[0] - ticker.halftime[0], final[1] - ticker.halftime[1]]} : null;
  const squad = side => (players || []).filter(p => p.home === (side === 'home'));
  const topScorers = side => squad(side).filter(p => !p.goalkeeper && p.goals > 0).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, 4).map(p => ({name: p.name, goals: p.goals, shots: p.shots ?? null}));
  const keepers = side => squad(side).filter(p => p.goalkeeper && p.savesFaced > 0).map(p => ({name: p.name, saves: p.saves, faced: p.savesFaced, percent: percent(p.saves, p.savesFaced)}));
  const suspensionCount = side => {
    const n = teamStats?.[side === 'home' ? 'home' : 'guest']?.twoMinutes;
    return Number.isInteger(n) ? n : ticker.suspensionsKnown === false ? null : ticker.suspensions.filter(s => s.side === side).length;
  };
  return {
    home, away, league, final, halves,
    firstGoal: goals[0] ? {side: goals[0].side, sec: goals[0].sec, score: goals[0].score, name: goals[0].name} : null,
    ...leadFacts(goals),
    run: longestRun(goals),
    drought: longestDrought(goals),
    timeouts: ticker.timeouts.filter(t => t.side).map(t => ({side: t.side, sec: t.sec, score: t.score})),
    suspensions: {home: suspensionCount('home'), away: suspensionCount('away')},
    sevenMeters: teamStats ? {home: [teamStats.home.sevenGoals, teamStats.home.sevenShots], away: [teamStats.guest.sevenGoals, teamStats.guest.sevenShots]} : null,
    efficiency: teamStats ? {home: teamStats.home.efficiency, away: teamStats.guest.efficiency} : null,
    technicalFaults: teamStats ? {home: teamStats.home.technicalFaults, away: teamStats.guest.technicalFaults} : null,
    scorers: {home: topScorers('home'), away: topScorers('away')},
    keepers: {home: keepers('home'), away: keepers('away')}
  };
}

const teamName = (f, side) => (side === 'home' ? f.home : f.away);
const roleName = (f, side) => `${teamName(f, side)} (${side === 'home' ? 'Heimteam' : 'Gastteam'})`;
const minuteText = sec => `${minuteOf(sec)}. Minute`;
const tore = n => (n === 1 ? '1 Tor' : `${n} Tore`);

// Eindeutige Faktenliste für die KI; jede Zeile ist für sich verständlich.
export function factLines(f) {
  const lines = [];
  const [h, a] = f.final;
  lines.push(`Spiel: ${roleName(f, 'home')} gegen ${roleName(f, 'away')}, Wettbewerb ${f.league || 'European League'}. Endstand ${scoreText(f.final)} (Heimteam zuerst genannt).`);
  lines.push(h === a ? 'Das Spiel endete unentschieden.' : `${teamName(f, h > a ? 'home' : 'away')} gewann das Spiel mit ${Math.abs(h - a)} Toren Unterschied.`);
  if (f.halves) lines.push(`Halbzeitstand ${scoreText(f.halves.first)}; in der zweiten Halbzeit fielen ${scoreText(f.halves.second)} (Heimteam zuerst).`);
  if (f.firstGoal) lines.push(`Das erste Tor erzielte ${teamName(f, f.firstGoal.side)} in der ${minuteText(f.firstGoal.sec)}, es hiess ${scoreText(f.firstGoal.score)}.`);
  if (f.biggestLead) lines.push(`Die grösste Führung hatte ${teamName(f, f.biggestLead.side)} mit ${f.biggestLead.diff} Toren Vorsprung (${scoreText(f.biggestLead.score)}, ${minuteText(f.biggestLead.sec)}).`);
  if (f.neverTrailed) lines.push(`${teamName(f, f.neverTrailed)} lag zu keinem Zeitpunkt zurück.`);
  else if (f.leadChanges > 0) lines.push(`Die Führung wechselte ${f.leadChanges}-mal.`);
  if (f.run) lines.push(`Längste Serie: ${teamName(f, f.run.side)} erzielte ${f.run.goals} Tore in Folge (von ${scoreText(f.run.from)} auf ${scoreText(f.run.to)}, zwischen der ${minuteText(f.run.fromSec)} und der ${minuteText(f.run.toSec)}).`);
  if (f.drought) lines.push(`${teamName(f, f.drought.side)} blieb von der ${minuteText(f.drought.fromSec)} bis zur ${minuteText(f.drought.toSec)} ohne eigenes Tor.`);
  if (f.timeouts.length) lines.push(`Auszeiten: ${f.timeouts.map(t => `${teamName(f, t.side)} in der ${minuteText(t.sec)} beim Stand von ${scoreText(t.score)}`).join('; ')}.`);
  if (Number.isInteger(f.suspensions.home) && Number.isInteger(f.suspensions.away)) lines.push(`Zwei-Minuten-Strafen: ${f.home} ${f.suspensions.home}, ${f.away} ${f.suspensions.away}.`);
  if (f.sevenMeters && f.sevenMeters.home.every(Number.isInteger) && f.sevenMeters.away.every(Number.isInteger)) lines.push(`Siebenmeter (Tore von Würfen): ${f.home} ${f.sevenMeters.home[0]} von ${f.sevenMeters.home[1]}, ${f.away} ${f.sevenMeters.away[0]} von ${f.sevenMeters.away[1]}.`);
  if (f.efficiency && Number.isInteger(f.efficiency.home) && Number.isInteger(f.efficiency.away)) lines.push(`Wurfquote: ${f.home} ${f.efficiency.home} %, ${f.away} ${f.efficiency.away} %.`);
  if (f.technicalFaults && Number.isInteger(f.technicalFaults.home) && Number.isInteger(f.technicalFaults.away)) lines.push(`Technische Fehler: ${f.home} ${f.technicalFaults.home}, ${f.away} ${f.technicalFaults.away}.`);
  for (const side of ['home', 'away']) {
    if (f.scorers[side].length) lines.push(`Beste Torschützen ${teamName(f, side)}: ${f.scorers[side].map(p => `${p.name} (${tore(p.goals)}${p.shots !== null ? ' bei ' + p.shots + ' Würfen' : ''})`).join(', ')}.`);
  }
  for (const side of ['home', 'away']) {
    for (const k of f.keepers[side]) lines.push(`Torhüter ${teamName(f, side)}: ${k.name} hielt ${k.saves} von ${k.faced} Würfen${k.percent !== null ? ' (' + k.percent + ' %)' : ''}.`);
  }
  return lines;
}

// Sachlicher Bericht ohne KI (Rückfall): zwei bis drei Absätze, nur aus den Fakten.
export function plainReport(f) {
  const [h, a] = f.final;
  const winner = h === a ? null : teamName(f, h > a ? 'home' : 'away');
  const head = `${f.home} – ${f.away} ${scoreText(f.final)}`;
  const first = [h === a ? `${f.home} und ${f.away} trennen sich ${scoreText(f.final)} unentschieden.` : `${winner} gewinnt gegen ${teamName(f, h > a ? 'away' : 'home')} mit ${scoreText(f.final)}.`];
  if (f.halves) first.push(`Zur Pause stand es ${scoreText(f.halves.first)}.`);
  if (f.biggestLead) first.push(`Die grösste Führung hatte ${teamName(f, f.biggestLead.side)} mit ${f.biggestLead.diff} Toren (${scoreText(f.biggestLead.score)} in der ${minuteText(f.biggestLead.sec)}).`);
  const second = [];
  if (f.run) second.push(`${teamName(f, f.run.side)} erzielte zwischen der ${minuteText(f.run.fromSec)} und der ${minuteText(f.run.toSec)} ${f.run.goals} Tore in Folge (${scoreText(f.run.from)} auf ${scoreText(f.run.to)}).`);
  if (f.drought) second.push(`${teamName(f, f.drought.side)} blieb von der ${minuteText(f.drought.fromSec)} bis zur ${minuteText(f.drought.toSec)} ohne Tor.`);
  if (Number.isInteger(f.suspensions.home) && Number.isInteger(f.suspensions.away)) second.push(`Zwei-Minuten-Strafen: ${f.home} ${f.suspensions.home}, ${f.away} ${f.suspensions.away}.`);
  const third = [];
  for (const side of ['home', 'away']) if (f.scorers[side].length) third.push(`Die meisten Tore für ${teamName(f, side)} erzielten ${f.scorers[side].slice(0, 3).map(p => `${p.name} (${p.goals})`).join(', ')}.`);
  for (const side of ['home', 'away']) for (const k of f.keepers[side].slice(0, 1)) third.push(`${k.name} hielt für ${teamName(f, side)} ${k.saves} von ${k.faced} Würfen.`);
  return {headline: head, paragraphs: [first.join(' '), ...(second.length ? [second.join(' ')] : []), ...(third.length ? [third.join(' ')] : [])]};
}

// Torfolge für die Anzeige in der App: «t» als Spielminute, «s» Spielstand, «h» wahr, wenn das Heimteam traf.
export const goalFeed = ticker => ticker.goals.map(g => ({t: clockText(g.sec), s: g.score, h: g.side === 'home', n: g.name, p: g.seven}));
