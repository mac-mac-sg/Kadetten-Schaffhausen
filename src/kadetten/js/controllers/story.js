// Steuerung der Geschichten (Saisonrückblick #/rueckblick, Spiel-Story #/spiel/<id>/kurz): Karte weiter oder zurück
// (Tippen, Wischen, Pfeiltasten), Zeitsteuerung mit 5 Sekunden je Karte, Pause und Teilen. Die Darstellung steht in
// views/story.js, die Zustände (rbStep, rbPaused, rbManual, rbAuto) in ui.
import {parseRoute} from '../router.js';
import {shareImage, recapCard} from '../share-image.js';
import {recapInput, recapTiles} from '../views/rueckblick.js';
import {recap} from '../rueckblick.js';

const RB_MS = 5000;
const REDUCED = '(prefers-reduced-motion: reduce)';
const IGNORED = 'a, .rb-share, .rb-pause'; // dort löst Halten keine Pause aus

export const isStory = route => route.view === 'rueckblick' || (route.view === 'spiel' && route.tab === 'kurz');

export function createStory({app, ui, store, render, announce}, gestures) {
  let timer = null,
    holding = false, // Finger liegt auf einer Karte (Pause)
    held = false;
  let clock = {key: '', start: 0, done: 0, running: false};

  const step = (dir, manual = true) => {
    const count = app.querySelectorAll('.rb-bars i').length;
    if (!count) return;
    const next = Math.min(Math.max(0, (ui.rbStep || 0) + dir), count - 1);
    if (next === (ui.rbStep || 0)) return;
    const focused = document.activeElement?.matches?.('[data-rb]');
    ui.rbStep = next;
    // Nur ein Wechsel von Hand wird vom Screenreader vorgelesen, nicht jeder automatische.
    ui.rbManual = manual;
    render();
    // Fokus nur weitergeben, wenn er schon auf einer Tippfläche lag (Tab-Taste), sonst kein Rahmen über der Karte.
    if (focused) app.querySelector(dir > 0 ? '[data-rb="next"]' : '[data-rb="prev"]')?.focus({preventScroll: true});
  };

  // Angehalten wird durch den Pause-Knopf, die Leertaste, Halten mit dem Finger oder einen verborgenen Tab.
  const wantsPause = () => Boolean(ui.rbPaused) || held || document.hidden;
  function sync() {
    clearTimeout(timer);
    const box = app.querySelector('.rb');
    if (!box || !isStory(parseRoute(location.hash))) {
      clock.key = '';
      return;
    }
    const key = location.hash + ':' + box.dataset.rbStep,
      now = performance.now();
    if (key !== clock.key) clock = {key, start: now, done: 0, running: true};
    const pause = wantsPause();
    if (clock.running && pause) {
      clock.done += now - clock.start;
      clock.running = false;
    } else if (!clock.running && !pause) {
      clock.start = now;
      clock.running = true;
    }
    const bar = box.querySelector('.rb-bars i.now');
    const elapsed = clock.done + (clock.running ? now - clock.start : 0);
    // Nach einem Neuzeichnen (z. B. neue Daten) läuft der Balken dort weiter, wo er war.
    if (bar) bar.style.setProperty('--rb-elapsed', `-${Math.round(elapsed)}ms`);
    box.classList.toggle('paused', pause);
    if (!bar || !clock.running) return;
    timer = setTimeout(() => step(1, false), Math.max(0, RB_MS - elapsed));
  }
  const togglePause = () => {
    ui.rbPaused = !ui.rbPaused;
    render();
  };

  async function share() {
    const r = recap(recapInput(store.state, Date.now()));
    const fan = r.slides.find(s => s.id === 'fan');
    announce('Bild wird erstellt …');
    await shareImage(await recapCard({fan: fan.name, tiles: recapTiles(r)}), 'kadetten-saisonrueckblick.png', 'Meine Kadetten-Saison');
  }

  // Halten pausiert; wer länger als 300 ms hält, blättert beim Loslassen nicht weiter. Wischen blättert.
  gestures.zone({
    selector: '.rb',
    press(event) {
      if (event.target.closest(IGNORED)) return;
      holding = held = true;
      sync();
    },
    release({held: ms}) {
      if (!holding) return;
      if (ms > 300) gestures.suppressClick();
      holding = held = false;
      sync();
    },
    swipe: dir => step(dir)
  });
  // Pfeiltasten wirken auf der ganzen Seite, die Leertaste schaltet die Pause um (ausser auf Knöpfen mit eigener Wirkung).
  document.addEventListener('keydown', event => {
    if (!isStory(parseRoute(location.hash))) return;
    if (event.key === ' ' && !event.target.closest?.('a, input, .rb-share, .rb-pause')) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  });
  document.addEventListener('visibilitychange', sync);

  return {
    actions: [
      ['data-rb-pause', togglePause],
      ['data-rb', el => step(el.dataset.rb === 'next' ? 1 : -1), {ignoreAfterSwipe: true}],
      ['data-rb-share', share]
    ],
    focusAttrs: ['data-rb', 'data-rb-pause'],
    // Bei «Bewegung reduzieren» gibt es keine Automatik.
    beforeRender: () => (ui.rbAuto = !matchMedia(REDUCED).matches),
    afterRender: sync,
    // Eine Geschichte beginnt beim Öffnen immer mit der ersten Karte.
    onEnter(route, entry) {
      if (!entry.restore && isStory(route)) Object.assign(ui, {rbStep: 0, rbPaused: false, rbManual: false});
    }
  };
}
