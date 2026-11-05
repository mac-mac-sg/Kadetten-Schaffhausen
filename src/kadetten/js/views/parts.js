// Gemeinsame Bausteine des Designsystems «Abend» (docs/kadetten-app-design.md).
import {html} from '../text.js';
import {icon} from '../icons.js';
import {AREAS, href} from '../router.js';
import {OWN_TEAM, initials, shortTeam, outcome, dayLabel, hasScore} from '../logic.js';
import {SQUAD} from '../../data/squad.js';

export const LOGO = 'assets/kadetten-logo.png';
const FORM_LABEL = {S: 'Sieg', U: 'Unentschieden', N: 'Niederlage'};
export const RESULT_TEXT = {S: 'S · Sieg', U: 'U · Unentschieden', N: 'N · Niederlage'};

let logos = {};
/** Wappen aus dem Datenstand (clubLogos), auf die eigenen WebP-Kopien abgebildet. */
export function setLogos(map) { logos = map && typeof map === 'object' ? map : {}; }
function logoFor(team) {
  const file = /club-(\d+)\.(png|webp)$/.exec(logos[team] || '')?.[1];
  return file ? `assets/clubs/club-${file}.webp` : null;
}

export const topBar = title => html`<header class="top"><h1 class="h1">${title}</h1><a class="icb" href="${href.ich()}" aria-label="Ich: persönliche Funktionen und Einstellungen">${icon('ich')}</a></header>`;
export const backBar = (label, target, action = '') => html`<header class="top"><a class="back" href="${target}">${icon('back', 20)}${label}</a>${action}</header>`;

export function nav(active) {
  return html`<nav class="nav" aria-label="Hauptnavigation">${AREAS.map(a => html`<a href="${a.href}"${a.id === active ? html` class="on" aria-current="page"` : ''}>${icon(a.id)}<span>${a.label}</span></a>`)}</nav>`;
}

export function crest(team, size = '') {
  if (team === OWN_TEAM) return html`<span class="crest ${size}"><img src="${LOGO}" alt="" width="40" height="40"></span>`;
  const logo = logoFor(team);
  return logo ? html`<span class="crest logo ${size}"><img src="${logo}" alt="" width="40" height="40" loading="lazy"></span>` : html`<span class="crest ${size}" aria-hidden="true">${initials(team)}</span>`;
}

export const sectionHead = (title, more, moreHref, id) => html`<div class="sh"><h2 class="h2"${id ? html` id="${id}"` : ''}>${title}</h2>${more ? html`<a class="more" href="${moreHref}">${more}</a>` : ''}</div>`;

export function formRow(results, small = false) {
  const list = (results || []).filter(Boolean);
  if (!list.length) return html`<span class="muted">–</span>`;
  return html`<span class="form${small ? ' sm' : ''}" role="img" aria-label="${'Form: ' + list.map(r => FORM_LABEL[r]).join(', ')}">${list.map(r => html`<span class="f f-${r.toLowerCase()}" aria-hidden="true">${r}</span>`)}</span>`;
}
export const formBadge = (result, small = true) => result ? formRow([result], small) : '';

/** Spielkarte (Hero) mit Hallenfoto. middle: Anpfiffzeit oder Spielstand. */
export function heroCard({meta, pill, live = false, home, away, middle, foot = '', actions = '', link, label}) {
  const body = html`<div class="meta"><span>${meta}</span>${pill ? html`<span class="pill">${live ? html`<i class="dot"></i>` : ''}${pill}</span>` : ''}</div>
    <div class="vs"><span class="team">${crest(home)}${shortTeam(home)}</span>${middle}<span class="team">${crest(away)}${shortTeam(away)}</span></div>${foot}`;
  return html`<div class="hero">${link ? html`<a class="hero-link" href="${link}" aria-label="${label || ''}">${body}</a>` : body}${actions}</div>`;
}

export const kickoffTime = (time, label = 'Anpfiff') => html`<span class="kick num">${time || '–'}<small>${label}</small></span>`;
export const scoreLine = (score, label) => html`<span class="score num"${label ? html` aria-label="${label}"` : ''}>${Array.isArray(score) ? `${score[0]}:${score[1]}` : '–:–'}</span>`;
export const notice = (text, name = 'offline') => html`<p class="note" role="status">${icon(name, 18)}<span>${text}</span></p>`;
export const loading = text => html`<p class="note loading" role="status">${icon('jetzt', 18)}<span>${text || 'Wird geladen …'}</span></p>`;

export function stats(items) {
  return html`<div class="card stats">${items.map(([value, label]) => html`<span class="stat"><span class="v num">${value ?? '–'}</span><span class="k">${label}</span></span>`)}</div>`;
}

export function listRow({title, sub, end = icon('go', 18), lead = '', link, cls = ''}) {
  const inner = html`${lead}<span class="grow"><span class="t">${title}</span>${sub ? html`<span class="s">${sub}</span>` : ''}</span>${end}`;
  return link ? html`<a class="rl ${cls}" href="${link}">${inner}</a>` : html`<div class="rl ${cls}">${inner}</div>`;
}

/** Spielzeile für Listen (Spielplan, letzte Spiele). */
export function gameRow(game, now, {showDate = true, cls = ''} = {}) {
  const own = game.home === OWN_TEAM || game.away === OWN_TEAM;
  const opponent = game.home === OWN_TEAM ? game.away : game.away === OWN_TEAM ? game.home : null;
  const title = own ? shortTeam(opponent) : `${shortTeam(game.home)} – ${shortTeam(game.away)}`;
  const place = own ? (game.home === OWN_TEAM ? 'Heim' : 'auswärts') : '';
  const sub = [showDate ? dayLabel(game, now) : '', game.league, place, hasScore(game) ? '' : game.time].filter(Boolean).join(' · ');
  const end = hasScore(game)
    ? html`<span class="res num">${game.score[0]}:${game.score[1]}${own ? formBadge(outcome(game)) : ''}</span>`
    : icon('go', 18);
  return listRow({title, sub, end, lead: crest(opponent || game.home, 'xs'), link: game.id ? href.spiel(game.id) : '', cls});
}

export function playerByNumber(number) { return SQUAD.find(p => p.number === Number(number)) || null; }
export const playerPhoto = number => SQUAD.some(p => p.number === Number(number)) ? `assets/players/${Number(number)}.webp` : null;

/** Nur Bilder über HTTPS; lokale Bildnamen der bisherigen App werden hier nicht mitgeliefert. */
export const storyImage = story => /^https:\/\//.test(story?.image || '') ? story.image : null;
export function storyRow(story) {
  const image = storyImage(story);
  return listRow({
    title: story.title, sub: story.date, end: '', link: href.artikel(story.id),
    lead: image ? html`<img class="thumb" src="${image}" alt="" loading="lazy" decoding="async" width="72" height="56">` : html`<span class="thumb thumb-empty" aria-hidden="true"><img src="${LOGO}" alt="" width="28" height="28"></span>`
  });
}

export function segment(items, current, label) {
  return html`<nav class="seg" aria-label="${label}">${items.map(([id, text, target, extra]) => html`<a href="${target}"${id === current ? html` class="on" aria-current="page"` : ''}>${extra || ''}${text}</a>`)}</nav>`;
}
