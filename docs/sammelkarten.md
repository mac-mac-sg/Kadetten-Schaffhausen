# Sammelkarten und «Mein Bereich»

Stand 14. November 2026. Konzept und Skizzen: Design-Canvas, Bretter «Mein Bereich · Konzept» und «Mein Bereich · Skizzen».

## Was es gibt

- `#/ich` ist **Mein Bereich**: Quiz-Bilanz (Wochen in Folge, Anteil richtiger Antworten, Wochen ohne Fehler), Fortschritt der Sammlung, die drei neuesten Karten, Lieblingsspieler. Erreichbar über den fünften Tab «Ich». Die Einstellungen stehen unter `#/ich/einstellungen` (Zahnrad oben rechts).
- `#/sammlung` zeigt alle Karten (fehlende gestrichelt mit Nummer und Art) oder nur die eigenen, gefiltert nach Art. Seit 19.11.2026 in gemischten Formaten: Orte, Titel, Spiele und Geschichte quer über die ganze Breite (3:2), Kader, Legenden, Trainer, Macher und Momente hochkant in halber Breite. Fehlende Karten haben schon ihr späteres Format; die Nummern-Reihenfolge bleibt, Lücken neben einer einzelnen Hochkarte sind gewollt. Konzept: Design-Canvas, Brett «Sammlung · gemischte Formate».
- `#/sammlung/<id>` zeigt eine Karte gross (Querkarten quer, auch die Rückseite). Antippen der Karte (oder «Umdrehen», Enter, Leertaste) dreht sie in 3D mit kurzem Anheben und zeigt die Rückseite mit Text, Fakten und Quelle.
- `#/sammlung/neu` zeigt die eben abgeholten Karten als Fächer: verdeckt ausgeteilt, Antippen deckt eine Karte mit einer Drehung auf, «Alle aufdecken» deckt sie nacheinander auf; danach fächern sie sich weiter auf. Seitlich wischen (oder Pfeiltasten) holt die nächste oder vorherige Karte nach vorne und deckt verdeckte dabei auf; Antippen einer hinteren Karte holt sie ebenfalls nach vorne. Die vordere Karte öffnet beim nächsten Antippen ihre Ansicht.
- Bewegung: Spezial- und Legendenkarten tragen einen wandernden Glanz, Legenden leuchten beim Aufdecken, die Kartenansicht dreht sich in 3D, Raster und Vorschau erscheinen gestaffelt. Die Eintrittsbewegungen laufen nur beim Öffnen einer Seite, nicht beim Neuzeichnen. «Bewegung reduzieren» schaltet alles ab.

## Karten

112 feste Karten plus Momentkarten (eine je besuchtem Heimspiel).

| Art | Anzahl | Seltenheit | Inhalt |
|---|---|---|---|
| Kader | 21 | Standard | Aktueller Kader aus `data/squad.js`, Rückseite mit Steckbrief und QHL-Saisonwerten |
| Geschichte | 8 | Standard | Kapitel aus `data/club.js` |
| Orte | 4 | Standard | BBC Arena, Zelt der Messe Frauenfeld, Kleinfeld im Freien, Kadetten-Hütte |
| Titel | 27 | Spezial | 15 Meistertitel, 11 Cupsiege, Supercup-Rekord |
| Spiele | 13 | Spezial | Legendäre Spiele 1974 bis 2017 |
| Legenden | 20 | Legende | Ehemalige Spieler |
| Trainer | 11 | Legende | Von Giorgio Behr (1970er) bis Jonas Wille (2026/27) |
| Macher | 8 | Legende | Präsidenten und Verantwortliche |

Die festen Karten stehen in `data/sammelkarten.js`, Kader- und Geschichtskarten entstehen in `js/sammeln.js`.

## So gibt es Karten

Alles bleibt auf dem Gerät (`v2:app-cards`, `v2:app-live-seen`). Jede Belohnung hat einen festen Schlüssel und wird einmal eingelöst. Gezogen wird nur unter fehlenden Karten; Doppelte gibt es nicht.

| Anlass | Schlüssel | Karten |
|---|---|---|
| Erster Besuch in Mein Bereich | `willkommen` | Lieblingsspieler (oder eine zufällige Standardkarte), Kapitel 1791, BBC Arena |
| Quiz der Woche abgeschlossen | `quiz:<Woche>` | 2 zufällige |
| Quiz ohne Fehler (3 von 3, früher 5 von 5) | `quiz5:<Woche>` | 1 Spezial oder Legende |
| «Ich war in der Halle» bei einem gespielten Heimspiel | `halle:<Spiel>` | Momentkarte des Spiels und 1 zufällige |
| Tipp mit mindestens 1 Punkt | `tipp:<Spiel>` | 1 Standard oder Spezial |
| Tipp exakt | `exakt:<Spiel>` | 1 Spezial oder Legende |
| App sieht ein laufendes Kadetten-Spiel | `live:<Spiel>` | 1 Standard oder Spezial |

Bewusst nicht: Tauschen, Doppelte einlösen, Fan-Ranking, Kauf. «Ich war in der Halle» lässt sich nicht prüfen; die Sammlung ist ein persönliches Spiel. Ein neues Gerät beginnt leer.

## Quellen

Jede Aussage auf einer Karte stützt sich auf mindestens eine dieser Quellen (Kürzel im Feld `src`). Was eine Quelle nicht sagt, steht nicht auf der Karte.

- `ks`: https://kadettensh.ch/geschichte/ (Vereinsgeschichte, Wall of Fame, Archivbilder unter `wp-content/uploads/2025/12/`). Grundlage für frühe Jahre, Trainer bis 2010, Präsidenten und Orte.
- `mp`: Matchprogramm 2026/27, https://kadettensh.ch/wp-content/downloads/Matchprogramm_Kadetten_QHL.pdf (Titeljahre, Staff 2026/27, Vorwort von Giorgio Behr und Jonas Wille).
- `wp`: Wikipedia (de), Artikel «Kadetten Schaffhausen» (Europacup-Resultate 1993 bis 2017, Saisonrückblick, ehemalige Spieler), «BBC Arena» und die Personenartikel der Legenden und Trainer (Stationen und Titel mit den Kadetten).
- `ehf`: https://history.eurohandball.com/ec/ehfc/men/2009-10/round/7/Final (EHF-Cup-Final 2010).
- `kader`: Spielerprofile auf kadettensh.ch (wie `data/squad.js`).

Abweichung: Wikipedia führt andere Supercup-Jahre als das Matchprogramm. Es gilt das Matchprogramm (16 Siege, wie im Trophäenschrank).

Nicht aufgenommen, weil nicht belegt: Zuschauerrekorde, Hallen vor der BBC Arena ausser dem Zelt in Frauenfeld, Resultate der Wiederaufstiegsspiele gegen Yellow Winterthur und Pfader Neuhausen, die Champions-League-Gruppe 2007/08 (die Wikipedia-Tabelle wiederholt dort 2006/07).

## Bilder

Kaderkarten nutzen die Spielerfotos der App. Titel- und Spielkarten nutzen Archivbilder des Vereins nur, wenn Dateiname Jahr und Titel nennt (zum Beispiel `Meister_2005_B_DL.jpg`). Personen ohne Foto erhalten eine Typo-Karte mit Jahreszahl und Wappen. Archivbilder laden beim ersten Abruf aus dem Netz; ohne Verbindung bleibt die Fläche dunkel. Rechte liegen bei den Urhebern.
