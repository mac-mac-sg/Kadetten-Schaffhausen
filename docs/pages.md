# Veröffentlichung wie Essens-Check

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

Die Pages-App liest diese öffentlichen APIs ohne Cookies und ohne Zugangsschlüssel. Der Dienst erlaubt CORS ausschliesslich für öffentliche GET-Endpunkte und den Ursprung https://mac-mac-sg.github.io. Die Pages-App erhält für `/api/access` und `/api/refresh` eine CORS-Freigabe ausschliesslich für ihren Ursprung. Schreibzugriffe benötigen zusätzlich eine vom angemeldeten Eigentümer ausgestellte Browser-Freigabe; Cookies werden niemals hostübergreifend übertragen. Der Button startet nach der Freigabe direkt aus der Pages-App die bestehende Datenaktualisierung.

Beim ersten Klick führt eine normale Browsernavigation zur geschützten Freigabeseite `/admin/connect?state=...`. Falls erforderlich startet der Dienst dort die plattformeigene ChatGPT-Anmeldung. Nach expliziter Bestätigung kehrt er zur Pages-App zurück. Ein zufälliger, zehn Minuten gültiger Sitzungszustand bindet die Rückkehr an denselben Browser. Die Freigabe wird nur im URL-Fragment übergeben, unmittelbar aus der Adresse entfernt und lokal gespeichert. Sie gilt 30 Tage und erlaubt ausschliesslich Datenaktualisierung. Der Objektspeicher enthält nur ihren SHA-256-Digest mit Ursprung, Eigentümer und Ablaufzeit; der Automation-Schlüssel bleibt unabhängig. Der Server prüft alle Werte und begrenzt Aktualisierungen pro Freigabe auf frühestens alle zwei Minuten. Ein ungültiger Zugang kann beim nächsten Klick neu freigegeben werden.

Automatische Aktualisierung und Live-Abfragen bleiben unverändert.

Das ist eine Migration von Codebasis, Oberfläche und Veröffentlichung nach GitHub. Der Datendienst bleibt eine ausdrücklich dokumentierte Abhängigkeit. Vollständige Artikel und laufende Statistiken werden nicht in Git-Commits kopiert. Es gibt keine separate Testumgebung.

## Betrieb und Rückkehr

Der ursprüngliche Sites-Link bleibt erreichbar und die bisherige Datenautomation bleibt aktiv. Zum Rücknehmen einer fehlerhaften UI-Version den entsprechenden Merge auf main mit einem neuen Commit rückgängig machen; die Pages-Pipeline veröffentlicht diesen Stand. Bei einem Datendienst-Ausfall kennzeichnet die App den letzten gespeicherten Stand. Live-Antworten werden nie aus dem Offline-Cache angezeigt.
