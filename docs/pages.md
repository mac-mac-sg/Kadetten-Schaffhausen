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
