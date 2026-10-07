# Betrieb: was nicht im Repository liegt

Diese Seite hält fest, was ein neuer Agent oder Entwickler im Code nicht findet. Nur Namen und Orte, niemals Werte oder Schlüssel. Stand: 6. Oktober 2026, nach dem Umzug auf Cloudflare (Verlauf: [cloudflare-umzug.md](cloudflare-umzug.md)). Im Regelbetrieb ist kein ChatGPT-Dienst beteiligt.

## Übersicht

| Teil | Wo es läuft | Wie es aktualisiert wird |
| --- | --- | --- |
| Oberfläche (`src/client/`) | GitHub Pages: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/ | Automatisch nach Merge auf `main` (`.github/workflows/deploy.yml`) |
| Datendienst (`server/`) | Cloudflare Worker `kadetten-api`: https://kadetten-api.mac-mac-sg.workers.dev (Konfiguration `cloudflare/api/wrangler.toml`; Adresse in der App durch `scripts/build.mjs`) | **Nicht** durch den Pages-Workflow. Neubereitstellung per Workflow «Cloudflare-Datendienst bereitstellen» (manuell) |
| Speicher | Workers KV `kadetten-data`, Bindung `DATA`; Schlüssel siehe docs/architecture.md | Schreibt nur der Aktualisierungslauf (REST-Schnittstelle von Cloudflare) |
| Datenaktualisierung | GitHub Actions: Workflow «Cloudflare-Datenaktualisierung» (`cloudflare-update.yml`), Zeitplan Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20 (ausgelöst vom Cron-Trigger des Workers, zusätzlich vom GitHub-Zeitplan), jederzeit auch manuell | Holt Quellen, rechnet, schreibt Datenstand, Artikel, Berichte, FCSG, Matchprogramm des nächsten Heimspiels und die Match-Vorschauen |
| Match-Vorschauen | im selben Lauf; KI von Cloudflare Workers AI (Mistral Small 3.1) mit sachlichem Text als Rückfall, Details [vorschauen.md](vorschauen.md) | Abschaltbar mit der Repository-Variable `KI_VORSCHAU` = `aus` |
| Android-Widget | Gebaut von `.github/workflows/android-widget.yml` | Bei Änderungen unter `android-widget/`. **Liest noch vom bisherigen Sites-Dienst** (`WidgetRepository.java`), zeigt daher veraltete Daten, bis eine neue Widget-Version erscheint |
| Bisheriger Sites-Dienst | ChatGPT Sites, https://kadetten.ma-ra10.chatgpt.site | Läuft unverändert weiter, wird von der App nicht mehr gelesen. Abschalten nur auf ausdrücklichen Auftrag des Eigentümers (Phase 4) |

## Namen von Konfiguration und Geheimnissen (Werte nie ins Repository)
- **GitHub-Secrets:** `CLOUDFLARE_API_TOKEN` (Cloudflare-Token mit den Berechtigungen für Workers-Skripte, Workers KV Storage: Edit und Workers AI: Edit) und `CLOUDFLARE_ACCOUNT_ID`. Optional `KADETTEN_UPDATE_KEY`: wird nur gebraucht, wenn Dritte per `POST` in den Datendienst schreiben sollen; im Regelbetrieb nicht eingerichtet.
- **Zeitplan-Token:** GitHub-Secret `WORKFLOW_DISPATCH_TOKEN` (Fine-grained Personal Access Token nur für dieses Repository, Berechtigung «Actions: Read and write», sonst nichts). Der Bereitstellungs-Workflow setzt ihn als Worker-Geheimnis `DISPATCH_TOKEN`; damit löst der Cron-Trigger des Workers (`cloudflare/api/wrangler.toml`, `server/scheduler.mjs`) zu den sieben Schweizer Zeiten die Datenaktualisierung im Modus «schreiben» aus. GitHub-Tokens laufen ab (höchstens ein Jahr): vor Ablauf neu anlegen, das Secret überschreiben und «Cloudflare-Datendienst bereitstellen» starten.
- **GitHub-Variablen:** `KI_VORSCHAU` (`aus` schaltet die KI ab, sonst an). Umgebungsvariable `KI_MODELL` im Workflow ändert das Modell.
- **Worker-Geheimnis** `KADETTEN_UPDATE_KEY_SHA256` (nur der SHA-256-Digest) wird nur gesetzt, wenn `KADETTEN_UPDATE_KEY` existiert.
- Die Sites-Variablen `KADETTEN_OWNER_EMAIL`, `KADETTEN_AUTH_PROVIDER`, `KADETTEN_SITES_ORIGIN` gehören zum bisherigen Sites-Dienst. Auf Cloudflare gibt es keine Eigentümer-Anmeldung (fehlende Konfiguration sperrt Browser-Schreibzugriffe).
- Pages-Quelle: Settings → Pages → Source → GitHub Actions.
- Projektbezug des alten Hostings: `.openai/hosting.json` (nur Dokumentation, keine portable Konfiguration).

## Regelbetrieb und Störungen
- **Läuft die Aktualisierung?** Actions → «Cloudflare-Datenaktualisierung»: Läufe mit Auslöser «workflow_dispatch» (Akteur: Inhaber des Tokens) zu den Schweizer Zeiten 06:20, 09:20, 12:20, 15:20, 18:20, 21:20 und 22:20. Der GitHub-eigene Zeitplan wurde entfernt (er löste nicht zuverlässig aus); der Cron-Trigger des Workers ist der einzige automatische Auslöser. Fehlen Läufe: Worker-Protokoll in Cloudflare (Workers → kadetten-api → Logs) auf «Zeitplan: Aktualisierung nicht ausgelöst» prüfen (401/403: Token abgelaufen oder ohne Recht), sonst genügt «Run workflow» mit `schreiben`.
- **Wie frisch sind die Daten?** `checkedAt` in `GET /api/data` des Datendienstes. Die App kennzeichnet veraltete Stände.
- **KI-Vorschau fehlerhaft?** Variable `KI_VORSCHAU` auf `aus`; beim nächsten Schreiblauf entstehen wieder sachliche Texte. Die KI-Texte werden ohne inhaltliche Prüfung übernommen (Entscheid vom 6. Oktober 2026).
- **Die App zeigt keine Daten?** Rückweg auf den bisherigen Dienst: die Umschalt-Änderung (PR «Phase 3», Commit `af01a06`) per Revert-Commit auf `main` zurücknehmen; er liefert dann seinen letzten Stand (Aktualisierung steht dort still).
- **Grenzen (Cloudflare Free, laut Dokumentation, nicht über längere Zeit gemessen):** 100'000 Worker-Anfragen und 100'000 KV-Lesezugriffe pro Tag, 1'000 KV-Schreibvorgänge pro Tag, 10'000 Workers-AI-Neurons pro Tag. Bei Überschreiten schlagen Aufrufe fehl; die KI fällt dann auf den sachlichen Text zurück.
- **Token ersetzen:** neuen Cloudflare-Token anlegen (Berechtigungen siehe oben), in Settings → Secrets and variables → Actions das Secret `CLOUDFLARE_API_TOKEN` überschreiben, danach einen manuellen Schreiblauf starten und prüfen. Tokens nie in Chats, Issues, PRs oder Commits.

## European-League-Spiele: Endstand und KI-Matchbericht
Der Schreiblauf von `cloudflare-update.yml` sichert am Spieltag und am Folgetag den Endstand und erzeugt den KI-Matchbericht (Abschnitt «European League» im Protokoll, mit einer Zeile je Spiel). Der Livescore-Feed der EHF führt ein Spiel nur am Spieltag; wurde der Lauf versäumt, den Workflow am selben Abend manuell starten. Ein Eintrag ohne Bericht (Ticker nicht erreichbar, Ereignisse unvollständig) wird im nächsten Lauf ergänzt. Der Matchbericht ist abschaltbar mit `KI_VORSCHAU=aus` (dann entsteht der sachliche Text). Die Nutzungsbedingungen des Livetickers (ticker.ehf.eu/Disclaimer.aspx) enthalten einen Haftungsausschluss, aber kein Weitergabeverbot; die App nennt die EHF als Quelle und kennzeichnet KI-Texte.

## Vom Eigentümer zu ergänzen
- [x] Wo läuft die Datenautomation genau? Seit 6. Oktober 2026 in GitHub Actions (Tabelle oben). Die frühere ChatGPT-Automation schreibt nur noch in den bisherigen Sites-Dienst.
- [x] Wo liegt der Automationsschlüssel? Im Regelbetrieb gibt es keinen; Zugangsdaten liegen als GitHub-Secrets (Namen oben).
- [x] Wie wird der Datendienst neu bereitgestellt? Workflow «Cloudflare-Datendienst bereitstellen» (manuell, Eigentümer oder Agent mit Actions-Zugriff).
- [ ] Ist Branchschutz auf `main` eingerichtet (README sagt: noch nicht)?
- [ ] Wer ist Ansprechperson bei den Vereinen für Bild- und Textrechte?
- [ ] Wann wird der bisherige Sites-Dienst abgeschaltet (Phase 4) und das Widget umgestellt?

## Verfügbarkeit und Rückfall
Fällt der Datendienst aus, zeigt die App den zuletzt gespeicherten Stand (Service Worker, lokaler Snapshot) und kennzeichnet ihn als «Letzter gültiger Stand». Live-Antworten kommen nie aus dem Offline-Cache. Eine fehlerhafte Oberflächenversion wird durch einen Revert-Commit auf `main` zurückgenommen; die Pipeline veröffentlicht diesen Stand. Quellenfehler beim Aktualisieren behalten den letzten gültigen Stand je Quelle.
