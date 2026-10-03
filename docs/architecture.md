# Architektur und Betriebsgrenzen

## Oberfläche

Vanilla JavaScript und CSS in src/client. Hash-Routen für News, Spiele, Tabelle und Kader. Keine Framework-Migration in dieser Etappe. Service Worker für App-Hülle, Bilder und versionierte Artikel; lokaler Snapshot beschleunigt den ersten Render. Live- und Berechtigungsantworten dürfen nicht aus dem Cache kommen.

## API

server/worker.mjs ist ein Worker mit fetch(request, env). server/update.mjs verarbeitet WordPress, Spielplan und Tabelle; server/shv.mjs validiert SHV-Spielerwerte; server/live.mjs liefert bestätigte Live-Werte, jüngste Ergebnisse und direkte Duelle. scripts/build.mjs bündelt Module und versioniert die App-Hülle deterministisch.

GET /api/data liefert den aktuellen Snapshot; GET /api/articles/:id?v=:sha liefert separat den Volltext. GET /api/access liefert die Update-Berechtigung. POST /api/refresh ist ausschliesslich für den Eigentümer und die autorisierte Automation.

## Speicher und Identität

env.BUCKET: R2-kompatibler Objektspeicher mit get(key).json() und put(key,value). Schlüssel: kadetten/current.json, kadetten/previous.json und kadetten/articles/:id/:sha.json. env.ASSETS bedient die statischen Dateien. server/seed.json ist nur der mitgelieferte Start-/Notfallstand.

KADETTEN_OWNER_EMAIL identifiziert den Eigentümer hinter Sites. oai-authenticated-user-id/email werden dort vom Gateway verifiziert. Auf einem anderen Host wären diese Header vom Besucher fälschbar. Die Anwendung darf dort erst nach Ersatz dieser Prüfung produktiv betrieben werden. KADETTEN_UPDATE_KEY_SHA256 enthält nur den SHA-256-Digest des Automation-Schlüssels. Beide Werte werden als Laufzeitkonfiguration verwaltet.

## Aktualisierung

Die bestehende externe Automation aktualisiert alle zwei Stunden. Zusätzliche Matchday-/Live-Abfragen finden während sichtbarer App-Nutzung statt. Manche Quellen sperren direkte Worker-Abrufe; die Automation liefert deshalb öffentlich abgerufene Quelldaten an die geschützte API. Jeder Quellenfehler erhält den vorherigen gültigen Datenstand. Ein Wechsel des Hosts erfordert auch die Migration der Automationszugänge und R2-Inhalte.

## Lokal und GitHub

scripts/dev.mjs stellt einen lokalen, schreibgeschützten Adapter bereit. Identitäts- und Update-Header aus Browserrequests werden entfernt. .local-data ist ignorierter lokaler Speicher. GitHub Actions prüft und baut, hat keine produktiven Zugangsschlüssel und veröffentlicht nicht. .openai/hosting.json dokumentiert den bisherigen Sites-Projektbezug; es ist keine portable Cloud-Konfiguration.
