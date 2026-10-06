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
        'Schreibe auf Deutsch mit Schweizer Rechtschreibung (kein «ß»; Anführungszeichen « »). Verwende kurze, grammatikalisch einwandfreie Sätze.',
        'Die gelieferten Fakten sind vollständig: Was dort nicht steht, existiert für diesen Text nicht. Erfinde nichts und ergänze nichts aus Allgemeinwissen.',
        'Nenne keine Personen: keine Trainer, Spieler, Schiedsrichter oder andere Namen, ausser den Namen der beiden Teams aus den Fakten. Verwende keine Spitznamen, Städte- oder Regionsbezeichnungen («Waadtländer», «Ostschweiz») und keine Beschreibungen der Teams, die nicht in den Fakten stehen.',
        'Zähle und ordne nichts ein: keine Aussagen wie «erstes Heimspiel», «erstes Duell», «Saisonstart», «zum ersten Mal» oder «wieder». Erwähne ein Direktduell nur, wenn die Fakten eines mit Datum und Ergebnis nennen; nenne sonst weder ein Duell noch dessen Fehlen.',
        'Mache keine Aussagen über Form, frühere Spiele, Verletzungen, Rekorde, Meisterschaft, Abstieg, Klassenerhalt, Saisonziele, Stimmung, Erwartungen oder Spannung und keine Prognosen. Erwähne nur Rang, Punkte, Spiele, Torverhältnis, Datum, Uhrzeit, Ort, Wettbewerb und, falls vorhanden, das letzte Direktduell mit seinem Ergebnis.',
        'Jede Zahl im Text muss in den Fakten vorkommen und genau so wiedergegeben werden. Bezeichne ein Team nur dann als Tabellenführer, wenn die Fakten es auf dem 1. Rang nennen. Wiederhole keinen Fakt.',
        'Stil: lebendig und gut lesbar wie ein kurzer Zeitungsvorbericht. Beginne mit einem Satz, der Spiel, Ort und Zeit anschaulich nennt. Bette die Zahlen in Sätze ein (zum Beispiel «mit 13 Punkten aus 9 Spielen») statt sie aufzuzählen, und wechsle Satzanfänge und Verben ab. Ohne Übertreibungen, ohne Floskeln, ohne neue Fakten.',
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
  const baseText = baseline.paragraphs.join(' ') + ' ' + baseline.headline;
  problems.push(...riskyClaims(all, baseText));
  return problems;
}

// Aussagen, die in den Fakten nicht vorkommen und bei kleinen Sprachmodellen erfahrungsgemäss erfunden sind.
const RISKY = /trainer|coach|verletz|gesperrt|rekord|abstieg|klassenerhalt|meister|titel|play-?off|derby|rivalit|bilanz|\bserie|ungeschlagen|unbesiegt|kapitän|schlusslicht|tabellenende|tabellenletzt|transfer|vertrag|stürmer|torhüter|torwart|verteidiger|mittelfeld|nationalspieler|saisonziel|aufstieg|champions|favorit|aussenseiter/gi;
const WORDS = text => (String(text).match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).map(w => w.replace(/[.'’-]+$/, ''));
export function riskyClaims(all, baseText) {
  const problems = [];
  const base = baseText.toLowerCase();
  const risky = [...new Set([...all.matchAll(RISKY)].map(m => m[0].toLowerCase()).filter(w => !base.includes(w)))];
  if (risky.length) problems.push('Aussagen, die nicht in den Fakten stehen: ' + risky.join(', '));
  const LEADER = /tabellenführ|spitzenreiter|tabellenspitze|an der spitze/i;
  if (LEADER.test(all)) {
    const leader = baseText.match(/(?:liegt |, )([^,()]+?) auf dem 1\. Rang/)?.[1];
    const key = leader?.trim().split(/\s+/).filter(w => !/^\d+$/.test(w)).at(-1)?.toLowerCase();
    const sentences = all.split(/(?<=[.!?])\s+|\n+/).filter(x => LEADER.test(x));
    if (!key || !sentences.every(x => x.toLowerCase().includes(key))) problems.push('nennt einen Tabellenführer, den die Fakten nicht belegen');
  }
  // Personennamen: mitten im Satz mindestens zwei aufeinanderfolgende grossgeschriebene Wörter, die nicht in den Fakten stehen.
  const known = new Set(WORDS(baseText).map(w => w.toLowerCase()));
  const names = [];
  for (const sentence of all.split(/(?<=[.!?:])\s+|\n+/)) {
    const tokens = WORDS(sentence);
    let run = [];
    const flush = () => { if (run.filter(w => !known.has(w.toLowerCase())).length >= 2) names.push(run.join(' ')); run = []; };
    tokens.forEach((w, i) => { if (i > 0 && /^[A-ZÄÖÜ]/.test(w) && w.length > 1 && !/^\d/.test(w)) run.push(w); else flush(); });
    flush();
  }
  if (names.length) problems.push('mögliche Personen- oder Eigennamen, die nicht in den Fakten stehen: ' + [...new Set(names)].join(', '));
  return problems;
}

// Fertige Vorschau aus der KI-Antwort; Quellen und Spielschlüssel stammen aus dem geprüften Grundtext.
export function toAiPreview(baseline, parsed, now = new Date()) {
  return {...baseline, headline: parsed.headline, paragraphs: parsed.paragraphs, generatedAt: now.toISOString(), generator: 'ki'};
}
