// «Saison»: Spielplan & Resultate, Tabellen, Statistik.
import {html} from '../text.js';
import {href} from '../router.js';
import {OWN_TEAM, ownGames, kickoff, hasScore, shortTeam, standings, nextGame, zurichParts, competitionOf} from '../logic.js';
import {icon} from '../icons.js';
import {SQUAD} from '../../data/squad.js';
import {favourite} from '../personal.js';
import {normalizeReport, fitsGame, playerInReport, pct, fmtPct} from '../report.js';
import {loadReportFor} from './bericht.js';
import {topBar, chips, sectionHead, notice, loading, gameRow, segment, crest, playerByNumber} from './parts.js';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TABS = [['tabellen', 'Tabelle', '#/statistik'], ['statistik', 'Spielerwerte', '#/statistik/spieler']];


function spielplan({state, now, ui}) {
  const games = ownGames(state.data.games);
  const present = ['QHL', 'EHL', 'Cup', 'Test'].filter(c => games.some(g => competitionOf(g) === c));
  const filter = present.includes(ui.comp) ? ui.comp : 'Alle';
  const list = games.filter(g => filter === 'Alle' || competitionOf(g) === filter);
  const next = nextGame(list, now);
  const months = new Map();
  for (const g of list) {
    const p = zurichParts(kickoff(g)), key = p.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(g);
  }
  return html`${chips('comp', [['Alle', 'Alle'], ...present.map(c => [c, c])], filter, 'Wettbewerb')}
    ${[...months].map(([key, items]) => html`<section class="sec" aria-labelledby="${'m-' + key}">${sectionHead(`${MONTHS[+key.slice(5) - 1]} ${key.slice(0, 4)}`, '', '', 'm-' + key)}
      <div class="card list">${items.map(g => g === next ? html`<div class="next-wrap" data-next-game tabindex="-1"><span class="tag">Nächstes Spiel</span>${gameRow(g, now, {cls: 'next'})}</div>` : gameRow(g, now))}</div></section>`)}
    ${list.length ? '' : html`<section class="sec">${notice('Keine Spiele in diesem Wettbewerb.', 'cal')}</section>`}`;
}

// Siege, Unentschieden, Niederlagen als farbiger Balken unter dem Teamnamen.
function recordBar(rec) {
  if (!Array.isArray(rec) || rec.length !== 3 || rec.some(n => !Number.isFinite(n)) || !rec.some(n => n > 0)) return '';
  const [w, d, l] = rec;
  return html`<span class="wld" role="img" aria-label="${`${w} Siege, ${d} Unentschieden, ${l} Niederlagen`}"><i class="w" data-style="${'flex:' + w}"></i><i class="d" data-style="${'flex:' + d}"></i><i class="l" data-style="${'flex:' + l}"></i></span>`;
}

function tabellen({state, ui}) {
  const available = ['QHL', 'EHL'].filter(k => Array.isArray(state.data.tables?.[k]) && state.data.tables[k].length);
  const current = available.includes(ui.table) ? ui.table : available[0];
  if (!current) return html`<section class="sec">${notice('Keine Tabelle verfügbar.', 'saison')}</section>`;
  const rows = standings(state.data.tables[current]), records = state.data.teamRecords || {};
  return html`${available.length > 1 ? chips('table', available.map(k => [k, k === 'EHL' ? 'European League' : 'QHL']), current, 'Tabelle') : ''}
    <section class="sec" aria-labelledby="t-head"><h2 class="sr" id="t-head">Tabelle ${current}</h2>
      <div class="card list"><table class="tbl-real">
        <thead><tr><th scope="col" class="p">#</th><th scope="col">Team</th><th scope="col" class="n">Sp</th><th scope="col" class="n">Diff</th><th scope="col" class="n">Pkt</th></tr></thead>
        <tbody>${rows.map(r => {
          const rec = records[r.team], diff = r.goalsFor !== null && r.goalsAgainst !== null ? r.goalsFor - r.goalsAgainst : null;
          return html`<tr${r.team === OWN_TEAM ? html` class="me" aria-current="true"` : ''}><td class="p num">${r.rank}</td><td><span class="tteam">${crest(r.team, 'xs')}${shortTeam(r.team)}</span>${recordBar(rec)}</td><td class="n num">${r.played ?? '–'}</td><td class="n num">${diff === null ? '–' : (diff > 0 ? '+' : '') + diff}</td><td class="n num strong">${r.points ?? '–'}</td></tr>`;
        })}</tbody></table></div>
    </section>
    <section class="sec"><p class="note">${current === 'QHL' ? 'Sieg 2 Punkte, Unentschieden 1 Punkt. Während eines Kadetten-Spiels zeigt «Jetzt» die Live-Tabelle.' : 'Gruppenphase der EHF European League.'}</p></section>`;
}

function keeperTable({state, load, api, now}) {
  const games = ownGames(state.data.games).filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now);
  const keepers = SQUAD.filter(p => p.position === 'Tor');
  const ids = Object.fromEntries(keepers.map(k => [k.number, state.data.playerSeason?.players?.[k.number]?.shvPlayerId]).filter(([, id]) => id));
  let pending = 0, used = 0;
  const totals = Object.fromEntries(keepers.map(k => [k.number, {saves: 0, shots: 0, games: 0}]));
  for (const game of games) {
    const entry = loadReportFor(load, api, game);
    if (entry.status === 'loading') { pending++; continue; }
    const report = entry.status === 'ready' ? normalizeReport(entry.value.shv, null) : null;
    if (!report || !fitsGame(report, game)) continue;
    used++;
    for (const k of keepers) {
      const p = ids[k.number] ? playerInReport(report, [ids[k.number]]) : null;
      if (p && Number.isInteger(p.saves) && Number.isInteger(p.keeperShots) && p.keeperShots > 0) Object.assign(totals[k.number], {saves: totals[k.number].saves + p.saves, shots: totals[k.number].shots + p.keeperShots, games: totals[k.number].games + 1});
    }
  }
  const rows = keepers.map(k => ({...k, ...totals[k.number]})).filter(r => r.shots > 0).sort((a, b) => b.saves - a.saves);
  if (!rows.length) return pending ? loading(`Spielberichte werden geladen (${games.length - pending} von ${games.length}) …`) : notice('Für die Torhüter liegen noch keine Werte aus Spielberichten vor.', 'team');
  return html`<div class="card list"><table class="tbl-real">
    <thead><tr><th scope="col">Torhüter</th><th scope="col" class="n">Sp</th><th scope="col" class="n">Paraden</th><th scope="col" class="n">Quote</th></tr></thead>
    <tbody>${rows.map(r => html`<tr><td><a class="plink" href="${href.spieler(r.number)}"><span class="num muted">${r.number}</span> ${r.name}</a></td><td class="n num">${r.games}</td><td class="n num strong">${r.saves}<span class="muted">/${r.shots}</span></td><td class="n num">${fmtPct(pct(r.saves, r.shots))}</td></tr>`)}</tbody></table></div>
    <p class="fine pad-top">Summiert aus ${used} von ${games.length} QHL-Spielberichten${pending ? `, ${pending} werden noch geladen` : ''}. Quote = Paraden/Würfe aufs Tor.</p>`;
}

/** Würfe und Tore je Spieler aus den Spielberichten: nur Berichte, in denen beide Werte gemeldet sind.
 * reports: normalisierte Berichte; ids: {Rückennummer: Quellen-ID}. Liefert {Rückennummer: {goals, shots, games}}. */
export function shotTotals(reports, ids) {
  const totals = {};
  for (const report of reports) for (const [nr, id] of Object.entries(ids)) {
    const p = playerInReport(report, [id]);
    if (!p || p.keeper || !Number.isInteger(p.goals) || !Number.isInteger(p.shots) || p.shots < p.goals) continue;
    const t = totals[nr] ||= {goals: 0, shots: 0, games: 0};
    t.goals += p.goals; t.shots += p.shots; t.games++;
  }
  return totals;
}

/** Berichte aller bisherigen QHL-Spiele der Kadetten laden (je Spiel einmal, danach aus dem Zwischenspeicher). */
function shotData({state, load, api, now}) {
  const games = ownGames(state.data.games).filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now);
  const ids = Object.fromEntries(Object.entries(state.data.playerSeason?.players || {}).filter(([, p]) => p.shvPlayerId).map(([nr, p]) => [nr, p.shvPlayerId]));
  const reports = [];
  let pending = 0;
  for (const game of games) {
    const entry = loadReportFor(load, api, game);
    if (entry.status === 'loading') { pending++; continue; }
    const report = entry.status === 'ready' ? normalizeReport(entry.value.shv, null) : null;
    if (report && fitsGame(report, game)) reports.push(report);
  }
  return {totals: shotTotals(reports, ids), used: reports.length, total: games.length, pending};
}

function scorerTable(season, label, shots = null) {
  const players = Object.entries(season?.players || {}).map(([nr, v]) => ({nr: Number(nr), ...v, info: playerByNumber(nr)})).filter(p => Number.isInteger(p.goals) && p.info);
  if (!players.length) return notice('Für diese Saison liegen noch keine Spielerwerte vor.', 'saison');
  players.sort((a, b) => b.goals - a.goals || (a.games ?? 0) - (b.games ?? 0));
  const fav = favourite();
  const hasGames = players.some(p => Number.isInteger(p.games)), hasSeven = players.some(p => Number.isInteger(p.sevenMeterGoals));
  const showShots = Boolean(shots);
  const cells = p => { const t = shots?.totals[p.nr]; return t ? html`<td class="n num">${t.shots}</td><td class="n num">${fmtPct(pct(t.goals, t.shots))}</td>` : html`<td class="n num muted">${shots?.pending ? '…' : '–'}</td><td class="n num muted">${shots?.pending ? '…' : '–'}</td>`; };
  return html`<div class="card list"><table class="tbl-real">
    <thead><tr><th scope="col">Spieler</th>${hasGames ? html`<th scope="col" class="n">Sp</th>` : ''}<th scope="col" class="n">Tore</th>${showShots ? html`<th scope="col" class="n">Würfe</th><th scope="col" class="n">Quote</th>` : ''}${hasSeven ? html`<th scope="col" class="n">7-m</th>` : ''}<th scope="col" class="n">2′</th></tr></thead>
    <tbody>${players.map((p, i) => html`<tr${p.nr === fav ? html` class="fav-row"` : i === 0 ? html` class="me"` : ''}><td><a class="plink" href="${href.spieler(p.nr)}">${p.nr === fav ? html`<span class="star" role="img" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''}<span class="num muted">${p.nr}</span> ${p.info.name}</a></td>${hasGames ? html`<td class="n num">${p.games ?? '–'}</td>` : ''}<td class="n num strong">${p.goals}</td>${showShots ? cells(p) : ''}${hasSeven ? html`<td class="n num">${p.sevenMeterGoals ?? '–'}</td>` : ''}<td class="n num">${p.twoMinutes ?? '–'}</td></tr>`)}</tbody>
  </table></div><p class="fine pad-top">${players.reduce((n, p) => n + p.goals, 0)} Tore · ${label}</p>${shots ? html`<p class="fine">Würfe und Quote (Tore/Würfe) aus ${shots.used} von ${shots.total} QHL-Spielberichten${shots.pending ? `, ${shots.pending} werden noch geladen` : ''}. Gezählt werden nur Spiele, in denen der Bericht beide Werte meldet; – = nicht gemeldet.</p>` : ''}`;
}

function statistik(ctx) {
  const {state, ui} = ctx;
  const options = [['qhl', 'Torschützen QHL'], ...(state.data.ehlPlayerSeason?.players ? [['ehl', 'Torschützen EHL']] : []), ['tor', 'Torhüter']];
  const current = options.some(o => o[0] === ui.stat) ? ui.stat : 'qhl';
  const body = current === 'tor' ? keeperTable(ctx)
    : current === 'ehl' ? scorerTable(state.data.ehlPlayerSeason, 'European League · Quelle: EHF')
    : scorerTable(state.data.playerSeason, `QHL ${state.data.playerSeason?.season || ''} · Quelle: Schweizerischer Handball-Verband`, state.data.playerSeason?.players ? shotData(ctx) : null);
  return html`${chips('stat', options, current, 'Statistik')}<section class="sec tight">${body}</section>`;
}

export function renderSaison(ctx) {
  const {route, state} = ctx;
  const body = !state.data ? html`<section class="sec">${state.dataError ? notice('Der Datenstand konnte nicht geladen werden.') : loading()}</section>`
    : route.view === 'tabellen' ? tabellen(ctx) : route.view === 'statistik' ? statistik(ctx) : spielplan(ctx);
  return html`${topBar(route.view === 'spielplan' ? 'Spiele' : 'Tabelle')}${route.view === 'spielplan' ? '' : segment(TABS, route.view, 'Statistik')}${body}`;
}

