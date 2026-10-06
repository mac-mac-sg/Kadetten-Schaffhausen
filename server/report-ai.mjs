// KI-Schicht für den Matchbericht der European League: Aus den Fakten (server/ehf-ticker.mjs, `factLines`) formuliert die KI einen
// kurzen Bericht. Reine Funktionen ohne Netzwerkzugriff; der Aufruf des Modells liegt in scripts/lib/workers-ai.mjs.
import {parseAiText} from './preview-ai.mjs';

export function reportMessages(base) {
  return [
    {
      role: 'system',
      content: [
        'Du schreibst kurze Matchberichte für die App eines Fanclubs der Kadetten Schaffhausen (Handball, Schweiz). Der Bericht erscheint nach dem Schlusspfiff unter dem Titel «KI-Matchbericht».',
        'Schreibe auf Deutsch mit Schweizer Rechtschreibung (kein «ß»; Anführungszeichen « »), mit echten Umlauten und grammatikalisch einwandfreien Sätzen. Namen von Teams und Spielern gibst du genau so wieder, wie sie in den Fakten stehen.',
        'Die gelieferten Fakten sind vollständig: Was dort nicht steht, existiert für diesen Text nicht. Erfinde nichts. Keine Stimmung in der Halle, keine Zuschauerzahl, kein Wetter, keine Zitate, keine Aussagen von Trainern, Spielern, Schiedsrichtern oder Fans, keine Verletzungen, keine Taktik oder Spielweise, keine Hintergründe zu Teams oder Spielern, keine Einordnung in Tabelle, Saison oder Wettbewerbsverlauf («erster Sieg», «Pflichtsieg», «Favorit») und keine Prognose.',
        'Nenne Spieler nur mit den Namen aus den Fakten und nur mit den dort genannten Zahlen. Jede Zahl und jede Minute muss in den Fakten stehen und genau so wiedergegeben werden; rechne nichts selbst aus. Resultate schreibst du mit Doppelpunkt ohne Leerzeichen («23:11»). Das Heimteam steht bei Resultaten immer zuerst.',
        'Wähle die vier bis sechs aussagekräftigsten Fakten aus, statt alle aufzuzählen. Gib Wendepunkte (Serien, Flauten, Führung, Auszeiten, Strafen) so wieder, wie die Fakten sie nennen, ohne Ursachen zu behaupten.',
        'Stil: lebendig, warm und gut lesbar wie ein Bericht für Fans. Du darfst die Kadetten als «unsere Kadetten» bezeichnen und mit etwas Anteilnahme schreiben (Freude über einen Sieg, Bedauern bei einer Niederlage), solange daraus keine neue Tatsache entsteht. Wechsle Satzanfänge und Verben ab, ohne Übertreibungen und ohne leere Floskeln.',
        'Aufbau: erster Absatz Resultat und Verlauf bis zur Pause, zweiter Absatz Wendepunkte der Partie, dritter Absatz Torschützen und Torhüter mit einem kurzen Schluss.',
        'Format, immer einhalten: Erste Zeile ein kurzer Titel (höchstens 80 Zeichen, kein ganzer Satz mit Punkt), dann eine Leerzeile, dann 3 Absätze mit je 2 bis 4 Sätzen, Absätze durch eine Leerzeile getrennt. Kein Markdown, keine Aufzählungen, keine Anführung des Titels.'
      ].join(' ')
    },
    {role: 'user', content: `Fakten zum Spiel:\n\n${base.facts.map(x => '- ' + x).join('\n')}\n\nSchreibe daraus den Matchbericht: Titelzeile, Leerzeile, dann 3 Absätze.`}
  ];
}

const plain = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max && !/[<>\u0000-\u0008]/.test(v);
// Technische Regeln für gespeicherte Berichte (keine inhaltliche Prüfung, wie bei den Vorschauen).
export const validReport = r => !!r && plain(r.headline, 3, 160) && Array.isArray(r.paragraphs) && r.paragraphs.length >= 2 && r.paragraphs.length <= 4 && r.paragraphs.every(p => plain(p, 30, 1800));

// Aus der Antwort des Modells; mehr als vier Absätze werden dem vierten angehängt.
export function toReport(raw, fallbackHeadline) {
  const parsed = parseAiText(raw, fallbackHeadline);
  if (!parsed) return null;
  if (parsed.paragraphs.length > 4) parsed.paragraphs = [...parsed.paragraphs.slice(0, 3), parsed.paragraphs.slice(3).join(' ')];
  return validReport(parsed) ? parsed : null;
}
