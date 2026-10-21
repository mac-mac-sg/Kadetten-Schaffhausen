# Betrieb: was nicht im Repository liegt

Diese Seite hält fest, was ein neuer Agent oder Entwickler im Code nicht findet. Nur Namen und Orte, niemals Werte oder Schlüssel. Stand: 6. Oktober 2026, nach dem Umzug auf Cloudflare (Verlauf: [cloudflare-umzug.md](cloudflare-umzug.md)). Im Regelbetrieb ist kein ChatGPT-Dienst beteiligt.

## Übersicht

| Teil | Wo es läuft | Wie es aktualisiert wird |
| --- | --- | --- |
| Oberfläche (`src/client/`) | GitHub Pages: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/ | Automatisch nach Merge auf `main` (`.github/workflows/deploy.yml`) |
| Datendienst (`server/`) | Cloudflare Worker `kadetten-api`: https://kadetten-api.mac-mac-sg.workers.dev (Konfiguration `cloudflare/api/wrangler.toml`; Adresse in der App durch `scripts/build.mjs`) | **Nicht** durch den Pages-Workflow. Neubereitstellung automatisch bei Änderungen unter `server/` sowie manuell per Workflow «Cloudflare-Datendienst bereitstellen» |
| Speicher | Workers KV `kadetten-data`, Bindung `DATA`; Schlüssel siehe docs/architecture.md | Schreibt nur der Aktualisierungslauf (REST-Schnittstelle von Cloudflare) |
| Datenaktualisierung | GitHub Actions: Workflow «Cloudflare-Datenaktualisierung» (`cloudflare-update.yml`), Zeitplan Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20 (ausgelöst ausschliesslich vom Cron-Trigger des Workers), jederzeit auch manuell | Holt Quellen, rechnet, schreibt Datenstand, Artikel, Berichte, FCSG, Matchprogramm des nächsten Heimspiels und die Match-Vorschauen |
| Match-Vorschauen | im selben Lauf; KI von Cloudflare Workers AI (Mistral Small 3.1) mit sachlichem Text als Rückfall, Details [vorschauen.md](vorschauen.md) | Abschaltbar mit der Repository-Variable `KI_VORSCHAU` = `aus` |
| Android-Widget | Gebaut von `.github/workflows/android-widget.yml` | Bei Änderungen unter `android-widget/`. Liest vom Cloudflare-Datendienst (`WidgetRepository.java`), wie die App. Bereits installierte ältere APKs benötigen die neue Widget-Version. |
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
- **KI-Vorschau fehlerhaft?** Variable `KI_VORSCHAU` auf `aus`; beim nächsten Schreiblauf entstehen wieder sachliche Texte. FCSG-Rückblicke verwenden ausschliesslich bestätigte Formulierungen; die KI wählt deren Fakten-IDs. Andere KI-Texte verwenden weiterhin den dokumentierten Vorschau-/Handball-Berichtsablauf.
- **Die App zeigt keine Daten?** Rückweg auf den bisherigen Dienst: die Umschalt-Änderung (PR «Phase 3», Commit `af01a06`) per Revert-Commit auf `main` zurücknehmen; er liefert dann seinen letzten Stand (Aktualisierung steht dort still).
- **Grenzen (Cloudflare Free, laut Dokumentation, nicht über längere Zeit gemessen):** 100'000 Worker-Anfragen und 100'000 KV-Lesezugriffe pro Tag, 1'000 KV-Schreibvorgänge pro Tag, 10'000 Workers-AI-Neurons pro Tag. Bei Überschreiten schlagen Aufrufe fehl; die KI fällt dann auf den sachlichen Text zurück.
- **Token ersetzen:** neuen Cloudflare-Token anlegen (Berechtigungen siehe oben), in Settings → Secrets and variables → Actions das Secret `CLOUDFLARE_API_TOKEN` überschreiben, danach einen manuellen Schreiblauf starten und prüfen. Tokens nie in Chats, Issues, PRs oder Commits.

## European-League-Spiele: Endstand und KI-Matchbericht
Der Schreiblauf von `cloudflare-update.yml` sichert am Spieltag und am Folgetag den Endstand und erzeugt den KI-Matchbericht (Abschnitt «European League» im Protokoll, mit einer Zeile je Spiel). Der Livescore-Feed der EHF führt ein Spiel nur am Spieltag; wurde der Lauf versäumt, den Workflow am selben Abend manuell starten. Ein Eintrag ohne Bericht (Ticker nicht erreichbar, Ereignisse unvollständig) wird im nächsten Lauf ergänzt. Der Matchbericht ist abschaltbar mit `KI_VORSCHAU=aus` (dann entsteht der sachliche Text). Die Nutzungsbedingungen des Livetickers (ticker.ehf.eu/Disclaimer.aspx) enthalten einen Haftungsausschluss, aber kein Weitergabeverbot; die App nennt die EHF als Quelle und kennzeichnet KI-Texte.

## Vom Eigentümer zu ergänzen
- [x] Wo läuft die Datenautomation genau? Seit 6. Oktober 2026 in GitHub Actions (Tabelle oben). Die frühere ChatGPT-Automation schreibt nur noch in den bisherigen Sites-Dienst.
- [x] Wo liegt der Automationsschlüssel? Im Regelbetrieb gibt es keinen; Zugangsdaten liegen als GitHub-Secrets (Namen oben).
- [x] Wie wird der Datendienst neu bereitgestellt? Workflow «Cloudflare-Datendienst bereitstellen» (automatisch bei Serveränderungen, zusätzlich manuell).
- [ ] Ist Branchschutz auf `main` eingerichtet (README sagt: noch nicht)?
- [ ] Wer ist Ansprechperson bei den Vereinen für Bild- und Textrechte?
- [ ] Wann wird der bisherige Sites-Dienst abgeschaltet (Phase 4)? Das Widget ist auf Cloudflare umgestellt.

## Verfügbarkeit und Rückfall
Fällt der Datendienst aus, zeigt die App den zuletzt gespeicherten Stand (Service Worker, lokaler Snapshot) und kennzeichnet ihn als «Letzter gültiger Stand». Live-Antworten kommen nie aus dem Offline-Cache. Eine fehlerhafte Oberflächenversion wird durch einen Revert-Commit auf `main` zurückgenommen; die Pipeline veröffentlicht diesen Stand. Quellenfehler beim Aktualisieren behalten den letzten gültigen Stand je Quelle.

## V2: Spielhinweise als Web Push

V2 bietet unter Einstellungen → Benachrichtigungen vier separat wählbare Hinweise für «Meine Vereine»: 30 Minuten vor Anspiel, bestätigter Spielbeginn, Pausenresultat und bestätigtes Endresultat. Aktivierung und Browser-Berechtigung gelten nur für dieses Gerät und die eigene V2-PWA. Auf iOS muss V2 zum Home-Bildschirm hinzugefügt sein. V1 aktiviert keine Abonnements. «Testmitteilung senden» überprüft die Zustellung auf dem eigenen Gerät.

Der Cloudflare-Bereitstellungsworkflow setzt `--triggers "* * * * *"` für die zusätzliche minütliche Push-Prüfung. `server/scheduler.mjs` beschränkt die bisherigen Snapshot-Aktualisierungen weiterhin exakt auf die sieben Schweizer Stunden um Minute 20; der bestehende Ausdruck in der Cloudflare-Basiskonfiguration bleibt als Rückfall erhalten. Cron-Änderungen können bis zu 15 Minuten benötigen. Manuelle Deployments müssen denselben Trigger-Override verwenden.

`scripts/setup-push-secrets.mjs` legt beim ersten autorisierten Deployment ein VAPID-Schlüsselpaar als Worker-Geheimnisse `PUSH_PRIVATE_JWK` und `PUSH_PUBLIC_KEY` an. Weitere Deployments erhalten beide Schlüssel. Niemals für ein gewöhnliches Update rotieren: bestehende Browser-Abonnements sind an das Schlüsselpaar gebunden. Ein unvollständiges Paar führt bewusst zu einem Deployment-Fehler und muss vor einer erneuten Einrichtung geprüft werden. Es werden keine Schlüsselwerte ausgegeben oder im Repository gespeichert.

Der Worker speichert unter `push/v2/devices/` ausschliesslich Push-Endpoint, Verschlüsselungsschlüssel, Typ-/Vereinsauswahl, Zeitpunkte und den SHA-256-Digest des zufälligen Geräte-Bearer-Tokens (180 Tage Lebensdauer; beim Öffnen erneuert). PUT/DELETE können nur das eigene Gerät mit passendem Token verändern; POST `/api/push/test` sendet nur einen festen Test an dieses Gerät, höchstens einmal pro Minute. Registrierungen sind je IP auf eine pro Minute begrenzt; IPs werden nur als Digest für 60 Sekunden gespeichert. Keine Listen oder freien Nachrichten sind öffentlich zugänglich. Erlaubte Push-Dienste sind Google, Mozilla, Apple und Windows. Diese eng begrenzte Geräteverwaltung schreibt weder Vereinsdaten noch Artikel; bestehende öffentliche API-Leser bleiben schreibgeschützt.

`push/v2/matches/` hält beobachtete Spielphasen, `push/v2/sent/` bereits übergebene Hinweise für zwei Tage. Bei fehlender Quelle bleibt die Phase erhalten; weder Uhrzeit noch 60:00 beweisen ein Spielende. SHV-Pausentore stammen aus dem bestätigten Pausenstand oder einer zum aktuellen Total passenden Torfolge, da die Interval-Felder unvollständig sein können. Bei nicht verfügbaren Pausentoren wird keine Zahl erfunden. EHF-Hinweise hängen entsprechend von den gelieferten Phasen/Resultaten ab.

Der Versand läuft auch ohne offene App. Ohne Abonnenten werden keine Live-Quellen abgefragt. Die 30-Minuten-Erinnerung hat ein fünfminütiges Nachholfenster; alle Hinweise werden maximal fünf Minuten lang erneut versucht, danach verworfen. Abgelaufene Endpoints (404/410) werden gelöscht. Neue Geräte bekommen keine vor ihrer Anmeldung beobachteten Ereignisse. Keine rückwirkenden Endresultate bei einer erstmals bereits abgeschlossenen Partie. KV hat eventuelle Konsistenz: die gespeicherte Deduplizierung ist best effort; ein stabiler Notification-Tag ersetzt zusätzliche Anzeigen desselben Ereignisses. Eine garantierte Zustellzeit bietet Web Push nicht (Geräte-/Browserregeln, Internet, Quelle). Anmeldung nach verweigerter Berechtigung erfordert das Freigeben in den Geräte-/Website-Einstellungen.

Technische Grundlagen: [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291.html), [RFC 8292](https://www.rfc-editor.org/rfc/rfc8292.html), [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/). Die Tests entschlüsseln eine erzeugte Nachricht unabhängig mit Node Crypto, prüfen die VAPID-Signatur, Geräteberechtigung, Sommer-/Winterzeit und simulierte Phasen inklusive Quellenfehlern und wiederholten Cron-Aufrufen. Eine echte Zustellung muss zusätzlich über den Testknopf auf dem Zielgerät bestätigt werden.
