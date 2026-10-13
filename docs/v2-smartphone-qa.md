# V2: Smartphone-Prüfung

Die V2 ist für Smartphone-Nutzung bestimmt. Der Prüfstand verwendet Chromium mit mobilem Viewport und Touch-Eingabe; er ersetzt keinen Test auf einem physischen iPhone oder Android-Gerät.

## Wiederholen

Nach `npm ci` und `npm run build:pages`:

```sh
GAMES_AXE_SCRIPT=/pfad/zu/axe.min.js node scripts/check-v2-mobile.mjs
```

Ein installiertes Playwright mit Chromium ist erforderlich. `GAMES_PLAYWRIGHT_MODULE` und `GAMES_CHROMIUM_EXECUTABLE` erlauben vorhandene Laufzeitinstallationen. `MOBILE_QA_SCREENSHOTS` kann auf einen bestehenden Ausgabeordner zeigen. Diese optionalen Browserwerkzeuge werden nicht als App-Abhängigkeiten ausgeliefert.

## Umfang und Befunde am 13. Oktober 2026

120 Ansichten: 360/375/390/430 CSS-px × Kadetten/FCSG/St. Otmar × Hell/Dunkel × News/Spiele/Tabelle/Kader/Verein. Jede Ansicht wird auf horizontalen Überlauf, genau eine Hauptüberschrift und axe-core-Verstösse (WCAG 2 A/AA und 2.1 AA) geprüft. Die V2-Testwerkzeuge und News-Leselinks müssen mindestens 44 px hoch sein. Drei Touch-Abläufe prüfen auf der Vereinsseite die Scrollleiste über Foto/Inhalt und den Vereinswechsel mit Rückkehr nach oben, danach Liste/Kalender/Meine Woche sowie Einstellungen. Die wiederhergestellte erste V2-Startseite verwendet grosse Newsbilder ohne kompakte News oder zusätzliche Scrollleiste.

Vor der Korrektur meldete axe-core Kontrastfehler auf hellen Flächen: Spielmetadaten, Tabellenwerte, Saisonstatistiken, Kaderüberschrift und Vereinshistorie hatten noch feste Farben des ursprünglichen dunklen Designs. Zusätzlich waren Thema, Spielzustände, Original-Link und kurze Leselinks nur 15–39 px hoch. Die V2 verwendet jetzt passende Textfarben pro Fläche und mindestens 44 px hohe Bedienelemente. Dunkle Bild- und Trophäenbereiche behalten helle Texte. Der Regressionstest schlägt mit dem vorherigen V2-Stylesheet fehl.

Die Prüfung verwendet unveränderte mitgelieferte Vereinsdaten und blockiert externe Bild- und API-Abrufe zugunsten reproduzierbarer lokaler Antworten. Lokale Bilder und Spielerfotos werden gerendert. Sie bestätigt weder die Aktualität der produktiven Daten noch Ladezeiten im Mobilfunknetz. Browserleisten, Geräte-Safe-Areas, Installation, echte Safari-Darstellung und Betrieb im installierten PWA-Modus brauchen weiterhin Geräteprüfungen. Die bestehende Original-App wird nicht verändert.

## Wiederherstellung der ersten V2-Startseite

Auf Wunsch wurde am 13. Oktober 2026 die Startseiten-Komposition vor PR #148 zurückgeholt: erste grosse Nachricht im Einstieg, weitere Nachrichten mit grossen Bildern, Entdecken-Layer nach dem vollständigen Newsfeed. Die Startseite erhält keine Reveal-Marker und keine zusätzliche Scrollleiste. Die neuere Vereinsseite und die Smartphone-Kontrastkorrekturen bleiben erhalten. Die braune Entdecken-Fläche bleibt leicht dunkler als im ersten Entwurf, damit die weisse Beschriftung lesbar ist. `tests/v2.test.mjs` sichert die Komposition für alle drei Vereine und alle vorhandenen Artikel.
