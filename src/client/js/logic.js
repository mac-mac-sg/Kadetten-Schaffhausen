/* Reine Spiel- und Spieltagslogik ohne Zugriff auf die Seite. Wird in tests/logic.test.mjs geprüft. */
function teamName(n) {
  return n.replace(/^TSV /, '');
}
function teamResult(x, team) {
  const own = teamName(x.home) === teamName(team) ? 0 : 1,
    d = x.score[own] - x.score[1 - own];
  return {
    state: d > 0 ? 'win' : d < 0 ? 'loss' : 'draw',
    short: d > 0 ? 'S' : d < 0 ? 'N' : 'U',
    label: d > 0 ? 'Sieg' : d < 0 ? 'Niederlage' : 'Unentschieden',
    for: x.score[own],
    against: x.score[1 - own]
  };
}
function nextPreviewGame() {
  const zone = {timeZone: 'Europe/Zurich'},
    now = new Date(),
    today = now.toLocaleDateString('sv-SE', zone),
    time = now.toLocaleTimeString('sv-SE', {...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}),
    stamp = today + 'T' + time;
  return (
    games
      .filter(g => !g.score && g.date + 'T' + (g.time || '23:59') >= stamp)
      .slice()
      .sort((a, b) => (a.date + (a.time || '23:59')).localeCompare(b.date + (b.time || '23:59')))[0] || null
  );
}
function swissToday(now = new Date()) {
  return now.toLocaleDateString('sv-SE', {timeZone: 'Europe/Zurich'});
}
function kickoffAt(g) {
  if (!g.time) return null;
  const date = g.date + 'T' + g.time + ':00',
    probe = new Date(date + 'Z');
  const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich',
      timeZoneName: 'shortOffset'
    }).formatToParts(probe),
    offset = parts.find(p => p.type === 'timeZoneName').value;
  const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return new Date(date + (match ? match[1] + match[2].padStart(2, '0') + ':' + (match[3] || '00') : 'Z'));
}
function freshLive() {
  return !offlineData && navigator.onLine && (typeof liveRequestFailed === 'undefined' || !liveRequestFailed) && liveState?.match && Date.now() - Date.parse(liveState.checkedAt) < 90000
    ? liveState.match
    : null;
}
function sameFixture(a, b) {
  return a && b && teamName(a.home) === teamName(b.home) && teamName(a.away) === teamName(b.away);
}
function todayGames() {
  return games
    .filter(g => g.date === swissToday() && ['QHL', 'EHL'].includes(g.league))
    .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
}
function homeFixture() {
  const live = freshLive();
  if (live) return {game: live, live};
  const today = todayGames(),
    pending = today.find(g => !g.score),
    finished = today.filter(g => g.score).at(-1),
    confirmed = liveState?.finished;
  if (confirmed?.status === 'finished' && confirmed.date === swissToday() &&
      Array.isArray(confirmed.score) && confirmed.score.length === 2 &&
      confirmed.score.every(v => Number.isInteger(v) && v >= 0)) {
    const local = today.find(g => sameFixture(g, confirmed));
    return {game: {...local, ...confirmed, id: local?.id || 'live'}, live: null};
  }
  // Keep today's last result until Swiss midnight, then select the next preview.
  return {game: finished || pending || nextPreviewGame(), live: null};
}
function countdownSoon(g, now = new Date()) {
  const at = kickoffAt(g);
  if (!at) return false;
  const secs = Math.floor((at - now) / 1000);
  return secs > 0 && secs <= 3600;
}
function countdownText(g, now = new Date()) {
  const at = kickoffAt(g);
  if (!at) return 'Anspielzeit noch offen';
  const secs = Math.floor((at - now) / 1000);
  if (secs <= 0)
    return offlineData || !navigator.onLine
      ? 'Live-Status offline nicht verfügbar'
      : 'Anspielzeit erreicht · Live-Status wird geprüft';
  const h = Math.floor(secs / 3600),
    m = Math.floor((secs % 3600) / 60),
    s = secs % 60;
  return `Anpfiff in ${h ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
// Tage bis zu einem Spieldatum in Zürcher Zeit: 0 = heute, 1 = morgen, negativ = vorbei.
function daysUntil(dateStr, now = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number),
    [ty, tm, td] = swissToday(now).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}
// Kurzer Hinweis wie "Morgen" oder "in 3 Tagen". Leer, wenn das Spiel heute oder vorbei ist oder weit weg liegt.
function relativeDay(dateStr, now = new Date()) {
  const n = daysUntil(dateStr, now);
  if (n === 1) return 'Morgen';
  if (n === 2) return 'Übermorgen';
  return n >= 3 && n <= 30 ? `in ${n} Tagen` : '';
}

// Planmässige Snapshot-Läufe in Zürich, mit 45 Minuten Spielraum für den Import.
function snapshotDelayed(stamp, now = new Date()) {
  const updated = Date.parse(stamp);
  if (!Number.isFinite(updated)) return true;
  const day = swissToday(new Date(updated));
  for (let offset = 0; offset < 2; offset++) {
    const date = new Date(Date.parse(day + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
    for (const hour of [6, 9, 12, 15, 18, 21, 22]) {
      const next = kickoffAt({date, time: String(hour).padStart(2, '0') + ':20'}).getTime();
      if (next > updated) return now.getTime() > next + 45 * 60000;
    }
  }
  return true;
}
function goalAverage(total, played) {
  return Number.isFinite(total) && played > 0
    ? (total / played).toLocaleString('de-CH', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '–';
}

// Datenstand aus dem Datendienst: Texte liegen als HTML-maskierter Text vor (server/update.mjs, esc()).
// Beim Einlesen wird jeder Text einmal entmaskiert und wieder maskiert. Daten im erwarteten Format bleiben
// dadurch unverändert (idempotent); rohes Markup aus einer manipulierten Quelle wird unschädlich.
const SNAPSHOT_ENTITIES = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'"};
function snapshotText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&(?:amp|lt|gt|quot|#39);/g, entity => SNAPSHOT_ENTITIES[entity])
    .replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);
}
function snapshotFields(item, keys) {
  const out = {...item};
  for (const key of keys) if (key in out) out[key] = snapshotText(out[key]);
  return out;
}
const SNAPSHOT_ID = /^[\w-]{1,80}$/;
const SNAPSHOT_LOGO = /^(?:assets\/[\w.-]+\.(?:png|webp|jpe?g|svg)|https:\/\/[^\s"'<>]+)$/;
function sanitiseSnapshot(d) {
  const out = {...d};
  out.games = d.games
    .filter(g => g && SNAPSHOT_ID.test(String(g.id)))
    .map(g => {
      const game = snapshotFields(g, ['home', 'away', 'league', 'venue', 'date', 'time']);
      if ('score' in game && !(Array.isArray(game.score) && game.score.length === 2 && game.score.every(Number.isFinite)))
        delete game.score;
      return game;
    });
  out.stories = d.stories
    .filter(n => n && SNAPSHOT_ID.test(String(n.id)))
    .map(n => snapshotFields(n, ['title', 'text', 'date']));
  if (d.ehlPlayerSeason?.players)
    out.ehlPlayerSeason = {...d.ehlPlayerSeason, players: Object.fromEntries(Object.entries(d.ehlPlayerSeason.players)
      .filter(([id]) => /^\d{1,3}$/.test(id))
      .map(([id, player]) => [id, Object.fromEntries(['goals', 'yellowCards', 'twoMinutes', 'disqualifications']
        .map(key => [key, Number.isInteger(player?.[key]) && player[key] >= 0 ? player[key] : null]))]))};
  if (d.ehlRecentGames && typeof d.ehlRecentGames === 'object')
    out.ehlRecentGames = Object.fromEntries(Object.entries(d.ehlRecentGames).map(([team, entry]) => [snapshotText(team), {
      ...entry,
      games: Array.isArray(entry?.games) ? entry.games
        .filter(g => g && SNAPSHOT_ID.test(String(g.id)) && Array.isArray(g.score) && g.score.length === 2 && g.score.every(v => Number.isInteger(v) && v >= 0))
        .map(g => snapshotFields(g, ['home', 'away', 'league', 'date'])) : undefined
    }]));
  out.tables = Object.fromEntries(
    Object.entries(d.tables).map(([league, rows]) => [
      league,
      Array.isArray(rows) ? rows.map(row => (Array.isArray(row) ? row.map(snapshotText) : row)) : rows
    ])
  );
  if (d.clubLogos && typeof d.clubLogos === 'object')
    out.clubLogos = Object.fromEntries(
      Object.entries(d.clubLogos).filter(([, logo]) => typeof logo === 'string' && SNAPSHOT_LOGO.test(logo))
    );
  return out;
}
