# Veröffentlichung wie Essens-Check

> Stand 06.10.2026: Der Datendienst soll auf Cloudflare umziehen, siehe [Umzug auf Cloudflare](cloudflare-umzug.md). Bis zum Umschalten gilt weiterhin der hier beschriebene Sites-Datendienst.

Entscheid vom 03.10.2026: keine separate Testumgebung; GitHub Actions und GitHub Pages wie bei Essens-Check. Kein eigenes Cloudflare-Konto erforderlich.

## Ablauf

Ein Pull Request prüft Syntax, Tests, Pages-Build und Projektpfade. Nach Merge nach main prüft der Workflow nochmals und veröffentlicht ausschliesslich dist/client auf GitHub Pages. Zugangsdaten und Worker-Code werden nicht mitveröffentlicht. Die Pipeline nutzt die gleichen versionierten GitHub-Pages-Actions wie Essens-Check.

Die App verwendet relative Assetpfade, Manifest-Scope und Service-Worker-Scope für `/Kadetten-Schaffhausen/`. `npm run build:pages` erzeugt die öffentliche Oberfläche; `npm run build` behält den bisherigen Sites-Build bei.

Die einmalige Repository-Einstellung ist Settings → Pages → Source → GitHub Actions. Der Workflow versucht die Einrichtung über configure-pages. Wenn GitHub diese administrative Aktion mit seinem Workflow-Token nicht zulässt, muss der Eigentümer die Einstellung einmal selbst setzen und den Workflow erneut ausführen.

## Datendienst

GitHub Pages führt kein Worker-Backend aus. Für die bestehenden Funktionen ist der Datendienst auf Cloudflare Workers zuständig: https://kadetten-api.mac-mac-sg.workers.dev (Worker `kadetten-api`, Speicher Workers KV; Aufbau und Verlauf des Umzugs: docs/cloudflare-umzug.md). Der bisherige Sites-Datendienst unter https://kadetten.ma-ra10.chatgpt.site läuft unverändert weiter, wird von der Pages-App aber nicht mehr gelesen.

- News und vollständige versionierte Artikel im KV-Speicher
- Spielplan, Tabellen und Spielerwerte, aktualisiert durch den Workflow «Cloudflare-Datenaktualisierung» (GitHub Actions, Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20)
- bestätigte Live-Werte, Formkurven und Direktvergleiche (beim Aufruf aus den externen Quellen geholt)

Die Pages-App liest diese öffentlichen APIs ohne Cookies und ohne Zugangsschlüssel. Der Dienst erlaubt CORS ausschliesslich für öffentliche GET-Endpunkte und den Ursprung https://mac-mac-sg.github.io. Schreib-/Login-Endpunkte erhalten keine CORS-Freigabe. Die GitHub-App besitzt keinen manuellen Aktualisieren-Button und keinen Freigabeablauf. Sie liest den zuletzt automatisch aktualisierten Datenstand; Live-Abfragen bleiben unabhängig davon erhalten. Neue Matchprogramme und KI-Vorschauen entstehen auf dem neuen Dienst noch nicht (Phase 2b in docs/cloudflare-umzug.md); vorhandene werden ausgeliefert.

Das ist eine Migration von Codebasis, Oberfläche und Veröffentlichung nach GitHub. Der Datendienst bleibt eine ausdrücklich dokumentierte Abhängigkeit. Vollständige Artikel und laufende Statistiken werden nicht in Git-Commits kopiert. Es gibt keine separate Testumgebung.

## Betrieb und Rückkehr

Der ursprüngliche Sites-Link bleibt erreichbar. Zum Zurückschalten auf den bisherigen Datendienst genügt ein Revert der Umschalt-Änderung (`apiOrigin` in `scripts/build.mjs` und `connect-src` in `src/client/index.html`); solange der bisherige Dienst nicht abgeschaltet ist, liefert er seinen letzten Stand. Zum Rücknehmen einer fehlerhaften UI-Version den entsprechenden Merge auf main mit einem neuen Commit rückgängig machen; die Pages-Pipeline veröffentlicht diesen Stand. Bei einem Datendienst-Ausfall kennzeichnet die App den letzten gespeicherten Stand. Live-Antworten werden nie aus dem Offline-Cache angezeigt.
