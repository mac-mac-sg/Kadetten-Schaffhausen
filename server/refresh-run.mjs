import {refresh} from './update.mjs';
import {archiveCompletedReports} from './live.mjs';
import {storeFcsgUpdate} from './fcsg.mjs';
import fcsgSeed from './fcsg-seed.json' with {type: 'json'};

// Eine Aktualisierung des Datenstands. Wird vom Worker (POST /api/refresh) und vom Actions-Lauf (scripts/cloudflare-update.mjs)
// gemeinsam verwendet. `bucket` hat `get(key)` und `put(key, value)`.
// previous: bisheriger Datenstand; hadPrevious: ob er im Speicher lag (dann wird er als previous.json gesichert);
// supplied: von aussen gelieferte Quelldaten ({} = die Quellen selbst abrufen); write: false = nur rechnen, nichts schreiben.
export async function runRefresh(bucket, {previous, hadPrevious, supplied = {}, write = true}) {
  const saveArticle = write
    ? article => bucket.put('kadetten/articles/' + article.id + '/' + article.version + '.json', JSON.stringify(article))
    : async () => {};
  const next = await refresh(previous, supplied, saveArticle);
  if (!Object.values(next.status).some(x => x.ok)) return {ok: false, next};
  if (!write) return {ok: true, next, written: false};
  if (hadPrevious) await bucket.put('kadetten/previous.json', JSON.stringify(previous));
  await bucket.put('kadetten/current.json', JSON.stringify(next));
  const reports = await archiveCompletedReports(bucket);
  const fcsg = await storeFcsgUpdate(bucket, fcsgSeed);
  return {ok: true, next, reports, fcsg, written: true};
}
