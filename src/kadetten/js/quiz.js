// Quiz der Woche: jede Kalenderwoche drei Fragen (bis 15.11.2026 fünf), für alle Geräte dieselben. Antworten bleiben nur auf diesem Gerät.
import {QUESTIONS} from '../data/quiz.js';
import {storage} from './storage.js';

export const QUIZ_KEY = 'v2:app-quiz';
export const QUIZ_SIZE = 3;
// Bis zur Woche vom 16.11.2026 hatte das Quiz fünf Fragen. Ältere Wochen behalten ihre Fragen, damit gespeicherte Antworten stimmen.
export const SHORT_FROM = 2967;
const OLD_SIZE = 5;
/** Anzahl Fragen einer Quiz-Woche. */
export const quizSize = week => (Number(week) < SHORT_FROM ? OLD_SIZE : QUIZ_SIZE);
const startOf = week => (week < SHORT_FROM ? week * OLD_SIZE : SHORT_FROM * OLD_SIZE + (week - SHORT_FROM) * QUIZ_SIZE);
const WEEK = 7 * 86400000;
// Montag, 5. Januar 1970, 00:00 Uhr Schweizer Winterzeit: Wochen beginnen am Montag (Sommerzeit verschiebt den Wechsel um eine Stunde).
const EPOCH = 4 * 86400000 - 3600000;

export const weekIndex = now => Math.floor((now - EPOCH) / WEEK);
export const nextQuizAt = now => EPOCH + (weekIndex(now) + 1) * WEEK;
/** Ein Zeitpunkt innerhalb einer Quiz-Woche (für Auswertungen vergangener Wochen). */
export const inWeek = week => EPOCH + Number(week) * WEEK + 1;

/** Feste Reihenfolge aller Fragen: gemischt, aber auf jedem Gerät gleich. */
function order(count) {
  const list = [...Array(count).keys()];
  let seed = 1791;
  for (let i = count - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
export function weeklyQuiz(now, questions = QUESTIONS) {
  const week = weekIndex(now),
    ord = order(questions.length);
  const start = ((startOf(week) % ord.length) + ord.length) % ord.length;
  return {week, questions: [...Array(quizSize(week)).keys()].map(i => questions[ord[(start + i) % ord.length]])};
}

export function quizAnswers(s = storage()) {
  try {
    const v = JSON.parse(s?.getItem(QUIZ_KEY) ?? 'null');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v)
        .filter(
          ([k, a]) =>
            /^\d{1,6}$/.test(k) && Array.isArray(a) && a.length <= OLD_SIZE && a.every(n => Number.isInteger(n) && n >= 0 && n <= 3)
        )
        .slice(-80)
    );
  } catch {
    return {};
  }
}
/** Speichert eine Antwort. Eine gegebene Antwort bleibt, und die Fragen werden der Reihe nach beantwortet. */
export function answerQuiz(week, index, choice, s = storage()) {
  const all = quizAnswers(s),
    given = all[week] || [];
  if (index !== given.length || index >= quizSize(week) || !Number.isInteger(choice) || choice < 0 || choice > 3) return given;
  all[week] = [...given, choice];
  try {
    s?.setItem(QUIZ_KEY, JSON.stringify(all));
  } catch {}
  return all[week];
}
/** Auswertung einer Woche: Anzahl Fragen, richtige Antworten, abgeschlossen. */
export function weekResult(week, given = [], questions = QUESTIONS) {
  const quiz = weeklyQuiz(inWeek(week), questions),
    size = quiz.questions.length;
  return {size, right: given.slice(0, size).filter((c, i) => quiz.questions[i].c === c).length, done: given.length >= size};
}
/** Bilanz über alle abgeschlossenen Wochen. */
export function quizStats(answers, questions = QUESTIONS) {
  let weeks = 0,
    right = 0,
    total = 0;
  for (const [week, given] of Object.entries(answers)) {
    const r = weekResult(week, given, questions);
    if (!r.done) continue;
    weeks++;
    right += r.right;
    total += r.size;
  }
  return {weeks, right, total};
}
