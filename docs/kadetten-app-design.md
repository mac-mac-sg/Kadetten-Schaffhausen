# Kadetten Companion App – Designsystem «Abend»

Stand: 5. November 2026. Richtung abgenommen: «B (Nacht) kombiniert mit der Leichtigkeit von C (Kadettenorange)». Gilt für die neue App unter `/v2/`; V1 bleibt unverändert. Aufbau der Seiten: [Spezifikation](kadetten-app.md#seitenaufbau).

## Grundidee

- **Aus «Nacht»:** Hallenfoto hinter Spielkarte und Spielstand, grosse schmale Zahlen, oranger Schein, Siege als orange Punkte.
- **Aus «Kadettenorange»:** runde Karten und Pill-Knöpfe, warme statt neutrale Töne, Überschriften ohne Versalien, aktiver Navigationspunkt als orange Marke, viel Luft.
- Die **Spielkarte** (Hero) bleibt in Hell und Dunkel dunkel mit Hallenfoto. Sie ist das Erkennungszeichen der App.
- Orange `#ff790e` ist Fläche (Knöpfe, Marken, Sieg) mit fast schwarzer Schrift, nie Fliesstext auf Hell.

## Farben

Tokens als CSS-Variablen `--c-*`, Modus über eine Klasse oder `data-theme` an der Wurzel; Standard folgt dem System.

| Token | Dunkel | Hell | Verwendung |
|---|---|---|---|
| `bg` | `#14110e` | `#f3ede4` | Seitenhintergrund |
| `surface` | `#1f1b17` | `#fffaf3` | Karten, Navigation |
| `surface-2` | `#2a241f` | `#e9e0d3` | Umschalter-Grund, Symbolfelder, Platzhalter |
| `text` | `#f6f1ea` | `#1d1914` | Text |
| `text-muted` | `#ada395` | `#665e54` | Metadaten, Beschriftungen |
| `line` | `#2f2924` | `#e6ddd0` | Trennlinien, Kartenrand |
| `accent` | `#ff790e` | `#ff790e` | Hauptknopf, Marken, aktiver Navigationspunkt |
| `on-accent` | `#1d1914` | `#1d1914` | Schrift auf Orange |
| `accent-text` | `#ff9a45` | `#b23c08` | Orange als Schrift («Alle», «Ganze Tabelle») |
| `highlight` | `#ff790e24` | `#ffe2c8` | Kadetten-Zeile in Tabellen, nächstes Spiel |
| `win` / `on-win` | `#ff790e` / `#1d1914` | `#ff790e` / `#1d1914` | Form «S» |
| `loss` / `on-loss` | `#3d352e` / `#f6f1ea` | `#1d1914` / `#fffaf3` | Form «N» |
| `live` | `#ff4d4d` | `#d4202a` | Live-Punkt |
| `seg-on` / `on-seg-on` | `#f6f1ea` / `#14110e` | `#1d1914` / `#fffaf3` | aktiver Umschalter |
| `nav-bg` | `#14110ee8` | `#fffaf3f0` | Navigationsleiste (mit Unschärfe) |

Spielkarte (beide Modi): Text `#f6f1ea`, Metadaten `#e6ddd0`, Glasknopf `#ffffff1f` mit Rand `#ffffff2e`, Verlauf `#14110e` 45 % → 80 % → 95 % über dem Foto.

Geprüfte Kontraste (WCAG): `text-muted` 6,9:1 (dunkel) und 6,1:1 (hell auf `surface`); `accent-text` 8,1:1 (dunkel) und 5,7:1 (hell); Schrift auf Orange 6,7:1; `live` hell 5,0:1. Form «U» ist ein Ring mit Buchstabe; S/U/N sind immer zusätzlich als Buchstabe lesbar.

## Schrift

| Rolle | Schrift | Grösse/Zeilenhöhe · Gewicht |
|---|---|---|
| Spielstand | Barlow Condensed | 96/0.9 · 800 |
| Anpfiffzeit | Barlow Condensed | 64/0.9 · 800 |
| Seitentitel | Barlow Condensed | 38/1 · 800 |
| Kennzahl | Barlow Condensed | 28/1.05 · 800 |
| Abschnittstitel | Barlow Condensed | 19/1.2 · 700 |
| Text | Inter | 15/1.45 · 400 |
| Zeilentitel | Inter | 15/1.3 · 600 |
| Knopf | Inter | 14.5/1 · 600 |
| Metadaten | Inter | 13/1.35 · 400–500 |
| Navigation | Inter | 11.5/1 · 500, aktiv 700 |

Alle Zahlen mit Tabellenziffern (`font-variant-numeric: tabular-nums`). Schriften werden mit der App ausgeliefert (kein Laden von Drittservern).

## Abstände, Radien, Grössen

- Abstände: 4 · 8 · 12 · 16 · 20 · 24 px. Seitenrand 16 px, Abstand zwischen Abschnitten 20 px.
- Radien: Kachel 14 · Karte 24 · Spielkarte 28 · Knöpfe, Pillen, Umschalter vollrund.
- Antippziele mindestens 44 px, Knöpfe 48 px, Navigationspunkte 52 px.
- Bewegung: kurze Übergänge (150–250 ms); bei «Bewegung reduzieren» keine.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| Spielkarte | Foto mit Verlauf; Meta-Zeile mit Pille (Countdown, Live mit Punkt, Resultat); Wappen, Anpfiffzeit oder Spielstand; optional Halbzeit/«Stand vor x s» und zwei Knöpfe |
| Knopf | Pill, 48 px; primär Orange, sekundär `surface`, in der Spielkarte Glas |
| Pille | 28 px, Orange; ruhig in `surface-2` |
| Chip | 36 px, Filter (Wettbewerb); aktiv invertiert |
| Umschalter | Segment in `surface-2`, aktiv `seg-on`; Spielseite, Saison, Team, Darstellung |
| Abschnittstitel | Barlow Condensed 19 px, rechts optional orange Link («Alle») |
| Karte / Liste | `surface`, Radius 24; Listenzeilen ≥ 56 px mit optionalem Symbolfeld, Titel, Untertitel, Pfeil |
| Kennzahlen | 2–3 Spalten mit Trennlinie, Zahl gross, Beschriftung klein |
| Form | Kreise 24 px (21 px in Tabellen) mit S/U/N |
| Tabelle | Rang, Team, Spiele, Form, Punkte; Kadetten hinterlegt; gestrichelte Linie für Playoff-Grenze |
| Spielzeile | Datum (Tag gross, Wochentag klein), Wappen, Gegner, Ort/Wettbewerb, Resultat mit Form; nächstes Spiel hinterlegt |
| Teamvergleich | Werte links/rechts, Balken Orange gegen `loss` |
| Spielerkarte | Fläche mit grosser Rückennummer, Name, Position |
| Schalter | 48 × 28 px, an = Orange |
| Navigation | vier Bereiche mit Symbol; aktiv mit oranger Marke unter dem Symbol |

## Quelle

Entwürfe im privaten Design-Canvas «Kadetten Companion App – Designrichtungen», Seiten «Abend · alle Seiten» (13 Seiten in Dunkel und Hell) und «Abend · Designsystem».
