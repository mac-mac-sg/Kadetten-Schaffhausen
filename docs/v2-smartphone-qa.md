# V2: Smartphone-Prüfung

Die V2 ist für Smartphone-Nutzung bestimmt. Der Prüfstand verwendet Chromium mit mobilem Viewport und Touch-Eingabe; er ersetzt keinen Test auf einem physischen iPhone oder Android-Gerät.

## Wiederholen

Nach `npm ci` und `npm run build:pages`:

```sh
GAMES_AXE_SCRIPT=/pfad/zu/axe.min.js node scripts/check-v2-mobile.mjs
```

Ein installiertes Playwright mit Chromium ist erforderlich. `GAMES_PLAYWRIGHT_MODULE` und `GAMES_CHROMIUM_EXECUTABLE` erlauben vorhandene Laufzeitinstallationen. `MOBILE_QA_SCREENSHOTS` kann auf einen bestehenden Ausgabeordner zeigen. Diese optionalen Browserwerkzeuge werden nicht als App-Abhängigkeiten ausgeliefert.

## Aktueller Prüfstand ab 20. Oktober 2026

V2 wurde auf die aktuelle V1 zurückgesetzt. Der aktuelle Browserlauf vergleicht 60 Ansichten (390/1280 px × drei Vereine × Hell/Dunkel × fünf Hauptrouten) direkt mit V1. Er prüft identische Inhalte, Geometrie und Farben, eine Hauptüberschrift, keinen Überlauf, keine Skriptfehler und keine neuen axe-core-Verstösse gegenüber V1. Dazu kommen Kalender → Liste und isolierte Themen-Einstellungen mit erneutem Laden. Der frühere Kartenstapel-Test verweist jetzt auf diesen Lauf.

Ergebnis des Baseline-Laufs: 60/60 Ansichten stimmen mit V1 überein; keine Skriptfehler oder Überläufe, eine Hauptüberschrift, Kalender-Rückweg und getrennte Themen-Speicherung erfolgreich. Bei 390 px keine axe-core-Verstösse. Ein bereits in V1 vorhandener Kontrasthinweis betrifft bei 1280 px den Bilanztext der Kadetten-Zeile in der dunklen Tabelle (`.our-team .record-text`); V2 übernimmt diesen Stand unverändert. Keine neuen Verstösse.

Zusätzlich wurden V1-HTML, Stylesheet, Skriptbündel, Service Worker und Manifest gegen einen Build des vorherigen Main-Commits verglichen: bytegleich.

## Historischer Prüfstand vor dem Zurücksetzen (13. Oktober 2026)

120 Ansichten: 360/375/390/430 CSS-px × Kadetten/FCSG/St. Otmar × Hell/Dunkel × News/Spiele/Tabelle/Kader/Verein. Jede Ansicht wird auf horizontalen Überlauf, genau eine Hauptüberschrift und axe-core-Verstösse (WCAG 2 A/AA und 2.1 AA) geprüft. Die V2-Testwerkzeuge und News-Leselinks müssen mindestens 44 px hoch sein. Drei Touch-Abläufe prüfen auf der Vereinsseite die Scrollleiste über Foto/Inhalt und den Vereinswechsel mit Rückkehr nach oben, danach Liste/Kalender/Meine Woche sowie Einstellungen. Die wiederhergestellte erste V2-Startseite verwendet grosse Newsbilder ohne kompakte News oder zusätzliche Scrollleiste.

Vor der Korrektur meldete axe-core Kontrastfehler auf hellen Flächen: Spielmetadaten, Tabellenwerte, Saisonstatistiken, Kaderüberschrift und Vereinshistorie hatten noch feste Farben des ursprünglichen dunklen Designs. Zusätzlich waren Thema, Spielzustände, Original-Link und kurze Leselinks nur 15–39 px hoch. Die V2 verwendet jetzt passende Textfarben pro Fläche und mindestens 44 px hohe Bedienelemente. Dunkle Bild- und Trophäenbereiche behalten helle Texte. Der Regressionstest schlägt mit dem vorherigen V2-Stylesheet fehl.

Die Prüfung verwendet unveränderte mitgelieferte Vereinsdaten und blockiert externe Bild- und API-Abrufe zugunsten reproduzierbarer lokaler Antworten. Lokale Bilder und Spielerfotos werden gerendert. Sie bestätigt weder die Aktualität der produktiven Daten noch Ladezeiten im Mobilfunknetz. Browserleisten, Geräte-Safe-Areas, Installation, echte Safari-Darstellung und Betrieb im installierten PWA-Modus brauchen weiterhin Geräteprüfungen. Die bestehende Original-App wird nicht verändert.

## Wiederherstellung der ersten V2-Startseite

Auf Wunsch wurde am 13. Oktober 2026 die Startseiten-Komposition vor PR #148 zurückgeholt: erste grosse Nachricht im Einstieg, weitere Nachrichten mit grossen Bildern, Entdecken-Layer nach dem vollständigen Newsfeed. Die Startseite erhält keine Reveal-Marker und keine zusätzliche Scrollleiste. Die neuere Vereinsseite und die Smartphone-Kontrastkorrekturen bleiben erhalten. Die braune Entdecken-Fläche bleibt leicht dunkler als im ersten Entwurf, damit die weisse Beschriftung lesbar ist. `tests/v2.test.mjs` sichert die Komposition für alle drei Vereine und alle vorhandenen Artikel.
