// Wissen: Regeln, Aufstellungen und Spielzüge. Alles liegt in der App, nichts wird geladen oder gespeichert.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {CHAPTERS, GROUPS, ARTICLES, article, chipLabel, spielzugOf} from '../wissen/inhalt.js';
import {feldbild, liveFeld, stepPlayers} from '../wissen/feld.js';
import {frame, DURATION, STEP, clock, animKey, startState} from '../wissen/bewegung.js';
import {subBand, backLink, sectionHead, listRow, segment} from './parts.js';

const firstSentence = text => String(text).split(/(?<=[.!?])\s/)[0];
const groupTitle = a => (GROUPS[a.chapter].find(([id]) => id === a.group) || [])[1] || '';
const reduceMotion = () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const head = chapter => html`${subBand(backLink('Zurück', href.jetzt()), 'Wissen', 'Handball kurz erklärt')}
    ${segment(
      CHAPTERS.map(([id, label]) => [id, label, href.wissen(id)]),
      chapter,
      'Kapitel'
    )}`;

/** Regeln: Gruppen mit Zeilen, jede Zeile öffnet einen Artikel. */
function regeln() {
  const items = ARTICLES.filter(a => a.chapter === 'regeln');
  return html`${head('regeln')}
    ${GROUPS.regeln.map(
      ([group, title]) => html`<section class="sec" aria-labelledby="${'w-' + group}">${sectionHead(title, '', '', 'w-' + group)}
      <div class="plain-list">
        ${items.filter(a => a.group === group).map(a => listRow({title: a.title, sub: firstSentence(a.short), link: href.wissen('regeln', a.id)}))}</div>
        </section>`
    )}`;
}

function related(a) {
  const list = (a.related || []).map(article).filter(Boolean);
  if (!list.length) return '';
  return html`<section class="sec" aria-labelledby="w-rel">${sectionHead('Dazu passt', '', '', 'w-rel')}
    <div class="plain-list">
      ${list.map(r => listRow({title: r.title, sub: firstSentence(r.short), link: href.wissen(r.chapter, r.id)}))}</div>
      </section>`;
}

const inApp = a =>
  a.app ? html`<section class="sec"><p class="note">${icon('news', 18)}<span><b>In der App:</b> ${a.app}</span></p></section>` : '';

/** Wahlseite für Aufstellungen und Spielzüge: Art und Eintrag per Wahlknopf, Inhalt an derselben Stelle, darunter alle im Vergleich. */
function wahlseite(chapter, selected, {main, mini, lines}) {
  const items = ARTICLES.filter(a => a.chapter === chapter);
  const inGroup = items.filter(a => a.group === selected.group);
  const link = a => href.wissen(chapter, a.id);
  const artLabel = GROUPS[chapter].find(([g]) => g === selected.group)[1];
  return html`${head(chapter)}
    <nav class="chips" aria-label="Art">${GROUPS[chapter].map(([group, title]) => {
      const first = items.find(a => a.group === group);
      return html`<a class="chip${group === selected.group ? ' on' : ''}" href="${link(first)}"${group === selected.group ? html` aria-current="true"` : ''}>${title}</a>`;
    })}</nav>
    <nav class="chips" aria-label="${artLabel}">
      ${inGroup.map(
        a =>
          html`<a class="chip${a.id === selected.id ? ' on' : ''}" href="${link(a)}"${a.id === selected.id ? html` aria-current="true"` : ''}>${chipLabel(a)}</a>`
      )}</nav>
    <section class="sec wk-main" aria-labelledby="w-sel">${main}</section>
    <section class="sec" aria-labelledby="w-cmp">${sectionHead('Im Vergleich', '', '', 'w-cmp')}
      <div class="wk-cmp">
        ${inGroup.map(
          a =>
            html`<a class="card wk-mini" href="${link(a)}"${a.id === selected.id ? html` aria-current="true"` : ''}>${mini(a)}<b class="wk-mt">${chipLabel(a)}</b>${lines(a)}</a>`
        )}</div>
        </section>
    ${related(selected)}`;
}

function aufstellungen(route) {
  const items = ARTICLES.filter(a => a.chapter === 'aufstellungen');
  const selected = items.find(a => a.id === route.id) || items.find(a => a.id === 'abwehr-6-0');
  const formation = Boolean(selected.idee);
  return wahlseite('aufstellungen', selected, {
    main: html`${feldbild(selected.field)}
      <h2 class="h2 wk-title" id="w-sel">${selected.title}</h2><p class="wk-lead">${selected.short}</p>
      ${
        formation
          ? html`<div class="wk-three">
            <div class="card">
            <h3 class="h4 first">Idee</h3>
            <p>${selected.idee}</p>
            </div>
            <div class="card">
            <h3 class="h4 first">Stärke</h3>
            <p>${selected.staerke}</p>
            </div>
            <div class="card">
            <h3 class="h4 first">Schwäche</h3>
            <p>${selected.schwaeche}</p>
            </div>
            </div>`
          : html`<div class="prose">${selected.body.map(t => html`<p>${t}</p>`)}</div>`
      }`,
    mini: a => feldbild({...a.field, mini: true}),
    lines: a =>
      a.idee
        ? html`<span class="wk-ms"><i>+</i> ${firstSentence(a.staerke)}</span><span class="wk-ms"><i>−</i> ${firstSentence(a.schwaeche)}</span>`
        : html`<span class="wk-ms">${firstSentence(a.short)}</span>`
  });
}

/** Spielzüge: laufendes Feldbild mit Zeitleiste (Marken 1 bis 3, Regler, Abspielen, Tempo), Schritttext und Textfassung; im Vergleich der erste Schritt. */
function spielzuege(route, ui) {
  const {zug: a, index} = spielzugOf(route),
    total = a.steps.length;
  // Zustand der Wiedergabe: Hat die Steuerung ihn noch nicht angelegt (zum Beispiel im Test), steht das Bild am Anfang des Schritts.
  const st = ui.anim?.key === animKey(a, index) ? ui.anim : startState(a, index),
    f = frame(a, st.t),
    reduce = reduceMotion();
  const at = n => href.wissen('spielzuege', a.id, n);
  const text = `Schritt ${f.step + 1} von ${total}`;
  return wahlseite('spielzuege', a, {
    main: html`${liveFeld({label: `${a.title}: Spielzug in ${total} Schritten, mit Zeitleiste`, zug: a, f})}
      <div class="wk-timeline">
        <nav class="wk-marks" aria-label="Schritte">
          ${a.steps.map(
            (_, i) =>
              html`<a class="chip wk-mk${f.step === i ? ' on' : ''}" href="${at(i + 1)}" data-mark="${i}"${f.step === i ? html` aria-current="step"` : ''}><b>${i + 1}</b><span class="sr">Schritt ${i + 1}</span></a>`
          )}</nav>
        <input class="wk-scrub" type="range" min="0" max="${DURATION * 1000}" step="${reduce ? STEP * 1000 : 10}" value="${Math.round(f.t * 1000)}" aria-label="Zeitleiste" aria-valuetext="${text}, ${clock(f.t)} von ${clock(DURATION)}">
        <div class="wk-ctl${reduce ? ' two' : ''}">
          ${index > 0 ? html`<a class="btn" href="${at(index)}">Zurück</a>` : html`<span></span>`}${
            reduce
              ? ''
              : html`<button class="btn pri" type="button" data-wk="play" aria-pressed="${String(st.playing)}">${st.playing ? 'Pause' : 'Abspielen'}</button>`
          }${index < total - 1 ? html`<a class="btn${reduce ? ' pri' : ''}" href="${at(index + 2)}">Weiter</a>` : html`<span></span>`}</div>
        ${
          reduce
            ? ''
            : html`<div class="wk-tools">
          <button class="chip" type="button" data-wk="speed" aria-pressed="${String(st.speed !== 1)}">${st.speed === 1 ? '1×' : '0,5×'}</button><button class="chip" type="button" data-wk="restart">Neu starten</button><span class="wk-time num" data-wk-time>${clock(f.t)} / ${clock(DURATION)}</span></div>`
        }
      </div>
      <p class="wk-step" role="status" data-wk-caption><b>${text}.</b> ${f.text}</p>
      <h2 class="h2 wk-title" id="w-sel">${a.title}</h2>
      <p class="wk-lead">${a.short}</p>
      <div class="card"><h3 class="h4 first">Idee</h3><p>${a.idee}</p></div>
      <h3 class="h4" id="w-all">Alle Schritte</h3>
        <ol class="wk-list" aria-labelledby="w-all">
        ${a.steps.map(x => html`<li>${x.text}</li>`)}</ol>`,
    mini: x => feldbild({label: x.title, players: stepPlayers(x, 0), moves: x.steps[0].moves, mini: true}),
    lines: x => html`<span class="wk-ms">${firstSentence(x.idee)}</span>`
  });
}

function artikel(a) {
  return html`${subBand(backLink('Wissen', href.wissen(a.chapter)), a.title, groupTitle(a) || 'Wissen')}
    ${
      a.field
        ? html`<section class="sec after-band">
      ${feldbild(a.field)}</section>`
        : ''
    }<section class="sec${a.field ? '' : ' after-band'}">
      <p class="wk-lead">${a.short}</p>
      <div class="prose">
      ${a.body.map(t => html`<p>${t}</p>`)}</div>
      </section>
    ${inApp(a)}${related(a)}`;
}

export function renderWissen({route, ui}) {
  if (route.chapter === 'aufstellungen') return aufstellungen(route);
  if (route.chapter === 'spielzuege') return spielzuege(route, ui);
  const a = route.id ? article(route.id) : null;
  return a && a.chapter === 'regeln' ? artikel(a) : regeln();
}
