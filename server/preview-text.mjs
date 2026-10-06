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

// input: {club, game, table (Zeilen der passenden Meisterschaftstabelle oder null), duel (letztes Direktduell oder null), now}
export function buildPreview({club, game: g, table = null, duel = null, now = new Date()}) {
  const paragraphs = [`${g.home} empfängt ${g.away} (${g.league}), ${when(g)}${g.venue ? ' in ' + g.venue : ''}.`];
  const {list, rank} = standings(table);
  const [ra, rb] = [rank(g.home), rank(g.away)];
  if (ra && rb) {
    const [a, b] = [list[ra - 1], list[rb - 1]];
    if ([a, b].every(r => [r.points, r.played, r.gf, r.ga].every(isNumber)))
      paragraphs.push(`In der Tabelle liegt ${line(g.home, ra, a)}, ${line(g.away, rb, b)}.`);
  }
  if (duel?.score?.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(duel.date || ''))
    paragraphs.push(`Das letzte Direktduell (${duel.date.split('-').reverse().join('.')}, ${duel.home} – ${duel.away}) endete ${duel.score[0]}:${duel.score[1]}.`);
  if (paragraphs.length < 2) return null;
  const sources = [];
  const add = (label, url) => { if (typeof url === 'string' && /^https:\/\//.test(url) && !sources.some(s => s.url === url)) sources.push({label, url}); };
  if (club === 'kadetten') {
    add('Kadetten Schaffhausen: Matchcenter', 'https://kadettensh.ch/matchcenter/');
    if (duel) add('handball.ch: Direktduell', duel.externalUrl);
  } else {
    add('FC St. Gallen: Spiel im Match-Center', g.url);
    add('FC St. Gallen: offizielle Daten', 'https://www.fcsg.ch/');
  }
  return {
    club, id: String(g.id), fixtureKey: fixtureKey(g), headline: `${g.home} gegen ${g.away}`, paragraphs, sources,
    generatedAt: now.toISOString(), generator: 'daten'
  };
}

// Die Meisterschaftstabelle, die zum Wettbewerb des Spiels gehört (sonst null, damit keine fremde Tabelle verglichen wird).
export function tableFor(club, g, snapshot, fcsgData) {
  if (club === 'kadetten') return snapshot?.tables?.[g.league] || null;
  return /super league/i.test(g.league || '') ? fcsgData?.table || null : null;
}
