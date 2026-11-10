// Gemeinsame Bausteine des Designsystems «Schnitt» (docs/kadetten-app-design.md).
import {html} from '../text.js';
import {icon} from '../icons.js';
import {AREAS, href} from '../router.js';
import {OWN_TEAM, initials, shortTeam, outcome, dayLabel, hasScore} from '../logic.js';
import {SQUAD} from '../../data/squad.js';
import {SEASON} from '../season.js';

// Nur der Schild (orange Fläche mit K), ohne Sterne und Rahmenlinie: assets/kadetten-wappen.png
export const LOGO = 'assets/kadetten-wappen.png';
export const venueShort = venue => /BBC Arena/i.test(venue || '') ? 'BBC Arena' : String(venue || '').split(',')[0].trim();
const MONTH_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
const FORM_LABEL = {S: 'Sieg', U: 'Unentschieden', N: 'Niederlage'};
export const RESULT_TEXT = {S: 'S · Sieg', U: 'U · Unentschieden', N: 'N · Niederlage'};

let logos = {};
/** Wappen aus dem Datenstand (clubLogos), auf die eigenen WebP-Kopien abgebildet. */
export function setLogos(map) { logos = map && typeof map === 'object' ? map : {}; }
export function crestSrc(team) { return team === OWN_TEAM ? LOGO : logoFor(team); }
function logoFor(team) {
  const file = /club-(\d+)\.(png|webp)$/.exec(logos[team] || '')?.[1];
  return file ? `assets/clubs/club-${file}.webp` : null;
}

const settingsLink = html`<a class="icb" href="${href.ich()}" aria-label="Ich: persönliche Funktionen und Einstellungen">${icon('settings', 22)}</a>`;
const wissenLink = html`<a class="icb" href="${href.wissen()}" aria-label="Wissen: Regeln, Aufstellungen und Spielzüge">${icon('book', 22)}</a>`;
const clubLink = html`<a class="icb club" href="${href.verein()}" aria-label="Verein: Geschichte und Titel"><img src="${LOGO}" alt="" width="28" height="32"></a>`;

/** Kopfband einer Hauptseite: Kicker, Titel, Zugang zu Verein und «Ich». */
export const topBar = (title, kicker = `Saison ${SEASON}`) => html`<header class="band"><div class="band-acts">${clubLink}${wissenLink}${settingsLink}</div><p class="band-k">${kicker}</p><h1 class="band-t">${title}</h1></header>`;
/** Kopfband der Titelseite: grosser Schriftzug, Wappen links, «Ich» rechts. */
export const homeBand = () => html`<header class="band band-home"><a class="band-crest" href="${href.verein()}" aria-label="Verein: Geschichte und Titel"><img src="${LOGO}" alt="" width="44" height="51"></a><div class="band-acts">${wissenLink}${settingsLink}</div><h1 class="band-t">Kadetten</h1><p class="band-s">Schaffhausen</p><p class="band-tag"><span class="tag-ink">Tradition seit 1791</span></p></header>`;
/** Schmales Kopfband mit Zurück-Knopf und optionaler Aktion (Unterseiten). */
export const backBar = (label, target, action = '', returnToOrigin = false) => html`<header class="band band-slim"><div class="band-bar">${backLink(label, target, returnToOrigin)}${action}</div></header>`;
/** Kopfband der Spielseite: Zurück, Teilen und die Spielkarte im Band. */
export const matchBand = (back, action, body) => html`<header class="band band-slim band-match"><div class="band-bar">${back}${action}</div>${body}</header>`;
export const backLink = (label, target, returnToOrigin = false) => html`<a class="back" href="${target}"${returnToOrigin ? html` data-route-back` : ''}>${icon('back')}${label}</a>`;

/** Kopfband einer Unterseite mit Titel: Zurück oben, Kicker und Titel wie bei den Hauptseiten. */
export const subBand = (back, title, kicker = '', action = '') => html`<header class="band band-sub"><div class="band-bar">${back}${action}</div>${kicker ? html`<p class="band-k">${kicker}</p>` : ''}<h1 class="band-t sm">${title}</h1></header>`;

export function nav(active) {
  return html`<nav class="nav" aria-label="Hauptnavigation">${AREAS.map(a => html`<a href="${a.href}" aria-label="${a.label}"${a.id === active ? html` class="on" aria-current="page"` : ''}>${icon(a.icon || a.id)}<span>${a.label}</span></a>`)}</nav>`;
}

export function crest(team, size = '') {
  if (team === OWN_TEAM) return html`<span class="crest own ${size}"><img src="${LOGO}" alt="" width="40" height="47"></span>`;
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
export function heroCard({meta, pill, live = false, home, away, middle, foot = '', actions = '', link, label, celebrate = false}) {
  const body = html`<div class="meta"><span>${meta}</span>${pill ? html`<span class="pill">${live ? html`<i class="dot"></i>` : ''}${pill}</span>` : ''}</div>
    <div class="vs"><span class="team">${crest(home)}${shortTeam(home)}</span>${middle}<span class="team">${crest(away)}${shortTeam(away)}</span></div>${foot}`;
  return html`<div class="hero${celebrate ? ' celebrate' : ''}"${celebrate ? html` data-celebrate="${home + ':' + away + ':' + (meta || '')}"` : ''}>${link ? html`<a class="hero-link" href="${link}" aria-label="${label || ''}">${body}</a>` : body}${actions}</div>`;
}

export const kickoffTime = (time, label = 'Anpfiff') => html`<span class="kick num">${time || '–'}<small>${label}</small></span>`;
export const scoreLine = (score, label) => html`<span class="score num"${label ? html` aria-label="${label}"` : ''}>${Array.isArray(score) ? `${score[0]}:${score[1]}` : '–:–'}</span>`;
export const notice = (text, name = 'offline') => html`<p class="note" role="status">${icon(name, 18)}<span>${text}</span></p>`;
export const loading = text => html`<p class="note loading" role="status">${icon('jetzt')}<span>${text || 'Wird geladen …'}</span></p>`;

export function stats(items) {
  return html`<div class="card stats">${items.map(([value, label]) => html`<span class="stat"><span class="v num">${value ?? '–'}</span><span class="k">${label}</span></span>`)}</div>`;
}

export function listRow({title, sub, end = icon('go'), lead = '', link, cls = ''}) {
  const inner = html`${lead}<span class="grow"><span class="t">${title}</span>${sub ? html`<span class="s">${sub}</span>` : ''}</span>${end}`;
  return link ? html`<a class="rl ${cls}" href="${link}">${inner}</a>` : html`<div class="rl ${cls}">${inner}</div>`;
}

/** Datumsblock wie eine Rückennummer: Tag gross und kursiv, Monat klein. */
export function dateBlock(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  return m ? html`<span class="dt" aria-hidden="true"><b class="num">${Number(m[3])}</b><small>${MONTH_SHORT[Number(m[2]) - 1]}</small></span>` : '';
}

/** Spielzeile für Listen (Spielplan, letzte Spiele): Datumsblock, Gegner, Ort und Wettbewerb, Resultat mit Form. */
export function gameRow(game, now, {showDate = true, cls = ''} = {}) {
  const own = game.home === OWN_TEAM || game.away === OWN_TEAM;
  const opponent = game.home === OWN_TEAM ? game.away : game.away === OWN_TEAM ? game.home : null;
  const title = own ? shortTeam(opponent) : `${shortTeam(game.home)} – ${shortTeam(game.away)}`;
  const place = own ? (game.home === OWN_TEAM ? 'Heim' : 'auswärts') : '';
  const block = showDate ? dateBlock(game.date) : '';
  const sub = [block ? '' : (showDate ? dayLabel(game, now) : ''), game.league, place, hasScore(game) ? '' : game.time].filter(Boolean).join(' · ');
  const end = hasScore(game)
    ? html`<span class="res num">${game.score[0]}:${game.score[1]}${own ? formBadge(outcome(game)) : ''}</span>`
    : icon('go');
  return listRow({title, sub, end, lead: block || crest(opponent || game.home, 'xs'), link: game.id ? href.spiel(game.id) : '', cls});
}

export function playerByNumber(number) { return SQUAD.find(p => p.number === Number(number)) || null; }
export const playerPhoto = number => SQUAD.some(p => p.number === Number(number)) ? `assets/players/${Number(number)}.webp` : null;

/** Nur Bilder über HTTPS; lokale Bildnamen der bisherigen App werden hier nicht mitgeliefert. */
export const storyImage = story => /^https:\/\//.test(story?.image || '') ? story.image : null;
export function storyRow(story) {
  const image = storyImage(story);
  return listRow({
    title: story.title, sub: story.date, end: '', link: href.artikel(story.id),
    lead: image ? html`<img class="thumb" src="${image}" alt="" loading="lazy" decoding="async" width="72" height="56">` : html`<span class="thumb thumb-empty" aria-hidden="true"><img src="${LOGO}" alt="" width="30" height="35"></span>`
  });
}

export function segment(items, current, label) {
  return html`<nav class="seg" aria-label="${label}">${items.map(([id, text, target, extra]) => html`<a href="${target}"${id === current ? html` class="on" aria-current="page"` : ''}>${extra || ''}${text}</a>`)}</nav>`;
}

/** Momente als waagrecht scrollbare Karten. */
export function momentCards(list) {
  if (!list.length) return '';
  return html`<section class="sec" aria-labelledby="j-mom"><div class="sh"><h2 class="h2" id="j-mom">Momente</h2></div>
    <ul class="moments" role="list">${list.map(m => html`<li class="moment">${m.link ? html`<a href="${href.spiel(m.link)}">${momentBody(m)}</a>` : m.player ? html`<a href="${href.spieler(m.player)}">${momentBody(m)}</a>` : html`<div>${momentBody(m)}</div>`}</li>`)}</ul></section>`;
}
const momentBody = m => html`<span class="tag">${m.tag}</span><b>${m.title}</b><span>${m.text}</span>`;

/** Tippspiel-Karte: vor Anpfiff veränderbar, danach gesperrt; nach dem Spiel mit Punkten. */
export function tipCard({game, tip, points, locked}) {
  const value = tip || [28, 26];
  const pts = points === null || points === undefined ? '' : html`<p class="tip-result"><b class="num">${points}</b> ${points === 1 ? 'Punkt' : 'Punkte'} · ${['daneben', 'richtige Tendenz', 'richtige Differenz', 'exakt getippt'][points]}</p>`;
  const side = (i, name) => html`<div class="tip-side"><span>${shortTeam(name)}</span>${locked ? '' : html`<button type="button" class="tip-btn" data-tip="${game.id + ':' + i + ':-1'}" aria-label="${shortTeam(name) + ' ein Tor weniger'}">−</button>`}<b class="num" aria-live="polite">${value[i]}</b>${locked ? '' : html`<button type="button" class="tip-btn" data-tip="${game.id + ':' + i + ':1'}" aria-label="${shortTeam(name) + ' ein Tor mehr'}">+</button>`}</div>`;
  return html`<section class="sec" aria-labelledby="${'tip-' + game.id}"><div class="sh"><h2 class="h2" id="${'tip-' + game.id}">Dein Tipp</h2></div>
    <div class="card tip">${side(0, game.home)}${side(1, game.away)}
      ${locked ? html`<p class="fine">${tip ? 'Tipp abgegeben.' : 'Kein Tipp abgegeben.'}</p>` : ''}${pts}</div></section>`;
}

/** Filter-Chips (schräg). data-ui="<name>:<wert>" wird in main.js in den UI-Zustand übernommen. */
export function chips(name, options, current, label) {
  return html`<div class="chips" role="group" aria-label="${label}">${options.map(([value, text]) => html`<button type="button" class="chip${value === current ? ' on' : ''}" data-ui="${name}:${value}" aria-pressed="${String(value === current)}">${text}</button>`)}</div>`;
}
