// Bausteine der Spielvorschau: Aufmacher, «Worum geht es?» im Cup und Anreise zu Auswärtsspielen (Logik in js/vorschau.js).
import {html, raw, escapeHtml} from '../text.js';
import {icon} from '../icons.js';
import {sectionHead, kpis} from './parts.js';

/** Aufmacher: Schlagzeile als Satz mit drei Fakten als schräge Marken. */
export function leadBlock(story) {
  if (!story) return '';
  return html`<section class="sec first lead-sec" aria-labelledby="g-lead"><p class="lead-k">${story.kicker}</p>
    <h2 class="lead-h" id="g-lead">${story.headline}</h2>
    ${story.facts.length ? html`<ul class="lead-facts" aria-label="Fakten">${story.facts.map(f => html`<li class="lead-fact${f.hot ? ' hot' : ''}">${f.text}</li>`)}</ul>` : ''}</section>`;
}

/** «Worum geht es?» im Schweizer Cup: Weiter oder Aus, kein Remis. */
export function cupStakes() {
  return html`<section class="sec" aria-labelledby="g-stake">${sectionHead('Worum geht es?', '', '', 'g-stake')}
    ${kpis([
      ['Weiter', 'Sieg', 'in die nächste Runde'],
      ['Aus', 'Niederlage', 'Cup beendet']
    ])}
    <p class="fine pad-top">Kein Remis: Gleichstand nach 60 Minuten geht in die Verlängerung.</p></section>`;
}

/** Anreise zu einem Auswärtsspiel: Halle, Route planen (Auto) und ÖV-Verbindung in der Karten-App. */
export function anreiseBlock(travel) {
  if (!travel) return '';
  return html`<section class="sec" aria-labelledby="g-anreise">${sectionHead('Anreise', '', '', 'g-anreise')}
    <div class="card anr">
      <p class="anr-t"><b>${travel.name}</b>${travel.place ? html`<span>${travel.place}</span>` : ''}</p>
      <div class="anr-b">
        <a class="btn pri" href="${travel.route}" target="_blank" rel="noopener noreferrer">${icon('ext')}Route planen</a>
        <a class="btn" href="${travel.transit}" target="_blank" rel="noopener noreferrer">${icon('ext')}ÖV-Verbindung</a>
      </div>
      <p class="fine">Fahrzeit und Verbindung zeigt die Karten-App. Die App rechnet nicht selbst.</p>
    </div></section>`;
}

// Umrisse der Karten (vereinfacht, eigene Vektoren): Schweiz mit 140 px je Grad, Europa mit 17 px; Ausschnitte wie in js/reise.js.
const CH_OUTLINE =
  'M161 55L181 55L220 46L239 38L253 21L272 25L277 35L312 41L342 66L349 95L346 126L380 150L401 154L436 151L434 186L404 241L349 231L325 203L298 267L291 297L282 277L267 259L243 238L203 245L186 280L121 291L93 284L86 259L86 221L24 252L10 255L33 217L24 189L57 154L91 119L100 98L105 84L105 63Z';
const EU_OUTLINE =
  'M-70 264L-74 233L-67 180L-72 160L14 155L21 110L-19 70L17 65L37 48L53 27L73 19L87 -7L116 -17L134 -26L132 -49L148 -78L157 -60L161 -32L197 -26L249 -39L278 -48L284 -85L319 -99L359 -119L394 -128L394 119L379 131L366 144L357 178L340 196L313 201L301 206L301 246L296 272L284 267L278 243L261 207L260 182L249 170L226 153L209 133L197 122L192 116L177 122L179 139L192 151L202 175L220 180L249 207L234 224L227 240L217 246L219 219L216 211L197 199L180 184L157 162L145 143L128 146L110 160L90 155L72 158L71 172L46 192L31 223L27 252L9 269L-27 280L-38 269L-51 260ZM-29 42L51 22L54 -5L32 -27L14 -56L12 -85L-6 -104L-29 -102L-35 -68L-23 -42L-2 -37L-20 -14L-14 2L-26 14L0 20Z';
const reduceMotion = () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** «Die Reise»: Strecke Schaffhausen – Spielort. Schweiz hell mit Umriss, Europa dunkel als Punktkarte. Linie und Punkt laufen in Schleife. */
export function reiseBlock(route) {
  if (!route) return '';
  const {kind, view, from, to, path, name, km, hall} = route,
    still = reduceMotion(),
    label = `Karte: Reise von Schaffhausen nach ${name}, ${km} Kilometer Luftlinie`;
  const move = still
    ? ''
    : `<animate attributeName="stroke-dashoffset" values="1;0;0;1" keyTimes="0;.55;.9;1" dur="5s" repeatCount="indefinite"/>`;
  const dot = still
    ? ''
    : `<circle class="rz-dot" r="6"><animateMotion dur="5s" repeatCount="indefinite" keyPoints="0;1;1;0" keyTimes="0;.55;.9;1" calcMode="linear"><mpath href="#rz-route"/></animateMotion></circle>`;
  const ground =
    kind === 'ch'
      ? `<path class="rz-land" d="${CH_OUTLINE}"/>`
      : `<defs><pattern id="rz-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle class="rz-pt" cx="4" cy="4" r="1.7"/></pattern><clipPath id="rz-clip"><path d="${EU_OUTLINE}"/></clipPath></defs><rect class="rz-grid" width="${view.w}" height="${view.h}" fill="url(#rz-dots)" clip-path="url(#rz-clip)"/>`;
  const svg = raw(`<svg class="rz-map" viewBox="0 0 ${view.w} ${view.h}" role="img" aria-label="${escapeHtml(label)}">${ground}
    <path id="rz-route" class="rz-base" d="${path}"/>
    <path class="rz-line" d="${path}" pathLength="1" ${still ? '' : 'stroke-dashoffset="1"'}>${move}</path>${dot}
    <circle class="rz-home" cx="${from.x}" cy="${from.y}" r="8"/><circle class="rz-away" cx="${to.x}" cy="${to.y}" r="8"/>
    <text class="rz-name" x="${from.x - 14}" y="${from.y - 12}" text-anchor="end">Schaffhausen</text>
    <text class="rz-name" x="${to.x + (kind === 'ch' ? 15 : 0)}" y="${to.y + (kind === 'ch' ? 24 : 29)}" text-anchor="${kind === 'ch' ? 'start' : 'middle'}">${escapeHtml(name)}</text>
  </svg>`);
  return html`<section class="sec" aria-labelledby="g-reise">${sectionHead('Die Reise', '', '', 'g-reise')}
    <div class="card reise ${kind}">${svg}
      <p class="rz-foot"><span class="rz-km num">${km}<small>km</small></span>
      <span class="rz-t"><b>Luftlinie nach ${name}</b><span>${hall}</span></span></p>
    </div></section>`;
}
