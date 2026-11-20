// Steuerung der Sammelkarten: Karten abholen, im Fächer aufdecken und nach vorne holen (Tippen, Wischen, Pfeiltasten),
// Karte in der Ansicht umdrehen. Umgedreht und aufgedeckt wird nur über Klassen, damit die Bewegung als Übergang läuft.
import {claim} from '../sammeln.js';
import {href} from '../router.js';
import {sammelInput} from '../views/sammlung.js';

export function createCards({app, ui, store, render, announce}, gestures) {
  /** Holt eine aufgedeckte Karte im Fächer nach vorne. */
  function fanTop(id) {
    ui.fanTop = id;
    for (const el of app.querySelectorAll('.fan-c'))
      el.classList.toggle('is-top', el.dataset.reveal === id && el.classList.contains('is-open'));
  }

  /** Karte umdrehen mit kurzem Anheben und Nachfedern. */
  function flip(id) {
    const back = ui.flip !== id;
    ui.flip = back ? id : '';
    const card = app.querySelector(`[data-flipcard="${CSS.escape(id)}"]`);
    if (card) {
      card.classList.toggle('is-back', back);
      card.setAttribute('aria-pressed', String(back));
      card.querySelectorAll('.sk-face').forEach((face, i) => face.setAttribute('aria-hidden', String(i === 0 ? back : !back)));
      card.classList.remove('bump');
      void card.offsetWidth;
      card.classList.add('bump');
    }
    const button = app.querySelector(`button[data-flip="${CSS.escape(id)}"]`);
    button?.setAttribute('aria-pressed', String(back));
    const label = button?.querySelector('span');
    if (label) label.textContent = back ? 'Vorderseite' : 'Umdrehen';
  }

  /** Neue Karten aufdecken, nacheinander, damit jede ihre eigene Drehung bekommt. */
  function reveal(ids) {
    const slow = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    ids.forEach((id, i) =>
      setTimeout(
        () => {
          if (!(ui.revealed ||= []).includes(id)) ui.revealed.push(id);
          app.querySelector(`[data-reveal="${CSS.escape(id)}"]`)?.classList.add('is-open');
          fanTop(id);
          if (i === ids.length - 1) setTimeout(render, slow ? 700 : 0);
        },
        slow ? i * 260 : 0
      )
    );
  }

  /** Wischen oder Pfeiltaste: nächste oder vorherige Karte nach vorne (verdeckte werden dabei aufgedeckt). */
  function fanStep(dir) {
    const ids = ui.newCards || [];
    if (!ids.length) return;
    const at = ids.indexOf(ui.fanTop),
      next = ids[(at < 0 ? (dir > 0 ? 0 : ids.length - 1) : at + dir + ids.length) % ids.length];
    if ((ui.revealed || []).includes(next)) fanTop(next);
    else reveal([next]);
  }

  gestures.zone({selector: '.fan', swipe: fanStep});
  app.addEventListener('keydown', event => {
    const flipping = event.target.closest?.('[data-flipcard]');
    if (flipping && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      flip(flipping.dataset.flipcard);
      return;
    }
    if (!event.target.closest?.('.fan') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    fanStep(event.key === 'ArrowRight' ? 1 : -1);
    app.querySelector(`[data-reveal="${CSS.escape(ui.fanTop || '')}"]`)?.focus();
  });

  return {
    // Ein Antippen irgendwo auf der Karte in der Ansicht dreht sie um.
    early: [{selector: '[data-flipcard]', run: el => (flip(el.dataset.flipcard), true)}],
    actions: [
      [
        'data-claim',
        () => {
          ui.newCards = claim(sammelInput(store.state));
          ui.revealed = [];
          ui.fanTop = '';
          announce(ui.newCards.length === 1 ? 'Eine neue Karte gesammelt.' : `${ui.newCards.length} neue Karten gesammelt.`);
          location.hash = href.neu();
        }
      ],
      ['data-flip', el => flip(el.dataset.flip)],
      [
        'data-reveal',
        el => {
          // Verdeckt: aufdecken. Offen, aber hinten: nach vorne holen. Offen und vorne: Karte öffnen.
          const id = el.dataset.reveal;
          if (!(ui.revealed || []).includes(id)) reveal([id]);
          else if (ui.fanTop !== id) fanTop(id);
          else location.hash = href.karte(id);
        },
        {ignoreAfterSwipe: true}
      ],
      ['data-reveal-all', () => reveal((ui.newCards || []).filter(id => !(ui.revealed || []).includes(id)))]
    ],
    focusAttrs: ['data-flip', 'data-flipcard', 'data-reveal']
  };
}
