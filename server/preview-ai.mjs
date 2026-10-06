// KI-Schicht für die Match-Vorschau (Weg B plus KI, docs/vorschauen.md): Der nüchterne Text aus `buildPreview` enthält alle
// bestätigten Fakten. Die KI formuliert ihn lebendiger um, darf aber nichts hinzufügen. Reine Funktionen ohne Netzwerkzugriff;
// der Aufruf des Modells liegt in scripts/lib/workers-ai.mjs.

export function aiMessages(baseline) {
  const facts = baseline.paragraphs.join('\n\n');
  return [
    {
      role: 'system',
      content: [
        'Du schreibst kurze Spielvorschauen für die App eines Handball- und Fussball-Fanclubs in der Schweiz.',
        'Schreibe auf Deutsch mit Schweizer Rechtschreibung (kein «ß»; Anführungszeichen « »).',
        'Verwende ausschliesslich die gelieferten Fakten. Erfinde nichts: keine Spieler, keine Verletzungen, keine Form, keine Prognosen, keine zusätzlichen Zahlen, Daten, Orte oder Wettbewerbe.',
        'Jede Zahl im Text muss in den Fakten vorkommen. Gib Rang, Punkte, Spiele, Torverhältnis, Datum, Uhrzeit, Ort und Ergebnis genau so wieder, wie sie in den Fakten stehen.',
        'Stil: lebendig, gut lesbar, sportjournalistisch, ohne Übertreibungen und ohne Floskeln.',
        'Format: Erste Zeile der Titel (höchstens 80 Zeichen), dann eine Leerzeile, dann 2 bis 3 Absätze mit je 2 bis 4 Sätzen, Absätze durch eine Leerzeile getrennt. Kein Markdown, keine Aufzählungen, keine Anführung des Titels.'
      ].join(' ')
    },
    {role: 'user', content: `Fakten zum Spiel:\n\n${facts}\n\nSchreibe daraus die Vorschau.`}
  ];
}

// Entfernt Denkblöcke, Markdown-Reste und Umrahmungen; zerlegt in Titel und Absätze.
export function parseAiText(raw) {
  let text = String(raw ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').replace(/\r/g, '').trim();
  text = text.replace(/^```[a-z]*\n?|\n?```$/g, '').trim();
  const chunks = text.split(/\n\s*\n/).map(c => c.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  if (chunks.length < 3) return null;
  const [headline, ...paragraphs] = chunks;
  return {headline: headline.replace(/^(Titel|Überschrift)\s*:\s*/i, '').replace(/^[«"]|[»"]$/g, '').trim(), paragraphs};
}

const numbers = text => new Set(String(text).match(/\d+/g) || []);

// Prüfung der KI-Antwort gegen die Fakten. Rückgabe: Liste der Befunde (leer = bestanden).
export function checkAi(parsed, baseline) {
  const problems = [];
  if (!parsed) return ['Antwort nicht in Titel und Absätze zerlegbar'];
  const all = [parsed.headline, ...parsed.paragraphs].join('\n');
  if (parsed.paragraphs.length < 2 || parsed.paragraphs.length > 3) problems.push(`${parsed.paragraphs.length} Absätze statt 2 bis 3`);
  if (parsed.headline.length > 160) problems.push('Titel zu lang');
  if (/ß/.test(all)) problems.push('enthält «ß»');
  if (/[<>]|\*\*|^\s*[-*•]\s/m.test(all)) problems.push('enthält Markup oder Aufzählung');
  const known = numbers(baseline.paragraphs.join(' ') + ' ' + baseline.headline);
  const invented = [...numbers(all)].filter(n => !known.has(n) && !known.has(String(Number(n))));
  if (invented.length) problems.push('Zahlen, die nicht in den Fakten stehen: ' + invented.join(', '));
  // Beide Teamnamen müssen vorkommen (Kurzform genügt: letztes Wort des Namens).
  for (const team of baseline.headline.split(' gegen ')) {
    const key = team.trim().split(/\s+/).filter(w => !/^\d+$/.test(w)).at(-1)?.toLowerCase();
    if (key && !all.toLowerCase().includes(key)) problems.push('Team fehlt: ' + team.trim());
  }
  return problems;
}

// Fertige Vorschau aus der KI-Antwort; Quellen und Spielschlüssel stammen aus dem geprüften Grundtext.
export function toAiPreview(baseline, parsed, now = new Date()) {
  return {...baseline, headline: parsed.headline, paragraphs: parsed.paragraphs, generatedAt: now.toISOString(), generator: 'ki'};
}
