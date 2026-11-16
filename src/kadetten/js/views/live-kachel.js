// Live-Kachel: schmale Kachel über der Navigation mit dem Stand, solange ein Kadetten-Spiel läuft.
// Nicht auf der Titelseite und nicht in der Ansicht dieses Spiels, dort steht der Stand ohnehin gross.
import {html} from '../text.js';
import {OWN_TEAM, involves, shortTeam} from '../logic.js';
import {liveNotice, liveScoreTime} from '../live.js';
import {findGame} from '../match.js';
import {href} from '../router.js';
import {crest} from './parts.js';

const GOAL_SHOWN = 45000;
let seen = {id: null, own: null, goalAt: 0};

/** Zustand der Kachel oder null, wenn sie nicht erscheinen soll. */
export function liveTile({state, route, now}) {
  const match = state?.live?.match;
  if (!match || !involves(match) || !route?.area || route.view === 'jetzt') return null;
  const own = findGame(state.data?.games || [], match, now);
  const id = own?.id || match.id;
  if (route.view === 'spiel' && (route.id === String(id) || route.id === String(match.id))) return null;
  const score = Array.isArray(match.score) && match.score.every(Number.isInteger) ? match.score : null;
  const ownScore = score ? score[match.home === OWN_TEAM ? 0 : 1] : null;
  // Tor der Kadetten: Stand stieg gegenüber dem zuletzt gezeigten Stand dieses Spiels.
  if (seen.id !== String(id)) seen = {id: String(id), own: ownScore, goalAt: 0};
  else if (ownScore !== null && seen.own !== null && ownScore > seen.own) seen = {...seen, own: ownScore, goalAt: now};
  else if (ownScore !== null) seen.own = ownScore;
  const delayed = liveNotice(state, own || match);
  const goal = !delayed && now - seen.goalAt < GOAL_SHOWN;
  const time = delayed && score ? liveScoreTime(state, own || match) : null;
  const detail = delayed
    ? time
      ? `Stand von ${time} Uhr`
      : 'Stand verzögert'
    : goal
      ? 'Tor Kadetten'
      : [match.phase, match.clock].filter(Boolean).join(' · ') || 'Live';
  return {match, id: String(id), score, goal, detail};
}

export function renderLiveTile(tile) {
  if (!tile) return '';
  const {match, id, score, goal, detail} = tile;
  const label = `Live: ${match.home} gegen ${match.away}, ${score ? score[0] + ' zu ' + score[1] : 'Stand offen'}. ${detail}. Zum Spiel`;
  return html`<a class="live-tile${goal ? ' goal' : ''}" href="${href.spiel(id, 'live')}" aria-label="${label}">
    ${crest(match.home, 'xs')}<span class="lt-team">${shortTeam(match.home)}</span>
    <span class="lt-score num">${score ? score[0] + ' : ' + score[1] : '– : –'}</span>
    <span class="lt-team r">${shortTeam(match.away)}</span>${crest(match.away, 'xs')}
    <span class="lt-detail"><i class="dot" aria-hidden="true"></i>${detail}</span></a>`;
}
