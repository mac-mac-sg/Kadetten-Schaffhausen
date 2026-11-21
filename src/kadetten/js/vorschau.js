// Spielvorschau: Aufmacher («Worum es geht») und Anreise. Alle Sätze sind feste Vorlagen mit Zahlen aus Tabelle, Form und
// Direktduellen; nichts wird geschätzt oder erfunden. Konzept: Design-Canvas «Spielvorschau».
import {isSwissCup, percents} from './gewinnscore.js';
import {venueInfo} from './views/parts.js';
import {isOwn} from './match.js';
import {shortTeam, hasScore} from './logic.js';

/** Aktuelle Serie der Kadetten aus den letzten Resultaten (neueste zuerst): {kind: 'S'|'U'|'N', n}. */
export function streak(list) {
  const first = (list || []).find(x => x === 'S' || x === 'U' || x === 'N');
  if (!first) return {kind: null, n: 0};
  let n = 0;
  for (const x of list) {
    if (x !== first) break;
    n++;
  }
  return {kind: first, n};
}

/** Bilanz der Kadetten in den Direktduellen (Spiele mit Resultat): {n, w, d, l}. */
export function duelRecord(games, own = isOwn) {
  const rec = {n: 0, w: 0, d: 0, l: 0};
  for (const g of Array.isArray(games) ? games : []) {
    if (!Array.isArray(g.score) || !g.score.every(Number.isInteger)) continue;
    const ownHome = own(g.home);
    if (!ownHome && !own(g.away)) continue;
    const [a, b] = ownHome ? g.score : [g.score[1], g.score[0]];
    rec.n++;
    if (a > b) rec.w++;
    else if (a < b) rec.l++;
    else rec.d++;
  }
  return rec;
}

/**
 * Aufmacher der Vorschau oder null. Der erste passende Satz gewinnt: Einsatz, Serie, Direktduell, sonst nüchtern.
 * table: Tabellenzeilen der QHL (standings), own/opp: ihre Zeilen, ownForm: letzte Resultate der Kadetten (neueste zuerst),
 * score: Ergebnis von preScore (Gewinnscore), duels: Direktduelle (Liste), opponent: Gegnername.
 */
export function leadStory({game, table = [], own, opp, ownForm = [], score = null, duels = []}) {
  if (!game || hasScore(game)) return null;
  const cup = isSwissCup(game);
  if (!cup && game.league !== 'QHL') return null;
  const opponent = shortTeam(isOwn(game.home) ? game.away : game.home);
  const run = streak(ownForm);
  const rec = duelRecord(duels);
  const leader = table[0];
  let headline = null;
  if (cup) headline = 'Wer gewinnt, steht in der nächsten Runde.';
  else if (own && opp) {
    const top2 = [own.rank, opp.rank].sort((a, b) => a - b);
    if (top2[0] === 1 && top2[1] === 2) headline = `Spitzenspiel: Platz ${own.rank} gegen Platz ${opp.rank}.`;
    else if (leader && own.rank > 1 && Number.isFinite(own.points) && Number.isFinite(leader.points) && own.points + 2 > leader.points)
      headline = 'Ein Sieg bringt die Kadetten an die Tabellenspitze.';
    else if (leader && own.rank > 1 && own.points + 2 === leader.points)
      headline = `Ein Sieg bringt die Kadetten auf Augenhöhe mit Tabellenführer ${shortTeam(leader.team)}.`;
    else if (own.rank === 1) headline = 'Die Kadetten wollen die Tabellenführung ausbauen.';
  }
  if (!headline && run.kind === 'S' && run.n >= 3) headline = `${run.n} Siege in Folge: Die Kadetten kommen mit Rückenwind.`;
  if (!headline && run.kind === 'N' && run.n >= 2) headline = `Nach ${run.n} Niederlagen in Folge wollen die Kadetten die Wende.`;
  if (!headline && rec.n >= 3 && rec.w === rec.n) headline = `Gegen ${opponent} gewannen die Kadetten die letzten ${rec.n} Duelle.`;
  if (!headline && rec.n >= 3 && rec.l === rec.n) headline = `Gegen ${opponent} warten die Kadetten seit ${rec.n} Duellen auf einen Sieg.`;
  if (!headline && own && opp) headline = `Platz ${own.rank} gegen Platz ${opp.rank}.`;
  if (!headline) return null;
  const facts = [];
  if (run.kind === 'S' && run.n >= 2) facts.push({text: `${run.n} Siege in Folge`, hot: true});
  else if (run.kind === 'N' && run.n >= 2) facts.push({text: `${run.n} Niederlagen in Folge`});
  if (score) facts.push({text: `${cup ? 'Weiterkommen' : 'Gewinnscore'} ${percents(score)[0]} %`});
  if (cup) facts.push({text: isOwn(game.home) ? 'Heimspiel' : `Heim: ${shortTeam(game.home)}`});
  else if (rec.n >= 2) facts.push({text: `Duelle ${rec.w}:${rec.l}`});
  return {kicker: cup ? 'Vorschau · Cup' : 'Vorschau', headline, facts: facts.slice(0, 3)};
}

/** Anreise zu einem Auswärtsspiel in der Schweiz: Hallenname, Ort und Karten-Links (Route mit Auto, ÖV). Heimspiele und Europacup: null. */
export function travelInfo(game) {
  if (!game || hasScore(game) || isOwn(game.home) || game.league === 'EHL') return null;
  const v = venueInfo(game.venue);
  if (!v || v.home) return null;
  const base = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(String(game.venue).trim());
  return {name: v.name, place: v.place, route: base + '&travelmode=driving', transit: base + '&travelmode=transit'};
}
