// Wiedergabe eines Spielzugs: Abspielen, Pause, Regler, Tempo, Neu starten. Der Zeitgeber läuft nur, solange das Bild sichtbar ist.
import {article, spielzugOf} from './inhalt.js';
import {frame, advance, clock, DURATION, animKey, startState} from './bewegung.js';
import {updateFeld} from './feld.js';

export function createWissenSteuerung({
  ui,
  render,
  root = document,
  raf = globalThis.requestAnimationFrame?.bind(globalThis),
  cancel = globalThis.cancelAnimationFrame?.bind(globalThis),
  now = () => globalThis.performance.now(),
  visible = null
}) {
  let handle = 0,
    last = 0;
  const q = sel => root.querySelector(sel);

  /** Aktuelles Bild in die vorhandene Seite schreiben, ohne neu zu zeichnen. */
  function paint() {
    const st = ui.anim,
      zug = st && article(st.id),
      svg = q('svg.fb-live');
    if (!zug || !svg) return false;
    const f = frame(zug, st.t);
    updateFeld(svg, f);
    const scrub = q('.wk-scrub'),
      time = q('[data-wk-time]'),
      caption = q('[data-wk-caption]');
    const label = `Schritt ${f.step + 1} von ${zug.steps.length}`;
    if (scrub) {
      scrub.style.setProperty('--p', `${Math.round((f.t / DURATION) * 1000) / 10}%`);
      if (Number(scrub.value) !== Math.round(f.t * 1000)) scrub.value = Math.round(f.t * 1000);
      scrub.setAttribute('aria-valuetext', `${label}, ${clock(f.t)} von ${clock(DURATION)}`);
    }
    if (time) time.textContent = `${clock(f.t)} / ${clock(DURATION)}`;
    root.querySelectorAll('.wk-mk').forEach(a => {
      const on = Number(a.getAttribute('data-mark')) === f.step;
      a.setAttribute('class', 'chip wk-mk' + (on ? ' on' : ''));
      if (on) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    if (caption && caption.getAttribute('data-step') !== String(f.step)) {
      caption.setAttribute('data-step', String(f.step));
      const doc = caption.ownerDocument,
        b = doc.createElement('b');
      b.textContent = label + '.';
      caption.replaceChildren(b, doc.createTextNode(' ' + f.text));
    }
    return true;
  }

  const onScreenDefault = svg => {
    const r = svg.getBoundingClientRect?.();
    return typeof r?.bottom !== 'number' || (r.bottom > 0 && r.top < (globalThis.innerHeight || 1e9));
  };
  const stopTimer = () => {
    if (handle && cancel) cancel(handle);
    handle = 0;
  };
  function pause(redraw = true) {
    stopTimer();
    if (ui.anim?.playing) {
      ui.anim = {...ui.anim, playing: false};
      if (redraw) render();
    }
  }

  function tick(time) {
    handle = 0;
    if (!ui.anim?.playing) return;
    const svg = q('svg.fb-live');
    if (!svg || globalThis.document?.hidden || !(visible || onScreenDefault)(svg)) {
      pause(Boolean(svg));
      return;
    }
    const dt = Math.min((time - last) / 1000, 0.1);
    last = time;
    ui.anim = advance(ui.anim, dt);
    paint();
    if (ui.anim.playing) handle = raf(tick);
    else render();
  }

  function start() {
    ui.anim = {...ui.anim, playing: true};
    last = now();
    render();
    handle = raf(tick);
  }

  return {
    paint,
    stop: () => pause(false),
    /** Vor dem Zeichnen: Wechselt Spielzug oder Schritt-Adresse, beginnt die Wiedergabe neu am Anfang des Schritts. */
    sync(route) {
      if (route.view !== 'wissen' || route.chapter !== 'spielzuege') return;
      const {zug, index} = spielzugOf(route);
      if (ui.anim?.key !== animKey(zug, index)) {
        stopTimer();
        ui.anim = startState(zug, index);
      }
    },
    /** Knopf mit data-wk: play, speed, restart. */
    click(action) {
      const st = ui.anim;
      if (!st) return;
      if (action === 'play') {
        if (st.playing) pause();
        else {
          if (st.t >= DURATION - 0.01) ui.anim = {...st, t: 0};
          start();
        }
      } else if (action === 'speed') {
        ui.anim = {...st, speed: st.speed === 1 ? 0.5 : 1};
        render();
      } else if (action === 'restart') {
        stopTimer();
        ui.anim = {...st, t: 0};
        start();
      }
    },
    /** Regler gezogen (Wert in Millisekunden): Wiedergabe hält an. */
    seek(ms) {
      if (!ui.anim) return;
      const wasPlaying = ui.anim.playing;
      stopTimer();
      ui.anim = {...ui.anim, t: Math.min(DURATION, Math.max(0, ms / 1000)), playing: false};
      paint();
      if (wasPlaying) render();
    }
  };
}
