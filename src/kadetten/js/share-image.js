// Teilen-Bild auf dem Gerät zeichnen: Story (1080 × 1920) mit Halbzeit, Spielstand oder Endstand, Saisonrückblick (1080 × 1350). Kein Dienst, kein Upload.
import {SEASON} from './season.js';
import {shortDate} from './logic.js';
import {isOwn} from './match.js';
const W = 1080,
  H = 1350;
const load = src =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

function base(ctx, arena) {
  ctx.fillStyle = '#141415';
  ctx.fillRect(0, 0, W, H);
  if (arena) {
    const scale = Math.max(W / arena.width, (H * 0.62) / arena.height);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(arena, (W - arena.width * scale) / 2, 0, arena.width * scale, arena.height * scale);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(12,12,13,.35)');
  g.addColorStop(0.55, 'rgba(12,12,13,.9)');
  g.addColorStop(1, '#141415');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
function text(ctx, value, x, y, font, color = '#f5f5f5', align = 'center') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}
function pill(ctx, value, x, y) {
  ctx.font = '500 40px Inter, sans-serif';
  const w = ctx.measureText(value).width + 64;
  ctx.fillStyle = '#ff790e';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 52, w, 76, 12);
  ctx.fill();
  text(ctx, value, x, y, '500 40px Inter, sans-serif', '#171717');
}
function footer(ctx, logo) {
  if (logo) ctx.drawImage(logo, 80, H - 150, 70, 70);
  text(ctx, 'Kadetten Fan-App · inoffiziell', 170, H - 102, '400 34px Inter, sans-serif', '#d4d4d8', 'left');
}

async function canvasWith(draw) {
  await document.fonts?.ready;
  const canvas = Object.assign(document.createElement('canvas'), {width: W, height: H});
  const ctx = canvas.getContext('2d');
  const [arena, logo] = await Promise.all([load('assets/bbc-arena.webp'), load('assets/kadetten-logo.png')]);
  base(ctx, arena);
  await draw(ctx, logo);
  footer(ctx, logo);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// ---------- Story-Bilder «im Schnitt»: Halbzeit, Spielstand, Endstand (1080 × 1920) ----------
// Wichtiges bleibt zwischen y 250 und 1650, damit Instagram nichts überdeckt. Konzept: Design-Canvas «Teilbilder», Stil «kräftig».
const SW = 1080,
  SH = 1920;
const KIND_LABEL = {half: 'Halbzeit', live: 'Spielstand', end: 'Endstand'};

/**
 * Inhalt des Story-Bilds (rein, getestet). kind: 'half' | 'live' | 'end'; game: {home, away, homeShort, awayShort, score, league, date};
 * minute: gespielte Minuten (nur 'live'); won/cup: für den Stempel beim Endstand.
 * Gibt null zurück, wenn kein gültiger Spielstand vorliegt.
 */
export function matchImageModel({kind, game, minute = null, outcome = null}) {
  const score = game?.score;
  if (!KIND_LABEL[kind] || !Array.isArray(score) || score.length !== 2 || !score.every(Number.isInteger)) return null;
  const side = (name, short, value) => ({name: short || name, score: value, own: isOwn(name)});
  const cup = /cup/i.test(game.league || '');
  return {
    kind,
    label: KIND_LABEL[kind],
    tag: [game.league, game.date ? shortDate(game.date) : ''].filter(Boolean).join(' · ') || 'Kadetten',
    home: side(game.home, game.homeShort, score[0]),
    away: side(game.away, game.awayShort, score[1]),
    minute: kind === 'live' && Number.isFinite(minute) ? Math.floor(minute) : null,
    stamp: kind === 'end' && outcome === 'S' ? (cup ? 'Weiter im Cup!' : 'Sieg!') : null,
    result: kind === 'end' && outcome && outcome !== 'S' ? (outcome === 'U' ? 'Unentschieden' : 'Niederlage') : null
  };
}

const INK = '#141415',
  HOT = '#ff8a4d';
/** Zeichnen mit der Schräge des Schnitts (skewX −8°) um den Punkt (x, y). */
function skew(ctx, x, y, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -Math.tan((8 * Math.PI) / 180), 1, 0, 0);
  draw();
  ctx.restore();
}
const display = size => `italic 600 ${size}px 'Barlow Condensed', sans-serif`;

function wedge(ctx) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, SW, SH);
  const top = SH * 0.4,
    bottom = SH * 0.52;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SW, 0);
  ctx.lineTo(SW, top);
  ctx.lineTo(0, bottom);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, SW, SH * 0.5);
  g.addColorStop(0, '#ff7d26');
  g.addColorStop(0.5, '#ff5d00');
  g.addColorStop(1, '#f05600');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
  const glow = ctx.createRadialGradient(SW * 0.1, 0, 0, SW * 0.1, 0, SW * 0.7);
  glow.addColorStop(0, 'rgba(255,255,255,.25)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SW, SH);
  ctx.restore();
  // Streifenband an der Schnittkante
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, SH * 0.47);
  ctx.lineTo(SW, SH * 0.35);
  ctx.lineTo(SW, top);
  ctx.lineTo(0, bottom);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(20,20,21,.8)';
  ctx.lineWidth = 17;
  for (let x = -SH; x < SW + SH; x += 43) {
    ctx.beginPath();
    ctx.moveTo(x, SH * 0.6);
    ctx.lineTo(x + SH * 0.6 * Math.tan((30 * Math.PI) / 180), 0);
    ctx.stroke();
  }
  ctx.restore();
}

function tag(ctx, value, x, y) {
  ctx.font = '600 34px Inter, sans-serif';
  const w = ctx.measureText(value.toUpperCase()).width + 56;
  skew(ctx, x, y, () => {
    ctx.fillStyle = INK;
    ctx.fillRect(0, -50, w, 76);
  });
  text(ctx, value.toUpperCase(), x + 28, y, '600 34px Inter, sans-serif', HOT, 'left');
}

function crestCircle(ctx, img, x, y, r) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (img) {
    const s = (r * 1.35) / Math.max(img.width, img.height);
    ctx.drawImage(img, x - (img.width * s) / 2, y - (img.height * s) / 2, img.width * s, img.height * s);
  }
}

function storyFooter(ctx, logo) {
  skew(ctx, 80, 1660, () => {
    ctx.fillStyle = '#ff5d00';
    ctx.fillRect(0, -22, 46, 16);
  });
  text(ctx, 'Kadetten Fan-App · inoffiziell', 150, 1666, '400 34px Inter, sans-serif', '#d4d4d8', 'left');
  if (logo) ctx.drawImage(logo, SW - 150, 1620, 70, 70);
}

/** Story-Bild 1080 × 1920 aus einem Modell von matchImageModel. crests: [Heimwappen, Auswärtswappen] (Pfade). */
export async function matchImage(model, crests = []) {
  if (!model) return null;
  await Promise.all([document.fonts?.load("italic 600 100px 'Barlow Condensed'"), document.fonts?.load('600 34px Inter')].filter(Boolean));
  await document.fonts?.ready;
  const canvas = Object.assign(document.createElement('canvas'), {width: SW, height: SH});
  const ctx = canvas.getContext('2d');
  const [logo, home, away] = await Promise.all([load('assets/kadetten-logo.png'), ...crests.map(src => (src ? load(src) : null))]);
  wedge(ctx);
  tag(ctx, model.tag, 80, 330);
  text(ctx, model.label.toUpperCase(), 80, 600, display(210), INK, 'left');
  const color = side => (side.own ? HOT : '#ffffff');
  if (model.kind === 'live') {
    if (model.minute !== null) text(ctx, `${model.minute}′`, 80, 860, display(240), INK, 'left');
    [model.home, model.away].forEach((side, i) => {
      const y = 1040 + i * 310;
      text(ctx, side.name.toUpperCase(), 80, y, '600 42px Inter, sans-serif', '#d4d4d8', 'left');
      text(ctx, String(side.score), 80, y + 230, display(300), color(side), 'left');
    });
  } else {
    const baseline = 1220,
      gap = 40,
      maxWidth = 940;
    // Zweistellige Zahlen werden verkleinert, bis sie in die Breite passen.
    let size = 540;
    const measure = () => {
      ctx.font = display(size);
      return [ctx.measureText(String(model.home.score)).width, ctx.measureText(String(model.away.score)).width, ctx.measureText(':').width];
    };
    let [wl, wr, wc] = measure();
    if (wl + wr + wc + 2 * gap > maxWidth) {
      size = Math.floor((size * maxWidth) / (wl + wr + wc + 2 * gap));
      [wl, wr, wc] = measure();
    }
    const x0 = (SW - (wl + gap + wc + gap + wr)) / 2,
      xr = x0 + wl + gap + wc + gap;
    ctx.globalAlpha = 0.4;
    text(ctx, String(model.home.score), x0, baseline + 14, display(size), '#ff5d00', 'left');
    text(ctx, String(model.away.score), xr, baseline + 14, display(size), '#ff5d00', 'left');
    ctx.globalAlpha = 1;
    text(ctx, String(model.home.score), x0, baseline, display(size), color(model.home), 'left');
    text(ctx, ':', x0 + wl + gap, baseline, display(size), HOT, 'left');
    text(ctx, String(model.away.score), xr, baseline, display(size), color(model.away), 'left');
    for (const [img, x, side] of [
      [home, 270, model.home],
      [away, 810, model.away]
    ]) {
      crestCircle(ctx, img, x, 1370, 95);
      text(ctx, side.name, x, 1530, '600 44px Inter, sans-serif');
    }
    if (model.stamp) {
      ctx.save();
      ctx.translate(770, 780);
      ctx.rotate((-7 * Math.PI) / 180);
      ctx.font = display(88);
      const w = ctx.measureText(model.stamp.toUpperCase()).width + 80;
      ctx.fillStyle = INK;
      ctx.fillRect(-w / 2, -70, w, 130);
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#ff5d00';
      ctx.strokeRect(-w / 2, -70, w, 130);
      text(ctx, model.stamp.toUpperCase(), 0, 28, display(88), '#ff5d00');
      ctx.restore();
    } else if (model.result) {
      skew(ctx, 80, 700, () => {
        ctx.font = '600 38px Inter, sans-serif';
        const w = ctx.measureText(model.result.toUpperCase()).width + 64;
        ctx.fillStyle = INK;
        ctx.fillRect(0, -52, w, 78);
        text(ctx, model.result.toUpperCase(), 32, 0, '600 38px Inter, sans-serif', HOT, 'left');
      });
    }
  }
  storyFooter(ctx, logo);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/** Saisonrückblick als Bild: Fan-Typ und bis zu vier Kennzahlen. tiles: [[Wert, Beschriftung], …]. */
export function recapCard({fan, tiles}, season = SEASON) {
  return canvasWith(async ctx => {
    text(ctx, 'Meine Saison', W / 2, 200, "600 120px 'Barlow Condensed', sans-serif");
    text(ctx, `Kadetten Schaffhausen · ${season}`, W / 2, 275, '400 40px Inter, sans-serif', '#d4d4d8');
    pill(ctx, fan.toUpperCase(), W / 2, 395);
    const shown = tiles.slice(0, 4);
    shown.forEach(([value, label], i) => {
      // Eine einzelne Kachel in der letzten Reihe steht mittig.
      const x = i === shown.length - 1 && i % 2 === 0 ? W / 2 : i % 2 ? 810 : 270,
        y = 610 + Math.floor(i / 2) * 320;
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.beginPath();
      ctx.roundRect(x - 230, y - 160, 460, 280, 32);
      ctx.fill();
      text(ctx, String(value), x, y + 20, "600 140px 'Barlow Condensed', sans-serif");
      text(ctx, label, x, y + 85, '400 32px Inter, sans-serif', '#d4d4d8');
    });
  });
}

/** Bild teilen (Systemdialog) oder herunterladen. */
export async function shareImage(blob, name, title) {
  if (!blob) return false;
  const file = new File([blob], name, {type: 'image/png'});
  try {
    if (navigator.canShare?.({files: [file]})) {
      await navigator.share({files: [file], title});
      return true;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return true;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
