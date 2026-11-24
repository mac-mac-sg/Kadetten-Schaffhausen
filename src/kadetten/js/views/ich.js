// Einstellungen (unter «Mein Bereich»): Mitteilungen, Kalender, Darstellung. Alles bleibt auf dem Gerät, ausser dem Push-Abo.
import {versionLabel} from '../config.js';
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {THEMES} from '../theme.js';
import {dataFreshness} from '../logic.js';
import {favourite} from '../personal.js';
import {PUSH_TYPES, readDevice, pushSupported} from '../push.js';
import {HALLEN} from '../../data/hallen.js';
import {backLink, subBand, sectionHead, listRow, playerByNumber} from './parts.js';

export function renderIch({theme, state, ui, now}) {
  const device = readDevice(),
    active = Boolean(device?.active),
    types = device?.types || PUSH_TYPES.map(t => t[0]);
  const supported = pushSupported();
  const fav = playerByNumber(favourite());
  const favShv = fav ? state.data?.playerSeason?.players?.[fav.number]?.shvPlayerId : null;
  const freshness = dataFreshness(state.data, now);
  const late = freshness.sources.filter(source => source.stale).map(source => source.name);
  const freshStatus = late.length
    ? 'Verzögert: ' + late.join(', ')
    : freshness.stale
      ? 'Aktualität bitte prüfen'
      : freshness.sources.length
        ? 'Alle Quellen aktuell'
        : 'Zeitpunkt der letzten Aktualisierung';
  const blocked = supported && globalThis.Notification?.permission === 'denied';
  return html`${subBand(backLink('Mein Bereich', href.ich()), 'Einstellungen', 'Mein Bereich')}
    <section class="sec"><div class="card list">${listRow({title: 'App einrichten', sub: 'Lieblingsspieler, Mitteilungen und Tipp in drei Schritten', link: href.start()})}</div></section>
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
          title: 'Meine Spiele und Tipps',
          sub: 'Besuchte Spiele und gespeicherte Tipps',
          lead: html`<span class="lead">${icon('verein')}</span>`,
          link: href.ich()
        })}
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
        ${listRow({title: 'Datenschutz und Über die App', sub: 'Keine Werbung, keine Cookies. Was wo gespeichert wird.', link: href.datenschutz()})}
      </div>
      <details class="card more-card aktuell" id="i-fresh">
        <summary><span class="grow"><span class="t">Aktualität der Daten</span><span class="s">${freshStatus}</span></span></summary>
        ${
          freshness.sources.length
            ? html`<div class="list">${freshness.sources.map(source =>
                listRow({
                  title: source.name,
                  sub: source.label + ' · Schweizer Zeit',
                  end: source.stale ? 'Verzögert' : 'Aktuell',
                  cls: 'compact'
                })
              )}</div>`
            : ''
        }
        <p class="fine pad-top-s">${freshness.label} · Schweizer Zeit${freshness.stale ? ' · Aktualität bitte prüfen' : ''}</p>
      </details>
      <p class="fine pad-top">Inoffizielle Fan-App, kein Angebot von Kadetten Schaffhausen. Daten: kadettensh.ch, Schweizerischer Handball-Verband, EHF.${versionLabel() ? ' ' + versionLabel() + '.' : ''}</p>
      <details class="card more-card" id="i-bilder">
        <summary><span class="grow"><span class="t">Bildnachweise</span><span class="s">Fotos der Spielhallen</span></span></summary>
        <div class="list">${HALLEN.filter(h => h.author).map(h =>
          listRow({title: h.title, sub: `${h.author} · ${h.license} · Wikimedia Commons`, end: icon('ext'), link: h.url, cls: 'compact'})
        )}</div>
        <p class="fine pad-top-s">Spielerfotos und Archivbilder: kadettensh.ch.</p>
      </details>
    </section>`;
}
