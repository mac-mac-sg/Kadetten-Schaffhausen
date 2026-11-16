// Kadetten-Gewinnscore: Sieg-, Remis- und Niederlagechance aus Tabelle, Vorsaison, Form und Heimvorteil.
// Geprüft mit scripts/gewinnscore-backtest.mjs an 809 QHL-Spielen 2021–2025 (Prüfsaison 2025: 74 % richtige Siegertipps).
// Gerechnet wird nur im Gerät aus Daten, die die App ohnehin lädt.
import {PRIOR} from '../data/gewinnscore.js';
import {normTeam, isOwn} from './match.js';

/** Werte aus der Prüfrechnung (Training 2022–2024). */
export const MODEL = {home: 1.5, sigma: 4.5, form: 2, k: 3, w: 2, minGames: 3, length: 60};

const erf = x => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x)),
    y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return Math.sign(x) * y;
};
const phi = x => 0.5 * (1 + erf(x / Math.SQRT2));

const PRIOR_BY_NAME = new Map(Object.entries(PRIOR).map(([n, v]) => [normTeam(n), v]));
export const priorOf = team => PRIOR_BY_NAME.get(normTeam(team)) ?? 0;

/** Stärke: Tordifferenz je Spiel, zu Saisonbeginn zur Vorsaison hin gezogen. */
export function strength(row) {
  if (!row || !Number.isFinite(row.played) || !Number.isFinite(row.goalsFor) || !Number.isFinite(row.goalsAgainst)) return null;
  return (row.goalsFor - row.goalsAgainst + MODEL.k * MODEL.w * priorOf(row.team)) / (row.played + MODEL.k);
}

/** Form aus den letzten Resultaten (S, U, N): −1 … +1, bei weniger als drei Spielen 0. */
export function formValue(list) {
  const r = (list || []).filter(x => x === 'S' || x === 'U' || x === 'N').slice(0, 5);
  if (r.length < 3) return 0;
  return r.reduce((a, x) => a + (x === 'S' ? 2 : x === 'U' ? 1 : 0), 0) / r.length - 1;
}

/** Chancen für eine erwartete Kadetten-Tordifferenz und deren Streuung. */
export function chances(margin, sigma = MODEL.sigma) {
  if (sigma <= 0) return margin > 0 ? {win: 1, draw: 0, loss: 0} : margin < 0 ? {win: 0, draw: 0, loss: 1} : {win: 0, draw: 1, loss: 0};
  const win = 1 - phi((0.5 - margin) / sigma),
    loss = phi((-0.5 - margin) / sigma);
  return {win, draw: Math.max(0, 1 - win - loss), loss};
}

/**
 * Gewinnscore vor dem Spiel aus Kadetten-Sicht. own/opp: Tabellenzeilen (standings), ownForm/oppForm: Resultate S/U/N.
 * null, wenn das Spiel nicht in der QHL ist oder ein Team weniger als drei Spiele hat.
 */
export function gewinnscore({game, own, opp, ownForm = [], oppForm = []}) {
  if (!game || game.league !== 'QHL' || !own || !opp) return null;
  if (!(own.played >= MODEL.minGames && opp.played >= MODEL.minGames)) return null;
  const sOwn = strength(own),
    sOpp = strength(opp);
  if (sOwn === null || sOpp === null) return null;
  const home = isOwn(game.home) ? MODEL.home : -MODEL.home;
  const fOwn = formValue(ownForm),
    fOpp = formValue(oppForm);
  const margin = (sOwn - sOpp) / 2 + home + MODEL.form * (fOwn - fOpp);
  return {...chances(margin), margin, home, strength: [sOwn, sOpp], form: [fOwn, fOpp]};
}

/** Gespielte Minuten aus Spieluhr («42:13») oder Phase («Halbzeit»); null, wenn unbekannt. */
export function elapsed(match) {
  const m = /^(\d{1,3}):(\d{2})/.exec(String(match?.clock || ''));
  if (m) return Math.min(MODEL.length, Number(m[1]) + Number(m[2]) / 60);
  if (/halbzeit|pause|half/i.test(String(match?.phase || '')) && !/2\.|zweite|second/i.test(String(match?.phase || ''))) return 30;
  return null;
}

/**
 * Gewinnscore während des Spiels: Der heutige Vorsprung zählt voll, die erwartete Differenz und die Streuung nur
 * noch für die Restzeit. pre: Ergebnis von gewinnscore(); match: Live-Stand mit score und clock.
 */
export function liveScore(pre, match, game) {
  if (!pre || !Array.isArray(match?.score) || !match.score.every(Number.isInteger)) return null;
  const minute = elapsed(match);
  if (minute === null) return null;
  const ownHome = isOwn(game?.home ?? match.home);
  const lead = ownHome ? match.score[0] - match.score[1] : match.score[1] - match.score[0];
  const rest = Math.max(0, MODEL.length - minute) / MODEL.length;
  return {...chances(lead + pre.margin * rest, MODEL.sigma * Math.sqrt(rest)), lead, minute};
}

/** Prozent ganzzahlig, so gerundet, dass Sieg, Remis und Niederlage zusammen 100 ergeben. */
export function percents({win, draw, loss}) {
  const raw = [win, draw, loss].map(v => v * 100),
    out = raw.map(Math.floor);
  let rest = 100 - out.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - Math.floor(v), i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rest-- > 0) out[i]++;
    });
  return out;
}
