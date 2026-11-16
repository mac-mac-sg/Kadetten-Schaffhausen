// Karte «Kadetten-Gewinnscore» für Vorschau und Live-Reiter der Spielseite.
import {html} from '../text.js';
import {OWN_TEAM, form, standings, shortTeam} from '../logic.js';
import {sameTeam, isOwn} from '../match.js';
import {gewinnscore, liveScore, percents} from '../gewinnscore.js';
import {sectionHead} from './parts.js';

const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + String(Math.abs(Math.round(v * 10) / 10)).replace('.', ',');
const points = list => (list || []).slice(0, 5).reduce((a, x) => a + (x === 'S' ? 2 : x === 'U' ? 1 : 0), 0);

/** Gewinnscore vor dem Spiel aus den geladenen Daten; null ohne Grundlage. */
export function preScore({game, data, oppForm}) {
  if (game?.league !== 'QHL') return null;
  const table = standings(data?.tables?.QHL);
  const opponent = isOwn(game.home) ? game.away : game.home;
  const own = table.find(r => r.team === OWN_TEAM || isOwn(r.team)),
    opp = table.find(r => sameTeam(r.team, opponent));
  const ownForm = form(
    (data?.games || []).filter(g => String(g.id) !== String(game.id)),
    OWN_TEAM,
    5,
    'QHL'
  );
  const score = gewinnscore({game, own, opp, ownForm, oppForm: oppForm || []});
  return score && {...score, opponent, ownForm, oppForm: oppForm || []};
}

const bar = p =>
  html`<span class="gs-bar" role="img" aria-label="${`Sieg ${p[0]} %, Unentschieden ${p[1]} %, Niederlage ${p[2]} %`}"><i class="w" data-style="${'flex:' + p[0]}"></i><i class="d" data-style="${'flex:' + p[1]}"></i><i class="l" data-style="${'flex:' + p[2]}"></i></span>
  <span class="gs-leg" aria-hidden="true"><span>Sieg ${p[0]} %</span><span>Remis ${p[1]} %</span><span>Niederlage ${p[2]} %</span></span>`;

/** Vorschau: Siegchance, Balken und die Gründe dahinter. */
export function gewinnCard(score) {
  if (!score) return '';
  const p = percents(score);
  const opp = shortTeam(score.opponent);
  return html`<section class="sec" aria-labelledby="g-score">${sectionHead('Kadetten-Gewinnscore', '', '', 'g-score')}
    <div class="card gscore">
      <p class="gs-big"><b class="num">${p[0]} %</b><span>Siegchance</span></p>
      ${bar(p)}
      <details class="more-card gs-more" id="g-score-more"><summary>So gerechnet</summary>
      <dl class="gs-why">
        <div><dt>Heimvorteil</dt><dd>${score.home > 0 ? 'Kadetten' : opp} +1,5 Tore</dd></div>
        <div><dt>Stärke (Tordifferenz je Spiel)</dt><dd class="num">${signed(score.strength[0])} zu ${signed(score.strength[1])}</dd></div>
        ${
          score.ownForm.length >= 3 && score.oppForm.length >= 3
            ? html`<div><dt>Form (Punkte aus 5 Spielen)</dt><dd class="num">${points(score.ownForm)} zu ${points(score.oppForm)}</dd></div>`
            : ''
        }
        <div><dt>Erwartet</dt><dd class="num">Kadetten ${signed(score.margin)} Tore</dd></div>
      </dl>
      <p class="fine">Gerechnet aus Tabelle, Vorsaison, Form und Heimvorteil. In der Saison 2025/26 lag der Favorit so in 3 von 4 Spielen richtig. Verletzungen und Aufstellung kennt die Rechnung nicht.</p>
      </details>
    </div></section>`;
}

/** Live-Reiter: Siegchance aus Spielstand und Restzeit, mit Veränderung seit Anpfiff. */
export function gewinnLive(pre, match, game) {
  const now = liveScore(pre, match, game);
  if (!now) return '';
  const p = percents(now),
    start = percents(pre)[0],
    delta = p[0] - start;
  return html`<section class="sec" aria-labelledby="g-score">${sectionHead('Gewinnscore live', '', '', 'g-score')}
    <div class="card gscore">
      <p class="gs-big"><b class="num">${p[0]} %</b><span>Siegchance</span>${
        delta ? html`<em class="${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} seit Anpfiff</em>` : ''
      }</p>
      ${bar(p)}
      <p class="fine">Vor dem Spiel ${start} %. Der Vorsprung zählt voll, die Erwartung nur noch für die Restzeit.</p>
    </div></section>`;
}
