// Teilen-Bild (1080 × 1350) auf dem Gerät zeichnen: Resultat oder «Deine Saison». Kein Dienst, kein Upload.
import {SEASON} from './season.js';
const W = 1080, H = 1350;
const load = src => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; });

function base(ctx, arena) {
  ctx.fillStyle = '#141415'; ctx.fillRect(0, 0, W, H);
  if (arena) {
    const scale = Math.max(W / arena.width, (H * .62) / arena.height);
    ctx.globalAlpha = .55; ctx.drawImage(arena, (W - arena.width * scale) / 2, 0, arena.width * scale, arena.height * scale); ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(12,12,13,.35)'); g.addColorStop(.55, 'rgba(12,12,13,.9)'); g.addColorStop(1, '#141415');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function text(ctx, value, x, y, font, color = '#f5f5f5', align = 'center') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
}
function pill(ctx, value, x, y) {
  ctx.font = "500 40px Inter, sans-serif";
  const w = ctx.measureText(value).width + 64;
  ctx.fillStyle = '#ff790e'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 52, w, 76, 12); ctx.fill();
  text(ctx, value, x, y, "500 40px Inter, sans-serif", '#171717');
}
function footer(ctx, logo) {
  if (logo) ctx.drawImage(logo, 80, H - 150, 70, 70);
  text(ctx, 'Kadetten Fan-App · inoffiziell', 170, H - 102, "400 34px Inter, sans-serif", '#d4d4d8', 'left');
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

/** Resultatbild. game: {home, away, score, half, league, date}; label: z. B. «S · Sieg». */
export function resultImage({game, label, crests}) {
  return canvasWith(async ctx => {
    text(ctx, `${game.league} · ${game.date.split('-').reverse().join('.')}`, W / 2, 190, "400 40px Inter, sans-serif", '#d4d4d8');
    if (label) pill(ctx, label, W / 2, 300);
    const [home, away] = await Promise.all(crests.map(src => src ? load(src) : null));
    for (const [img, x, name] of [[home, 270, game.homeShort], [away, 810, game.awayShort]]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, 470, 110, 0, Math.PI * 2); ctx.fill();
      if (img) { const s = 150 / Math.max(img.width, img.height); ctx.drawImage(img, x - img.width * s / 2, 470 - img.height * s / 2, img.width * s, img.height * s); }
      text(ctx, name, x, 650, "500 46px Inter, sans-serif");
    }
    text(ctx, `${game.score[0]}:${game.score[1]}`, W / 2, 940, "600 300px 'Barlow Condensed', sans-serif");
    if (Array.isArray(game.half) && game.half.every(Number.isInteger)) text(ctx, `Halbzeit ${game.half[0]}:${game.half[1]}`, W / 2, 1030, "400 42px Inter, sans-serif", '#d4d4d8');
  });
}

/** «Deine Saison» als Bild. */
export function seasonCard(summary, season = SEASON) {
  return canvasWith(async ctx => {
    text(ctx, 'Meine Saison', W / 2, 230, "600 120px 'Barlow Condensed', sans-serif");
    text(ctx, `Kadetten Schaffhausen · ${season}`, W / 2, 310, "400 42px Inter, sans-serif", '#d4d4d8');
    const tiles = [[summary.visits, summary.visits === 1 ? 'Spiel in der Halle' : 'Spiele in der Halle'], [`${summary.record.S}-${summary.record.U}-${summary.record.N}`, 'Siege · Remis · Niederlagen'], [summary.goals, 'Kadetten-Tore gesehen'], [summary.tipped ? summary.points : '–', summary.tipped ? `Tipp-Punkte aus ${summary.tipped} Tipps` : 'noch keine Tipps']];
    tiles.forEach(([value, label], i) => {
      const x = i % 2 ? 810 : 270, y = 520 + Math.floor(i / 2) * 330;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.roundRect(x - 230, y - 160, 460, 280, 32); ctx.fill();
      text(ctx, String(value), x, y + 20, "600 140px 'Barlow Condensed', sans-serif");
      text(ctx, label, x, y + 85, "400 32px Inter, sans-serif", '#d4d4d8');
    });
  });
}

/** Bild teilen (Systemdialog) oder herunterladen. */
export async function shareImage(blob, name, title) {
  if (!blob) return false;
  const file = new File([blob], name, {type: 'image/png'});
  try {
    if (navigator.canShare?.({files: [file]})) { await navigator.share({files: [file], title}); return true; }
  } catch (error) { if (error?.name === 'AbortError') return true; }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href: url, download: name});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
