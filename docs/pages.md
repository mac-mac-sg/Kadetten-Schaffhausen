# Veröffentlichung wie Essens-Check

> Stand 06.10.2026: Der Datendienst soll auf Cloudflare umziehen, siehe [Umzug auf Cloudflare](cloudflare-umzug.md). Bis zum Umschalten gilt weiterhin der hier beschriebene Sites-Datendienst.

Entscheid vom 03.10.2026: keine separate Testumgebung; GitHub Actions und GitHub Pages wie bei Essens-Check. Kein eigenes Cloudflare-Konto erforderlich.

## Ablauf

Ein Pull Request prüft Syntax, Tests, Pages-Build und Projektpfade. Nach Merge nach main prüft der Workflow nochmals und veröffentlicht ausschliesslich dist/client auf GitHub Pages. Zugangsdaten und Worker-Code werden nicht mitveröffentlicht. Die Pipeline nutzt die gleichen versionierten GitHub-Pages-Actions wie Essens-Check.

Die App verwendet relative Assetpfade, Manifest-Scope und Service-Worker-Scope für `/Kadetten-Schaffhausen/`. `npm run build:pages` erzeugt die öffentliche Oberfläche; `npm run build` behält den bisherigen Sites-Build bei.

Die einmalige Repository-Einstellung ist Settings → Pages → Source → GitHub Actions. Der Workflow versucht die Einrichtung über configure-pages. Wenn GitHub diese administrative Aktion mit seinem Workflow-Token nicht zulässt, muss der Eigentümer die Einstellung einmal selbst setzen und den Workflow erneut ausführen.

## Datendienst

GitHub Pages führt kein Worker-Backend aus. Für die bestehenden Funktionen bleibt deshalb der bereits laufende Sites-Datendienst unter https://kadetten.ma-ra10.chatgpt.site zuständig:

- News und vollständige versionierte Artikel im vorhandenen Objektspeicher
- Spielplan, Tabellen und Spielerwerte mit bestehenden Zweistunden-Updates
- bestätigte Live-Werte, Formkurven und Direktvergleiche

Die Pages-App liest diese öffentlichen APIs ohne Cookies und ohne Zugangsschlüssel. Der Dienst erlaubt CORS ausschliesslich für öffentliche GET-Endpunkte und den Ursprung https://mac-mac-sg.github.io. Schreib-/Login-Endpunkte erhalten keine CORS-Freigabe. Das Aktualisieren des Datenbestands erfolgt weiter automatisch oder über den Eigentümerzugang auf der bisherigen Sites-App. Die GitHub-App besitzt keinen manuellen Aktualisieren-Button und keinen Freigabeablauf. Sie liest den zuletzt automatisch aktualisierten Datenstand; Live-Abfragen bleiben unabhängig davon erhalten.

Das ist eine Migration von Codebasis, Oberfläche und Veröffentlichung nach GitHub. Der Datendienst bleibt eine ausdrücklich dokumentierte Abhängigkeit. Vollständige Artikel und laufende Statistiken werden nicht in Git-Commits kopiert. Es gibt keine separate Testumgebung.

## Betrieb und Rückkehr

Der ursprüngliche Sites-Link bleibt erreichbar und die bisherige Datenautomation bleibt aktiv. Zum Rücknehmen einer fehlerhaften UI-Version den entsprechenden Merge auf main mit einem neuen Commit rückgängig machen; die Pages-Pipeline veröffentlicht diesen Stand. Bei einem Datendienst-Ausfall kennzeichnet die App den letzten gespeicherten Stand. Live-Antworten werden nie aus dem Offline-Cache angezeigt.
