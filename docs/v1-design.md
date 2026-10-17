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
