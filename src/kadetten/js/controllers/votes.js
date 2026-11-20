// Fan-Wahl «Spieler des Matchs»: Kandidat merken, Stimme abgeben.
import {parseRoute} from '../router.js';

export function createVotesController({ui, store, render}) {
  async function cast(player) {
    const id = parseRoute(location.hash).id;
    if (!id || ui.voteBusy) return;
    Object.assign(ui, {voteGame: String(id), voteBusy: true, voteMessage: 'Stimme wird gespeichert …'});
    render();
    try {
      await ui.votes.vote(id, player);
      ui.voteMessage = 'Deine Stimme ist gezählt.';
    } catch (error) {
      ui.voteMessage = error.message;
    }
    ui.voteBusy = false;
    store.invalidate('votes:' + id);
    render();
  }

  return {
    actions: [
      [
        'data-vote-select',
        el => {
          const id = parseRoute(location.hash).id;
          ui.voteSelections[id] = el.dataset.voteSelect;
          ui.voteMessage = '';
          render();
        }
      ],
      [
        'data-vote-confirm',
        () => {
          const id = parseRoute(location.hash).id;
          if (ui.voteSelections[id]) cast(ui.voteSelections[id]);
        }
      ]
    ],
    focusAttrs: ['data-vote-select', 'data-vote-confirm']
  };
}
