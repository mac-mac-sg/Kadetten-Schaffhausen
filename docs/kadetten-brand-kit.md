# Kadetten App – Brand-Kit

Stand: 7. November 2026. Kurzfassung der Gestaltung auf einer Seite: Wappen, Farben, Verhältnis, vier Merkmale, Schrift. Die vollständigen Regeln, Bausteine und Kontraste stehen im [Designsystem «Schnitt»](kadetten-app-design.md). Das Brand-Kit ändert die App nicht; es hält die Sprache fest, damit Folgearbeiten (Teilen-Bilder, Social-Grafiken, Aushänge, neue Seiten) dieselbe Handschrift tragen. Der Entwurf liegt im privaten Design-Canvas «Kadetten App – Titelbereich» (Karte «Punkt 3 · Brand-Kit»).

## Wappen

| Variante | Datei | Verwendung |
|---|---|---|
| Vollständiges Wappen mit drei Sternen | `src/kadetten/assets/kadetten-logo.png` | Geschichte, helle Flächen, grosse Darstellung |
| Schild ohne Sterne und Rahmenlinie | `src/kadetten/assets/kadetten-wappen.png` | Kopfband (Anschnitt), Knöpfe, Spielkarten, Platzhalter, Teilen-Bilder |

Die drei schwarzen Sterne verschwinden auf dunklem Grund. Auf Dunkel deshalb nur den Schild verwenden. Das Wappen wird weder gedreht noch eingefärbt; der Anschnitt im Kopfband zeigt es als Tonwert (20 % Deckkraft auf Orange). «1791» bezeichnet die Gründung des Kadettencorps, nicht des Handballteams (Zusatz: «Tradition seit 1791»).

## Farben

| Name | Wert | Verwendung |
|---|---|---|
| Orange | `#ff5d00` | aus dem Wappen gemessen; Kopfband, Auswahl, Siege, Hauptaktion |
| Tinte | `#141415` | Schrift und Etiketten auf Orange |
| Papier | `#f6f3ee` | Grund hell |
| Graphit | `#1c1c1e` (Seite `#141415`) | Grund dunkel |
| Orange als Schrift, hell | `#b23c08` | 5,9:1 auf Papier |
| Orange als Schrift, dunkel | `#ff8a4d` | mindestens 7:1 auf Graphit |

Verhältnis als Faustregel: etwa 70 % ruhige Fläche (Papier oder Graphit), 20 % Orange, 10 % Tinte. Orange gehört dem Kopfband, der Auswahl, den Siegen und der Hauptaktion, nie ganzen Seiten. Es gibt keine zweite Akzentfarbe.

## Vier Merkmale

1. **Wappen-Anschnitt:** das K gross und angeschnitten als Tonwert im Kopfband.
2. **Schnitt, 8°:** die Neigung der «1791»-Platte; Unterkanten, Knöpfe, Chips, Marker, kursive Ziffern. Es gibt keinen zweiten Winkel und keine Rundungen an Knöpfen.
3. **Streifen:** die Trikotstreifen nur als schmales Band (höchstens 30 px) oder Rand. Im Kopfband laufen sie weich aus; Flächen dürfen an Farbe und Bild als Milchglas erscheinen (Feinschliff in `docs/kadetten-app-design.md`).
4. **Rückennummer:** Zahlen sind Grafik (Anpfiffzeit, Stand, Rang, Nummern) in Barlow Condensed kursiv.

## Schrift

Barlow Condensed 600, normal und kursiv, für Titel und Ziffern; Inter 400/500/600 für Text und Knöpfe. Beide werden mit der App ausgeliefert (SIL OFL). Normale Schreibweise, keine Versalien mit Sperrung, keine Ausrufezeichen.

## Nicht verwenden

Zweite Akzentfarben, Farbverläufe zwischen Farbtönen, Leuchteffekte, Wellen, Bögen oder Rundmasken statt des Schnitts, Serifenschriften, Emoji, zu kleine hellgraue Schrift (unter 4,5:1).
