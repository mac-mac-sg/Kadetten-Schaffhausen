// Saisonrückblick «Deine Saison» (#/rueckblick): Vollbild-Karten wie eine Geschichte. Tippen rechts weiter, links zurück,
// Pfeiltasten und Wischen ebenso. Keine Navigation, Schliessen führt zu «Mein Bereich».
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {myGames, tips, favourite} from '../personal.js';
import {liveSeen} from '../sammeln.js';
import {quizAnswers} from '../quiz.js';
import {recap, seasonOver} from '../rueckblick.js';
import {loading} from './parts.js';
import {shortDate} from '../logic.js';
import {storyShell, storyState} from './story.js';

const word = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function recapInput(state, now) {
  return {data: state.data, now, visited: myGames(), tips: tips(), live: liveSeen(), answers: quizAnswers(), favourite: favourite()};
}

/** Kennzahlen für das Teilen-Bild. */
export function recapTiles(r) {
  const by = id => r.slides.find(s => s.id === id);
  const halle = by('halle'),
    tipps = by('tipps'),
    sammeln = by('sammeln'),
    team = by('team');
  return [
    halle && [halle.visits, halle.visits === 1 ? 'Spiel in der Halle' : 'Spiele in der Halle'],
    halle && [`${halle.record.S}-${halle.record.U}-${halle.record.N}`, 'live erlebt (S-U-N)'],
    tipps && [tipps.points, 'Tipp-Punkte'],
    sammeln && sammeln.weeks && [sammeln.weeks, 'Quiz-Wochen'],
    sammeln && [`${sammeln.have}/${sammeln.total}`, 'Sammelkarten'],
    team && team.rank && [team.rank + '.', 'Rang der Kadetten']
  ].filter(Boolean);
}

/** Rangkurve: Runde nach rechts, Rang 1 oben. */
function curve(ranks, teams) {
  if (ranks.length < 2) return '';
  const maxX = Math.max(...ranks.map(r => r[0])),
    maxY = Math.max(teams || 0, ...ranks.map(r => r[1]));
  const pts = ranks
    .map(([x, y]) => `${Math.round((x / maxX) * 252) + 2},${Math.round(((y - 1) / Math.max(1, maxY - 1)) * 110) + 6}`)
    .join(' ');
  return html`<svg class="rb-curve" viewBox="0 0 256 122" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}

function slide(s) {
  switch (s.id) {
    case 'intro':
      return html`<p class="rb-k">Saison ${s.season}</p><div class="rb-body"><h1 class="rb-big xl">Deine<br>Saison.</h1>
        <p>Was du mit den Kadetten erlebt hast.</p></div><i class="rb-stripe" aria-hidden="true"></i><p class="rb-hint">Tippen für weiter</p>`;
    case 'halle':
      return html`<p class="rb-k">In der Halle</p><div class="rb-body"><p class="rb-big xxl">${s.visits}×</p>
        <p class="rb-lead">warst du in der BBC Arena.</p>
        <p>${word(s.record.S, 'Sieg', 'Siege')}, ${word(s.record.U, 'Unentschieden', 'Unentschieden')}, ${word(s.record.N, 'Niederlage', 'Niederlagen')}. ${s.goals} Kadetten-Tore hast du gesehen.</p>
        ${s.withYou !== null && s.overall !== null ? html`<p class="fine">Mit dir in der Halle gewinnen die Kadetten ${s.withYou} % ihrer Spiele, über die ganze Saison ${s.overall} %.</p>` : ''}</div>`;
    case 'spiel':
      return html`<p class="rb-k">Dein Spiel der Saison</p><div class="rb-body"><span class="rb-tag">${[shortDate(s.date, false), s.league].filter(Boolean).join(' · ')}</span>
        <p class="rb-big md">${s.home} – ${s.away}</p><p class="rb-big xl acc">${s.score[0]}:${s.score[1]}</p>
        <p>Dein höchster Sieg in der Halle: ${word(s.margin, 'Tor', 'Tore')} Vorsprung.</p></div>`;
    case 'tipps':
      return html`<p class="rb-k">Tippspiel</p><div class="rb-body"><p class="rb-big xxl">${s.points}</p>
        <p class="rb-lead">Tipp-Punkte aus ${word(s.tipped, 'Tipp', 'Tipps')}</p>
        <dl class="rb-rows"><div><dt>exakt getroffen</dt><dd>${s.exact}</dd></div><div><dt>richtige Tordifferenz</dt><dd>${s.diff}</dd></div><div><dt>beste Serie mit Punkten</dt><dd>${word(s.streak, 'Spiel', 'Spiele')}</dd></div></dl>
        ${s.best ? html`<p class="fine">Dein bester Tipp: ${s.best.tip[0]}:${s.best.tip[1]} gegen ${s.best.opponent}${s.best.points === 3 ? ', genau so.' : '.'}</p>` : ''}</div>`;
    case 'spieler':
      return html`<p class="rb-k">Dein Lieblingsspieler</p><div class="rb-body"><p class="rb-big xxl acc">${s.number}</p>
        <p class="rb-big md">${s.name}</p>
        <dl class="rb-rows"><div><dt>Tore QHL</dt><dd>${s.goals}</dd></div><div><dt>Spiele</dt><dd>${s.games}</dd></div>${
          Number.isFinite(s.seven) ? html`<div><dt>davon Siebenmeter</dt><dd>${s.seven}</dd></div>` : ''
        }</dl></div>`;
    case 'sammeln':
      return html`<p class="rb-k">Quiz und Sammlung</p><div class="rb-body">${
        s.weeks
          ? html`<p class="rb-big xl">${s.weeks}</p><p>${s.weeks === 1 ? 'Quiz-Woche' : 'Quiz-Wochen'}, davon ${s.perfect} ohne Fehler.${s.quote !== null ? ` Quote ${s.quote} %.` : ''}</p>`
          : ''
      }${
        s.have
          ? html`<p class="rb-big xl acc">${s.have}/${s.total}</p><p>Sammelkarten.${s.rarest ? html` Deine seltenste: <b>${s.rarest}</b>.` : ''}</p>`
          : ''
      }</div>`;
    case 'team':
      return html`<p class="rb-k">Deine Kadetten</p><div class="rb-body">${
        s.rank ? html`<p class="rb-big xl">${s.rank}. Platz</p>` : html`<p class="rb-big xl">QHL</p>`
      }<p>${s.record.S}-${s.record.U}-${s.record.N} in der QHL, ${s.goalsFor}:${s.goalsAgainst} Tore${s.points !== null ? `, ${s.points} Punkte` : ''}.</p>
        ${curve(s.ranks, s.teams)}${s.ranks.length > 1 ? html`<p class="fine">Rang nach jeder Runde.</p>` : ''}</div>`;
    case 'fan':
      return html`<p class="rb-k">Dein Fan-Typ</p><div class="rb-body"><span class="rb-tag">${s.name}</span>
        <p class="rb-big md">${s.why}</p><p class="fine">Saison ${s.season} · Kadetten Schaffhausen</p></div>
        <button class="rb-share" type="button" data-rb-share>${icon('share')}Als Bild teilen</button>`;
    default:
      return '';
  }
}

export function renderRueckblick({state, now, ui = {}}) {
  if (!state.data) return html`<section class="sec">${loading()}</section>`;
  const r = recap({...recapInput(state, now)});
  return storyShell({
    slides: r.slides.map(s => ({id: s.id, body: slide(s)})),
    ...storyState(ui),
    close: href.ich(),
    closeLabel: 'Rückblick schliessen',
    note: r.over ? '' : 'Zwischenstand, die Saison läuft noch.'
  });
}

/** Hinweis auf den Rückblick: nach Saisonende gross (Titelseite, Mein Bereich), sonst leer. */
export function recapTeaser(games, now, after = false) {
  if (!seasonOver(games, now)) return '';
  return html`<section class="sec${after ? ' after-band' : ''}"><a class="card rb-teaser" href="${href.rueckblick()}">
    <span class="rb-teaser-k">Saisonrückblick</span><span class="rb-teaser-t">Deine Saison ist da.</span>
    <span class="rb-teaser-s">Halle, Tipps, Quiz, Karten und dein Fan-Typ</span>${icon('go')}</a></section>`;
}
