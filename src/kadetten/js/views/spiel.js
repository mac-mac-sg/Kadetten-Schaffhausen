// Spielseite: Mittelpunkt der App. Zustand Vorschau → Live → Bericht wechselt automatisch.
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {API_ORIGIN} from '../config.js';
import {OWN_TEAM, form, standings, shortTeam, outcome, hasScore, ownGames, kickoff} from '../logic.js';
import {findGame, gamePhase, withFinished, liveTable, sameTeam, isOwn} from '../match.js';
import {normalizeReport, fitsGame} from '../report.js';
import {renderBericht, renderLiveStats, loadReportFor, voteSection} from './bericht.js';
import {myVotes} from '../fan-vote.js';
import {myGames} from '../personal.js';
import {backBar, sectionHead, formRow, formBadge, notice, loading, listRow, gameRow, segment, crest} from './parts.js';
import {liveHero, resultHero, previewHero, tipFor} from './jetzt.js';

const GAME_TABS = [['vorschau', 'Vorschau'], ['live', 'Live'], ['bericht', 'Bericht']];

function opponentOf(game) { return isOwn(game.home) ? game.away : game.home; }

function opponentForm(load, api, data, game) {
  const team = opponentOf(game);
  if (game.league === 'EHL') {
    const list = data.ehlRecentGames?.[team];
    return Array.isArray(list) ? list.slice(0, 5).map(g => outcome(g, team) || outcomeByName(g, team)) : null;
  }
  const recent = load('recent:' + team, () => api.recentGames(team), 900000);
  return recent.value?.games ? recent.value.games.slice(0, 5).map(g => outcomeByName(g, team)) : recent.status === 'loading' ? undefined : null;
}
function outcomeByName(g, team) {
  if (!Array.isArray(g.score)) return null;
  const home = sameTeam(g.home, team), [a, b] = g.score;
  if (!home && !sameTeam(g.away, team)) return null;
  const own = home ? a : b, other = home ? b : a;
  return own > other ? 'S' : own < other ? 'N' : 'U';
}

function vorschau({game, data, load, api, now}) {
  const table = standings(data.tables?.[game.league === 'EHL' ? 'EHL' : 'QHL']);
  const own = table.find(r => r.team === OWN_TEAM), opp = table.find(r => sameTeam(r.team, opponentOf(game)));
  const oppForm = opponentForm(load, api, data, game);
  const preview = ['QHL', 'EHL'].includes(game.league) && !hasScore(game) ? load('preview:' + game.id, () => api.preview(game.id), 600000) : null;
  const duels = game.league === 'QHL' ? load('duel:' + game.id, () => api.headToHead(game.home, game.away), 900000) : null;
  const programme = !hasScore(game) && isOwn(game.home) ? load('programme:' + game.id, () => api.programme(game.id), 900000) : null;
  const pdf = programme?.value && /^\/api\/programmes\/[a-zA-Z0-9_-]+\/pdf\?v=[a-f0-9]{64}$/.test(programme.value.pdfPath || '') ? API_ORIGIN + programme.value.pdfPath : null;
  const p = preview?.value;
  const ownLast = ownGames(data.games).filter(g => hasScore(g) && kickoff(g) < kickoff(game)).reverse().slice(0, 3);
  return html`
    <section class="sec" aria-labelledby="g-lage">${sectionHead('Ausgangslage', '', '', 'g-lage')}
      <div class="card list">
        ${listRow({title: 'Kadetten', sub: own ? `${own.rank}. · ${own.points} Punkte` : game.league, end: formRow(form(data.games, OWN_TEAM, 5, game.league === 'EHL' ? 'EHL' : undefined)), lead: crest(OWN_TEAM, 'xs')})}
        ${listRow({title: shortTeam(opponentOf(game)), sub: opp ? `${opp.rank}. · ${opp.points} Punkte` : game.league, end: oppForm === undefined ? html`<span class="muted">…</span>` : formRow(oppForm || []), lead: crest(opponentOf(game), 'xs')})}
      </div>
    </section>
    ${p?.paragraphs?.length ? html`<section class="sec" aria-labelledby="g-vor">${sectionHead(p.generator === 'daten' ? 'Vorschau' : 'Vorschau', '', '', 'g-vor')}
      <article class="card prose">${p.headline ? html`<h3 class="h3">${p.headline}</h3>` : ''}${p.paragraphs.map(t => html`<p>${t}</p>`)}
        <p class="fine">${p.generator === 'daten' ? 'Aus bestätigten Spiel- und Tabellendaten zusammengestellt.' : 'Von einer KI aus bestätigten Spiel- und Tabellendaten formuliert. Keine Ergebnisprognose.'}</p></article></section>` : ''}
    ${duels?.value?.games?.length ? html`<section class="sec" aria-labelledby="g-duel">${sectionHead('Direkte Duelle', '', '', 'g-duel')}<div class="card list">${duels.value.games.slice(0, 3).map(d => listRow({title: `${shortTeam(d.home)} – ${shortTeam(d.away)}`, sub: d.date.split('-').reverse().join('.'), end: html`<span class="res num">${d.score[0]}:${d.score[1]}${formBadge(outcomeByName(d, OWN_TEAM))}</span>`}))}</div></section>` : ''}
    ${ownLast.length ? html`<section class="sec" aria-labelledby="g-last">${sectionHead('Letzte Spiele der Kadetten', '', '', 'g-last')}<div class="card list">${ownLast.map(g => gameRow(g, now))}</div></section>` : ''}
    ${pdf ? html`<section class="sec"><div class="card list">${listRow({title: 'Matchprogramm', sub: 'PDF', end: icon('ext'), lead: html`<span class="lead">${icon('doc')}</span>`, link: pdf})}</div></section>` : ''}`;
}

function liveTab({game, phase, data, state, now, ui}) {
  if (phase === 'vorschau') return html`<section class="sec">${notice('Der Live-Stand erscheint ab Anpfiff und wird alle 30 Sekunden aktualisiert. Einzelne Tore werden live nicht angezeigt.', 'jetzt')}</section>`;
  if (phase === 'bericht') return html`<section class="sec">${notice('Das Spiel ist beendet.', 'doc')}</section><section class="sec"><a class="btn" href="${href.spiel(game.id, 'bericht')}">${icon('doc')}Zum Spielbericht</a></section>`;
  const table = liveTable(data.tables?.QHL, {...state.live.match, league: state.live.match.league || game.league});
  return html`
    ${table ? html`<section class="sec" aria-labelledby="g-lt">${sectionHead('Live-Tabelle', 'Ganze Tabelle', href.saison('tabellen'), 'g-lt')}<div class="card list"><div class="tbl">${table.slice(0, 5).map(r => html`<div class="tr${sameTeam(r.team, OWN_TEAM) ? ' me' : ''}"><span class="p num">${r.rank}</span><span class="tn">${shortTeam(r.team)}</span><span class="sp num">${r.played}</span><span></span><span class="pt num">${r.points}</span></div>`)}</div></div></section>` : ''}
    ${state.liveError ? html`<section class="sec">${notice('Live-Stand im Moment nicht erreichbar. Es gilt der letzte bekannte Stand.')}</section>` : ''}
    ${renderLiveStats({match: state.live.match, data, ui})}`;
}

function bericht({game, phase, data, load, api, ui}) {
  if (phase !== 'bericht') return html`<section class="sec">${notice('Der Spielbericht mit Matchbericht, Spielverlauf, Teamvergleich und Spielerwerten erscheint nach Abpfiff.', 'doc')}</section>`;
  const supported = ['QHL', 'EHL'].includes(game.league) || /cup/i.test(game.league || '');
  const entry = supported ? loadReportFor(load, api, game) : null;
  let normalized = null;
  if (entry?.status === 'ready') {
    const candidate = game.league === 'EHL' ? normalizeReport(null, entry.value.archive) : normalizeReport(entry.value.shv, null);
    normalized = fitsGame(candidate, game) ? candidate : null;
  }
  const vote = ui.votes ? load('votes:' + game.id, () => ui.votes.status(game.id), 60000) : null;
  const voting = vote ? voteSection({vote, mine: myVotes()[game.id] || null, now: Date.now(), busy: ui.voteBusy, message: ui.voteMessage}) : '';
  return renderBericht({game, data, entry, ui, normalized, voting});
}

export function renderSpiel({route, state, now, load, api, ui}) {
  const {data, live} = state;
  if (!data) return html`${backBar('Jetzt', href.jetzt())}<h1 class="h1 pad">Spiel</h1><section class="sec">${loading()}</section>`;
  let game = data.games.find(g => String(g.id) === route.id);
  if (!game && live?.match && String(live.match.id) === route.id) game = findGame(data.games, live.match, now) || {...live.match, date: null};
  if (!game) return html`${backBar('Jetzt', href.jetzt())}<h1 class="h1 pad">Spiel</h1><section class="sec">${notice('Dieses Spiel ist im aktuellen Spielplan nicht vorhanden.', 'cal')}</section>`;
  game = withFinished(game, live, now);
  const phase = gamePhase(game, live, now), tab = route.tab || phase;
  const title = `${shortTeam(game.home)} – ${shortTeam(game.away)}`;
  const share = hasScore(game) ? html`<button class="icb" type="button" data-share-image="${game.id}" aria-label="Resultat als Bild teilen">${icon('share')}</button>` : '';
  const hero = phase === 'live' ? liveHero(live.match, game, state, now, false) : phase === 'bericht' ? resultHero(game, now, {link: false, celebrate: outcome(game) === 'S'}) : previewHero(game, now, {link: false});
  const visited = myGames().includes(String(game.id));
  const started = kickoff(game) !== null && kickoff(game) <= now;
  const tabs = GAME_TABS.map(([id, label]) => [id, label, href.spiel(game.id, id), id === 'live' && phase === 'live' ? html`<i class="dot"></i>` : '']);
  const content = tab === 'live' ? liveTab({game, phase, data, state, now, ui}) : tab === 'bericht' ? bericht({game, phase, data, load, api, ui}) : vorschau({game, data, load, api, now, ui});
  return html`${backBar('Zurück', href.jetzt(), share)}<h1 class="sr">${title}</h1>
    ${segment(tabs, tab, 'Spielseite')}
    <section class="sec">${hero}</section>
    ${tab === 'vorschau' || (tab === 'bericht' && phase === 'bericht') ? tipFor(game, now) : ''}
    ${content}
    ${started && isOwn(game.home) ? html`<section class="sec"><button class="btn wide${visited ? ' on' : ''}" type="button" data-my-game="${game.id}" aria-pressed="${String(visited)}">${icon('verein')}${visited ? 'Ich war in der Halle' : 'Ich war in der Halle?'}</button></section>` : ''}`;
}
