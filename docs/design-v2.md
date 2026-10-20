# V2: aktuelle V1 als Design-Testbasis

Seit 20. Oktober 2026 startet die bestehende Testversion unter https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/ mit der vollständigen aktuellen V1-Oberfläche. News, Spiele, Liste/Kalender/Wettbewerb, Tabelle, Einstellungen und Matchansichten verwenden dieselben Renderer und Styles. Kader und Vereinsseite erhalten ausschliesslich in V2 die unten beschriebene Erweiterung. Die früheren V2-Experimente sind zurückgesetzt und über den Git-Verlauf vor dieser Änderung wiederherstellbar.

V1 bleibt unter der bisherigen Startadresse unverändert. Beide Builds lesen dieselben öffentlichen Cloudflare-Daten; es gibt keine zusätzlichen Datenjobs oder Schreibzugänge. Aktuelle gemeinsame Fehlerkorrekturen erreichen beide Versionen.

## Trennung und weitere Experimente

`scripts/build-pages.mjs` erstellt beide Fassungen. Nur V2 lädt zusätzlich `v2/design.js` und `v2/design.css`. Das Skript markiert `data-preview="v2"`, setzt aber ausdrücklich nicht `data-design="v2"`: damit bleiben sämtliche aktuellen V1-Styles und Verhaltenszweige aktiv. Neue Designversuche werden auf `html[data-preview="v2"]` begrenzt und ändern die öffentliche V1 nicht.

V2 behält die eigene Manifest-Bezeichnung, relative PWA-ID und Scope sowie `v2:` vor allen Browser-Speicherschlüsseln. Auch der frühe Themenstart liest ausschliesslich den V2-Schlüssel. Vorhandene V2-Vereinsauswahl und Daten bleiben erhalten, V1-Einstellungen werden nicht überschrieben. Die Testversion kann unabhängig installiert und offline verwendet werden. Der Haupt-Service-Worker lässt den V2-Pfad passieren.

## Prüfung

`npm run verify` prüft den unveränderten V1-Start, die unveränderten übrigen Renderer, ausschliesslich in V2 enthaltene Vereins-Styles, isolierte Speicherung und PWA-Pfade. `node scripts/check-v2-mobile.mjs` vergleicht die unveränderten Ansichten beider Oberflächen und prüft die neue Vereinsansicht bei identischen Daten für alle drei Vereine, Hell/Dunkel und Smartphone/Desktop: Inhalte, Geometrie, Farben, Einstellungen, Kalender-Rückweg, eine Hauptüberschrift, kein horizontaler Überlauf, keine Skriptfehler und keine neuen axe-core-Verstösse gegenüber V1. Browser-/axe-Pfade können wie bisher über GAMES_PLAYWRIGHT_MODULE, GAMES_CHROMIUM_EXECUTABLE und GAMES_AXE_SCRIPT gesetzt werden.

## Vereinsansicht: geschwungener Bildauftakt

Im Kader steht vor der ersten Spielergruppe eine vollständig verlinkte Kachel «Unser Verein» mit lokal vorhandenem Arenabild, ruhiger asymmetrischer Kurve und Vereinsfarbe. Die Kachel ist rund 240 px hoch. Sie öffnet die bestehende Route #club; Browserhistorie und Zurück zum Kader bleiben nutzbar.

Die Vereinsseite übernimmt das vorhandene Archiv-Titelbild samt Originalbeschriftung. Ein statischer SVG-Bogen führt in eine gedeckte Farbfläche mit Vereinsname und kurzem Vereinssatz über. Hellmodus: Pastellorange, Grün oder Gelb; Dunkelmodus: tiefe entsprechende Töne. Keine animierte Welle, keine verschachtelten Kachelebenen.

Darunter folgen «Unsere Erfolge» mit unveränderten Titelkategorien, Titeljahren und historischen Verknüpfungen sowie «Unsere Geschichte» als normal scrollende Zeitleiste mit schmalem Jahresstrahl links. Alle Chroniktexte, Archivbilder, Bildnachweise und Quellen bleiben erhalten. Archivbilder werden bei Quellenfehlern wie bisher ausgeblendet, ohne eine andere Aufnahme als historisches Original auszugeben.

V2 umschliesst nur squad/fcsgSquad und clubPage/fcsgClubPage. Tests prüfen den vollständigen Erhalt aller Spieler und aller Erfolgs-/Chronik-/Quelleninhalte. Die Browserprüfung deckt die Einstiegskachel, Tastaturöffnung, Titelwahl, historische Sprünge, Browser-Zurück und isolierte Theme-Speicherung ab.

## Runde Absprung-Pfeile

Vorwärts-Absprünge übernehmen den feinen Kreis der Vereins-Kachel, kompakt auf 32 px mit 17-px-SVG-Pfeil ↗: News, Spielvorschau/Live/Rückblick, historische Momente, Disclaimer und externes PDF. Alle Absprung-Pfeile zeigen einheitlich schräg nach oben. Die komplette ursprüngliche Klickfläche bleibt erhalten. News: Datum und Pfeil teilen eine feste Metadatenzeile; der Titel nutzt die ganze Breite. Spielvorschau/Live/Rückblick: 56-px-Aktionszeile mit mittiger Beschriftung und Pfeil. Der Rand ist dezent mit 45 Prozent der Schriftfarbe abgetönt. Die Vereins-Kachel behält 42 px. Zurück-Pfeile, Monatsnavigation, Aufklapp-Pfeile und Vereinswahl bleiben funktionale Steuerungssymbole ohne diesen Rahmen. Der PDF-Dialog wird beim Einfügen einmal dekoriert, ohne Linkziel oder Beschriftung zu ersetzen.
