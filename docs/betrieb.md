# Betrieb: was nicht im Repository liegt

Diese Seite hält fest, was ein neuer Agent oder Entwickler im Code nicht findet. Nur Namen und Orte, niemals Werte oder Schlüssel.

## Übersicht

| Teil | Wo es läuft | Wie es aktualisiert wird |
| --- | --- | --- |
| Oberfläche (`src/client/`) | GitHub Pages: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/ | Automatisch nach Merge auf `main` (`.github/workflows/deploy.yml`) |
| Datendienst (`server/`) | ChatGPT Sites, Adresse in `src/client/platform-config.js` (erzeugt durch `scripts/build-pages.mjs`) | **Nicht** durch den Pages-Workflow. Neubereitstellung nur über Sites durch den Eigentümer |
| Objektspeicher | R2-kompatibel, Bindung `BUCKET`; Schlüssel siehe docs/architecture.md | Schreibt nur der Datendienst |
| Datenautomation | Externe Automation, Zeiten siehe docs/architecture.md (Abschnitt «Aktualisierung») | Ruft `POST /api/refresh` mit einem Automationsschlüssel auf |
| Android-Widget | Gebaut von `.github/workflows/android-widget.yml` | Bei Änderungen unter `android-widget/` |

Geplant: Umzug des Datendienstes auf Cloudflare, Phasen und Prüfpunkte in [cloudflare-umzug.md](cloudflare-umzug.md). Bis zum Umschalten bleibt alles wie oben.

## Namen von Konfiguration und Geheimnissen (Werte nie ins Repository)
- Datendienst: `KADETTEN_OWNER_EMAIL`, `KADETTEN_AUTH_PROVIDER`, `KADETTEN_SITES_ORIGIN`, `KADETTEN_UPDATE_KEY_SHA256` (nur der SHA-256-Digest des Automationsschlüssels), bei `cloudflare-access` zusätzlich `KADETTEN_ACCESS_ISSUER` und `KADETTEN_ACCESS_AUD`.
- GitHub: keine eigenen Secrets nötig; die Workflows laufen ohne Zugangsschlüssel. Pages-Quelle: Settings → Pages → Source → GitHub Actions.
- Projektbezug des alten Hostings: `.openai/hosting.json` (nur Dokumentation, keine portable Konfiguration).

## Vom Eigentümer zu ergänzen
Folgendes ist im Repository nicht dokumentiert und sollte hier eingetragen werden, damit ein Agent ohne Rückfrage weiterarbeiten kann:
- [ ] Wo läuft die Datenautomation genau, und wer kann sie anpassen?
- [ ] Wo liegt der Automationsschlüssel (Ort, nicht Wert), und wie wird er erneuert?
- [ ] Wie wird der Datendienst neu bereitgestellt (Schritte, wer darf das)?
- [ ] Ist Branchschutz auf `main` eingerichtet (README sagt: noch nicht)?
- [ ] Wer ist Ansprechperson bei den Vereinen für Bild- und Textrechte?

## Verfügbarkeit und Rückfall
Fällt der Datendienst aus, zeigt die App den zuletzt gespeicherten Stand (Service Worker, lokaler Snapshot) und kennzeichnet ihn als «Letzter gültiger Stand». Live-Antworten kommen nie aus dem Offline-Cache. Eine fehlerhafte Oberflächenversion wird durch einen Revert-Commit auf `main` zurückgenommen; die Pipeline veröffentlicht diesen Stand.
