// Bewegung eines Spielzugs: aus den drei Schritten der Daten wird eine Zeitleiste (0 bis 6 Sekunden).
// frame(zug, t) berechnet daraus Orte, Blickrichtung, Nachbilder, Ball und Hinweis. Reine Funktionen: gleiche Eingabe, gleiches Bild,
// für Regler, Standbild, Wiedergabe und Tests. Keine Bibliothek, keine Zeitgeber.

export const STEP = 2;
export const DURATION = 6;
export const MARKS = [0, 2, 4];
const MOVE = [0.15, 1.55];      // Laufzeit innerhalb eines Schritts
const FLIGHT = {pass: [0.9, 0.7], shot: [0.9, 0.8]};  // Beginn im Schritt, Flugdauer (bei mehreren Pässen kürzer)
export const GOAL = [110, 9];
const HAND = [7, -6];            // Ball in der Hand: Abstand zur Spielermitte

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const ease = u => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const round = n => Math.round(n * 100) / 100;

/** Sanfter Bogen: quadratische Kurve, die Kontrollpunkt seitlich der Mitte liegt. */
function bow(a, b, e) {
  const len = dist(a, b);
  if (len < 12) return [lerp(a[0], b[0], e), lerp(a[1], b[1], e)];
  const c = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / len * len * 0.16, (a[1] + b[1]) / 2 + (b[0] - a[0]) / len * len * 0.16];
  const u = 1 - e;
  return [u * u * a[0] + 2 * u * e * c[0] + e * e * b[0], u * u * a[1] + 2 * u * e * c[1] + e * e * b[1]];
}

const cache = new WeakMap();
function plan(zug) {
  if (cache.has(zug)) return cache.get(zug);
  const pos = zug.steps.map(s => ({...zug.base, ...(s.at || {})}));
  const labels = Object.keys(zug.base);
  const shotEnd = (() => {
    for (let i = 0; i < zug.steps.length; i++) if (zug.steps[i].moves.some(m => m.k === 'shot')) return i * STEP + FLIGHT.shot[0] + FLIGHT.shot[1];
    return Infinity;
  })();
  const info = {pos, labels, shotEnd};
  cache.set(zug, info);
  return info;
}

export const stepAt = (zug, t) => clamp(Math.floor(t / STEP + 1e-9), 0, zug.steps.length - 1);

/** Ort eines Angreifers zur Zeit t. */
function attackerAt(zug, label, t) {
  const {pos} = plan(zug), n = pos.length, i = stepAt(zug, t), a = pos[i][label];
  if (!a) return null;
  const b = i < n - 1 ? pos[i + 1][label] || a : a;
  if (a[0] === b[0] && a[1] === b[1]) return a;
  return bow(a, b, ease(clamp((t - i * STEP - MOVE[0]) / (MOVE[1] - MOVE[0]), 0, 1)));
}

const keyframes = (keys, t) => {
  if (!keys?.length) return [0, 0];
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, x0, y0] = keys[i - 1], [t1, x1, y1] = keys[i], e = ease((t - t0) / (t1 - t0));
    return [lerp(x0, x1, e), lerp(y0, y1, e)];
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
};

/** Ort eines Verteidigers: Grundort, gleitet mit dem Ball zur Seite, dazu Eigenbewegungen aus den Daten. */
function defenderAt(zug, d, ballX, t) {
  if (d.l === 'TW') return [d.x, d.y];
  const slide = clamp((ballX - 110) * 0.1, -9, 9), [rx, ry] = keyframes(zug.react?.[d.l], t);
  return [d.x + slide + rx, d.y + ry];
}

/** Ballort: in der Hand, im Flug (Bogen, bei mehreren Pässen nacheinander) oder im Tor. */
function ballAt(zug, t) {
  const {labels, shotEnd} = plan(zug), i = stepAt(zug, t), step = zug.steps[i], next = zug.steps[i + 1];
  const holderPos = (label, tt) => {
    const p = attackerAt(zug, label, tt);
    return p ? [p[0] + HAND[0], p[1] + HAND[1]] : [GOAL[0], GOAL[1] + 20];
  };
  const nearest = (point, tt) => labels.reduce((best, l) => { const p = attackerAt(zug, l, tt); return p && dist(p, point) < best[1] ? [l, dist(p, point)] : best; }, [step.ball, Infinity])[0];
  if (t > shotEnd) return {x: GOAL[0], y: GOAL[1], lift: 0};
  const flights = step.moves.filter(m => m.k === 'pass' || m.k === 'shot'), multi = flights.length > 1;
  let holder = step.ball, start = i * STEP + (multi ? 0.6 : FLIGHT.pass[0]);
  for (let k = 0; k < flights.length; k++) {
    const fl = flights[k], length = multi ? 0.5 : FLIGHT[fl.k][1], f0 = start, f1 = f0 + length;
    if (t < f0) { const p = holderPos(holder, t); return {x: p[0], y: p[1], lift: 0}; }
    const receiver = fl.k === 'shot' ? null : k === flights.length - 1 ? (next?.ball ?? holder) : nearest(fl.to, f1);
    if (t <= f1) {
      const u = ease((t - f0) / (f1 - f0)), from = holderPos(holder, f0), to = fl.k === 'shot' ? GOAL : holderPos(receiver, f1);
      return {x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u), lift: Math.sin(Math.PI * u) * (fl.k === 'shot' ? 0.6 : 1)};
    }
    if (fl.k === 'shot') return {x: GOAL[0], y: GOAL[1], lift: 0};
    holder = receiver; start = f1;
  }
  const p = holderPos(holder, t);
  return {x: p[0], y: p[1], lift: 0};
}

const heading = (dx, dy) => round(Math.atan2(dx, -dy) * 180 / Math.PI);

/** Das Bild zur Zeit t: Spieler (Ort, Blickrichtung, Nachbilder), Ball, Hinweis, Schritt. */
export function frame(zug, rawT) {
  const t = clamp(rawT, 0, DURATION), {labels} = plan(zug), step = stepAt(zug, t);
  const ball = ballAt(zug, t);
  const players = labels.map(l => {
    const p = attackerAt(zug, l, t), before = attackerAt(zug, l, Math.max(0, t - 0.04)), after = attackerAt(zug, l, Math.min(DURATION, t + 0.04));
    const vx = (after[0] - before[0]) / 0.08, vy = (after[1] - before[1]) / 0.08, moving = Math.hypot(vx, vy) > 5;
    const echoes = [0.14, 0.28].map((d, k) => { const e = attackerAt(zug, l, Math.max(0, t - d)); return dist(e, p) > 2 ? {x: round(e[0]), y: round(e[1]), o: k ? 0.16 : 0.3} : null; }).filter(Boolean);
    return {l, team: 'a', x: round(p[0]), y: round(p[1]), angle: moving ? heading(vx, vy) : heading(GOAL[0] - p[0], GOAL[1] - p[1]), moving, echoes};
  });
  const defenders = zug.defenders.map(d => {
    const p = defenderAt(zug, d, ball.x, t);
    return {l: d.l, team: 'd', x: round(p[0]), y: round(p[1]), angle: heading(ball.x - p[0], ball.y - p[1]), moving: false, echoes: []};
  });
  const hint = (zug.hints || []).find(h => t >= h.t0 && t <= h.t1);
  const atMark = MARKS.findIndex(m => Math.abs(t - m) < 0.005);
  return {t: round(t), step, text: zug.steps[step].text, players: [...players, ...defenders], ball: {x: round(ball.x), y: round(ball.y), lift: round(ball.lift)},
    hint: hint ? {text: hint.text, x: hint.at[0], y: hint.at[1], k: round((t - hint.t0) / (hint.t1 - hint.t0))} : null, plan: atMark >= 0 ? atMark : null};
}

/** Zustand der Wiedergabe um dt Sekunden weiterschalten (dt in Echtzeit, speed: 1 oder 0,5). */
export function advance(state, dt) {
  if (!state.playing) return state;
  const t = state.t + dt * state.speed;
  return t >= DURATION ? {...state, t: DURATION, playing: false} : {...state, t};
}

/** Zustand der Wiedergabe am Anfang eines Schritts: steht still, Tempo 1. */
export const animKey = (zug, index) => `${zug.id}:${index}`;
export const startState = (zug, index) => ({key: animKey(zug, index), id: zug.id, t: MARKS[index], playing: false, speed: 1});

export const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
