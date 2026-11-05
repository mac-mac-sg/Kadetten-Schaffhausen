// Gemeinsame Bausteine des Designsystems «Abend» (docs/kadetten-app-design.md).
import {html} from '../text.js';
import {icon} from '../icons.js';
import {AREAS, href} from '../router.js';
import {OWN_TEAM, initials, shortTeam} from '../logic.js';

export const LOGO = 'assets/kadetten-logo.png';
export const ARENA = 'assets/bbc-arena.webp';

export const topBar = title => html`<header class="top"><h1 class="h1">${title}</h1><a class="icb" href="${href.ich()}" aria-label="Ich: persönliche Funktionen und Einstellungen">${icon('ich')}</a></header>`;
export const backBar = (label, target, action = '') => html`<header class="top"><a class="back" href="${target}">${icon('back', 20)}${label}</a>${action}</header>`;

export function nav(active) {
  return html`<nav class="nav" aria-label="Hauptnavigation">${AREAS.map(a => html`<a href="${a.href}"${a.id === active ? html` class="on" aria-current="page"` : ''}>${icon(a.id)}<span>${a.label}</span></a>`)}</nav>`;
}

export function crest(team, size = '') {
  return team === OWN_TEAM
    ? html`<span class="crest ${size}"><img src="${LOGO}" alt="" width="40" height="40"></span>`
    : html`<span class="crest ${size}" aria-hidden="true">${initials(team)}</span>`;
}

export const sectionHead = (title, more, moreHref) => html`<div class="sh"><h2 class="h2">${title}</h2>${more ? html`<a class="more" href="${moreHref}">${more}</a>` : ''}</div>`;

const FORM_LABEL = {S: 'Sieg', U: 'Unentschieden', N: 'Niederlage'};
export function formRow(results, small = false) {
  const list = results.filter(Boolean);
  if (!list.length) return html`<span class="muted">–</span>`;
  return html`<span class="form${small ? ' sm' : ''}" role="img" aria-label="${'Form: ' + list.map(r => FORM_LABEL[r]).join(', ')}">${list.map(r => html`<span class="f f-${r.toLowerCase()}" aria-hidden="true">${r}</span>`)}</span>`;
}

/** Spielkarte (Hero) mit Hallenfoto. middle: Anpfiffzeit oder Spielstand. */
export function heroCard({meta, pill, live = false, home, away, middle, foot = '', actions = '', link}) {
  const body = html`<div class="meta"><span>${meta}</span>${pill ? html`<span class="pill">${live ? html`<i class="dot"></i>` : ''}${pill}</span>` : ''}</div>
    <div class="vs"><span class="team">${crest(home)}${shortTeam(home)}</span>${middle}<span class="team">${crest(away)}${shortTeam(away)}</span></div>${foot}`;
  return html`<div class="hero">${link ? html`<a class="hero-link" href="${link}">${body}</a>` : body}${actions}</div>`;
}

export const kickoffTime = (time, label = 'Anpfiff') => html`<span class="kick num">${time || '–'}<small>${label}</small></span>`;
export const scoreLine = score => html`<span class="score num">${score ? `${score[0]}:${score[1]}` : '–:–'}</span>`;

export const notice = (text, name = 'offline') => html`<p class="note" role="status">${icon(name, 18)}<span>${text}</span></p>`;
