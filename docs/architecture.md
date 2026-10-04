# Architektur und Betriebsgrenzen

## Oberfläche

Vanilla JavaScript und CSS in src/client. Hash-Routen für News, Spiele, Tabelle, Kader und die Vereinsseite (`#club`). Keine Framework-Migration in dieser Etappe.

### Aufbau von src/client

Die Dateien sind gewöhnliche Skripte ohne Bundler. Sie teilen sich den globalen Zustand und werden in der Reihenfolge von `index.html` geladen. Neue Dateien müssen in `index.html`, `sw.js` (SHELL) und `scripts/build.mjs` (shellFiles) eingetragen werden; `tests/shell.test.mjs` prüft das.

| Ordner/Datei | Inhalt |
| --- | --- |
| `data/` | Reine Daten ohne Logik: Kader und Profile (`squad.js`), Hallenfotos (`venues.js`), Start-/Notfallstand (`fallback.js`), Vereinsgeschichte und Titeljahre (`club.js`) |
| `js/logic.js` | Spiel- und Spieltagslogik ohne Seitenzugriff (Zürcher Zeit, Anpfiff, Countdown, Ergebnis, relative Tage); getestet in `tests/logic.test.mjs` |
| `enhancements.js` | Spieltagsdetails, Saisonverlauf, Offline-Hinweis, Spielberichte |
| `js/core.js` | Zustand, Escape-Helfer, `photoUrl`, Karten, Wappen, Fusszeile, einheitliche Zurück-Links (`backLink`) |
| `js/views-*.js` | News, Saison (Spielplan, Kalender, Tabelle, Kader), Spielseite, Spielerprofil, Vereinsseite |
| `js/router.js` | Hash-Routing und `render()` |
| `js/data-sync.js` | Datenstand laden, zwischenspeichern, aktualisieren |
| `js/live.js` | Live-Karte auf der Startseite |
| `js/main.js` | Startcode; wird zuletzt geladen |

Skripte rufen beim Laden keine Funktionen aus später geladenen Dateien auf. Alles, was beim Laden ausgeführt wird, steht in `js/main.js`.

### Bilder und Gestaltung

Fotos, Spielerbilder und Wappen liegen als WebP vor. Namen aus den Daten (`.jpg`, `.png`) werden in `photoUrl()` auf `.webp` umgestellt; neue Bilder deshalb als WebP ablegen (`convert bild.jpg -resize '1600x1600>' -quality 80 bild.webp`). Farben und Schriften stehen als CSS-Variablen am Anfang von `style.css`. Ergebnisfarben (`--win`, `--draw`, `--loss`) gelten überall gleich.

### Tests der Oberfläche

`tests/views.test.mjs` baut alle Ansichten mit dem mitgelieferten Datenstand in einer einfachen Browser-Attrappe und prüft auf Platzhalter-Fehler. Das ersetzt keinen Blick im Browser, fängt aber Tippfehler und kaputte Vorlagen ab. Service Worker für App-Hülle, Bilder und versionierte Artikel; lokaler Snapshot beschleunigt den ersten Render. Live- und Berechtigungsantworten dürfen nicht aus dem Cache kommen.

## API

server/worker.mjs ist ein Worker mit fetch(request, env). server/update.mjs verarbeitet WordPress, Spielplan und Tabelle; server/shv.mjs validiert SHV-Spielerwerte; server/live.mjs liefert bestätigte Live-Werte, jüngste Ergebnisse und direkte Duelle. scripts/build.mjs bündelt Module mit esbuild und versioniert die App-Hülle deterministisch.

GET /api/data liefert den aktuellen Snapshot; GET /api/articles/:id?v=:sha liefert separat den Volltext. GET /api/access liefert die Update-Berechtigung. POST /api/refresh ist ausschliesslich für den Eigentümer und die autorisierte Automation.

## Speicher und Identität

env.BUCKET: R2-kompatibler Objektspeicher mit get(key).json() und put(key,value). Schlüssel: kadetten/current.json, kadetten/previous.json und kadetten/articles/:id/:sha.json. env.ASSETS bedient die statischen Dateien. server/seed.json ist nur der mitgelieferte Start-/Notfallstand.

server/auth.mjs trennt Eigentümeridentität von der Daten-API. KADETTEN_AUTH_PROVIDER muss explizit konfiguriert sein; fehlende/ungültige Werte sperren Browser-Schreibzugriffe. Im Sites-Modus werden zusätzlich KADETTEN_SITES_ORIGIN und die Gateway-Identität geprüft. Im cloudflare-access-Modus verifiziert jose einen signierten Access-JWT aus Assertion-Header oder CF_Authorization-Cookie, anhand des konfigurierten Ausstellers, der App-Audience, Claims und der Eigentümer-E-Mail. Öffentliche E-Mailheader sind dort keine Identität. `/admin/login` ist der für Cloudflare Access vorbereitete Login-Einstieg. Der Cloudflare-Adapter wird beim gewählten Pages-Setup nicht aktiviert; Details: [Pages-Betrieb](pages.md).

KADETTEN_UPDATE_KEY_SHA256 enthält den SHA-256-Digest eines separaten Automation-Schlüssels. Er authorisiert keine Browseridentität. Schlüssel werden bei einem Hostwechsel neu erstellt, niemals aus Sites übernommen. Alle persönlichen Laufzeitwerte und Secrets bleiben ausserhalb des Repositorys.

## Aktualisierung

Die bestehende externe Automation aktualisiert alle zwei Stunden. Zusätzliche Matchday-/Live-Abfragen finden während sichtbarer App-Nutzung statt. Manche Quellen sperren direkte Worker-Abrufe; die Automation liefert deshalb öffentlich abgerufene Quelldaten an die geschützte API. Jeder Quellenfehler erhält den vorherigen gültigen Datenstand. Ein Wechsel des Hosts erfordert auch die Migration der Automationszugänge und R2-Inhalte.

## Lokal und GitHub

scripts/dev.mjs stellt einen lokalen, schreibgeschützten Adapter bereit. Identitäts- und Update-Header aus Browserrequests werden entfernt. .local-data ist ignorierter lokaler Speicher. GitHub Actions prüft und baut; der Pages-Workflow veröffentlicht nach erfolgreichen Prüfungen auf main ausschliesslich dist/client. Er enthält keine produktiven Zugangsschlüssel. Die Pages-Oberfläche nutzt platform.js als schreibgeschützten, credential-freien API-Adapter. Der bestehende Dienst erlaubt öffentliche GET-Reads per CORS über server/cors.mjs. .openai/hosting.json dokumentiert den bisherigen Sites-Projektbezug; es ist keine portable Cloud-Konfiguration.

## Vereinsgeschichte

Das kleine Wappen oben rechts führt zu `#club`. Redaktion, Archivbilder, Trophäenschrank und Zeitreise sind in [Vereinsseite](club-history.md) dokumentiert. Dieser historische Inhalt wird redaktionell gepflegt; Live- und News-Aktualisierung laufen unabhängig davon weiter.

### Darstellung vollständiger Newsartikel

`sanitiseArticle` übernimmt ausschliesslich erlaubte Inhalte aus den gespeicherten Originalartikeln. Fremde Fonts, Farben, Skripte und Eventhandler werden entfernt; Überschriften, Autoren, Zitate, Bildnachweise und HTTPS-Bilder bleiben erhalten. Erkannte Logos werden kompakt auf heller Fläche dargestellt, Paarungen aus dem Original gruppiert. Die Logo-Erkennung nutzt Dateinamen/Alternativtext sowie Abmessungen kleiner PNGs; grosse Spielpläne bleiben reguläre Bilder. Fotos werden nicht beschnitten. Leere Layout-Hüllen entfallen. Alle Artikel folgen der gemeinsamen Typografie in `enhancements.css`.

`tests/articles.test.mjs` prüft die DOM-Transformation mit Linkedom (nur Entwicklungsabhängigkeit), insbesondere Bildadressen, semantische Inhalte, Logos und das Entfernen aktiver Inhalte. Acht aktuelle Originalartikel wurden bei der Überarbeitung zusätzlich auf vollständigen Text und erhaltene Bildanzahl verglichen. Dies ersetzt keine vollständige visuelle Browserprüfung.

## Live-Spielansicht

Der Live-Block und die aktuelle Partie im Spielplan öffnen dieselbe interne Spielseite. Während die Startseite, Spieleübersicht oder eine Spielseite sichtbar ist, wird `/api/live` abgefragt; bei laufendem oder bereits beobachtetem Spiel alle 30 Sekunden. Unsichtbare Seiten pausieren. Ohne bestätigtes Live-Spiel wird der bestehende Vorschau-/Rückblickbereich verwendet; die bereits geöffnete Live-Ansicht behält den letzten Spielstand und zeigt eine Statusmeldung.

Die nationale Quelle liefert zusätzlich `gameLog` und `gamePlayerStats` mit `isLive:true`. Optionale Statistikfehler verhindern die Auslieferung des Spielstands nicht. Der Server hält den letzten gültigen Statistikstand pro aktuellem Spiel, einschliesslich dessen Zeitstempel. Personen mit eingeschränkter Darstellung sowie die vom SHV verwendeten Staff-Platzhalter ab ID 10000000 werden nicht als Spieler angezeigt. Fehlende Einzelwerte bleiben `null` und erscheinen als Strich. Ereignisse und Spieler werden auf Spiel-ID und Teams geprüft. Sofascore wird wegen seiner Zugriffssperre nicht automatisch importiert.


Die Spielplan-Liste verwendet für die laufende Partie dieselbe Matchday-Karte wie die Startseite; im Kalender erscheint sie über dem Monatsraster. `/api/live` liefert zusätzlich `finished` für das letzte heute ausdrücklich als gespielt bestätigte nationale Spiel. Dessen Endresultat ergänzt den noch älteren Zweistunden-Snapshot im Browser. Die Detailansicht behält den Verlauf und kennzeichnet das Spiel als beendet. Ein Spielende wird anhand des offiziellen Abschlussstatus erkannt, niemals nur anhand von 60:00 oder einem Halbzeitpfiff.

Die Startseitenkarte behält das letzte bestätigte Tagesresultat bis 24:00 Uhr in `Europe/Zurich`. Danach zeigt sie die nächste Vorschau. Der bestehende Sekunden-Timer prüft den Tageswechsel auch ohne Navigation; beim Zurückkehren in eine zuvor unsichtbare App wird die Karte sofort neu bestimmt. Ein Resultat aus `/api/live.finished` hat am Spieltag Vorrang vor einem älteren Snapshot.

Abgeschlossene QHL-Spiele: `/api/reports/:id` liest den bestätigten SHV-Bericht unabhängig vom Tageswechsel. Die autorisierte Zweistunden-Aktualisierung speichert Teamwerte, Spielerwerte und Ereignisse dauerhaft unter `kadetten/reports/<SHV-ID>.json`. Öffentliche GET-Aufrufe schreiben nicht. Fehlgeschlagene Importe erhalten vorhandene Berichte; der neueste Abschluss wird für nachträgliche Korrekturen erneut geprüft. Statische geprüfte Berichte dienen als Rückfall. Die Oberfläche zeigt den Teamvergleich, Torverlauf und Einzelwerte; fehlende Werte bleiben als Strich sichtbar. EHF-Berichte verwenden weiterhin die vorhandenen verifizierten Vereinsangaben.

## Zwei Vereine (Etappe 1)

`js/clubs.js` verwaltet die Vereinswahl unabhängig von Kadetten-Snapshots. Der Umschalt-Button im Titelbereich wechselt zwischen Kadetten Schaffhausen und FC St. Gallen. `localStorage` merkt sich die Auswahl; `?club=fcsg` bzw. `?club=kadetten` hat Vorrang und macht Links teilbar. Bereichsrouten bleiben erhalten; Artikel-, Spiel- und Spieler-Details gehen beim Wechsel zur zugehörigen Übersicht. Die Auswahl verändert keine Kadetten-Daten.

Die FCSG-Oberfläche verwendet Navigation, Layoutbausteine und CSS-Farbvariablen der bestehenden App. In dieser ersten Etappe sind ihre Daten noch nicht angebunden; die Ansichten kennzeichnen dies explizit und verlinken den offiziellen Verein. Keine Kadetten-Werte, Nullstatistiken oder vermeintlichen Live-Daten werden dort angezeigt. Das offizielle Wappen stammt von https://www.fcsg.ch/cdn/shop/files/logo.svg?v=1711098308&width=600 . Die Kadetten-Live-Abfrage pausiert während der FCSG-Auswahl und startet beim Zurückwechseln erneut. Nachfolgend müssen FCSG-News/Volltexte, Paarungen, Tabellen und Spielerwerte mit getrennten Daten- und Cache-Schlüsseln angebunden werden.
