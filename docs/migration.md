# Migrationsstand

## 1. GitHub-Codebasis — abgeschlossen

Import von Sites Version 56, editierbare Oberfläche in src/client, lokaler Start, Dokumentation für Entwickler/KI und automatisierte Prüfungen.

## 2. Veröffentlichung wie Essens-Check

Auf Wunsch des Eigentümers keine separate Testumgebung und kein neues Cloudflare-Setup. GitHub Actions prüft Änderungen und veröffentlicht die Oberfläche von main auf GitHub Pages. Projektpfade, PWA und Offline-Cache sind dafür angepasst. Einmalige Pages-Einstellung siehe [Betrieb](pages.md).

## 3. Datenbetrieb — auf Cloudflare umgezogen (6. Oktober 2026)

Der Datendienst läuft als Cloudflare Worker mit Workers KV; die Aktualisierung (Daten, Artikel, Berichte, FCSG, Matchprogramme, Match-Vorschauen) läuft nach Zeitplan in GitHub Actions. Die Pages-Oberfläche liest weiterhin ausschliesslich öffentliche Endpunkte ohne Zugangsschlüssel. Der frühere Sites-Dienst bleibt unverändert erreichbar, bis der Eigentümer das Abschalten beauftragt. Verlauf, Prüfpunkte und Rückweg: [cloudflare-umzug.md](cloudflare-umzug.md), Betrieb: [betrieb.md](betrieb.md).

## 4. Weiterentwicklung

Änderungen über Branch und Pull Request; erfolgreiche Prüfungen vor Merge. Änderungen auf main werden anschliessend automatisch veröffentlicht. Bisheriger Sites-Link bleibt während dieser Migration erreichbar. Branchschutz ist noch nicht eingerichtet.
