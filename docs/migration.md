# Migrationsstand

## 1. GitHub-Codebasis — abgeschlossen

Import von Sites Version 56, editierbare Oberfläche in src/client, lokaler Start, Dokumentation für Entwickler/KI und automatisierte Prüfungen.

## 2. Veröffentlichung wie Essens-Check

Auf Wunsch des Eigentümers keine separate Testumgebung und kein neues Cloudflare-Setup. GitHub Actions prüft Änderungen und veröffentlicht die Oberfläche von main auf GitHub Pages. Projektpfade, PWA und Offline-Cache sind dafür angepasst. Einmalige Pages-Einstellung siehe [Betrieb](pages.md).

## 3. Datenbetrieb — vorhandenen Dienst weiterverwenden

Volltexte, aktuelle Daten und bestätigte Live-Werte bleiben im bestehenden Sites-Datendienst. Die GitHub-Pages-Oberfläche liest ausschliesslich öffentliche Endpunkte ohne Zugangsschlüssel. Geschützte Aktualisierungen und der Zweistundentask bleiben beim vorhandenen Dienst. Ein späterer vollständiger Backendwechsel ist eine eigene Entscheidung; er ist für das gewählte Pages-Setup nicht notwendig.

## 4. Weiterentwicklung

Änderungen über Branch und Pull Request; erfolgreiche Prüfungen vor Merge. Änderungen auf main werden anschliessend automatisch veröffentlicht. Bisheriger Sites-Link bleibt während dieser Migration erreichbar. Branchschutz ist noch nicht eingerichtet.
