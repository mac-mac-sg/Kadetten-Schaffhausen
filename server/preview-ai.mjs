// KI-Schicht für die Match-Vorschau (Weg B plus KI, docs/vorschauen.md): Der nüchterne Text aus `buildPreview` enthält alle
// bestätigten Fakten. Die KI formuliert ihn lebendiger um, darf aber nichts hinzufügen. Reine Funktionen ohne Netzwerkzugriff;
// der Aufruf des Modells liegt in scripts/lib/workers-ai.mjs.

export function aiMessages(baseline) {
  const facts = baseline.facts?.length ? baseline.facts.map(x => '- ' + x).join('\n') : baseline.paragraphs.join('\n\n');
  return [
    {
      role: 'system',
      content: [
        'Du schreibst kurze Spielvorschauen für die App eines Handball- und Fussball-Fanclubs in der Schweiz.',
        'Schreibe auf Deutsch mit Schweizer Rechtschreibung (kein «ß»; Anführungszeichen « »). Verwende grammatikalisch einwandfreie Sätze mit echten Umlauten (ä, ö, ü, nie «ae», «oe», «ue») und korrekten Artikeln; Namen von Wettbewerben und Stadien gibst du genau so wieder, wie sie in den Fakten stehen. Den Wettbewerb nennst du immer mit der Wendung «im Wettbewerb X» (zum Beispiel «im Wettbewerb Brack Super League», «im Wettbewerb QHL»), nie mit einem Artikel vor dem Namen.',
        'Die gelieferten Fakten sind vollständig: Was dort nicht steht, existiert für diesen Text nicht. Erfinde nichts und ergänze nichts aus Allgemeinwissen.',
        'Nenne keine Personen: keine Trainer, Spieler, Schiedsrichter oder andere Namen, ausser den Namen der beiden Teams aus den Fakten. Verwende keine Spitznamen, Städte- oder Regionsbezeichnungen («Waadtländer», «Ostschweiz») und keine Beschreibungen der Teams, die nicht in den Fakten stehen.',
        'Zähle und ordne nichts ein: keine Aussagen wie «erstes Heimspiel», «erstes Duell», «Saisonstart», «zum ersten Mal» oder «wieder», und zähle keine Serien oder Läufe: nicht «drei Siege hintereinander», «dritter Sieg in Folge», «ungeschlagen seit» und keine Begriffe wie «Aufschwung», «Auftrieb», «Lauf», «Formkurve», «Krise» oder «Siegesserie». Nenne die letzten Resultate einzeln, wie sie in den Fakten stehen. Erwähne ein Direktduell nur, wenn die Fakten eines mit Datum und Ergebnis nennen; nenne sonst weder ein Duell noch dessen Fehlen.',
        'Über frühere Spiele sprichst du nur, soweit die Fakten sie als letzte Resultate oder Direktduelle nennen; gib sie mit Datum, Paarung und Ergebnis genau so wieder und sage höchstens, wer gewonnen oder verloren hat. Mache keine Aussagen über Spielweise, Stärken, Schwächen, Tabellenregionen («Mittelfeld», «Abstiegszone»), Verletzungen, Rekorde, Meisterschaft, Abstieg, Klassenerhalt oder Saisonziele und keine Prognose zum Ausgang oder zur Ausgeglichenheit des Spiels.',
        'Du darfst das Spiel mit ein bis zwei allgemeinen, wertenden Wörtern einrahmen (zum Beispiel «mit Spannung erwartet», «interessante Ausgangslage»), solange sie keine neue Tatsache, keine Zahl und keine Prognose enthalten. Verboten sind Prognosen und Spannungsversprechen («verspricht Spannung», «wird ein enges Spiel»), Wendungen wie «unter Druck setzen», «hinnehmen müssen», «klare Siege», «souverän» oder «überzeugend» und jede andere Beschreibung, wie ein Resultat zustande kam. Wertungen müssen sich unmittelbar aus den genannten Fakten ergeben (zum Beispiel Rang oder Resultat) und dürfen nicht über Form, Leistung oder Entwicklung eines Teams urteilen.',
        'Die Fakten stehen als Liste und sind eindeutig: «erzielt» sind die eigenen Tore, «kassiert» die Gegentore. Eine negative Tordifferenz heisst weniger Tore erzielt als kassiert, eine positive mehr. Wer gewonnen oder verloren hat, steht bei den Resultaten (Sieg, Niederlage, Unentschieden); leite es nicht selbst her.',
        'Nenne Daten nur als Datum («am 3. Oktober»), nie relativ («vor einer Woche», «letzten Sonntag», «gestern»). Beschränke dich auf die genannten Spiele: nichts über weitere Spiele, auch nicht der Gegner, und nichts über den Saisonverlauf («Saisonstart», «ihre Saison»). Verwende die Teamnamen vollständig, wie sie in den Fakten stehen.',
        'Jede Zahl im Text muss in den Fakten vorkommen und genau so wiedergegeben werden. Bezeichne ein Team nur dann als Tabellenführer, wenn die Fakten es auf dem 1. Rang nennen. Wiederhole keinen Fakt.',
        'Stil: lebendig, warm und gut lesbar wie ein kurzer Vorbericht für Fans. Etwas Wärme ist erwünscht: sprich die Leserinnen und Leser ein Mal direkt oder mit «wir» an, drücke Vorfreude auf das Spiel aus, und schliesse den letzten Absatz mit einem kurzen, freundlichen Satz ab, der zum Besuch oder Mitfiebern einlädt, ohne etwas über Ausgang, Form oder Stärke zu behaupten. Formuliere diesen Schluss jedes Mal neu und verwende nicht die Wendungen «Wir freuen uns» und «herzlich ein»; wer im Stadion ist, ist auf der Tribüne oder in der Halle, nicht «auf dem Platz». Beginne mit einem Satz, der Spiel, Ort und Zeit anschaulich nennt. Bette die Zahlen in Sätze ein (zum Beispiel «mit 13 Punkten aus 9 Spielen») statt sie aufzuzählen, und wechsle Satzanfänge und Verben ab. Ohne Übertreibungen, ohne leere Floskeln, ohne neue Fakten; Wärme entsteht durch Ton und Satzbau, nicht durch zusätzliche Aussagen.',
        'Format, immer einhalten: Erste Zeile ein kurzer Titel (höchstens 80 Zeichen, kein ganzer Satz mit Punkt), dann eine Leerzeile, dann 2 bis 3 Absätze mit je 2 bis 4 Sätzen, Absätze durch eine Leerzeile getrennt. Kein Markdown, keine Aufzählungen, keine Anführung des Titels.'
      ].join(' ')
    },
    {role: 'user', content: `Fakten zum Spiel:\n\n${facts}\n\nSchreibe daraus die Vorschau: Titelzeile, Leerzeile, dann 2 bis 3 Absätze.`}
  ];
}

// Entfernt Denkblöcke, Markdown-Reste und Umrahmungen; zerlegt in Titel und Absätze. Liefert das Modell keinen Titel (erster Block
// länger als ein Titel), gilt `fallbackHeadline` und alle Blöcke sind Absätze; ein einzelner Block wird an einer Satzgrenze geteilt.
export function parseAiText(raw, fallbackHeadline = '') {
  let text = String(raw ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').replace(/\r/g, '').trim();
  text = text.replace(/^```[a-z]*\n?|\n?```$/g, '').trim();
  // Manche Modelle setzen geschützte Bindestriche und Leerzeichen um Resultate («45 : 34»); beides gilt als gewöhnliches Zeichen.
  text = text.replace(/[\u2010-\u2012\u2060]/g, '-').replace(/[\u00A0\u202F\u2009]/g, ' ').replace(/(\d) ?: ?(\d)/g, '$1:$2');
  const chunks = text.split(/\n\s*\n/).map(c => c.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  const isTitle = c => c.length <= 90 && !/[.!?]\s+\S/.test(c);
  if (chunks.length >= 3 && isTitle(chunks[0])) return {headline: cleanTitle(chunks[0]), paragraphs: chunks.slice(1)};
  if (chunks.length === 2 && isTitle(chunks[0])) {
    const split = splitSentences(chunks[1]);
    return split ? {headline: cleanTitle(chunks[0]), paragraphs: split} : null;
  }
  if (!fallbackHeadline) return chunks.length >= 3 ? {headline: cleanTitle(chunks[0]), paragraphs: chunks.slice(1)} : null;
  if (chunks.length >= 2) return {headline: fallbackHeadline, paragraphs: chunks};
  const split = splitSentences(chunks[0] || '');
  return split ? {headline: fallbackHeadline, paragraphs: split} : null;
}
const cleanTitle = t => t.replace(/^(Titel|Überschrift)\s*:\s*/i, '').replace(/^[«"]|[»"]$/g, '').trim();
// Teilt einen Block an einer Satzgrenze in zwei Absätze (mindestens zwei Sätze nötig). Ein Punkt hinter einer Ordnungszahl
// («6. Oktober», «5. Rang») ist keine Satzgrenze.
const ORDINAL_NEXT = /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Rang|Platz|Spieltag|Runde|Minute)\b/;
function splitSentences(text) {
  const sentences = [];
  let start = 0;
  for (const m of text.matchAll(/([.!?])\s+(?=[A-ZÄÖÜ])/g)) {
    const before = text.slice(0, m.index + 1), after = text.slice(m.index + m[0].length);
    if (m[1] === '.' && /(^|\s)\d{1,2}\.$/.test(before) && ORDINAL_NEXT.test(after)) continue;
    sentences.push(text.slice(start, m.index + 1));
    start = m.index + m[0].length;
  }
  sentences.push(text.slice(start));
  const list = sentences.map(x => x.trim()).filter(Boolean);
  if (list.length < 2) return null;
  const cut = Math.ceil(list.length / 2);
  return [list.slice(0, cut).join(' '), list.slice(cut).join(' ')];
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
  const {facts, ...rest} = baseline;
  return {...rest, headline: parsed.headline, paragraphs: parsed.paragraphs, generatedAt: now.toISOString(), generator: 'ki'};
}
