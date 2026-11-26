// «Jetzt»: richtet sich nach dem Spieltag (Alltag, Spieltag, Live, Nachspiel).
import {recapTeaser} from './rueckblick.js';
import {storyTeaser} from './story.js';
import {html} from '../text.js';
import {quizTeaser} from './quiz.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {
  jetztState,
  countdown,
  dayLabel,
  kickoff,
  form,
  standings,
  OWN_TEAM,
  outcome,
  lastResult,
  nextGame,
  hasScore,
  shortTeam,
  competitionOf,
  ticketUrl
} from '../logic.js';
import {findGame, liveTable, sameTeam, withFinished, isOwn, displayName} from '../match.js';
import {liveNotice, liveScoreTime, waitingForLive} from '../live.js';
import {liveReport, liveVoteCard} from './bericht.js';
import {tipPoints} from '../moments.js';
import {tips} from '../personal.js';
import {myVotes} from '../fan-vote.js';
import {
  homeBand,
  topBar,
  venueShort,
  sectionHead,
  heroCard,
  crest,
  kickoffTime,
  scoreLine,
  formRow,
  notice,
  loading,
  stats,
  listRow,
  gameRow,
  storyRow,
  storyImage,
  RESULT_TEXT,
  tipCard
} from './parts.js';

const venueName = game => venueShort(game?.venue);
const metaLine = (game, now) => [dayLabel(game, now) || 'Heute', game.league, venueName(game)].filter(Boolean).join(' · ');
export const shareText = game =>
  hasScore(game)
    ? `${shortTeam(game.home)} – ${shortTeam(game.away)} ${game.score[0]}:${game.score[1]}${
        Array.isArray(game.half) && game.half.every(Number.isInteger) ? ` (${game.half[0]}:${game.half[1]})` : ''
      } · ${game.league}`
    : '';
function liveFoot(game, state) {
  const time = hasScore(game) ? liveScoreTime(state, game) : null;
  const status = liveNotice(state, game);
  return html`<p class="fresh">${
    Array.isArray(game.half) && game.half.every(Number.isInteger)
      ? html`<span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span>`
      : ''
  }${time ? html`<span>Stand von ${time} Uhr</span>` : ''}${status || !hasScore(game) ? html`<span role="status">${status || 'Wartet auf Live-Daten'}</span>` : ''}</p>`;
}

export function liveHero(match, game, state, link = true) {
  return heroCard({
    meta: [match.league || game?.league, venueName(game)].filter(Boolean).join(' · '),
    pill: [match.phase, match.clock].filter(Boolean).join(' · ') || 'Live',
    live: true,
    home: game?.home || match.home,
    away: game?.away || match.away,
    middle: scoreLine(
      match.score,
      Array.isArray(match.score) ? `Spielstand ${match.score[0]} zu ${match.score[1]}` : 'Spielstand noch offen'
    ),
    foot: liveFoot(match, state),
    link: link && game ? href.spiel(game.id) : '',
    label: 'Zum Spiel'
  });
}

export function resultHero(game, now, {link = true, actions = '', celebrate = false} = {}) {
  const result = outcome(game);
  return heroCard({
    celebrate,
    meta: metaLine(game, now),
    pill: result ? RESULT_TEXT[result] : 'Endresultat',
    home: game.home,
    away: game.away,
    middle: scoreLine(game.score, `Endresultat ${game.score[0]} zu ${game.score[1]}`),
    foot: html`<p class="fresh"><span>Endresultat bestätigt</span>${
      Array.isArray(game.half) && game.half.every(Number.isInteger)
        ? html`<span class="num">Halbzeit ${game.half[0]}:${game.half[1]}</span>`
        : ''
    }</p>`,
    link: link && game.id ? href.spiel(game.id, 'bericht') : '',
    label: 'Zum Spielbericht',
    actions
  });
}

export function previewHero(game, now, {link = true, actions = '', status = null} = {}) {
  const tickets = ticketUrl(game, now);
  return heroCard({
    ticket: tickets ? {url: tickets, label: `Tickets für ${shortTeam(game.home)} – ${shortTeam(game.away)} kaufen (externe Seite)`} : null,
    // Mit Ticket-Marke ohne Halle: Heimspiele sind in der BBC Arena, und die Kopfzeile bleibt einzeilig.
    meta: tickets ? [dayLabel(game, now) || 'Heute', game.league].filter(Boolean).join(' · ') : metaLine(game, now),
    pill: countdown(kickoff(game), now),
    home: game.home,
    away: game.away,
    middle: kickoffTime(game.time),
    foot: status ? html`<p class="fresh" role="status">${status}</p>` : '',
    link: link ? href.spiel(game.id) : '',
    label: 'Zur Spielvorschau',
    actions
  });
}

/** Kleine Spielkarte «Nächstes Spiel» nach dem Spiel: dasselbe Muster wie die grosse Karte oben (Wappen, Anpfiff, Wappen). */
export function nextGameCard(game, now) {
  const own = isOwn(game.home) || isOwn(game.away);
  const place = own ? (isOwn(game.home) ? 'Heim' : 'auswärts') : '';
  const meta = [dayLabel(game, now), game.league, place].filter(Boolean).join(' · ');
  const label = `Nächstes Spiel: ${shortTeam(game.home)} – ${shortTeam(game.away)}, ${meta}, ${game.time || ''} Uhr`;
  return html`<a class="card nextcard" href="${href.spiel(game.id)}" aria-label="${label}">
    <span class="meta"><span>${meta}</span><span class="pill">${countdown(kickoff(game), now)}</span></span>
    <span class="vs"><span class="team">${crest(game.home)}${shortTeam(game.home)}</span>${kickoffTime(game.time)}<span class="team">${crest(game.away)}${shortTeam(game.away)}</span></span></a>`;
}

function liveScorers(match, game) {
  const report = liveReport(match);
  const team = report?.teams.find(t => isOwn(t.name));
  const top = (team?.players || [])
    .filter(p => Number.isInteger(p.goals) && p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  if (!top.length) return '';
  return html`<section class="sec" aria-labelledby="j-werfer">
    ${sectionHead('Kadetten-Werfer live', 'Alle Werte', game ? href.spiel(game.id, 'live') : '', 'j-werfer')}
    <div class="card list">
      ${top.map(p =>
        listRow({
          title: displayName(p.name),
          sub: Number.isInteger(p.shots) ? `${p.goals} aus ${p.shots} Würfen` : '',
          end: html`<span class="res num">${p.goals}</span>`,
          cls: 'compact'
        })
      )}</div>
      </section>`;
}

/** Tippspiel für ein Kadetten-Spiel: vor Anpfiff veränderbar, danach mit Punkten. */
export function tipFor(game, now) {
  if (!game || (!isOwn(game.home) && !isOwn(game.away)) || kickoff(game) === null) return '';
  const tip = tips()[game.id] || null,
    locked = kickoff(game) <= now;
  if (locked && !tip) return '';
  return tipCard({game, tip, locked, points: hasScore(game) && tip ? tipPoints(tip, game.score) : null});
}

/** Neuigkeiten auf der Titelseite: nur die neueste Meldung als Zeile; alle weiteren stehen im Reiter «News». */
function newsLine(data) {
  const lead = (data.stories || [])[0];
  if (!lead) return '';
  return html`<section class="sec" aria-labelledby="j-news">
    ${sectionHead('Neues aus dem Verein', 'Alle News', href.news(), 'j-news')}
    <a class="card rowcard tile" href="${href.artikel(lead.id)}"><span class="lead">${icon('doc')}</span><span class="grow"><span class="t">${lead.title}</span><span class="s">${lead.date}</span></span>${icon('go')}</a>
  </section>`;
}

function liveTableTeaser(data, match) {
  const table = liveTable(data.tables?.QHL, match);
  const own = table?.find(r => sameTeam(r.team, OWN_TEAM));
  if (!own) return '';
  const next = table[own.rank] || null,
    prev = table[own.rank - 2] || null;
  const text =
    own.rank === 1 && next
      ? `${own.points} Punkte, ${own.points - next.points} vor ${next.team.replace(/^HC |^BSV |^RTV 1879 /, '')}`
      : prev
        ? `${own.points} Punkte, ${prev.points - own.points} hinter Platz ${own.rank - 1}`
        : `${own.points} Punkte`;
  return html`<section class="sec" aria-labelledby="j-live-tab">
    ${sectionHead('Live-Tabelle', 'Ganze Tabelle', href.saison('tabellen'), 'j-live-tab')}
    <a class="card rowcard" href="${href.saison('tabellen')}"><span class="res big num">${own.rank}.</span><span class="grow"><span class="t">Bei diesem Stand ${own.rank === 1 ? 'Leader' : 'auf Platz ' + own.rank}</span><span class="s">${text}</span></span>${icon('go')}</a></section>`;
}

// Rundenkennungen aus dem Vereins-Spielplan für den Mobiliar Cup 2026/27.
const CUP_ROUNDS_2026 = {84: 'Achtelfinal', 85: 'Viertelfinal'};

// Ausgangslage am Spieltag; der Kopf verlinkt die ganze Vorschau auf der Spielseite (statt eines abgeschnittenen Textauszugs).
function matchdayStats(game, data) {
  const head = sectionHead('Ausgangslage', 'Vorschau lesen', href.spiel(game.id), 'j-lage');
  const competition = competitionOf(game);
  const league = competition === 'QHL' || competition === 'EHL';
  const rows = league ? standings(data.tables?.[competition]) : [];
  const own = rows.find(row => sameTeam(row.team, OWN_TEAM));
  const homeIsOwn = isOwn(game.home);
  const opponent = rows.find(row => sameTeam(row.team, homeIsOwn ? game.away : game.home));
  const recent = form(data.games, OWN_TEAM, 3, league ? game.league : undefined);
  const items = [];
  const formLabel = `Form · letzte ${recent.length} ${league ? competition : 'Spiele'}`;
  if (competition === 'Cup') {
    const round = String(game.round || '').trim();
    const cupSeason = game.date >= '2026-07-01' && game.date < '2027-07-01' && /^Mobiliar-Cup M$/i.test(game.league);
    const label = (cupSeason && CUP_ROUNDS_2026[round]) || (/\p{L}/u.test(round) ? round : null);
    return html`<section class="sec" aria-labelledby="j-lage">${head}
      <div class="card list">${listRow({title: label || game.league, sub: label ? game.league : '', end: ''})}${
        recent.length ? listRow({title: formLabel, end: formRow(recent, true)}) : ''
      }</div></section>`;
  }
  if (own) {
    const ownRank = html`<span class="rank-own">${own.rank}.</span>`;
    const opponentRank = opponent ? `${opponent.rank}.` : '';
    const rank = opponent
      ? html`<span class="rank-comparison">${homeIsOwn ? ownRank : opponentRank} <small>vs.</small> ${homeIsOwn ? opponentRank : ownRank}</span>`
      : ownRank;
    items.push([rank, competition === 'EHL' ? 'EHL-Gruppenrang' : 'QHL-Rang']);
    if (competition === 'QHL' && own.points != null) items.push([own.points + 2, 'Punkte mit Sieg']);
  }
  if (recent.length) items.push([formRow(recent, true), formLabel]);
  return items.length ? html`<section class="sec" aria-labelledby="j-lage">${head}${stats(items)}</section>` : '';
}

export function renderJetzt({state, now, load, api, ui}) {
  const {data, live} = state;
  if (!data)
    return html`${homeBand()}<section class="sec">
      ${state.dataError ? notice('Der Datenstand konnte nicht geladen werden. Bitte später erneut versuchen.') : loading('Datenstand wird geladen …')}</section>`;
  const {state: phase, game} = jetztState({games: data.games, live, now});
  const offline = state.dataError
    ? html`<section class="sec">${notice('Keine Verbindung zum Datendienst. Angezeigt wird der zuletzt gespeicherte Stand.')}</section>`
    : '';

  if (phase === 'live') {
    const own = findGame(data.games, game, now);
    return html`${homeBand()}
      <section class="sec match-score match-live" aria-labelledby="j-live">
        <h2 class="sr" id="j-live">Live</h2>
        ${liveHero(game, own, state)}</section>
      ${own && ui?.votes ? liveVoteCard({game: own, vote: load('votes:' + own.id, () => ui.votes.status(own.id), 30000), mine: myVotes()[own.id]}) : ''}
      ${liveTableTeaser(data, {...game, league: game.league || own?.league})}
      ${liveScorers(game, own)}
      ${offline}`;
  }

  if (phase === 'spieltag') {
    const actions = html`<div class="acts single"><a class="btn" href="${href.einstellungen()}">${icon('bell')}Push zum Anpfiff</a></div>`;
    return html`${homeBand()}
      <section class="sec match-score" aria-labelledby="j-heute">
        <h2 class="sr" id="j-heute">Heute</h2>
        ${previewHero(game, now, {actions, status: waitingForLive(game, state, now)})}</section>
      ${matchdayStats(game, data)}
      ${tipFor(game, now)}
      ${offline}`;
  }

  if (phase === 'nachspiel') {
    const result = withFinished(findGame(data.games, game, now) || game, live, now);
    const shown = hasScore(result) ? result : game;
    const next = nextGame(
      data.games.filter(candidate => String(candidate.id) !== String(shown.id)),
      now
    );
    const actions = html`<div class="acts">
      <a class="btn pri" href="${href.spiel(shown.id)}">${icon('doc')}Spielbericht</a><button class="btn" type="button" data-share-image="${shown.id}">${icon('share')}Teilen</button></div>`;
    const kurzLink = hasScore(shown) ? storyTeaser(shown) : '';
    const table = standings(data.tables?.QHL).find(r => r.team === OWN_TEAM);
    return html`${homeBand()}
      <section class="sec match-score" aria-labelledby="j-end">
        <h2 class="sr" id="j-end">Endresultat</h2>
        ${resultHero(shown, now, {actions, celebrate: outcome(shown) === 'S'})}</section>
      ${kurzLink}
      ${tipFor(shown, now)}
      ${
        table && shown.league === 'QHL'
          ? html`<section class="sec" aria-labelledby="j-nach">
        ${sectionHead('Tabelle danach', '', '', 'j-nach')}<a class="card rowcard tile" href="${href.saison('tabellen')}"><span class="res big num">${table.rank}.</span><span class="grow"><span class="t">QHL · ${table.points} Punkte</span><span class="s">nach ${table.played} Spielen</span></span>${icon('go')}</a></section>`
          : ''
      }
      ${
        next && next.id !== shown.id
          ? html`<section class="sec" aria-labelledby="j-next">
        ${sectionHead('Nächstes Spiel', '', '', 'j-next')}${nextGameCard(next, now)}
        </section>`
          : ''
      }
      ${offline}`;
  }

  const last = lastResult(data.games, now);
  const own = standings(data.tables?.QHL).find(row => row.team === OWN_TEAM);
  return html`${homeBand()}
    ${
      game
        ? html`<section class="sec match-score after-band" aria-labelledby="j-next">
      <h2 class="sr" id="j-next">Nächstes Spiel</h2>
      ${previewHero(game, now)}</section>`
        : ''
    }
    ${game ? '' : recapTeaser(data.games, now, true)}
    ${
      own
        ? html`<section class="sec" aria-labelledby="j-saison">
      ${sectionHead('Unsere Saison', '', '', 'j-saison')}<a class="card rowcard tile" href="#/statistik" aria-label="${`${own.rank}. Platz in der QHL, ${own.points ?? '–'} Punkte, ${own.played ?? '–'} Spiele`}"><span class="res big num">${own.rank}.</span><span class="grow"><span class="t">Platz in der QHL</span><span class="s">${own.points ?? '–'} Punkte · ${own.played ?? '–'} Spiele</span></span>${icon('go')}</a></section>`
        : ''
    }
    ${
      last
        ? html`<section class="sec" aria-labelledby="j-last">
      ${sectionHead('Letztes Resultat', '', '', 'j-last')}<div class="card list tile">
      ${gameRow(last, now, {crests: true})}</div>
      </section>`
        : ''
    }
    ${quizTeaser(now)}
    ${newsLine(data)}
    ${offline}`;
}

export function renderNews({state}) {
  const stories = (state.data?.stories || []).slice(0, 40);
  const [lead, ...rest] = stories,
    image = lead && storyImage(lead);
  return html`${topBar('News', 'Aus dem Verein')}
    ${
      lead
        ? html`<section class="sec after-band" aria-label="Aufmacher">
      <a class="lead-story${image ? '' : ' no-photo'}" href="${href.artikel(lead.id)}">${
        image ? html`<img src="${image}" alt="" width="800" height="520" decoding="async" fetchpriority="high">` : ''
      }<span class="lead-copy"><span class="story-date">${lead.date}</span><h2>${lead.title}</h2>
      </span></a></section>`
        : ''
    }
    <section class="sec${lead ? '' : ' after-band'}">
      ${
        stories.length
          ? html`<div class="plain-list news-rows">
      ${rest.map(storyRow)}</div>`
          : state.data
            ? notice('Noch keine News vorhanden.', 'doc')
            : loading()
      }</section>
    <section class="sec">
      ${listRow({title: 'Alle Vereinsnews auf kadettensh.ch', end: icon('ext'), link: 'https://kadettensh.ch/news/'})}</section>`;
}
