// Match-Vorschauen in GitHub Actions erzeugen und in den KV-Speicher schreiben (docs/vorschauen.md).
// Grundlage ist der sachliche Text aus bestätigten Daten (Weg B, `buildPreview`). Ist eine KI angebunden (`rewrite`), formuliert sie
// ihn lebendiger um und der Text wird unverändert übernommen (auf Wunsch des Eigentümers ohne inhaltliche Prüfung). Nur die technischen
// Regeln des Datendienstes (`validPreview`: Absatzzahl, Länge, keine Sonderzeichen `<` und `>`) müssen erfüllt sein; sonst oder bei Ausfall
// der KI bleibt der sachliche Text (Rückfall).
// Je Verein die nächsten Spiele; vorhandene gültige Vorschauen anderer Herkunft (z. B. früher von ChatGPT) bleiben bis zu ihrem
// Ablauf unberührt. Fehler bei einer Vorschau lassen alle anderen und den Datenstand unberührt.
import {buildPreview} from '../../server/preview-text.mjs';
import {collectFacts} from './preview-facts.mjs';
import {parseAiText, toAiPreview} from '../../server/preview-ai.mjs';
import {validPreview, fixtureKey} from '../../server/previews.mjs';

const HOURS = 3600000;
const upcoming = (g, today) => g && !g.score && !g.live && g.status !== 'FINISHED' && g.date >= today;
export const PER_CLUB = 3;

// Fingerabdruck der Fakten: derselbe KI-Text wird wiederverwendet, solange sich die Fakten nicht ändern (kein Flackern, keine Kosten).
export async function factsHash(baseline) {
  const text = JSON.stringify([baseline.fixtureKey, baseline.paragraphs, baseline.sources]);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
}

// deps.headToHead(home, away) und deps.recentGames(team) -> {games: [...]} | wirft; nur für Kadetten-Spiele der QHL.
// deps.rewrite(baseline) -> {ok, text} | {ok: false, error}; ohne rewrite entstehen nur die sachlichen Texte.
export async function syncPreviews(bucket, {snapshot, fcsgData}, {headToHead = null, recentGames = null, rewrite = null, now = new Date()} = {}) {
  const today = now.toLocaleDateString('en-CA', {timeZone: 'Europe/Zurich'});
  const out = {written: 0, unchanged: 0, kept: 0, skipped: 0, errors: 0, ki: 0, fallback: 0, rejected: []};
  let aiDown = false;
  for (const [club, data] of [['kadetten', snapshot], ['fcsg', fcsgData]]) {
    const games = (data?.games || []).filter(g => upcoming(g, today)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, PER_CLUB);
    for (const g of games) {
      try {
        const path = `previews/${club}/${g.id}.json`;
        const saved = await bucket.get(path);
        const old = saved ? await saved.json() : null;
        const fresh = old && old.fixtureKey === fixtureKey(g) && Date.parse(old.generatedAt) > now.getTime() - 72 * HOURS;
        if (fresh && !old.generator) { out.kept++; continue; }
        const facts = await collectFacts(club, g, {snapshot, fcsgData}, {headToHead, recentGames});
        const baseline = buildPreview({club, game: g, ...facts, now});
        if (!baseline || !validPreview(baseline)) { out.skipped++; continue; }
        const hash = await factsHash(baseline);
        const recent = fresh && Date.parse(old.generatedAt) > now.getTime() - 12 * HOURS;

        // Derselbe KI-Text für dieselben Fakten: nur den Zeitstempel erneuern, damit die Vorschau sichtbar bleibt.
        if (fresh && old.generator === 'ki' && old.baseHash === hash) {
          if (recent) { out.unchanged++; continue; }
          await bucket.put(path, JSON.stringify({...old, generatedAt: now.toISOString()}));
          out.written++;
          continue;
        }

        let preview = {...baseline, baseHash: hash};
        if (rewrite && !aiDown) {
          const res = await rewrite(baseline);
          if (!res.ok) {
            aiDown = true; // Ausfall der KI: in diesem Lauf nicht weiter versuchen
            out.rejected.push({id: g.id, problems: [res.error]});
          } else {
            const parsed = parseAiText(res.text, baseline.headline);
            // Mehr als drei Absätze (der Datendienst erlaubt zwei bis drei): die überzähligen werden dem dritten angehängt.
            if (parsed && parsed.paragraphs.length > 3) parsed.paragraphs = [...parsed.paragraphs.slice(0, 2), parsed.paragraphs.slice(2).join(' ')];
            const candidate = parsed ? {...toAiPreview(baseline, parsed, now), baseHash: hash} : null;
            if (candidate && validPreview(candidate)) { preview = candidate; out.ki++; }
            else out.rejected.push({id: g.id, problems: [parsed ? 'Regeln des Datendienstes nicht erfüllt (Absatzzahl, Länge oder Sonderzeichen)' : 'Antwort nicht in Titel und Absätze zerlegbar']});
          }
        }
        if (rewrite && preview.generator !== 'ki') out.fallback++;

        if (preview.generator !== 'ki' && fresh && old.generator === 'daten' && recent && JSON.stringify(old.paragraphs) === JSON.stringify(preview.paragraphs) && JSON.stringify(old.sources) === JSON.stringify(preview.sources)) {
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
