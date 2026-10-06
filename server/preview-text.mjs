import {fixtureKey} from './previews.mjs';

// Match-Vorschau ohne KI: ein kurzer Text aus bestätigten Daten (Spielangaben, Tabelle, letztes Direktduell). Fehlende Angaben
// entfallen; es wird nichts geschätzt oder erfunden. Reine Funktion, keine Netzwerk- oder Speicherzugriffe.
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const key = name => String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(1[0-9]{3}|20[0-9]{2})\b/g, '').replace(/^(tsv|fc|bsc|hc) /, '').replace(/[^a-z0-9]/g, '');
const sameTeam = (a, b) => !!key(a) && key(a) === key(b);

function when(g) {
  const d = new Date(g.date + 'T12:00:00Z');
  const day = `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (!g.time || g.confirmed === false) return day + (g.confirmed === false ? ' (Anspielzeit noch nicht bestätigt)' : '');
  return `${day}, ${g.time} Uhr`;
}

// rows: Kadetten-Form [name, gespielt, Tore+, Tore-, Punkte] oder FCSG-Form {name, played, gf, ga, points}.
const normaliseRow = r => (Array.isArray(r) ? {name: r[0], played: r[1], gf: r[2], ga: r[3], points: r[4]} : r);
function standings(rows) {
  const list = (rows || []).map(normaliseRow);
  return {list, rank: name => list.findIndex(r => sameTeam(r?.name, name)) + 1};
}
const line = (team, rank, r) => `${team} auf dem ${rank}. Rang (${r.points} Punkte aus ${r.played} Spielen, Torverhältnis ${r.gf}:${r.ga})`;
const isNumber = v => Number.isFinite(v);

const fullDate = d => d.split('-').reverse().join('.');
const shortDate = d => d.split('-').reverse().slice(0, 2).join('.') + '.';
const signed = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
// Resultat aus Sicht eines Teams: «03.10.2026 bei SC Brühl (auswärts): 3:3 Unentschieden».
function viewOf(team, r) {
  const home = r.home === team, [h, a] = r.score, own = home ? h : a, opp = home ? a : h;
  return `${fullDate(r.date)} ${home ? 'gegen' : 'bei'} ${home ? r.away : r.home} (${home ? 'zuhause' : 'auswärts'}): ${own}:${opp} ${own > opp ? 'Sieg' : own < opp ? 'Niederlage' : 'Unentschieden'}`;
}
const validGame = r => r && Array.isArray(r.score) && r.score.length === 2 && r.score.every(Number.isInteger) && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') && r.home && r.away;

// input: {club, game, table (Zeilen der passenden Meisterschaftstabelle oder null), duels (letzte Direktduelle, neueste zuerst; oder
// `duel` für das letzte), recent ([{team, games}] letzte Resultate je Team, neueste zuerst), now}
export function buildPreview({club, game: g, table = null, duel = null, duels = null, recent = [], now = new Date()}) {
  const paragraphs = [`${g.home} empfängt ${g.away} (${g.league}), ${when(g)}${g.venue ? ' in ' + g.venue : ''}.`];
  const {list, rank} = standings(table);
  const [ra, rb] = [rank(g.home), rank(g.away)];
  if (ra && rb) {
    const [a, b] = [list[ra - 1], list[rb - 1]];
    if ([a, b].every(r => [r.points, r.played, r.gf, r.ga].every(isNumber)))
      paragraphs.push(`In der Tabelle liegt ${line(g.home, ra, a)}, ${line(g.away, rb, b)}.`);
  }
  const duelList = (duels ?? (duel ? [duel] : [])).filter(validGame).slice(0, 3);
  const third = [];
  if (duelList.length === 1) third.push(`Das letzte Direktduell (${fullDate(duelList[0].date)}, ${duelList[0].home} – ${duelList[0].away}) endete ${duelList[0].score[0]}:${duelList[0].score[1]}.`);
  else if (duelList.length > 1) third.push(`Die letzten Direktduelle: ${duelList.map(d => `${fullDate(d.date)} ${d.home} – ${d.away} ${d.score[0]}:${d.score[1]}`).join('; ')}.`);
  for (const r of recent) {
    const games = (r.games || []).filter(validGame).slice(0, 3);
    if (games.length) third.push(`Zuletzt spielte ${r.team}: ${games.map(x => `${shortDate(x.date)} ${x.home} – ${x.away} ${x.score[0]}:${x.score[1]}`).join('; ')}.`);
  }
  if (third.length) paragraphs.push(third.join(' '));
  // Eindeutige Faktenliste für die KI (die Absätze oben sind der sachliche Text und der Rückfall).
  const facts = [`Spiel: ${g.home} (Heimteam) empfängt ${g.away} (Gastteam), Wettbewerb ${g.league}.`, `Termin: ${when(g)}${g.venue ? '; Ort: ' + g.venue : ''}.`];
  if (ra && rb) {
    const [a, b] = [list[ra - 1], list[rb - 1]];
    if ([a, b].every(r => [r.points, r.played, r.gf, r.ga].every(isNumber)))
      for (const [team, rank, r] of [[g.home, ra, a], [g.away, rb, b]])
        facts.push(`Tabelle: ${team} steht auf Rang ${rank} mit ${r.points} Punkten aus ${r.played} Spielen, ${r.gf} Tore erzielt, ${r.ga} Tore kassiert (Tordifferenz ${signed(r.gf - r.ga)}).`);
  }
  for (const d of duelList)
    facts.push(`Direktduell am ${fullDate(d.date)}: ${d.home} – ${d.away} ${d.score[0]}:${d.score[1]} (${d.score[0] === d.score[1] ? 'Unentschieden' : 'Sieg ' + (d.score[0] > d.score[1] ? d.home : d.away)}).`);
  for (const r of recent) {
    const games = (r.games || []).filter(validGame).slice(0, 3);
    if (games.length) facts.push(`Letzte Spiele von ${r.team} (neueste zuerst): ${games.map(x => viewOf(r.team, x)).join('; ')}.`);
  }
  if (paragraphs.length < 2) return null;
  const sources = [];
  const add = (label, url) => { if (typeof url === 'string' && /^https:\/\//.test(url) && !sources.some(s => s.url === url)) sources.push({label, url}); };
  if (club === 'kadetten') {
    add('Kadetten Schaffhausen: Matchcenter', 'https://kadettensh.ch/matchcenter/');
    for (const d of duelList) add(duelList.length === 1 ? 'handball.ch: Direktduell' : `handball.ch: Direktduell vom ${fullDate(d.date)}`, d.externalUrl);
    if (recent.some(r => r.shv)) add('handball.ch: Matchcenter', 'https://www.handball.ch/de/matchcenter/');
  } else {
    add('FC St. Gallen: Spiel im Match-Center', g.url);
    add('FC St. Gallen: offizielle Daten', 'https://www.fcsg.ch/');
  }
  return {
    club, id: String(g.id), fixtureKey: fixtureKey(g), headline: `${g.home} gegen ${g.away}`, paragraphs, sources,
    generatedAt: now.toISOString(), generator: 'daten', facts
  };
}

// Die Meisterschaftstabelle, die zum Wettbewerb des Spiels gehört (sonst null, damit keine fremde Tabelle verglichen wird).
export function tableFor(club, g, snapshot, fcsgData) {
  if (club === 'kadetten') return snapshot?.tables?.[g.league] || null;
  return /super league/i.test(g.league || '') ? fcsgData?.table || null : null;
}
