// Saisonrückblick «Deine Saison» (#/rueckblick): Vollbild-Karten wie eine Geschichte. Tippen rechts weiter, links zurück,
// Pfeiltasten und Wischen ebenso. Keine Navigation, Schliessen führt zu «Mein Bereich».
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {myGames, tips} from '../personal.js';
import {liveSeen} from '../sammeln.js';
import {quizAnswers} from '../quiz.js';
import {recap, seasonOver} from '../rueckblick.js';
import {loading} from './parts.js';
import {shortDate} from '../logic.js';
import {storyShell, storyState} from './story.js';

const word = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function recapInput(state, now) {
  return {data: state.data, now, visited: myGames(), tips: tips(), live: liveSeen(), answers: quizAnswers()};
}

/** Kennzahlen für das Teilen-Bild: zuerst die Saison der Kadetten, dann das Persönliche. */
export function recapTiles(r) {
  const by = id => r.slides.find(s => s.id === id);
  const bilanz = by('bilanz'),
    tore = by('tore'),
    team = by('team'),
    serien = by('serien'),
    fan = by('fan');
  return [
    bilanz && [bilanz.games, 'Pflichtspiele'],
    bilanz && [`${bilanz.record.S}-${bilanz.record.U}-${bilanz.record.N}`, 'Bilanz (S-U-N)'],
    tore && [tore.goalsFor, 'Tore der Kadetten'],
    serien && [serien.len, 'Siege in Folge'],
    team && team.rank && [team.rank + '.', 'Rang der Kadetten'],
    fan && fan.visits && [fan.visits, fan.visits === 1 ? 'Spiel in der Halle' : 'Spiele in der Halle'],
    fan && fan.points !== null && [fan.points, 'Tipp-Punkte']
  ]
    .filter(Boolean)
    .slice(0, 6);
}

/** Rangkurve: Runde nach rechts, Rang 1 oben. */
function curve(ranks, teams) {
  if (ranks.length < 2) return '';
  const maxX = Math.max(...ranks.map(r => r[0])),
    maxY = Math.max(teams || 0, ...ranks.map(r => r[1]));
  const pts = ranks
    .map(([x, y]) => `${Math.round((x / maxX) * 252) + 2},${Math.round(((y - 1) / Math.max(1, maxY - 1)) * 110) + 6}`)
    .join(' ');
  return html`<svg class="rb-curve" viewBox="0 0 256 122" aria-hidden="true"><polyline class="rb-draw" pathLength="1" points="${pts}"/></svg>`;
}

/** Zahl, die beim Einblenden hochzählt (CSS, kein Skript); ohne Bewegung steht sie fertig da. */
const count = n => html`<span class="rb-cnt" data-style="--to:${n}"></span>`;
const bar = (p, i = 0, cls = '') =>
  html`<i class="rb-bar${cls}" data-style="--p:${Math.max(0, Math.min(100, Math.round(p)))};--i:${i}"></i>`;

function slide(s) {
  switch (s.id) {
    case 'intro':
      return html`<p class="rb-k">Saison ${s.season}</p><div class="rb-body"><h1 class="rb-big xl">Dein<br>Kadetten-<br>Jahr.</h1>
        <p>Was die Kadetten gespielt, getroffen und erreicht haben.</p></div><i class="rb-stripe" aria-hidden="true"></i><p class="rb-hint">Tippen für weiter</p>`;
    case 'bilanz': {
      const total = s.games || 1;
      return html`<p class="rb-k">Die Bilanz</p><div class="rb-body"><p class="rb-big xxl">${count(s.games)}</p>
        <p class="rb-lead">Pflichtspiele in dieser Saison</p>
        <div class="rb-wld" role="img" aria-label="${`${s.record.S} Siege, ${s.record.U} Unentschieden, ${s.record.N} Niederlagen`}">
          <span class="s" data-style="flex:${s.record.S}"></span><span class="u" data-style="flex:${s.record.U}"></span><span class="n" data-style="flex:${s.record.N}"></span></div>
        <div class="rb-leg"><span>${word(s.record.S, 'Sieg', 'Siege')}</span><span>${word(s.record.U, 'Remis', 'Remis')}</span><span>${word(s.record.N, 'Niederlage', 'Niederlagen')}</span></div>
        ${s.quote !== null ? html`<p class="fine">${s.quote} % Siegquote über alle Wettbewerbe, ${total} Spiele.</p>` : ''}</div>`;
    }
    case 'tore':
      return html`<p class="rb-k">Die Tore</p><div class="rb-body"><p class="rb-big xxl">${count(s.goalsFor)}</p>
        <p class="rb-lead">Tore der Kadetten</p>
        <div class="rb-vs"><p><b>Erzielt</b><span>${s.goalsFor}</span></p>${bar(100)}<p><b>Kassiert</b><span>${s.goalsAgainst}</span></p>${bar(s.against, 1, ' alt')}</div>
        <dl class="rb-rows"><div><dt>Tore pro Spiel</dt><dd>${String(s.perGame).replace('.', ',')}</dd></div><div><dt>Tordifferenz</dt><dd>${s.diff > 0 ? '+' : s.diff < 0 ? '−' : ''}${Math.abs(s.diff)}</dd></div></dl></div>`;
    case 'halbzeit': {
      const max = Math.max(s.first, s.second, 1);
      return html`<p class="rb-k">Erste und zweite Halbzeit</p><div class="rb-body">
        <p class="rb-big md">${s.second > s.first ? 'Nach der Pause legen die Kadetten zu.' : s.second < s.first ? 'Vor der Pause sind die Kadetten stärker.' : 'In beiden Hälften gleich stark.'}</p>
        <div class="rb-cols" role="img" aria-label="${`Durchschnittliche Tore: erste Halbzeit ${s.first}, zweite Halbzeit ${s.second}`}">
          <div><b class="rb-big md">${String(s.first).replace('.', ',')}</b>${bar((s.first / max) * 100, 0, ' col')}<span>1. Halbzeit<br>Ø Tore</span></div>
          <div><b class="rb-big md acc">${String(s.second).replace('.', ',')}</b>${bar((s.second / max) * 100, 1, ' col hot')}<span>2. Halbzeit<br>Ø Tore</span></div></div>
        <p class="fine">${s.turned ? `${word(s.turned, 'Spiel', 'Spiele')} gedreht (zur Pause hinten, am Ende nicht verloren). ` : ''}${s.led ? `Zur Pause geführt: ${s.ledLost === 0 ? 'nie' : word(s.ledLost, 'Mal', 'Mal')} noch verloren.` : ''}</p></div>`;
    }
    case 'team':
      return html`<p class="rb-k">Der Weg in der Tabelle</p><div class="rb-body">${
        s.start && s.rank && s.start !== s.rank
          ? html`<p class="rb-big md">Von Platz ${s.start} auf Platz ${s.rank}.</p>`
          : s.rank
            ? html`<p class="rb-big xl">${s.rank}. Platz</p>`
            : html`<p class="rb-big xl">QHL</p>`
      }<p>${s.record.S}-${s.record.U}-${s.record.N} in der QHL, ${s.goalsFor}:${s.goalsAgainst} Tore${s.points !== null ? `, ${s.points} Punkte` : ''}.</p>
        ${curve(s.ranks, s.teams)}${s.ranks.length > 1 ? html`<p class="fine">Rang nach jeder Runde${s.best ? `, höchster Rang: ${s.best}.` : '.'}</p>` : ''}</div>`;
    case 'spiel': {
      const head = s.kind === 'comeback' ? 'Spiel der Saison: die Aufholjagd' : 'Spiel der Saison: der höchste Sieg';
      const pause = s.half ? (s.ownHome ? s.half : [s.half[1], s.half[0]]) : null;
      return html`<p class="rb-k">${head}</p><div class="rb-body"><span class="rb-tag">${[shortDate(s.date, false), s.league].filter(Boolean).join(' · ')}</span>
        <p class="rb-big md">${s.home} – ${s.away}</p>
        <p class="rb-big xl acc rb-pop">${s.score[0]}:${s.score[1]}</p>
        ${pause ? html`<p>Zur Pause ${s.ownHome ? `${pause[0]}:${pause[1]}` : `${s.half[0]}:${s.half[1]}`}${s.kind === 'comeback' ? `, ${word(s.deficit, 'Tor', 'Tore')} Rückstand aufgeholt` : ''}.</p>` : ''}</div>`;
    }
    case 'serien':
      return html`<p class="rb-k">Die längste Serie</p><div class="rb-body"><p class="rb-big xxl">${count(s.len)}</p>
        <p class="rb-lead">Siege in Folge</p>
        <div class="rb-marks" aria-hidden="true">${Array.from({length: Math.min(s.len, 16)}, (_, i) => html`<i data-style="--i:${i}"></i>`)}</div>
        <p class="fine">Vom ${shortDate(s.from, false)} bis zum ${shortDate(s.to, false)}.</p></div>`;
    case 'torjaeger': {
      const max = s.top[0].goals;
      return html`<p class="rb-k">Die Torjäger</p><div class="rb-body"><p class="rb-big md">Fünf Spieler, ${s.share} % aller Tore.</p>
        <ol class="rb-race">${s.top.map(
          (p, i) =>
            html`<li><span class="rb-rn"><b>${i + 1} · ${p.name}</b><em>${p.goals}</em></span>${bar((p.goals / max) * 100, i, i === 0 ? ' hot' : '')}</li>`
        )}</ol><p class="fine">QHL-Tore der Saison.</p></div>`;
    }
    case 'torhueter':
      return html`<p class="rb-k">Die Torhüter</p><div class="rb-body"><p class="rb-big xxl">${count(s.quote)}<small>%</small></p>
        <p class="rb-lead">Fangquote</p>
        <div class="rb-ring" role="img" aria-label="${`${s.saves} von ${s.faced} Würfen gehalten`}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52" pathLength="1"/><circle class="fg" cx="60" cy="60" r="52" pathLength="1" data-style="--p:${s.quote}"/></svg></div>
        <p class="fine">${s.saves} von ${s.faced} Würfen gehalten (QHL).</p></div>`;
    case 'fan':
      return html`<p class="rb-k">Und du?</p><div class="rb-body"><p class="rb-big md">Dein Anteil am Jahr.</p>
        <div class="rb-kn">${[
          [s.visits, s.visits === 1 ? 'Spiel in der Halle' : 'Spiele in der Halle'],
          [s.tipRate === null ? null : s.tipRate, '% Tipps richtig'],
          [s.weeks, s.weeks === 1 ? 'Quiz-Woche' : 'Quiz-Wochen'],
          [s.have, 'Sammelkarten']
        ]
          .filter(([v]) => v)
          .map(([v, label]) => html`<span class="rb-k2"><b class="rb-big md">${count(v)}</b><small>${label}</small></span>`)}</div>
        <span class="rb-tag rb-pop">${s.name}</span><p class="fine">${s.why} Saison ${s.season}.</p></div>
        <button class="rb-share" type="button" data-rb-share>${icon('share')}Als Bild teilen</button>`;
    default:
      return '';
  }
}

export function renderRueckblick({state, now, ui = {}}) {
  if (!state.data) return html`<section class="sec">${loading()}</section>`;
  const r = recap({...recapInput(state, now)});
  return storyShell({
    slides: r.slides.map(s => ({id: s.id, body: slide(s)})),
    ...storyState(ui),
    close: href.ich(),
    closeLabel: 'Rückblick schliessen',
    note: r.over ? '' : 'Zwischenstand, die Saison läuft noch.'
  });
}

/** Hinweis auf den Rückblick: nach Saisonende gross (Titelseite, Mein Bereich), sonst leer. */
export function recapTeaser(games, now, after = false) {
  if (!seasonOver(games, now)) return '';
  return html`<section class="sec${after ? ' after-band' : ''}"><a class="card teaser" href="${href.rueckblick()}">
    <span class="teaser-k">Saisonrückblick</span><span class="teaser-t">Deine Saison ist da.</span>
    <span class="teaser-s">Halle, Tipps, Quiz, Karten und dein Fan-Typ</span>${icon('go')}</a></section>`;
}
