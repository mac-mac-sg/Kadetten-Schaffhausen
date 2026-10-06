# Hinweise für Claude (Claude Code, Chat, Cowork)

Alle Arbeitsregeln stehen in [AGENTS.md](AGENTS.md) und gelten unverändert. Diese Datei enthält nur Claude-spezifische Einrichtungshinweise. Lies zuerst AGENTS.md, README.md, docs/architecture.md, docs/pages.md und docs/betrieb.md.

Repository: https://github.com/mac-mac-sg/Kadetten-Schaffhausen
Produktive App: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/

## Direkt im Repository arbeiten

Der Eigentümer möchte, dass Claude Änderungen committen und direkt nach GitHub pushen kann, statt nur Patch-Dateien zurückzugeben. Das gilt, soweit die Verbindung des jeweiligen Clients tatsächlich Schreibzugriff bietet. Ablauf, Prüfbefehle und Grenzen: AGENTS.md. Wenn ein Client nur lesen kann oder ein Push scheitert, die fehlende Berechtigung konkret melden.

## Einrichtung pro Claude-Variante

- Claude Code im Web: GitHub während des Onboardings verbinden und dieses Repository für die Aufgabe auswählen. Der Client kann mit entsprechender Autorisierung Branches pushen. Netzwerkzugriff der Umgebung kann externe Hosts sperren; der Eigentümer ändert das in den Einstellungen der Umgebung.
- Claude Code lokal: Repository klonen; die lokale GitHub-Anmeldung muss Schreibrechte besitzen. Claude nutzt die vorhandene Git-Authentifizierung.
- Claude Chat und Cowork: Den tatsächlich verwendeten GitHub-Connector prüfen. Der Datei-/Projektimport „Add from GitHub" synchronisiert Repository-Inhalte und ist kein Nachweis für Schreibzugriff. Ein Client benötigt einen GitHub-Connector mit Schreibwerkzeugen oder in Cowork einen lokalen Checkout mit authentifiziertem Git. Ist das nicht verfügbar, Claude Code für die Umsetzung verwenden.

Die Freigabe der Claude-App bzw. des Connectors erfolgt im eigenen Claude-/GitHub-Konto. Keine separate Person namens „Claude" als Collaborator einladen und keine ChatGPT-Zugangsdaten übernehmen.

## Verifizieren

Jede Claude-Verbindung muss separat geprüft werden: Erst ein erfolgreich gepushter Branch mit einer kleinen, sinnvollen Änderung belegt die Schreibfreigabe. Den resultierenden Commit oder Branch verlinken.
