// Endstand der European-League-Spiele sichern und den KI-Matchbericht erzeugen (läuft in GitHub Actions, nach dem Schlusspfiff).
// Quellen: Livescore-Feed (Spiel-ID, Endstand), Team- und Spielerwerte der EHF-Spielseite und die Ereignisse des Livetickers
// (ticker.ehf.eu/v3, zu gross für den Worker). Ergebnis: kadetten/ehf/<Spiel-ID>.json im KV-Speicher, von /api/ehf-reports/<Spiel-ID> geliefert.
// Ein Fehler lässt bestehende Einträge unberührt; ein Eintrag ohne Bericht wird im nächsten Lauf ergänzt.
import {ehfLiveEndpoint, getEhfDetails, parseEhfFinishedMatch} from '../../server/live.mjs';
import {parseTicker, withSevenMeters, matchFacts, factLines, plainReport, goalFeed} from '../../server/ehf-ticker.mjs';
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

// games: Spiele des Datenstands; write(model) -> {ok, text} | {ok: false, error} oder null (ohne KI).
export async function syncEhfArchive(bucket, {games, fetchFn = fetch, write = null, now = new Date()}) {
  const out = {checked: 0, written: 0, kept: 0, reports: 0, ki: 0, notes: []};
  const today = swissDate(now), yesterday = swissDate(new Date(now.getTime() - 86400000));
  const candidates = (games || []).filter(g => g.league === 'EHL' && [today, yesterday].includes(g.date) && /Kadetten/.test(g.home + ' ' + g.away));
  if (!candidates.length) return out;
  let feed = null;
  for (const g of candidates) {
    out.checked++;
    try {
      const saved = await bucket.get(archiveKey(g.id));
      const old = saved ? await saved.json() : null;
      // Ein sachlicher Rückfall wird bei laufender KI bis zu dreimal durch einen KI-Text ersetzt; sonst gilt der Eintrag als fertig.
      if (old?.report && (old.report.generator === 'ki' || !write || !old.ticker || (old.report.attempts || 1) >= 3)) { out.kept++; continue; }
      if (!feed) {
        const r = await fetchFn(ehfLiveEndpoint, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(20000)});
        if (!r.ok) throw Error('Feed HTTP ' + r.status);
        feed = await r.json();
      }
      const match = parseEhfFinishedMatch(feed, g.date);
      if (!match) { out.notes.push(`${g.id}: im Feed nicht als beendet gemeldet`); continue; }
      const record = old?.ticker ? old : await buildRecord(g, match, fetchFn);
      const result = await addReport(record, write);
      if (result.report) { out.reports++; if (result.report.generator === 'ki') out.ki++; }
      await bucket.put(archiveKey(g.id), JSON.stringify(record));
      out.written++;
      out.notes.push(`${g.id}: ${record.report ? 'Bericht (' + record.report.generator + ')' : 'ohne Bericht: ' + (result.reason || '')}`);
    } catch (e) {
      out.notes.push(`${g.id}: Fehler (${String(e?.message || e).slice(0, 100)})`);
    }
  }
  return out;
}

async function buildRecord(g, match, fetchFn) {
  const details = await getEhfDetails(match.id, fetchFn);
  if (!details.ok) throw Error('Spielerwerte und Teamwerte nicht verfügbar');
  let ticker = null, tickerError = null;
  try { ticker = await fetchTicker(match.id, fetchFn, {pause: fetchFn === fetch ? 3000 : 0}); } catch (e) { tickerError = String(e?.message || e).slice(0, 160); }
  // Die Ereignisse gelten nur, wenn sie zum Endstand des Feeds passen (sonst ist die Torfolge unvollständig).
  if (ticker && (!ticker.final || ticker.final[0] !== match.score[0] || ticker.final[1] !== match.score[1] || ticker.goals.length !== match.score[0] + match.score[1])) {
    tickerError = 'Ereignisse passen nicht zum Endstand'; ticker = null;
  }
  return {
    v: 1,
    fixtureId: g.id,
    matchId: match.id,
    home: match.home,
    away: match.away,
    date: g.date,
    score: match.score,
    half: ticker?.halftime ?? null,
    checkedAt: new Date().toISOString(),
    teamStats: details.teamStats,
    players: ticker ? withSevenMeters(details.players, ticker) : details.players,
    goals: ticker ? goalFeed(ticker) : null,
    tickerError,
    ticker: ticker && {timeouts: ticker.timeouts, suspensions: ticker.suspensions, goals: ticker.goals, final: ticker.final, halftime: ticker.halftime, sevenMeters: ticker.sevenMeters},
    source: {label: 'EHF Live-Ticker und Spielstatistik', url: match.url}
  };
}

// Ergänzt `record.report` (KI oder sachlicher Rückfall) aus den Ereignissen; ohne Ereignisse gibt es keinen Bericht.
async function addReport(record, write) {
  if (!record.ticker) return {reason: record.tickerError || 'keine Ereignisse'};
  const facts = matchFacts({home: record.home, away: record.away, ticker: record.ticker, players: record.players, teamStats: record.teamStats});
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
