// Erster Start: drei kurze Schritte (Lieblingsspieler, Mitteilungen, erster Tipp). Jeder Schritt lässt sich überspringen.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {SQUAD} from '../../data/squad.js';
import {favourite} from '../personal.js';
import {readDevice, pushSupported} from '../push.js';
import {nextGame} from '../logic.js';
import {subBand, backLink, playerPhoto, notice} from './parts.js';
import {tipFor} from './jetzt.js';

export const START_STEPS = 3;
const TITLES = ['Dein Lieblingsspieler', 'Mitteilungen', 'Dein erster Tipp'];

function players() {
  const fav = favourite();
  return html`<p class="lede">Er wird in Tabellen und Berichten hervorgehoben. Du kannst die Wahl jederzeit im Kader ändern.</p>
    <div class="start-grid">${SQUAD.map(
      p => html`<button type="button" class="start-pl${fav === p.number ? ' on' : ''}" data-favourite="${p.number}" aria-pressed="${String(fav === p.number)}">
        <img src="${playerPhoto(p.number)}" alt="" width="120" height="150" loading="lazy" decoding="async">
        <span class="num">${p.number}</span><b>${p.name.split(' ').slice(-1)[0]}</b></button>`
    )}</div>`;
}

function mitteilungen(ui) {
  const supported = pushSupported(),
    active = Boolean(readDevice()?.active),
    blocked = supported && globalThis.Notification?.permission === 'denied';
  return html`<p class="lede">Anpfiff, Halbzeit und Endresultat der Kadetten, auch wenn die App geschlossen ist. Welche Mitteilungen du willst, stellst du unter «Ich» ein.</p>
    <div class="acts single">${
      active
        ? html`<span class="pill">${icon('bell', 16)}Eingeschaltet</span>`
        : html`<button class="btn pri" type="button" data-push="enable"${!supported || blocked || ui.pushBusy ? html` disabled` : ''}>${icon('bell')}Mitteilungen einschalten</button>`
    }</div>
    <p class="fine pad-top" role="status">${
      ui.pushMessage ||
      (!supported
        ? 'Dieses Gerät unterstützt hier keine Mitteilungen. Auf iPhone und iPad die App zuerst über «Zum Home-Bildschirm» installieren.'
        : blocked
          ? 'Mitteilungen sind blockiert. Bitte in den Einstellungen des Geräts erlauben.'
          : '')
    }</p>`;
}

function tipp(state, now) {
  const game = nextGame(state.data?.games, now);
  const card = game ? tipFor(game, now) : '';
  return html`<p class="lede">Tippe das nächste Spiel der Kadetten. Ohne Einsatz, der Tipp bleibt auf deinem Gerät.</p>
    ${card || notice('Im Moment steht kein Spiel zum Tippen an. Du findest das Tippspiel später auf jeder Spielseite.', 'cal')}`;
}

export function renderStart({route, state, now, ui}) {
  const step = Math.min(START_STEPS, Math.max(1, route.step || 1));
  const last = step === START_STEPS;
  return html`${subBand(backLink('Überspringen', href.jetzt()), TITLES[step - 1], `Schritt ${step} von ${START_STEPS}`)}
    <section class="sec start" aria-label="${TITLES[step - 1]}">
      ${step === 1 ? players() : step === 2 ? mitteilungen(ui) : tipp(state, now)}
    </section>
    <section class="sec"><div class="acts start-nav">
      ${step > 1 ? html`<a class="btn" href="${href.start(step - 1)}">Zurück</a>` : ''}
      <a class="btn pri" href="${last ? href.jetzt() : href.start(step + 1)}">${last ? 'Fertig' : 'Weiter'}</a></div></section>`;
}
