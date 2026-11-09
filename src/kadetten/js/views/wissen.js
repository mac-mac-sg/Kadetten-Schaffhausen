// Wissen: Regeln, Aufstellungen und Spielzüge. Alles liegt in der App, nichts wird geladen oder gespeichert.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {CHAPTERS, GROUPS, ARTICLES, article, chipLabel} from '../wissen/inhalt.js';
import {feldbild, stepPlayers} from '../wissen/feld.js';
import {topBar, subBand, backLink, sectionHead, listRow, segment} from './parts.js';

const firstSentence = text => String(text).split(/(?<=[.!?])\s/)[0];
const groupTitle = a => (GROUPS[a.chapter].find(([id]) => id === a.group) || [])[1] || '';
const reduceMotion = () => Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const head = chapter => html`${topBar('Wissen', 'Handball kurz erklärt', 'wissen')}
    ${segment(CHAPTERS.map(([id, label]) => [id, label, href.wissen(id)]), chapter, 'Kapitel')}`;

/** Regeln: Gruppen mit Zeilen, jede Zeile öffnet einen Artikel. */
function regeln() {
  const items = ARTICLES.filter(a => a.chapter === 'regeln');
  return html`${head('regeln')}
    ${GROUPS.regeln.map(([group, title]) => html`<section class="sec" aria-labelledby="${'w-' + group}">${sectionHead(title, '', '', 'w-' + group)}
      <div class="plain-list">${items.filter(a => a.group === group).map(a => listRow({title: a.title, sub: firstSentence(a.short), link: href.wissen('regeln', a.id)}))}</div></section>`)}`;
}

function related(a) {
  const list = (a.related || []).map(article).filter(Boolean);
  if (!list.length) return '';
  return html`<section class="sec" aria-labelledby="w-rel">${sectionHead('Dazu passt', '', '', 'w-rel')}
    <div class="plain-list">${list.map(r => listRow({title: r.title, sub: firstSentence(r.short), link: href.wissen(r.chapter, r.id)}))}</div></section>`;
}

const inApp = a => a.app ? html`<section class="sec"><p class="note">${icon('news', 18)}<span><b>In der App:</b> ${a.app}</span></p></section>` : '';

/** Wahlseite für Aufstellungen und Spielzüge: Art und Eintrag per Wahlknopf, Inhalt an derselben Stelle, darunter alle im Vergleich. */
function wahlseite(chapter, selected, {main, mini, lines}) {
  const items = ARTICLES.filter(a => a.chapter === chapter);
  const inGroup = items.filter(a => a.group === selected.group);
  const link = a => href.wissen(chapter, a.id);
  const artLabel = GROUPS[chapter].find(([g]) => g === selected.group)[1];
  return html`${head(chapter)}
    <nav class="chips" aria-label="Art">${GROUPS[chapter].map(([group, title]) => { const first = items.find(a => a.group === group); return html`<a class="chip${group === selected.group ? ' on' : ''}" href="${link(first)}"${group === selected.group ? html` aria-current="true"` : ''}>${title}</a>`; })}</nav>
    <nav class="chips" aria-label="${artLabel}">${inGroup.map(a => html`<a class="chip${a.id === selected.id ? ' on' : ''}" href="${link(a)}"${a.id === selected.id ? html` aria-current="true"` : ''}>${chipLabel(a)}</a>`)}</nav>
    <section class="sec wk-main" aria-labelledby="w-sel">${main}</section>
    <section class="sec" aria-labelledby="w-cmp">${sectionHead('Im Vergleich', '', '', 'w-cmp')}
      <div class="wk-cmp">${inGroup.map(a => html`<a class="card wk-mini" href="${link(a)}"${a.id === selected.id ? html` aria-current="true"` : ''}>${mini(a)}<b class="wk-mt">${chipLabel(a)}</b>${lines(a)}</a>`)}</div></section>
    ${related(selected)}`;
}

function aufstellungen(route) {
  const items = ARTICLES.filter(a => a.chapter === 'aufstellungen');
  const selected = items.find(a => a.id === route.id) || items.find(a => a.id === 'abwehr-6-0');
  const formation = Boolean(selected.idee);
  return wahlseite('aufstellungen', selected, {
    main: html`${feldbild(selected.field)}
      <h2 class="h2 wk-title" id="w-sel">${selected.title}</h2><p class="wk-lead">${selected.short}</p>
      ${formation ? html`<div class="wk-three"><div class="card"><h3 class="h4 first">Idee</h3><p>${selected.idee}</p></div><div class="card"><h3 class="h4 first">Stärke</h3><p>${selected.staerke}</p></div><div class="card"><h3 class="h4 first">Schwäche</h3><p>${selected.schwaeche}</p></div></div>`
        : html`<div class="prose">${selected.body.map(t => html`<p>${t}</p>`)}</div>`}`,
    mini: a => feldbild({...a.field, mini: true}),
    lines: a => a.idee ? html`<span class="wk-ms"><i>+</i> ${firstSentence(a.staerke)}</span><span class="wk-ms"><i>−</i> ${firstSentence(a.schwaeche)}</span>` : html`<span class="wk-ms">${firstSentence(a.short)}</span>`
  });
}

/** Spielzüge: Feldbild mit Schritten (Zurück, Weiter, Abspielen), Schritttext und Textfassung; im Vergleich der erste Schritt. */
function spielzuege(route, ui) {
  const items = ARTICLES.filter(a => a.chapter === 'spielzuege');
  const a = items.find(x => x.id === route.id) || items.find(x => x.id === 'kreuzen');
  const total = a.steps.length, index = route.step >= 1 && route.step <= total ? route.step - 1 : 0, s = a.steps[index];
  const at = n => href.wissen('spielzuege', a.id, n);
  const playing = ui?.wissenPlay === a.id;
  return wahlseite('spielzuege', a, {
    main: html`${feldbild({label: `${a.title}, Schritt ${index + 1} von ${total}: ${s.text}`, players: stepPlayers(a, index), moves: s.moves, ball: s.ball})}
      <nav class="wk-steps" aria-label="Schritte">
        <span class="wk-nums">${a.steps.map((_, i) => html`<a class="chip${i === index ? ' on' : ''}" href="${at(i + 1)}"${i === index ? html` aria-current="step"` : ''}><b>${i + 1}</b><span class="sr">Schritt ${i + 1}</span></a>`)}</span>
        <span class="wk-go">${index > 0 ? html`<a class="btn" href="${at(index)}">Zurück</a>` : ''}${index < total - 1 ? html`<a class="btn pri" href="${at(index + 2)}">Weiter</a>` : ''}</span>
      </nav>
      ${reduceMotion() ? '' : html`<div class="acts single"><button class="btn" type="button" data-wissen-play="${a.id}" aria-pressed="${String(playing)}">${playing ? 'Anhalten' : 'Abspielen'}</button></div>`}
      <p class="wk-step" role="status"><b>Schritt ${index + 1} von ${total}.</b> ${s.text}</p>
      <h2 class="h2 wk-title" id="w-sel">${a.title}</h2>
      <p class="wk-lead">${a.short}</p>
      <div class="card"><h3 class="h4 first">Idee</h3><p>${a.idee}</p></div>
      <h3 class="h4" id="w-all">Alle Schritte</h3><ol class="wk-list" aria-labelledby="w-all">${a.steps.map(x => html`<li>${x.text}</li>`)}</ol>`,
    mini: x => feldbild({label: x.title, players: stepPlayers(x, 0), moves: x.steps[0].moves, mini: true}),
    lines: x => html`<span class="wk-ms">${firstSentence(x.idee)}</span>`
  });
}

function artikel(a) {
  return html`${subBand(backLink('Wissen', href.wissen(a.chapter)), a.title, groupTitle(a) || 'Wissen')}
    ${a.field ? html`<section class="sec after-band">${feldbild(a.field)}</section>` : ''}<section class="sec${a.field ? '' : ' after-band'}"><p class="wk-lead">${a.short}</p><div class="prose">${a.body.map(t => html`<p>${t}</p>`)}</div></section>
    ${inApp(a)}${related(a)}`;
}

export function renderWissen({route, ui}) {
  if (route.chapter === 'aufstellungen') return aufstellungen(route);
  if (route.chapter === 'spielzuege') return spielzuege(route, ui);
  const a = route.id ? article(route.id) : null;
  return a && a.chapter === 'regeln' ? artikel(a) : regeln();
}
