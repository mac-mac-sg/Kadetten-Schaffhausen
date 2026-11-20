// Mitteilungen (Web Push) und das Angebot von Kalender-Abo und Tor-Mitteilungen, sobald der Datendienst sie bereitstellt.
import {API_ORIGIN} from '../config.js';
import {PUSH_TYPES} from '../push.js';
import {favourite} from '../personal.js';

export function createPushController({app, ui, store, push, render, schedule}) {
  /** SHV-Kennung des Lieblingsspielers (für Tor-Mitteilungen) oder null. */
  const favouriteShv = nr => (nr ? store.state.data?.playerSeason?.players?.[nr]?.shvPlayerId || null : null);

  async function act(action, shv) {
    if (ui.pushBusy) return;
    const types = [...app.querySelectorAll('[data-push-type]:checked')].map(i => i.dataset.pushType).filter(t => t !== 'favourite' || shv);
    Object.assign(ui, {pushBusy: true, pushMessage: 'Wird eingerichtet …'});
    render();
    try {
      if (action === 'enable') {
        await push.enable(
          types.length ? types : PUSH_TYPES.map(t => t[0]).filter(t => t !== 'favourite' || (shv && ui.pushFavourite)),
          shv
        );
        ui.pushMessage = 'Benachrichtigungen sind eingeschaltet.';
      }
      if (action === 'disable') {
        await push.disable();
        ui.pushMessage = 'Benachrichtigungen sind ausgeschaltet.';
      }
      if (action === 'test') {
        await push.test(shv);
        ui.pushMessage = 'Test an den Push-Dienst übergeben. Bitte die Mitteilungen auf dem Gerät prüfen.';
      }
      if (action === 'update') {
        await push.update(types, shv);
        ui.pushMessage = 'Auswahl gespeichert.';
      }
    } catch (error) {
      ui.pushMessage = error.message || 'Das hat nicht geklappt. Bitte erneut versuchen.';
    }
    ui.pushBusy = false;
    render();
  }

  app.addEventListener('change', event => {
    if (event.target.matches('[data-push-type]') && push.device()?.active) act('update', favouriteShv(favourite()));
  });

  return {
    favouriteShv,
    actions: [['data-push', el => act(el.dataset.push, favouriteShv(favourite()))]],
    focusAttrs: ['data-push-type', 'data-push'],
    /** Ein bestehendes Push-Abo mit Tor-Mitteilungen folgt dem neuen Lieblingsspieler. */
    followFavourite() {
      const device = push.device();
      if (device?.active && device.types?.includes('favourite')) {
        const shv = favouriteShv(favourite());
        push.update(shv ? device.types : device.types.filter(x => x !== 'favourite'), shv).catch(() => {});
      }
    },
    /** Nach dem ersten Laden: Abo wiederherstellen. */
    restore() {
      push
        .restore(favouriteShv(favourite()))
        .then(schedule)
        .catch(error => {
          ui.pushMessage = error.message;
          schedule();
        });
    },
    /** Kalender-Abo und Tor-Mitteilungen erst anbieten, wenn der Datendienst die Endpunkte bereitstellt. */
    probeCalendar() {
      fetch((API_ORIGIN || '') + '/api/app/calendar.ics', {method: 'HEAD', credentials: 'omit', cache: 'no-store'})
        .then(r => {
          if (!r.ok) return;
          const url = new URL((API_ORIGIN || location.origin) + '/api/app/calendar.ics');
          ui.calendarUrl = url.protocol === 'https:' ? 'webcal://' + url.host + url.pathname : url.href;
          ui.pushFavourite = true;
          schedule();
        })
        .catch(() => {});
    }
  };
}
