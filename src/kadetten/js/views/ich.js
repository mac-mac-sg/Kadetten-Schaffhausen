// «Ich»: persönliche Funktionen und Einstellungen. Alles bleibt auf dem Gerät, ausser dem Push-Abo.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {THEMES} from '../theme.js';
import {OWN_TEAM, ownGames, shortTeam, dataFreshness} from '../logic.js';
import {favourite, myGames, tips} from '../personal.js';
import {PUSH_TYPES, readDevice, pushSupported} from '../push.js';
import {seasonSummary} from '../moments.js';
import {backLink, subBand, sectionHead, listRow, playerByNumber} from './parts.js';

function seasonBlock(state, now) {
  if (!state.data) return '';
  const sum = seasonSummary({games: state.data.games, visited: myGames(), tips: tips(), now});
  if (!sum.visits && !sum.tipped) return '';
  return html`<section class="sec" aria-labelledby="i-saison">${sectionHead('Deine Saison', '', '', 'i-saison')}
    <div class="card stats">
      <span class="stat"><span class="v num">${sum.visits}</span><span class="k">in der Halle</span></span>
      <span class="stat"><span class="v num">${sum.record.S}-${sum.record.U}-${sum.record.N}</span><span class="k">S-U-N live erlebt</span></span>
      <span class="stat"><span class="v num">${sum.tipped ? sum.points : '–'}</span><span class="k">${sum.tipped ? `Tipp-Punkte (${sum.exact} exakt)` : 'Tipp-Punkte'}</span></span>
    </div>
    <div class="acts single"><button class="btn" type="button" data-season-image>${icon('share')}Als Bild teilen</button></div>
  </section>`;
}

export function renderIch({theme, state, ui, now}) {
  const device = readDevice(),
    active = Boolean(device?.active),
    types = device?.types || PUSH_TYPES.map(t => t[0]);
  const supported = pushSupported();
  const fav = playerByNumber(favourite());
  const favShv = fav ? state.data?.playerSeason?.players?.[fav.number]?.shvPlayerId : null;
  const visited = myGames(),
    games = ownGames(state.data?.games).filter(g => visited.includes(String(g.id)));
  const freshness = dataFreshness(state.data, now);
  const blocked = supported && globalThis.Notification?.permission === 'denied';
  return html`${subBand(backLink('Zurück', href.jetzt()), 'Ich', 'Einstellungen')}
    <section class="sec" id="push" aria-labelledby="i-push">${sectionHead('Benachrichtigungen', '', '', 'i-push')}
      <div class="card list">
        ${PUSH_TYPES.filter(([id]) => id !== 'favourite' || (fav && favShv && ui.pushFavourite)).map(
          ([id, label]) =>
            html`<label class="rl switch"><span class="grow"><span class="t">${label}</span></span><input type="checkbox" role="switch" data-push-type="${id}"${types.includes(id) ? html` checked` : ''}${!supported || ui.pushBusy ? html` disabled` : ''}><span class="tg" aria-hidden="true"></span></label>`
        )}
      </div>
      <div class="acts single">${
        active
          ? html`<button class="btn" type="button" data-push="test"${ui.pushBusy ? html` disabled` : ''}>${icon('bell')}Test senden</button><button class="btn" type="button" data-push="disable"${ui.pushBusy ? html` disabled` : ''}>Ausschalten</button>`
          : html`<button class="btn pri" type="button" data-push="enable"${!supported || blocked || ui.pushBusy ? html` disabled` : ''}>${icon('bell')}Benachrichtigungen einschalten</button>`
      }</div>
      <p class="fine pad-top" role="status">${
        ui.pushMessage ||
        (!supported
          ? 'Dieses Gerät unterstützt hier keine Mitteilungen. Auf iPhone und iPad die App zuerst über «Zum Home-Bildschirm» installieren.'
          : blocked
            ? 'Mitteilungen sind blockiert. Bitte in den Einstellungen des Geräts erlauben.'
            : active
              ? 'Mitteilungen zu Kadetten-Spielen sind eingeschaltet.'
              : 'Hinweise zu Kadetten-Spielen, auch wenn die App geschlossen ist.')
      }</p>
    </section>
    <section class="sec" aria-labelledby="i-pers">${sectionHead('Persönlich', '', '', 'i-pers')}
      <div class="card list">
        ${listRow({
          title: 'Meine Spiele',
          sub: games.length
            ? `${games.length} ${games.length === 1 ? 'Spiel' : 'Spiele'} in der Halle`
            : 'Auf der Spielseite «Ich war in der Halle» antippen',
          lead: html`<span class="lead">${icon('verein')}</span>`,
          end: ''
        })}
        ${games
          .slice(-5)
          .reverse()
          .map(g =>
            listRow({
              title: `${shortTeam(g.home === OWN_TEAM ? g.away : g.home)}`,
              sub: g.date.split('-').reverse().join('.'),
              link: href.spiel(g.id),
              cls: 'compact indent'
            })
          )}
        ${listRow({
          title: 'Lieblingsspieler',
          sub: fav ? fav.name : 'Im Spielerprofil mit dem Stern merken',
          link: fav ? href.spieler(fav.number) : href.team(),
          lead: html`<span class="lead">${icon('star')}</span>`
        })}
        ${
          ui.calendarUrl
            ? html`<a class="rl" href="${ui.calendarUrl}"><span class="lead">${icon('cal')}</span><span class="grow"><span class="t">Kalender abonnieren</span><span class="s">Spiele erscheinen im Kalender und bleiben aktuell</span></span>${icon('ext')}</a>`
            : ''
        }
        <button class="rl" type="button" data-calendar>${html`<span class="lead">${icon('cal')}</span>`}<span class="grow"><span class="t">Spielplan in den Kalender</span><span class="s">Alle kommenden Kadetten-Spiele als Kalenderdatei</span></span>${icon('go')}</button>
      </div>
    </section>
    ${seasonBlock(state, now)}
    <section class="sec" aria-labelledby="i-dar">${sectionHead('Darstellung', '', '', 'i-dar')}
      <div class="seg flush" role="radiogroup" aria-labelledby="i-dar">
        ${THEMES.map(
          ([id, label]) =>
            html`<button type="button" role="radio" data-theme-choice="${id}" aria-checked="${String(id === theme)}"${id === theme ? html` class="on"` : ''}>${label}</button>`
        )}</div>
    </section>
    <section class="sec" aria-labelledby="i-app">${sectionHead('App', '', '', 'i-app')}
      <div class="card list">
        ${
          ui.canInstall
            ? html`<button class="rl" type="button" data-install><span class="lead">${icon('ich')}</span><span class="grow"><span class="t">App installieren</span><span class="s">Auf den Home-Bildschirm</span></span>${icon('go')}</button>`
            : ''
        }
        ${listRow({title: 'FC St. Gallen und St. Otmar', sub: 'in der App Matchday', link: '../', end: icon('ext')})}
        ${listRow({title: 'Datenschutz', sub: 'Keine Werbung, kein Tracking. Persönliches bleibt auf diesem Gerät.', end: ''})}
      </div>
      ${
        freshness.sources.length
          ? html`<div class="card list pad-top-s">
        ${freshness.sources.map(source =>
          listRow({
            title: source.name,
            sub: source.label + ' · Schweizer Zeit',
            end: source.stale ? 'Verzögert' : 'Aktuell',
            cls: 'compact'
          })
        )}</div>`
          : ''
      }
      <p class="fine pad-top">${freshness.label} · Schweizer Zeit${freshness.stale ? ' · Aktualität bitte prüfen' : ''}</p>
      <p class="fine pad-top">Inoffizielle Fan-App, kein Angebot von Kadetten Schaffhausen. Daten: kadettensh.ch, Schweizerischer Handball-Verband, EHF.</p>
    </section>`;
}
