# Veröffentlichung wie Essens-Check

> Stand 06.10.2026: Die App liest seit dem Umschalten vom Cloudflare-Datendienst, siehe [Umzug auf Cloudflare](cloudflare-umzug.md) und [Betrieb](betrieb.md). Der bisherige Sites-Dienst läuft unverändert weiter, wird aber nicht mehr gelesen.

Entscheid vom 03.10.2026: keine separate Testumgebung; GitHub Actions und GitHub Pages wie bei Essens-Check. Für den Datendienst wird das bereits eingerichtete Cloudflare-Konto verwendet.

## Ablauf

Ein Pull Request prüft Syntax, Tests, Pages-Build und Projektpfade. Nach Merge nach main prüft der Workflow nochmals und veröffentlicht ausschliesslich dist/client auf GitHub Pages. Zugangsdaten und Worker-Code werden nicht mitveröffentlicht. Die Pipeline nutzt die gleichen versionierten GitHub-Pages-Actions wie Essens-Check.

Die App verwendet relative Assetpfade, Manifest-Scope und Service-Worker-Scope für `/Kadetten-Schaffhausen/`. `npm run build:pages` erzeugt die öffentliche Oberfläche; `npm run build` behält den bisherigen Sites-Build bei.

Die einmalige Repository-Einstellung ist Settings → Pages → Source → GitHub Actions. Der Workflow versucht die Einrichtung über configure-pages. Wenn GitHub diese administrative Aktion mit seinem Workflow-Token nicht zulässt, muss der Eigentümer die Einstellung einmal selbst setzen und den Workflow erneut ausführen.

## Datendienst

GitHub Pages führt kein Worker-Backend aus. Für die bestehenden Funktionen ist der Datendienst auf Cloudflare Workers zuständig: https://kadetten-api.mac-mac-sg.workers.dev (Worker `kadetten-api`, Speicher Workers KV; Aufbau und Verlauf des Umzugs: docs/cloudflare-umzug.md). Der bisherige Sites-Datendienst unter https://kadetten.ma-ra10.chatgpt.site läuft unverändert weiter, wird von der Pages-App aber nicht mehr gelesen.

- News und vollständige versionierte Artikel im KV-Speicher
- Spielplan, Tabellen und Spielerwerte, aktualisiert durch den Workflow «Cloudflare-Datenaktualisierung» (GitHub Actions, Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20)
- bestätigte Live-Werte, Formkurven und Direktvergleiche (beim Aufruf aus den externen Quellen geholt)

Die Pages-App liest diese öffentlichen APIs ohne Cookies und ohne Zugangsschlüssel. Der Dienst erlaubt CORS ausschliesslich für öffentliche GET-Endpunkte und den Ursprung https://mac-mac-sg.github.io. Schreib-/Login-Endpunkte erhalten keine CORS-Freigabe. Die GitHub-App besitzt keinen manuellen Aktualisieren-Button und keinen Freigabeablauf. Sie liest den zuletzt automatisch aktualisierten Datenstand; Live-Abfragen bleiben unabhängig davon erhalten. Matchprogramme, Vorschauen und Rückblicke entstehen im autorisierten Actions-Schreiblauf und werden vom Datendienst ausgeliefert.

Das ist eine Migration von Codebasis, Oberfläche und Veröffentlichung nach GitHub. Der Datendienst bleibt eine ausdrücklich dokumentierte Abhängigkeit. Vollständige Artikel und laufende Statistiken werden nicht in Git-Commits kopiert. Es gibt keine separate Testumgebung.

## Betrieb und Rückkehr

Der ursprüngliche Sites-Link bleibt erreichbar. Zum Zurückschalten auf den bisherigen Datendienst genügt ein Revert der Umschalt-Änderung (`apiOrigin` in `scripts/build.mjs` und `connect-src` in `src/client/index.html`); solange der bisherige Dienst nicht abgeschaltet ist, liefert er seinen letzten Stand. Zum Rücknehmen einer fehlerhaften UI-Version den entsprechenden Merge auf main mit einem neuen Commit rückgängig machen; die Pages-Pipeline veröffentlicht diesen Stand. Bei einem Datendienst-Ausfall kennzeichnet die App den letzten gespeicherten Stand. Live-Antworten werden nie aus dem Offline-Cache angezeigt.


### Arena-Hintergrund auf der News-Startseite
Die drei Vereine verwenden lokal ausgelieferte Fotos hinter Kopfzeile und Spieltagsblock. Alle drei Fotos werden mit der Offline-Hülle vorgeladen und im Build-Hash berücksichtigt. Vereinsfarbene Lichtverläufe, leichte Unschärfe und dunkle Glasflächen erhalten die Lesbarkeit. Das bereits abgedunkelte Otmar-Banner wird nur per CSS aufgehellt.

Bildquellen:
- Kadetten: BBC Arena, bestehendes Foto `assets/bbc-arena-hall.webp`.
- FCSG: FC St.Gallen 1879, Berit Sitterstadion, https://www.fcsg.ch/pages/beritklinik; Bild https://cdn.shopify.com/s/files/1/0694/0681/8529/files/berit-sitterstadion.jpg?v=1782912949&width=1200; lokale Datei `assets/fcsg-stadium.jpg`.
- St. Otmar: TSV St.Otmar, Kreuzbleiche-Tribüne, https://otmar.ch/; Bild https://data.otmar.ch/data/home/_headerSplashScreen/70186/Kreuzbleiche-Tribuene-Herobanner.webp; lokale Datei `assets/otmar-kreuzbleiche.webp`.

### Einführung & Tipps
Beim ersten Öffnen auf einem Gerät erscheint eine überspringbare Einführung in vier Schritten: Vereinswahl, News, Spiele und Kader. Abschluss, Überspringen und Escape speichern `fan-app-onboarding-v1` lokal. Auf der Startseite unter Einstellungen → Einführung & Tipps lässt sich die Einführung jederzeit erneut öffnen, auch in der installierten App. Nach dem ersten vollständigen Durchlauf kann der bestehende Installationshinweis folgen; eine Installation erfolgt weiterhin nur nach ausdrücklichem Klick. Die erneut geöffnete Einführung zeigt keinen Installationshinweis.

### Einheitliche Bedienung und Offline-Nutzung
Spielbereiche verwenden «Statistiken» und für laufende Ereignisse «Liveticker». Handball-Rückblicke bleiben als eigene Berichte bezeichnet. Spielerprofile haben bei allen Vereinen die Abschnitte Steckbrief und Statistik sowie einen klaren Rückweg zum Kader. Der Handball-Steckbrief bleibt bewusst bildfüllend; FCSG behält den Vereinskontext in der Kopfzeile.

Die FCSG-Spielseite nutzt einen kompakten Detailkopf ohne erneuten Link auf dieselbe Seite. Der Spielplan markiert das nächste Spiel innerhalb des gewählten Wettbewerbs. Der Kalender startet im aktuellen Schweizer Monat. Bereichsspezifische Quellenfehler und verzögerte Datenstände erscheinen bei den jeweiligen Inhalten.

Alle drei Vereins-Snapshots sowie bereits gelesene Artikel werden offline gesichert. Versionierte Artikel werden nur mit passender Version gespeichert; nicht versionierte Otmar-Artikel werden online zuerst neu gelesen. Der Bildcache berücksichtigt die offiziellen Bildhosts aller drei Vereine. Live- und Verlaufsabfragen bleiben ausschliesslich im Netz. EHF-Bilanzbalken entstehen nur aus einer vollständigen, mit Tabellenpunkten übereinstimmenden Resultatliste; Punkte allein erlauben keine eindeutige Bilanz.

### Auslieferung und Ladevolumen
Der Build bündelt die in `index.html` geordneten Quellskripte zu `js/app.js` und die vier Stylesheets zu `app.css`. Die Plattformkonfiguration bleibt ein eigenes Skript; beide Skripte werden mit `defer` in definierter Reihenfolge ausgeführt. Die Quellmodule bleiben für Entwicklung und Tests getrennt. PDF.js wird erst beim Öffnen eines Matchprogramms geladen; sein Worker wird relativ zur App-Basis adressiert.

Der Versionshash berücksichtigt Quellmodule und erzeugte Dateien. Die veröffentlichte Service-Worker-Hülle enthält die erzeugten Dateien und erhält bei der Aktivierung die gespeicherten Vereins-Snapshots. `check-pages.mjs` prüft Dateipfade, Reihenfolge, `defer`, gemeinsame Cache-Version und PDF-Dateien.

Messung vom 12.10.2026 (JavaScript und CSS, ohne Bilder/API-Antworten): 30 Abrufe → 3, 644'018 → 533'192 unkomprimierte Bytes, 161'339 → 124'465 Bytes bei lokal gemessener Gzip-Kompression. Das ist eine Volumenmessung, keine pauschale Aussage zur Ladezeit auf einem konkreten Gerät. 60 Ansichten bei 390/1280 px wurden mit identischen Daten verglichen; die geprüften Layout- und Stilwerte stimmen überein. Doppelte beziehungsweise überlagerte Deklarationen und Regeln des ehemaligen Vereinswechsel-/Refresh-Knopfs wurden entfernt; bestehende Fallbackketten und Bewegungseinstellungen bleiben berücksichtigt.

### Meine Woche und visuelle Einführung
Unter Spiele ergänzt «Meine Woche» Liste und Kalender. Die Wochenansicht zeigt ausschliesslich die in den Einstellungen ausgewählten Vereine, unabhängig vom aktiven Verein. Sie startet mit der aktuellen Schweizer Kalenderwoche (Montag bis Sonntag), ordnet Spiele nach Tag und bestätigter Anspielzeit und fasst Begegnungen zweier ausgewählter Vereine zusammen. Vor-/Zurück-Pfeile und «Diese Woche» wechseln die Woche; leere Wochen bieten einen Sprung zur nächsten veröffentlichten Partie.

Spielkarten zeigen Vereinskennzeichen, Wettbewerb, Heim-/Auswärtsspiel und bestätigte Spielstände. Öffnen wechselt bei Bedarf direkt in den passenden Vereinsbereich; Browser-Zurück führt wieder zur gemeinsamen Woche. Solange die Ansicht sichtbar ist, werden die offiziellen Live-Endpunkte aller ausgewählten Vereine alle 30 Sekunden abgefragt. Fehler behalten den letzten gültigen Stand mit Hinweis. Live-Daten bleiben flüchtig; offline stehen die gespeicherten Spielpläne zur Verfügung. Der aufklappbare Datenstand nennt jeden Verein einzeln.

Die vier Einführungsschritte enthalten dekorative Beispiele für Vereinswahl, News, Wochenansicht sowie Kader mit hervorgehobenem Vereinswappen für Geschichte und Erfolge. Die gespeicherte Einführungsversion bleibt gleich: Bestehende Nutzer erhalten keinen erneuten automatischen Durchlauf und können sie über die Einstellungen öffnen.

### Stabile Kopfzeile im Spielplan
Liste und Kalender verwenden dieselben Abstände, Schriftgrössen und die gleiche Vereinskopfzeile. Die kompakte Darstellung auf niedrigen Displays gilt für beide Ansichten; «1. Mannschaft …», Titel und Umschalter wechseln deshalb nicht ihre Position. Der Kalender bleibt im sichtbaren Bereich ohne Seitenscrollen. Die einpixelige Überlappung zwischen Vereinskopf und Spielplan bleibt erhalten.

Die optionale Browser-Regression `node scripts/check-games-layout.mjs` läuft nach `npm run build:pages` mit installiertem Playwright/Chromium. Sie prüft Liste → Kalender → Liste bei allen drei Vereinen, vier Fenstergrössen und mit/ohne Partien. Vorhandene Browser-Runtimes können über `GAMES_PLAYWRIGHT_MODULE` und `GAMES_CHROMIUM_EXECUTABLE` eingebunden werden; produktive Daten und zusätzliche npm-Abhängigkeiten sind nicht erforderlich.
