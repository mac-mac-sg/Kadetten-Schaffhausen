// Bausteine der Spielvorschau: Aufmacher, «Worum geht es?» im Cup und Anreise zu Auswärtsspielen (Logik in js/vorschau.js).
import {html} from '../text.js';
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
