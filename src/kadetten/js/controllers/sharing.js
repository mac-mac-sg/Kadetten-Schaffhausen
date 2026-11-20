// Teilen und Exportieren: Text teilen, Resultat als Bild, Spielplan als Kalenderdatei.
import {resultImage, shareImage} from '../share-image.js';
import {outcome, shortTeam} from '../logic.js';
import {withFinished} from '../match.js';
import {crestSrc, RESULT_TEXT} from '../views/parts.js';
import {shareText} from '../views/jetzt.js';
import {buildCalendar} from '../calendar.js';

export function createSharing({ui, store, announce}) {
  async function shareLink(text) {
    const url = new URL('./', location.href).href;
    try {
      if (navigator.share) await navigator.share({title: 'Kadetten', text, url});
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        ui.pushMessage = '';
        announce('Resultat kopiert.');
      }
    } catch {}
  }

  async function shareResult(id) {
    const raw = store.state.data?.games.find(g => String(g.id) === id);
    const game = raw && withFinished(raw, store.state.live, Date.now());
    if (!game?.score) return;
    announce('Bild wird erstellt …');
    const blob = await resultImage({
      game: {...game, homeShort: shortTeam(game.home), awayShort: shortTeam(game.away)},
      label: RESULT_TEXT[outcome(game)] || '',
      crests: [crestSrc(game.home), crestSrc(game.away)]
    });
    await shareImage(blob, `kadetten-${game.date}.png`, shareText(game));
  }

  function downloadCalendar() {
    const {text, count} = buildCalendar(store.state.data?.games, Date.now());
    const url = URL.createObjectURL(new Blob([text], {type: 'text/calendar;charset=utf-8'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: 'kadetten-spiele.ics'});
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    announce(`${count} Spiele als Kalenderdatei gespeichert.`);
  }

  return {
    actions: [
      ['data-share', el => shareLink(el.dataset.share)],
      ['data-share-image', el => shareResult(el.dataset.shareImage)],
      ['data-calendar', downloadCalendar]
    ]
  };
}
