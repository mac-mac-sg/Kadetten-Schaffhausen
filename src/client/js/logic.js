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
