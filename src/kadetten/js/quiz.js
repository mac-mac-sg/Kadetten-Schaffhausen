// Quiz der Woche: jede Kalenderwoche fünf Fragen, für alle Geräte dieselben. Antworten bleiben nur auf diesem Gerät.
import {QUESTIONS} from '../data/quiz.js';

export const QUIZ_KEY = 'v2:app-quiz';
export const QUIZ_SIZE = 5;
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
  const start = (((week * QUIZ_SIZE) % ord.length) + ord.length) % ord.length;
  return {week, questions: [...Array(QUIZ_SIZE).keys()].map(i => questions[ord[(start + i) % ord.length]])};
}

const storage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};
export function quizAnswers(s = storage()) {
  try {
    const v = JSON.parse(s?.getItem(QUIZ_KEY) ?? 'null');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v)
        .filter(
          ([k, a]) =>
            /^\d{1,6}$/.test(k) && Array.isArray(a) && a.length <= QUIZ_SIZE && a.every(n => Number.isInteger(n) && n >= 0 && n <= 3)
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
  if (index !== given.length || index >= QUIZ_SIZE || !Number.isInteger(choice) || choice < 0 || choice > 3) return given;
  all[week] = [...given, choice];
  try {
    s?.setItem(QUIZ_KEY, JSON.stringify(all));
  } catch {}
  return all[week];
}
/** Bilanz über alle abgeschlossenen Wochen. */
export function quizStats(answers, questions = QUESTIONS) {
  let weeks = 0,
    right = 0;
  for (const [week, given] of Object.entries(answers)) {
    if (given.length < QUIZ_SIZE) continue;
    weeks++;
    const quiz = weeklyQuiz(inWeek(week), questions);
    right += given.filter((choice, i) => quiz.questions[i].c === choice).length;
  }
  return {weeks, right, total: weeks * QUIZ_SIZE};
}
