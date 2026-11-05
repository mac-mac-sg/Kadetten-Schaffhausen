// Spielbericht: Matchbericht als Text, Spielverlauf, Teamvergleich, Spielerwerte, Wurfanalyse (EHL).
import {html, raw} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {shortTeam} from '../logic.js';
import {isOwn, displayName, storiesForGame} from '../match.js';
import {reportText, goalTimeline, flow, incidents, comparisonRows, fmtPct, pct, ZONES} from '../report.js';
import {favourite} from '../personal.js';
import {sectionHead, notice, loading, listRow, storyRow, playerByNumber} from './parts.js';

export const ruleButton = id => html`<button type="button" class="rule" data-rule="${id}" aria-label="Erklärung anzeigen">?</button>`;
const minute = sec => `${Math.floor(sec / 60) + 1}.`;

/** Torverlauf als Linie der Tordifferenz aus Sicht der Kadetten, mit Halbzeitmarke. */
export function scoreChart(goals, ownHome, {timeouts = [], suspensions = []} = {}) {
  if (!goals.length) return '';
  const W = 320, H = 130, mid = H / 2;
  const end = Math.max(3600, goals.at(-1).sec);
  const diff = g => ownHome ? g.score[0] - g.score[1] : g.score[1] - g.score[0];
  const max = Math.max(3, ...goals.map(g => Math.abs(diff(g))));
  const x = sec => (sec / end * W).toFixed(1), y = d => (mid - d / max * (mid - 12)).toFixed(1);
  let path = `M0 ${mid}`, last = 0;
  for (const g of goals) { path += ` L${x(g.sec)} ${y(last)} L${x(g.sec)} ${y(diff(g))}`; last = diff(g); }
  path += ` L${W} ${y(last)}`;
  const area = `${path} L${W} ${mid} Z`;
  const final = diff(goals.at(-1));
  const label = `Torverlauf: grösste Führung Kadetten ${Math.max(0, ...goals.map(diff))} Tore, grösster Rückstand ${Math.max(0, ...goals.map(g => -diff(g)))} Tore, Schluss ${final > 0 ? '+' : ''}${final}.`;
  const marks = [...timeouts.map(t => [t.sec, t.home === ownHome ? 'own' : 'opp', 'T']), ...suspensions.map(s => [s.sec, s.home === ownHome ? 'own' : 'opp', '2'])];
  return raw(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="none">
    <defs><clipPath id="c-up"><rect x="0" y="0" width="${W}" height="${mid}"/></clipPath><clipPath id="c-down"><rect x="0" y="${mid}" width="${W}" height="${mid}"/></clipPath></defs>
    <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" class="c-zero"/>
    <line x1="${x(1800)}" y1="0" x2="${x(1800)}" y2="${H}" class="c-half"/>
    <path d="${area}" class="c-up" clip-path="url(#c-up)"/><path d="${area}" class="c-down" clip-path="url(#c-down)"/>
    <path d="${path}" class="c-line"/>
    ${marks.map(([sec, side, t]) => `<text x="${x(sec)}" y="${side === 'own' ? H - 3 : 11}" class="c-mark ${side}" text-anchor="middle">${t}</text>`).join('')}
  </svg>`);
}

async function loadAll(api, game) {
  const out = {shv: null, archive: null};
  if (game.league === 'EHL') {
    const {report} = await api.ehfReport(game.id);
    out.archive = report;
    return out;
  }
  const [shv, archive] = await Promise.allSettled([api.report(game.id).then(r => r.report), api.matchReport(game.id).then(r => r.report)]);
  out.shv = shv.status === 'fulfilled' ? shv.value : null;
  out.archive = archive.status === 'fulfilled' ? archive.value : null;
  if (!out.shv) {
    const local = await fetch('data/game-reports.json').then(r => r.ok ? r.json() : null).catch(() => null);
    out.shv = local?.reports && Object.values(local.reports).find(r => String(r.gameId) === String(game.id)) || null;
  }
  if (!out.shv && !out.archive) throw Error('Kein Bericht');
  return out;
}

export const reportKey = game => 'bericht:' + game.id + ':' + game.score.join('-');
export const loadReportFor = (load, api, game) => load(reportKey(game), () => loadAll(api, game), 900000);

function playerTable(team, data, favNumber) {
  const favIds = favNumber ? [data.playerSeason?.players?.[favNumber]?.shvPlayerId, data.ehlPlayerSeason?.players?.[favNumber]?.ehfPlayerId].filter(Boolean) : [];
  const numberOf = p => Object.entries(data.playerSeason?.players || {}).find(([, v]) => v.shvPlayerId === p.id)?.[0] || Object.entries(data.ehlPlayerSeason?.players || {}).find(([, v]) => v.ehfPlayerId === p.id)?.[0];
  const name = p => { const nr = isOwn(team.name) ? numberOf(p) : null; return nr ? html`<a href="${href.spieler(nr)}">${playerByNumber(nr)?.name || displayName(p.name)}</a>` : displayName(p.name); };
  const field = team.players.filter(p => !p.keeper).sort((a, b) => (b.goals ?? -1) - (a.goals ?? -1) || String(a.name).localeCompare(String(b.name), 'de'));
  const keepers = team.players.filter(p => p.keeper && (p.saves !== null || p.keeperShots !== null));
  const v = x => x ?? '–';
  return html`<div class="tbl-scroll" role="region" aria-label="${'Spielerwerte ' + shortTeam(team.name)}" tabindex="0"><table class="tbl-real pstats">
      <thead><tr><th scope="col">Spieler</th><th scope="col" class="n">Tore/W</th><th scope="col" class="n">Quote</th><th scope="col" class="n">7-m</th><th scope="col" class="n">2′</th><th scope="col" class="n">G</th></tr></thead>
      <tbody>${field.map(p => html`<tr${favIds.includes(p.id) ? html` class="fav-row"` : ''}><th scope="row">${favIds.includes(p.id) ? html`<span class="star" role="img" aria-label="Lieblingsspieler">${icon('star', 14)}</span>` : ''}${name(p)}</th><td class="n num strong">${v(p.goals)}/${v(p.shots)}</td><td class="n num">${fmtPct(pct(p.goals, p.shots))}</td><td class="n num">${p.sevenShots ? `${v(p.seven)}/${p.sevenShots}` : '–'}</td><td class="n num">${v(p.twoMinutes)}</td><td class="n num">${v(p.warnings)}</td></tr>`)}</tbody>
    </table></div>
    ${keepers.length ? html`<h3 class="h4">Torhüter</h3><div class="card-in list">${keepers.map(p => listRow({title: name(p), sub: p.keeperShots ? `${fmtPct(pct(p.saves, p.keeperShots))} Fangquote` : '', end: html`<span class="res num">${v(p.saves)}<small> / ${v(p.keeperShots)}</small></span>`, cls: 'compact'}))}</div>` : ''}`;
}

function shotAnalysis(shotStats, report) {
  if (!shotStats?.home || !shotStats?.away) return '';
  const own = isOwn(report.teams[0].name) ? 'home' : 'away';
  const side = (key, label) => {
    const s = shotStats[key];
    const parts = [['goals', 'Tor', 'g'], ['saved', 'gehalten', 's'], ['post', 'Pfosten/Latte', 'p'], ['missed', 'daneben', 'm'], ['blocked', 'geblockt', 'b']].filter(([k]) => s[k] > 0);
    const zones = ZONES.map(([code, name]) => [name, s.zones?.find(z => z.zone === code)]).filter(([, z]) => z?.shots);
    return html`<div class="shots"><h3 class="h4">${label} · ${s.shots} Würfe</h3>
      <div class="stack" role="img" aria-label="${parts.map(([k, l]) => `${s[k]} ${l}`).join(', ')}">${parts.map(([k, , c]) => html`<i class="${'st-' + c}" data-style="${'flex:' + s[k]}"></i>`)}</div>
      <ul class="legend">${parts.map(([k, l, c]) => html`<li><i class="${'st-' + c}"></i>${l} <b class="num">${s[k]}</b></li>`)}</ul>
      ${zones.length ? html`<div class="zones">${zones.map(([name, z]) => html`<div class="zone"><span>${name}</span><b class="num">${z.goals}<small>/${z.shots}</small></b><em class="num">${fmtPct(pct(z.goals, z.shots))}</em></div>`)}</div>` : ''}</div>`;
  };
  return html`<section class="sec" aria-labelledby="g-wurf">${sectionHead('Woher die Würfe kamen', '', '', 'g-wurf')}
    <div class="card">${side(own, 'Kadetten')}${side(own === 'home' ? 'away' : 'home', shortTeam(report.teams[own === 'home' ? 1 : 0].name))}</div>
    <p class="fine pad-top">Quelle: EHF-Liveticker, ohne Gewähr.</p></section>`;
}

/** Fan-Wahl «Spieler des Matchs». vote: Ergebnis von load('votes:…'); mine: eigene Stimme (Spieler-ID) oder null. */
export function voteSection({vote, mine, now, busy, message}) {
  const v = vote?.value;
  if (!v || !Array.isArray(v.candidates) || !v.candidates.length) {
    if (v && v.opensAt && now < v.opensAt) return html`<section class="sec" aria-labelledby="g-vote">${sectionHead('Spieler des Matchs', '', '', 'g-vote')}${notice('Die Fan-Wahl öffnet nach Spielende, sobald der Spielbericht vorliegt.', 'star')}</section>`;
    return '';
  }
  const total = v.total || 0, counts = v.counts || {};
  const showResults = Boolean(mine) || !v.open;
  const sorted = [...v.candidates].sort((a, b) => showResults ? (counts[b.id] || 0) - (counts[a.id] || 0) : (b.goals ?? b.saves ?? 0) - (a.goals ?? a.saves ?? 0));
  const detail = c => [Number.isInteger(c.goals) && c.goals > 0 ? `${c.goals} ${c.goals === 1 ? 'Tor' : 'Tore'}` : '', Number.isInteger(c.saves) && c.saves > 0 ? `${c.saves} Paraden` : ''].filter(Boolean).join(' · ');
  const closes = v.closesAt ? new Date(v.closesAt).toLocaleString('de-CH', {timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit'}) : '';
  return html`<section class="sec" aria-labelledby="g-vote">${sectionHead('Spieler des Matchs', '', '', 'g-vote')}
    <div class="card list vote">${sorted.map(c => {
      const share = total ? Math.round((counts[c.id] || 0) / total * 100) : 0;
      if (showResults) return html`<div class="rl compact${mine === c.id ? ' mine' : ''}"><span class="grow"><span class="t">${displayName(c.name)}${mine === c.id ? html` <span class="tag">Deine Stimme</span>` : ''}</span><span class="vbar" aria-hidden="true"><b data-style="${'width:' + share + '%'}"></b></span></span><span class="res num">${share}<small> %</small></span></div>`;
      return html`<button type="button" class="rl compact" data-vote="${c.id}"${busy ? html` disabled` : ''}><span class="grow"><span class="t">${displayName(c.name)}</span>${detail(c) ? html`<span class="s">${detail(c)}</span>` : ''}</span>${icon('star', 18)}</button>`;
    })}</div>
    <p class="fine pad-top" role="status">${message || (showResults ? `${total} ${total === 1 ? 'Stimme' : 'Stimmen'}${v.open ? ` · Wahl offen bis ${closes}` : ' · Wahl beendet'}` : `Tippe auf deinen Spieler des Matchs. Eine Stimme pro Gerät, offen bis ${closes}.`)} Inoffizielle Fan-Wahl, keine Auszeichnung des Vereins.</p>
  </section>`;
}

/** Inhalt des Berichts-Tabs. entry: Ergebnis von loadReportFor. */
export function renderBericht({game, data, entry, ui, normalized, voting = ''}) {
  const stories = storiesForGame(data.stories, game);
  const articles = stories.length ? html`<section class="sec" aria-labelledby="g-art">${sectionHead('Artikel zum Spiel', '', '', 'g-art')}<div class="card list">${stories.slice(0, 3).map(storyRow)}</div></section>` : '';
  if (!entry || entry.status === 'error') return html`${voting}<section class="sec">${notice('Für dieses Spiel liegt noch kein bestätigter Spielbericht vor. Er erscheint in der Regel kurz nach Spielende.', 'doc')}</section>${articles}`;
  if (entry.status === 'loading') return html`${voting}<section class="sec">${loading('Spielbericht wird geladen …')}</section>${articles}`;
  const {shv, archive} = entry.value;
  const report = normalized;
  const text = reportText(archive);
  const ownHome = isOwn(game.home);
  const goals = goalTimeline(archive, shv);
  const f = flow(goals), inc = incidents(archive, shv);
  const rows = report ? comparisonRows(report) : [];
  const favNumber = favourite();
  const teamIndex = ui.reportTeam === 'opp' ? (ownHome ? 1 : 0) : (ownHome ? 0 : 1);
  const ownSide = ownHome ? 'home' : 'away';
  const sideText = side => side === ownSide ? 'Kadetten' : shortTeam(ownHome ? game.away : game.home);
  return html`
    ${voting}
    ${text ? html`<section class="sec" aria-labelledby="g-text">${sectionHead('Matchbericht', '', '', 'g-text')}
      <article class="card prose">${text.headline ? html`<h3 class="h3">${text.headline}</h3>` : ''}${text.paragraphs.map(p => html`<p>${p}</p>`)}
      <p class="fine">${text.generator === 'ki' ? 'Von einer KI aus den bestätigten Spieldaten formuliert.' : 'Aus den bestätigten Spieldaten zusammengestellt.'}</p></article></section>` : ''}
    ${goals.length ? html`<section class="sec" aria-labelledby="g-verlauf">${sectionHead('Spielverlauf', '', '', 'g-verlauf')}
      <div class="card"><div class="chart-wrap">${scoreChart(goals, ownHome, inc)}<div class="chart-axis"><span>1′</span><span>Halbzeit</span><span>60′</span></div></div>
        <div class="facts3">
          <span><b class="num">${f.biggest[ownSide] > 0 ? '+' + f.biggest[ownSide] : '–'}</b><small>grösste Führung</small></span>
          <span><b class="num">${f.run.len}:0</b><small>bester Lauf ${sideText(f.run.side)}</small></span>
          <span><b class="num">${f.changes}</b><small>Führungswechsel</small></span>
        </div>
        ${inc.timeouts.length || inc.suspensions.length ? html`<p class="fine">${inc.timeouts.length ? html`T = Auszeit ${ruleButton('auszeit')}` : ''}${inc.timeouts.length && inc.suspensions.length ? ' · ' : ''}${inc.suspensions.length ? html`2 = Zeitstrafe ${ruleButton('2min')}` : ''} · unten Kadetten, oben Gegner</p>` : ''}
      </div>
      <details class="card more-card" id="g-torfolge"><summary>Torfolge (${goals.length} Tore)</summary>
        <ol class="goals">${goals.map(g => html`<li class="${(g.home === ownHome) ? 'own' : 'opp'}"><span class="num">${minute(g.sec)}</span><b class="num">${g.score[0]}:${g.score[1]}</b><span>${g.name ? displayName(g.name) : ''}${g.seven ? ' (7-m)' : ''}</span></li>`)}</ol></details>
    </section>` : ''}
    ${rows.length ? html`<section class="sec" aria-labelledby="g-cmp">${sectionHead('Teamvergleich', '', '', 'g-cmp')}<div class="card list">
      <div class="cmp head"><span>${shortTeam(game.home)}</span><span></span><span>${shortTeam(game.away)}</span></div>
      ${rows.map(c => html`<div class="cmp num"><b>${c.homeText}</b><span class="bar"><span>${c.label}${c.rule ? ruleButton(c.rule) : ''}</span><i aria-hidden="true"><b data-style="${'width:' + Math.round(c.share * 100) + '%'}"></b></i></span><b>${c.awayText}</b></div>`)}
    </div></section>` : ''}
    ${report ? html`<section class="sec" aria-labelledby="g-spieler">${sectionHead('Spielerwerte', '', '', 'g-spieler')}
      <div class="seg flush" role="group" aria-label="Mannschaft">${[['own', 'Kadetten'], ['opp', shortTeam(ownHome ? game.away : game.home)]].map(([id, label]) => html`<button type="button" data-ui="${'reportTeam:' + id}" aria-pressed="${String((ui.reportTeam || 'own') === id)}"${(ui.reportTeam || 'own') === id ? html` class="on"` : ''}>${label}</button>`)}</div>
      <div class="card pad-s">${playerTable(report.teams[teamIndex], data, favNumber)}</div>
      <p class="fine pad-top">Tore/W = Tore/Würfe · 2′ = Zeitstrafen ${ruleButton('2min')} · G = Verwarnungen ${ruleButton('gelb')}${report.spectators ? ` · ${report.spectators.toLocaleString('de-CH')} Zuschauer` : ''}${report.referees?.length ? ` · Schiedsrichter: ${report.referees.join(', ')}` : ''} · Quelle: ${report.source === 'EHF' ? 'EHF' : 'Schweizerischer Handball-Verband'}</p>
    </section>` : ''}
    ${report?.shotStats ? shotAnalysis(report.shotStats, report) : ''}
    ${game.league === 'QHL' ? html`<section class="sec"><div class="card list">${listRow({title: 'Tabelle danach', sub: 'QHL', link: href.saison('tabellen'), lead: html`<span class="lead">${icon('saison', 20)}</span>`})}</div></section>` : ''}
    ${articles}`;
}


/** Live: Team- und Spielerwerte aus /api/live (details), alle 30 s neu. Keine Ereignisliste. */
export function liveReport(match) {
  const d = match?.details;
  if (!d || !Array.isArray(d.players) || !d.players.length) return null;
  const v = x => Number.isInteger(x) && x >= 0 ? x : null;
  const team = home => {
    const list = d.players.filter(p => p.home === home);
    const players = list.map(p => ({id: p.id, name: p.name, keeper: Boolean(p.goalkeeper), goals: v(p.goals), shots: v(p.shots), seven: v(p.seven), sevenShots: v(p.sevenShots), twoMinutes: v(p.twoMinutes), warnings: v(p.yellow), redCards: v(p.red), saves: p.goalkeeper ? v(p.saves) : null, keeperShots: p.goalkeeper ? v(p.savesFaced) : null}));
    const total = key => players.length && players.every(p => p.keeper || p[key] !== null) ? players.filter(p => !p.keeper || p[key] !== null).reduce((n, p) => n + (p[key] || 0), 0) : null;
    const ts = d.teamStats?.[home ? 'home' : 'guest'] || {};
    return {name: home ? match.home : match.away, players, shots: v(ts.shots) ?? total('shots'), saves: null, savePercentage: null, throwPercentage: null, seven: v(ts.sevenGoals) ?? total('seven'), sevenShots: v(ts.sevenShots) ?? total('sevenShots'), twoMinutes: v(ts.twoMinutes) ?? total('twoMinutes'), warnings: v(ts.warnings) ?? total('warnings'), turnovers: v(ts.technicalFaults)};
  };
  if (!Array.isArray(match.score)) return null;
  return {score: match.score, half: Array.isArray(match.half) ? match.half : [null, null], teams: [team(true), team(false)], source: match.league === 'European League' ? 'EHF' : 'SHV', updatedAt: d.updatedAt || null, stale: d.ok === false};
}

export function renderLiveStats({match, data, ui}) {
  const report = liveReport(match);
  if (!report) return html`<section class="sec">${notice('Spielerwerte erscheinen, sobald die Quelle sie während des Spiels meldet.', 'team')}</section>`;
  const ownHome = isOwn(match.home);
  const rows = comparisonRows(report).filter(r => !/Halbzeit/.test(r.label));
  const teamIndex = ui.reportTeam === 'opp' ? (ownHome ? 1 : 0) : (ownHome ? 0 : 1);
  return html`
    ${rows.length > 1 ? html`<section class="sec" aria-labelledby="l-cmp">${sectionHead('Teamwerte live', '', '', 'l-cmp')}<div class="card list">
      <div class="cmp head"><span>${shortTeam(match.home)}</span><span></span><span>${shortTeam(match.away)}</span></div>
      ${rows.map(c => html`<div class="cmp num"><b>${c.homeText}</b><span class="bar"><span>${c.label}${c.rule ? ruleButton(c.rule) : ''}</span><i aria-hidden="true"><b data-style="${'width:' + Math.round(c.share * 100) + '%'}"></b></i></span><b>${c.awayText}</b></div>`)}
    </div></section>` : ''}
    <section class="sec" aria-labelledby="l-sp">${sectionHead('Spielerwerte live', '', '', 'l-sp')}
      <div class="seg flush" role="group" aria-label="Mannschaft">${[['own', 'Kadetten'], ['opp', shortTeam(ownHome ? match.away : match.home)]].map(([id, label]) => html`<button type="button" data-ui="${'reportTeam:' + id}" aria-pressed="${String((ui.reportTeam || 'own') === id)}"${(ui.reportTeam || 'own') === id ? html` class="on"` : ''}>${label}</button>`)}</div>
      <div class="card pad-s">${playerTable(report.teams[teamIndex], data, favourite())}</div>
      <p class="fine pad-top">${report.stale ? 'Spielerwerte im Moment nicht erreichbar, angezeigt wird der letzte Stand. ' : ''}Werte werden alle 30 Sekunden aktualisiert. Massgebend ist der Spielbericht nach Abpfiff.</p>
    </section>`;
}
