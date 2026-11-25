// Quiz der Woche: drei Fragen, eine nach der anderen. Kein Konto, keine Übertragung.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {weeklyQuiz, quizAnswers, quizStats, nextQuizAt, weekResult} from '../quiz.js';
import {subBand, backLink, sectionHead} from './parts.js';

const more = m => (m === 'verein' ? href.verein('geschichte') : Array.isArray(m) ? href.wissen(m[0], m[1]) : null);
const weekday = at => new Date(at).toLocaleDateString('de-CH', {weekday: 'long', timeZone: 'Europe/Zurich'});
const day = at => new Date(at).toLocaleDateString('de-CH', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Zurich'});

/** Zustand des Quiz dieser Woche: Fragen, gegebene Antworten, Anzahl richtige. */
export function quizState(now, answers = quizAnswers()) {
  const quiz = weeklyQuiz(now),
    given = answers[quiz.week] || [];
  const result = weekResult(quiz.week, given);
  // Antworten aus der Zeit mit fünf Fragen: Nur die ersten zählen und erscheinen.
  return {...quiz, ...result, given: given.slice(0, result.size)};
}

/** Ein Strich je Frage: orange für beantwortete (laufend) bzw. richtige (abgeschlossen) Fragen. Reine Zierde, der Text sagt dasselbe. */
const quizDots = s =>
  html`<span class="qdots" aria-hidden="true">${s.questions.map((q, i) =>
    s.given[i] === undefined || (s.done && s.given[i] !== q.c) ? html`<i></i>` : html`<i class="on"></i>`
  )}</span>`;

/** Karte «Quiz der Woche» auf der Titelseite: offen, laufend oder abgeschlossen mit grosser Ergebniszahl. */
export function quizTeaser(now, answers = quizAnswers()) {
  const s = quizState(now, answers);
  const open = href.quiz();
  const body = s.done
    ? html`<a class="card quizcard tile done${s.right === s.size ? '' : ' part'}" href="${open}"><b class="fig qno num">${s.right}/${s.size}</b><span class="grow"><span class="line"><span class="t">${
        s.right === s.size ? 'Alles richtig' : `${s.right} von ${s.size} richtig`
      }</span>${quizDots(s)}</span><span class="s">Neues Quiz am ${weekday(nextQuizAt(now))}</span></span>${icon('go')}</a>`
    : html`<a class="card rowcard tile" href="${open}"><span class="lead">${icon('book')}</span><span class="grow"><span class="t">${
        s.given.length ? `Frage ${s.given.length + 1} von ${s.size}` : 'Drei neue Fragen'
      }</span>${s.given.length ? quizDots(s) : html`<span class="s">Noch nicht gespielt</span>`}</span>${icon('go')}</a>`;
  return html`<section class="sec" aria-labelledby="j-quiz">${sectionHead('Quiz der Woche', '', '', 'j-quiz')}${body}</section>`;
}

function answered(q, choice, index) {
  const ok = q.c === choice;
  return html`<li class="quiz-done ${ok ? 'ok' : 'no'}">
    <span class="quiz-mark" aria-hidden="true">${ok ? '✓' : '✕'}</span>
    <span class="grow"><b>${index + 1}. ${q.q}</b>
      <span class="s">${ok ? 'Richtig' : `Deine Antwort: ${q.a[choice]}. Richtig: ${q.a[q.c]}`}. ${q.w}</span>
      ${more(q.m) ? html`<a class="more" href="${more(q.m)}">Mehr dazu</a>` : ''}</span></li>`;
}

export function renderQuiz({now}) {
  const answers = quizAnswers(),
    s = quizState(now, answers),
    stats = quizStats(answers);
  const current = s.done ? null : s.questions[s.given.length];
  return html`${subBand(backLink('Zurück', href.jetzt()), 'Quiz der Woche', s.done ? 'Abgeschlossen' : `Frage ${s.given.length + 1} von ${s.size}`)}
    ${
      current
        ? html`<section class="sec" aria-labelledby="q-frage">
      <div class="card quiz-card">
        <h2 class="h2" id="q-frage">${current.q}</h2>
        <div class="quiz-opts">${current.a.map(
          (text, i) => html`<button class="btn wide" type="button" data-quiz="${s.week + ':' + s.given.length + ':' + i}">${text}</button>`
        )}</div>
      </div></section>`
        : html`<section class="sec" aria-labelledby="q-res">
      <div class="card quiz-card result">
        <h2 class="sr" id="q-res">Ergebnis</h2>
        <b class="kick num">${s.right}/${s.size}</b>
        <p>${s.right === s.size ? 'Alles richtig. Stark!' : s.right >= 2 ? 'Gut gespielt.' : 'Nächste Woche gibt es eine neue Chance.'}</p>
        <p class="fine">Neues Quiz am ${day(nextQuizAt(now))}.</p>
        <a class="card rowcard quiz-cards" href="${href.ich()}"><span class="lead">${icon('star')}</span><span class="grow"><span class="t">${s.right === s.size ? '3 Sammelkarten verdient' : '2 Sammelkarten verdient'}</span><span class="s">In «Mein Bereich» abholen</span></span>${icon('go')}</a>
        <div class="acts single"><button class="btn pri" type="button" data-share="${`Quiz der Woche in der Kadetten-App: ${s.right} von ${s.size} richtig.`}">${icon('share')}Ergebnis teilen</button></div>
      </div></section>`
    }
    ${
      s.given.length
        ? html`<section class="sec" aria-labelledby="q-bisher">${sectionHead(s.done ? 'Auflösung' : 'Bisher', '', '', 'q-bisher')}
      <ol class="card list quiz-list">${s.given.map((choice, i) => answered(s.questions[i], choice, i))}</ol></section>`
        : ''
    }
    <section class="sec"><p class="note">${icon('book', 18)}<span>${
      stats.weeks
        ? `Deine Bilanz: ${stats.right} von ${stats.total} richtig in ${stats.weeks} ${stats.weeks === 1 ? 'Quiz' : 'Quiz-Wochen'}. `
        : ''
    }Die Antworten bleiben auf diesem Gerät.</span></p></section>`;
}
