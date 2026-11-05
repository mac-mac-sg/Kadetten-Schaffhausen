// Übrige Bereiche als Gerüst mit Kopf, Umschaltern und Platzhalter. Inhalte folgen in Schritt 5.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {THEMES} from '../theme.js';
import {topBar, backBar} from './parts.js';

const later = what => html`<section class="sec"><div class="card empty"><span class="lead">${icon('cal', 20)}</span><p>${what} folgt im nächsten Schritt.</p></div></section>`;

function segment(items, current, label) {
  return html`<nav class="seg" aria-label="${label}">${items.map(([id, text, target]) => html`<a href="${target}"${id === current ? html` class="on" aria-current="page"` : ''}>${text}</a>`)}</nav>`;
}

export function renderSaison(route) {
  const tabs = [['spielplan', 'Spielplan', href.saison('spielplan')], ['tabellen', 'Tabellen', href.saison('tabellen')], ['statistik', 'Statistik', href.saison('statistik')]];
  const title = tabs.find(t => t[0] === route.view)[1];
  return html`${topBar('Saison')}${segment(tabs, route.view, 'Saison')}${later(title)}`;
}

export const renderTeam = () => html`${topBar('Team')}${later('Der Kader')}`;
export const renderSpieler = () => html`${backBar('Team', href.team())}<h1 class="h1 pad">Spieler</h1>${later('Das Spielerprofil')}`;
export const renderVerein = () => html`${topBar('Verein')}${later('Die Vereinsseite')}`;
export const renderSpiel = () => html`${backBar('Jetzt', href.jetzt())}<h1 class="h1 pad">Spiel</h1>${later('Die Spielseite')}`;

export function renderIch({theme}) {
  return html`${backBar('Zurück', href.jetzt())}<h1 class="h1 pad">Ich</h1>
    <section class="sec"><div class="sh"><h2 class="h2" id="darstellung">Darstellung</h2></div>
      <div class="seg flush" role="radiogroup" aria-labelledby="darstellung">${THEMES.map(([id, label]) => html`<button type="button" role="radio" data-theme-choice="${id}" aria-checked="${String(id === theme)}"${id === theme ? html` class="on"` : ''}>${label}</button>`)}</div>
    </section>
    ${later('Benachrichtigungen, Meine Spiele und Kalender-Abo')}`;
}
