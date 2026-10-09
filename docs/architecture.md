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

Die bestehende externe Automation aktualisiert beide Vereine um 06:20, 09:20, 12:20, 15:20, 18:20, 21:20 und 22:20 Uhr in Europe/Zurich. Zusätzliche Matchday-/Live-Abfragen finden während sichtbarer App-Nutzung statt. Manche Quellen sperren direkte Worker-Abrufe; die Automation liefert deshalb öffentlich abgerufene Quelldaten an die geschützte API. Jeder Quellenfehler erhält den vorherigen gültigen Datenstand. Ein Wechsel des Hosts erfordert auch die Migration der Automationszugänge und R2-Inhalte.

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


Die Spielplan-Liste verwendet für die laufende Partie dieselbe Matchday-Karte wie die Startseite; im Kalender erscheint sie über dem Monatsraster. `/api/live` liefert zusätzlich `finished` für das letzte heute ausdrücklich als gespielt bestätigte nationale Spiel. Dessen Endresultat ergänzt den noch älteren Saison-Snapshot im Browser. Die Detailansicht behält den Verlauf und kennzeichnet das Spiel als beendet. Ein Spielende wird anhand des offiziellen Abschlussstatus erkannt, niemals nur anhand von 60:00 oder einem Halbzeitpfiff.

Die Startseitenkarte behält das letzte bestätigte Tagesresultat bis 24:00 Uhr in `Europe/Zurich`. Danach zeigt sie die nächste Vorschau. Der bestehende Sekunden-Timer prüft den Tageswechsel auch ohne Navigation; beim Zurückkehren in eine zuvor unsichtbare App wird die Karte sofort neu bestimmt. Ein Resultat aus `/api/live.finished` hat am Spieltag Vorrang vor einem älteren Snapshot.

European-League-Spiele (EHF): `/api/live` liest Spielstand, Spielzeit und Phase aus dem EHF-Livescore-Feed und ergänzt Teamwerte aus `GetMatchDetailStatistic?matchId=<Spiel-ID>` (`details.teamStats`: Tore, Würfe, Fehlwürfe, Wurfquote, 7 m, 2-Minuten-Strafen, Verwarnungen, Disqualifikationen, technische Fehler). Spielerwerte liest der Worker aus `GetMatchDetails?matchId=<Spiel-ID>` (`matchDetails.details.homeTeam/guestTeam.players[].score`: Tore, Würfe, 2-Minuten-Strafen, Verwarnungen, Rote Karten, Paraden und erhaltene Würfe der Torhüter; 7 m je Spieler gibt es nicht) und legt sie als `details.players` im Format der QHL ab. Beide Aufrufe sind unabhängig: fällt einer aus, bleibt der andere erhalten. Das Spielende erkennt der Worker am Livescore-Feed: Das Spiel bleibt dort für den Tag stehen, mit `matchStats` `{phase: "Match ended", stateEnum: 2, isLive: false}` und den Endtoren in `homeStats`/`guestStats.totalGoals` (6. Oktober 2026: 42:30). `parseEhfFinishedMatch` liefert daraus `finished` im Format der SHV-Spiele (`status: "finished"`, `date`, `score`); ohne bestätigte Endtore gilt ein Spiel nicht als beendet. Die Team- und Spielerwerte werden auch für das beendete Spiel geholt. Der Feed führt nur den heutigen und kommende Tage, keine Vergangenheit. Die EHF meldet die Spieluhr als «mm:ss» und liefert für diese Spiele keinen Ereignisverlauf (`GetMatchLiveFeed` bleibt leer); die Oberfläche sagt das und zeigt Team- und Spielerwerte. Befund vom 6. Oktober 2026, siehe «EHF-Quellen prüfen» in [cloudflare-umzug.md](cloudflare-umzug.md).

European-League-Spiele nach dem Schlusspfiff: Der Actions-Lauf (`scripts/lib/ehf-archive.mjs`, nur am Spieltag und am Folgetag) sichert Endstand, Team- und Spielerwerte der EHF-Spielseite sowie die Ereignisse des EHF-Livetickers (`https://ticker.ehf.eu/v3/TickerData`, POST mit `MatchID`; die Antwort ist rund 450 KB gross und wird deshalb nicht im Worker verarbeitet) unter `kadetten/ehf/<Spiel-ID der App>.json`. `server/ehf-ticker.mjs` rechnet daraus Torfolge, Halbzeitstand, grösste Führung, Serien, Flauten, Auszeiten, Zeitstrafen und Siebenmeter je Spieler; die Ereignisse gelten nur, wenn ihre Torzahl zum Endstand des Feeds passt. Aus diesen Fakten entsteht der «KI-Matchbericht» (`server/report-ai.mjs`, gleiche Schalter und gleiches Modell wie die Vorschauen; ohne KI oder bei Ausfall ein sachlicher Text, der in den nächsten Läufen bis zu dreimal durch einen KI-Text ersetzt wird). `/api/ehf-reports/:id` liefert den Eintrag nur lesend. Die App zeigt Bericht und Torfolge im Tab «Spielverlauf» bzw. «Rückblick» und die Statistik (Teamwerte, Feldspieler und Torhüter je Mannschaft mit Umschalter) im Tab «Statistiken»; die Quelle ist als EHF gekennzeichnet («ohne Gewähr», wie im Disclaimer des Livetickers).

Abgeschlossene QHL-Spiele: `/api/reports/:id` liest den bestätigten SHV-Bericht unabhängig vom Tageswechsel. Die autorisierte Datenaktualisierung speichert Teamwerte, Spielerwerte und Ereignisse dauerhaft unter `kadetten/reports/<SHV-ID>.json`. Öffentliche GET-Aufrufe schreiben nicht. Fehlgeschlagene Importe erhalten vorhandene Berichte; der neueste Abschluss wird für nachträgliche Korrekturen erneut geprüft. Statische geprüfte Berichte dienen als Rückfall. Die Oberfläche zeigt den Teamvergleich, Torverlauf und Einzelwerte; fehlende Werte bleiben als Strich sichtbar. EHF-Berichte verwenden weiterhin die vorhandenen verifizierten Vereinsangaben.

## Zwei Vereine

### EHL-Gegnerform

Der bestehende Actions-Aktualisierungslauf liest die Teamseiten der laufenden EHF-European-League-Saison (`scripts/lib/ehl-results.mjs`). Er entdeckt die Seiten über die offizielle Vereinsliste und speichert je EHL-Team die letzten bis zu fünf publizierten Resultate unter `ehlRecentGames` im Saison-Snapshot. Historische Saisons, künftige Spiele und leere Spielstände zählen nicht; Resultate vom laufenden Tag werden erst am Folgetag übernommen, damit Live-Zwischenstände nicht als Endresultat erscheinen. Quellenfehler erhalten Spiele und Zeitstempel des letzten gültigen Stands. Die bestehende Gegnerauswahl, Resultateliste und Formkurve lesen diese Daten; Layout, QHL-Datenabfragen und direkte Duelle bleiben unverändert. Kein neuer Worker-Endpunkt und keine separate Worker-Bereitstellung nötig. Die Daten erscheinen nach dem nächsten regulären Aktualisierungslauf.

`js/clubs.js` verwaltet die Vereinswahl und die FCSG-Ansichten unabhängig von Kadetten-Snapshots. Der Umschalt-Button im Titelbereich wechselt zwischen den Vereinen. Beim normalen Start öffnet die App immer Kadetten, unabhängig von der letzten Auswahl; `?club=fcsg` bzw. `?club=kadetten` hat Vorrang und macht Links teilbar. Bereichsrouten bleiben erhalten; Artikel-, Spiel- und Spieler-Details gehen beim Wechsel zur zugehörigen Übersicht.

FCSG verwendet dieselbe Navigation, News-Screens, Spielkarten, Tabellenstruktur und Kalendergestaltung. Der Kader enthält 30 öffentlich sichtbare Spieler der Saison 2026/27; Staff wird ausgeschlossen. Die Vereinsgeschichte bietet eine eigene Zeitleiste und den gemeinsamen Trophäenschrank mit FCSG-Daten. Das offizielle Wappen stammt von https://www.fcsg.ch/cdn/shop/files/logo.svg?v=1711098308&width=600 .

`server/fcsg.mjs` liest die öffentlich vom Verein verwendete, tokenfreie API unter `https://fcsg-api-cdn.b-cdn.net/api/v1/`. GET `/api/fcsg/data` liefert den Snapshot ohne Artikel-HTML; GET `/api/fcsg/articles/:id` liefert einen vollständigen Artikel. Diese GETs schreiben nicht. Die bestehende autorisierte Datenaktualisierung `/api/refresh` aktualisiert zusätzlich FCSG-News, Spiele, Tabelle und Kader. Quellenfehler erhalten Daten und letzten erfolgreichen Zeitstempel je Quelle. Der eigene Speicher-Schlüssel lautet `fcsg/current.json`; bestehende Kadetten-Daten bleiben unberührt. `server/fcsg-seed.json` und `data/fcsg-fallback.js` sind einmalige verifizierte Startstände; laufende Aktualisierungen werden ausschliesslich im Objektspeicher und Browsercache gespeichert.

Der Browser speichert FCSG separat unter `fcsg-public-data-v1` und liest während sichtbarer FCSG-Nutzung alle zwei Minuten den gespeicherten Serverstand. Kadetten-Live-Polling pausiert während der FCSG-Auswahl. FCSG-Spiele zeigen bestätigte Endresultate; Der FCSG-Liveticker liest die offiziellen Matchcenter-Endpunkte während sichtbarer Nutzung alle 45 Sekunden. Live-Stände bleiben getrennt von bestätigten Saisonresultaten. Statistiken entstehen aus den gemeldeten Ligaspielen und Ereignissen, mit ausgewiesener Datengrundlage. Fehlende Teamwerte bleiben als Strich sichtbar. Tabellenwerte werden auf Bilanz, Drei-Punkte-Regel und Tordifferenz geprüft. Noch unbestätigte Termine erhalten keine definitive Anspielzeit. Artikel-HTML wird mit dem vorhandenen Sanitizer sicher dargestellt, und ein geänderter Artikelstand leert den betreffenden Browser-Volltextcache.


### FCSG-Liveticker und Vereinsgeschichte

`js/fcsg-live.js` liest GET `/api/fcsg/live` für die heutige Partie und GET `/api/fcsg/matches/:id` für einzelne Spielseiten. Beide Endpunkte fragen die tokenfreie Vereins-API ab und lesen oder schreiben keinen Objektspeicher. Die Match-ID, Mannschaften und bestätigte Schlussresultate werden geprüft. Live-Status, Tore, Karten, Aufstellungen, Teamvergleich und die offiziellen Textmeldungen werden in der App angezeigt. Die Spielminute wird aus dem vom Verein gemeldeten Beginn der aktuellen Halbzeit berechnet; sie wird ohne eindeutigen Zeitstempel nicht angezeigt. Halbzeitpausen, Unterbruch, Verlängerung und Elfmeterschiessen haben eigene Statusbezeichnungen. Ein Spiel endet ausschliesslich bei `FINISHED`, nie allein aufgrund der Uhr.

Die Abfrage pausiert bei unsichtbarer App oder Kadetten-Auswahl. Ergebnisse liegen nur im flüchtigen Browsercache; bestätigte Saison-Snapshots bleiben unabhängig. Fehler behalten den letzten gültigen Stand und zeigen einen Unterbruchhinweis. Der Ticker zeigt die neuesten Textmeldungen zuerst; HTML wird mit dem bestehenden Artikel-Sanitizer bereinigt. Bei fokussierten Tickerlinks wird die Ersetzung der Tickerliste zurückgestellt, um den Fokus zu bewahren. GET-Abfragen arbeiten unabhängig vom Nachtfenster der bestehenden Automation.

`js/fcsg-history.js` enthält 13 redaktionelle Stationen von 1879 bis 2026 und vier Titelkategorien mit sechs nationalen Wettbewerbstiteln (2 Meisterschaften, 2 Cups, 1 Ligacup, 1 Hallenmasters). Der gemeinsame Trophäenschrank, die Jahreswahl und Kapitel-Navigation verwenden jeweils die Daten des ausgewählten Vereins. Zusammenfassungen und Fotos stammen aus den offiziellen FCSG-Seiten «Epochen» und «Titel und Erfolge»; Quellenstand 04.10.2026. Der zweite Cupsieg vom 24.05.2026 ist berücksichtigt. Jahresgrafiken ohne Archivaufnahme sind als dekorative Darstellung gestaltet.

### Weitere FCSG-Spielerfakten

Der Kaderimport verwendet die vollständige offizielle Antwort statt der Kurzfassung. Er übernimmt Körpergrösse, Nationalität, Debütdatum und Debütgegner sowie die veröffentlichten FCSG-Werte pro Saison und Wettbewerb (Einsätze, Tore, Vorlagen, Minuten, Karten). Freundschaftsspiele werden ausgeschlossen; fehlende Werte bleiben `null`. Die Oberfläche trennt die Saisons und Wettbewerbe und verwendet keinen Ersatzwert aus einer anderen Saison. `/api/fcsg/players` ist ein schreibgeschützter Abruf derselben Quelle ohne Speicherzugriff. Beim Öffnen eines Profils lädt der Browser diese Fakten; weitere Profile verwenden für 30 Minuten dieselbe Antwort. Die bestehende Datenaktualisierung übernimmt sie auch in den Snapshot. Fehler erhalten die bestehenden Profildaten.

### Match-Vorschauen

Seit dem Umzug auf Cloudflare entstehen die Vorschauen im Schreiblauf (`docs/vorschauen.md`), mit sachlichem Text als Grundlage und Rückfall und einer KI-Fassung von Cloudflare Workers AI, die ohne inhaltliche Prüfung übernommen wird (nur technische Regeln, `docs/vorschauen.md`): Der Schreiblauf von «Cloudflare-Datenaktualisierung» erzeugt für die nächsten drei Partien beider Vereine einen kurzen Text aus bestätigten Daten (Spielangaben, Tabelle des passenden Wettbewerbs, letztes Direktduell der QHL) und schreibt ihn nach `previews/<club>/<id>.json` im KV-Speicher. Fehlende Angaben entfallen; ohne genug Daten gibt es keine Vorschau. Der Text entsteht in `server/preview-text.mjs`, das Schreiben in `scripts/lib/preview-sync.mjs`, geprüft mit denselben Regeln wie eine Einsendung (`validPreview` in `server/previews.mjs`). Der Datendienst nimmt weiterhin Einsendungen per POST `/api/previews` mit dem Automationsschlüssel an, der derzeit nicht eingerichtet ist. GET `/api/previews/:club/:id` ist öffentlich und schreibgeschützt. Datum, Anspielzeit, Teams, Wettbewerb und Spielort müssen zum aktuellen Snapshot passen. Nach Änderungen, Spielende oder 72 Stunden ohne neue Vorschau wird der Text nicht mehr ausgeliefert. Der Browser zeigt den Text als «Match-Vorschau» und bei fehlendem Text weiterhin die bestätigten Spielinformationen. Die öffentliche Oberfläche enthält keinen Modellzugang oder Schreibschlüssel.

### Matchprogramme

Die Datenautomation prüft den PDF-Link unter «Nächstes Heimspiel» auf der offiziellen Kadetten-Homepage. Sie liest die erste PDF-Seite und importiert das Original nur bei passendem Heimteam, Gegner und Datum über den geschützten POST `/api/programmes`. Metadaten liegen unter `kadetten/programmes/<id>.json`, unveränderte PDF-Dateien unter `kadetten/programmes/<id>/<sha256>.pdf`. Öffentliche GET `/api/programmes/:id` und `/api/programmes/:id/pdf?v=:sha256` schreiben nicht; Änderungen am Spieltermin verbergen den alten Eintrag. Fehlgeschlagene Importe erhalten vorhandene gültige Programme. Keine PDF-Dateien gehören in Git.

Der Button öffnet ein natives Dialog mit lokal ausgeliefertem PDF.js. Die PDF-Datei und Viewer-Module werden erst beim Öffnen geladen; sichtbare Seiten werden nachgeladen, nicht sichtbare Canvas-Speicher freigegeben. Zoom, Schliessen, Escape, Fokus-Rückgabe, Bildschirmleser-Text und ein externer Link zum gespeicherten Original sind vorhanden. PDF-Skripte und interaktive Annotationen werden nicht ausgeführt. PDF.js-Lizenz liegt im Build unter `vendor/PDFJS-LICENSE`.

### Qualität: Hintergrundaktualisierung und Leseposition

Ein PDF-Dialog bleibt bei Datenaktualisierungen derselben Vereinsroute geöffnet; Seiten, Zoom und Scrollposition bleiben erhalten. Navigation schliesst den Dialog. FCSG-Snapshots werden anhand der tatsächlich angezeigten Daten verglichen, nicht anhand der Abfragezeit. Spielvorschauen bleiben bei unveränderten Matchdaten im DOM. Laufende Spiele werden alle 45 Sekunden abgefragt, andere Vorschauen höchstens alle fünf Minuten und abgeschlossene Spiele alle 30 Minuten. Die erste Abfrage beim Öffnen einer Detailseite bleibt möglich; Fehlversuche unterliegen derselben Begrenzung.

Die Verspätungswarnung berücksichtigt den nächsten geplanten Zürcher Import plus 45 Minuten Bearbeitungszeit, inklusive Nachtpause und Zeitumstellung. Internetunterbruch und fehlgeschlagene Serverantworten haben getrennte Meldungen. Beide Vereine verwenden gemeinsame Bilanz-/Heim-/Auswärtsbausteine und Tordurchschnitte mit einer Nachkommastelle.

Der Service Worker meldet seine Build-Version an die geöffnete App. Bei abweichender Version erscheint ein Hinweis mit «Jetzt aktualisieren» und «Später»; ein Neuladen erfolgt ausschliesslich nach Betätigung. Bei Rückkehr zur App wird die Version erneut geprüft; Update-Abfragen sind auf einmal pro 15 Minuten begrenzt.

Beim ersten Browserbesuch erscheint ein einmaliger Installationshinweis. In der installierten App wird er unterdrückt. Eine native Installationsabfrage wird erst durch Tippen ausgelöst; Safari und nicht installierfähige Browser erhalten eine Anleitung.

Abgeschlossene QHL-Spiele: Tab «Statistik» (zuerst) zeigt «Das Spiel in Zahlen», die Halbzeitstände und die Spielerstatistik mit Mannschaftsumschalter (Feldspieler: Tore/Würfe, Quote, 7 m, 2 min, Gelb, Rot; Torhüter als Kacheln «Zwischen den Pfosten» mit Paraden und Fangquote); der Tab «Aufgebot» entfällt. Die Darstellung der European League (YC, 2M, RC, S, G; Torhütertabelle) ist davon getrennt. Tab «Rückblick» zeigt den «KI-Matchbericht» mit Torfolge. Er entsteht im Schreiblauf (`syncQhlReports` in `scripts/lib/ehf-archive.mjs`, höchstens drei KI-Aufrufe je Lauf, neueste Spiele zuerst) aus dem gesicherten SHV-Spielbericht `kadetten/reports/<SHV-ID>.json` (`server/qhl-report.mjs`: Torfolge aus den Spielstandänderungen, Auszeiten, Spieler- und Teamwerte) und liegt unter `kadetten/matchreports/<Spiel-ID>.json`; `/api/match-reports/:id` liefert ihn nur lesend. Ohne gesicherten Spielbericht oder bei unpassender Torzahl entsteht kein Bericht. Die Daten bleiben dauerhaft im KV-Speicher (ohne Ablauf): SHV-Spielberichte seit dem ersten Schreiblauf nach Spielende, European-League-Einträge ab dem Spieltag.

Abgeschlossene European-League-Spiele nutzen dieselben Ansichten wie abgeschlossene QHL-Spiele (Vorbild, Layout nicht ändern): Die Oberfläche übersetzt den gesicherten Eintrag `kadetten/ehf/<Spiel-ID>.json` (`ehfAsReport` in `src/client/js/live.js`) in die Form des SHV-Spielberichts und zeigt ihn mit `reportStats`, `reportComparison`, `reportHistory` und `matchOverview`. Der Eintrag (Version 2) enthält zusätzlich Zuschauer, Auszeiten und Zeitstrafen; ältere Einträge werden im nächsten Schreiblauf ergänzt, der Bericht bleibt unverändert. Spiele, die der Livescore-Feed nicht mehr führt, stehen in `KNOWN_MATCHES` (`scripts/lib/ehf-archive.mjs`). Ohne gesicherten Eintrag bleibt die einfache Endresultat-Ansicht. Rückennummern zeigt die Oberfläche bewusst nicht.

