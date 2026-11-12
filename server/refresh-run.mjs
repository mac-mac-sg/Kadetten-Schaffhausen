import {storeOtmarUpdate} from './otmar.mjs';
import otmarSeed from './otmar-seed.json' with {type:'json'};
import {refresh,mergeConfirmedResults} from './update.mjs';
import {archiveCompletedReports, getArchivedReport} from './live.mjs';
import {aggregatePlayerSeason} from './shv.mjs';
import {storeFcsgUpdate} from './fcsg.mjs';
import fcsgSeed from './fcsg-seed.json' with {type: 'json'};

// Eine Aktualisierung des Datenstands. Wird vom Worker (POST /api/refresh) und vom Actions-Lauf (scripts/cloudflare-update.mjs)
// gemeinsam verwendet. `bucket` hat `get(key)` und `put(key, value)`.
// previous: bisheriger Datenstand; hadPrevious: ob er im Speicher lag (dann wird er als previous.json gesichert);
// supplied: von aussen gelieferte Quelldaten ({} = die Quellen selbst abrufen); write: false = nur rechnen, nichts schreiben.
/** Spielerwerte der QHL aus den archivierten Spielberichten aller abgeschlossenen QHL-Spiele. Fehlt ein Bericht oder stimmt
 * die Summe nicht, bleibt der bisherige Stand (aus der SHV-Spielerliste oder dem letzten Lauf) und der Fehler steht im Status. */
export async function seasonFromReports(bucket, next) {
  try {
    const games = next.games.filter(g => g.league === 'QHL' && Array.isArray(g.score));
    const reports = [];
    for (let i = 0; i < games.length; i += 3)
      reports.push(...(await Promise.all(games.slice(i, i + 3).map(async g => (await getArchivedReport(g.id, bucket)).report))));
    next.playerSeason = aggregatePlayerSeason(reports, games.length);
    next.status.players = {ok: true, updatedAt: next.checkedAt};
  } catch (e) {
    // Hat die SHV-Spielerliste alle Prüfungen bestanden, bleibt ihr Stand gültig; sonst gilt der Fehler der Berichte.
    if (next.status.players?.ok !== true) next.status.players = {...next.status.players, ok: false, error: String(e.message).slice(0, 160)};
  }
  return next;
}

export async function runRefresh(bucket, {previous, hadPrevious, supplied = {}, write = true}) {
  const saveArticle = write
    ? article => bucket.put('kadetten/articles/' + article.id + '/' + article.version + '.json', JSON.stringify(article))
    : async () => {};
  const next = await refresh(previous, supplied, saveArticle);
  if (!Object.values(next.status).some(x => x.ok)) return {ok: false, next};
  if (!write) return {ok: true, next: await seasonFromReports(bucket, next), written: false};
  if (hadPrevious) await bucket.put('kadetten/previous.json', JSON.stringify(previous));
  await bucket.put('kadetten/current.json', JSON.stringify(next));
  const reports = await archiveCompletedReports(bucket);
  next.games = mergeConfirmedResults(next.games,reports.finished);
  await seasonFromReports(bucket, next);
  await bucket.put('kadetten/current.json', JSON.stringify(next));
  const fcsg = await storeFcsgUpdate(bucket, fcsgSeed);
  const otmarReports = await archiveCompletedReports(bucket,'otmar');
  const otmar = await storeOtmarUpdate(bucket,otmarSeed,next);
  return {ok: true, next, reports, fcsg, otmar, otmarReports, written: true};
}
