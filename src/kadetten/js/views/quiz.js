// Quiz der Woche: drei Fragen, eine nach der anderen. Kein Konto, keine Übertragung.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {weeklyQuiz, quizAnswers, quizStats, nextQuizAt, weekResult} from '../quiz.js';
import {subBand, backLink, sectionHead} from './parts.js';

const more = m => (m === 'verein' ? href.verein('geschichte') : Array.isArray(m) ? href.wissen(m[0], m[1]) : null);
const day = at => new Date(at).toLocaleDateString('de-CH', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Zurich'});

/** Zustand des Quiz dieser Woche: Fragen, gegebene Antworten, Anzahl richtige. */
export function quizState(now, answers = quizAnswers()) {
  const quiz = weeklyQuiz(now),
    given = answers[quiz.week] || [];
  const result = weekResult(quiz.week, given);
  // Antworten aus der Zeit mit fünf Fragen: Nur die ersten zählen und erscheinen.
  return {...quiz, ...result, given: given.slice(0, result.size)};
}

/** Hinweis auf der Titelseite und im Wissen. */
export function quizTeaser(now) {
  const s = quizState(now);
  return html`<section class="sec" aria-labelledby="j-quiz">${sectionHead('Quiz der Woche', '', '', 'j-quiz')}
    <a class="card rowcard" href="${href.quiz()}"><span class="lead">${icon('book')}</span><span class="grow"><span class="t">${
      s.done
        ? `${s.right} von ${s.size} richtig`
        : s.given.length
          ? `Frage ${s.given.length + 1} von ${s.size}`
          : 'Drei Fragen zu Handball und Verein'
    }</span>${s.done ? html`<span class="s">Neues Quiz am ${day(nextQuizAt(now))}</span>` : ''}</span>${icon('go')}</a></section>`;
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
