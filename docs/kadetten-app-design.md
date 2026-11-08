# Kadetten App – Designsprache «Schnitt»

Stand: 7. November 2026. Gilt für die neue Kadetten App unter `/v2/` (`src/kadetten/`). Entscheid des Eigentümers: Die App ist reine Kadetten-App (keine Vereinsauswahl), hat vier Tabs und eine eigene, wiedererkennbare Designsprache, die aus Wappen und Trikot kommt. Sie ersetzt sowohl die frühere «Abend»-Oberfläche als auch das [Matchday-Layout](v2-matchday-layout.md). Aufbau der Seiten und Daten: [Spezifikation](kadetten-app.md). Einseitige Kurzfassung für Folgearbeiten: [Brand-Kit](kadetten-brand-kit.md).

## Idee

Vier Merkmale, die nur die Kadetten haben und in jedem Tab wiederkehren:

| Merkmal | Herkunft | Einsatz |
|---|---|---|
| **Wappen-Anschnitt** | das grosse K im Wappen | als Tonwert (Wappen mit 20 % Deckkraft, Sterne und Rahmenlinie ausserhalb des Ausschnitts) im Kopfband jeder Seite |
| **Schnitt, 8°** | die schräge «1791»-Platte im Wappen | Unterkante der Kopfbänder und Bilder, Knöpfe, Chips, Etiketten, Formkürzel, Tab-Marker, Abschnittsmarker, kursive Ziffern |
| **Streifen** | die schwarzen Diagonalstreifen auf dem Trikot | schmales Band an der Schnittkante der Kopfbänder, Rand der eigenen Zeile (nächstes Spiel, Kadetten in der Tabelle), Live-Kante der Spielkarte; nie als Fläche |
| **Rückennummer** | die Nummern auf dem Trikot | Zahlen sind Grafik: Anpfiffzeit, Spielstand, Rang, Punkte, Resultate, Minuten im Ticker, Spielernummern. Barlow Condensed kursiv |

«1791» bezeichnet die Gründung des Kadettencorps, nicht der Handballmannschaft (siehe [Vereinsseite](club-history.md)). Der Titelzusatz heisst deshalb «Tradition seit 1791».

## Farben

Tokens als CSS-Variablen `--c-*` in `src/kadetten/css/tokens.css`; Modus über `data-theme` an der Wurzel, Standard folgt dem System. Hell ist die Grundlage.

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `bg` | `#f6f3ee` (Papier) | `#141415` | Seitenhintergrund |
| `surface` | `#ffffff` | `#1c1c1e` | Karten, Navigation |
| `surface-2` | `#ece8e1` | `#262628` | Symbolfelder, ruhige Etiketten |
| `chip` | `#e4dfd6` | `#262628` | Fläche inaktiver Chips, Segmente, Tipp-Knöpfe |
| `text` / `text-muted` | `#141415` / `#525252` | `#ededed` / `#a1a1a6` | Text |
| `accent` | `#ff5d00` | `#ff5d00` | Kadettenorange, **aus dem Wappen gemessen**; Flächen, Auswahl, Siege, Hauptaktion |
| `on-accent` / `ink` | `#141415` | `#141415` | Tinte auf Orange (Kopfband, Knöpfe) |
| `accent-text` | `#b23c08` | `#ff8a4d` | Orange als Schrift |
| `highlight` | Orange 10 % | Orange 12 % | Kadetten-Zeile, nächstes Spiel, eigene Stimme |
| `loss` | `#141415` | `#3a3a3d` | Form «N» |
| `live` | `#dc2626` | `#e5484d` | Live-Punkt |

Orange ist bewusst `#ff5d00` und nicht mehr das frühere `#ff790e`: Nur so verschmilzt das K des Wappens nahtlos mit dem Kopfband. Kontraste (WCAG, berechnet und in `tests/app-design.test.mjs` geprüft): Text mindestens 7:1; Nebentext und Orange als Schrift mindestens 4,5:1 auf `bg` und `surface`; Tinte auf Orange 5,9:1. Ergebnisse nie nur über Farbe: Form als S/U/N-Kürzel mit Buchstabe.

## Schrift

Inter 400/500/600 für Text, Barlow Condensed 600 normal und **kursiv** für Titel und Ziffern. Beide werden mit der App ausgeliefert (SIL OFL, `fonts/`), nichts von Drittservern.

| Rolle | Schrift |
|---|---|
| Wortmarke Titelseite | Barlow Condensed kursiv 96/0.85, «Schaffhausen» 30 |
| Kopfband-Titel (Spiele, Tabelle, Kader, Verein, News) | Barlow Condensed kursiv 80/0.9 |
| Anpfiffzeit, Spielstand | Barlow Condensed kursiv 56–96/0.85 |
| Abschnittstitel, Seitentitel Unterseiten | Barlow Condensed kursiv 22–34 |
| Rang, Punkte, Resultate, Minuten | Barlow Condensed kursiv 22–28 |
| Text, Zeilentitel, Knöpfe | Inter 15 · 400/500/600 |
| Metadaten, Beschriftungen, Navigation | Inter 12–13 |

Alle Zahlen mit Tabellenziffern.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| Kopfband `.band` | Orange Fläche, Unterkante um 8° geschnitten (`--cut` = Breite × tan 8°, gilt für jede Breite), Wappen-Anschnitt, Streifenband. Varianten: Titelseite (`band-home`, mit Wappen links, «Ich» rechts, Wortmarke), Hauptseite (Kicker, Titel, Knöpfe Verein und «Ich»), schmal (`band-slim`, Zurück und Aktion), Spielseite (`band-match`, Spielstand im Band) |
| Knopf, Chip, Segment, Etikett, Formkürzel | Parallelogramm: Fläche steht in `::before` schräg, Text bleibt aufrecht. Primär Orange mit Tinte, sonst Chip-Fläche. Knöpfe mindestens 48 px, Chips 40 px, Segmente 44 px |
| Abschnittstitel `.h2` | kursiv, mit schrägem orangem Marker |
| Navigation | vier Tabs: News, Spiele, Tabelle, Kader, alle mit Symbol und Beschriftung; aktiv in `accent-text` mit schrägem Balken am oberen Rand |
| Spielkarte `.hero` | Karte mit Meta-Zeile (Etikett «in 6 Tagen», Live, Resultat), Wappen, grosse kursive Zeit oder Stand. Im Kopfband der Spielseite ohne eigene Fläche |
| Nächstes Spiel, Kadetten in der Tabelle | Streifenrand links (`next-wrap`, `tr.me`) auf `highlight` |
| Bilder | untere Kante um 8° geschnitten (Aufmacher, Vorschaubilder, Porträts, Spielerseite) |
| Wappen | Eigener Zuschnitt `assets/kadetten-wappen.png` (nur der Schild, ohne Sterne und Rahmenlinie); Sterne nur im vollen Wappen der Geschichte. Eigenes Wappen in Spielkarten ohne Kreis |
| Datumsblock | Tag als grosse kursive Ziffer, Monat klein; ersetzt in Spielzeilen das Gegnerwappen |
| Umschalter und Filter | Umschalter (Segmente) sind orange. Steht darunter ein Filter (Chips), ist dessen Auswahl neutral (Tinte bzw. Papier), damit nie zwei orange Auswahlen konkurrieren |
| Spielerkarte | Porträt (schwarzer Grund der Fotos), geschnittene Unterkante, grosse kursive Nummer in `accent-text`, Name, Position |
| Spielerwahl | Vorschläge nach Spieldaten als Zeilen (Porträt im Schnitt, Nummer, Begründung als schräges Etikett, schräger Wählen-Knopf, Streifenrand bei Auswahl); weitere Spieler eingeklappt; fester Bestätigungsknopf mit Namen. Live: Karte «Dein Favorit?» mit schrägen Chips. Details: [Spielerwahl](spielerwahl.md) |
| Spielverlauf (Statistik) | Wie in Matchday je Team eine Kurve der erzielten Tore über die Spielzeit (Kadetten orange und kräftig, Gegner neutral und gestrichelt, damit nie nur die Farbe unterscheidet), Halbzeitmarke, Endpunkte. Legende mit Toren und der Tordifferenz als schräges Etikett; darunter die Tordifferenz als Verlauf. Die Kurve läuft nur bis ans Spielende, wenn die Torfolge vollständig ist |
| Zeitleiste im Ticker | Minute kursiv, schräger Marker, Stand rechts |
| Schalter | 48 × 28 px, eckig, an = Orange |

## Regeln

- Flächen sind ruhig und neutral (Papier, Graphit). Orange gehört dem Kopfband, der Auswahl, den Siegen, der Hauptaktion und dem Kadetten-Anteil in Grafiken.
- Kein Leuchten, keine farbigen Schatten, keine Verläufe zwischen Farbtönen. Neutrale Verläufe nur zur Lesbarkeit von Text auf Fotos.
- Der Schnitt ist **eine** Neigung (8°). Keine weiteren Winkel, keine Rundungen an Knöpfen und Chips.
- Streifen nur als Band oder Rand, höchstens 30 px breit.
- Normale Schreibweise, keine Versalien mit Sperrung, keine Ausrufezeichen.
- Bewegung nur mit Bedeutung: Farb- und Flächenwechsel 150 ms, Druck 0,98, eine Kurve `cubic-bezier(.22, 1, .36, 1)`. Siegmoment: die Spielkarte leuchtet einmal kurz orange auf; aus bei «Bewegung reduzieren».
- Antippziele mindestens 44 px. Die Seiten erzeugen keine `style`-Attribute (Content-Security-Policy `style-src 'self'`); berechnete Breiten laufen über `data-style` und das CSSOM.

## Seiten

| Seite | Aufbau |
|---|---|
| Titelseite (Tab News) | Kopfband mit Wortmarke, Wappen (→ Verein), «Ich»; nächstes Spiel als Karte mit Countdown-Etikett; je nach Spieltag Live-Stand, Ausgangslage, Tipp oder Endresultat; Aufmacher und Kurzmeldungen; Saisonzeile; letztes Resultat |
| News | Kopfband, Meldungsliste mit geschnittenen Vorschaubildern |
| Spiele | Kopfband, Wettbewerbs-Chips, Spiele nach Monat, nächstes Spiel mit Streifenrand |
| Spielseite | Kopfband mit Zurück, Teilen und Spielstand; Segmente Übersicht, Ticker, Statistik |
| Tabelle | Kopfband (Titel bleibt «Tabelle» auch bei den Spielerwerten), Segmente Tabelle und Spielerwerte, Spielerwerte mit Würfen und Quote (Tore/Würfe) aus den Spielberichten, Chips QHL und European League, Kadetten mit Streifenrand |
| Kader | Kopfband, Positions-Chips (Alle, Tor, Rückraum, Flügel, Kreis), ein Raster mit zwei Spalten nach Rückennummer |
| Spieler | schmales Band, Porträt mit grosser Nummer, Name und Position darunter (nie über dem Trikot), Saisonwerte, Form, Steckbrief |
| Verein | Kopfband, Titel als grosse Zahlen (ohne Karte), «1791»-Karte mit Streifenrand, Hallenfoto mit Schnitt, zwei Verweise: Geschichte (`#/verein/geschichte`, Zeitreise und Heimhalle) und Trophäenschrank (`#/verein/titel`, Titel und Jahre) |
| Ich, Geschichte, Trophäenschrank, Spielerwahl | Kopfband mit Zurück und Titel (`band-sub`) |
| Alle Unterseiten | Zurück als Pille im Band; Streifenband liegt unter den Knöpfen, nie dahinter |

## Quelle

Entwürfe im privaten Design-Canvas «Kadetten App – Titelbereich» (Runde 2, Stand 7. November 2026: Übersichtsblatt «Designsprache Schnitt», Titelseite hell und dunkel, Spiele, Tabelle, Kader, Spiel-Detail, News, Verein). Massgebend sind dieses Dokument und `src/kadetten/css`.
