/* Gemeinsamer Zustand, Escape-Helfer und kleine Bausteine (Karten, Wappen, Fusszeile). */
let updateState = null;
let liveState = null,
  liveTimer,
  liveBusy = false;
// Only plain web links may end up in href attributes (blocks javascript: and data: URLs from external data).
function safeUrl(value) {
  try {
    const u = new URL(String(value), location.href);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
}
function liveEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
const base = 'https://kadettensh.ch/',
  report = base + 'perfekter-start-in-der-european-league/';
let calendarYear = 2026;
let competition = 'Alle',
  mode = 'list',
  month = 9,
  tableLeague = 'QHL';
const $ = s => document.querySelector(s),
  ext = (u, t, c = 'button') =>
    `<a class="${c}" href="${liveEscape(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${t}</a>`,
  date = g =>
    new Date(g.date + 'T12:00:00').toLocaleDateString('de-CH', {day: '2-digit', month: '2-digit', year: 'numeric'}),
  league = g =>
    g.league === 'QHL' ? 'Quickline Handball League' : g.league === 'EHL' ? 'EHF European League' : g.league;
function footer() {
  const [page = 'home', id, tab = 'overview'] = (location.hash.slice(1) || 'home').split('/');
  const game = page === 'match' ? games.find(g => g.id === id) : null;
  const key =
    page === 'match' || (page === 'season' && id === 'games')
      ? 'games'
      : page === 'season' && id === 'table'
        ? 'table'
        : page === 'season' && id === 'squad'
          ? 'players'
          : 'news';
  const url =
    game?.url ||
    (page === 'season' && id === 'games'
      ? base + 'matchcenter/'
      : page === 'season' && id === 'squad'
        ? base + '1-mannschaft/'
        : base);
  const hasDirectSource = page === 'news' || (page === 'match' && (tab === 'overview' || verifiedReport(game)));
  const historySource = page === 'match' && tab === 'stats' && game?.league === 'QHL' && !verifiedReport(game);
  return `<footer><span class="footer-updated">${updateLabel(key)}</span><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Unabhängige Fan-App · kein offizieller Vereinsauftritt.</p>${hasDirectSource ? '' : `<p>${ext(url, 'Kadetten Schaffhausen', '')}${historySource ? ' · ' + ext('https://www.handball.ch/de/matchcenter/', 'SHV: Resultate und Direktvergleich', '') : ''}</p>`}<p>Bilder: Kadetten Schaffhausen · Spielbilder © André Frensel / Erich Mosberger</p></details></footer>`;
}
function badge(name) {
  const logo = clubLogos[name];
  return logo
    ? `<img class="crest" src="${liveEscape(photoUrl(logo))}" alt="${name}" width="48" height="60" loading="lazy" decoding="async">`
    : `<span class="clubmark" aria-hidden="true">${name
        .split(' ')
        .map(w => w[0])
        .slice(0, 3)
        .join('')}</span>`;
}
function card(g, current = false) {
  const live = g.date === swissToday() && sameFixture(g, freshLive()) ? freshLive() : null;
  if (live) return `<article class="game-card current-game is-live" data-game-card="${liveEscape(g.id)}"><p class="current-label">Jetzt live · ${liveEscape(live.phase || '')} ${liveEscape(live.clock || '')}</p><p class="meta">${league(g)} · ${date(g)}</p><div class="scoreline"><div>${badge(g.home)}<span>${liveEscape(g.home)}</span></div><strong>${live.score ? live.score.join(' : ') : '– : –'}<small>Live</small></strong><div>${badge(g.away)}<span>${liveEscape(g.away)}</span></div></div><div class="actions"><a class="button" href="${liveMatchHref(live)}">Spiel live verfolgen</a></div></article>`;
  const result = g.score ? teamResult(g, 'Kadetten Schaffhausen') : null;
  const derby = /Pfadi/.test(g.home.includes('Kadetten') ? g.away : g.home);
  return `<article data-game-card="${liveEscape(g.id)}" class="game-card ${g.score ? 'finished result-' + result.state : ''} ${current ? 'current-game' : ''}" ${current ? 'aria-label="Nächstes Spiel"' : ''}>${current ? '<p class="current-label">Nächstes Spiel' + (relativeDay(g.date) ? ' · ' + relativeDay(g.date) : '') + '</p>' : ''}<p class="meta">${g.score ? `<span class="game-result-label">${result.label}</span> · ` : ''}${league(g)} · ${date(g)}${g.time ? ' · ' + g.time : ''}${derby ? ' <span class="game-derby">Derby</span>' : ''}</p><div class="scoreline"><div>${badge(g.home)}<span>${g.home}</span></div><strong>${g.score ? g.score.join(' : ') : 'VS'}<small>${g.half ? '(' + g.half.join(':') + ')' : g.score ? 'Endstand' : 'Vorschau'}</small></strong><div>${badge(g.away)}<span>${g.away}</span></div></div><p class="venue">${g.venue}</p><div class="actions"><a class="button ${g.score ? 'subtle' : ''}" href="#match/${liveEscape(g.id)}/overview">${g.score ? 'Rückblick' : 'Vorschau'}</a></div></article>`;
}
// Fotos und Wappen liegen als WebP vor. Namen aus den Daten (z. B. "news-34317.jpg" oder "assets/club-1.png") werden hier umgestellt;
// vollständige https-Adressen bleiben unverändert.
function photoUrl(name) {
  const value = String(name);
  if (/^https?:/.test(value)) return value;
  return (value.startsWith('assets/') ? value : 'assets/' + value).replace(/\.(png|jpe?g)$/i, '.webp');
}

/* Gemeinsame Navigation für Detailseiten. */
function backLink(href, label, placement = '') {
  return `<a href="${liveEscape(href)}" class="back-link ${placement}"><span aria-hidden="true">←</span>${liveEscape(label)}</a>`;
}
