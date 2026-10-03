# Schrittweise Professionalisierung

## Etappe 1: Code und Zusammenarbeit

Bestehenden Code übernehmen; Oberfläche nach src/client verschieben; portabler lokaler Start; README und AGENTS; unabhängige Tests und CI-Build. Öffentliche App und Datenautomation bleiben auf Sites. Baseline: Sites-Quellcommit 4d2eb5e2b580a11b65f8d742969bd4b3af9605b4, veröffentlichte Version 56 vom 03.10.2026. Die bisherige Git-Historie bleibt im Sites-Repository; GitHub startet mit einem dokumentierten Importstand.

## Etappe 2: Hosting und Zugang

Zielhost anhand von Worker-Unterstützung, Objektspeicher, Login, Domain, Kosten und Betrieb wählen. Bestehenden Code wiederverwenden. Eigentümer-Login unabhängig von Sites implementieren; öffentliche Lesezugriffe und geschützte Schreibzugriffe testen. Separaten Testhost und Speicher anlegen. Erst danach produktive Secrets hinterlegen. GitHub Pages allein stellt das Backend nicht bereit.

## Etappe 3: Veröffentlichungen

Testversion je Pull Request, produktive Veröffentlichung nach Merge, versionierte Builds und dokumentierter Rollback. Branchschutz und passende GitHub-Berechtigungen konfigurieren. Verfügbarkeit der Schutzfunktionen im gewählten GitHub-Tarif prüfen. Neue Pipeline zuerst auf Testumgebung prüfen.

## Etappe 4: Daten und Umstellung

Snapshots und alle Artikel aus dem bisherigen Speicher exportieren/importieren. Alle zwei Stunden und Matchday-/Live-Abläufe auf dem Ziel prüfen; Rotation der Update-Zugänge. Erst nach Vergleich der Daten und Schreibrechte den öffentlichen Link umstellen und den alten Zeitplan deaktivieren. Alten Host während der Übergangsphase für Rollback erhalten.

## Etappe 5: Betrieb

Fehlerüberwachung, Alarm bei veralteten Daten, regelmässige Speicher-Backups mit Wiederherstellungstest sowie dokumentierte Wartung. UI-Smoke-Tests für Newsstart, Kalender ohne Scrollen, Tabellenbreite und mobile Navigation ergänzen.
