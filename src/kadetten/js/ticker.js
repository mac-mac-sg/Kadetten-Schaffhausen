import {html} from './text.js';
import {displayName, isOwn} from './match.js';
import {shortTeam} from './logic.js';
import {notice, sectionHead, chips} from './views/parts.js';
// Nur bestätigte Ereignisse: fehlende Ereignisse werden nie aus dem Spielstand erfunden.
export function tickerEvents(match) {
  const seen = new Set();
  return (Array.isArray(match?.details?.events) ? match.details.events : [])
    .filter(e => e && Number.isInteger(e.seconds) && e.seconds >= 0 && e.seconds <= 7200 && typeof e.action === 'string' && e.action.trim())
    .sort((a, b) => b.seconds - a.seconds || (Number(b.id) || 0) - (Number(a.id) || 0))
    .map(e => ({...e, key: String(e.id ?? [e.seconds, e.action, e.homePlayer, e.awayPlayer, e.score].join('|'))}))
    .filter(e => {
      if (seen.has(e.key)) return false;
      seen.add(e.key);
      return true;
    });
}
const GOAL_CODES = ['bFeldTor', 'b7mTor'];
const PENALTY_CODES = ['b2Min', 'bDoB', 'bDmB'];
const codes = e => [e.homeAction, e.awayAction].filter(Boolean);
const isGoal = e => codes(e).some(c => GOAL_CODES.includes(c)) || /^(7\s?m\s)?Tor\b/i.test(e.action);
const isPenalty = e => codes(e).some(c => PENALTY_CODES.includes(c)) || /zeitstrafe|disq|2\s?min/i.test(e.action);
const isEnd = e => codes(e).includes('bSchlussPfiff') || /schlusspfiff/i.test(e.action);

/** Art eines Ereignisses für den Fokus: 'tor', 'strafe', 'ende' oder null. */
export const eventKind = e => (isGoal(e) ? 'tor' : isPenalty(e) ? 'strafe' : isEnd(e) ? 'ende' : null);

/** Fokus des Tickers: Tore, Zeitstrafen und Disqualifikationen, dazu der Schlusspfiff. */
export const focusEvents = events => events.filter(e => eventKind(e));

/** Welche Mannschaft: 'home', 'away' oder null, wenn die Quelle es nicht angibt. */
const sideOf = e => (e.homeAction ? 'home' : e.awayAction ? 'away' : null);

/**
 * Ticker mit Fokus auf Tore und Strafen (Standard); «Alle Ereignisse» zeigt zusätzlich Paraden, Fehlwürfe, Time-outs und so weiter.
 * all: alle Ereignisse zeigen. Erkennt die Quelle keine Tore oder Strafen (zum Beispiel EHF), erscheint immer die ganze Liste.
 */
export function renderTicker(match, {all = false} = {}) {
  const every = tickerEvents(match);
  const focus = focusEvents(every);
  const filterable = focus.length > 0 && focus.length < every.length;
  const showAll = all || !filterable;
  const events = showAll ? every : focus;
  const label = {home: match?.home, away: match?.away};
  return html`<section class="sec ticker-section" aria-labelledby="g-ticker">${sectionHead('Liveticker', '', '', 'g-ticker')}
    ${match?.details?.ok === false ? notice('Die Ereignisquelle ist verzögert. Angezeigt wird der letzte verfügbare Stand.') : ''}
    ${
      events.length
        ? html`${
            filterable
              ? chips(
                  'tickerAll',
                  [
                    ['0', 'Tore und Strafen'],
                    ['1', `Alle Ereignisse (${every.length})`]
                  ],
                  showAll ? '1' : '0',
                  'Ereignisse'
                )
              : ''
          }
      <p class="fine">${showAll ? 'Bestätigte Ereignisse' : 'Tore und Zeitstrafen'} · neuestes zuerst</p>
      <ol class="event-list">
      ${events.map(e => {
        const kind = eventKind(e);
        const side = sideOf(e);
        const team = side && kind !== 'ende' && label[side] ? shortTeam(label[side]) : '';
        const own = side && isOwn(label[side]);
        const score = Array.isArray(e.score) && e.score.length === 2 && e.score.every(v => Number.isInteger(v) && v >= 0);
        return html`<li class="event" data-event-id="${e.key}"${kind ? html` data-kind="${kind}"` : ''}${side ? html` data-side="${own ? 'own' : 'opp'}"` : ''}><span class="event-minute num">${Math.floor(e.seconds / 60)}:${String(e.seconds % 60).padStart(2, '0')}</span><span class="event-body"><strong>${e.action}${team ? html` <em>${team}</em>` : ''}</strong>${
          e.homePlayer || e.awayPlayer
            ? html`<span>${[e.homePlayer, e.awayPlayer].filter(Boolean).map(displayName).join(' · ')}</span>`
            : ''
        }</span>${
          kind === 'strafe' && /zeitstrafe|2\s?min/i.test(e.action)
            ? html`<b class="event-score pen num">2′</b>`
            : score
              ? html`<b class="event-score num">${e.score[0]}:${e.score[1]}</b>`
              : ''
        }</li>`;
      })}</ol>`
        : notice(
            'Für dieses Spiel liefert die Quelle noch keine einzelnen Ereignisse. Spielstand und verfügbare Werte bleiben unter Übersicht und Statistik erreichbar.'
          )
    }
    <p class="fine pad-top">Quelle: ${/EHL|European League/.test(match?.league || '') ? 'EHF' : 'Schweizerischer Handball-Verband'} · Abruf alle 30 Sekunden</p>
      </section>`;
}
