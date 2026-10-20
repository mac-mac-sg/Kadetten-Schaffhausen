# Gemeinsame Gestaltung von V1

V1 verwendet für Kadetten, FCSG und St. Otmar dieselben Komponentenrollen.
Vereinsfarben und Hell-/Dunkelmodus ändern die Palette, nicht die Bedeutung
oder Hierarchie einer Komponente. Die Rollen stehen am Ende von
`src/client/v1-theme.css`; V2 bleibt unabhängig.

## Auswahlzustände

Liste/Kalender, Wettbewerbswahl der Tabelle und Spiel-Laschen verwenden
44 px Mindesthöhe, 12 px Rundung, 14 px Schrift und Gewicht 650 bei Auswahl.
`--v1-control-fill` und `--v1-control-ink` definieren die aktive Auswahl:
im hellen Modus kräftige Vereinsfarbe mit weisser Schrift, im dunklen Modus
helle Vereinstönung mit dunkler Schrift. `--v1-control-tray` ist die gemeinsame
Hintergrundfläche einer Auswahlgruppe. Der Wettbewerb braucht neben dem Text
Platz für den nativen Auswahlpfeil.

Die untere Hauptnavigation bleibt eine eigene Navigationsrolle mit Glasfläche
und ihrer vorhandenen aktiven Markierung. Kalendernavigation und Hauptaktionen
sind keine Auswahlgruppen.

## Flächen

- `--surface`: Seitenhintergrund.
- `--v1-card-surface` / `--surface-2`: normale Inhaltskarte, auch News und Dialoge.
- `--v1-inset-surface`: zurückgenommene Unterfläche innerhalb von Statistikblöcken.
- Vereinsfarbe: Auswahl und gezielte Hervorhebung, keine zusätzliche neutrale Palette.

Foto-Portraits, der dunkle Spieltagsblock und Vereinsgeschichte behalten ihre
bewussten Bild- und Inszenierungsflächen. Statistik-Inhalte und Diagrammfarben
werden durch diese Rollen nicht umgebaut.

## Typografie

Überschriften verwenden die gemeinsame serifenlose `--font-text`:
News-Kartentitel 24 px, Abschnittstitel 22 px, Statistikblock-Titel 20 px,
Untertitel 18 px. Diese Titel verwenden Gewicht 600.
Zusatzinformationen verwenden `--v1-meta-size` (13 px) und `--muted`.
Artikeltext behält 17 px bzw. 20 px bei grosser Leseschrift. Die grossen
Jahreszahlen der Vereins-Timeline und Kennzahlen bleiben eigenständige Rollen.

## Prüfung

`scripts/check-v1-theme.mjs` vergleicht berechnete Auswahlstile zwischen
Ansichten pro Verein und Modus, prüft News-Kartenfläche und Schriftfamilie,
Beschriftungsbreite, Kontraste und bestehende Navigation. Gemeinsame Regeln
müssen im hellen und dunklen Modus sowie bei allen drei Vereinen geprüft werden.

## Abstände und Formen

Inhaltsflächen, News und Abschnittstitel verwenden 20 px Seitenabstand,
unter 360 px 16 px und ab 800 px 32 px. Die maximale Inhaltsbreite bleibt
1180 px; Lesetexte behalten ihre schmalere Spalte. Die feste Vereinsauswahl
und Spielsteuerung behalten gemeinsam 14 px Rand, die Timeline ihre eigene
Geometrie. Der Einstieg in Tabelle und Kader bleibt gleich gross.

Kleine Rasterabstände betragen 12 px, Karteninnenabstände 16 px,
Abschnittsabstände 32 px. Normale Karten verwenden 18 px Rundung, eingezogene
Unterflächen 12 px, Dialoge 24 px. Karten teilen eine feine Kontur und einen
zurückhaltenden Schatten je Modus; Unterflächen verzichten auf Schatten.
Dialoge erhalten einen gemeinsamen stärkeren Schatten. Glasnavigation,
Ergebnisstreifen, aktuelles Spiel, Vollbild-PDF und inszenierte Bildflächen
behalten ihre eigenen Rollen.

## Touch und Aktionen

Buttons und Zurück-Links haben mindestens 44 px Höhe. Reine Icon-Aktionen
verwenden 44 × 44 px, 20 px Linien-Icons und 12 px Rundung; im kompakten
Disclaimer-Link bleibt das Symbol 16 px. Textbuttons verwenden 14 px und
Gewicht 600. Die grossen Navigations- und Bildkarten behalten ihre Form.

Eine kurze Druckreaktion dauert 140 ms: kompakte Aktionen skalieren auf .98,
grosse Karten ändern nur ihre Deckkraft. Die vollständig klickbare Spielkarte
reagiert als Ganzes, ohne ihre gestreckte Linkfläche zu verschieben. Alle
Aktionen teilen einen sichtbaren Tastaturfokus. Tastaturbedienung und reduzierte
Bewegung verzichten auf die Skalierung; deaktivierte Buttons reagieren nicht.
Zurück, Schliessen und Monatswechsel nutzen dieselbe Linien-Icon-Sprache.

## Spieltag-Hinweise

«Heute» steht innerhalb der unteren Glasnavigation neben dem Spiele-Icon,
mit Platz für beide Elemente bei 320 px Breite. Die Glaskante bleibt beschnitten.
Im oberen Vereinsbalken erscheinen nur heutige Spiele anderer ausgewählter
Vereine, mit Wappen, Anspielzeit, bestätigtem Live-Stand oder Endresultat.
Der Link öffnet direkt das jeweilige Matchcenter. Ohne entsprechende Partien
entfällt die Zeile. Die vorhandene Header-Messung berücksichtigt ihre Höhe.
Live-Daten anderer Vereine werden bei sichtbarer App alle 30 Sekunden abgefragt;
fehlgeschlagene Quellen erhalten den letzten Stand und kennzeichnen «Zuletzt live».

## Feinschliff: leichte Leseflächen
Normale Spielkarten haben kleinere Innenabstände und eine zurückhaltende VS-Anzeige; der doppelte Vorschau-Text im Spielstand entfällt. Teams bleiben 14 px, Metadaten 13 px. Aktuelle und laufende Spiele behalten ihre hervorgehobene Darstellung. Newsüberschriften erhalten eine ruhigere Gewichtung. Statistik- und Bento-Kacheln bleiben vollständig erhalten; nur Hinweise in Artikeln, der Titel-Detailbereich der Vereinsseite und die kleinen Spielhinweise verzichten auf zusätzliche Boxflächen.

Der Glas-Dock behält seine scharfe, geglättete Kontur und erhält einen leiseren Schatten sowie eine zurückhaltendere Auswahlfläche. Bildflächen in News und Artikeln sind vorab reserviert. Fehlende Newsbilder, Wappen und Kaderfotos erhalten einen beschrifteten Ersatz an derselben Stelle, niemals ein fremdes Spielerfoto. Artikel-Wiederholungen behalten lesbaren Inhalt, sperren den Wiederholungsbutton während der Anfrage und melden den Ladezustand. Geladener Artikeltext blendet kurz ein; reduzierte Bewegung verzichtet darauf. V2 und Datendienst bleiben unverändert.

Abgeschlossene Handballspiele zeigen den Torverlauf in «Statistiken» direkt vor «Spielerstatistiken». «Rückblick» enthält weiterhin die einzelnen Spielereignisse. Fehlt die gesicherte Torfolge, wird keine Grafik erzeugt.

Bestätigte Spielenden wechseln auch am selben Tag sofort von der Live- in die abgeschlossene Spielansicht. Bestätigte Live-Werte und Ereignisse überbrücken den Zeitraum bis zum vollständigen Spielbericht. Der KI-Bericht wird unabhängig nachgeladen; fehlende Archive werden bei sichtbarer Spielansicht im bestehenden Live-Zyklus nach frühestens zwei Minuten erneut abgefragt.

Während laufender Handballspiele steht dieselbe Torverlauf-Grafik oberhalb des Livetickers. Sie verwendet ausschliesslich bestätigte Torereignisse und wächst nur bis zur gemeldeten Spielzeit; die weitere Spielzeit bleibt leer. Der bestehende 30-Sekunden-Zyklus aktualisiert Kurve, Zwischenstand und Ereignisse gemeinsam. Ohne Torfolge wird keine Kurve erfunden. Nach dem bestätigten Ende steht die Grafik weiterhin nur in «Statistiken». Die doppelte aufklappbare Liste «Alle Spielereignisse» entfällt.

## Gemeinsame Gestaltung der abgeschlossenen Spielstatistik
Die abgeschlossene Handballstatistik nutzt dieselbe Kartenfläche, 18-px-Rundung, feinen Rahmen, 16-px-Innenabstände und Typografie wie die übrige V1-App. Dezente radiale Tönungen in Vereinsfarbe und Blaugrau geben Tiefe; der Torverlauf darf etwas stärker getönt sein. Die Flächen bleiben deckend und erhalten keinen Glaseffekt. Dasselbe gilt für die Torverlauf-Grafik im Liveticker. Der eigene Verein verwendet durchgehend die vorhandene Vereinsfarbe, der Gegner ein entsättigtes Blaugrau (dunkel #a4b8c8, hell #496579); Halbzeitwerte und Torhüterwerte folgen auch auswärts dieser Zuordnung. Zahlen, Balken, SVG-Kurven und die dezenten Flächentönungen übernehmen dieselben Farbrollen aus dem Theme, auch im Liveticker. Die zusätzliche Titelzeile über «Torverlauf» entfällt in V1.

Mannschaftsauswahl und Spielerwerte stehen in einer gemeinsamen Karte. Torhüter bleiben darin eigenständige, leicht hervorgehobene Kacheln; Tabellen erhalten besonders ruhige Flächen. V2 behält seine bisherige Gestaltung.

## Textorientierter Rückblick
Abgeschlossene Handballspiele in V1 beginnen unter den Laschen direkt mit dem konkreten Matchbericht: kleine Kennzeichnung, Berichtsüberschrift als Seitenüberschrift, erster Absatz als Einleitung und der vollständige Text. Das allgemeine Mannschaftsfoto, Slogans und die zusätzliche Überschrift «Der Rückblick» entfallen. Die kompakte Liste danach enthält Datum, Wettbewerb, den verlinkten Spielort und – wenn bestätigt – die Zuschauerzahl. Danach folgen die Spielereignisse. Ein ausstehender Bericht zeigt zunächst den bestätigten Endstand mit einem Hinweis. Vorschauen und V2 behalten ihre bisherigen Einstiege. Bericht-Quellen unterscheiden SHV und EHF anhand der gespeicherten Quellenangaben.

Die FCSG-Spielstatistik nutzt dieselbe blaugraue Gegnerfarbe wie Handball. Vergleichsbalken sowie Linien und Flächen der Torgefährlichkeit übernehmen die Theme-Farbrollen auch bei Auswärtsspielen. Grün bleibt die FCSG-Farbe; V2 behält seine bestehende Palette.

In der unteren V1-Navigation bleibt der Eintrag «Spiele» auch am Spieltag ohne «Heute»-Zusatz; das Icon bleibt zentriert. Die Spieltagskarte und Hinweise auf Spiele anderer ausgewählter Vereine bleiben erhalten.

Die Vorschau im Spieltagsblock nutzt für alle Vereine dieselbe Beschriftung: «Nächstes Spiel · in x Tagen», «Nächstes Spiel · morgen» oder «Spieltag · heute». Darunter steht Wochentag, Datum mit Jahr und bestätigte Anspielzeit, z. B. «Samstag, 24.10.2026 · 18:00 Uhr»; eine offene Uhrzeit heisst «Zeit noch offen». Die Tageszählung verwendet Zürcher Kalendertage. Eine gleich hohe Kopfzeile erlaubt zweizeilige Hinweise ohne Überlagerungen und ohne springende Karten beim Vereinswechsel. V2 und Live-/Ergebnisinhalte behalten ihre bisherigen Texte.
