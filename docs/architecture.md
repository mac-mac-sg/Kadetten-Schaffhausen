# Architektur und Betriebsgrenzen

## Oberfläche

Vanilla JavaScript und CSS in src/client. Hash-Routen für News, Spiele, Tabelle und Kader. Keine Framework-Migration in dieser Etappe. Service Worker für App-Hülle, Bilder und versionierte Artikel; lokaler Snapshot beschleunigt den ersten Render. Live- und Berechtigungsantworten dürfen nicht aus dem Cache kommen.

## API

server/worker.mjs ist ein Worker mit fetch(request, env). server/update.mjs verarbeitet WordPress, Spielplan und Tabelle; server/shv.mjs validiert SHV-Spielerwerte; server/live.mjs liefert bestätigte Live-Werte, jüngste Ergebnisse und direkte Duelle. scripts/build.mjs bündelt Module mit esbuild und versioniert die App-Hülle deterministisch.

GET /api/data liefert den aktuellen Snapshot; GET /api/articles/:id?v=:sha liefert separat den Volltext. GET /api/access liefert die Update-Berechtigung. POST /api/refresh ist ausschliesslich für den Eigentümer und die autorisierte Automation.

## Speicher und Identität

env.BUCKET: R2-kompatibler Objektspeicher mit get(key).json() und put(key,value). Schlüssel: kadetten/current.json, kadetten/previous.json und kadetten/articles/:id/:sha.json. env.ASSETS bedient die statischen Dateien. server/seed.json ist nur der mitgelieferte Start-/Notfallstand.

server/auth.mjs trennt Eigentümeridentität von der Daten-API. KADETTEN_AUTH_PROVIDER muss explizit konfiguriert sein; fehlende/ungültige Werte sperren Browser-Schreibzugriffe. Im Sites-Modus werden zusätzlich KADETTEN_SITES_ORIGIN und die Gateway-Identität geprüft. Im cloudflare-access-Modus verifiziert jose einen signierten Access-JWT aus Assertion-Header oder CF_Authorization-Cookie, anhand des konfigurierten Ausstellers, der App-Audience, Claims und der Eigentümer-E-Mail. Öffentliche E-Mailheader sind dort keine Identität. `/admin/login` ist der für Cloudflare Access vorbereitete Login-Einstieg. Details und offene Einrichtung: [Testhost](test-host.md).

KADETTEN_UPDATE_KEY_SHA256 enthält den SHA-256-Digest eines separaten Automation-Schlüssels. Er authorisiert keine Browseridentität. Schlüssel werden bei einem Hostwechsel neu erstellt, niemals aus Sites übernommen. Alle persönlichen Laufzeitwerte und Secrets bleiben ausserhalb des Repositorys.

## Aktualisierung

Die bestehende externe Automation aktualisiert alle zwei Stunden. Zusätzliche Matchday-/Live-Abfragen finden während sichtbarer App-Nutzung statt. Manche Quellen sperren direkte Worker-Abrufe; die Automation liefert deshalb öffentlich abgerufene Quelldaten an die geschützte API. Jeder Quellenfehler erhält den vorherigen gültigen Datenstand. Ein Wechsel des Hosts erfordert auch die Migration der Automationszugänge und R2-Inhalte.

## Lokal und GitHub

scripts/dev.mjs stellt einen lokalen, schreibgeschützten Adapter bereit. Identitäts- und Update-Header aus Browserrequests werden entfernt. .local-data ist ignorierter lokaler Speicher. GitHub Actions prüft und baut, hat keine produktiven Zugangsschlüssel und veröffentlicht nicht. .openai/hosting.json dokumentiert den bisherigen Sites-Projektbezug; es ist keine portable Cloud-Konfiguration.
