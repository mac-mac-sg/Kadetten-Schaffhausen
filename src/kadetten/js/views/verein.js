// «Verein»: Titel als grosse Zahlen, Wurzeln (1791), Heimhalle und Zugang zu Geschichte und Trophäenschrank.
// Keine Anreise- oder Türöffnungsangaben.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {TROPHIES, HISTORY} from '../../data/club.js';
import {topBar, backLink, subBand, sectionHead, listRow} from './parts.js';

const ROOTS = HISTORY.find(h => h.year === '1791');
const mark = html`<span class="mk" aria-hidden="true"></span>`;

function geschichte() {
  return html`${subBand(backLink('Verein', href.verein()), 'Geschichte', 'Kadetten Schaffhausen')}
    <section class="sec" aria-label="Zeitreise">
      <ol class="timeline">${HISTORY.map(h => html`<li class="card tl">
        ${/^https:\/\//.test(h.image) || h.image.startsWith('assets/') ? html`<figure><img src="${h.image}" alt="" loading="lazy" decoding="async"${h.image.endsWith('.png') ? html` class="contain"` : ''}><figcaption>${h.caption}</figcaption></figure>` : ''}
        <span class="year num">${h.year}</span><h2 class="h3">${h.title}</h2><p>${h.text}</p>${h.detail ? html`<p class="muted">${h.detail}</p>` : ''}</li>`)}</ol>
      <p class="fine pad-top">Archivbilder: Vereinsarchiv Kadetten Schaffhausen über kadettensh.ch.</p>
    </section>
    <section class="sec" aria-labelledby="v-halle">${sectionHead('Heimhalle', '', '', 'v-halle')}
      <div class="card hall"><img src="assets/bbc-arena.webp" alt="" loading="lazy" decoding="async"><div><h3 class="h3">BBC Arena</h3><p class="muted">Schaffhausen · Heimhalle der Kadetten in QHL und European League</p></div></div>
    </section>`;
}

function titel() {
  return html`${subBand(backLink('Verein', href.verein()), 'Trophäenschrank', 'Kadetten Schaffhausen')}
    <section class="sec" aria-label="Titel">
      ${TROPHIES.map(t => html`<details class="card more-card" id="${'v-' + t.id}"><summary>${t.title}<span class="num muted">${t.years.length}</span></summary><p class="years num">${t.years.join(' · ')}</p></details>`)}
      <p class="fine pad-top">Quelle: offizielles Matchprogramm 2026/27 der ersten Männermannschaft.</p>
    </section>`;
}

export function renderVerein({route} = {}) {
  if (route?.tab === 'geschichte') return geschichte();
  if (route?.tab === 'titel') return titel();
  return html`${topBar('Verein', 'Kadetten Schaffhausen')}
    <section class="sec after-band" aria-label="Titel der ersten Männermannschaft"><div class="stats big">${TROPHIES.map(t => html`<span class="stat"><span class="v num">${t.years.length}</span><span class="k">${t.short}</span></span>`)}</div></section>
    ${ROOTS ? html`<section class="sec"><div class="card roots stripe-edge"><span class="yr num">${ROOTS.year}</span><p>${ROOTS.text}</p></div></section>` : ''}
    <section class="sec"><div class="club-photo"><img src="assets/bbc-arena.webp" alt="Die BBC Arena in Schaffhausen, Heimhalle der Kadetten" loading="lazy" decoding="async"></div></section>
    <section class="sec"><div class="plain-list">
      ${listRow({title: 'Geschichte', sub: 'Zeitreise durch die Chronik', lead: mark, link: href.verein('geschichte')})}
      ${listRow({title: 'Trophäenschrank', sub: 'Titel und Jahre', lead: mark, link: href.verein('titel')})}
    </div></section>`;
}
