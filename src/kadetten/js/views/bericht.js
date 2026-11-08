// Spielbericht: Matchbericht als Text, Spielverlauf, Teamvergleich, Spielerwerte, Wurfanalyse (EHL).
import {html, raw, escapeHtml} from '../text.js';
import {icon} from '../icons.js';
import {href} from '../router.js';
import {shortTeam} from '../logic.js';
import {isOwn, displayName, storiesForGame} from '../match.js';
import {reportText, goalTimeline, flow, incidents, comparisonRows, fmtPct, pct, ZONES} from '../report.js';
import {favourite, pickFor} from '../personal.js';
import {suggestions, livePicks, numberFor, surname} from '../wahl.js';
import {sectionHead, notice, loading, listRow, storyRow, playerByNumber, playerPhoto} from './parts.js';

export const ruleButton = id => html`<button type="button" class="rule" data-rule="${id}" aria-label="Erklärung anzeigen">?</button>`;
const minute = sec => `${Math.floor(sec / 60) + 1}.`;

/** Vergleichszeile: Orange zeigt immer den Anteil der Kadetten, von ihrer Seite aus. */
function cmpRow(c, ownHome) {
  const own = ownHome ? c.share : 1 - c.share;
  return html`<div class="cmp num"><b${ownHome ? html` class="own"` : ''}>${c.homeText}</b><span class="bar"><span>${c.label}${c.rule ? ruleButton(c.rule) : ''}</span><i aria-hidden="true"${ownHome ? '' : html` class="right"`}><b data-style="${'width:' + Math.round(own * 100) + '%'}"></b></i></span><b${ownHome ? '' : html` class="own"`}>${c.awayText}</b></div>`;
}

/** Gleichmässige Kurve durch die Punkte (monotone kubische Interpolation: steigt nie zurück, kein Überschwingen). */
function monotonePath(points) {
  const f = v => +v.toFixed(2);
  const pts = points.filter((p, i) => i === points.length - 1 || p[0] !== points[i + 1][0]);
  const n = pts.length;
  if (n < 2) return '';
  const dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], q = a * a + b * b;
    if (q > 9) { const k = 3 / Math.sqrt(q); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${f(pts[i][0] + h)} ${f(pts[i][1] + t[i] * h)} ${f(pts[i + 1][0] - h)} ${f(pts[i + 1][1] - t[i + 1] * h)} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`; }
  return d;
}

/** Spielverlauf wie in Matchday: je Team eine Kurve der erzielten Tore über die Spielzeit, Halbzeitmarke, Endpunkte.
 * Kadetten: orange und kräftig; Gegner: neutral und gestrichelt (nie nur über Farbe unterscheidbar). */
export function curveChart(goals, ownHome, {ownName = 'Kadetten', oppName = 'Gegner', final = null} = {}) {
  if (!goals.length) return '';
  const left = 34, right = 384, top = 20, bottom = 176;
  const last = goals.at(-1).score;
  // Endstand aus dem Spiel; die Kurve läuft nur bis ans Ende, wenn die Torfolge vollständig ist (sonst bis zum letzten bekannten Tor).
  const total = Array.isArray(final) && final.length === 2 && final.every(Number.isInteger) && final[0] + final[1] >= last[0] + last[1] ? final : last;
  const complete = total[0] === last[0] && total[1] === last[1];
  const maximum = Math.max(10, Math.ceil(Math.max(...total) / 10) * 10);
  const end = Math.max(3600, goals.at(-1).sec);
  const x = sec => +(left + sec / end * (right - left)).toFixed(2), y = v => +(bottom - v / maximum * (bottom - top)).toFixed(2);
  const ownIdx = ownHome ? 0 : 1;
  const endX = complete ? right : x(goals.at(-1).sec);
  const curve = side => {
    const pts = [[left, bottom]];
    let prev = 0;
    for (const g of goals) if (g.score[side] !== prev) { prev = g.score[side]; pts.push([x(g.sec), y(prev)]); }
    pts.push([endX, y(last[side])]);
    return monotonePath(pts);
  };
  const [own, opp] = [curve(ownIdx), curve(1 - ownIdx)];
  const ticks = [0, 600, 1200, 1800, 2400, 3000, 3600].filter(sec => sec <= end);
  const diff = total[ownIdx] - total[1 - ownIdx];
  const label = `Spielverlauf: ${ownName} ${total[ownIdx]} Tore, ${oppName} ${total[1 - ownIdx]} Tore, Tordifferenz ${diff > 0 ? '+' : ''}${diff}. Torfolge über die Spielzeit, Halbzeit nach 30 Minuten.`;
  return raw(`<svg class="curve" viewBox="0 0 400 206" role="img" aria-label="${escapeHtml(label)}">
    ${[0, maximum / 2, maximum].map(v => `<path class="cv-grid" d="M${left} ${y(v)}H${right}"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    <path class="cv-half" d="M${x(1800)} ${top}V${bottom}"/>
    <path class="cv-area" d="${opp} V${bottom} H${left}Z"/><path class="cv-area own" d="${own} V${bottom} H${left}Z"/>
    <path class="cv-line opp" d="${opp}"/><path class="cv-line own" d="${own}"/>
    <circle class="cv-dot opp" cx="${endX}" cy="${y(last[1 - ownIdx])}" r="4"/><circle class="cv-dot own" cx="${endX}" cy="${y(last[ownIdx])}" r="5"/>
    ${ticks.map(sec => `<text x="${x(sec)}" y="200" text-anchor="${sec === 0 ? 'start' : sec === 3600 ? 'end' : 'middle'}">${sec === 1800 ? '30′ · Pause' : sec / 60 + '′'}</text>`).join('')}
  </svg>`);
}

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
      <tbody>${field.map(p => html`<tr${favIds.includes(p.id) ? html` class="fav-row"` : ''}><th scope="row">${favIds.includes(p.id) ? html`<span class="star" role="img" aria-label="Lieblingsspieler">${icon('star', 16)}</span>` : ''}${name(p)}</th><td class="n num strong">${v(p.goals)}/${v(p.shots)}</td><td class="n num">${fmtPct(pct(p.goals, p.shots))}</td><td class="n num">${p.sevenShots ? `${v(p.seven)}/${p.sevenShots}` : '–'}</td><td class="n num">${v(p.twoMinutes)}</td><td class="n num">${v(p.warnings)}</td></tr>`)}</tbody>
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
export function voteSection({vote, mine, now, busy, message, selected, data, pickId = null}) {
  const v = vote?.value;
  if (!v || !Array.isArray(v.candidates) || !v.candidates.length) {
    if (v && v.opensAt && now < v.opensAt) return html`<section class="sec" aria-labelledby="g-vote">${sectionHead('Spieler des Matchs', '', '', 'g-vote')}${notice('Die Fan-Wahl öffnet nach Spielende, sobald der Spielbericht vorliegt.', 'star')}</section>`;
    return html`<section class="sec">${vote?.status === 'loading' ? loading('Die Fan-Wahl wird geladen …') : notice('Die Fan-Wahl ist derzeit nicht geöffnet. Sie erscheint nach Spielende, sobald der bestätigte Spielbericht vorliegt.', 'star')}</section>`;
  }
  const total = v.total || 0, counts = v.counts || {};
  const showResults = !v.open;
  const sorted = [...v.candidates].sort((a, b) => showResults ? (counts[b.id] || 0) - (counts[a.id] || 0) : (b.goals ?? b.saves ?? 0) - (a.goals ?? a.saves ?? 0));
  const detail = c => [Number.isInteger(c.goals) && c.goals > 0 ? `${c.goals} ${c.goals === 1 ? 'Tor' : 'Tore'}` : '', Number.isInteger(c.saves) && c.saves > 0 ? `${c.saves} Paraden` : ''].filter(Boolean).join(' · ');
  const closes = v.closesAt ? new Date(v.closesAt).toLocaleString('de-CH', {timeZone: 'Europe/Zurich', weekday: 'short', hour: '2-digit', minute: '2-digit'}) : '';
  const playerInfo = c => { const nr = numberFor(data, c.id); return nr === null ? null : playerByNumber(nr); };
  // Wahlliste: Vorschläge nach Spieldaten mit Begründung, die übrigen Spieler eingeklappt. Der Favorit aus dem Live-Spiel ist vorgewählt.
  const row = (c, reason) => {
    const player = playerInfo(c), chosen = String(selected) === String(c.id), fav = pickId !== null && String(pickId) === String(c.id);
    return html`<button type="button" class="vote-player${chosen ? ' selected stripe-edge' : ''}" data-vote-select="${c.id}" aria-pressed="${String(chosen)}"${busy ? html` disabled` : ''}>${player ? html`<span class="vp-img"><img src="${playerPhoto(player.number)}" alt="" width="124" height="112" loading="lazy"></span>` : html`<span class="vp-img" aria-hidden="true"><b>${surname(displayName(c.name)).slice(0, 2).toUpperCase()}</b></span>`}<span class="grow"><span class="t">${player ? html`<span class="num vp-no">${player.number}</span> ` : ''}${player?.name || displayName(c.name)}</span>${detail(c) ? html`<span class="s">${detail(c)}</span>` : ''}${reason || fav ? html`<span class="why-row">${reason ? html`<span class="why">${reason}</span>` : ''}${fav ? html`<span class="why fav">Dein Favorit</span>` : ''}</span>` : ''}</span><span class="pk${chosen ? ' on' : ''}" aria-hidden="true">${chosen ? 'Gewählt' : 'Wählen'}</span></button>`;
  };
  const {picked, rest} = suggestions(v.candidates);
  const chosenC = v.candidates.find(c => String(c.id) === String(selected)), chosenName = chosenC ? surname(displayName(chosenC.name)) : '';
  const openList = html`<div class="vote-rows">
    ${picked.length ? html`<h3 class="h4">Vorschläge nach Spieldaten</h3>${picked.map(p => row(p.candidate, p.reason))}` : ''}
    ${rest.length ? html`<details class="more-card vote-rest" id="vote-rest"${picked.length ? '' : ' open'}><summary>${picked.length ? 'Alle weiteren Spieler' : 'Alle Spieler'}<span class="num muted">${rest.length}</span></summary><div class="vote-rest-rows">${rest.map(c => row(c, ''))}</div></details>` : ''}
  </div>`;
  return html`<section class="sec vote-panel" aria-labelledby="g-vote">${sectionHead('Deine Stimme zählt', '', '', 'g-vote')}
    ${mine && v.open ? html`<p class="note" role="status">Deine Stimme ist gespeichert. Das Ergebnis erscheint nach Wahlende.</p>` : ''}
    ${showResults ? html`<div class="card list vote">${sorted.map(c => {
      const share = total ? Math.round((counts[c.id] || 0) / total * 100) : 0;
      return html`<div class="rl compact${mine === c.id ? ' mine' : ''}"><span class="grow"><span class="t">${displayName(c.name)}${mine === c.id ? html` <span class="tag">Deine Stimme</span>` : ''}</span><span class="vbar" aria-hidden="true"><b data-style="${'width:' + share + '%'}"></b></span></span><span class="res num">${share}<small> %</small></span></div>`;
    })}</div>` : mine ? '' : openList}
    ${v.open && !mine ? html`<div class="vote-confirm"><button class="btn pri wide" type="button" data-vote-confirm${!selected || !v.candidates.some(c => String(c.id) === String(selected)) || busy ? html` disabled` : ''}>${busy ? 'Wird gespeichert …' : chosenName ? 'Stimme für ' + chosenName + ' abgeben' : 'Stimme abgeben'}</button></div>` : ''}
    <p class="fine pad-top" role="status">${message || (showResults ? `${total} ${total === 1 ? 'Stimme' : 'Stimmen'}${v.open ? ` · Wahl offen bis ${closes}` : ' · Wahl beendet'}` : mine ? 'Deine Stimme ist gespeichert. Das Ergebnis erscheint nach Wahlende.' : `Wähle deinen Spieler und bestätige die Stimme. Eine Stimme pro Gerät, offen bis ${closes}.`)} Inoffizielle Fan-Wahl, keine Auszeichnung des Vereins.</p>
  </section>`;
}

/** Kopf des Spielverlaufs: beide Teams mit Toren, dazwischen die Tordifferenz aus Sicht der Kadetten, darunter die beiden Kurven. */
function verlauf(goals, ownHome, game) {
  const final = Array.isArray(game.score) && game.score.length === 2 ? game.score : goals.at(-1).score, ownIdx = ownHome ? 0 : 1;
  const [own, opp] = [final[ownIdx], final[1 - ownIdx]], diff = own - opp;
  const oppName = shortTeam(ownHome ? game.away : game.home);
  return html`<div class="cv-legend">
    <span class="cv-team own"><i aria-hidden="true"></i><span>Kadetten</span><b class="num">${own}</b></span>
    <span class="cv-diff num" role="img" aria-label="${'Tordifferenz ' + (diff > 0 ? '+' : '') + diff}">${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}</span>
    <span class="cv-team opp"><i aria-hidden="true"></i><span>${oppName}</span><b class="num">${opp}</b></span></div>
    ${curveChart(goals, ownHome, {ownName: 'Kadetten', oppName, final})}`;
}

/** Inhalt des Berichts-Tabs. entry: Ergebnis von loadReportFor. */
const textSection = text => html`<section class="sec" aria-labelledby="g-text">${sectionHead('Matchbericht', '', '', 'g-text')}
      <article class="card prose">${text.headline ? html`<h3 class="h3">${text.headline}</h3>` : ''}${text.paragraphs.map(p => html`<p>${p}</p>`)}
      <p class="fine">${text.generator === 'ki' ? 'Von einer KI aus den bestätigten Spieldaten formuliert.' : 'Aus den bestätigten Spieldaten zusammengestellt.'}</p></article></section>`;

/** Rückblick: nur der erzeugte Bericht, sonst nichts. Alle Zahlen stehen unter «Statistik». */
function rueckblick(entry) {
  if (!entry || entry.status === 'error') return html`<section class="sec">${notice('Der Rückblick erscheint, sobald der bestätigte Spielbericht vorliegt. Das ist in der Regel kurz nach Spielende.', 'doc')}</section>`;
  if (entry.status === 'loading') return html`<section class="sec">${loading('Rückblick wird geladen …')}</section>`;
  const text = reportText(entry.value.archive);
  if (!text) return html`<section class="sec">${notice('Für dieses Spiel gibt es keinen Rückblick. Spielverlauf, Teamvergleich und Spielerwerte stehen unter «Statistik».', 'doc')}</section>`;
  return html`<section class="sec after-band" aria-labelledby="g-text"><h2 class="sr" id="g-text">Rückblick</h2>
    <article class="card prose">${text.headline ? html`<h3 class="h3">${text.headline}</h3>` : ''}${text.paragraphs.map(p => html`<p>${p}</p>`)}
    <p class="fine">${text.generator === 'ki' ? 'Von einer KI aus den bestätigten Spieldaten formuliert.' : 'Aus den bestätigten Spieldaten zusammengestellt.'}</p></article></section>`;
}

/** Inhalt des Berichts. part: 'alles' (bisher), 'statistik' (alles ausser dem Text) oder 'rueckblick' (nur der erzeugte Text). */
export function renderBericht({game, data, entry, ui, normalized, voting = '', part = 'alles'}) {
  if (part === 'rueckblick') return rueckblick(entry);
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
    ${text && part === 'alles' ? textSection(text) : ''}
    ${goals.length ? html`<section class="sec" aria-labelledby="g-verlauf">${sectionHead('Spielverlauf', '', '', 'g-verlauf')}
      <div class="card">${verlauf(goals, ownHome, game)}
        <h3 class="h4">Tordifferenz${ruleButton('tordifferenz')}</h3>
        <div class="chart-wrap">${scoreChart(goals, ownHome, inc)}<div class="chart-axis"><span>1′</span><span>Halbzeit</span><span>60′</span></div></div>
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
      ${rows.map(c => cmpRow(c, ownHome))}
    </div></section>` : ''}
    ${report ? html`<section class="sec" aria-labelledby="g-spieler">${sectionHead('Spielerwerte', '', '', 'g-spieler')}
      <div class="seg flush" role="group" aria-label="Mannschaft">${[['own', 'Kadetten'], ['opp', shortTeam(ownHome ? game.away : game.home)]].map(([id, label]) => html`<button type="button" data-ui="${'reportTeam:' + id}" aria-pressed="${String((ui.reportTeam || 'own') === id)}"${(ui.reportTeam || 'own') === id ? html` class="on"` : ''}>${label}</button>`)}</div>
      <div class="card pad-s">${playerTable(report.teams[teamIndex], data, favNumber)}</div>
      <p class="fine pad-top">Tore/W = Tore/Würfe · 2′ = Zeitstrafen ${ruleButton('2min')} · G = Verwarnungen ${ruleButton('gelb')}${report.spectators ? ` · ${report.spectators.toLocaleString('de-CH')} Zuschauer` : ''}${report.referees?.length ? ` · Schiedsrichter: ${report.referees.join(', ')}` : ''} · Quelle: ${report.source === 'EHF' ? 'EHF' : 'Schweizerischer Handball-Verband'}</p>
    </section>` : ''}
    ${report?.shotStats ? shotAnalysis(report.shotStats, report) : ''}
    ${game.league === 'QHL' ? html`<section class="sec"><div class="card list">${listRow({title: 'Tabelle danach', sub: 'QHL', link: href.saison('tabellen'), lead: html`<span class="lead">${icon('saison')}</span>`})}</div></section>` : ''}
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

/** Live-Spiel: «Dein Favorit?». Nur merken, nicht abstimmen: Die Wahl öffnet nach dem Abpfiff (Stufe 1, nur auf diesem Gerät). */
export function pickSection({match, game, data, ui}) {
  if (!game || !isOwn(game.home) && !isOwn(game.away)) return '';
  const report = liveReport(match);
  const own = report?.teams.find(t => isOwn(t.name));
  const players = (own?.players || []).filter(p => p.id != null && p.name);
  const mine = pickFor(game.id);
  const all = ui?.pickAll === '1';
  const shown = all ? [...players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0) || String(a.name).localeCompare(String(b.name), 'de')) : livePicks(players);
  // Ein gemerkter Favorit bleibt sichtbar, auch wenn er (noch) nicht zu den Torschützen gehört.
  if (mine && !shown.some(p => String(p.id) === mine.id)) shown.unshift({id: mine.id, name: mine.name, goals: null});
  const chip = p => {
    const nr = numberFor(data, p.id), on = mine?.id === String(p.id);
    return html`<button type="button" class="chip${on ? ' on' : ''}" data-pick="${p.id}" data-pick-name="${p.name}" aria-pressed="${String(on)}">${nr !== null ? html`<b class="num">${nr}</b>` : ''}${surname(displayName(p.name))}</button>`;
  };
  return html`<section class="sec pick" aria-labelledby="g-pick">${sectionHead('Dein Favorit?', '', '', 'g-pick')}
    <div class="card">
      <p class="fine">Merken statt abstimmen: Die Wahl öffnet nach dem Abpfiff. Dein Favorit bleibt auf diesem Gerät und wird dann vorgewählt.</p>
      ${shown.length || players.length ? html`<div class="chips pick-chips" role="group" aria-label="Favorit für den Spieler des Matchs">${shown.map(chip)}${players.length > shown.length || all ? html`<button type="button" class="chip" data-ui="${'pickAll:' + (all ? '0' : '1')}" aria-pressed="${String(all)}">${all ? 'Weniger' : 'Alle'}</button>` : ''}</div>`
        : html`<p class="note pick-empty" role="status">${icon('team', 18)}<span>Sobald die Quelle Spieler meldet, erscheinen hier Vorschläge.</span></p>`}
      ${mine ? html`<p class="pick-now" role="status">Dein Favorit: <b>${displayName(mine.name)}</b></p>` : ''}
    </div></section>`;
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
      ${rows.map(c => cmpRow(c, ownHome))}
    </div></section>` : ''}
    <section class="sec" aria-labelledby="l-sp">${sectionHead('Spielerwerte live', '', '', 'l-sp')}
      <div class="seg flush" role="group" aria-label="Mannschaft">${[['own', 'Kadetten'], ['opp', shortTeam(ownHome ? match.away : match.home)]].map(([id, label]) => html`<button type="button" data-ui="${'reportTeam:' + id}" aria-pressed="${String((ui.reportTeam || 'own') === id)}"${(ui.reportTeam || 'own') === id ? html` class="on"` : ''}>${label}</button>`)}</div>
      <div class="card pad-s">${playerTable(report.teams[teamIndex], data, favourite())}</div>
      <p class="fine pad-top">${report.stale ? 'Spielerwerte im Moment nicht erreichbar, angezeigt wird der letzte Stand. ' : ''}Werte werden alle 30 Sekunden aktualisiert. Massgebend ist der Spielbericht nach Abpfiff.</p>
    </section>`;
}
