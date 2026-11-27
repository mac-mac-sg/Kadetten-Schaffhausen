// «Team»: Kader nach Position und Spielerprofile mit Saisonwerten.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {SQUAD} from '../../data/squad.js';
import {STAFF, staffPhoto} from '../../data/staff.js';
import {favourite} from '../personal.js';
import {topBar, clubLink, chips, backBar, sectionHead, notice, loading, kpis, listRow, playerPhoto} from './parts.js';
import {OWN_TEAM, ownGames, hasScore, kickoff, shortTeam, dayLabel} from '../logic.js';
import {normalizeReport, fitsGame, playerInReport, pct, fmtPct} from '../report.js';
import {loadReportFor, ruleButton} from './bericht.js';
import {positionArticleId} from '../wissen/positionen.js';
import {SEASON} from '../season.js';

const GROUPS = [
  ['Tor', p => p.position === 'Tor'],
  ['Rückraum', p => /^Rückraum/.test(p.position)],
  ['Flügel', p => /^Flügel/.test(p.position)],
  ['Kreis', p => p.position === 'Kreis']
];
const POSITION = pos => pos.replace(/^Rückraum mitte$/i, 'Rückraum Mitte').replace(/^Rückraum links$/i, 'Rückraum links');

function card(p, fav) {
  const parts = p.name.split(' ');
  return html`<a class="pc" href="${href.spieler(p.number)}">
    <span class="ph"><img src="${playerPhoto(p.number)}" alt="" loading="lazy" decoding="async" width="300" height="200">${
      fav === p.number ? html`<span class="fav" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''
    }</span>
    <span class="pb"><span class="no num" aria-hidden="true">${p.number}</span><span class="nm"><small>${parts.slice(0, -1).join(' ')}</small>${parts.slice(-1)[0]}<small><span class="sr">Nummer ${p.number}, </span>${POSITION(p.position)}</small></span></span></a>`;
}

const FILTERS = [['Alle', 'Alle', () => true], ...GROUPS.map(([label, test]) => [label, label, test])];
/** Eigener Filter «Staff»: nur das Betreuerteam. Bei «Alle» folgt es nach den Spielern, bei einer Position fehlt es. */
const STAFF_FILTER = 'Staff';

function staffCard(m) {
  const parts = m.name.split(' ');
  return html`<div class="pc staff">
    <span class="ph"><img src="${staffPhoto(m.id)}" alt="" loading="lazy" decoding="async" width="300" height="200"></span>
    <span class="pb"><span class="nm"><small>${parts.slice(0, -1).join(' ')}</small>${parts.slice(-1)[0]}<small>${m.role}</small></span></span></div>`;
}

export function renderTeam({ui = {}} = {}) {
  const fav = favourite();
  const current = FILTERS.some(f => f[0] === ui.pos) || ui.pos === STAFF_FILTER ? ui.pos : 'Alle';
  const showPlayers = current !== STAFF_FILTER,
    showStaff = current === 'Alle' || current === STAFF_FILTER;
  const list = showPlayers ? SQUAD.filter(FILTERS.find(f => f[0] === current)[2]).sort((a, b) => a.number - b.number) : [];
  return html`${topBar('Kader', `Saison ${SEASON}`, clubLink)}
    ${chips('pos', [...FILTERS.map(([id, label]) => [id, label]), [STAFF_FILTER, STAFF_FILTER]], current, 'Position')}
    <section class="sec" aria-label="${showPlayers ? 'Spieler und Staff' : 'Staff'}"><div class="pgrid">${list.map(p => card(p, fav))}${
      showStaff ? STAFF.map(staffCard) : ''
    }</div></section>
    <section class="sec"><p class="note">Kader ${SEASON}. Fotos: kadettensh.ch.</p></section>`;
}

/** Werte eines Spielers in den letzten QHL-Spielen aus den Spielberichten (fehlende Berichte zählen nicht). */
export function recentForm({games, number, data, load, api, now, count = 5}) {
  const shvId = data?.playerSeason?.players?.[number]?.shvPlayerId;
  const played = ownGames(games)
    .filter(g => g.league === 'QHL' && hasScore(g) && kickoff(g) <= now)
    .reverse()
    .slice(0, count);
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

const r1 = n => Math.round(n * 10) / 10;

/** Kurzname für die Spiel-Chips: erstes Wort mit mehr als drei Zeichen («St. Otmar» → «Otmar»). */
const chipName = name => {
  const words = name.split(/[\s-]+/);
  return (words.find(w => w.length > 3) || words[0]).slice(0, 8);
};

/** Glatte Linie durch die Punkte (Catmull-Rom als kubische Bézier-Kurven). */
export function smoothPath(points) {
  if (!points.length) return '';
  const p = i => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M${r1(points[0][0])} ${r1(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d += ` C${r1(b[0] + (c[0] - a[0]) / 6)} ${r1(b[1] + (c[1] - a[1]) / 6)} ${r1(c[0] - (e[0] - b[0]) / 6)} ${r1(c[1] - (e[1] - b[1]) / 6)} ${r1(c[0])} ${r1(c[1])}`;
  }
  return d;
}

/**
 * Formkurve der letzten Spiele (Tore bzw. Paraden je Spiel), darunter die Spiele zum Antippen.
 * Das gewählte Spiel (ui.formGame, sonst das jüngste mit Wert) ist markiert und steht ausgeschrieben darunter.
 */
export function formCurve({rows, num, den, keeper, sel, now}) {
  const W = 320,
    TOP = 16,
    BASE = 84;
  const list = [...rows].reverse();
  const ok = r => Boolean(r.value && Number.isInteger(r.value[den]));
  const opp = g => shortTeam(g.home === OWN_TEAM ? g.away : g.home);
  const x = i => (list.length > 1 ? 18 + (i * (W - 36)) / (list.length - 1) : W / 2);
  const max = Math.max(1, ...list.filter(ok).map(r => r.value[num] || 0));
  const y = v => BASE - ((v || 0) / max) * (BASE - TOP);
  const pts = list.map((r, i) => (ok(r) ? {r, x: x(i), y: y(r.value[num])} : null)).filter(Boolean);
  if (!pts.length) return '';
  const cur = pts.find(p => String(p.r.game.id) === String(sel)) || pts[pts.length - 1];
  const unit = keeper ? ['Parade', 'Paraden'] : ['Tor', 'Tore'];
  const word = n => (n === 1 ? unit[0] : unit[1]);
  const label = `${keeper ? 'Paraden' : 'Tore'} je Spiel: ` + pts.map(p => `${opp(p.r.game)} ${p.r.value[num] ?? 0}`).join(', ');
  const v = cur.r.value;
  return html`<div class="card fc">
    <svg class="fc-svg" viewBox="${`0 0 ${W} 100`}" role="img" aria-label="${label}">
      <line class="fc-base" x1="0" x2="${W}" y1="${BASE}" y2="${BASE}"></line>
      ${pts.length > 1 ? html`<path class="fc-line" d="${smoothPath(pts.map(p => [p.x, p.y]))}"></path>` : ''}
      ${pts.map(p => html`<circle class="fc-pt" cx="${r1(p.x)}" cy="${r1(p.y)}" r="3"></circle>`)}
      <line class="fc-mark" x1="${r1(cur.x)}" x2="${r1(cur.x)}" y1="${r1(cur.y)}" y2="${BASE}"></line>
      <circle class="fc-sel" cx="${r1(cur.x)}" cy="${r1(cur.y)}" r="7"></circle>
    </svg>
    <div class="fc-games" role="group" aria-label="Spiel wählen">${list.map(r => {
      const on = r === cur.r;
      const name = opp(r.game);
      return html`<button type="button" class="${on ? 'on' : ''}" data-ui="${'formGame:' + r.game.id}" aria-pressed="${String(on)}" aria-label="${`${name}, ${dayLabel(r.game, now)}`}"${
        ok(r) ? '' : html` disabled`
      }>${chipName(name)}</button>`;
    })}</div>
    <p class="fc-d"><b class="num">${v[num] ?? 0}</b> ${word(v[num] ?? 0)} gegen ${opp(cur.r.game)} · ${v[num] ?? 0} von ${v[den]} ${
      keeper ? 'Würfen aufs Tor' : 'Würfen'
    } <a href="${href.spiel(cur.r.game.id, 'bericht')}">Spielbericht</a></p>
  </div>`;
}

function formSection({form, keeper, now, sel}) {
  const valid = form.rows.filter(r => r.value && (keeper ? Number.isInteger(r.value.keeperShots) : Number.isInteger(r.value.shots)));
  if (!form.rows.length)
    return keeper
      ? html`<section class="sec" aria-labelledby="sp-form">
        ${sectionHead('Fangquote · letzte QHL-Spiele', '', '', 'sp-form')}${notice(
          'Für diesen Torhüter liegen noch keine zuordenbaren Spielberichte vor. Paraden und Fangquote sind deshalb nicht verfügbar.',
          'team'
        )}</section>`
      : '';
  if (!valid.length)
    return html`<section class="sec">
      ${
        form.pending
          ? loading('Werte der letzten Spiele werden geladen …')
          : notice('Für die letzten QHL-Spiele fehlen verwertbare Spielberichte. Fang- und Wurfquoten werden nicht geschätzt.', 'team')
      }</section>`;
  const num = keeper ? 'saves' : 'goals',
    den = keeper ? 'keeperShots' : 'shots';
  const a = valid.reduce((n, r) => n + (r.value[num] || 0), 0),
    b = valid.reduce((n, r) => n + (r.value[den] || 0), 0);
  return html`<section class="sec" aria-labelledby="sp-form">
    ${sectionHead(keeper ? 'Fangquote · letzte QHL-Spiele' : 'Abschluss · letzte QHL-Spiele', '', '', 'sp-form')}
    ${kpis([
      [fmtPct(pct(a, b)), keeper ? 'Fangquote' : 'Trefferquote'],
      [a, keeper ? 'Paraden' : 'Tore'],
      [b, keeper ? 'Würfe aufs Tor' : 'Würfe']
    ])}
    ${formCurve({rows: form.rows, num, den, keeper, sel, now})}
    <p class="fine pad-top">Aus ${valid.length} von ${form.played} Spielberichten. ${keeper ? 'Paraden/Würfe aufs Tor.' : 'Tore/Würfe.'}</p>
      </section>`;
}

export function renderSpieler({route, state, load, api, now, ui = {}}) {
  const p = SQUAD.find(x => String(x.number) === route.id);
  if (!p)
    return html`${backBar('Kader', href.team())}<h1 class="h1 pad">Spieler</h1>
      <section class="sec">
      ${notice('Diesen Spieler gibt es im aktuellen Kader nicht.', 'team')}</section>`;
  const season = state.data?.playerSeason?.players?.[p.number];
  const ehl = state.data?.ehlPlayerSeason?.players?.[p.number];
  const keeper = p.position === 'Tor';
  const isFav = favourite() === p.number;
  const star = html`<button class="icb${isFav ? ' on' : ''}" type="button" data-favourite="${p.number}" aria-pressed="${String(isFav)}" aria-label="${
    isFav ? 'Nicht mehr Lieblingsspieler' : 'Als Lieblingsspieler merken'
  }">${icon('star')}</button>`;
  const form = state.data ? recentForm({games: state.data.games, number: p.number, data: state.data, load, api, now}) : {rows: []};
  const known = season && Number.isInteger(season.fieldGoals) && Number.isInteger(season.sevenMeterGoals) && season.goals > 0;
  return html`${backBar('Kader', href.team(), star)}
    <section class="sec first">
      <div class="big-hero player">
      <img src="${playerPhoto(p.number)}" alt="" width="400" height="500" decoding="async"><span class="no num" aria-hidden="true">${p.number}</span></div>
      <div class="pl-head">
        <h1 class="h1">${p.name}</h1>
        <p>${POSITION(p.position)} · <span class="num">#${p.number}</span></p>
        </div>
        </section>
    ${keeper ? formSection({form, keeper, now, sel: ui.formGame}) : ''}
    <section class="sec" aria-labelledby="sp-saison">${sectionHead(`Saison ${SEASON} · QHL`, '', '', 'sp-saison')}
      ${
        season
          ? kpis(
              keeper
                ? [[season.games, 'Spiele']]
                : [
                    [season.goals, 'Tore', known && season.sevenMeterGoals > 0 ? `davon ${season.sevenMeterGoals} vom 7-m-Punkt` : ''],
                    [season.games, 'Spiele'],
                    [season.goalsPerGame != null ? String(season.goalsPerGame).replace('.', ',') : '–', 'Tore pro Spiel']
                  ]
            )
          : notice('Noch keine Saisonwerte vorhanden.', 'saison')
      }
      ${
        known
          ? html`<div class="card pad-top-s">
        <div class="split" role="img" aria-label="${`${season.fieldGoals} Feldtore, ${season.sevenMeterGoals} 7-m-Tore`}"><i data-style="${'flex:' + season.fieldGoals}"></i><i data-style="${'flex:' + season.sevenMeterGoals}"></i></div>
        <ul class="legend">
        <li><i class="st-g"></i>Feldtore <b class="num">${season.fieldGoals}</b></li>
        <li><i class="st-s"></i>7-m-Tore <b class="num">${season.sevenMeterGoals}</b></li>
        </ul>
        </div>`
          : ''
      }
      ${
        season
          ? html`<div class="card list pad-top-s">
        ${listRow({title: html`Verwarnungen ${ruleButton('gelb')}`, end: html`<span class="res num">${season.yellowCards ?? '–'}</span>`, cls: 'compact'})}
        ${listRow({title: html`Zeitstrafen ${ruleButton('2min')}`, end: html`<span class="res num">${season.twoMinutes ?? '–'}</span>`, cls: 'compact'})}
        ${listRow({title: html`Disqualifikationen ${ruleButton('rot')}`, end: html`<span class="res num">${season.disqualifications ?? '–'}</span>`, cls: 'compact'})}
      </div><p class="fine pad-top">Quelle: Schweizerischer Handball-Verband. – = nicht gemeldet.</p>`
          : ''
      }
    </section>
    ${!keeper ? formSection({form, keeper, now, sel: ui.formGame}) : ''}
    ${
      ehl
        ? html`<section class="sec" aria-labelledby="sp-ehl">${sectionHead('European League', '', '', 'sp-ehl')}${kpis([
            [ehl.goals, 'Tore'],
            [ehl.twoMinutes, 'Zeitstrafen'],
            [ehl.yellowCards, 'Verwarnungen']
          ])}<p class="fine pad-top">Quelle: EHF. Würfe und Einsätze liefert die EHF für diese Saison nicht verlässlich.</p></section>`
        : ''
    }
    ${
      p.facts.length
        ? html`<section class="sec" aria-labelledby="sp-steck">
      ${sectionHead('Steckbrief', '', '', 'sp-steck')}<dl class="card list facts">
      ${p.facts.map(
        ([k, v]) => html`<div class="rl">
      <dt>${k}</dt>
      <dd>${v}</dd>
      </div>`
      )}</dl>
      </section>`
        : ''
    }
    ${
      positionArticleId(p.position)
        ? html`<section class="sec">
      <div class="card list">
      ${listRow({
        title: `Position: ${POSITION(p.position)}`,
        sub: 'Was diese Position im Spiel macht',
        link: href.wissen('aufstellungen', positionArticleId(p.position)),
        lead: html`<span class="lead">${icon('book')}</span>`
      })}</div>
      </section>`
        : ''
    }
    <section class="sec">
      <a class="btn wide" href="${href.vergleich(p.number)}">Mit anderem Spieler vergleichen</a></section>
    ${
      p.url
        ? html`<section class="sec">
      <div class="card list">
      ${listRow({title: 'Profil auf kadettensh.ch', end: icon('ext'), link: p.url})}</div>
      </section>`
        : ''
    }`;
}

/** Spielervergleich: zwei Kaderspieler nebeneinander, Werte der QHL-Saison. */
const CMP_ROWS = [
  ['games', 'Spiele'],
  ['goals', 'Tore'],
  ['goalsPerGame', 'Tore pro Spiel'],
  ['fieldGoals', 'Feldtore'],
  ['sevenMeterGoals', '7-m-Tore'],
  ['twoMinutes', 'Zeitstrafen'],
  ['yellowCards', 'Verwarnungen']
];
const cmpValue = v => (typeof v === 'number' ? String(v).replace('.', ',') : '–');
export function compareRows(a, b) {
  return CMP_ROWS.map(([key, label]) => {
    const x = a?.[key],
      y = b?.[key];
    const both = typeof x === 'number' && typeof y === 'number';
    return {label, a: cmpValue(x), b: cmpValue(y), lead: both && x !== y ? (x > y ? 'a' : 'b') : null};
  });
}
function playerSelect(side, current, other) {
  return html`<label class="cmp-pick"><span class="sr">${side === 'a' ? 'Erster Spieler' : 'Zweiter Spieler'}</span>
    <select data-compare="${side}">
      <option value="">Spieler wählen</option>
      ${SQUAD.filter(p => String(p.number) !== other).map(
        p => html`<option value="${p.number}"${String(p.number) === current ? html` selected` : ''}>${p.number} · ${p.name}</option>`
      )}
    </select></label>`;
}
function compareHead(p) {
  if (!p) return html`<span class="cmp-head empty"><span class="no num" aria-hidden="true">?</span></span>`;
  return html`<a class="cmp-head" href="${href.spieler(p.number)}"><img src="${playerPhoto(p.number)}" alt="" width="160" height="200" loading="lazy" decoding="async"><b>${p.name.split(' ').slice(-1)[0]}</b><small>${POSITION(p.position)} · <span class="num">#${p.number}</span></small></a>`;
}
export function renderVergleich({route, state}) {
  const find = nr => SQUAD.find(p => String(p.number) === nr) || null;
  const a = find(route.a),
    b = find(route.b);
  const players = state.data?.playerSeason?.players;
  const rows = a && b ? compareRows(players?.[a.number], players?.[b.number]) : [];
  return html`${backBar('Kader', href.team())}
    <h1 class="h1 pad">Spielervergleich</h1>
    <section class="sec" aria-label="Auswahl">
      <div class="cmp-picks">${playerSelect('a', route.a, route.b)}${playerSelect('b', route.b, route.a)}</div>
      <div class="cmp-heads">${compareHead(a)}${compareHead(b)}</div>
    </section>
    ${
      a && b
        ? html`<section class="sec" aria-labelledby="vg-werte">${sectionHead(`Saison ${SEASON} · QHL`, '', '', 'vg-werte')}
      ${
        players
          ? html`<div class="card list">${rows.map(
              r =>
                html`<div class="cmp"><b${r.lead === 'a' ? html` class="own"` : ''}>${r.a}</b><span class="cmp-label">${r.label}</span><b${r.lead === 'b' ? html` class="own"` : ''}>${r.b}</b></div>`
            )}</div>
          <p class="fine pad-top">Der höhere Wert ist hervorgehoben. Quelle: Schweizerischer Handball-Verband. – = nicht gemeldet.</p>`
          : state.data
            ? notice('Noch keine Saisonwerte vorhanden.', 'saison')
            : loading()
      }</section>`
        : html`<section class="sec">${notice('Wähle zwei Spieler, um ihre Saisonwerte zu vergleichen.', 'team')}</section>`
    }`;
}
