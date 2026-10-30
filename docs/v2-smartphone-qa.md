# V2: Smartphone-Prüfung

Die V2 ist für Smartphone-Nutzung bestimmt. Der Prüfstand verwendet Chromium mit mobilem Viewport und Touch-Eingabe; er ersetzt keinen Test auf einem physischen iPhone oder Android-Gerät.

## Wiederholen

Nach `npm ci` und `npm run build:pages`:

```sh
GAMES_AXE_SCRIPT=/pfad/zu/axe.min.js node scripts/check-v2-mobile.mjs
```

Ein installiertes Playwright mit Chromium ist erforderlich. `GAMES_PLAYWRIGHT_MODULE` und `GAMES_CHROMIUM_EXECUTABLE` erlauben vorhandene Laufzeitinstallationen. `MOBILE_QA_SCREENSHOTS` kann auf einen bestehenden Ausgabeordner zeigen. Diese optionalen Browserwerkzeuge werden nicht als App-Abhängigkeiten ausgeliefert.

## Aktueller Prüfstand ab 30. Oktober 2026 (Magazin)

V2 ist seit #266/#267 das «Matchday»-Magazin und nicht mehr inhaltsgleich mit V1. Prüfbefehle und Umfang stehen in [design-v2.md](design-v2.md). Zusammengefasst, nach `npm run build:pages`:

- `check-v2-mobile.mjs`: 120 Ansichten (360/390/430/1280 px × drei Vereine × Hell/Dunkel × fünf Hauptrouten). Vergleich mit V1 für Navigation, Steuerelemente, Spieler und Vereinsinhalt; die Magazin-Startseite wird strukturell geprüft. Eine Hauptüberschrift, kein Überlauf, keine Skriptfehler, keine neuen axe-core-Verstösse.
- `check-v2-ticket.mjs`: alle Spielzustände, Live-Leiste, Wappen-Platzhalter, «Resultat teilen» mit Bild-Download (34 Szenarien).
- `check-v2-readability.mjs`: 60 Ansichten bei 320/390 px, Schriften ab 12 px, 44-px-Ziele, Statusfenster.
- `check-qhl-map.mjs`: 16 Kartenansichten, V1/Fussball unverändert.

Behoben am 30. Oktober 2026: «Resultat teilen» lag auf Handball-Spielseiten unter der Spielleiste und fehlte bei FCSG nach Live-Aktualisierungen; Wappen-Abzeichen waren auf der dunklen Titelseite dunkel auf dunkel; Text unter 12 px; MATCHDAY-Schriftzug nur 31 px hoch; der Download-Link des Teilen-Bilds war kurz ohne Namen im DOM.

Der Prüfstand verwendet Chromium mit mobilem Viewport; er ersetzt keinen Test auf einem physischen iPhone oder Android-Gerät.

## Prüfstand 20. Oktober 2026 (V2 gleich V1, überholt)

Damals verglich der Lauf 60 Ansichten direkt mit V1 (identische Inhalte, Geometrie und Farben). Das gilt nach dem Magazin-Umbau nicht mehr.

## Historischer Prüfstand vor dem Zurücksetzen (13. Oktober 2026)

120 Ansichten: 360/375/390/430 CSS-px × Kadetten/FCSG/St. Otmar × Hell/Dunkel × News/Spiele/Tabelle/Kader/Verein. Jede Ansicht wird auf horizontalen Überlauf, genau eine Hauptüberschrift und axe-core-Verstösse (WCAG 2 A/AA und 2.1 AA) geprüft. Die V2-Testwerkzeuge und News-Leselinks müssen mindestens 44 px hoch sein. Drei Touch-Abläufe prüfen auf der Vereinsseite die Scrollleiste über Foto/Inhalt und den Vereinswechsel mit Rückkehr nach oben, danach Liste/Kalender/Meine Woche sowie Einstellungen. Die wiederhergestellte erste V2-Startseite verwendet grosse Newsbilder ohne kompakte News oder zusätzliche Scrollleiste.

Vor der Korrektur meldete axe-core Kontrastfehler auf hellen Flächen: Spielmetadaten, Tabellenwerte, Saisonstatistiken, Kaderüberschrift und Vereinshistorie hatten noch feste Farben des ursprünglichen dunklen Designs. Zusätzlich waren Thema, Spielzustände, Original-Link und kurze Leselinks nur 15–39 px hoch. Die V2 verwendet jetzt passende Textfarben pro Fläche und mindestens 44 px hohe Bedienelemente. Dunkle Bild- und Trophäenbereiche behalten helle Texte. Der Regressionstest schlägt mit dem vorherigen V2-Stylesheet fehl.

Die Prüfung verwendet unveränderte mitgelieferte Vereinsdaten und blockiert externe Bild- und API-Abrufe zugunsten reproduzierbarer lokaler Antworten. Lokale Bilder und Spielerfotos werden gerendert. Sie bestätigt weder die Aktualität der produktiven Daten noch Ladezeiten im Mobilfunknetz. Browserleisten, Geräte-Safe-Areas, Installation, echte Safari-Darstellung und Betrieb im installierten PWA-Modus brauchen weiterhin Geräteprüfungen. Die bestehende Original-App wird nicht verändert.

## Wiederherstellung der ersten V2-Startseite

Auf Wunsch wurde am 13. Oktober 2026 die Startseiten-Komposition vor PR #148 zurückgeholt: erste grosse Nachricht im Einstieg, weitere Nachrichten mit grossen Bildern, Entdecken-Layer nach dem vollständigen Newsfeed. Die Startseite erhält keine Reveal-Marker und keine zusätzliche Scrollleiste. Die neuere Vereinsseite und die Smartphone-Kontrastkorrekturen bleiben erhalten. Die braune Entdecken-Fläche bleibt leicht dunkler als im ersten Entwurf, damit die weisse Beschriftung lesbar ist. `tests/v2.test.mjs` sichert die Komposition für alle drei Vereine und alle vorhandenen Artikel.
