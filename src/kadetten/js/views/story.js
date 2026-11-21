// Gemeinsamer Rahmen für Geschichten aus Vollbild-Karten (Saisonrückblick, Spiel-Story): Balken mit Zeitsteuerung,
// Schliessen, Pause, Tippflächen. Die Zeitsteuerung selbst (5 Sekunden je Karte) liegt in main.js.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {tips} from '../personal.js';
import {outcome, shortTeam, hasScore} from '../logic.js';
import {isOwn} from '../match.js';
import {tipPoints} from '../moments.js';
import {venueInfo} from './parts.js';

const THEMES = ['or', 'bk', 'cr'];

/** Zustand der Geschichte aus ui: aktuelle Karte, Eingangsbewegung, Automatik, Pause, letzter Wechsel von Hand. */
export const storyState = ui => ({
  step: ui.rbStep,
  enter: ui.enter,
  auto: ui.rbAuto !== false,
  paused: Boolean(ui.rbPaused),
  manual: Boolean(ui.rbManual)
});

/**
 * slides: [{id, body, photo?}]; step wird auf den gültigen Bereich begrenzt. photo: Spielerbild als verwischter Hintergrund mit Korn.
 * auto: Karten laufen von selbst weiter (aus bei «Bewegung reduzieren»): dann füllt sich der Balken und es gibt einen Pause-Knopf.
 * manual: der letzte Wechsel kam vom Nutzer; nur dann liest ein Screenreader die neue Karte vor, nicht bei jedem automatischen Wechsel.
 */
export function storyShell({slides, step = 0, enter = false, close, closeLabel, note = '', auto = true, paused = false, manual = false}) {
  const n = slides.length,
    at = Math.min(Math.max(0, Number(step) || 0), n - 1),
    s = slides[at],
    last = at === n - 1,
    running = auto && !last;
  const theme = s.photo ? 'ph' : THEMES[at % THEMES.length];
  return html`<div class="rb rb-${theme}${enter ? ' enter' : ''}${paused ? ' paused' : ''}" data-rb-step="${at}">
    ${s.photo ? html`<img class="rb-photo" src="${s.photo}" alt="" decoding="async"><i class="rb-grain" aria-hidden="true"></i>` : ''}
    <div class="rb-bars" aria-hidden="true">${slides.map(
      (_, i) => html`<i class="${i < at || (i === at && !running) ? 'on' : i === at ? 'now' : ''}"></i>`
    )}</div>
    ${
      running
        ? html`<button class="rb-pause" type="button" data-rb-pause aria-pressed="${String(paused)}" aria-label="${paused ? 'Weiter' : 'Pause'}">${icon(paused ? 'play' : 'pause', 20)}</button>`
        : ''
    }
    <a class="rb-close" href="${close}" aria-label="${closeLabel}">${icon('close')}</a>
    <section class="rb-slide" aria-live="${manual || !auto ? 'polite' : 'off'}" aria-label="${`Karte ${at + 1} von ${n}`}" data-rb-id="${s.id}">${s.body}</section>
    ${at > 0 ? html`<button class="rb-prev" type="button" data-rb="prev" aria-label="Vorherige Karte"></button>` : ''}
    ${at < n - 1 ? html`<button class="rb-next" type="button" data-rb="next" aria-label="Nächste Karte"></button>` : ''}
    ${note ? html`<p class="rb-note">${note}</p>` : ''}
  </div>`;
}

/** Teile der Schlagzeile: Artikel, Wort, Verbindung, Ort oder Gegner («Der» «Sieg» «in der» «BBC Arena»). */
export function storyHeadlineParts(game) {
  const result = outcome(game);
  const v = venueInfo(game?.venue);
  const opp = shortTeam(isOwn(game.home) ? game.away : game.home);
  if (result === 'U') return ['Das', 'Remis', 'gegen', opp];
  const what = result === 'S' ? ['Der', 'Sieg'] : ['Die', 'Niederlage'];
  if (v?.home) return [...what, 'in der', 'BBC Arena'];
  if (v?.place || v?.name) return [...what, 'in', v.place || v.name];
  return [...what, 'gegen', opp];
}

/** Schlagzeile der Spiel-Story nach Resultat und Ort: «Der Sieg in der BBC Arena», «Die Niederlage in Thun», «Das Remis gegen Pfadi». */
export function storyHeadline(game) {
  return storyHeadlineParts(game).join(' ');
}

/** Kurzer Wettbewerb (QHL, EHL) steht als Marke im Satz; lange Namen wie «Mobiliar-Cup M» stehen stattdessen in der Kopfzeile. */
const inlineLeague = game => (game?.league || '').length <= 4;
/** Wettbewerb für die Kopfzeile der ersten Karte, nur wenn er nicht als Marke im Satz steht («Mobiliar-Cup M» → «Mobiliar-Cup»). */
export const competitionKicker = game => (game?.league && !inlineLeague(game) ? game.league.replace(/\s+[MF]$/, '') : '');

/** Dieselbe Schlagzeile gesetzt: leicht und fett gemischt, ein kurzer Wettbewerb als schräge Marke im Satz. */
export function storyHeadlineMixed(game) {
  const [art, word, join, where] = storyHeadlineParts(game);
  return html`<p class="rb-head">${art} <b>${word}</b> ${game.league && inlineLeague(game) ? html`<span class="rb-tag">${game.league}</span> ` : ''}${join} <b>${where}</b></p>`;
}

/** Siegerkarte: Strahlen, Konfetti und Stempel («Weiter im Cup!» bei einem Cup-Sieg). Reiner Schmuck, für Screenreader verborgen. */
export function storyWinDecor(game) {
  const cup = /cup/i.test(game?.league || '');
  return html`<i class="rb-burst" aria-hidden="true"></i><i class="rb-confetti" aria-hidden="true"></i><span class="rb-stamp" aria-hidden="true">${cup ? 'Weiter im Cup!' : 'Sieg!'}</span><i class="rb-stripe" aria-hidden="true"></i>`;
}

/** Kachel «Spiel-Story» (Spielseite und Titelseite nach dem Spiel), gestaltet wie der Hinweis zum Saisonrückblick. */
export function storyTeaser(game, tip = tips()[String(game?.id)]) {
  if (!hasScore(game)) return '';
  const points = tipPoints(tip, game.score);
  const sub = points === null ? 'Resultat, Wendepunkt, bester Werfer' : `Dein Tipp: ${points} ${points === 1 ? 'Punkt' : 'Punkte'}`;
  return html`<section class="sec tight"><a class="card teaser" href="${href.spiel(game.id, 'kurz')}">
    <span class="teaser-k">Spiel-Story</span><span class="teaser-t">${storyHeadline(game)}</span>
    <span class="teaser-s">${sub}</span>${icon('go')}</a></section>`;
}
