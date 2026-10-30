# Gemeinsamer App-Stand von V1 und V2

Seit 21. Oktober 2026 übernimmt die normale App den freigegebenen V2-Stand: Vereins-Kachel im Kader, Vereinsseite mit geschwungenem Bildauftakt, Erfolge und Chronik, runde diagonale Absprung-Pfeile, unten bündige News-Titel/Pfeile sowie die flachere Mannschaftskachel. Beide Oberflächen verwenden dieselben Renderer und Styles.

## Gemeinsame Basis und weitere Experimente

`src/client/js/club-design.js` und `src/client/club-design.css` enthalten die freigegebenen Erweiterungen und werden von der normalen Quellhülle vor dem Startcode geladen. `data-club-layout="modern"` aktiviert sie in beiden Versionen; die bestehenden `v2-`-Klassennamen bleiben als interne Selektoren erhalten. Beide Dateien gehören zur Offline-Hülle und zum Build-Hash.

`scripts/build-pages.mjs` erzeugt weiterhin die normale App und die separate Testversion unter `/v2/`. Nur deren Hülle erhält `data-preview="v2"`. Weitere Designversuche können auf dieses Merkmal begrenzt werden. V2 behält die eigene Manifest-Bezeichnung, relative PWA-ID und Scope sowie `v2:` vor Browser-Speicherschlüsseln. V1 verwendet seine bestehenden Schlüssel; Einstellungen und Daten werden nicht umkopiert. Die ausschliesslich in V2 vorhandene Leseschrift-Einstellung bleibt getrennt.

Beide Builds lesen dieselben öffentlichen Cloudflare-Daten. Datenjobs und Schreibzugänge ändern sich nicht. Der Haupt-Service-Worker lässt den V2-Pfad passieren.

## Prüfung

`npm run verify` prüft die gemeinsame Quellhülle, vollständige Archiv- und Spielerinhalte, isolierte Speicherung und PWA-Pfade. `node scripts/check-v2-mobile.mjs` vergleicht alle fünf Hauptansichten beider Oberflächen bei identischen Daten für drei Vereine, Hell/Dunkel und Smartphone/Desktop. Seit dem Magazin-Umbau (unten) prüft es gleiche Bedienelemente und Inhalte, nicht mehr identische Gestaltung; die Reiter «Magazin» und «Team» gelten als «News» und «Kader», auf Startseite, Team- und Vereinsseite zählen Aufbau, Spieler und Anzahl. Geprüft werden ausserdem News-Pfeil-Geometrie, Vereinsnavigation auf beiden Versionen, Kalender-Rückweg, Theme-Speichertrennung, eine Hauptüberschrift, kein horizontaler Überlauf, keine Skriptfehler und axe-core. Browser-/axe-Pfade können wie bisher über GAMES_PLAYWRIGHT_MODULE, GAMES_CHROMIUM_EXECUTABLE und GAMES_AXE_SCRIPT gesetzt werden.

## Vereinsansicht: geschwungener Bildauftakt

Im Kader steht vor der ersten Spielergruppe eine vollständig verlinkte Kachel «Unser Verein» mit lokal vorhandenem Arenabild, ruhiger asymmetrischer Kurve und Vereinsfarbe. Die Kachel ist rund 240 px hoch. Sie öffnet die bestehende Route #club; Browserhistorie und Zurück zum Kader bleiben nutzbar.

Die Vereinsseite übernimmt das vorhandene Archiv-Titelbild samt Originalbeschriftung. Ein statischer SVG-Bogen führt in eine gedeckte Farbfläche mit Vereinsname und kurzem Vereinssatz über. Hellmodus: Pastellorange, Grün oder Gelb; Dunkelmodus: tiefe entsprechende Töne. Keine animierte Welle, keine verschachtelten Kachelebenen.

Darunter folgen «Unsere Erfolge» mit unveränderten Titelkategorien, Titeljahren und historischen Verknüpfungen sowie «Unsere Geschichte» als normal scrollende Zeitleiste mit schmalem Jahresstrahl links. Alle Chroniktexte, Archivbilder, Bildnachweise und Quellen bleiben erhalten. Archivbilder werden bei Quellenfehlern wie bisher ausgeblendet, ohne eine andere Aufnahme als historisches Original auszugeben.

Die gemeinsame Gestaltung umschliesst squad/fcsgSquad und clubPage/fcsgClubPage. Tests prüfen den vollständigen Erhalt aller Spieler und aller Erfolgs-/Chronik-/Quelleninhalte. Die Browserprüfung deckt die Einstiegskachel, Tastaturöffnung, Titelwahl, historische Sprünge, Browser-Zurück und isolierte Theme-Speicherung ab.

## Runde Absprung-Pfeile

Vorwärts-Absprünge übernehmen den feinen Kreis der Vereins-Kachel, kompakt auf 32 px mit 17-px-SVG-Pfeil ↗: News, Spielvorschau/Live/Rückblick, historische Momente, Disclaimer und externes PDF. Alle Absprung-Pfeile zeigen einheitlich schräg nach oben. Die komplette ursprüngliche Klickfläche bleibt erhalten. News: Das Datum steht über dem Titel. Titel und Pfeil stehen nebeneinander mit bündigen Unterkanten. Rechts sind 32 px für den Pfeil und 14 px Abstand reserviert; lange Titel brechen innerhalb der verbleibenden Breite um. Es gibt keine zusätzliche Pfeilzeile. Spielvorschau/Live/Rückblick: 56-px-Aktionszeile mit mittiger Beschriftung und Pfeil. Der Rand ist dezent mit 45 Prozent der Schriftfarbe abgetönt. Die Vereins-Kachel behält 42 px. Zurück-Pfeile, Monatsnavigation, Aufklapp-Pfeile und Vereinswahl bleiben funktionale Steuerungssymbole ohne diesen Rahmen. Der PDF-Dialog wird beim Einfügen einmal dekoriert, ohne Linkziel oder Beschriftung zu ersetzen.

Die Mannschaftskachel auf der Startseite ist rund 22 px flacher: weniger Abstand zwischen den Zeilen, kleinere Kopf-/Terminzeile und geringere vertikale Innenabstände. Teamzeile, Logos, Schriftgrössen und Platz für den Spieltags-Countdown bleiben erhalten. Die Breite und die unterliegende 56-px-Aktionskachel bleiben gleich; Spielelisten sind ausgenommen.

## Neuer V2-Versuch: QHL-Vereinskarte

Seit 21.10.2026 ergänzt ausschliesslich V2 unter «Tabelle» die QHL-Karte für Kadetten und St. Otmar. Die gemeinsame Basis bleibt erhalten; V1 und Fussball bekommen diese Erweiterung nicht. Einbindung, Quellen, verzögertes Laden und Prüfungen: [QHL-Vereinskarte](qhl-karte.md).


## V2 «Matchday»: das fotografische Magazin (seit 30.10.2026)

Seit #266 und #267 ist V2 ein Magazin mit grossen Vereinsfotos. Alles liegt in `src/client/v2/matchday.css` und `src/client/v2/matchday.js` und wird nur in die Testversion unter `/v2/` eingebunden (Stile auf `html[data-preview='v2']` begrenzt). Die normale App ist unverändert. Einzige Ausnahme in gemeinsamem Code: `pwa.js` öffnet in V2 den Installationshinweis nicht über direkt geöffneten Unterseiten.

- **Startseite als Titelseite.** Vollflächiges Vereinsfoto, Titel nach Spielzustand («UNSER SPIEL.», nach 17 Uhr «UNSER ABEND.», live «MITTEN IM SPIEL.», danach «NACH DEM SPIEL.»), darunter das Spielticket als ganze Verknüpfung (Tage bis zum Spiel, Paarung, Wappen, Zeit oder Resultat, Datum, Spielphase). Es folgen die erste News, der Abschnitt «NAH DRAN.» mit den übrigen News und die Kachel «UNSER VEREIN.». Die früheren Kacheln «Alltag/Spieltag» (Zuletzt, Tabelle) gibt es nicht mehr.
- **Navigation.** Kopfzeile mit dem Schriftzug MATCHDAY (mindestens 44 px hoch). Die Reiter heissen «Magazin» (News) und «Team» (Kader); Ziele und Routen sind unverändert.
- **News:** sechs auf der Startseite, danach «Alle N News anzeigen». Kompakte Textmeldungen haben keinen Pfeil; die Titelmeldung hat 8 px Abstand zwischen Titel und Pfeil, Gitter-Meldungen 14 px.
- **Detailseiten.** Artikel, Spielerprofil, Spielseite, Vereinsseite und Team-Titel übernehmen die Magazinsprache («MATCHCENTER», «Spielerporträt», Kapitelüberschriften). Bestehende Knoten werden verschoben, nicht kopiert. Die Vereins-Kachel steht im Team-Reiter nach den Spielergruppen.
- **Live-Leiste:** schmale Leiste über der Navigation mit Wappen, Stand und Spielphase auf allen Seiten ausser Startseite und dem laufenden Spiel.
- **Typografie:** Anton für Titel, Resultate und Ränge. Kein Text in der V2-Gestaltung ist kleiner als 12 px (Ausnahme: die Quellenangabe der Kartenbibliothek). In den kleinen Kartenmarkern steht die Zahl der Vereine gross, das Wort «Vereine» nur im Namen für Screenreader.
- **Bewegung:** Übergang von Spielkarten zur Spielseite mit View Transitions (wo verfügbar, nicht bei «Bewegung reduzieren»); bei einem Tor springt die Zahl kurz auf, auf Android kurze Vibration; alle Animationen pausieren im Hintergrund.
- **Ladezustände:** Bilder zeigen beim Laden eine dezente Fläche in Vereinsfarbe, fehlende Bilder eine getönte Fläche, fehlende Wappen ein rundes Kürzel-Abzeichen. Auf der dunklen Titelseite ist das Abzeichen hell auf dunkel.
- **Resultat teilen:** auf Seiten beendeter Spiele aller drei Vereine. Ein 1080×1350-Bild (Wappen, Resultat in Anton, Sieg/Unentschieden/Niederlage, Wettbewerb, Datum) entsteht im Browser; Teilen über das System-Menü, sonst Download über einen versteckten Link. Die Schaltfläche hält 64 px Abstand zur hochgezogenen Spielleiste und wird nach Live-Aktualisierungen des Spielkopfs (FCSG) wieder eingesetzt.

Prüfung: `npm run verify` (inklusive `tests/v2-matchday.test.mjs` für Mindestschriftgrösse, Touch-Ziele, Teilen-Schaltfläche und Platzhalter-Kontrast) und die Browser-Skripte nach `npm run build:pages`:

| Skript | Prüft |
| --- | --- |
| `check-v2-mobile.mjs` (auch `check-v2-club-deck.mjs`) | 120 Ansichten (4 Breiten × 3 Vereine × Hell/Dunkel × 5 Routen) gegen V1: Navigation und Steuerelemente, Spieler und Vereinsinhalte, Startseite nur strukturell, News-Pfeile, Vereinsseite, Kalender-Rückweg, getrennte Theme-Speicherung, axe |
| `check-v2-ticket.mjs` | Magazin-Ticket in allen Spielzuständen (34 Szenarien), Live-Leiste, Wappen-Platzhalter, Teilen-Schaltfläche mit Bild-Download, axe |
| `check-v2-readability.mjs` | 60 Ansichten bei 320/390 px: Schriftgrössen, 44-px-Ziele, Statusfenster, axe |
| `check-qhl-map.mjs` | QHL-Karte, Detaildialog, Liste bei Kartenfehlern, V1/Fussball unverändert |

Diese Skripte laufen nicht in GitHub Actions; sie benötigen Playwright, Chromium und axe-core (`GAMES_PLAYWRIGHT_MODULE`, `GAMES_CHROMIUM_EXECUTABLE`, `GAMES_AXE_SCRIPT`). Gemeinsame Seiten (Vereinsgeschichte, Bildlegenden, einzelne Tabellen- und Spielmetadaten) verwenden weiter die 10–11-px-Schriften der geteilten V1-Stile; sie sind nicht Teil dieser Änderung.
