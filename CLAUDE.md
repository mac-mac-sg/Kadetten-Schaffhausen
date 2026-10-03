# Kadetten-App: Hinweise für Claude, Claude Code und Cowork

Lies zuerst AGENTS.md, README.md, docs/architecture.md und docs/pages.md. Diese Anleitung ist eine Arbeitsanweisung; sie ersetzt keine GitHub-Autorisierung des verwendeten Claude-Clients.

## Direkt im Repository arbeiten

Der Eigentümer möchte, dass Claude Änderungen committen und direkt nach GitHub pushen kann, statt nur Patch-Dateien zurückzugeben. Das gilt für alle Claude-Varianten, soweit deren Verbindung tatsächlich Schreibzugriff bietet.

Repository: https://github.com/mac-mac-sg/Kadetten-Schaffhausen
Produktive App: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/

1. Aktuellen Stand von origin/main holen und lokale Änderungen anderer Werkzeuge erhalten.
2. src/client/ für die Oberfläche und server/ für den Datendienst bearbeiten. dist/ ist erzeugt und wird nicht committet.
3. Syntax, Tests und Build prüfen: npm ci, npm run check, npm test, npm run build:pages, node scripts/check-pages.mjs.
4. Änderungen in einem eigenen Branch committen und nach GitHub pushen; anschliessend einen Pull Request erstellen. GitHub prüft Pull Requests automatisch. Änderungen auf main werden automatisch veröffentlicht. Für einen ausdrücklich beauftragten direkten Push auf main zuerst sämtliche Prüfungen ausführen; niemals force-pushen.
5. Wenn ein Client nur lesen kann oder ein Push scheitert, die fehlende Berechtigung konkret melden. Nicht behaupten, es sei gepusht oder veröffentlicht worden. Keine persönlichen Tokens in Chat, Dateien oder Commits schreiben.

Eine separate Testumgebung ist nicht gewünscht. Lokale Prüfungen und GitHub-Prüfungen bleiben Teil des Ablaufs. Der Sites-Datendienst und die Zweistunden-Automation bleiben aktiv; ein Frontend-Push aktualisiert nicht automatisch den separat laufenden Worker.

## Einrichtung pro Claude-Variante

- Claude Code im Web: GitHub während des Onboardings verbinden und dieses Repository für die Aufgabe auswählen. Der Client kann mit entsprechender Autorisierung Branches pushen.
- Claude Code lokal: Repository klonen; die lokale GitHub-Anmeldung muss Schreibrechte besitzen. Claude nutzt die vorhandene Git-Authentifizierung.
- Claude Chat und Cowork: Den tatsächlich verwendeten GitHub-Connector prüfen. Der Datei-/Projektimport „Add from GitHub“ synchronisiert Repository-Inhalte und ist kein Nachweis für Schreibzugriff. Ein Client benötigt einen GitHub-Connector mit Schreibwerkzeugen oder in Cowork einen lokalen Checkout mit authentifiziertem Git. Ist das nicht verfügbar, Claude Code für die Umsetzung verwenden.

Die Freigabe der Claude-App bzw. des Connectors erfolgt im eigenen Claude-/GitHub-Konto. Keine separate Person namens „Claude“ als Collaborator einladen und keine ChatGPT-Zugangsdaten übernehmen.

## Verifizieren

Eine Schreibfreigabe ist erst belegt, wenn der jeweilige Client einen eigenen Branch mit einer kleinen, sinnvollen Änderung erfolgreich gepusht hat. Den resultierenden Commit/Branch verlinken. Jede Claude-Verbindung muss separat geprüft werden; diese Datei aktiviert keine externen Kontorechte.
