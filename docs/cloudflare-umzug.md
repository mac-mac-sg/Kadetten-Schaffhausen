# Umzug des Datendienstes auf Cloudflare

Auftrag des Eigentümers vom 06.10.2026: Den Datendienst (`server/`, bisher ChatGPT Sites) auf Cloudflare umziehen, damit Entwicklung und Betrieb von jedem Agenten und jedem Rechner aus über das Repository möglich sind. Diese Entscheidung ersetzt die Aussage vom 03.10.2026 («kein Cloudflare-Konto erforderlich», docs/pages.md, docs/test-host.md) für den **Datendienst**. Die Oberfläche bleibt auf GitHub Pages.

## Rahmen (aus AGENTS.md)
- Der bestehende Sites-Dienst und seine Automation laufen **unverändert weiter**, bis der Eigentümer das Umschalten ausdrücklich beauftragt. Abgeschaltet wird nichts ohne eigenen Auftrag.
- Keine Schlüssel im Repository, im Chat, in Issues oder PRs. Zugangsdaten liegen nur in GitHub-Secrets bzw. bei Cloudflare.
- Kleine PRs, jeweils `npm run verify` grün, Aussagen mit Beleg.
- Alles läuft über GitHub Actions: Ein Agent braucht nur Zugriff auf das Repository, keinen lokalen Rechner.

## Ausgangslage
Gemessene CPU-Zeit pro Anfrage (Node lokal, Testdaten; nur Grössenordnung):

| Route | CPU |
| --- | --- |
| `/api/data`, `/api/articles/:id`, `/api/live` | unter 1 ms |
| `/api/fcsg/data` (488 KB Datenstand) | ca. 3 ms |
| `POST /api/refresh` (62 Artikel) | ca. 11 ms (Spitze 15 ms) |

Limits von Cloudflare Workers Free laut offizieller Dokumentation (abgerufen am 06.10.2026 über die Cloudflare-Dokumentationssuche; `workers/platform/limits`, `workers/platform/pricing`):

| Limit | Workers Free |
| --- | --- |
| CPU-Zeit pro HTTP-Anfrage **und** pro Cron-Trigger | 10 ms (Warten auf Netzwerk, KV oder R2 zählt nicht) |
| Anfragen | 100'000 pro Tag (Fehler 1027 danach) |
| Unterabfragen (`fetch`) pro Anfrage | 50 externe, 1000 an Cloudflare-Dienste |
| Cron-Trigger pro Konto | 5 |
| Grösse der Anfrage (Body) | 100 MB |
| Statische Dateien | unbegrenzte Anfragen |
| Workers Logs | 200'000 Ereignisse pro Tag, 3 Tage Aufbewahrung |

**Lesen und Live passen, jeder schreibende Weg nicht**: `/api/refresh` (CPU und die Grenze von 50 externen Abrufen: allein die News-Seiten sind bis zu 20 Abrufe), `/api/programmes` (PDF bis 11 MB, Base64 und SHA-256) und `/api/previews`.

## Entscheide (Vorschlag, bei Bedarf zu ändern)
| Thema | Vorschlag | Begründung |
| --- | --- | --- |
| Hosting | Cloudflare Workers Free | Code ist bereits `fetch(request, env)`; grösstes Gratis-Kontingent |
| Speicher | **Workers KV** (Free: 100'000 Lesezugriffe, 1'000 Schreibzugriffe, 1 GB pro Tag/Konto), alternativ R2 (Free: 10 GB, 1 Mio. Schreib-, 10 Mio. Leseoperationen pro Monat) | R2 ist im Konto **noch nicht aktiviert** (API-Fehler 10042 «Please enable R2 through the Cloudflare Dashboard»); ob dafür eine Zahlungsmethode nötig ist, sagt die Dokumentation nicht. KV funktioniert im Konto bereits. Der Code nutzt R2-Aufrufe (`get(key).json()`, `put`); für KV genügt eine kleine Zwischenschicht (`server/`-Adapter mit derselben Schnittstelle). **Entscheid offen** |
| Schreibwege | GitHub Actions rechnet, der Worker speichert nur | Umgeht die 10-ms-Grenze; Actions hat keine CPU-Grenze |
| Anmeldung für Schreibwege | Automationsschlüssel (`KADETTEN_UPDATE_KEY_SHA256`), kein Cloudflare Access | Der Browser schreibt in der Pages-Version nie |
| Bereitstellung | GitHub Actions mit festgelegter wrangler-Version | Reproduzierbar, ohne lokalen Rechner |

## Phasen
Jede Phase endet an einem Prüfpunkt. Erst danach beginnt die nächste.

**Phase 0 – Machbarkeit** (dieser PR). Der Workflow «Cloudflare-Machbarkeitstest» stellt einen Test-Worker bereit, ruft die Quellen mit dem echten Anwendungscode von Cloudflare aus ab (kadettensh.ch, SHV/handball.ch, FCSG, fcsg.ch), zeigt das Ergebnis in der Zusammenfassung und löscht den Worker wieder.
- *Prüfpunkt:* Alle Quellen erreichbar. Falls Quellen Cloudflare sperren, ist das das wichtigste Ergebnis: Dann braucht der Umzug eine andere Lösung (z. B. Abruf nur aus Actions) und der Plan wird angepasst.

**Phase 1 – Lesender Worker.** `wrangler.toml` für den echten Worker, R2-Bucket, `env.ASSETS` entfällt auf Cloudflare (Rückfall auf 404), Bereitstellungs-Workflow. Befüllung des Speichers einmalig aus den öffentlichen Lese-Routen des alten Dienstes.
- *Prüfpunkt:* Alle öffentlichen GET-Routen des neuen Dienstes liefern dieselben Antworten wie der alte (Vergleichsskript wie beim Worker-Umbau); CPU pro Anfrage im Cloudflare-Dashboard unter 10 ms.

**Phase 2 – Aktualisierung über GitHub Actions.** Geplanter Workflow (alle zwei Stunden zu den bisherigen Zeiten, Europe/Zurich) ruft die Quellen ab, rechnet mit dem vorhandenen Code (`server/update.mjs`, `live.mjs`, `fcsg.mjs`) und schreibt den fertigen Stand in den Speicher. Das Hochladen von Matchprogrammen und KI-Vorschauen wird entsprechend umgestellt.
- *Prüfpunkt:* Mehrere aufeinanderfolgende Läufe ohne Fehler; Quellenfehler behalten den letzten gültigen Stand.

**Phase 3 – Parallelbetrieb und Umschalten (nur auf ausdrücklichen Auftrag).** Beide Dienste laufen parallel und werden verglichen. Umschalten heisst: `apiOrigin` in `scripts/build.mjs`, `connect-src` in `src/client/index.html` und `pagesOrigin` in `server/cors.mjs` anpassen. Jede Änderung geschieht in einem PR mit Rückfallweg.

**Phase 4 – Abschalten des alten Dienstes (nur auf ausdrücklichen Auftrag).** Erst nach einer Beobachtungszeit.

## Stand der Verbindungen (06.10.2026)
- Der Konnektor «Cloudflare Developer Platform» ist verbunden. Er kann lesen und Ressourcen anlegen (Workers lesen, KV, R2, D1), aber **keine Workers bereitstellen**. Das Konto ist leer (0 Workers, 0 KV-Namespaces).
- Der zweite Konnektor (`plugin:cloudflare:cloudflare`, Adresse laut Cloudflare-Anleitung `https://mcp.cloudflare.com/mcp`) scheiterte in der Cloud-Umgebung am Proxy (403). Vermutlich muss der Host `mcp.cloudflare.com` unter *Network access → Allowed domains* der Umgebung freigegeben werden (Annahme, nicht geprüft).
- Die Bereitstellung bleibt deshalb bei GitHub Actions mit dem API-Token (siehe unten). Das hält den Ablauf unabhängig vom Konnektor und von jedem einzelnen Agenten.

## Einrichtung durch den Eigentümer (für Phase 0)
Dazu braucht es dich, weil Konto und Zugangsdaten bei dir liegen. Schlüssel nie in den Chat schreiben.
1. Kostenloses Cloudflare-Konto anlegen (https://dash.cloudflare.com/sign-up).
2. Im Dashboard unter *Workers & Pages* einmal die `workers.dev`-Subdomain festlegen, falls Cloudflare danach fragt (aus Erinnerung; bei Fehlern in der Workflow-Ausgabe nachsehen).
3. API-Token erstellen (*My Profile → API Tokens → Create Token*), nur mit der Berechtigung **Account → Workers Scripts → Edit**, beschränkt auf dein Konto. Für Phase 1 kommt später **Workers R2 Storage → Edit** dazu.
4. Die *Account ID* aus dem Dashboard kopieren.
5. Im GitHub-Repository unter *Settings → Secrets and variables → Actions* zwei Secrets anlegen: `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID`.
6. Unter *Actions → Cloudflare-Machbarkeitstest → Run workflow* starten. Das Ergebnis steht in der Zusammenfassung des Laufs.

## Risiken und offene Punkte
- Quellen können Cloudflare-Adressen sperren (Phase 0 klärt das).
- R2 aktivieren: im Dashboard durch den Eigentümer; ob eine Zahlungsmethode verlangt wird, ist nicht geklärt. Mit KV vermeidbar.
- KV ist eventuell konsistent (Änderungen können nicht sofort überall sichtbar sein); für den 2-Stunden-Takt der Daten unkritisch, aber vor Phase 1 zu bestätigen.
- Die Schreibgrenze von KV (1'000 pro Tag) ist für den ersten Datenimport (ca. 60 Artikel plus Berichte) und danach für etwa 12 Läufe pro Tag ausreichend, muss aber beim Import beachtet werden.
- Der Actions-Zeitplan (`cron`) ist nicht sekundengenau und kann sich verzögern.
- Der Test-Worker ist öffentlich erreichbar, solange er läuft (nur Erfolg, Dauer und gekürzte Fehlermeldung, keine Inhalte). Das Ergebnis in der Zusammenfassung ist in einem öffentlichen Repository öffentlich.

## Rückfall
Bis Phase 3 ändert sich für Besucher nichts. Nach dem Umschalten genügt ein Revert-Commit der drei Konfigurationsstellen, um wieder den alten Dienst zu verwenden, solange er nicht abgeschaltet ist.
