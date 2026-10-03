# Anleitung für Entwickler und KI-Werkzeuge

- Lies README.md und docs/architecture.md vor Änderungen.
- Sprache der App: Deutsch mit Schweizer Rechtschreibung. Mobile Nutzung zuerst; bestehendes orange/dunkles Design erhalten.
- Bearbeite src/client/ und server/. dist/ wird erzeugt und ist ignoriert.
- Prüfe mit npm run check, npm test und npm run build. Keine Tests auf Dateien in /tmp oder persönliche lokale Pfade aufbauen.
- Fehlende Werte nicht erfinden und nicht als null Tore interpretieren. Fehlgeschlagene Datenquellen müssen ihren letzten gültigen Stand behalten.
- Öffentliche Leser dürfen niemals schreiben. Plattform-Identitätsheader sind nur hinter dem Sites-Gateway vertrauenswürdig. Bei einem Hosting-Wechsel zuerst Authentifizierung ersetzen; Header allein sind dort kein Login.
- Keine Tokens, persönlichen Servicezugänge oder .env-Dateien committen. Laufende Daten und Artikel bleiben im Objektspeicher.
- GitHub-CI veröffentlicht derzeit nicht. Keine Veröffentlichung, Domainänderung oder Umstellung der Datenautomation ohne entsprechenden Auftrag.
- Änderungen in eigenem Branch und Pull Request mit Problem, Verhalten und Prüfungen beschreiben.
- docs/legacy-notes.md enthält historische Aussagen; README.md und die aktuelle Implementierung haben Vorrang.
