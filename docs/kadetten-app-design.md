# Kadetten Companion App – Designsystem «Abend»

Stand: 6. November 2026. Richtung abgenommen am 5. November: «B (Nacht) kombiniert mit der Leichtigkeit von C (Kadettenorange)». Am 6. November nach dem Skill [unslop](https://github.com/heydamir/unslop) von Damir Sokolovsky (@heydamir, CC BY 4.0) überarbeitet: neutrale Flächen, kleinere Radien, ruhigere Schrift (Entscheid des Eigentümers). Gilt für die neue App unter `/v2/`; V1 bleibt unverändert. Aufbau der Seiten: [Spezifikation](kadetten-app.md#seitenaufbau).

## Richtung

- **Produkt:** Inoffizielle Fan-App für Kadetten-Fans: nächstes Spiel, Live-Stand, Spielbericht, Tabelle, Team und Verein.
- **Charakter:** abendlich, handfest, stolz.
- **Welt:** die BBC Arena an einem Spielabend: Hallenlicht, Parkett, orange Trikots, Anzeigetafel.
- **Momente:** die Spielkarte mit Hallenfoto und Spielstand; die Spielverlauf-Grafik im Bericht. Nur dort sind Orange und Kontrast satt; alles andere bleibt ruhig.
- **Erkennungszeichen:** schmale Anzeigetafel-Ziffern (Barlow Condensed 600) für Spielstände, Zeiten und Kennzahlen.

## Regeln

- Flächen, Linien und Text sind neutral (Graphit). Wärme kommt aus dem Hallenfoto, aus Orange und aus den Spielerfotos.
- Orange `#ff790e` markiert: Hauptaktion, Auswahl, Siege (Form «S»), den Kadetten-Anteil in Vergleichen und Grafiken, Lieblingsspieler. Nie als Fliesstext auf Hell; dort `accent-text`.
- Kein Leuchten, keine farbigen Schatten, keine Farbschleier, keine Verläufe zwischen Farbtönen. Tiefe im Dunkelmodus nur über Flächenstufen und Haarlinien.
- Normale Schreibweise, keine Versalien mit Sperrung. Keine Ausrufezeichen.
- Bewegung nur mit Bedeutung: Farb- und Flächenwechsel 150 ms, Druck 0,98, eine Kurve `cubic-bezier(.22, 1, .36, 1)`. Siegmoment: die Kante der Spielkarte leuchtet einmal kurz orange; aus bei «Bewegung reduzieren».

## Farben

Tokens als CSS-Variablen `--c-*`, Modus über `data-theme` an der Wurzel; Standard folgt dem System.

| Token | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `bg` | `#141415` | `#fafafa` | Seitenhintergrund |
| `surface` | `#19191b` | `#ffffff` | Karten |
| `surface-2` | `#232325` | `#f4f4f5` | erhöhte Fläche: Umschalter-Grund, Symbolfelder, aktiver Navigationspunkt |
| `text` | `#ededed` | `#171717` | Text |
| `text-muted` | `#a1a1a6` | `#525252` | Metadaten, Beschriftungen, Symbole |
| `line` | Text 8 % | Text 8 % | Haarlinien |
| `accent` | `#ff790e` | `#ff790e` | siehe Regeln |
| `on-accent` | `#171717` | `#171717` | Schrift auf Orange |
| `accent-text` | `#ff9a45` | `#b23c08` | Orange als Schrift |
| `highlight` | Orange 10 % | `#fff3e9` | Kadetten-Zeile, nächstes Spiel, eigene Stimme |
| `win` / `on-win` | `#ff790e` / `#171717` | `#ff790e` / `#171717` | Form «S» |
| `loss` / `on-loss` | `#3a3a3d` / `#ededed` | `#171717` / `#ffffff` | Form «N» |
| `live` | `#e5484d` | `#dc2626` | Live-Punkt |
| `seg-on` / `on-seg-on` | `#ededed` / `#141415` | `#171717` / `#ffffff` | aktiver Umschalter und Filter |

Spielkarte (beide Modi): Text `#f5f5f5`, Metadaten `#d4d4d8`, Glasknopf `#ffffff1a` mit Rand `#ffffff26`, neutraler Verlauf 45 % → 80 % → 95 % über dem Foto, Haarlinie innen.

Geprüfte Kontraste (WCAG, berechnet): Text 15,7:1 (dunkel) und 17,2:1 (hell); `text-muted` 6,8:1 (dunkel) und 7,8:1 (hell auf `surface`); `accent-text` 8,3:1 (dunkel) und 5,9:1 (hell), 5,4:1 auf `highlight`; Schrift auf Orange 6,8:1. Form «U» ist ein Ring mit Buchstabe; S/U/N sind immer zusätzlich als Buchstabe lesbar.

## Schrift

Skala (CSS `--fs-*`): 12 · 13 · 15 · 17 · 20 · 28 · 34 · 56 · 88. Gewichte 400, 500, 600 (Inter 400/500/600, Barlow Condensed 600). Hierarchie über Grösse und Farbe.

| Rolle | Schrift | Grösse/Zeilenhöhe · Gewicht |
|---|---|---|
| Spielstand | Barlow Condensed | 72–88/0.9 · 600 |
| Anpfiffzeit | Barlow Condensed | 56/0.9 · 600 |
| Seitentitel | Barlow Condensed | 34/1.05 · 600 |
| Kennzahl | Barlow Condensed | 28/1.05 · 600 |
| Abschnittstitel | Barlow Condensed | 20/1.2 · 600 |
| Untertitel | Inter | 17/1.25 · 600 |
| Text, Zeilentitel, Knopf | Inter | 15 · 400/500 |
| Metadaten, Nebentext | Inter | 13 · 400 |
| Beschriftungen, Tabellenköpfe, Navigation | Inter | 12 · 400/500 |

Alle Zahlen mit Tabellenziffern. Schriften werden mit der App ausgeliefert (kein Laden von Drittservern).

## Abstände, Radien, Grössen

- 4-px-Raster: 4 · 8 · 12 · 16 · 20 · 24 · 32. Seitenrand 16, Abstand zwischen Abschnitten 24, Kartenpolster 16, Spielkarte 20.
- Radien: Tag und Pille 6 · Kachel und Umschalter-Feld 8 · Knopf und Chip 10 · Umschalter-Rahmen 12 · Karte 16 · Spielkarte und grosse Bilder 20. Vollrund nur für Wappen, Form-Punkte und Schalter.
- Symbole: eine Grösse (18 px), Strich 1,5, in der Farbe des Nebentexts.
- Antippziele mindestens 44 px, Knöpfe 48 px, Navigationspunkte 52 px.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| Spielkarte | Foto mit neutralem Verlauf und Haarlinie; Meta-Zeile mit Pille (Countdown, Live mit Punkt, Resultat); Wappen, Anpfiffzeit oder Spielstand; optional Halbzeit/«Stand vor x s» und zwei Knöpfe |
| Knopf | 48 px, Radius 10; primär Orange, sekundär `surface-2` mit Haarlinie, in der Spielkarte Glas |
| Pille | 28 px, Radius 6, Orange; ruhig in `surface-2` |
| Chip | 40 px, Radius 10, Filter (Wettbewerb); aktiv invertiert |
| Umschalter | Segment in `surface-2`, aktiv `seg-on`; Spielseite, Saison, Team, Darstellung |
| Abschnittstitel | Barlow Condensed 20 px · 600, rechts optional orange Link («Alle») |
| Karte / Liste | `surface`, Radius 16, Haarlinie; Listenzeilen ≥ 56 px mit optionalem Symbolfeld, Titel, Untertitel, Pfeil |
| Kennzahlen | 2–3 Spalten mit Trennlinie, Zahl gross, Beschriftung klein |
| Form | Kreise 24 px (20 px in Tabellen) mit S/U/N |
| Tabelle | Rang, Team, Spiele, Bilanz, Tordifferenz, Punkte; Kadetten hinterlegt; Köpfe in normaler Schreibweise |
| Spielzeile | Datum (Tag gross, Wochentag klein), Wappen, Gegner, Ort/Wettbewerb, Resultat mit Form; nächstes Spiel hinterlegt |
| Teamvergleich | Werte links/rechts, Kadetten-Wert in `accent-text`; dünner Balken, Orange zeigt immer den Kadetten-Anteil von ihrer Seite aus |
| Spielerkarte | Spielerfoto, Nachname, Vorname und Rückennummer, Radius 12 |
| Schalter | 48 × 28 px, an = Orange |
| Navigation | vier Bereiche mit Symbol; aktiv als Flächenstufe mit orangem Symbol |

## Quelle

Entwürfe im privaten Design-Canvas «Kadetten Companion App – Designrichtungen», Seiten «Abend · alle Seiten» und «Abend · Designsystem» (Stand vor dem Unslop-Durchgang; massgebend ist dieses Dokument und `src/kadetten/css`).
