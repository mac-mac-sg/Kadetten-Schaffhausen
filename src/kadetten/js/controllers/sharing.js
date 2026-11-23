// Teilen und Exportieren: Text teilen, Resultat als Bild, Spielplan als Kalenderdatei.
import {matchImage, matchImageModel, shareImage} from '../share-image.js';
import {elapsed, isHalftime} from '../gewinnscore.js';
import {outcome, shortTeam} from '../logic.js';
import {withFinished} from '../match.js';
import {crestSrc} from '../views/parts.js';
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

  async function shareModel(model, crestTeams, name, title) {
    if (!model) return;
    announce('Bild wird erstellt …');
    const blob = await matchImage(model, crestTeams.map(crestSrc));
    await shareImage(blob, name, title);
  }

  /** Endstand als Story-Bild. */
  async function shareResult(id) {
    const raw = store.state.data?.games.find(g => String(g.id) === id);
    const game = raw && withFinished(raw, store.state.live, Date.now());
    if (!game?.score) return;
    const model = matchImageModel({
      kind: 'end',
      game: {...game, homeShort: shortTeam(game.home), awayShort: shortTeam(game.away)},
      outcome: outcome(game)
    });
    await shareModel(model, [game.home, game.away], `kadetten-${game.date}.png`, shareText(game));
  }

  /** Laufendes Spiel: in der Pause «Halbzeit», sonst «Spielstand» mit der Minute. */
  async function shareLive() {
    const match = store.state.live?.match;
    if (!match) return;
    const model = matchImageModel({
      kind: isHalftime(match) ? 'half' : 'live',
      game: {...match, homeShort: shortTeam(match.home), awayShort: shortTeam(match.away), date: match.date || ''},
      minute: elapsed(match)
    });
    await shareModel(
      model,
      [match.home, match.away],
      `kadetten-live-${match.id}.png`,
      `${shortTeam(match.home)} – ${shortTeam(match.away)}`
    );
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
      ['data-share-live', shareLive],
      ['data-calendar', downloadCalendar]
    ]
  };
}
