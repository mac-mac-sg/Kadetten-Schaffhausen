import {html} from './text.js';
import {displayName} from './match.js';
import {notice, sectionHead} from './views/parts.js';
// Nur bestätigte Ereignisse: fehlende Ereignisse werden nie aus dem Spielstand erfunden.
export function tickerEvents(match) {
  const seen = new Set();
  return (Array.isArray(match?.details?.events) ? match.details.events : [])
    .filter(e => e && Number.isInteger(e.seconds) && e.seconds >= 0 && e.seconds <= 7200 && typeof e.action === 'string' && e.action.trim())
    .sort((a,b) => b.seconds-a.seconds || (Number(b.id)||0)-(Number(a.id)||0))
    .map(e => ({...e,key:String(e.id ?? [e.seconds,e.action,e.homePlayer,e.awayPlayer,e.score].join('|'))}))
    .filter(e => {if(seen.has(e.key)) return false; seen.add(e.key); return true;});
}
export function renderTicker(match) {
  const events = tickerEvents(match);
  return html`<section class="sec ticker-section" aria-labelledby="g-ticker">${sectionHead('Liveticker','','','g-ticker')}
    ${match?.details?.ok === false ? notice('Die Ereignisquelle ist verzögert. Angezeigt wird der letzte verfügbare Stand.') : ''}
    ${events.length ? html`<p class="fine">Bestätigte Ereignisse · neuestes zuerst</p><ol class="event-list">${events.map(e => html`<li class="event" data-event-id="${e.key}"><span class="event-minute num">${Math.floor(e.seconds/60)}:${String(e.seconds%60).padStart(2,'0')}</span><span class="event-body"><strong>${e.action}</strong>${e.homePlayer || e.awayPlayer ? html`<span>${[e.homePlayer,e.awayPlayer].filter(Boolean).map(displayName).join(' · ')}</span>` : ''}</span>${Array.isArray(e.score) && e.score.length===2 && e.score.every(v=>Number.isInteger(v)&&v>=0) ? html`<b class="event-score num">${e.score[0]}:${e.score[1]}</b>` : ''}</li>`)}</ol>` : notice('Für dieses Spiel liefert die Quelle noch keine einzelnen Ereignisse. Spielstand und verfügbare Werte bleiben unter Übersicht und Statistik erreichbar.')}
    <p class="fine pad-top">Quelle: ${/EHL|European League/.test(match?.league||'') ? 'EHF' : 'Schweizerischer Handball-Verband'} · Abruf alle 30 Sekunden</p></section>`;
}
