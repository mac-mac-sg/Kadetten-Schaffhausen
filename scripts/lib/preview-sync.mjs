// Match-Vorschauen in GitHub Actions erzeugen und in den KV-Speicher schreiben (docs/vorschauen.md).
// Grundlage ist der sachliche Text aus bestätigten Daten (`buildPreview`); er muss die technischen Regeln des Datendienstes erfüllen
// (`validPreview`: Absatzzahl, Länge, keine Sonderzeichen `<` und `>`).
// Je Verein die nächsten Spiele; vorhandene gültige Vorschauen anderer Herkunft (z. B. früher von ChatGPT) bleiben bis zu ihrem
// Ablauf unberührt. Fehler bei einer Vorschau lassen alle anderen und den Datenstand unberührt.
import {buildPreview} from '../../server/preview-text.mjs';
import {collectFacts} from './preview-facts.mjs';
import {validPreview, fixtureKey} from '../../server/previews.mjs';

const HOURS = 3600000;
const upcoming = (g, today) => g && !g.score && !g.live && g.status !== 'FINISHED' && g.date >= today;
export const PER_CLUB = 3;

// deps.headToHead(home, away) und deps.recentGames(team) -> {games: [...]} | wirft; nur für Kadetten-Spiele der QHL.
export async function syncPreviews(
  bucket,
  {snapshot, fcsgData, otmarData},
  {headToHead = null, recentGames = null, now = new Date()} = {}
) {
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
  const out = {written: 0, unchanged: 0, kept: 0, skipped: 0, errors: 0};
  for (const [club, data] of [
    ['kadetten', snapshot],
    ['fcsg', fcsgData],
    ['otmar', otmarData]
  ]) {
    const games = (data?.games || [])
      .filter(g => upcoming(g, today))
      .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
      .slice(0, PER_CLUB);
    for (const g of games) {
      try {
        const path = `previews/${club}/${g.id}.json`;
        const saved = await bucket.get(path);
        const old = saved ? await saved.json() : null;
        const fresh = old && old.fixtureKey === fixtureKey(g) && Date.parse(old.generatedAt) > now.getTime() - 72 * HOURS;
        if (fresh && !old.generator) {
          out.kept++;
          continue;
        }
        const facts = await collectFacts(club, g, {snapshot, fcsgData, otmarData}, {headToHead, recentGames});
        const baseline = buildPreview({club, game: g, ...facts, now});
        if (!baseline || !validPreview(baseline)) {
          out.skipped++;
          continue;
        }
        const recent = fresh && Date.parse(old.generatedAt) > now.getTime() - 12 * HOURS;
        const {facts: _facts, ...preview} = baseline;
        if (
          fresh &&
          old.generator === 'daten' &&
          recent &&
          JSON.stringify(old.paragraphs) === JSON.stringify(preview.paragraphs) &&
          JSON.stringify(old.sources) === JSON.stringify(preview.sources)
        ) {
          out.unchanged++;
          continue;
        }
        await bucket.put(path, JSON.stringify(preview));
        out.written++;
      } catch {
        out.errors++;
      }
    }
  }
  return out;
}
