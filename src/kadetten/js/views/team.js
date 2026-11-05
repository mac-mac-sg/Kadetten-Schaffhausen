// «Team»: Kader nach Position und Spielerprofile mit Saisonwerten.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {SQUAD} from '../../data/squad.js';
import {favourite} from '../personal.js';
import {topBar, backBar, sectionHead, notice, loading, stats, listRow, playerPhoto} from './parts.js';
import {OWN_TEAM, ownGames, hasScore, kickoff, shortTeam, dayLabel} from '../logic.js';
import {normalizeReport, fitsGame, playerInReport, pct, fmtPct} from '../report.js';
import {loadReportFor, ruleButton} from './bericht.js';

const GROUPS = [['Tor', p => p.position === 'Tor'], ['Rückraum', p => /^Rückraum/.test(p.position)], ['Flügel', p => /^Flügel/.test(p.position)], ['Kreis', p => p.position === 'Kreis']];
const POSITION = pos => pos.replace(/^Rückraum mitte$/i, 'Rückraum Mitte').replace(/^Rückraum links$/i, 'Rückraum links');

function card(p, fav) {
  return html`<a class="pc" href="${href.spieler(p.number)}">
    <span class="ph"><img src="${playerPhoto(p.number)}" alt="" loading="lazy" decoding="async" width="160" height="200">${fav === p.number ? html`<span class="fav" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''}</span>
    <span class="nm">${p.name.split(' ').slice(-1)[0]}<small>${p.name.split(' ').slice(0, -1).join(' ')} · <span class="num">#${p.number}</span></small></span></a>`;
}

export function renderTeam() {
  const fav = favourite();
  return html`${topBar('Team')}
    ${GROUPS.map(([label, test], i) => {
      const list = SQUAD.filter(test).sort((a, b) => a.number - b.number);
      return list.length ? html`<section class="sec" aria-labelledby="${'team-' + i}">${sectionHead(label, '', '', 'team-' + i)}<div class="pgrid">${list.map(p => card(p, fav))}</div></section>` : '';
    })}
    <section class="sec"><p class="note">Kader 2026/27. Spielerfotos: kadettensh.ch.</p></section>`;
}

/** Werte eines Spielers in den letzten QHL-Spielen aus den Spielberichten (fehlende Berichte zählen nicht). */
export function recentForm({games, number, data, load, api, now, count = 5}) {
  const shvId = data?.playerSeason?.players?.[number]?.shvPlayerId;
  const played = ownGames(games).filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now).reverse().slice(0, count);
  if (!shvId || !played.length) return {rows: [], pending: false, played: played.length};
  let pending = false;
  const rows = played.map(game => {
    const entry = loadReportFor(load, api, game);
    if (entry.status === 'loading') pending = true;
    const report = entry.status === 'ready' ? normalizeReport(entry.value.shv, null) : null;
    const value = report && fitsGame(report, game) ? playerInReport(report, [shvId]) : null;
    return {game, value};
  });
  return {rows, pending, played: played.length};
}

function formSection({form, keeper, now}) {
  const valid = form.rows.filter(r => r.value && (keeper ? Number.isInteger(r.value.keeperShots) : Number.isInteger(r.value.shots)));
  if (!form.rows.length) return '';
  if (!valid.length) return html`<section class="sec">${form.pending ? loading('Werte der letzten Spiele werden geladen …') : ''}</section>`;
  const num = keeper ? 'saves' : 'goals', den = keeper ? 'keeperShots' : 'shots';
  const a = valid.reduce((n, r) => n + (r.value[num] || 0), 0), b = valid.reduce((n, r) => n + (r.value[den] || 0), 0);
  const max = Math.max(1, ...valid.map(r => r.value[den] || 0));
  return html`<section class="sec" aria-labelledby="sp-form">${sectionHead(keeper ? 'Fangquote · letzte QHL-Spiele' : 'Abschluss · letzte QHL-Spiele', '', '', 'sp-form')}
    ${stats([[fmtPct(pct(a, b)), keeper ? 'Fangquote' : 'Trefferquote'], [a, keeper ? 'Paraden' : 'Tore'], [b, keeper ? 'Würfe aufs Tor' : 'Würfe']])}
    <div class="card list pad-top-s">${form.rows.map(({game, value}) => {
      const opp = shortTeam(game.home === OWN_TEAM ? game.away : game.home);
      const ok = value && Number.isInteger(value[den]);
      return listRow({title: opp, sub: dayLabel(game, now), link: href.spiel(game.id, 'bericht'), cls: 'compact',
        end: ok ? html`<span class="mini"><i aria-hidden="true"><b data-style="${'width:' + Math.round((value[den] || 0) / max * 100) + '%'}"></b><u data-style="${'width:' + Math.round((value[num] || 0) / max * 100) + '%'}"></u></i><span class="res num">${value[num] ?? 0}<small>/${value[den]}</small></span></span>` : html`<span class="muted">–</span>`});
    })}</div>
    <p class="fine pad-top">Aus ${valid.length} von ${form.played} Spielberichten. ${keeper ? 'Paraden/Würfe aufs Tor.' : 'Tore/Würfe.'}</p></section>`;
}

export function renderSpieler({route, state, load, api, now}) {
  const p = SQUAD.find(x => String(x.number) === route.id);
  if (!p) return html`${backBar('Team', href.team())}<h1 class="h1 pad">Spieler</h1><section class="sec">${notice('Diesen Spieler gibt es im aktuellen Kader nicht.', 'team')}</section>`;
  const season = state.data?.playerSeason?.players?.[p.number];
  const ehl = state.data?.ehlPlayerSeason?.players?.[p.number];
  const keeper = p.position === 'Tor';
  const isFav = favourite() === p.number;
  const star = html`<button class="icb${isFav ? ' on' : ''}" type="button" data-favourite="${p.number}" aria-pressed="${String(isFav)}" aria-label="${isFav ? 'Nicht mehr Lieblingsspieler' : 'Als Lieblingsspieler merken'}">${icon('star', 20)}</button>`;
  const form = state.data ? recentForm({games: state.data.games, number: p.number, data: state.data, load, api, now}) : {rows: []};
  const known = season && Number.isInteger(season.fieldGoals) && Number.isInteger(season.sevenMeterGoals) && season.goals > 0;
  return html`${backBar('Team', href.team(), star)}
    <section class="sec first"><div class="big-hero player"><img src="${playerPhoto(p.number)}" alt="" width="400" height="500" decoding="async"><span class="pill num">#${p.number}</span><div class="bh-text"><h1 class="h1">${p.name}</h1><p>${POSITION(p.position)}</p></div></div></section>
    <section class="sec" aria-labelledby="sp-saison">${sectionHead('Saison 2026/27 · QHL', '', '', 'sp-saison')}
      ${season ? stats(keeper ? [[season.games, 'Spiele'], [season.goals, 'Tore']] : [[season.games, 'Spiele'], [season.goals, 'Tore'], [season.goalsPerGame != null ? String(season.goalsPerGame).replace('.', ',') : '–', 'Tore pro Spiel']]) : notice('Noch keine Saisonwerte vorhanden.', 'saison')}
      ${known ? html`<div class="card pad-top-s"><div class="split" role="img" aria-label="${`${season.fieldGoals} Feldtore, ${season.sevenMeterGoals} 7-m-Tore`}"><i data-style="${'flex:' + season.fieldGoals}"></i><i data-style="${'flex:' + season.sevenMeterGoals}"></i></div><ul class="legend"><li><i class="st-g"></i>Feldtore <b class="num">${season.fieldGoals}</b></li><li><i class="st-s"></i>7-m-Tore <b class="num">${season.sevenMeterGoals}</b></li></ul></div>` : ''}
      ${season ? html`<div class="card list pad-top-s">
        ${listRow({title: html`Verwarnungen ${ruleButton('gelb')}`, end: html`<span class="res num">${season.yellowCards ?? '–'}</span>`, cls: 'compact'})}
        ${listRow({title: html`Zeitstrafen ${ruleButton('2min')}`, end: html`<span class="res num">${season.twoMinutes ?? '–'}</span>`, cls: 'compact'})}
        ${listRow({title: html`Disqualifikationen ${ruleButton('rot')}`, end: html`<span class="res num">${season.disqualifications ?? '–'}</span>`, cls: 'compact'})}
      </div><p class="fine pad-top">Quelle: Schweizerischer Handball-Verband. – = nicht gemeldet.</p>` : ''}
    </section>
    ${formSection({form, keeper, now})}
    ${ehl ? html`<section class="sec" aria-labelledby="sp-ehl">${sectionHead('European League', '', '', 'sp-ehl')}${stats([[ehl.goals, 'Tore'], [ehl.twoMinutes, 'Zeitstrafen'], [ehl.yellowCards, 'Verwarnungen']])}<p class="fine pad-top">Quelle: EHF. Würfe und Einsätze liefert die EHF für diese Saison nicht verlässlich.</p></section>` : ''}
    ${p.facts.length ? html`<section class="sec" aria-labelledby="sp-steck">${sectionHead('Steckbrief', '', '', 'sp-steck')}<dl class="card list facts">${p.facts.map(([k, v]) => html`<div class="rl"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl></section>` : ''}
    ${p.url ? html`<section class="sec"><div class="card list">${listRow({title: 'Profil auf kadettensh.ch', end: icon('ext', 18), link: p.url})}</div></section>` : ''}`;
}
