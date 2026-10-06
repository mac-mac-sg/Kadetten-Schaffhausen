// Aus einem gesicherten SHV-Spielbericht (kadetten/reports/<ID>.json, parseArchivedReport) die Eingaben für den KI-Matchbericht ableiten:
// Torfolge aus den Spielstandänderungen, Auszeiten (Aktion «bTO»), Spieler- und Teamwerte in der Form des EHF-Berichts (server/ehf-ticker.mjs).
// Nur bestätigte Spielstandänderungen zählen; passt die Torzahl nicht zum Endstand, wird kein Bericht erzeugt.

// «LUTZ Milan» -> «Milan Lutz» (grossgeschriebene Wörter sind der Familienname).
export function niceName(raw) {
  const words = String(raw || '').trim().split(/\s+/).filter(Boolean);
  const cap = w => w.charAt(0).toLocaleUpperCase('de-CH') + w.slice(1).toLocaleLowerCase('de-CH');
  const isSurname = w => w.length > 1 && w === w.toLocaleUpperCase('de-CH') && w !== w.toLocaleLowerCase('de-CH');
  const surname = words.filter(isSurname).map(cap).join(' '), given = words.filter(w => !isSurname(w)).join(' ');
  return [given, surname].filter(Boolean).join(' ') || String(raw || '');
}

export function qhlInputs(report) {
  if (!report?.score || !Array.isArray(report.teams) || report.teams.length !== 2) throw Error('Invalid QHL report');
  const [h, a] = report.score;
  const events = [...(report.events || [])].sort((x, y) => x.seconds - y.seconds || x.id - y.id);
  const goals = [];
  let prev = [0, 0];
  for (const e of events) {
    if (!e.score) continue;
    const dh = e.score[0] - prev[0], da = e.score[1] - prev[1];
    if (!((dh === 1 && da === 0) || (dh === 0 && da === 1))) continue;
    const side = dh === 1 ? 'home' : 'away';
    goals.push({sec: e.seconds, half: e.seconds < 1800 ? 'H1' : 'H2', score: e.score, side, name: niceName(side === 'home' ? e.homePlayer : e.awayPlayer) || null, bib: null, seven: false});
    prev = e.score;
  }
  if (goals.length !== h + a) throw Error('Goal sequence does not match final score');
  const timeouts = events.filter(e => e.homeAction === 'bTO' || e.awayAction === 'bTO').map(e => {
    const side = e.homeAction === 'bTO' ? 'home' : 'away', before = [...goals].reverse().find(g => g.sec <= e.seconds)?.score || [0, 0];
    return {sec: e.seconds, half: e.seconds < 1800 ? 'H1' : 'H2', score: before, code: null, side};
  });
  const ticker = {goals, sevenMeters: [], timeouts, suspensions: [], suspensionsKnown: false, halftime: Array.isArray(report.half) && report.half.every(Number.isInteger) ? report.half : null, final: report.score};
  const players = report.teams.flatMap((t, i) => t.players.map(p => ({home: i === 0, name: niceName(p.name), goalkeeper: !!p.keeper, goals: p.goals, shots: p.shots, saves: p.saves, savesFaced: p.keeperShots})));
  const stat = t => ({goals: null, shots: t.shots ?? null, misses: null, efficiency: t.throwPercentage ?? null, sevenGoals: t.seven ?? null, sevenShots: t.sevenShots ?? null, twoMinutes: t.twoMinutes ?? null, warnings: t.warnings ?? null, disqualifications: null, technicalFaults: t.turnovers ?? null});
  return {ticker, players, teamStats: {home: stat(report.teams[0]), guest: stat(report.teams[1])}, home: report.teams[0].name, away: report.teams[1].name};
}
