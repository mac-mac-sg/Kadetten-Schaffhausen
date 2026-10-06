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
| Speicher | **Workers KV** (entschieden am 06.10.2026), Namespace `kadetten-data`, Bindung `DATA` | Funktioniert im Konto sofort; R2 ist dort nicht aktiviert. Der Code bleibt unverändert: `server/kv-store.mjs` bildet die genutzte R2-Schnittstelle (`get`, `put`) auf KV ab. Auf Sites (`BUCKET` vorhanden) wird KV nie verwendet. Free-Grenzen: 100'000 Lesezugriffe, 1'000 Schreibzugriffe und 1 GB pro Tag/Konto; Werte bis 25 MiB |
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

**Phase 3 – Parallelbetrieb und Umschalten (nur auf ausdrücklichen Auftrag).** Beide Dienste laufen parallel und werden verglichen. Umschalten heisst: `apiOrigin` in `scripts/build.mjs` und `connect-src` in `src/client/index.html` anpassen. `pagesOrigin` in `server/cors.mjs` bleibt unverändert, weil es den Ursprung der App (GitHub Pages) nennt, nicht den des Datendienstes. Der Android-Widget (`android-widget/…/WidgetRepository.java`) liest eine eigene Adresse und wird erst mit einer neuen Widget-Version umgestellt. Jede Änderung geschieht in einem PR mit Rückfallweg.

**Phase 4 – Abschalten des alten Dienstes (nur auf ausdrücklichen Auftrag).** Erst nach einer Beobachtungszeit.

## Stand Phase 1 (06.10.2026)
- Erledigt: KV-Namespace `kadetten-data` im Konto angelegt (ID in `cloudflare/api/wrangler.toml`, eine Kennung, kein Geheimnis); KV-Zwischenschicht und Rückfall ohne `ASSETS` im Worker; Worker-Konfiguration `cloudflare/api/wrangler.toml`; Workflow «Cloudflare-Datendienst bereitstellen» (manuell).
- Offen: Der Dienst ist noch **nicht** bereitgestellt (Secrets fehlen). Danach: Speicher einmalig aus den öffentlichen Lese-Routen des alten Dienstes befüllen und vergleichen (Prüfpunkt Phase 1).
- Zusätzliches Secret für Schreibwege (Phase 2): `KADETTEN_UPDATE_KEY`, ein frei gewählter, langer Zufallswert (zum Beispiel aus einem Passwortmanager). Der Workflow setzt daraus nur den Digest beim Dienst; der Wert selbst bleibt in GitHub.

## Ergebnis Phase 0 (06.10.2026, bestanden)
Lauf «Cloudflare-Machbarkeitstest» (Bereitstellung und Löschen des Test-Workers erfolgreich). Vom Cloudflare-Worker aus (Rechenzentrum IAD, USA) waren alle acht geprüften Quellen **erreichbar und ohne Fehler**:

| Quelle | Ergebnis |
| --- | --- |
| kadettensh.ch Matchcenter (HTML) | HTTP 200, 444 KB |
| kadettensh.ch News (WordPress-API) | HTTP 200, 24 KB |
| SHV handball.ch: Live, Spielerwerte, letzte Spiele | ohne Fehler (derzeit kein Live-Spiel) |
| FCSG-API (Spielerdaten, Live) | ohne Fehler |
| fcsg.ch Webseite | HTTP 200, 1.4 MB |

Grenzen dieses Ergebnisses:
- Geprüft ist die Erreichbarkeit mit dem echten Anwendungscode, nicht die inhaltliche Vollständigkeit der Antworten.
- Die Abfrage lief aus einem Rechenzentrum in den USA (die Anfrage kam von einem GitHub-Runner). Ob Quellen Abrufe aus europäischen Rechenzentren anders behandeln, ist nicht geprüft.
- Die gemessenen Zeiten im Ergebnis (alle 0 ms) sind unbrauchbar: Die Zeitfunktion in Workers schreitet nur bei bestimmten Ereignissen voran. Für CPU-Zeiten gilt das Dashboard von Cloudflare.

## Ergebnis Phase 1 (06.10.2026, bestanden)
Import (81 KV-Einträge, 4,5 MB) und Vergleich ohne Abweichung: Datenstand 1/1, Artikel 67/67, Spielberichte 7/7, Matchprogramme 28/28 (davon ein PDF Byte für Byte), KI-Vorschauen 28/28 gleich. Der Cloudflare-Speicher ist eine Momentaufnahme und veraltet, solange Phase 2 nicht läuft. Umschalten ist erst danach sinnvoll.

## Phase 2: Aktualisierung über GitHub Actions
Geklärt mit dem Eigentümer am 06.10.2026:
- **KI-Vorschauen** schreibt ChatGPT im Auftrag des Eigentümers (Schreibzugriff auf `/api/previews`). Das bleibt vorerst so; mit dem Umschalten muss das Ziel dieser Schreibzugriffe auf den neuen Dienst geändert werden (dafür braucht es dann den Automationsschlüssel `KADETTEN_UPDATE_KEY`).
- **Matchprogramme** liegen auf der Startseite der Kadetten (Matchvorschau) als PDF. Der Abruf kann ein Actions-Lauf übernehmen (Phase 2b, noch nicht gebaut).
- **Bisherige Datenautomation** (alle zwei Stunden): Ihr Ort ist unbekannt, sie wurde mit ChatGPT eingerichtet. Der Actions-Lauf ersetzt sie vollständig; abgeschaltet wird sie nur auf ausdrücklichen Auftrag.

**Phase 2a (Datenstand, Artikel, Spielberichte, FCSG)** ist gebaut: Workflow «Cloudflare-Datenaktualisierung» (manuell, Standard Trockenlauf), Code `scripts/cloudflare-update.mjs`. Der Lauf verwendet denselben Code wie der Worker (`server/refresh-run.mjs`), liest und schreibt den KV-Speicher über die REST-Schnittstelle (`scripts/lib/kv-rest-store.mjs`) und unterliegt damit nicht den Grenzen des Free Plans (10 ms CPU, 50 externe Abrufe). Es braucht keine Schreibroute am Worker und keinen Automationsschlüssel. Der Zeitplan (Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20, geplante Läufe schreiben) ist seit dem Auftrag vom 6. Oktober 2026 eingerichtet, weil der bisherige Datendienst ohne ChatGPT-Guthaben nicht mehr aktualisiert wird. Er betrifft nur den neuen Dienst; die App liest bis zur Umstellung (Phase 3) weiterhin vom bisherigen Dienst.

## Phase 1: Import und Vergleich
Workflow «Cloudflare-Import und Vergleich» (manuell, Standard ist der Trockenlauf), Code in `scripts/cloudflare-import.mjs` und `scripts/lib/cloudflare-migration.mjs`. Ablauf: erst `pruefen`, dann `importieren`, dann `vergleichen`.
- **Übernommen** aus den öffentlichen Lese-Routen des bisherigen Dienstes: Datenstand, versionierte Volltext-Artikel, gespeicherte Spielberichte, aktuelle KI-Vorschauen, Matchprogramme samt PDF.
- **Nicht übernommen:** FCSG-Daten (die öffentliche Route liefert sie ohne Artikeltexte; sie entstehen in Phase 2 neu aus der offiziellen FCSG-API), abgelaufene KI-Vorschauen und Spielberichte, die der bisherige Dienst nicht gespeichert hat.
- **Prüfpunkt erfüllt**, wenn «vergleichen» in allen Gruppen null Abweichungen zeigt. Wegen der verzögerten Auslieferung von KV fragt der Vergleich bei Abweichungen bis zu viermal im Abstand von 20 Sekunden nach.
- Der Import überschreibt gleiche Schlüssel. Nach dem ersten Lauf von Phase 2 (Aktualisierung über Actions) darf er **nicht** mehr ausgeführt werden, sonst überschreibt er neuere Daten mit dem Stand des alten Dienstes.
- Der Token braucht dafür zusätzlich «Workers KV Storage: Edit».

## Adresse des Datendienstes
Die `workers.dev`-Subdomain gehört zum Cloudflare-Konto (eine pro Konto, im Dashboard unter *Workers & Pages → Your subdomain* änderbar) und wurde am 06.10.2026 auf `mac-mac-sg` gesetzt. Der Worker `kadetten-api` ist damit unter `https://kadetten-api.mac-mac-sg.workers.dev` erreichbar. Cloudflare sieht `workers.dev` für private und Hobby-Projekte vor; eine eigene Domain kann später ergänzt werden, ohne den Code umzubauen.

## Stand der Verbindungen (06.10.2026)
- Der Konnektor «Cloudflare Developer Platform» ist verbunden. Er kann lesen und Ressourcen anlegen (Workers lesen, KV, R2, D1), aber **keine Workers bereitstellen**. Das Konto ist leer (0 Workers, 0 KV-Namespaces).
- Der zweite Konnektor (`plugin:cloudflare:cloudflare`, Adresse laut Cloudflare-Anleitung `https://mcp.cloudflare.com/mcp`) scheiterte in der Cloud-Umgebung am Proxy (403). Vermutlich muss der Host `mcp.cloudflare.com` unter *Network access → Allowed domains* der Umgebung freigegeben werden (Annahme, nicht geprüft).
- Die Bereitstellung bleibt deshalb bei GitHub Actions mit dem API-Token (siehe unten). Das hält den Ablauf unabhängig vom Konnektor und von jedem einzelnen Agenten.

## Einrichtung durch den Eigentümer (für Phase 0)
Dazu braucht es dich, weil Konto und Zugangsdaten bei dir liegen. Schlüssel nie in den Chat schreiben.
1. Kostenloses Cloudflare-Konto anlegen (https://dash.cloudflare.com/sign-up).
2. Im Dashboard unter *Workers & Pages* einmal die `workers.dev`-Subdomain festlegen, falls Cloudflare danach fragt (aus Erinnerung; bei Fehlern in der Workflow-Ausgabe nachsehen).
3. API-Token erstellen (*My Profile → API Tokens → Create Token*), nur mit **Account → Workers Scripts → Edit**, beschränkt auf dein Konto. Für den Datenimport in Phase 1 kommt **Workers KV Storage → Edit** dazu.
4. Die *Account ID* aus dem Dashboard kopieren.
5. Im GitHub-Repository unter *Settings → Secrets and variables → Actions* zwei Secrets anlegen: `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID`.
6. Unter *Actions → Cloudflare-Machbarkeitstest → Run workflow* starten. Das Ergebnis steht in der Zusammenfassung des Laufs.

## Risiken und offene Punkte
- Quellen können Cloudflare-Adressen sperren: in Phase 0 nicht eingetreten (siehe oben), kann sich aber ändern.
- R2 aktivieren: im Dashboard durch den Eigentümer; ob eine Zahlungsmethode verlangt wird, ist nicht geklärt. Mit KV vermeidbar.
- KV ist eventuell konsistent (Änderungen können nicht sofort überall sichtbar sein); für den 2-Stunden-Takt der Daten unkritisch, aber vor Phase 1 zu bestätigen.
- Die Schreibgrenze von KV (1'000 pro Tag) ist für den ersten Datenimport (ca. 60 Artikel plus Berichte) und danach für etwa 12 Läufe pro Tag ausreichend, muss aber beim Import beachtet werden.
- Der Actions-Zeitplan (`cron`) ist nicht sekundengenau und kann sich verzögern.
- Der Test-Worker ist öffentlich erreichbar, solange er läuft (nur Erfolg, Dauer und gekürzte Fehlermeldung, keine Inhalte). Das Ergebnis in der Zusammenfassung ist in einem öffentlichen Repository öffentlich.

## Vorschauen (Weg A)
Der Auftrag bei ChatGPT schreibt die KI-Vorschauen weiter, jetzt an den Cloudflare-Dienst. Einrichtung, Schlüssel und Vertrag: `docs/vorschauen.md`. Solange das Secret `KADETTEN_UPDATE_KEY` nicht angelegt und der Dienst neu bereitgestellt ist, lehnt er alle Schreibzugriffe ab (Stand 6. Oktober 2026: nicht angelegt).

## Prüfung der Live-Routen (vor Phase 3)
Workflow «Cloudflare-Live-Routen prüfen» (manuell, nur lesend, ohne Secrets, Code `scripts/cloudflare-live-check.mjs`). Er ruft Live-Spiel, FCSG live, FCSG-Kader, letzte Spiele und Direktvergleich beim bisherigen und beim neuen Dienst ab. Diese Routen holen beim Aufruf Daten aus externen Quellen; die Kadetten-Quelle lehnt laut `docs/legacy-notes.md` Zugriffe direkt von Workern ab. Geprüft wird, ob der neue Dienst die Routen gesund liefert (HTTP 200, kein `ok: false`), nicht ob die Live-Werte gleich sind. Rot heisst: der neue Dienst liefert eine Route nicht, die der bisherige liefert. Dann ist die Umstellung nicht ohne Weiteres möglich.

## Rückfall
Bis Phase 3 ändert sich für Besucher nichts. Nach dem Umschalten genügt ein Revert-Commit der beiden Konfigurationsstellen, um wieder den alten Dienst zu verwenden, solange er nicht abgeschaltet ist.
