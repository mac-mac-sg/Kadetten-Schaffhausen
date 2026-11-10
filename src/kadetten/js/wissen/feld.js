// Feldbild: Spielfeldhälfte von oben als SVG aus Daten (Spieler als Figuren, Wege, Ball). Keine Bilder, keine style-Attribute.
// Zwei Arten: feldbild() für Standbilder (Positionen, Formationen, Vorschau) und liveFeld()/updateFeld() für die Wiedergabe eines Spielzugs.
import {html} from '../text.js';
import {GOAL} from './bewegung.js';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const num = n => Math.round(n * 10) / 10;

/** Pfeil von a nach b, an beiden Enden etwas gekürzt, damit er nicht unter den Spielern verschwindet. */
export function arrowPath([x1, y1], [x2, y2], {startGap = 9, endGap = 9} = {}) {
  const dx = x2 - x1,
    dy = y2 - y1,
    length = Math.hypot(dx, dy);
  if (length < startGap + endGap + 4) return '';
  const ux = dx / length,
    uy = dy / length;
  const sx = x1 + ux * startGap,
    sy = y1 + uy * startGap,
    ex = x2 - ux * endGap,
    ey = y2 - uy * endGap;
  const hx = ex - ux * 6,
    hy = ey - uy * 6;
  return `M${num(sx)} ${num(sy)}L${num(ex)} ${num(ey)}M${num(hx - uy * 3.4)} ${num(hy + ux * 3.4)}L${num(ex)} ${num(ey)}L${num(hx + uy * 3.4)} ${num(hy - ux * 3.4)}`;
}

// Hallenboden mit feinen Streifen, getöntem Torraum, Tor mit Netz und den Linien (6 m, 9 m gestrichelt, 7-m-Marke).
const STRIPES = [22, 66, 110, 154, 198];
const NET = 'M94 4.5h32M94 7h32' + [98, 102, 106, 110, 114, 118, 122].map(x => `M${x} 2v7`).join('');
const court = html`${STRIPES.map(x => html`<rect class="fb-stripe" x="${x}" y="0" width="22" height="150"/>`)}
    <path class="fb-area" d="M52 10A58 58 0 0 0 168 10Z"/>
    <path class="fb-net" d="${NET}"/>
    <rect class="fb-goal" x="94" y="2" width="32" height="7"/>
    <line class="fb-line" x1="4" y1="10" x2="216" y2="10"/>
    <path class="fb-line fb-6m" d="M52 10A58 58 0 0 0 168 10"/>
    <path class="fb-line fb-9m" d="M22 10A88 88 0 0 0 198 10"/>
    <line class="fb-line fb-7m" x1="104" y1="78" x2="116" y2="78"/>`;

/** Blickrichtung in Grad (0 = nach oben): Angreifer zum Tor, Verteidiger vom Tor weg. */
const facing = (p, tx, ty) => Math.round((Math.atan2(tx - p.x, -(ty - p.y)) * 180) / Math.PI);
const staticAngle = p => (p.team === 'd' ? facing(p, 110, 150) : facing(p, GOAL[0], GOAL[1]));

const body = html`<ellipse class="fb-sh" rx="9.2" ry="5.8"/><path class="fb-nose" d="M-2.2 -8.2L0 -11.4L2.2 -8.2Z"/>`;
const figure = (p, angle, extra = '') =>
  html`<g class="fb-p fb-${p.team}${p.ghost ? ' fb-ghost' : ''}${p.hl ? ' fb-hl' : ''}${extra}" data-l="${p.l}" transform="translate(${num(p.x)} ${num(p.y)})">
    <ellipse class="fb-shadow" cx="1.5" cy="2.5" rx="9.5" ry="5.6"/>
    <g class="fb-body" transform="rotate(${angle})">
    ${body}</g>
    <text y="3">${p.l}</text></g>`;
const mark = m => {
  const w = 8 + String(m.l).length * 5.4;
  return html`<g class="fb-mark">
    <rect x="${num(m.x - w / 2)}" y="${num(m.y - 6.5)}" width="${num(w)}" height="13" rx="6.5"/>
    <text x="${num(m.x)}" y="${num(m.y + 3.2)}" text-anchor="middle">${m.l}</text></g>`;
};
const attrsFor = (label, mini) => (mini ? html`aria-hidden="true"` : html`role="img" aria-label="${label}"`);

/** Standbild. players: [{l, x, y, team: 'a'|'d', ghost?, hl?}], marks: [{l, x, y}], moves: [{k: 'run'|'pass'|'shot', from, to}], ball: Beschriftung des Ballführenden. */
export function feldbild({label, players = [], marks = [], moves = [], ball = null, mini = false}) {
  const holder = ball ? players.find(p => p.l === ball && p.team === 'a') : null;
  return html`<figure class="fb${mini ? ' mini' : ''}"><svg viewBox="0 0 220 150" ${attrsFor(label, mini)} focusable="false">
    ${court}
    ${moves.map(m => html`<path class="fb-m fb-${m.k}" d="${arrowPath(m.from, m.to, {endGap: m.k === 'shot' ? 1 : 9})}"/>`)}
    ${marks.map(mark)}
    ${players.map(p => figure(p, staticAngle(p)))}
    ${holder ? html`<circle class="fb-ball" cx="${num(clamp(holder.x + 8, 8, 212))}" cy="${num(holder.y - 8)}" r="3.6"/>` : ''}
  </svg></figure>`;
}

/** Spieler eines Spielzug-Schritts: Grundaufstellung, die Schritt-Positionen überschreiben einzelne Spieler. */
export function stepPlayers(zug, index) {
  const step = zug.steps[index],
    at = {...zug.base, ...(step.at || {})};
  return [...Object.entries(at).map(([l, [x, y]]) => ({l, x, y, team: 'a'})), ...zug.defenders];
}

// ---- Wiedergabe: Figuren, Nachbilder, Ball, Hinweis und die geplanten Wege des Schritts werden pro Bild umgesetzt ----
const pillWidth = text => num(14 + String(text).length * 4.9);
const hintBox = h => {
  const w = pillWidth(h.text),
    x = num(clamp(h.x - w / 2, 3, 217 - w)),
    y = num(clamp(h.y - 28, 12, 134)),
    mx = num(x + w / 2),
    my = num(y + 7);
  // Schräger Anschnitt wie überall in der App (8°), um die Mitte der Pille gekippt.
  return {
    w,
    x,
    y,
    tx: num(clamp(h.x, w / 2 + 3, 217 - w / 2)),
    ring: num(11 + 3 * Math.abs(Math.sin(h.k * 9))),
    skew: `translate(${mx} ${my}) skewX(-8) translate(${-mx} ${-my})`
  };
};

/** Feldbild eines Spielzugs zur Zeit des Bildes f (aus frame()). Danach nur noch updateFeld(svg, f). */
export function liveFeld({label, zug, f}) {
  const hb = f.hint ? hintBox(f.hint) : {w: 40, x: 0, y: 0, tx: 20, ring: 11, skew: ''};
  return html`<figure class="fb live"><svg class="fb-live" viewBox="0 0 220 150" role="img" aria-label="${label}" focusable="false">
    ${court}
    ${zug.steps.map(
      (s, i) => html`<g class="fb-plan${f.plan === i ? '' : ' fb-off'}" data-plan="${i}">
      ${s.moves.map(m => html`<path class="fb-m fb-${m.k}" d="${arrowPath(m.from, m.to, {endGap: m.k === 'shot' ? 1 : 9})}"/>`)}</g>`
    )}
    ${f.players.flatMap(p =>
      p.team === 'a'
        ? [0, 1].map(
            k =>
              html`<ellipse class="fb-echo${p.echoes[k] ? '' : ' fb-off'}" data-e="${p.l}:${k}" cx="${p.echoes[k]?.x ?? 0}" cy="${p.echoes[k]?.y ?? 0}" rx="9.2" ry="5.8" opacity="${p.echoes[k]?.o ?? 0}" transform="rotate(${p.angle} ${p.echoes[k]?.x ?? 0} ${p.echoes[k]?.y ?? 0})"/>`
          )
        : []
    )}
    ${f.players.map(p => figure(p, p.angle))}
    <g class="fb-ballg">
      <ellipse class="fb-ballshadow" cx="${num(f.ball.x + 1)}" cy="${num(f.ball.y + 2)}" rx="3.4" ry="1.9"/>
      <circle class="fb-ball" cx="${num(f.ball.x)}" cy="${num(f.ball.y - f.ball.lift * 8)}" r="${num(3.6 * (1 + f.ball.lift * 0.4))}"/></g>
    <g class="fb-hint${f.hint ? '' : ' fb-off'}">
      <circle class="fb-ring" cx="${f.hint ? f.hint.x : 0}" cy="${f.hint ? f.hint.y : 0}" r="${hb.ring}"/>
      <rect class="fb-pill" x="${hb.x}" y="${hb.y}" width="${hb.w}" height="14" transform="${hb.skew}"/>
      <text class="fb-pilltext" x="${hb.tx}" y="${hb.y + 10}" text-anchor="middle">${f.hint ? f.hint.text : ''}</text></g>
  </svg></figure>`;
}

const setOff = (el, off) => {
  if (el) el.setAttribute('class', el.getAttribute('class').replace(/\s*fb-off/, '') + (off ? ' fb-off' : ''));
};

/** Bild f in ein vorhandenes liveFeld-SVG schreiben: nur Attribute, keine neuen Elemente. */
export function updateFeld(svg, f) {
  for (const p of f.players) {
    const g = svg.querySelector(`g.fb-p[data-l="${p.l}"][class*="fb-${p.team}"]`);
    if (!g) continue;
    g.setAttribute('transform', `translate(${num(p.x)} ${num(p.y)})`);
    g.querySelector('.fb-body')?.setAttribute('transform', `rotate(${p.angle})`);
    if (p.team !== 'a') continue;
    for (const k of [0, 1]) {
      const e = svg.querySelector(`ellipse[data-e="${p.l}:${k}"]`),
        echo = p.echoes[k];
      if (!e) continue;
      setOff(e, !echo);
      if (echo) {
        e.setAttribute('cx', echo.x);
        e.setAttribute('cy', echo.y);
        e.setAttribute('opacity', echo.o);
        e.setAttribute('transform', `rotate(${p.angle} ${echo.x} ${echo.y})`);
      }
    }
  }
  const ball = svg.querySelector('circle.fb-ball'),
    shadow = svg.querySelector('.fb-ballshadow');
  if (ball) {
    ball.setAttribute('cx', num(f.ball.x));
    ball.setAttribute('cy', num(f.ball.y - f.ball.lift * 8));
    ball.setAttribute('r', num(3.6 * (1 + f.ball.lift * 0.4)));
  }
  if (shadow) {
    shadow.setAttribute('cx', num(f.ball.x + 1));
    shadow.setAttribute('cy', num(f.ball.y + 2));
  }
  svg.querySelectorAll('g.fb-plan').forEach(g => setOff(g, Number(g.getAttribute('data-plan')) !== f.plan));
  const hint = svg.querySelector('g.fb-hint');
  setOff(hint, !f.hint);
  if (f.hint && hint) {
    const hb = hintBox(f.hint),
      ring = hint.querySelector('.fb-ring'),
      pill = hint.querySelector('.fb-pill'),
      text = hint.querySelector('.fb-pilltext');
    ring.setAttribute('cx', f.hint.x);
    ring.setAttribute('cy', f.hint.y);
    ring.setAttribute('r', hb.ring);
    pill.setAttribute('x', hb.x);
    pill.setAttribute('y', hb.y);
    pill.setAttribute('width', hb.w);
    pill.setAttribute('transform', hb.skew);
    text.setAttribute('x', hb.tx);
    text.setAttribute('y', hb.y + 10);
    text.textContent = f.hint.text;
  }
}
