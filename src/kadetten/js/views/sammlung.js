// «Mein Bereich» mit Quiz-Bilanz und Sammelkarten, die Sammlung, die Kartenansicht und neue Karten.
import {recapTeaser} from './rueckblick.js';
import {seasonOver} from '../rueckblick.js';
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {LOGO, topBar, subBand, backLink, sectionHead, listRow, playerByNumber, notice, chips, gameRow} from './parts.js';
import {hasScore, ownGames, kickoff} from '../logic.js';
import {tipPoints} from '../moments.js';
import {withFinished} from '../match.js';
import {favourite, myGames, tips} from '../personal.js';
import {quizAnswers, weekIndex, weekResult} from '../quiz.js';
import {DECK, ARTS, RARITY_LABEL, rarityOf, collection, pending, progress, recent, cardById, liveSeen} from '../sammeln.js';
import {SOURCES} from '../../data/sammelkarten.js';

const ART_LABEL = Object.fromEntries(ARTS.map(([id, label]) => [id, label]));
const NUMBER = new Map(DECK.map((c, i) => [c.id, i + 1]));
const pad = n => String(n).padStart(3, '0');

/** Eingaben für die Belohnungen aus dem Gerät und dem Datenstand. */
export const sammelInput = state => ({
  games: state.data?.games || [],
  answers: quizAnswers(),
  visited: myGames(),
  tips: tips(),
  live: liveSeen(),
  favourite: favourite()
});

/** Quiz-Bilanz: Wochen in Folge, Anteil richtiger Antworten, Wochen ohne Fehler. */
export function quizBilanz(answers, now) {
  const done = Object.entries(answers).filter(([w, a]) => weekResult(w, a).done);
  let right = 0,
    total = 0,
    perfect = 0;
  for (const [week, given] of done) {
    const r = weekResult(week, given);
    right += r.right;
    total += r.size;
    if (r.right === r.size) perfect++;
  }
  const weeks = new Set(done.map(([w]) => Number(w)));
  let w = weekIndex(now);
  if (!weeks.has(w)) w--;
  let streak = 0;
  while (weeks.has(w)) {
    streak++;
    w--;
  }
  return {streak, quote: total ? Math.round((right / total) * 100) : null, perfect, weeks: done.length};
}

/** Vorderseite einer Karte. size: '' (Raster), 'lg' (Ansicht), 'sm' (Vorschau). */
/** Arten im Querformat (Bild trägt: Ort, Titel, Spiel, Geschichte); Personen und Momente bleiben hochkant. */
export const WIDE_ARTS = new Set(['ort', 'titel', 'spiel', 'geschichte']);
export const isWide = card => WIDE_ARTS.has(card?.art);

export function cardFront(card, {size = '', link = true, quer = false} = {}) {
  const rarity = rarityOf(card),
    no = NUMBER.get(card.id);
  const img = card.image
    ? html`<span class="sk-img"><img src="${card.image}" alt="" loading="lazy" decoding="async"></span><span class="sk-stp" aria-hidden="true"></span>`
    : html`<span class="sk-big num" aria-hidden="true">${card.big}</span><img class="sk-wap" src="${LOGO}" alt="" aria-hidden="true">`;
  const shine = rarity === 'spezial' || rarity === 'legende' ? html`<span class="sk-gl" aria-hidden="true"></span>` : '';
  const body = html`${img}${shine}${card.image ? html`<span class="sk-no num" aria-hidden="true">${card.big}</span>` : ''}
    <span class="sk-tag">${card.art === 'kader' ? 'Kader' : RARITY_LABEL[rarity]}</span>
    <span class="sk-txt"><span class="sk-k">${card.kicker}</span><span class="sk-t">${card.title}</span></span>
    <span class="sk-f"><span>${no ? '#' + pad(no) : 'Moment'}</span><span>${ART_LABEL[card.art]}</span></span>`;
  const cls = `sk ${rarity} a-${card.art}${card.image ? '' : ' typo'}${size ? ' ' + size : ''}${quer ? ' quer' : ''}`;
  return link
    ? html`<a class="${cls}" href="${href.karte(card.id)}" aria-label="${`${card.title}, ${ART_LABEL[card.art]}, ${RARITY_LABEL[rarity]}`}">${body}</a>`
    : html`<span class="${cls}">${body}</span>`;
}
function cardLocked(card) {
  return html`<div class="sk lock${isWide(card) ? ' quer' : ''}" aria-label="${`Karte ${pad(NUMBER.get(card.id))}, noch nicht gesammelt`}">
    <span class="sk-q" aria-hidden="true">?</span>
    <span class="sk-tag">#${pad(NUMBER.get(card.id))}</span>
    <span class="sk-txt"><span class="sk-k">${ART_LABEL[card.art]} · ${RARITY_LABEL[rarityOf(card)]}</span><span class="sk-t">Noch nicht gesammelt</span></span></div>`;
}
function cardBack(card, data, quer = false) {
  const season = card.art === 'kader' ? data?.playerSeason?.players?.[card.number] : null;
  const facts = [
    ...(card.facts || []),
    ...(season
      ? [
          ['Spiele (QHL)', season.games],
          ['Tore (QHL)', season.goals]
        ]
      : [])
  ];
  return html`<div class="sk rueck ${rarityOf(card)} lg${quer ? ' quer' : ''}"><div class="sk-in">
    <span class="sk-bt">${card.title}</span>
    <span class="sk-bk">${card.kicker}</span>
    ${card.text ? html`<span class="sk-bx">${card.text}</span>` : ''}
    ${facts.length ? html`<dl class="sk-dl">${facts.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>` : ''}
    <span class="sk-src">${
      card.src
        ? 'Quelle: ' +
          card.src
            .split(/,\s*/)
            .map(k => SOURCES[k] || k)
            .join(', ')
        : card.art === 'moment'
          ? 'Aus dem Spielplan'
          : ''
    }</span>
    </div><img class="sk-wap" src="${LOGO}" alt="" aria-hidden="true"></div>`;
}

function myMatchday({input, state, now}) {
  const savedTips = input.tips;
  const games = ownGames(input.games)
    .reverse()
    .map(game => withFinished(game, state.live, now));
  const visited = games.filter(game => input.visited.includes(String(game.id)));
  const tipped = games.filter(game => Object.hasOwn(savedTips, game.id));
  const missingVisits = new Set(input.visited).size - visited.length;
  const missingTips = Object.keys(savedTips).length - tipped.length;
  return html`<section class="sec" aria-labelledby="m-spiele">
    ${sectionHead('Spieltag', '', '', 'm-spiele')}
    <details class="card more-card aktuell" id="m-meine-spiele">
      <summary><span class="grow"><span class="t">Meine Spiele</span><span class="s">${input.visited.length} in der Halle</span></span></summary>
      ${visited.length ? html`<div class="list">${visited.map(game => gameRow(game, now))}</div>` : ''}
      ${missingVisits > 0 ? html`<p class="fine pad-top-s">${missingVisits} gespeicherte Besuche ohne Eintrag im aktuellen Spielplan.</p>` : ''}
      ${input.visited.length ? '' : html`<p class="fine pad-top-s">Markiere auf der Spielseite «Ich war in der Halle».</p>`}
    </details>
    <details class="card more-card aktuell" id="m-meine-tipps">
      <summary><span class="grow"><span class="t">Meine Tipps</span><span class="s">${Object.keys(savedTips).length} gespeichert</span></span></summary>
      ${
        tipped.length
          ? html`<ul class="list" role="list">${tipped.map(game => {
              const tip = savedTips[game.id];
              const score = hasScore(game) ? tipPoints(tip, game.score) : null;
              const status =
                score !== null
                  ? score === 1
                    ? '1 Punkt'
                    : `${score} Punkte`
                  : kickoff(game) > now
                    ? 'Bis Anpfiff änderbar'
                    : 'Resultat offen';
              return html`<li>${gameRow(game, now)}<p class="fine pad-top-s">Tipp <b class="num">${tip.join(':')}</b> · ${status}</p></li>`;
            })}</ul>`
          : ''
      }
      ${missingTips > 0 ? html`<p class="fine pad-top-s">${missingTips} gespeicherte Tipps ohne Eintrag im aktuellen Spielplan.</p>` : ''}
      ${Object.keys(savedTips).length ? '' : html`<p class="fine pad-top-s">Deinen ersten Tipp kannst du vor Anpfiff auf der Spielseite abgeben.</p>`}
    </details>
  </section>`;
}

export function renderMein({state, now, ui = {}}) {
  const input = sammelInput(state),
    open = pending(input),
    prog = progress(),
    quiz = quizBilanz(input.answers, now),
    fav = playerByNumber(favourite()),
    latest = recent(3, input.games);
  const gained = open.reduce((n, r) => n + (r.fixed?.length || 0) + (r.pick || 0), 0);
  return html`${topBar('Mein Bereich', 'Spieltag, Quiz und Sammlung', html`<a class="icb" href="${href.einstellungen()}" aria-label="Einstellungen">${icon('settings', 22)}</a>`)}
    ${
      open.length
        ? html`<section class="sec"><div class="card claim">
      <span class="claim-k">Neue Karten</span>
      <b class="claim-n num">${gained}</b>
      <span class="claim-t">${open.length === 1 ? open[0].label : `${open.length} Belohnungen, zuletzt: ${open.at(-1).label}`}</span>
      <button class="btn pri wide pulse" type="button" data-claim>Karten abholen</button></div></section>`
        : ''
    }
    ${recapTeaser(state.data?.games, now)}
    <section class="sec" aria-labelledby="m-quiz">${sectionHead('Quiz der Woche', 'Zum Quiz', href.quiz(), 'm-quiz')}
      <div class="card stats q3">
        <span class="stat"><span class="v num">${quiz.streak}</span><span class="k">${quiz.streak === 1 ? 'Woche' : 'Wochen'} in Folge</span></span>
        <span class="stat"><span class="v num">${quiz.quote === null ? '–' : quiz.quote + ' %'}</span><span class="k">richtig beantwortet</span></span>
        <span class="stat"><span class="v num">${quiz.perfect}</span><span class="k">${quiz.perfect === 1 ? 'Woche' : 'Wochen'} ohne Fehler</span></span>
      </div></section>
    <section class="sec" aria-labelledby="m-karten">${sectionHead('Sammelkarten', 'Alle Karten', href.sammlung(), 'm-karten')}
      <a class="card prog" href="${href.sammlung()}">
        <span class="prog-row"><b class="num">${prog.have}</b><span>von ${prog.total} Karten${prog.moments ? ` · ${prog.moments} ${prog.moments === 1 ? 'Moment' : 'Momente'}` : ''}</span><em class="num">${Math.round((prog.have / prog.total) * 100)} %</em></span>
        <span class="prog-bar" aria-hidden="true"><i data-style="${'width:' + Math.max(1, Math.round((prog.have / prog.total) * 100)) + '%'}"></i></span>
        <span class="prog-leg">${['standard', 'spezial', 'legende'].map(r => {
          const arts = ARTS.filter(([, , x]) => x === r).map(([id]) => id);
          const have = arts.reduce((n, a) => n + prog.per[a].have, 0),
            total = arts.reduce((n, a) => n + prog.per[a].total, 0);
          return html`<span><i class="r-${r}"></i>${RARITY_LABEL[r]} <b class="num">${have}/${total}</b></span>`;
        })}</span></a>
      ${latest.length ? html`<div class="sk-row${ui.enter ? ' enter' : ''}">${latest.map(c => cardFront(c, {size: 'sm'}))}</div>` : ''}
      <p class="fine pad-top">Karten gibt es für das Quiz der Woche, für Tipps, für Heimspiele in der Halle und wenn du ein Spiel live in der App verfolgst.</p>
    </section>
    ${myMatchday({input, state, now})}
    <section class="sec" aria-labelledby="m-wissen">${sectionHead('Wissen', 'Alles', href.wissen(), 'm-wissen')}
      <div class="card list">
        ${[
          ['regeln', 'Regeln', 'Spiel, Strafen und Statistik-Begriffe'],
          ['aufstellungen', 'Aufstellungen', 'Abwehr, Angriff und Positionen im Feldbild'],
          ['spielzuege', 'Spielzüge', 'Schritt für Schritt erklärt']
        ].map(([id, title, sub]) => listRow({title, sub, link: href.wissen(id), lead: html`<span class="lead">${icon('book')}</span>`}))}
      </div></section>
    <section class="sec" aria-labelledby="m-dich">${sectionHead('Für dich', '', '', 'm-dich')}
      <div class="card list">
        ${listRow({title: 'Lieblingsspieler', sub: fav ? fav.name : 'Im Spielerprofil mit dem Stern merken', link: fav ? href.spieler(fav.number) : href.team(), lead: html`<span class="lead">${icon('star')}</span>`})}
        ${
          seasonOver(state.data?.games || [], now)
            ? ''
            : listRow({
                title: 'Saisonrückblick',
                sub: 'Kommt nach dem letzten Spiel. Zwischenstand ansehen',
                link: href.rueckblick(),
                lead: html`<span class="lead">${icon('star')}</span>`
              })
        }
        ${listRow({title: 'Einstellungen', sub: 'Mitteilungen, Darstellung, Kalender', link: href.einstellungen(), lead: html`<span class="lead">${icon('settings')}</span>`})}
      </div></section>`;
}

export function renderSammlung({state, ui}) {
  const {cards} = collection(),
    art = ARTS.some(([id]) => id === ui.sArt) ? ui.sArt : 'alle',
    mine = ui.sMine === '1';
  const games = state.data?.games || [];
  const moments = Object.keys(cards)
    .filter(id => id.startsWith('mo-'))
    .map(id => cardById(id, games))
    .filter(Boolean);
  const list = [...DECK, ...moments].filter(c => (art === 'alle' || c.art === art) && (!mine || cards[c.id]));
  const prog = progress();
  return html`${subBand(backLink('Mein Bereich', href.ich()), 'Sammlung', `${prog.have} von ${prog.total} Karten`)}
    <div class="seg" role="group" aria-label="Ansicht">
      <button type="button" data-ui="sMine:0" aria-pressed="${String(!mine)}"${mine ? '' : html` class="on"`}>Alle Karten</button><button type="button" data-ui="sMine:1" aria-pressed="${String(mine)}"${mine ? html` class="on"` : ''}>Meine Karten</button></div>
    ${chips('sArt', [['alle', 'Alle'], ...ARTS.filter(([id]) => id !== 'moment' || moments.length).map(([id, label]) => [id, label])], art, 'Kartenart')}
    <section class="sec" aria-label="Karten">
      ${
        list.length
          ? html`<div class="sk-grid${ui.enter ? ' enter' : ''}">${list.map(c => (cards[c.id] ? cardFront(c, {quer: isWide(c)}) : cardLocked(c)))}</div>`
          : notice(mine ? 'In dieser Art hast du noch keine Karte.' : 'Keine Karten in dieser Art.', 'star')
      }</section>`;
}

/** Rückseite einer neuen Karte, solange sie verdeckt ist. */
const cover = () =>
  html`<span class="sk cover" aria-hidden="true"><span class="sk-cs"></span><img class="sk-cw" src="${LOGO}" alt=""><span class="sk-cn">Kadetten</span></span>`;

export function renderKarte({route, state, ui}) {
  const games = state.data?.games || [];
  const card = cardById(route.id, games),
    owned = card && collection().cards[card.id];
  if (!card || !owned)
    return html`${subBand(backLink('Sammlung', href.sammlung()), 'Karte', '')}<section class="sec">${notice('Diese Karte ist noch nicht in deiner Sammlung.', 'star')}</section>`;
  const back = ui.flip === card.id,
    quer = isWide(card);
  // Beide Seiten liegen übereinander; «Umdrehen» dreht die Karte in 3D (main.js setzt nur die Klasse, ohne neu zu zeichnen).
  return html`${subBand(backLink('Sammlung', href.sammlung(), true), card.title, `${ART_LABEL[card.art]} · ${RARITY_LABEL[rarityOf(card)]}`)}
    <section class="sec sk-view">
      <div class="sk-flip lg${quer ? ' quer' : ''}${back ? ' is-back' : ''}${ui.enter ? ' enter' : ''}" data-flipcard="${card.id}" role="button" tabindex="0" aria-pressed="${String(back)}" aria-label="${`${card.title}: Karte umdrehen`}">
        <div class="sk-face" aria-hidden="${String(back)}">${cardFront(card, {size: 'lg', link: false, quer})}</div>
        <div class="sk-face rear" aria-hidden="${String(!back)}">${cardBack(card, state.data, quer)}</div>
      </div>
      <div class="acts single"><button class="btn" type="button" data-flip="${card.id}" aria-pressed="${String(back)}">${icon('share')}<span>${back ? 'Vorderseite' : 'Umdrehen'}</span></button></div>
      ${card.art === 'kader' ? html`<div class="card list pad-top">${listRow({title: 'Zum Spielerprofil', link: href.spieler(card.number)})}</div>` : ''}
      ${card.art === 'moment' && card.game ? html`<div class="card list pad-top">${listRow({title: 'Zum Spiel', link: href.spiel(card.game)})}</div>` : ''}
    </section>`;
}

/** Neue Karten als Fächer: verdeckt ausgeteilt, Antippen deckt eine Karte auf, «Alle aufdecken» alle nacheinander. */
export function renderNeu({state, ui}) {
  const games = state.data?.games || [];
  const fresh = (ui.newCards || []).map(id => cardById(id, games)).filter(Boolean);
  const open = new Set(ui.revealed || []);
  const n = Math.min(fresh.length, 12);
  const all = fresh.length > 0 && fresh.every(c => open.has(c.id));
  return html`${subBand(backLink('Mein Bereich', href.ich()), fresh.length === 1 ? 'Neue Karte' : 'Neue Karten', fresh.length ? `${fresh.length} ${fresh.length === 1 ? 'Karte' : 'Karten'} für deine Sammlung` : '')}
    <section class="sec" aria-label="Neue Karten">
      ${
        fresh.length
          ? html`<div class="fan fn-${n}${ui.enter ? ' deal' : ''}${all && n > 1 ? ' spread' : ''}">${fresh.map((c, i) => {
              const shown = open.has(c.id);
              return html`<button type="button" class="fan-c fi-${Math.min(i, 11)} r-${rarityOf(c)}${shown ? ' is-open' : ''}${shown && ui.fanTop === c.id ? ' is-top' : ''}" data-reveal="${c.id}" aria-label="${shown ? `${c.title}, ${ART_LABEL[c.art]}` : `Karte ${i + 1} aufdecken`}">
                <span class="sk-flip"><span class="sk-face">${cover()}</span><span class="sk-face rear">${cardFront(c, {link: false})}</span></span></button>`;
            })}</div>
          <p class="fine fan-hint" role="status">${
            fresh.length === 1
              ? all
                ? 'Die Karte ist jetzt in deiner Sammlung. Antippen öffnet sie.'
                : 'Antippen deckt die Karte auf.'
              : all
                ? 'Wischen oder antippen holt eine Karte nach vorne, nochmals antippen öffnet sie.'
                : 'Antippen oder wischen deckt die nächste Karte auf.'
          }</p>`
          : notice('Im Moment gibt es keine neuen Karten. Sie warten im Quiz der Woche, bei Tipps und Heimspielen.', 'star')
      }
      <div class="acts${fresh.length && !all ? '' : ' single'}">${
        fresh.length && !all ? html`<button class="btn" type="button" data-reveal-all>Alle aufdecken</button>` : ''
      }<a class="btn pri" href="${href.sammlung()}">Zur Sammlung</a></div>
    </section>`;
}
