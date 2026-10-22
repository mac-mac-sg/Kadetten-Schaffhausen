# Veröffentlichung wie Essens-Check

> Stand 06.10.2026: Die App liest seit dem Umschalten vom Cloudflare-Datendienst, siehe [Umzug auf Cloudflare](cloudflare-umzug.md) und [Betrieb](betrieb.md). Der bisherige Sites-Dienst läuft unverändert weiter, wird aber nicht mehr gelesen.

Entscheid vom 03.10.2026: keine separate Testumgebung; GitHub Actions und GitHub Pages wie bei Essens-Check. Für den Datendienst wird das bereits eingerichtete Cloudflare-Konto verwendet.

## Ablauf

Ein Pull Request prüft Syntax, Tests, Pages-Build und Projektpfade. Nach Merge nach main prüft der Workflow nochmals und veröffentlicht ausschliesslich dist/client auf GitHub Pages. Zugangsdaten und Worker-Code werden nicht mitveröffentlicht. Die Pipeline nutzt die gleichen versionierten GitHub-Pages-Actions wie Essens-Check.

Die App verwendet relative Assetpfade, Manifest-Scope und Service-Worker-Scope für `/Kadetten-Schaffhausen/`. `npm run build:pages` erzeugt die öffentliche Oberfläche; `npm run build` behält den bisherigen Sites-Build bei.

Die einmalige Repository-Einstellung ist Settings → Pages → Source → GitHub Actions. Der Workflow versucht die Einrichtung über configure-pages. Wenn GitHub diese administrative Aktion mit seinem Workflow-Token nicht zulässt, muss der Eigentümer die Einstellung einmal selbst setzen und den Workflow erneut ausführen.

## Datendienst

GitHub Pages führt kein Worker-Backend aus. Für die bestehenden Funktionen ist der Datendienst auf Cloudflare Workers zuständig: https://kadetten-api.mac-mac-sg.workers.dev (Worker `kadetten-api`, Speicher Workers KV; Aufbau und Verlauf des Umzugs: docs/cloudflare-umzug.md). Der bisherige Sites-Datendienst unter https://kadetten.ma-ra10.chatgpt.site läuft unverändert weiter, wird von der Pages-App aber nicht mehr gelesen.

- News und vollständige versionierte Artikel im KV-Speicher
- Spielplan, Tabellen und Spielerwerte, aktualisiert durch den Workflow «Cloudflare-Datenaktualisierung» (GitHub Actions, Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20)
- bestätigte Live-Werte, Formkurven und Direktvergleiche (beim Aufruf aus den externen Quellen geholt)

Die Pages-App liest diese öffentlichen APIs ohne Cookies und ohne Zugangsschlüssel. Der Dienst erlaubt CORS ausschliesslich für öffentliche GET-Endpunkte und den Ursprung https://mac-mac-sg.github.io. Schreib-/Login-Endpunkte erhalten keine CORS-Freigabe. Die GitHub-App besitzt keinen manuellen Aktualisieren-Button und keinen Freigabeablauf. Sie liest den zuletzt automatisch aktualisierten Datenstand; Live-Abfragen bleiben unabhängig davon erhalten. Matchprogramme, Vorschauen und Rückblicke entstehen im autorisierten Actions-Schreiblauf und werden vom Datendienst ausgeliefert.

Das ist eine Migration von Codebasis, Oberfläche und Veröffentlichung nach GitHub. Der Datendienst bleibt eine ausdrücklich dokumentierte Abhängigkeit. Vollständige Artikel und laufende Statistiken werden nicht in Git-Commits kopiert. Es gibt keine separate Testumgebung.

## Betrieb und Rückkehr

Der ursprüngliche Sites-Link bleibt erreichbar. Zum Zurückschalten auf den bisherigen Datendienst genügt ein Revert der Umschalt-Änderung (`apiOrigin` in `scripts/build.mjs` und `connect-src` in `src/client/index.html`); solange der bisherige Dienst nicht abgeschaltet ist, liefert er seinen letzten Stand. Zum Rücknehmen einer fehlerhaften UI-Version den entsprechenden Merge auf main mit einem neuen Commit rückgängig machen; die Pages-Pipeline veröffentlicht diesen Stand. Bei einem Datendienst-Ausfall kennzeichnet die App den letzten gespeicherten Stand. Live-Antworten werden nie aus dem Offline-Cache angezeigt.


### Arena-Hintergrund auf der News-Startseite
Die drei Vereine verwenden lokal ausgelieferte Fotos hinter Kopfzeile und Spieltagsblock. Alle drei Fotos werden mit der Offline-Hülle vorgeladen und im Build-Hash berücksichtigt. Vereinsfarbene Lichtverläufe, leichte Unschärfe und dunkle Glasflächen erhalten die Lesbarkeit. Das bereits abgedunkelte Otmar-Banner wird nur per CSS aufgehellt.

Bildquellen:
- Kadetten: BBC Arena, bestehendes Foto `assets/bbc-arena-hall.webp`.
- FCSG: FC St.Gallen 1879, Berit Sitterstadion, https://www.fcsg.ch/pages/beritklinik; Bild https://cdn.shopify.com/s/files/1/0694/0681/8529/files/berit-sitterstadion.jpg?v=1782912949&width=1200; lokale Datei `assets/fcsg-stadium.jpg`.
- St. Otmar: TSV St.Otmar, Kreuzbleiche-Tribüne, https://otmar.ch/; Bild https://data.otmar.ch/data/home/_headerSplashScreen/70186/Kreuzbleiche-Tribuene-Herobanner.webp; lokale Datei `assets/otmar-kreuzbleiche.webp`.

### Einführung & Tipps
Beim ersten Öffnen auf einem Gerät erscheint eine überspringbare Einführung in vier Schritten: Vereinswahl, News, Spiele und Kader. Abschluss, Überspringen und Escape speichern `fan-app-onboarding-v1` lokal. Auf der Startseite unter Einstellungen → Einführung & Tipps lässt sich die Einführung jederzeit erneut öffnen, auch in der installierten App. Nach dem ersten vollständigen Durchlauf kann der bestehende Installationshinweis folgen; eine Installation erfolgt weiterhin nur nach ausdrücklichem Klick. Die erneut geöffnete Einführung zeigt keinen Installationshinweis.

### Einheitliche Bedienung und Offline-Nutzung
Spielbereiche verwenden «Statistiken» und für laufende Ereignisse «Liveticker». Handball-Rückblicke bleiben als eigene Berichte bezeichnet. Spielerprofile haben bei allen Vereinen die Abschnitte Steckbrief und Statistik sowie einen klaren Rückweg zum Kader. Der Handball-Steckbrief bleibt bewusst bildfüllend; FCSG behält den Vereinskontext in der Kopfzeile.

Die FCSG-Spielseite nutzt einen kompakten Detailkopf ohne erneuten Link auf dieselbe Seite. Der Spielplan markiert das nächste Spiel innerhalb des gewählten Wettbewerbs. Der Kalender startet im aktuellen Schweizer Monat. Bereichsspezifische Quellenfehler und verzögerte Datenstände erscheinen bei den jeweiligen Inhalten.

Alle drei Vereins-Snapshots sowie bereits gelesene Artikel werden offline gesichert. Versionierte Artikel werden nur mit passender Version gespeichert; nicht versionierte Otmar-Artikel werden online zuerst neu gelesen. Der Bildcache berücksichtigt die offiziellen Bildhosts aller drei Vereine. Live- und Verlaufsabfragen bleiben ausschliesslich im Netz. EHF-Bilanzbalken entstehen nur aus einer vollständigen, mit Tabellenpunkten übereinstimmenden Resultatliste; Punkte allein erlauben keine eindeutige Bilanz.

### Auslieferung und Ladevolumen
Der Build bündelt die in `index.html` geordneten Quellskripte zu `js/app.js` und die Stylesheets zu `app.css`. Die Plattformkonfiguration bleibt ein eigenes Skript; beide Skripte werden mit `defer` in definierter Reihenfolge ausgeführt. Die Quellmodule bleiben für Entwicklung und Tests getrennt. PDF.js wird erst beim Öffnen eines Matchprogramms geladen; sein Worker wird relativ zur App-Basis adressiert.

Der Versionshash berücksichtigt Quellmodule und erzeugte Dateien. Die veröffentlichte Service-Worker-Hülle enthält die erzeugten Dateien und erhält bei der Aktivierung die gespeicherten Vereins-Snapshots. `check-pages.mjs` prüft Dateipfade, Reihenfolge, `defer`, gemeinsame Cache-Version und PDF-Dateien.

Messung vom 12.10.2026 (JavaScript und CSS, ohne Bilder/API-Antworten): 30 Abrufe → 3, 644'018 → 533'192 unkomprimierte Bytes, 161'339 → 124'465 Bytes bei lokal gemessener Gzip-Kompression. Das ist eine Volumenmessung, keine pauschale Aussage zur Ladezeit auf einem konkreten Gerät. 60 Ansichten bei 390/1280 px wurden mit identischen Daten verglichen; die geprüften Layout- und Stilwerte stimmen überein. Doppelte beziehungsweise überlagerte Deklarationen und Regeln des ehemaligen Vereinswechsel-/Refresh-Knopfs wurden entfernt; bestehende Fallbackketten und Bewegungseinstellungen bleiben berücksichtigt.

### Meine Woche und visuelle Einführung
Unter Spiele ergänzt «Meine Woche» Liste und Kalender. Die gemeinsame Ansicht verwendet dasselbe Monatsraster und dieselbe Monatsnavigation wie «Kalender», zeigt aber nur die Wappen der in den Einstellungen ausgewählten Vereine. Beide Ansichten behalten beim Wechsel den gewählten Monat. Eine Begegnung zweier ausgewählter Vereine wird zusammengeführt und zeigt beide eigenen Wappen; jedes öffnet die passenden Vereins-Spielinfos. Heim-/Auswärtsmarkierungen bleiben erhalten, Gegner und bestätigte Resultate stehen im zugänglichen Linktext und in den Spielinfos.

Solange die gemeinsame Ansicht sichtbar ist, werden die offiziellen Live-Endpunkte aller ausgewählten Vereine alle 30 Sekunden abgefragt. Fehler behalten den letzten gültigen Stand; offline stehen die gespeicherten Spielpläne zur Verfügung. Veraltete Daten, fehlgeschlagene Aktualisierungen und Offline-Zustand erscheinen als kleiner roter Punkt oben rechts. Die Details öffnen sich erst beim Antippen. Auch ein Hinweis auf eine neue App-Version ist dort kompakt und lädt die App erst auf ausdrücklichen Klick neu.

Die vier Einführungsschritte enthalten dekorative Beispiele für Vereinswahl, News, Wochenansicht sowie Kader mit hervorgehobenem Vereinswappen für Geschichte und Erfolge. Die gespeicherte Einführungsversion bleibt gleich: Bestehende Nutzer erhalten keinen erneuten automatischen Durchlauf und können sie über die Einstellungen öffnen.

### Stabile Kopfzeile im Spielplan
Liste und Kalender verwenden dieselben Abstände, Schriftgrössen und die gleiche Vereinskopfzeile. Die kompakte Darstellung auf niedrigen Displays gilt für beide Ansichten; «1. Mannschaft …», Titel und Umschalter wechseln deshalb nicht ihre Position. Der Kalender bleibt im sichtbaren Bereich ohne Seitenscrollen. Die Vereinskopfzeile mit Vereinsauswahl bleibt auch beim Scrollen der Liste dauerhaft sichtbar. Die Spielplan-Laschen rasten unmittelbar darunter ein; die Saisonzeile kann dahinter verschwinden. Beim Zentrieren des nächsten Spiels werden beide sichtbaren Kopfbereiche berücksichtigt. Eine einpixelige Überlappung verhindert einen durchscheinenden Spalt.

Die optionale Browser-Regression `node scripts/check-games-layout.mjs` läuft nach `npm run build:pages` mit installiertem Playwright/Chromium. Sie prüft Liste → Kalender → Meine Woche → Kalender → Meine Woche → Liste bei allen drei Vereinen, vier Fenstergrössen und mit/ohne Partien. Vorhandene Browser-Runtimes können über `GAMES_PLAYWRIGHT_MODULE` und `GAMES_CHROMIUM_EXECUTABLE` eingebunden werden; produktive Daten und zusätzliche npm-Abhängigkeiten sind nicht erforderlich.

Der gemeinsame Titel «Spiele» und der Umschalter stehen in allen drei Ansichten an derselben Stelle. Wettbewerbsauswahl und Quellenhinweise folgen darunter; die gemeinsame Ansicht zeigt dort dieselbe Monatsnavigation wie der Kalender. Beim Umschalten beginnt die neue Ansicht oben, damit eine lange Spielplan-Liste die kürzere Wochenansicht nicht ans Ende scrollt. Die Liste zentriert weiterhin das nächste Spiel.

### Matchday-Rahmen
Am Schweizer Spieltag läuft ein heller Lichtabschnitt entlang des vorhandenen Kartenrahmens: eine Runde in 8 Sekunden, in der letzten Stunde vor dem bestätigten Anpfiff in 5 Sekunden und bei offiziell bestätigtem Live-Status in 3 Sekunden. Ein erreichter Anpfiff allein erzeugt keinen Live-Status. Der Lichtabschnitt pulsiert dezent in seiner Helligkeit; der bestehende Wappen-Herzschlag bleibt erhalten. Die Karte und ihre Inhalte werden dabei nicht skaliert.

Eine dekorative SVG-Kontur folgt den tatsächlichen vier CSS-Ecken, einschliesslich unterschiedlicher und elliptischer Radien. Ein ResizeObserver passt sie an Grösse und Zeilenumbrüche an. Datenaktualisierungen behalten denselben SVG-Knoten, damit die Runde nicht neu beginnt. Der Effekt verwendet Orange, Grün beziehungsweise Gelb für Kadetten, FCSG und St. Otmar. Nach einem bestätigten Endresultat stoppt die Bewegung; der ruhende Rahmen verwendet die vorhandenen Ergebnisfarben. Ausgeblendete Seiten pausieren und bei reduzierter Bewegung bleibt ein statischer Schimmer. Vor dem Matchday bleibt der bestehende Vorschau-Schimmer erhalten.

### Hellmodus in V1
In den Einstellungen unter «Darstellung» schaltet «Heller Modus» die gesamte V1 um. Standard bleibt dunkel. Die Wahl gilt für alle Vereine auf diesem Gerät und wird unter `fan-v1-theme` gespeichert; die Startseite setzt sie vor dem App-Bündel, damit beim erneuten Öffnen keine dunkle Zwischenansicht erscheint. Ein fehlender oder gesperrter lokaler Speicher verhindert die Bedienung nicht. V2 behält seine unabhängigen Einstellungen.

Die helle Farbpalette umfasst Navigation, Vereinsmenü, Dialoge, Leseflächen, Spielplan, Kalender, Tabellen, Spielerstatistiken, Matchdetails, Diagramme und Vereinsgeschichte. Fotos behalten ihre natürlichen Farben; Matchday-Karten und das Aufstellungs-Spielfeld verwenden bewusst dunkle Flächen mit heller Schrift. `scripts/check-v1-theme.mjs` prüft Umschalten, Wiederherstellen, Vereinswechsel, kleine Displays, Einführung und Kontraste im Browser.

### V1: Wischen zwischen Hauptansichten
Ein deutlicher horizontaler Wisch im Inhalt wechselt zwischen News, Spiele, Tabelle und Kader. Nach links geht es zur nächsten, nach rechts zur vorherigen Ansicht; an den Enden bleibt die aktuelle Ansicht geöffnet. Beim ersten Öffnen der Spiele erscheint die ungefilterte Liste mit dem nächsten Spiel im Mittelpunkt. Beim Zurückkehren über Navigation oder Wischgeste bleiben Listen-/Kalenderansicht, Wettbewerb, Monat und Leseposition pro Verein innerhalb der laufenden App-Sitzung erhalten. Verein und Browserhistorie bleiben erhalten.

Vertikales Scrollen, mehrfingerige Gesten, Textauswahl, Bildschirmränder, Bedienelemente, Kalender und tatsächlich horizontal scrollbare Inhalte lösen keinen Tabwechsel aus. Artikel, Spieleinzelansichten, Spielerprofile, Vereinsgeschichte und offene Dialoge sind ausgenommen. Der Inhalt folgt dem Finger mit einer skriptfreien Vorschau der Nachbaransicht; beim Loslassen gleitet er weiter oder zurück. Die Vorschau berücksichtigt die gemerkte Ansicht und Leseposition. Fixierte Leisten und Filter bleiben stehen. Bei reduzierter Bewegung entfällt der Effekt. V2 bleibt unabhängig.

`tests/swipe-tabs.test.mjs` prüft Gestenerkennung und Ausschlüsse; `scripts/check-tab-swipes.mjs` prüft native Touch-Ereignisse über Chromium/CDP, Navigationszustand, Scrollverhalten und Barrierefreiheit. Die Browser-Umgebungsvariablen entsprechen `scripts/check-v1-theme.mjs`.

## V1: Ansichten behalten und ruhiger lesen

Während der laufenden App-Sitzung bleiben Scrollpositionen getrennt nach Verein und Route erhalten. Listenansicht und Kalender sowie die Wettbewerbsfilter haben eigene Positionen; Zurück aus einem Artikel führt zur zuvor gelesenen News-Karte. Neue Starts beginnen weiterhin bei den Kadetten bzw. einem ausdrücklich verlinkten Verein.

Die Spieleliste trennt das aktuelle Spiel durch feine Linien von den übrigen Partien: «Vergangen» mit Pfeil nach oben steht direkt davor, «Kommend» mit Pfeil nach unten direkt danach. Ein Marker erscheint nur, wenn auf der jeweiligen Seite weitere Spiele vorhanden sind; ohne aktuelles Spiel erscheinen keine Marker. Die drei bisherigen Sprungbuttons entfallen. Ausserhalb des aktuellen Spiels erscheint zusätzlich «Zum aktuellen Spiel» über der Hauptnavigation. Weite Sprünge sind sofort, kurze Sprünge können weich erfolgen; reduzierte Bewegung und Tastatureingaben bleiben unmittelbar.

Unter Einstellungen → Darstellung lässt sich die Leseschrift zwischen Standard (17 px) und Gross (20 px) umstellen. Die Auswahl wird lokal gespeichert und gilt für Artikel. Erstmaliges Laden verwendet statische Textplatzhalter mit zugänglicher Statusmeldung; Fehler bieten weiterhin einen erneuten Versuch.

Beim Lesen unterhalb des ersten News-Bereichs verändern eingehende Artikel die sichtbare Liste nicht. «Neue Beiträge verfügbar» übernimmt die neue Liste auf Wunsch und führt zum Anfang. Andere Daten werden weiter aktualisiert; beim nächsten bewussten Ansichtswechsel wird die vorgemerkte Liste ebenfalls übernommen.

`tests/view-state.test.mjs` deckt Ansichten, Vereinswechsel, Filter und vorgemerkte News ab. `scripts/check-view-comfort.mjs` prüft nach dem Pages-Build zusätzlich reale Browserhistorie, Spielabschnittsmarkierungen, Kalender-/Filterzustand, Schriftgrösse, neue News für alle drei Vereine, Ladefehler sowie mobile und Desktop-Barrierefreiheit. Browser-Variablen entsprechen den übrigen Layoutprüfungen.

## V1: einklappender Spielkopf

Der grosse Spielkopf mit Teamlogos bleibt beim Öffnen sichtbar und scrollt mit dem Inhalt nach oben. Sobald die Spielbereich-Laschen die Vereinskopfzeile erreichen, übernimmt eine kompakte Zeile mit Zurück-Link, kleinen Logos, Teams und Termin beziehungsweise bestätigtem Spielstand/Status. Die Laschen bleiben direkt darunter erreichbar. Beim Zurückscrollen erscheint der grosse Kopf wieder. Die kompakte Zeile überlagert den auslaufenden Kopf, sodass sich die Dokumenthöhe beim Umschalten nicht verändert.

Das Verhalten gilt für Handball- und FCSG-Spielseiten in V1. Ein Laschenwechsel innerhalb desselben Spiels behält den kompakten Zustand, wenn noch keine andere Leseposition für die Zielansicht gespeichert ist. Live-Aktualisierungen übernehmen Spielstand und Status, ohne allein wegen der erweiterten Kopf-Darstellung die unveränderte Handball-Live-Ansicht neu aufzubauen. Reduzierte Bewegung verzichtet auf den kurzen Übergang; V2 bleibt unverändert.

`tests/match-header.test.mjs` deckt Einklappen, Rückkehr, Live-Werte, unveränderte Live-Antworten und V2 ab. `scripts/check-match-header.mjs` prüft im Browser alle drei Vereine bei 390 px und Desktop in hell/dunkel: stabile Dokumentposition, kompakte Kopf-/Laschen-Geometrie, Rückwege, Laschenwechsel, geänderte Spielstände, reduzierte Bewegung und axe-Barrierefreiheit. Browser-Variablen entsprechen den übrigen Layoutprüfungen; `MATCH_HEADER_SCREENSHOT` und `MATCH_HEADER_REPORT` sind optionale Ausgaben.

## App-Symbol V1

Der Pages-Build setzt ausschliesslich für V1 das freigegebene Fanschal-Symbol ein: `assets/app-v1-scarf-glow-*` in 192/512 px, mit zusätzlicher Maskable-Version, Apple-Touch-Icon (180 px) und Favicon (64 px). Die Grafik verwendet die freigegebene Variante 3 mit kräftigem Orange, Grün und Gelb sowie weichem Lichtsaum auf dunklem Hintergrund. Sie wurde für die Icon-Grössen verkleinert. Das Maskable-Symbol hat zusätzliche Randreserve. Neue Dateinamen lösen die Erkennung einer Icon-Änderung durch installierte Browser-Apps aus. Der Build hasht und speichert die Symbole in der Offline-Hülle. Vereinswappen unter `assets/logo.png` und die V2-Installationssymbole bleiben erhalten. `scripts/check-preview.mjs` prüft diese Grenze. Der lokale ungebündelte Entwicklungsserver nutzt weiterhin die ursprüngliche Hülle; das installierbare V1-Paket entsteht durch `npm run build:pages`.

V1 heisst «Matchday»: Manifest-Name und Kurzname, Apple-Web-App-Titel, initialer Browser-Titel, Installationshinweis/-bestätigung und Offline-Seite verwenden diesen Namen. Die bestehende App-ID, Startadresse, Scope und gespeicherten Einstellungen bleiben erhalten. Die Vereinsauswahl heisst weiterhin «Meine Vereine». Die Umbenennung erfolgt ausschliesslich im V1-Build; V2 bleibt bei «Meine Vereine».
