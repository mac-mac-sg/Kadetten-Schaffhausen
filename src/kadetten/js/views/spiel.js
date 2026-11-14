// Spielseite: Mittelpunkt der App. Zustand Vorschau → Live → Bericht wechselt automatisch.
import {html} from '../text.js';
import {renderTicker} from '../ticker.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {API_ORIGIN} from '../config.js';
import {OWN_TEAM, form, standings, shortTeam, outcome, hasScore, ownGames, kickoff} from '../logic.js';
import {findGame, gamePhase, withFinished, liveTable, sameTeam, isOwn} from '../match.js';
import {liveNotice} from '../live.js';
import {normalizeReport, fitsGame, goalTimeline} from '../report.js';
import {shortCards} from '../kurz.js';
import {renderBericht, renderLiveStats, loadReportFor, voteSection, liveVoteCard} from './bericht.js';
import {myVotes} from '../fan-vote.js';
import {myGames, pickFor} from '../personal.js';
import {
  backBar,
  backLink,
  subBand,
  matchBand,
  sectionHead,
  formRow,
  formBadge,
  notice,
  loading,
  listRow,
  gameRow,
  segment,
  crest
} from './parts.js';
import {liveHero, resultHero, previewHero, tipFor} from './jetzt.js';

const GAME_TABS = [
  ['vorschau', 'Übersicht'],
  ['live', 'Ticker'],
  ['bericht', 'Statistik']
];
// Abgeschlossene Spiele (QHL, EHL, Cup, Test): nur «Statistik» (alle Zahlen) und «Rückblick» (nur der erzeugte Bericht), kein Ticker.
const FINISHED_TABS = [
  ['bericht', 'Statistik'],
  ['rueckblick', 'Rückblick']
];

function opponentOf(game) {
  return isOwn(game.home) ? game.away : game.home;
}

function opponentForm(load, api, data, game) {
  const team = opponentOf(game);
  if (game.league === 'EHL') {
    const list = data.ehlRecentGames?.[team];
    return Array.isArray(list) ? list.slice(0, 5).map(g => outcome(g, team) || outcomeByName(g, team)) : null;
  }
  const recent = load('recent:' + team, () => api.recentGames(team), 900000);
  return recent.value?.games
    ? recent.value.games.slice(0, 5).map(g => outcomeByName(g, team))
    : recent.status === 'loading'
      ? undefined
      : null;
}
function outcomeByName(g, team) {
  if (!Array.isArray(g.score)) return null;
  const home = sameTeam(g.home, team),
    [a, b] = g.score;
  if (!home && !sameTeam(g.away, team)) return null;
  const own = home ? a : b,
    other = home ? b : a;
  return own > other ? 'S' : own < other ? 'N' : 'U';
}

const perGame = (value, played) => (Number.isFinite(value) && played > 0 ? Math.round((value / played) * 10) / 10 : null);
const comma = v => (v === null ? '–' : String(v).replace('.', ','));

/** Gegner-Check (QHL): Tore und Gegentore pro Spiel aus der Tabelle, dazu die besten Werfer des Gegners laut SHV. */
export function gegnerCheck({game, own, opp, scorers}) {
  const name = shortTeam(opponentOf(game));
  const rows =
    own && opp
      ? [
          ['Tore pro Spiel', perGame(own.goalsFor, own.played), perGame(opp.goalsFor, opp.played), 1],
          ['Gegentore pro Spiel', perGame(own.goalsAgainst, own.played), perGame(opp.goalsAgainst, opp.played), -1]
        ].filter(r => r[1] !== null && r[2] !== null)
      : [];
  const players = Array.isArray(scorers?.players) ? scorers.players.slice(0, 3) : [];
  if (!rows.length && !players.length) return '';
  const ownHome = isOwn(game.home);
  return html`<section class="sec" aria-labelledby="g-check">${sectionHead('Gegner-Check', '', '', 'g-check')}
    ${
      rows.length
        ? html`<div class="card list">
      <div class="cmp head"><span>${ownHome ? 'Kadetten' : name}</span><span></span><span>${ownHome ? name : 'Kadetten'}</span></div>
      ${rows.map(([label, k, o, dir]) => {
        const left = ownHome ? k : o,
          right = ownHome ? o : k,
          better = (k - o) * dir > 0;
        return html`<div class="cmp"><b${ownHome && better ? html` class="own"` : ''}>${comma(left)}</b><span class="cmp-label">${label}</span><b${!ownHome && better ? html` class="own"` : ''}>${comma(right)}</b></div>`;
      })}</div>`
        : ''
    }
    ${
      players.length
        ? html`<h3 class="h4 pad-top">Darauf achten: beste Werfer von ${name}</h3>
      <div class="card list">${players.map(p =>
        listRow({
          title: p.name,
          sub: `${p.games} ${p.games === 1 ? 'Spiel' : 'Spiele'}${Number.isInteger(p.sevenMeterGoals) && p.sevenMeterGoals > 0 ? ` · ${p.sevenMeterGoals} vom 7-m-Punkt` : ''}`,
          end: html`<span class="res num">${p.goals}<small> Tore</small></span>`,
          cls: 'compact'
        })
      )}</div>
      <p class="fine pad-top">Saisonwerte laut Schweizerischem Handball-Verband, alle Wettbewerbsspiele.</p>`
        : ''
    }</section>`;
}

function vorschau({game, data, load, api, now}) {
  const table = standings(data.tables?.[game.league === 'EHL' ? 'EHL' : 'QHL']);
  const own = table.find(r => r.team === OWN_TEAM),
    opp = table.find(r => sameTeam(r.team, opponentOf(game)));
  const oppForm = opponentForm(load, api, data, game);
  const formLeague = ['QHL', 'EHL'].includes(game.league) ? game.league : undefined;
  const preview =
    ['QHL', 'EHL'].includes(game.league) && !hasScore(game) ? load('preview:' + game.id, () => api.preview(game.id), 600000) : null;
  const duels = game.league === 'QHL' ? load('duel:' + game.id, () => api.headToHead(game.home, game.away), 900000) : null;
  const programme = !hasScore(game) && isOwn(game.home) ? load('programme:' + game.id, () => api.programme(game.id), 900000) : null;
  const pdf =
    programme?.value && /^\/api\/programmes\/[a-zA-Z0-9_-]+\/pdf\?v=[a-f0-9]{64}$/.test(programme.value.pdfPath || '')
      ? API_ORIGIN + programme.value.pdfPath
      : null;
  const p = preview?.value;
  const oppScorers =
    game.league === 'QHL' && !hasScore(game) ? load('opponent:' + opponentOf(game), () => api.opponent(opponentOf(game)), 900000) : null;
  const ownLast = ownGames(data.games)
    .filter(g => hasScore(g) && kickoff(g) < kickoff(game))
    .reverse()
    .slice(0, 3);
  return html`
    <section class="sec" aria-labelledby="g-lage">${sectionHead('Ausgangslage', '', '', 'g-lage')}
      <div class="card list">
        ${listRow({
          title: 'Kadetten',
          sub: own ? `${own.rank}. · ${own.points} Punkte` : game.league,
          end: formRow(form(data.games, OWN_TEAM, 5, formLeague)),
          lead: crest(OWN_TEAM, 'xs')
        })}
        ${listRow({
          title: shortTeam(opponentOf(game)),
          sub: opp ? `${opp.rank}. · ${opp.points} Punkte` : game.league,
          end: oppForm === undefined ? html`<span class="muted">…</span>` : formRow(oppForm || []),
          lead: crest(opponentOf(game), 'xs')
        })}
      </div>

    </section>
    ${game.league === 'QHL' ? gegnerCheck({game, own, opp, scorers: oppScorers?.value?.ok ? oppScorers.value : null}) : ''}
    ${tipFor(game, now)}
    ${
      p?.paragraphs?.length
        ? html`<section class="sec" aria-labelledby="g-vor">
          ${sectionHead(p.generator === 'daten' ? 'Vorschau' : 'Vorschau', '', '', 'g-vor')}
      <article class="card prose">${p.headline ? html`<h3 class="h3">${p.headline}</h3>` : ''}${p.paragraphs.map(t => html`<p>${t}</p>`)}
        <p class="fine">${
          p.generator === 'daten'
            ? 'Aus bestätigten Spiel- und Tabellendaten zusammengestellt.'
            : 'Von einer KI aus bestätigten Spiel- und Tabellendaten formuliert. Keine Ergebnisprognose.'
        }</p>
          </article>
          </section>`
        : ''
    }
    ${
      duels?.value?.games?.length
        ? html`<section class="sec" aria-labelledby="g-duel">
      ${sectionHead('Direkte Duelle', '', '', 'g-duel')}<div class="card list">
      ${duels.value.games.slice(0, 3).map(d =>
        listRow({
          title: `${shortTeam(d.home)} – ${shortTeam(d.away)}`,
          sub: d.date.split('-').reverse().join('.'),
          end: html`<span class="res num">${d.score[0]}:${d.score[1]}${formBadge(outcomeByName(d, OWN_TEAM))}</span>`
        })
      )}</div>
      </section>`
        : ''
    }
    ${
      ownLast.length
        ? html`<section class="sec" aria-labelledby="g-last">
      ${sectionHead('Letzte Spiele der Kadetten', '', '', 'g-last')}<div class="card list">
      ${ownLast.map(g => gameRow(g, now))}</div>
      </section>`
        : ''
    }
    ${
      pdf
        ? html`<section class="sec">
      <div class="card list">
      ${listRow({title: 'Matchprogramm', sub: 'PDF', end: icon('ext'), lead: html`<span class="lead">${icon('doc')}</span>`, link: pdf})}</div>
      </section>`
        : ''
    }`;
}

/** Hinweis auf die Fan-Wahl während des Spiels (nur mit Datendienst). */
const voteCard = (game, ui, load) =>
  ui.votes ? liveVoteCard({game, vote: load('votes:' + game.id, () => ui.votes.status(game.id), 30000), mine: myVotes()[game.id]}) : '';

/** Reiter «Ticker» eines laufenden Spiels (vor Anpfiff gibt es keine Reiter, danach nur Statistik und Rückblick). */
function liveTab({game, data, state, ui, load}) {
  return html`${
    liveNotice(state, game)
      ? html`<section class="sec">
    ${notice(liveNotice(state, game))}</section>`
      : ''
  }${voteCard(game, ui, load)}${renderTicker(state.live.match)}<section class="sec">
    <a class="btn wide" href="${href.spiel(game.id, 'bericht')}">Alle Spielwerte</a></section>`;
}

function bericht({game, phase, data, load, api, ui, state, now, part = 'alles'}) {
  if (phase === 'live') return renderLiveStats({match: state.live.match, data, ui});
  const supported = ['QHL', 'EHL'].includes(game.league) || /cup/i.test(game.league || '');
  const entry = supported ? loadReportFor(load, api, game) : null;
  let normalized = null;
  if (entry?.status === 'ready') {
    const candidate = game.league === 'EHL' ? normalizeReport(null, entry.value.archive) : normalizeReport(entry.value.shv, null);
    normalized = fitsGame(candidate, game) ? candidate : null;
  }
  const vote = ui.votes ? load('votes:' + game.id, () => ui.votes.status(game.id), 60000) : null;
  const voting = vote?.value?.candidates?.length
    ? html`<section class="sec">
      <a class="card rowcard vote-teaser" href="${href.spiel(game.id, 'wahl')}"><span class="lead">${icon('star')}</span><span class="grow"><span class="t">Spieler des Matchs</span><span class="s">${
        vote.value.open ? (pickFor(game.id) ? 'Dein Favorit ist vorgewählt' : 'Deine Stimme zählt') : 'Zum Ergebnis der Fan-Wahl'
      }</span></span>${icon('go')}</a></section>`
    : '';
  return renderBericht({game, data, entry, ui, normalized, voting, part, supported});
}

/** «Spiel in 30 Sekunden»: wischbare Karten aus Resultat und Spielbericht. */
function kurz({game, data, load, api, title}) {
  const supported = ['QHL', 'EHL'].includes(game.league) || /cup/i.test(game.league || '');
  const entry = supported ? loadReportFor(load, api, game) : null;
  let report = null,
    goals = [];
  if (entry?.status === 'ready') {
    const candidate = game.league === 'EHL' ? normalizeReport(null, entry.value.archive) : normalizeReport(entry.value.shv, null);
    report = fitsGame(candidate, game) ? candidate : null;
    goals = goalTimeline(entry.value.archive, entry.value.shv);
  }
  const cards = shortCards({game, report, goals, tables: data.tables, games: data.games});
  return html`${subBand(backLink('Zum Spiel', href.spiel(game.id, 'bericht')), 'Spiel in 30 Sekunden', title)}
    <section class="sec" aria-label="Zusammenfassung in Karten">
      ${entry?.status === 'loading' ? loading('Spielbericht wird geladen …') : ''}
      <ol class="kurz">${cards.map(
        (c, i) => html`<li class="kurz-card${i === 0 ? ' first' : ''}">
          <span class="tag-ink">${c.kicker}</span>
          <b class="kurz-fig num">${c.figure}</b>
          <span class="kurz-title">${c.title}</span>
          <span class="kurz-text">${c.text}</span>
          <span class="kurz-count num" aria-hidden="true">${i + 1}/${cards.length}</span></li>`
      )}</ol>
      ${cards.length > 1 ? html`<p class="fine pad-top">Zur Seite wischen für die nächste Karte.</p>` : ''}
    </section>
    <section class="sec"><div class="acts">
      <a class="btn pri" href="${href.spiel(game.id, 'bericht')}">${icon('doc')}Ganze Statistik</a><button class="btn" type="button" data-share-image="${game.id}">${icon('share')}Teilen</button></div></section>`;
}

export function renderSpiel({route, state, now, load, api, ui}) {
  const {data, live} = state;
  if (!data) return html`${backBar('News', href.jetzt())}<h1 class="h1 pad">Spiel</h1><section class="sec">${loading()}</section>`;
  let game = data.games.find(g => String(g.id) === route.id);
  if (!game && live?.match && String(live.match.id) === route.id)
    game = findGame(data.games, live.match, now) || {...live.match, date: null};
  if (!game)
    return html`${backBar('News', href.jetzt())}<h1 class="h1 pad">Spiel</h1>
      <section class="sec">
      ${notice('Dieses Spiel ist im aktuellen Spielplan nicht vorhanden.', 'cal')}</section>`;
  game = withFinished(game, live, now);
  const phase = gamePhase(game, live, now);
  const twoTabs = phase === 'bericht';
  let tab = route.tab || (phase === 'live' ? 'live' : 'vorschau');
  // Alte Adressen (Übersicht, Ticker) eines abgeschlossenen Spiels dieser Wettbewerbe führen zur Statistik.
  if (tab === 'kurz' && !twoTabs) tab = route.tab === 'kurz' ? (phase === 'live' ? 'live' : 'vorschau') : tab;
  if (twoTabs && tab !== 'wahl' && tab !== 'kurz' && !FINISHED_TABS.some(([id]) => id === tab)) tab = 'bericht';
  // Vor Anpfiff gibt es nur die Vorschau; Ticker und Statistik wären leer, also keine Reiterleiste.
  const preOnly = phase === 'vorschau';
  if (preOnly && tab !== 'wahl') tab = 'vorschau';
  const title = `${shortTeam(game.home)} – ${shortTeam(game.away)}`;
  if (tab === 'kurz') return kurz({game, data, load, api, title});
  const share = hasScore(game)
    ? html`<button class="icb" type="button" data-share-image="${game.id}" aria-label="Resultat als Bild teilen">${icon('share')}</button>`
    : '';
  const hero =
    phase === 'live'
      ? liveHero(live.match, game, state, now, false)
      : phase === 'bericht'
        ? resultHero(game, now, {link: false, celebrate: outcome(game) === 'S'})
        : previewHero(game, now, {link: false});
  const visited = myGames().includes(String(game.id));
  const started = kickoff(game) !== null && kickoff(game) <= now;
  const tabs = (twoTabs ? FINISHED_TABS : GAME_TABS).map(([id, label]) => [
    id,
    label,
    href.spiel(game.id, id),
    id === 'live' && phase === 'live' ? html`<i class="dot"></i>` : ''
  ]);
  const vote = tab === 'wahl' && ui.votes ? load('votes:' + game.id, () => ui.votes.status(game.id), 30000) : null;
  if (tab === 'wahl')
    return html`${subBand(backLink('Zum Spiel', href.spiel(game.id)), 'Spieler des Matchs', title)}${voteSection({
      vote,
      mine: myVotes()[game.id],
      now,
      busy: ui.voteBusy,
      selected: ui.voteSelections?.[game.id] ?? pickFor(game.id)?.id,
      pickId: pickFor(game.id)?.id ?? null,
      message: ui.voteGame === String(game.id) ? ui.voteMessage : '',
      data
    })}`;
  const report = part => bericht({game, phase, data, load, api, ui, state, now, part});
  const content =
    phase === 'bericht'
      ? report(tab === 'rueckblick' ? 'rueckblick' : 'statistik')
      : phase === 'live'
        ? tab === 'live'
          ? liveTab({game, data, state, ui, load})
          : tab === 'bericht'
            ? report()
            : html`<section class="sec">
              <a class="btn pri" href="${href.spiel(game.id, 'live')}">Zum Liveticker</a></section>
              ${voteCard(game, ui, load)}${renderLiveStats({match: live.match, data, ui})}`
        : html`${vorschau({game, data, load, api, now, ui})}<section class="sec">
          ${notice('Der Liveticker und die Spielwerte erscheinen ab Anpfiff.', 'jetzt')}</section>`;
  return html`${matchBand(
    backLink('Zurück', ui.backTarget || href.jetzt(), true),
    share,
    html`<h1 class="sr">${title}</h1>
    <section class="match-score${phase === 'live' ? ' match-live' : ''}">
    ${hero}</section>`
  )}
    ${preOnly ? '' : segment(tabs, tab, 'Spielseite')}
    ${twoTabs && tab === 'bericht' ? html`<section class="sec tight"><a class="card rowcard" href="${href.spiel(game.id, 'kurz')}"><span class="lead">${icon('jetzt')}</span><span class="grow"><span class="t">Spiel in 30 Sekunden</span><span class="s">Das Wichtigste in wenigen Karten</span></span>${icon('go')}</a></section>` : ''}
    ${twoTabs && tab === 'bericht' ? tipFor(game, now) : ''}
    ${content}
    ${
      started && isOwn(game.home) && (!twoTabs || tab === 'bericht')
        ? html`<section class="sec">
      <button class="btn wide${visited ? ' on' : ''}" type="button" data-my-game="${game.id}" aria-pressed="${String(visited)}">${icon('verein')}${visited ? 'Ich war in der Halle' : 'Ich war in der Halle?'}</button></section>`
        : ''
    }`;
}
