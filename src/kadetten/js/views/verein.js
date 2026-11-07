// «Verein»: Titel, Geschichte, Heimhalle. Keine Anreise- oder Türöffnungsangaben.
import {html} from '../text.js';
import {TROPHIES, HISTORY} from '../../data/club.js';
import {topBar, sectionHead, stats} from './parts.js';

export function renderVerein() {
  return html`${topBar('Verein', 'Kadetten Schaffhausen')}
    <section class="sec first"><div class="big-hero club"><img src="assets/squad.webp" alt="" width="800" height="450" decoding="async"><div class="bh-text"><h2 class="h1 xl">Kadetten Schaffhausen</h2><p>Handball aus Schaffhausen · Team 2026/27</p></div></div></section>
    <section class="sec" aria-labelledby="v-titel">${sectionHead('Titel', '', '', 'v-titel')}
      ${stats(TROPHIES.map(t => [t.years.length, t.short]))}
      ${TROPHIES.map(t => html`<details class="card more-card" id="${'v-' + t.id}"><summary>${t.title}</summary><p class="years num">${t.years.join(' · ')}</p></details>`)}
    </section>
    <section class="sec" aria-labelledby="v-gesch">${sectionHead('Geschichte', '', '', 'v-gesch')}
      <ol class="timeline">${HISTORY.map(h => html`<li class="card tl">
        ${/^https:\/\//.test(h.image) || h.image.startsWith('assets/') ? html`<figure><img src="${h.image}" alt="" loading="lazy" decoding="async"${h.image.endsWith('.png') ? html` class="contain"` : ''}><figcaption>${h.caption}</figcaption></figure>` : ''}
        <span class="year num">${h.year}</span><h3 class="h3">${h.title}</h3><p>${h.text}</p>${h.detail ? html`<p class="muted">${h.detail}</p>` : ''}</li>`)}</ol>
      <p class="fine pad-top">Archivbilder: Vereinsarchiv Kadetten Schaffhausen über kadettensh.ch.</p>
    </section>
    <section class="sec" aria-labelledby="v-halle">${sectionHead('Heimhalle', '', '', 'v-halle')}
      <div class="card hall"><img src="assets/bbc-arena.webp" alt="" loading="lazy" decoding="async"><div><h3 class="h3">BBC Arena</h3><p class="muted">Schaffhausen · Heimhalle der Kadetten in QHL und European League</p></div></div>
    </section>`;
}
