// «Jetzt»: richtet sich nach dem Spieltag. Gerüst aus Schritt 4; die vollständigen Inhalte folgen in Schritt 5.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {jetztState, countdown, dayLabel, kickoff, form, standings, OWN_TEAM, outcome} from '../logic.js';
import {topBar, sectionHead, heroCard, kickoffTime, scoreLine, formRow, notice} from './parts.js';

const STATE_TITLE = {alltag: 'Nächstes Spiel', spieltag: 'Heute', live: 'Live', nachspiel: 'Endresultat'};

export function renderJetzt({state: store, now}) {
  const {data, live} = store;
  if (!data) return html`${topBar('Jetzt')}<section class="sec">${notice(store.dataError ? 'Der Datenstand konnte nicht geladen werden.' : 'Datenstand wird geladen …', store.dataError ? 'offline' : 'jetzt')}</section>`;
  const {state, game} = jetztState({games: data.games, live, now});
  const meta = game ? [dayLabel(game, now) || 'Heute', game.league, game.venue?.split(',')[0]].filter(Boolean).join(' · ') : '';
  let hero = notice('Zurzeit ist kein Spiel angesetzt.', 'cal');
  if (game && state === 'live') {
    hero = heroCard({meta: [game.league, 'live'].filter(Boolean).join(' · '), pill: [game.phase, game.clock].filter(Boolean).join(' · ') || 'Live', live: true, home: game.home, away: game.away, middle: scoreLine(game.score), link: href.spiel(game.id),
      foot: html`<p class="fresh">${game.half ? html`<span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span>` : ''}${store.liveAt ? html`<span>Stand vor ${Math.max(0, Math.round((now - store.liveAt) / 1000))} s</span>` : ''}</p>`});
  } else if (game && state === 'nachspiel') {
    const result = outcome(game);
    hero = heroCard({meta, pill: result ? {S: 'S · Sieg', U: 'U · Unentschieden', N: 'N · Niederlage'}[result] : 'Endresultat', home: game.home, away: game.away, middle: scoreLine(game.score), link: game.id ? href.spiel(game.id) : '',
      foot: game.half ? html`<p class="fresh"><span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span></p>` : ''});
  } else if (game) {
    hero = heroCard({meta, pill: countdown(kickoff(game), now), home: game.home, away: game.away, middle: kickoffTime(game.time), link: href.spiel(game.id)});
  }
  const own = standings(data.tables?.QHL).find(r => r.team === OWN_TEAM);
  return html`${topBar('Jetzt')}
    <section class="sec">${sectionHead(STATE_TITLE[state])}${hero}</section>
    ${store.liveError && state === 'live' ? html`<section class="sec">${notice('Live-Stand im Moment nicht erreichbar. Es gilt der letzte bekannte Stand.')}</section>` : ''}
    <section class="sec">${sectionHead('Tabelle in Kürze', 'Ganze Tabelle', href.saison('tabellen'))}
      <div class="card stats">
        <span class="stat"><span class="v num">${own ? own.rank + '.' : '–'}</span><span class="k">QHL-Platz</span></span>
        <span class="stat"><span class="v num">${own?.points ?? '–'}</span><span class="k">Punkte</span></span>
        <span class="stat"><span class="v">${formRow(form(data.games, OWN_TEAM, 3))}</span><span class="k">Form</span></span>
      </div>
    </section>
    ${store.dataError ? html`<section class="sec">${notice('Keine Verbindung zum Datendienst. Angezeigt wird der zuletzt gespeicherte Stand.')}</section>` : ''}
    <section class="sec"><p class="note">${icon('doc', 18)}<span>Gerüst der neuen App. Die vollständigen Inhalte von «Jetzt» folgen im nächsten Schritt.</span></p></section>`;
}
