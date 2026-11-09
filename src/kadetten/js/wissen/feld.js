// Feldbild: schematische Spielfeldhälfte als SVG aus Daten (Spieler, Wege, Ball). Keine Bilder, keine style-Attribute.
import {html} from '../text.js';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const num = n => Math.round(n * 10) / 10;

/** Pfeil von a nach b, an beiden Enden etwas gekürzt, damit er nicht unter den Spielerkreisen verschwindet. */
export function arrowPath([x1, y1], [x2, y2], {startGap = 9, endGap = 9} = {}) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (length < startGap + endGap + 4) return '';
  const ux = dx / length, uy = dy / length;
  const sx = x1 + ux * startGap, sy = y1 + uy * startGap, ex = x2 - ux * endGap, ey = y2 - uy * endGap;
  const hx = ex - ux * 6, hy = ey - uy * 6;
  return `M${num(sx)} ${num(sy)}L${num(ex)} ${num(ey)}M${num(hx - uy * 3.4)} ${num(hy + ux * 3.4)}L${num(ex)} ${num(ey)}L${num(hx + uy * 3.4)} ${num(hy - ux * 3.4)}`;
}

const dot = p => html`<g class="fb-p fb-${p.team}${p.ghost ? ' fb-ghost' : ''}${p.hl ? ' fb-hl' : ''}"><circle cx="${num(p.x)}" cy="${num(p.y)}" r="8.5"/><text x="${num(p.x)}" y="${num(p.y + 3.4)}" text-anchor="middle">${p.l}</text></g>`;
const mark = m => {
  const w = 8 + String(m.l).length * 5.4;
  return html`<g class="fb-mark"><rect x="${num(m.x - w / 2)}" y="${num(m.y - 6.5)}" width="${num(w)}" height="13" rx="6.5"/><text x="${num(m.x)}" y="${num(m.y + 3.2)}" text-anchor="middle">${m.l}</text></g>`;
};

/** players: [{l, x, y, team: 'a'|'d', ghost?, hl?}], marks: [{l, x, y}], moves: [{k: 'run'|'pass'|'shot', from, to}], ball: Beschriftung des Ballführenden. */
export function feldbild({label, players = [], marks = [], moves = [], ball = null, mini = false}) {
  const holder = ball ? players.find(p => p.l === ball && p.team === 'a') : null;
  const attrs = mini ? html`aria-hidden="true"` : html`role="img" aria-label="${label}"`;
  return html`<figure class="fb${mini ? ' mini' : ''}"><svg viewBox="0 0 220 150" ${attrs} focusable="false">
    <rect class="fb-goal" x="94" y="2" width="32" height="7"/>
    <line class="fb-line" x1="4" y1="10" x2="216" y2="10"/>
    <path class="fb-line fb-6m" d="M52 10A58 58 0 0 0 168 10"/>
    <path class="fb-line fb-9m" d="M22 10A88 88 0 0 0 198 10"/>
    <line class="fb-line fb-7m" x1="104" y1="78" x2="116" y2="78"/>
    ${moves.map(m => html`<path class="fb-m fb-${m.k}" d="${arrowPath(m.from, m.to, {endGap: m.k === 'shot' ? 1 : 9})}"/>`)}
    ${marks.map(mark)}
    ${players.map(dot)}
    ${holder ? html`<circle class="fb-ball" cx="${num(clamp(holder.x + 8, 8, 212))}" cy="${num(holder.y - 8)}" r="3.6"/>` : ''}
  </svg></figure>`;
}

/** Spieler eines Spielzug-Schritts: Grundaufstellung, die Schritt-Positionen überschreiben einzelne Spieler. */
export function stepPlayers(zug, index) {
  const step = zug.steps[index], at = {...zug.base, ...(step.at || {})};
  return [...Object.entries(at).map(([l, [x, y]]) => ({l, x, y, team: 'a'})), ...zug.defenders];
}
