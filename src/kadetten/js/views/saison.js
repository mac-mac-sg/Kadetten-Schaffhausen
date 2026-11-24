// «Saison»: Spielplan & Resultate, Tabellen, Statistik.
import {html, raw, escapeHtml} from '../text.js';
import {href} from '../router.js';
import {
  OWN_TEAM,
  ownGames,
  kickoff,
  hasScore,
  shortTeam,
  standings,
  nextGame,
  zurichParts,
  competitionOf,
  pointsCurve,
  outcome
} from '../logic.js';
import {icon} from '../icons.js';
import {playoffSeries, seriesText} from '../playoffs.js';
import {SQUAD} from '../../data/squad.js';
import {favourite} from '../personal.js';
import {normalizeReport, fitsGame, playerInReport, pct, fmtPct} from '../report.js';
import {loadReportFor} from './bericht.js';
import {topBar, chips, sectionHead, notice, loading, gameRow, segment, crest, playerByNumber} from './parts.js';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TABS = [
  ['tabellen', 'Tabelle', '#/statistik'],
  ['statistik', 'Spielerwerte', '#/statistik/spieler']
];

/** Playoff-Serien der Kadetten über dem Spielplan (erscheint erst, wenn der Spielplan Playoff-Spiele enthält). */
export function playoffBlock(games, now) {
  const series = playoffSeries(games);
  if (!series.length) return '';
  return html`<section class="sec" aria-labelledby="s-po">${sectionHead('Playoffs', '', '', 's-po')}
    ${series.map(
      s => html`<div class="card po${s.state === 'open' ? '' : ' ' + s.state}">
        <div class="po-head">${crest(s.opponent, 'sm')}<span class="grow"><span class="t">${s.stage} · ${shortTeam(s.opponent)}</span><span class="s">${seriesText(s)}</span></span><b class="po-score num">${s.wins}:${s.losses}</b></div>
        <ol class="po-dots" aria-label="${`Best of ${s.bestOf}`}">${[...Array(s.bestOf).keys()].map(i => {
          const g = s.games[i],
            r = g && hasScore(g) ? {S: 'w', N: 'l', U: 'u'}[outcome(g)] || '' : '';
          return html`<li class="${r}"><span class="sr">Spiel ${i + 1}${r === 'w' ? ': Sieg' : r === 'l' ? ': Niederlage' : ': offen'}</span></li>`;
        })}</ol>
        ${s.next ? html`<div class="list">${gameRow(s.next, now)}</div>` : ''}
        <p class="fine">Best of ${s.bestOf}${s.assumed ? ' (angenommen, solange nicht alle Spiele angesetzt sind)' : ''}: ${s.target} Siege entscheiden die Serie.</p>
      </div>`
    )}</section>`;
}

function spielplan({state, now, ui}) {
  const games = ownGames(state.data.games);
  const present = ['QHL', 'EHL', 'Cup', 'Test'].filter(c => games.some(g => competitionOf(g) === c));
  const filter = present.includes(ui.comp) ? ui.comp : 'Alle';
  const list = games.filter(g => filter === 'Alle' || competitionOf(g) === filter);
  const next = nextGame(list, now);
  const months = new Map();
  for (const g of list) {
    const p = zurichParts(kickoff(g)),
      key = p.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(g);
  }
  return html`<div class="schedule-tools">
    ${chips('comp', [['Alle', 'Alle'], ...present.map(c => [c, c])], filter, 'Wettbewerb')}
    ${next ? html`<div class="sec tight"><button type="button" class="btn" data-jump-next>Zum nächsten Spiel</button></div>` : ''}
    </div>
    ${['Alle', 'QHL'].includes(filter) ? playoffBlock(state.data.games, now) : ''}
    ${[...months].map(
      ([key, items]) => html`<section class="sec" aria-labelledby="${'m-' + key}">
        ${sectionHead(`${MONTHS[+key.slice(5) - 1]} ${key.slice(0, 4)}`, '', '', 'm-' + key)}
      <div class="card list">
        ${items.map(g =>
          g === next
            ? html`<div class="next-wrap" data-next-game tabindex="-1">
        <span class="tag">Nächstes Spiel</span>${gameRow(g, now, {cls: 'next'})}</div>`
            : gameRow(g, now)
        )}</div>
        </section>`
    )}
    ${list.length ? '' : html`<section class="sec">${notice('Keine Spiele in diesem Wettbewerb.', 'cal')}</section>`}`;
}

// Siege, Unentschieden, Niederlagen als farbiger Balken unter dem Teamnamen.
function recordBar(rec) {
  if (!Array.isArray(rec) || rec.length !== 3 || rec.some(n => !Number.isFinite(n)) || !rec.some(n => n > 0)) return '';
  const [w, d, l] = rec;
  return html`<span class="wld" role="img" aria-label="${`${w} Siege, ${d} Unentschieden, ${l} Niederlagen`}"><i class="w" data-style="${'flex:' + w}"></i><i class="d" data-style="${'flex:' + d}"></i><i class="l" data-style="${'flex:' + l}"></i></span>`;
}

/** Saisonkurve: Punkte nach Runden gegen das Maximum, darunter der Rang je Runde (sobald der Datendienst ihn festhält). */
export function seasonCurve(data) {
  const curve = pointsCurve(data.games);
  if (curve.length < 2) return '';
  const W = 320,
    H = 120,
    n = curve.length,
    max = 2 * n;
  const x = i => ((i / n) * W).toFixed(1),
    y = p => (H - 6 - (p / max) * (H - 16)).toFixed(1);
  const path = 'M0 ' + y(0) + curve.map(c => ` L${x(c.round)} ${y(c.points)}`).join('');
  const last = curve.at(-1);
  const ranks = new Map((Array.isArray(data.rankHistory) ? data.rankHistory : []).map(e => [e.played, e.rank]));
  const own = standings(data.tables?.QHL).find(r => r.team === OWN_TEAM);
  if (own && own.played === n) ranks.set(n, own.rank);
  const known = curve.filter(c => ranks.has(c.round));
  const label = `Saisonkurve: ${last.points} von ${max} möglichen Punkten nach ${n} Runden.`;
  return html`<section class="sec" aria-labelledby="t-kurve">${sectionHead('Saisonkurve', '', '', 't-kurve')}
    <div class="card">
      <div class="chart-wrap">${raw(`<svg class="chart season" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)}" preserveAspectRatio="none">
        <line x1="0" y1="${y(0)}" x2="${W}" y2="${y(max)}" class="c-half"/>
        <path d="${path} L${W} ${y(0)} L0 ${y(0)} Z" class="c-up"/>
        <path d="${path}" class="c-line"/>
      </svg>`)}<div class="chart-axis"><span>Start</span><span>Punkte nach Runden · gestrichelt: Maximum</span><span>Runde ${n}</span></div></div>
      <div class="facts3">
        <span><b class="num">${last.points}</b><small>von ${max} Punkten</small></span>
        <span><b class="num">${String(Math.round((last.points / n) * 100) / 100).replace('.', ',')}</b><small>Punkte pro Spiel</small></span>
        <span><b class="num">${own ? own.rank + '.' : '–'}</b><small>Rang aktuell</small></span>
      </div>
      ${
        known.length > 1
          ? html`<p class="fine">Rang nach Runde: ${known.map(c => `${c.round}. Runde: ${ranks.get(c.round)}.`).join(' · ')}</p>`
          : html`<p class="fine">Der Rang je Runde wird ab jetzt festgehalten und erscheint hier nach den nächsten Spielen.</p>`
      }
    </div></section>`;
}

function tabellen({state, ui}) {
  const available = ['QHL', 'EHL'].filter(k => Array.isArray(state.data.tables?.[k]) && state.data.tables[k].length);
  const current = available.includes(ui.table) ? ui.table : available[0];
  if (!current) return html`<section class="sec">${notice('Keine Tabelle verfügbar.', 'saison')}</section>`;
  const rows = standings(state.data.tables[current]),
    records = state.data.teamRecords || {};
  return html`${
    available.length > 1
      ? chips(
          'table',
          available.map(k => [k, k === 'EHL' ? 'European League' : 'QHL']),
          current,
          'Tabelle'
        )
      : ''
  }
    <section class="sec" aria-labelledby="t-head"><h2 class="sr" id="t-head">Tabelle ${current}</h2>
      <div class="card list"><table class="tbl-real">
        <thead>
          <tr>
          <th scope="col" class="p">#</th>
            <th scope="col">Team</th>
            <th scope="col" class="n">Sp</th>
            <th scope="col" class="n">Diff</th>
            <th scope="col" class="n">Pkt</th>
            </tr>
          </thead>
        <tbody>${rows.map(r => {
          const rec = records[r.team],
            diff = r.goalsFor !== null && r.goalsAgainst !== null ? r.goalsFor - r.goalsAgainst : null;
          return html`<tr${r.team === OWN_TEAM ? html` class="me" aria-current="true"` : ''}><td class="p num">${r.rank}</td>
            <td><span class="tteam">${crest(r.team, 'xs')}${shortTeam(r.team)}</span>${recordBar(rec)}</td>
            <td class="n num">${r.played ?? '–'}</td>
            <td class="n num">${diff === null ? '–' : (diff > 0 ? '+' : '') + diff}</td>
            <td class="n num strong">${r.points ?? '–'}</td>
            </tr>`;
        })}</tbody></table></div>
    </section>
    ${current === 'QHL' ? seasonCurve(state.data) : ''}
    <section class="sec">
      <p class="note">${
        current === 'QHL'
          ? 'Sieg 2 Punkte, Unentschieden 1 Punkt. Während eines Kadetten-Spiels zeigt «News» die Live-Tabelle.'
          : 'Gruppenphase der EHF European League.'
      }</p>
      </section>`;
}

function keeperTable({state, load, api, now}) {
  const games = ownGames(state.data.games).filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now);
  const keepers = SQUAD.filter(p => p.position === 'Tor');
  const ids = Object.fromEntries(
    keepers.map(k => [k.number, state.data.playerSeason?.players?.[k.number]?.shvPlayerId]).filter(([, id]) => id)
  );
  let pending = 0;
  const totals = Object.fromEntries(keepers.map(k => [k.number, {saves: 0, shots: 0, games: 0}]));
  for (const game of games) {
    const entry = loadReportFor(load, api, game);
    if (entry.status === 'loading') {
      pending++;
      continue;
    }
    const report = entry.status === 'ready' ? normalizeReport(entry.value.shv, null) : null;
    if (!report || !fitsGame(report, game)) continue;
    for (const k of keepers) {
      const p = ids[k.number] ? playerInReport(report, [ids[k.number]]) : null;
      if (p && Number.isInteger(p.saves) && Number.isInteger(p.keeperShots) && p.keeperShots > 0)
        Object.assign(totals[k.number], {
          saves: totals[k.number].saves + p.saves,
          shots: totals[k.number].shots + p.keeperShots,
          games: totals[k.number].games + 1
        });
    }
  }
  const rows = keepers
    .map(k => ({...k, ...totals[k.number]}))
    .filter(r => r.shots > 0)
    .sort((a, b) => b.saves - a.saves);
  if (!rows.length)
    return pending
      ? loading(`Spielberichte werden geladen (${games.length - pending} von ${games.length}) …`)
      : notice('Für die Torhüter liegen noch keine Werte aus Spielberichten vor.', 'team');
  return html`<div class="card list"><table class="tbl-real">
    <thead>
      <tr>
      <th scope="col">Torhüter</th>
        <th scope="col" class="n">Sp</th>
        <th scope="col" class="n">Paraden</th>
        <th scope="col" class="n">Quote</th>
        </tr>
      </thead>
    <tbody>
      ${rows.map(
        r => html`<tr>
      <td><a class="plink" href="${href.spieler(r.number)}"><span class="num muted">${r.number}</span> ${r.name}</a></td>
        <td class="n num">${r.games}</td>
        <td class="n num strong">${r.saves}<span class="muted">/${r.shots}</span></td>
        <td class="n num">${fmtPct(pct(r.saves, r.shots))}</td>
        </tr>`
      )}</tbody>
      </table>
      </div>`;
}

/** Würfe und Tore je Spieler aus den Spielberichten: nur Berichte, in denen beide Werte gemeldet sind.
 * reports: normalisierte Berichte; ids: {Rückennummer: Quellen-ID}. Liefert {Rückennummer: {goals, shots, games}}. */
export function shotTotals(reports, ids) {
  const totals = {};
  for (const report of reports)
    for (const [nr, id] of Object.entries(ids)) {
      const p = playerInReport(report, [id]);
      if (!p || p.keeper || !Number.isInteger(p.goals) || !Number.isInteger(p.shots) || p.shots < p.goals) continue;
      const t = (totals[nr] ||= {goals: 0, shots: 0, games: 0});
      t.goals += p.goals;
      t.shots += p.shots;
      t.games++;
    }
  return totals;
}

/** Berichte aller bisherigen QHL-Spiele der Kadetten laden (je Spiel einmal, danach aus dem Zwischenspeicher). */
function shotData({state, load, api, now}) {
  const games = ownGames(state.data.games).filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now);
  const ids = Object.fromEntries(
    Object.entries(state.data.playerSeason?.players || {})
      .filter(([, p]) => p.shvPlayerId)
      .map(([nr, p]) => [nr, p.shvPlayerId])
  );
  const reports = [];
  let pending = 0;
  for (const game of games) {
    const entry = loadReportFor(load, api, game);
    if (entry.status === 'loading') {
      pending++;
      continue;
    }
    const report = entry.status === 'ready' ? normalizeReport(entry.value.shv, null) : null;
    if (report && fitsGame(report, game)) reports.push(report);
  }
  return {totals: shotTotals(reports, ids), used: reports.length, total: games.length, pending};
}

function scorerTable(season, label, shots = null) {
  const players = Object.entries(season?.players || {})
    .map(([nr, v]) => ({nr: Number(nr), ...v, info: playerByNumber(nr)}))
    .filter(p => Number.isInteger(p.goals) && p.info);
  if (!players.length) return notice('Für diese Saison liegen noch keine Spielerwerte vor.', 'saison');
  players.sort((a, b) => b.goals - a.goals || (a.games ?? 0) - (b.games ?? 0));
  const fav = favourite();
  const hasGames = players.some(p => Number.isInteger(p.games)),
    hasSeven = players.some(p => Number.isInteger(p.sevenMeterGoals));
  const showShots = Boolean(shots);
  const cells = p => {
    const t = shots?.totals[p.nr];
    return t
      ? html`<td class="n num">${t.shots}</td><td class="n num">${fmtPct(pct(t.goals, t.shots))}</td>`
      : html`<td class="n num muted">${shots?.pending ? '…' : '–'}</td><td class="n num muted">${shots?.pending ? '…' : '–'}</td>`;
  };
  return html`<div class="card list"><table class="tbl-real">
    <thead>
      <tr>
      <th scope="col">Spieler</th>
        ${hasGames ? html`<th scope="col" class="n">Sp</th>` : ''}<th scope="col" class="n">Tore</th>
        ${
          showShots
            ? html`<th scope="col" class="n">Würfe</th>
        <th scope="col" class="n">Quote</th>`
            : ''
        }${hasSeven ? html`<th scope="col" class="n">7-m</th>` : ''}<th scope="col" class="n">2′</th>
        </tr>
      </thead>
    <tbody>
      ${players.map(
        (p, i) => html`<tr${
          p.nr === fav ? html` class="fav-row"` : i === 0 ? html` class="me"` : ''
        }><td><a class="plink" href="${href.spieler(p.nr)}">${
          p.nr === fav ? html`<span class="star" role="img" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''
        }<span class="num muted">${p.nr}</span> ${p.info.name}</a></td>
        ${hasGames ? html`<td class="n num">${p.games ?? '–'}</td>` : ''}<td class="n num strong">${p.goals}</td>
        ${showShots ? cells(p) : ''}${hasSeven ? html`<td class="n num">${p.sevenMeterGoals ?? '–'}</td>` : ''}<td class="n num">${p.twoMinutes ?? '–'}</td>
        </tr>`
      )}</tbody>
  </table></div>`;
}

function statistik(ctx) {
  const {state, ui} = ctx;
  const options = [
    ['qhl', 'Torschützen QHL'],
    ...(state.data.ehlPlayerSeason?.players ? [['ehl', 'Torschützen EHL']] : []),
    ['tor', 'Torhüter']
  ];
  const current = options.some(o => o[0] === ui.stat) ? ui.stat : 'qhl';
  const body =
    current === 'tor'
      ? keeperTable(ctx)
      : current === 'ehl'
        ? scorerTable(state.data.ehlPlayerSeason, 'European League · Quelle: EHF')
        : scorerTable(
            state.data.playerSeason,
            `QHL ${state.data.playerSeason?.season || ''} · Quelle: Schweizerischer Handball-Verband`,
            state.data.playerSeason?.players ? shotData(ctx) : null
          );
  return html`${chips('stat', options, current, 'Statistik')}<section class="sec tight">${body}</section>`;
}

export function renderSaison(ctx) {
  const {route, state} = ctx;
  const body = !state.data
    ? html`<section class="sec">${state.dataError ? notice('Der Datenstand konnte nicht geladen werden.') : loading()}</section>`
    : route.view === 'tabellen'
      ? tabellen(ctx)
      : route.view === 'statistik'
        ? statistik(ctx)
        : spielplan(ctx);
  return html`${topBar(route.view === 'spielplan' ? 'Spiele' : 'Tabelle')}${route.view === 'spielplan' ? '' : segment(TABS, route.view, 'Statistik')}${body}`;
}
