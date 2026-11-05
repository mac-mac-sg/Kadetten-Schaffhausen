// «Saison»: Spielplan & Resultate, Tabellen, Statistik.
import {html} from '../text.js';
import {href} from '../router.js';
import {OWN_TEAM, ownGames, kickoff, shortTeam, standings, nextGame, zurichParts} from '../logic.js';
import {topBar, sectionHead, notice, loading, gameRow, segment, crest, playerByNumber} from './parts.js';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const TABS = [['spielplan', 'Spielplan', href.saison('spielplan')], ['tabellen', 'Tabellen', href.saison('tabellen')], ['statistik', 'Statistik', href.saison('statistik')]];

function chips(name, options, current, label) {
  return html`<div class="chips" role="group" aria-label="${label}">${options.map(([value, text]) => html`<button type="button" class="chip${value === current ? ' on' : ''}" data-ui="${name}:${value}" aria-pressed="${String(value === current)}">${text}</button>`)}</div>`;
}

const competitionOf = g => /cup/i.test(g.league || '') ? 'Cup' : ['QHL', 'EHL'].includes(g.league) ? g.league : 'Test';

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
      <div class="card list">${items.map(g => g === next ? html`<div class="next-wrap"><span class="tag">Nächstes Spiel</span>${gameRow(g, now, {cls: 'next'})}</div>` : gameRow(g, now))}</div></section>`)}
    ${list.length ? '' : html`<section class="sec">${notice('Keine Spiele in diesem Wettbewerb.', 'cal')}</section>`}`;
}

function tabellen({state, ui}) {
  const available = ['QHL', 'EHL'].filter(k => Array.isArray(state.data.tables?.[k]) && state.data.tables[k].length);
  const current = available.includes(ui.table) ? ui.table : available[0];
  if (!current) return html`<section class="sec">${notice('Keine Tabelle verfügbar.', 'saison')}</section>`;
  const rows = standings(state.data.tables[current]), records = state.data.teamRecords || {};
  return html`${available.length > 1 ? chips('table', available.map(k => [k, k === 'EHL' ? 'European League' : 'QHL']), current, 'Tabelle') : ''}
    <section class="sec" aria-labelledby="t-head"><h2 class="sr" id="t-head">Tabelle ${current}</h2>
      <div class="card list"><table class="tbl-real">
        <thead><tr><th scope="col" class="p">#</th><th scope="col">Team</th><th scope="col" class="n">Sp</th>${current === 'QHL' ? html`<th scope="col" class="n wide-only">S-U-N</th>` : ''}<th scope="col" class="n">Diff</th><th scope="col" class="n">Pkt</th></tr></thead>
        <tbody>${rows.map(r => {
          const rec = records[r.team], diff = r.goalsFor !== null && r.goalsAgainst !== null ? r.goalsFor - r.goalsAgainst : null;
          return html`<tr${r.team === OWN_TEAM ? html` class="me" aria-current="true"` : ''}><td class="p num">${r.rank}</td><td><span class="tteam">${crest(r.team, 'xs')}${shortTeam(r.team)}</span></td><td class="n num">${r.played ?? '–'}</td>${current === 'QHL' ? html`<td class="n num wide-only">${Array.isArray(rec) ? rec.join('-') : '–'}</td>` : ''}<td class="n num">${diff === null ? '–' : (diff > 0 ? '+' : '') + diff}</td><td class="n num strong">${r.points ?? '–'}</td></tr>`;
        })}</tbody></table></div>
    </section>
    <section class="sec"><p class="note">${current === 'QHL' ? 'Sieg 2 Punkte, Unentschieden 1 Punkt. Während eines Kadetten-Spiels zeigt «Jetzt» die Live-Tabelle.' : 'Gruppenphase der EHF European League.'}</p></section>`;
}

function statistik({state}) {
  const season = state.data.playerSeason;
  const players = Object.entries(season?.players || {}).map(([nr, v]) => ({nr: Number(nr), ...v, info: playerByNumber(nr)})).filter(p => Number.isInteger(p.goals));
  if (!players.length) return html`<section class="sec">${notice('Für diese Saison liegen noch keine Spielerwerte vor.', 'saison')}</section>`;
  players.sort((a, b) => b.goals - a.goals || (a.games ?? 0) - (b.games ?? 0));
  const total = players.reduce((n, p) => n + p.goals, 0);
  const top = players[0];
  return html`
    <section class="sec" aria-labelledby="s-top">${sectionHead('Torschützen QHL', '', '', 's-top')}
      <div class="card list"><table class="tbl-real">
        <thead><tr><th scope="col">Spieler</th><th scope="col" class="n">Sp</th><th scope="col" class="n">Tore</th><th scope="col" class="n">7-m</th><th scope="col" class="n wide-only">2′</th></tr></thead>
        <tbody>${players.map(p => html`<tr${p === top ? html` class="me"` : ''}><td><a class="plink" href="${href.spieler(p.nr)}"><span class="num muted">${p.nr}</span> ${p.info?.name || 'Nr. ' + p.nr}</a></td><td class="n num">${p.games ?? '–'}</td><td class="n num strong">${p.goals}</td><td class="n num">${p.sevenMeterGoals ?? '–'}</td><td class="n num wide-only">${p.twoMinutes ?? '–'}</td></tr>`)}</tbody>
      </table></div>
      <p class="fine pad-top">${total} Tore in ${season.teamGames ?? '–'} Spielen · Saison ${season.season || ''} · Quelle: Schweizerischer Handball-Verband</p>
    </section>`;
}

export function renderSaison(ctx) {
  const {route, state} = ctx;
  const body = !state.data ? html`<section class="sec">${state.dataError ? notice('Der Datenstand konnte nicht geladen werden.') : loading()}</section>`
    : route.view === 'tabellen' ? tabellen(ctx) : route.view === 'statistik' ? statistik(ctx) : spielplan(ctx);
  return html`${topBar('Saison')}${segment(TABS, route.view, 'Saison')}${body}`;
}

