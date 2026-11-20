// Persönliche Aktionen auf dem Gerät: Darstellung, Lieblingsspieler, Hallenbesuch, Tipp, Quiz und App installieren.
import {applyTheme} from '../theme.js';
import {toggleFavourite, toggleMyGame, changeTip} from '../personal.js';
import {answerQuiz} from '../quiz.js';

export function createPersonal({ui, render, schedule, announce}, pushController) {
  let installPrompt = null;
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    ui.canInstall = true;
    schedule();
  });

  return {
    actions: [
      [
        'data-theme-choice',
        el => {
          applyTheme(el.dataset.themeChoice);
          render();
        }
      ],
      [
        'data-favourite',
        el => {
          const number = Number(el.dataset.favourite);
          const next = toggleFavourite(number);
          announce(next ? 'Als Lieblingsspieler gemerkt.' : 'Lieblingsspieler entfernt.');
          pushController.followFavourite();
          render();
        }
      ],
      [
        'data-my-game',
        el => {
          toggleMyGame(el.dataset.myGame);
          render();
        }
      ],
      [
        'data-quiz',
        el => {
          const [week, index, choice] = el.dataset.quiz.split(':').map(Number);
          answerQuiz(week, index, choice);
          render();
          document.getElementById('main')?.focus({preventScroll: true});
        }
      ],
      [
        'data-tip',
        el => {
          const [id, team, delta] = el.dataset.tip.split(':');
          changeTip(id, Number(team), Number(delta));
          render();
        }
      ],
      [
        'data-install',
        () => {
          if (!installPrompt) return;
          installPrompt.prompt();
          installPrompt = null;
          ui.canInstall = false;
          render();
        }
      ]
    ],
    focusAttrs: ['data-theme-choice', 'data-favourite', 'data-my-game']
  };
}
