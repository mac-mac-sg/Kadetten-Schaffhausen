// Match-Vorschauen ohne KI in GitHub Actions erzeugen und in den KV-Speicher schreiben (Weg B, docs/vorschauen.md).
// Je Verein die nächsten Spiele; vorhandene gültige Vorschauen anderer Herkunft (z. B. früher von ChatGPT) bleiben bis zu ihrem
// Ablauf unberührt. Fehler bei einer Vorschau lassen alle anderen und den Datenstand unberührt.
import {buildPreview, tableFor} from '../../server/preview-text.mjs';
import {validPreview, fixtureKey} from '../../server/previews.mjs';

const HOURS = 3600000;
const upcoming = (g, today) => g && !g.score && !g.live && g.status !== 'FINISHED' && g.date >= today;
export const PER_CLUB = 3;

// deps.headToHead(home, away) -> {games: [...]} | wirft; wird nur für Kadetten-Spiele der QHL verwendet.
export async function syncPreviews(bucket, {snapshot, fcsgData}, {headToHead = null, now = new Date()} = {}) {
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
  const out = {written: 0, unchanged: 0, kept: 0, skipped: 0, errors: 0};
  for (const [club, data] of [['kadetten', snapshot], ['fcsg', fcsgData]]) {
    const games = (data?.games || []).filter(g => upcoming(g, today)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, PER_CLUB);
    for (const g of games) {
      try {
        const path = `previews/${club}/${g.id}.json`;
        const saved = await bucket.get(path);
        const old = saved ? await saved.json() : null;
        const fresh = old && old.fixtureKey === fixtureKey(g) && Date.parse(old.generatedAt) > now.getTime() - 72 * HOURS;
        if (fresh && old.generator !== 'daten') { out.kept++; continue; }
        let duel = null;
        if (club === 'kadetten' && g.league === 'QHL' && headToHead) {
          try { duel = (await headToHead(g.home, g.away)).games?.[0] || null; } catch {}
        }
        const p = buildPreview({club, game: g, table: tableFor(club, g, snapshot, fcsgData), duel, now});
        if (!p || !validPreview(p)) { out.skipped++; continue; }
        const same = fresh && JSON.stringify(old.paragraphs) === JSON.stringify(p.paragraphs) && JSON.stringify(old.sources) === JSON.stringify(p.sources) && Date.parse(old.generatedAt) > now.getTime() - 12 * HOURS;
        if (same) { out.unchanged++; continue; }
        await bucket.put(path, JSON.stringify(p));
        out.written++;
      } catch {
        out.errors++;
      }
    }
  }
  return out;
}
