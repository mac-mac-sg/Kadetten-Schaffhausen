// Endstand der European-League-Spiele sichern und den KI-Matchbericht erzeugen (läuft in GitHub Actions, nach dem Schlusspfiff).
// Quellen: Livescore-Feed (Spiel-ID, Endstand), Team- und Spielerwerte der EHF-Spielseite und die Ereignisse des Livetickers
// (ticker.ehf.eu/v3, zu gross für den Worker). Ergebnis: kadetten/ehf/<Spiel-ID>.json im KV-Speicher, von /api/ehf-reports/<Spiel-ID> geliefert.
// Ein Fehler lässt bestehende Einträge unberührt; ein Eintrag ohne Bericht wird im nächsten Lauf ergänzt.
import {ehfLiveEndpoint, getEhfDetails, parseEhfFinishedMatch, reportId} from '../../server/live.mjs';
import {qhlInputs} from '../../server/qhl-report.mjs';
import {parseTicker, withSevenMeters, matchFacts, factLines, plainReport, goalFeed, clockText} from '../../server/ehf-ticker.mjs';
import {reportMessages, toReport} from '../../server/report-ai.mjs';

const TICKER_URL = 'https://ticker.ehf.eu/v3/TickerData';
const UA = 'Mozilla/5.0 (compatible; kadetten-app-matchbericht)';
export const archiveKey = id => 'kadetten/ehf/' + id + '.json';
const swissDate = d => d.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});

// Der Ticker liefert rund 450 KB; Verbindungsabbrüche kommen vor. Bis zu drei Versuche, die Fehlermeldung nennt die Ursache.
const describe = e => [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(': ').slice(0, 140);
async function fetchTicker(matchId, fetchFn, {retries = 3, pause = 3000} = {}) {
  let last;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetchFn(TICKER_URL, {
        method: 'POST',
        headers: {'User-Agent': UA, Accept: 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', Origin: 'https://ticker.ehf.eu', Referer: 'https://ticker.ehf.eu/v3/' + matchId},
        body: new URLSearchParams({MatchID: matchId}),
        signal: AbortSignal.timeout(45000)
      });
      if (!r.ok) throw Error('Ticker HTTP ' + r.status);
      return parseTicker(await r.json());
    } catch (e) {
      last = Error(`Versuch ${attempt}: ${describe(e)}`);
      if (attempt < retries && pause) await new Promise(res => setTimeout(res, pause));
    }
  }
  throw last;
}

// Spiele, die der Livescore-Feed der EHF nicht mehr führt (er zeigt nur den Spieltag): Spiel-ID der EHF-Spielseite.
export const KNOWN_MATCHES = {
  bukarest: {matchId: '202711020901026', url: 'https://ehfel.eurohandball.com/men/2026-27/matches/details/202711020901026/KadettenSchaffhausen-CSMBucuresti/'}
};
export const RECORD_VERSION = 2;

// games: Spiele des Datenstands; write(messages) -> {ok, text} | {ok: false, error} oder null (ohne KI).
// Betrachtet werden die Kadetten-Spiele der European League, die am Spieltag oder Folgetag laufen (Feed) oder schon ein Resultat haben
// (gesicherte Einträge ergänzen, bekannte ältere Spiele nachladen). Vorhandene Berichte bleiben unverändert.
export async function syncEhfArchive(bucket, {games, fetchFn = fetch, write = null, now = new Date()}) {
  const out = {checked: 0, written: 0, kept: 0, reports: 0, ki: 0, notes: []};
  const today = swissDate(now), yesterday = swissDate(new Date(now.getTime() - 86400000));
  const inWindow = g => [today, yesterday].includes(g.date);
  const candidates = (games || []).filter(g => g.league === 'EHL' && /Kadetten/.test(g.home + ' ' + g.away) && (inWindow(g) || Array.isArray(g.score)));
  if (!candidates.length) return out;
  let feed = null;
  for (const g of candidates) {
    out.checked++;
    try {
      const saved = await bucket.get(archiveKey(g.id));
      const old = saved ? await saved.json() : null;
      // Ein sachlicher Rückfall wird bei laufender KI bis zu dreimal durch einen KI-Text ersetzt; sonst gilt der Eintrag als fertig.
      const final = old?.report && (old.report.generator === 'ki' || !write || !old.ticker || (old.report.attempts || 1) >= 3);
      if (old && old.v >= RECORD_VERSION && final) { out.kept++; continue; }
      // Woher kommt die Spiel-ID? Aus dem gesicherten Eintrag, aus der Liste bekannter Spiele oder (Spieltag) aus dem Feed.
      let match = null;
      if (old?.matchId) match = {id: old.matchId, home: old.home, away: old.away, score: old.score, url: old.source?.url || null};
      else if (KNOWN_MATCHES[g.id] && Array.isArray(g.score)) match = {id: KNOWN_MATCHES[g.id].matchId, home: g.home, away: g.away, score: g.score, url: KNOWN_MATCHES[g.id].url};
      else if (inWindow(g)) {
        if (!feed) {
          const r = await fetchFn(ehfLiveEndpoint, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(20000)});
          if (!r.ok) throw Error('Feed HTTP ' + r.status);
          feed = await r.json();
        }
        match = parseEhfFinishedMatch(feed, g.date);
        if (!match) { out.notes.push(`${g.id}: im Feed nicht als beendet gemeldet`); continue; }
      } else { out.notes.push(`${g.id}: kein Eintrag, nicht mehr im Feed und nicht in der Liste bekannter Spiele`); continue; }
      const record = old?.v >= RECORD_VERSION && old?.ticker ? old : await buildRecord(g, match, fetchFn, old);
      let result = {};
      if (!record.report || (record.report.generator !== 'ki' && write && record.ticker && (record.report.attempts || 1) < 3)) result = await addReport(record, write);
      if (record.report?.generator === 'ki') delete record.ticker;
      if (result.report) { out.reports++; if (result.report.generator === 'ki') out.ki++; }
      await bucket.put(archiveKey(g.id), JSON.stringify(record));
      out.written++;
      out.notes.push(`${g.id}: ${record.report ? 'Bericht (' + record.report.generator + ')' + (old && old.v < RECORD_VERSION ? ', Eintrag ergänzt' : '') : 'ohne Bericht: ' + (result.reason || '')}`);
    } catch (e) {
      out.notes.push(`${g.id}: Fehler (${String(e?.message || e).slice(0, 100)})`);
    }
  }
  return out;
}

// match: {id, home, away, score, url}. old: früherer Eintrag (Bericht und Fakten bleiben erhalten, der Rest wird neu geholt).
async function buildRecord(g, match, fetchFn, old = null) {
  const details = await getEhfDetails(match.id, fetchFn);
  if (!details.ok || !details.players || !details.teamStats) throw Error('Spielerwerte und Teamwerte nicht verfügbar');
  if (details.teamStats.home.goals !== match.score[0] || details.teamStats.guest.goals !== match.score[1]) throw Error('Teamwerte passen nicht zum Endstand');
  let ticker = null, tickerError = null;
  try { ticker = await fetchTicker(match.id, fetchFn, {pause: fetchFn === fetch ? 3000 : 0}); } catch (e) { tickerError = String(e?.message || e).slice(0, 160); }
  // Die Ereignisse gelten nur, wenn sie zum Endstand passen (sonst ist die Torfolge unvollständig).
  if (ticker && (!ticker.final || ticker.final[0] !== match.score[0] || ticker.final[1] !== match.score[1] || ticker.goals.length !== match.score[0] + match.score[1])) {
    tickerError = 'Ereignisse passen nicht zum Endstand'; ticker = null;
  }
  const record = {
    v: RECORD_VERSION,
    fixtureId: g.id,
    matchId: match.id,
    home: match.home,
    away: match.away,
    date: g.date,
    score: match.score,
    half: ticker?.halftime ?? null,
    checkedAt: new Date().toISOString(),
    spectators: details.spectators ?? null,
    teamStats: details.teamStats,
    players: ticker ? withSevenMeters(details.players, ticker) : details.players,
    goals: ticker ? goalFeed(ticker) : null,
    timeouts: ticker ? ticker.timeouts.filter(t => t.side).map(t => ({side: t.side, sec: t.sec})) : null,
    suspensions: ticker ? ticker.suspensions.filter(s => s.side).map(s => ({side: s.side, sec: s.sec, name: s.name})) : null,
    tickerError,
    ticker: ticker && {timeouts: ticker.timeouts, suspensions: ticker.suspensions, goals: ticker.goals, final: ticker.final, halftime: ticker.halftime, sevenMeters: ticker.sevenMeters},
    source: {label: 'EHF Live-Ticker und Spielstatistik', url: match.url}
  };
  if (old?.report) { record.report = old.report; if (old.facts) record.facts = old.facts; }
  return record;
}

// Ergänzt `record.report` (KI oder sachlicher Rückfall) aus den Ereignissen; ohne Ereignisse gibt es keinen Bericht.
async function addReport(record, write, league = 'European League') {
  if (!record.ticker) return {reason: record.tickerError || 'keine Ereignisse'};
  const facts = matchFacts({home: record.home, away: record.away, ticker: record.ticker, players: record.players, teamStats: record.teamStats, league});
  const base = {...plainReport(facts), facts: factLines(facts)};
  let report = {headline: base.headline, paragraphs: base.paragraphs, generator: 'daten'};
  let note = null;
  if (write) {
    const res = await write(reportMessages(base));
    if (res.ok) {
      const parsed = toReport(res.text, base.headline);
      if (parsed) report = {...parsed, generator: 'ki'};
      else note = 'KI-Antwort nicht verwendbar';
    } else note = res.error;
  }
  const attempts = (record.report?.attempts || 0) + 1;
  record.report = {...report, generatedAt: new Date().toISOString(), attempts};
  record.facts = base.facts;
  // Die Rohereignisse bleiben nur, solange noch ein KI-Versuch möglich ist; die Torfolge steht in `goals`.
  if (report.generator === 'ki' || !write || attempts >= 3) delete record.ticker;
  return {report: record.report, reason: note};
}

// --- QHL: KI-Matchbericht zu abgeschlossenen Spielen aus dem gesicherten SHV-Spielbericht ---------------------------------------
// Alle abgeschlossenen QHL-Spiele der Kadetten ohne Bericht (neueste zuerst, höchstens `limit` KI-Aufrufe je Lauf). Eingabe ist der
// Spielbericht unter kadetten/reports/<SHV-ID>.json (archiveCompletedReports); Ergebnis unter kadetten/matchreports/<Spiel-ID>.json.
export const qhlKey = id => 'kadetten/matchreports/' + id + '.json';
export async function syncQhlReports(bucket, {games, write = null, limit = 3}) {
  const out = {checked: 0, written: 0, kept: 0, reports: 0, ki: 0, notes: []};
  const done = (games || []).filter(g => g.league === 'QHL' && Array.isArray(g.score) && /Kadetten/.test(g.home + ' ' + g.away) && /^[a-zA-Z0-9_-]{1,80}$/.test(String(g.id))).sort((a, b) => b.date.localeCompare(a.date));
  let used = 0;
  for (const g of done) {
    out.checked++;
    try {
      const saved = await bucket.get(qhlKey(g.id));
      const old = saved ? await saved.json() : null;
      if (old?.report && (old.report.generator === 'ki' || !write || !old.ticker || (old.report.attempts || 1) >= 3)) { out.kept++; continue; }
      if (used >= limit) continue;
      let record = old?.ticker ? old : null;
      if (!record) {
        const gameId = reportId(g.id);
        const stored = gameId ? await bucket.get('kadetten/reports/' + gameId + '.json') : null;
        if (!stored) { out.notes.push(`${g.id}: kein gesicherter Spielbericht`); continue; }
        const report = await stored.json();
        if (!Array.isArray(report.score) || report.score.some((v, i) => v !== g.score[i])) { out.notes.push(`${g.id}: Spielbericht passt nicht zum Endstand`); continue; }
        let inputs;
        try { inputs = qhlInputs(report); } catch (e) { out.notes.push(`${g.id}: ohne Bericht (${String(e.message).slice(0, 80)})`); continue; }
        record = {v: 1, fixtureId: String(g.id), gameId, home: inputs.home, away: inputs.away, date: g.date, score: report.score, half: inputs.ticker.halftime, checkedAt: new Date().toISOString(), players: inputs.players, teamStats: inputs.teamStats, goals: inputs.ticker.goals.map(x => ({t: clockText(x.sec), s: x.score, h: x.side === 'home', n: x.name, p: false})), ticker: inputs.ticker, source: {label: 'SHV Spielbericht', url: report.source || null}};
      }
      if (write) used++;
      const result = await addReport(record, write, 'Quickline Handball League (QHL)');
      if (!record.ticker) { delete record.players; delete record.teamStats; }
      if (result.report) { out.reports++; if (result.report.generator === 'ki') out.ki++; }
      await bucket.put(qhlKey(g.id), JSON.stringify(record));
      out.written++;
      out.notes.push(`${g.id}: Bericht (${record.report?.generator || 'keiner'})${result.reason ? ', ' + String(result.reason).slice(0, 80) : ''}`);
    } catch (e) {
      out.notes.push(`${g.id}: Fehler (${String(e?.message || e).slice(0, 100)})`);
    }
  }
  return out;
}
