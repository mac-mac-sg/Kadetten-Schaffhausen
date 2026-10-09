import {parseHTML} from 'linkedom';

export const ehlPlayerSource = 'https://ehfel.eurohandball.com/men/2026-27/clubs/details/uyEpUicNjwv8hCX9B7A3sg/KadettenSchaffhausen/';
// Stable EHF person IDs mapped to the existing profile IDs, never shirt number alone.
const profileIds = {
  hgA1rufJkxawfEgkIVgW_w: 1, 'vTbkruUenUPCLKU-ejA4bA': 2,
  QtJdjumMlNX9qEJBSpygJA: 3, '5wRFxyUoqRvsWH7lcaNeSQ': 4,
  vHCfSNWPrjGnNkLVLY5lWg: 5, rIxC4ihkwRtn6YB2UXib0g: 6,
  H98c6hb7CdqCMzd0MSX3MQ: 7, DnKQumPZ2gFW4e65HJCChg: 8,
  'lelfK_YYz8qfS36V-uWSRQ': 9, wNaT9gJs5vjKpcWOs3LOgA: 10,
  '3sGTZLro8ezY8Vp3S4gTxQ': 11, SX9jTGAB8SUR1Rw2SSY_XQ: 12,
  JeBT5Y4rVhoHFPCW4GKPCQ: 13, utjmEEm7svkiUIoToHMOIw: 14,
  h7d7SKRgIKRo4KquOjWkbA: 15, K_OwzLAQnaJrksM7Ad7yvA: 16,
  'Dmn7_Z3ZD-6YGuEMjxFlbw': 18, 'GTlKq_eU0s3n6E-ZT7ROAg': 19,
  '1QMPSPgkwcOk72rTUSovvQ': 20, EjEWEv981Av973IMisImIQ: 21,
  KTBmzKPrurKtmHTte1OgLQ: 22
};

export function ehlPlayersUrl(html) {
  const {document} = parseHTML(html);
  const el = document.querySelector('#vue-container-clubDetails');
  const attr = name => el?.getAttribute('data-' + name);
  if (attr('club-id') !== 'uyEpUicNjwv8hCX9B7A3sg' || attr('club-details-url') !== '/umbraco/api/clubdetailsapi/Players') throw Error('Unexpected EHF club');
  const url = new URL(attr('club-details-url'), ehlPlayerSource);
  for (const key of ['competition-id', 'club-id', 'round-id', 'content-id', 'culture']) {
    const value = attr(key);
    if (!value || !/^[\w-]+$/.test(value)) throw Error('Missing EHF season scope');
    url.searchParams.set(key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value);
  }
  return url;
}

export function parseEhlPlayerSeason(data, {roundId, checkedAt, hadResults = false} = {}) {
  if (!Array.isArray(data?.players) || !Array.isArray(data?.goalKeepers) || data.players.length < 10 || !data.goalKeepers.length) throw Error('Incomplete EHF roster');
  const players = {}, seen = new Set();
  let total = 0;
  for (const p of [...data.players, ...data.goalKeepers, ...(data.playersLeft || [])]) {
    if (!p.id || seen.has(p.id) || !p.person?.firstName || !p.person?.lastName) throw Error('Invalid EHF player');
    seen.add(p.id);
    const score = p.score;
    for (const key of ['goals', 'warningsCount', 'twoMinPenaltiesCount', 'redCardsCount'])
      if (!Number.isInteger(score?.[key]) || score[key] < 0) throw Error('Missing EHF player metric');
    total += score.goals;
    const id = profileIds[p.id];
    if (!id) continue;
    players[id] = {ehfPlayerId: p.id, goals: score.goals, yellowCards: score.warningsCount, twoMinutes: score.twoMinPenaltiesCount, disqualifications: score.redCardsCount};
  }
  if (Object.keys(players).length < 10 || (hadResults && total === 0)) throw Error('Incomplete EHF scoring totals');
  // Shots, percentages, appearances and goalkeeper saves are not populated reliably by this roster API.
  return {ok: true, season: '2026/27', competition: 'EHL', roundId, checkedAt, source: ehlPlayerSource, players};
}

export async function refreshEhlPlayerSeason(snapshot, {fetchFn = fetch, now = new Date()} = {}) {
  try {
    const page = await fetchFn(ehlPlayerSource, {signal: AbortSignal.timeout(25000)});
    if (!page.ok) throw Error('EHF HTTP ' + page.status);
    const url = ehlPlayersUrl(await page.text());
    const response = await fetchFn(url.href, {signal: AbortSignal.timeout(25000)});
    if (!response.ok) throw Error('EHF HTTP ' + response.status);
    return parseEhlPlayerSeason(await response.json(), {roundId: url.searchParams.get('roundId'), checkedAt: now.toISOString(), hadResults: snapshot.games?.some(g => g.league === 'EHL' && g.score)});
  } catch (error) {
    return {...snapshot.ehlPlayerSeason, ok: false, error: String(error.message)};
  }
}
