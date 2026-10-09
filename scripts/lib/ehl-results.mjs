import {parseHTML} from 'linkedom';

const origin = 'https://ehfel.eurohandball.com';
const clubsUrl = origin + '/men/2026-27/clubs/';
const nameKey = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/chambery.*$/, 'chambery').replace(/[^a-z0-9]/g, '');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const text = (row, selector) => row.querySelector(selector)?.textContent.trim() || '';

export function parseEhlClubs(html) {
  const {document} = parseHTML(html);
  const clubs = new Map();
  for (const a of document.querySelectorAll('a.tg-item[href]')) {
    const url = new URL(a.getAttribute('href'), origin);
    if (url.origin !== origin || !/^\/men\/2026-27\/clubs\/details\/[\w-]+\/[^/]+\/$/.test(url.pathname)) continue;
    const name = text(a, '.tg-name');
    if (name) clubs.set(nameKey(name), url.href);
  }
  if (!clubs.size) throw Error('EHF club list unavailable');
  return clubs;
}

export function parseEhlResults(html, team, names, today) {
  const {document} = parseHTML(html);
  const season = document.querySelector('#content_current_season');
  const rows = season?.querySelectorAll('a.table-row--results');
  if (!rows?.length) throw Error('EHF season results unavailable');
  const canonical = new Map(names.map(name => [nameKey(name), name]));
  const games = new Map();
  for (const row of rows) {
    const home = text(row, '.team-block--first .name'), away = text(row, '.team-block--second .name');
    if (![home, away].some(name => nameKey(name) === nameKey(team))) throw Error('Unexpected EHF team');
    const url = new URL(row.getAttribute('href'), origin);
    const id = url.pathname.match(/^\/men\/2026-27\/matches\/details\/(\d+)\//)?.[1];
    if (url.origin !== origin || !id) throw Error('Unexpected EHF match URL');
    const dateText = text(row, '.date').match(/^[A-Za-z]{3} ([A-Za-z]{3}) (\d{1,2}), (202[67])$/);
    if (!dateText || !months.includes(dateText[1])) throw Error('Invalid EHF match date');
    const date = `${dateText[3]}-${String(months.indexOf(dateText[1]) + 1).padStart(2, '0')}-${dateText[2].padStart(2, '0')}`;
    if (new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw Error('Invalid EHF match date');
    const scores = [text(row, '.team-block--first .score'), text(row, '.team-block--second .score')];
    // Only dated, published results count; blank scores are fixtures, never 0:0.
    if (date >= today || scores.every(score => score === '')) continue;
    if (!scores.every(score => /^\d{1,3}$/.test(score)) || scores.every(score => Number(score) === 0)) throw Error('Invalid EHF result');
    const game = {id: 'ehf-' + id, date, home: canonical.get(nameKey(home)) || home, away: canonical.get(nameKey(away)) || away, league: 'EHL', score: scores.map(Number), externalUrl: url.href};
    if (games.has(id) && JSON.stringify(games.get(id)) !== JSON.stringify(game)) throw Error('Conflicting EHF result');
    games.set(id, game);
  }
  return [...games.values()].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
}

export async function refreshEhlResults(snapshot, {fetchFn = fetch, now = new Date()} = {}) {
  const teams = [...new Set((snapshot.games || []).filter(g => g.league === 'EHL').flatMap(g => [g.home, g.away]))];
  const entries = {...snapshot.ehlRecentGames};
  const checkedAt = now.toISOString(), today = now.toLocaleDateString('sv-SE', {timeZone: 'Europe/Zurich'});
  const get = async url => {
    const response = await fetchFn(url, {signal: AbortSignal.timeout(25000)});
    if (!response.ok) throw Error('EHF HTTP ' + response.status);
    return response.text();
  };
  let clubs;
  try { clubs = parseEhlClubs(await get(clubsUrl)); }
  catch (error) {
    for (const team of teams) entries[team] = {...entries[team], ok: false, error: String(error.message)};
    return entries;
  }
  await Promise.all(teams.map(async team => {
    try {
      const source = clubs.get(nameKey(team));
      if (!source) throw Error('EHF team not found');
      const games = parseEhlResults(await get(source), team, teams, today);
      if (games.length < (entries[team]?.games?.length || 0)) throw Error('Incomplete EHF results');
      entries[team] = {ok: true, checkedAt, source, games};
    } catch (error) {
      entries[team] = {...entries[team], ok: false, error: String(error.message)};
    }
  }));
  return entries;
}
