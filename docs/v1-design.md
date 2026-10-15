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
