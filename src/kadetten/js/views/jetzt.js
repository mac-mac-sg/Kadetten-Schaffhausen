// «Jetzt»: richtet sich nach dem Spieltag (Alltag, Spieltag, Live, Nachspiel).
import {html} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {jetztState, countdown, dayLabel, kickoff, form, standings, OWN_TEAM, outcome, lastResult, nextGame, hasScore, shortTeam} from '../logic.js';
import {findGame, liveTable, sameTeam, withFinished, isOwn, displayName} from '../match.js';
import {liveReport} from './bericht.js';
import {moments, tipPoints} from '../moments.js';
import {tips, favourite} from '../personal.js';
import {myVotes} from '../fan-vote.js';
import {SQUAD} from '../../data/squad.js';
import {HISTORY} from '../../data/club.js';
import {topBar, backBar, sectionHead, heroCard, kickoffTime, scoreLine, formRow, notice, loading, stats, listRow, gameRow, storyRow, RESULT_TEXT, momentCards, tipCard} from './parts.js';

const venueName = game => (game?.venue || '').split(',')[0].trim();
const metaLine = (game, now) => [dayLabel(game, now) || 'Heute', game.league, venueName(game)].filter(Boolean).join(' · ');
export const shareText = game => hasScore(game) ? `${shortTeam(game.home)} – ${shortTeam(game.away)} ${game.score[0]}:${game.score[1]}${Array.isArray(game.half) && game.half.every(Number.isInteger) ? ` (${game.half[0]}:${game.half[1]})` : ''} · ${game.league}` : '';
const ago = (at, now) => `Stand vor ${Math.max(0, Math.round((now - at) / 1000))} s`;

export function liveFoot(game, state, now) {
  return html`<p class="fresh">${Array.isArray(game.half) && game.half.every(Number.isInteger) ? html`<span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span>` : ''}${state.liveAt ? html`<span>${ago(state.liveAt, now)}</span>` : ''}</p>`;
}

export function liveHero(match, game, state, now, link = true) {
  return heroCard({
    meta: [match.league || game?.league, venueName(game)].filter(Boolean).join(' · '),
    pill: [match.phase, match.clock].filter(Boolean).join(' · ') || 'Live', live: true,
    home: game?.home || match.home, away: game?.away || match.away,
    middle: scoreLine(match.score, Array.isArray(match.score) ? `Spielstand ${match.score[0]} zu ${match.score[1]}` : 'Spielstand noch offen'),
    foot: liveFoot(match, state, now), link: link && game ? href.spiel(game.id) : '', label: 'Zum Spiel'
  });
}

export function resultHero(game, now, {link = true, actions = '', celebrate = false} = {}) {
  const result = outcome(game);
  return heroCard({celebrate,
    meta: metaLine(game, now), pill: result ? RESULT_TEXT[result] : 'Endresultat', home: game.home, away: game.away,
    middle: scoreLine(game.score, `Endresultat ${game.score[0]} zu ${game.score[1]}`),
    foot: Array.isArray(game.half) && game.half.every(Number.isInteger) ? html`<p class="fresh"><span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span></p>` : '',
    link: link && game.id ? href.spiel(game.id, 'bericht') : '', label: 'Zum Spielbericht', actions
  });
}

export function previewHero(game, now, {link = true, actions = ''} = {}) {
  return heroCard({meta: metaLine(game, now), pill: countdown(kickoff(game), now), home: game.home, away: game.away, middle: kickoffTime(game.time), link: link ? href.spiel(game.id) : '', label: 'Zur Spielvorschau', actions});
}

function tableTeaser(data) {
  const rows = standings(data.tables?.QHL), own = rows.find(r => r.team === OWN_TEAM);
  if (!own) return '';
  const leader = rows[0];
  const gap = own.rank === 1 ? (rows[1] && own.points !== null && rows[1].points !== null ? `+${own.points - rows[1].points}` : '–') : (leader.points !== null && own.points !== null ? `−${leader.points - own.points}` : '–');
  return html`<section class="sec" aria-labelledby="j-tab">${sectionHead('Tabelle in Kürze', 'Ganze Tabelle', href.saison('tabellen'), 'j-tab')}
    ${stats([[own.rank + '.', 'QHL-Platz'], [own.points, 'Punkte'], [gap, own.rank === 1 ? 'vor Platz 2' : 'auf Platz 1']])}</section>`;
}

function liveScorers(match, game) {
  const report = liveReport(match);
  const team = report?.teams.find(t => isOwn(t.name));
  const top = (team?.players || []).filter(p => Number.isInteger(p.goals) && p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 3);
  if (!top.length) return '';
  return html`<section class="sec" aria-labelledby="j-werfer">${sectionHead('Kadetten-Werfer live', 'Alle Werte', game ? href.spiel(game.id, 'live') : '', 'j-werfer')}
    <div class="card list">${top.map(p => listRow({title: displayName(p.name), sub: Number.isInteger(p.shots) ? `${p.goals} aus ${p.shots} Würfen` : '', end: html`<span class="res num">${p.goals}</span>`, cls: 'compact'}))}</div></section>`;
}

/** Tippspiel für ein Kadetten-Spiel: vor Anpfiff veränderbar, danach mit Punkten. */
export function tipFor(game, now) {
  if (!game || !isOwn(game.home) && !isOwn(game.away) || kickoff(game) === null) return '';
  const tip = tips()[game.id] || null, locked = kickoff(game) <= now;
  if (locked && !tip) return '';
  return tipCard({game, tip, locked, points: hasScore(game) && tip ? tipPoints(tip, game.score) : null});
}

function momentsFor(data, now) {
  return momentCards(moments({data, now, squad: SQUAD, history: HISTORY, favourite: favourite()}).slice(0, 2));
}

function newsBlock(data, count = 3) {
  const stories = (data.stories || []).slice(0, count);
  if (!stories.length) return '';
  return html`<section class="sec" aria-labelledby="j-news">${sectionHead('News', 'Alle', href.news(), 'j-news')}<div class="card list">${stories.map(storyRow)}</div></section>`;
}

function liveTableTeaser(data, match) {
  const table = liveTable(data.tables?.QHL, match);
  const own = table?.find(r => sameTeam(r.team, OWN_TEAM));
  if (!own) return '';
  const next = table[own.rank] || null, prev = table[own.rank - 2] || null;
  const text = own.rank === 1 && next ? `${own.points} Punkte, ${own.points - next.points} vor ${next.team.replace(/^HC |^BSV |^RTV 1879 /, '')}` : prev ? `${own.points} Punkte, ${prev.points - own.points} hinter Platz ${own.rank - 1}` : `${own.points} Punkte`;
  return html`<section class="sec" aria-labelledby="j-live-tab">${sectionHead('Live-Tabelle', 'Ganze Tabelle', href.saison('tabellen'), 'j-live-tab')}
    <a class="card rowcard" href="${href.saison('tabellen')}"><span class="res big num">${own.rank}.</span><span class="grow"><span class="t">Bei diesem Stand ${own.rank === 1 ? 'Leader' : 'auf Platz ' + own.rank}</span><span class="s">${text}</span></span>${icon('go')}</a></section>`;
}

export function renderJetzt({state, now, load, api, ui}) {
  const {data, live} = state;
  if (!data) return html`${topBar('Jetzt')}<section class="sec">${state.dataError ? notice('Der Datenstand konnte nicht geladen werden. Bitte später erneut versuchen.') : loading('Datenstand wird geladen …')}</section>`;
  const {state: phase, game} = jetztState({games: data.games, live, now});
  const offline = state.dataError ? html`<section class="sec">${notice('Keine Verbindung zum Datendienst. Angezeigt wird der zuletzt gespeicherte Stand.')}</section>` : '';

  if (phase === 'live') {
    const own = findGame(data.games, game, now);
    return html`${topBar('Jetzt')}
      <section class="sec" aria-labelledby="j-live"><h2 class="sr" id="j-live">Live</h2>${liveHero(game, own, state, now)}</section>
      ${state.liveError ? html`<section class="sec">${notice('Live-Stand im Moment nicht erreichbar. Es gilt der letzte bekannte Stand.')}</section>` : ''}
      ${liveTableTeaser(data, {...game, league: game.league || own?.league})}
      ${liveScorers(game, own)}
      ${newsBlock(data, 2)}${offline}`;
  }

  if (phase === 'spieltag') {
    const actions = html`<div class="acts single"><a class="btn" href="${href.ich()}">${icon('bell')}Push zum Anpfiff</a></div>`;
    const rows = standings(data.tables?.QHL), own = rows.find(r => r.team === OWN_TEAM), opp = rows.find(r => sameTeam(r.team, game.home === OWN_TEAM ? game.away : game.home));
    const preview = game.league === 'QHL' ? load('preview:' + game.id, () => api.preview(game.id), 600000) : null;
    return html`${topBar('Jetzt')}
      <section class="sec" aria-labelledby="j-heute"><h2 class="sr" id="j-heute">Heute</h2>${previewHero(game, now, {actions})}</section>
      <section class="sec" aria-labelledby="j-lage">${sectionHead('Ausgangslage', '', '', 'j-lage')}
        ${stats([[own && opp ? `${own.rank}. – ${opp.rank}.` : (own ? own.rank + '.' : '–'), own && opp ? 'Tabelle' : 'QHL-Platz'], [formRow(form(data.games, OWN_TEAM, 3, ['QHL', 'EHL'].includes(game.league) ? game.league : undefined)), `Form · letzte 3 ${['QHL', 'EHL'].includes(game.league) ? game.league : 'Spiele'}`], [own?.points != null && game.league === 'QHL' ? own.points + 2 : '–', 'Punkte mit Sieg']])}</section>
      ${tipFor(game, now)}
      ${preview?.value?.paragraphs?.length ? html`<section class="sec" aria-labelledby="j-vor">${sectionHead('Vorschau', 'Ganze Vorschau', href.spiel(game.id), 'j-vor')}<a class="card" href="${href.spiel(game.id)}"><p class="clamp">${preview.value.paragraphs[0]}</p></a></section>` : ''}
      ${momentsFor(data, now)}
      ${newsBlock(data, 2)}${offline}`;
  }

  if (phase === 'nachspiel') {
    const result = withFinished(findGame(data.games, game, now) || game, live, now);
    const shown = hasScore(result) ? result : game;
    const next = nextGame(data.games, now);
    const actions = html`<div class="acts"><a class="btn pri" href="${href.spiel(shown.id, 'bericht')}">${icon('doc')}Spielbericht</a><button class="btn" type="button" data-share-image="${shown.id}">${icon('share')}Teilen</button></div>`;
    const table = standings(data.tables?.QHL).find(r => r.team === OWN_TEAM);
    return html`${topBar('Jetzt')}
      <section class="sec" aria-labelledby="j-end"><h2 class="sr" id="j-end">Endresultat</h2>${resultHero(shown, now, {actions, celebrate: outcome(shown) === 'S'})}</section>
      ${ui?.votes && !myVotes()[shown.id] && load('votes:' + shown.id, () => ui.votes.status(shown.id), 60000).value?.open ? html`<section class="sec"><a class="card rowcard vote-teaser" href="${href.spiel(shown.id, 'bericht')}"><span class="lead">${icon('star')}</span><span class="grow"><span class="t">Wähle den Spieler des Matchs</span><span class="s">Inoffizielle Fan-Wahl, offen bis morgen Abend</span></span>${icon('go')}</a></section>` : ''}
      ${tipFor(shown, now)}
      ${table && shown.league === 'QHL' ? html`<section class="sec" aria-labelledby="j-nach">${sectionHead('Tabelle danach', '', '', 'j-nach')}<a class="card rowcard" href="${href.saison('tabellen')}"><span class="res big num">${table.rank}.</span><span class="grow"><span class="t">QHL · ${table.points} Punkte</span><span class="s">nach ${table.played} Spielen</span></span>${icon('go')}</a></section>` : ''}
      ${next && next.id !== shown.id ? html`<section class="sec" aria-labelledby="j-next">${sectionHead('Nächstes Spiel', '', '', 'j-next')}<div class="card list">${gameRow(next, now)}</div></section>` : ''}
      ${momentsFor(data, now)}
      ${newsBlock(data, 2)}${offline}`;
  }

  const last = lastResult(data.games, now);
  return html`${topBar('Jetzt')}
    <section class="sec" aria-labelledby="j-next">${sectionHead('Nächstes Spiel', '', '', 'j-next')}${game ? previewHero(game, now) : notice('Zurzeit ist kein Spiel angesetzt.', 'cal')}</section>
    ${last ? html`<section class="sec" aria-labelledby="j-last">${sectionHead('Letztes Resultat', '', '', 'j-last')}<div class="card list">${gameRow(last, now)}</div></section>` : ''}
    ${momentsFor(data, now)}
    ${newsBlock(data, 3)}
    ${tableTeaser(data)}${offline}`;
}

export function renderNews({state}) {
  const stories = state.data?.stories || [];
  return html`${backBar('Jetzt', href.jetzt())}<h1 class="h1 pad">News</h1>
    <section class="sec">${stories.length ? html`<div class="card list">${stories.slice(0, 40).map(storyRow)}</div>` : state.data ? notice('Noch keine News vorhanden.', 'doc') : loading()}</section>
    <section class="sec">${listRow({title: 'Alle Vereinsnews auf kadettensh.ch', end: icon('ext'), link: 'https://kadettensh.ch/news/'})}</section>`;
}
