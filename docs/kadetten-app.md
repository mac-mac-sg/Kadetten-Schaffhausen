# Kadetten Companion App (V2) – Spezifikation

**Seit 13. November 2026:** Die Kadetten-App ist die gültige App unter https://mac-mac-sg.github.io/Kadetten-Schaffhausen/ (Kopie unter `/v2/`); Matchday ist archiviert ([GitHub Pages](pages.md)).

**Aktuell ab 7. November 2026:** Die App ist reine Kadetten-App in der [Designsprache «Schnitt»](kadetten-app-design.md) mit fünf Tabs (Start, Spiele, Tabelle, Kader, Ich); Den Verein erreicht man über das Wappen oben rechts im Kader (seit 19.11.2026 nur dort). Der Tab «Ich» öffnet «Mein Bereich» (Quiz-Bilanz, Wissen mit Regeln, Aufstellungen und Spielzügen, Sammelkarten, Einstellungen über das Zahnrad; seit 18. November 2026, vorher Symbol oben rechts). Das [Matchday-Layout](v2-matchday-layout.md) ist abgelöst. Gestaltung und Seitenaufbau stehen im Designdokument; die Abschnitte «Struktur» und «Seitenaufbau» unten beschreiben die frühere Gliederung (Jetzt, Saison, Team, Verein) und gelten für Inhalte und Zustände weiter, nicht für Navigation und Gestaltung.

Stand: 5. November 2026. Grundlage: [Recherche Vereins- und Fan-Apps](research/vereins-und-fan-apps.md) und [Designanalyse und Funktionskatalog](research/designanalyse-und-funktionen.md).

## Ziel

Die V2 unter `/v2/` wird als eigenständige Kadetten Companion App neu aufgebaut: Spieltag-Begleiter und Nachschlagewerk für einen Club. Sie bündelt, was Fans heute an mehreren Orten zusammensuchen (handball.ch, RED+, SRF/Blick, EHF und kadettensh.ch), und ist rund um den Anpfiff verlässlich.

## Entscheide

| Thema | Entscheid |
|---|---|
| Matchday | Seit 13. November 2026 archiviert ([archive/matchday](../archive/matchday/README.md)). Die Kadetten-App läuft unter `/` (gleiche Manifest-ID und gleicher Scope wie Matchday) und als Kopie unter `/v2/`. FC St. Gallen und St. Otmar werden nicht mehr aktualisiert. |
| Neuaufbau | Die Kadetten-App wird komplett neu gestaltet und neu aufgebaut. Die bisherige V2 dient nur als Fundus (Datenlogik, Prüfwissen); sie gibt Struktur und Gestaltung nicht vor. |
| Ort | Die neue App ersetzt die bisherige V2 direkt unter `/v2/`. Installations-ID, Scope und `v2:`-Speicherschlüssel bleiben, damit installierte Apps weiterlaufen. |
| Technik | Ohne Framework: ES-Module, CSS mit Layern und Tokens, esbuild. Eigene Codebasis ohne gemeinsame Client-Dateien mit V1; die V1-Ausgabe bleibt nachweisbar bytegleich. |
| Datendienst | Die App liest den bestehenden Datendienst `kadetten-api`. Neue Funktionen erhalten nur zusätzliche Endpunkte unter eigenem Präfix (`/api/app/`, server/app-fan.mjs); bestehende Routen bleiben unverändert. |
| Charakter | Inoffizielle Fan-App. Kein Auftreten als offizielles Club-Angebot, Videos nur verlinken (Rechte bei SHV/RED), keine Werbung und kein Tracking einzelner Personen. Seit 24.11.2026 aktiv: anonyme Zählung der Seitenaufrufe mit Cloudflare Web Analytics (ohne Cookies, docs/betrieb.md). |

## Fragen der Fans

1. Wann spielen wir, und wie steht es?
2. Wie stehen wir da?
3. Was ist passiert, was kommt?
4. Wer spielt für uns?
5. Wer sind wir?
6. Was betrifft mich?

## Struktur

Vier Bereiche in der Hauptnavigation, reine Navigation ohne Aktionen. Persönliches liegt hinter einem Profilsymbol oben rechts. Die Spielseite ist der Mittelpunkt und von überall erreichbar.

```
Jetzt ──── nächstes oder laufendes Spiel, News, Tabelle in Kürze      (beantwortet 1, 3)
Saison ─── Spielplan & Resultate · Tabellen · Statistik               (beantwortet 1, 2)
Team ───── Kader · Spielerprofile mit Saisonwerten                    (beantwortet 4)
Verein ─── Geschichte · Titel · Heimhalle                             (beantwortet 5)
Ich (oben rechts) ─ Benachrichtigungen · Meine Spiele · Lieblingsspieler · Kalender-Abo · Einstellungen · Datenschutz/Impressum   (beantwortet 6)

Spielseite (von Jetzt, Spielplan, Spieler, Artikel) ─ Vorschau → Live → Bericht
```

### Kernobjekte und Verknüpfungen

| Objekt | Verweist auf |
|---|---|
| Spiel | Wettbewerb und Tabelle, Spieler (Bericht), Artikel, Matchprogramm |
| Wettbewerb/Tabelle | Spiele, Gegner |
| Spieler | Spiele (Saisonwerte), Artikel |
| Artikel | Spiel, Spieler |
| Verein | Titel, Geschichte, Heimhalle |

### Jetzt: Zustände

| Zustand | Zeitraum | Inhalt |
|---|---|---|
| Alltag | ausserhalb der übrigen Zustände | nächstes Spiel mit Countdown, letztes Resultat, News, Tabelle in Kürze |
| Spieltag | etwa 24 h vor Anpfiff | Spiel im Vordergrund: Ausgangslage (Tabelle, Form), Vorschau, «Wo läuft das Spiel?», Ticket-Link, Push zum Anpfiff |
| Live | Anpfiff bis bestätigtes Endresultat | Spielstand, Spielphase und Spielzeit, Halbzeitstand, Live-Tabelle, Zeitpunkt der letzten Aktualisierung |
| Nachspiel | bis 12:00 Uhr (Schweizer Zeit) am Tag nach dem Spiel; ein Spieltag hat Vorrang | Endresultat, Spielbericht mit Torschützen und Teamwerten, Tabelle danach, Teilen-Bild, nächstes Spiel |

### Spielseite: Zustände

| Zustand | Inhalt |
|---|---|
| Vorschau | Ausgangslage, Vorschau-Text, direkte Duelle, letzte Spiele beider Teams, «Wo läuft das Spiel?», Matchprogramm |
| Live | Spielstand, Phase und Spielzeit, Halbzeitstand, Live-Tabelle, «Stand vor x Sekunden» |
| Bericht | Endresultat und Halbzeit, Torschützen, Paraden, 7-m, Zeitstrafen, Teamvergleich, Tabelle danach, Artikel zum Spiel |

### Live-Kachel

Läuft ein Kadetten-Spiel, zeigt eine schmale dunkle Kachel über der Navigation Stand, Phase und Minute (`js/views/live-kachel.js`). Sie erscheint nicht auf der Titelseite, nicht in der Ansicht des laufenden Spiels und nicht in Ansichten ohne Navigation. Antippen öffnet `#/spiel/<id>/live`. Steigt der Stand der Kadetten, steht 45 Sekunden «Tor Kadetten» und die Zahl in Orange. Spiele anderer Mannschaften zeigen keine Kachel. Die Vorlage war die Live-Leiste der archivierten Matchday-App (`archive/matchday/client/v2/matchday.js`, `v2SyncLiveBar`), die Form folgt dem Schnitt (Streifenrand, schräge Marken).

## Seitenaufbau

Abgenommen anhand der Skizzen in Graustufen (5. November 2026). Reihenfolge von oben nach unten.

| Seite | Aufbau |
|---|---|
| Jetzt · Alltag | Nächstes Spiel mit Countdown · Letztes Resultat mit S/U/N · News (3 Artikel, «Alle News») · Tabelle in Kürze |
| Jetzt · Spieltag | Spielkarte (Wettbewerb, Halle, Anpfiff, Countdown) mit Ticket ↗ und «Push zum Anpfiff» · Ausgangslage (Tabellenplätze, Form, Punkte bei Sieg) · Vorschau-Auszug · «Wo läuft das Spiel?» |
| Jetzt · Live | Spielstand, Phase, Spielzeit, Halbzeitstand, «Stand vor x s» · Live-Tabelle («Bei diesem Stand: n. Platz») · Andere Spiele der Runde |
| Jetzt · Nachspiel | Endresultat mit Halbzeit und S/U/N · «Spielbericht» und «Resultat teilen» · Auszug aus dem Spielbericht · Tabelle danach · Nächstes Spiel |
| Spielseite | Kopf mit Datum, Wettbewerb, Halle und Paarung; Zustandsanzeige Vorschau · Live · Bericht (wechselt automatisch) |
| Spielseite · Vorschau | Ausgangslage mit Form beider Teams · Vorschau-Text · Direkte Duelle · Letzte Spiele beider Teams · Sender ↗ · Matchprogramm ↗ |
| Spielseite · Live | Grosser Spielstand mit Phase, Spielzeit, Halbzeit · «Stand vor x s, alle 30 s» · Live-Tabelle · Hinweis «Spielbericht folgt nach Abpfiff» · Stand teilen |
| Spielseite · Bericht | Endresultat und Halbzeit · Torschützen (mit 7-m, verlinkt auf Spieler) · Teamvergleich Paraden, 7-m, Zeitstrafen · Tabelle danach · Artikel zum Spiel |
| Saison | Umschalter Spielplan · Tabellen · Statistik |
| Saison · Spielplan | Filter Alle/QHL/EHL/Cup/Test · Spiele nach Monat mit Resultat und S/U/N · springt zum nächsten Spiel |
| Saison · Tabellen | QHL/EHL · Rang, Team, Spiele, Form, Punkte, Kadetten hervorgehoben · Live-Tabelle während eines Spiels · QHL-Vereinskarte |
| Team | Kader/Staff · Spielerkarten nach Position (Tor, Rückraum, Flügel/Kreis) |
| Spieler | Bild, Name, Nummer, Position · Saisonwerte (Spiele, Tore, 7-m) · Steckbrief · Letzte Spiele · «Als Lieblingsspieler merken» |
| Verein | Bild · Titel (Meister, Cup, Supercup) · Geschichte mit Archivbildern · Heimhalle |
| Ich | Benachrichtigungen (Anpfiff, Endresultat, Halbzeitstand, News) · Meine Spiele · Lieblingsspieler · Kalender-Abo · Darstellung System/Hell/Dunkel · App installieren · Datenschutz & Impressum · aufklappbar «Aktualität der Daten» (Stand je Quelle) |

Hauptnavigation unten: Jetzt, Saison, Team, Verein. «Ich» als Symbol oben rechts. Unterseiten haben oben links «← zurück».

## Inhalte

| Bereich | Inhalt | Stand |
|---|---|---|
| Spiele | Spielplan aller Wettbewerbe (QHL, EHL, Cup, Testspiele) mit Datum, Zeit, Ort, Resultat und Halbzeitresultat | vorhanden |
| | Live: Stand, Phase und Spielzeit | vorhanden (Abruf alle 30 Sekunden) |
| | Spielbericht nach dem Spiel | vorhanden (QHL, EHL) |
| | Vorschau, direkte Duelle, letzte Spiele beider Teams | vorhanden |
| | Matchprogramm (PDF) | vorhanden, wenn veröffentlicht |
| | «Wo läuft das Spiel?» | neu, redaktionell |
| Tabellen | QHL, EHL | vorhanden |
| | Live-Tabelle, Form (S/U/N) | neu, berechnet |
| News | Vereinsartikel mit Volltext und Bild | vorhanden |
| Team | Kader, Steckbrief | vorhanden |
| | Saisonstatistik pro Spieler | aus Spielberichten summiert |
| Verein | Geschichte, Titel, Archivbilder, Heimhalle, QHL-Vereinskarte | vorhanden |
| Persönlich | Push, Kalender-Abo, «Meine Spiele», Lieblingsspieler | Push vorhanden (Neuaufbau), Rest neu |

## Einschränkungen

- **Keine Angaben zu Anreise, Türöffnung oder Abreise.**
- **Live ohne Ereignisliste.** Der Live-Stand wird alle 30 Sekunden abgerufen. Angezeigt werden Spielstand, Phase, Halbzeit sowie laufend aktualisierte Team- und Spielerwerte (Entscheid 5.11.2026). Eine laufende Ereignisliste (Tor für Tor) gibt es bewusst nicht, obwohl der SHV sie liefern würde. Massgebend bleibt der bestätigte Spielbericht nach Abpfiff.
- Der letzte gültige Stand bleibt bei Ausfällen sichtbar; Live-Antworten werden nie aus dem Cache gezeigt.

## Gestaltung

Richtung «Abend» (Spielkarte mit Hallenfoto, schmale Anzeigetafel-Ziffern, ruhige neutrale Flächen; am 6.11.2026 nach dem Skill unslop überarbeitet), Hell- und Dunkelmodus. Farben, Schrift, Abstände und Bausteine: [Designsystem](kadetten-app-design.md).

- Kadetten-Orange (`#ff790e`) als Fläche mit fast schwarzer Schrift; als Text auf Hell `#b23c08`, auf Dunkel `#ff9a45`.
- Ergebnisse nie nur über Farbe: Formkurve als S/U/N mit Buchstabe, Form und Farbe.
- Tabellenziffern für alle Zahlen; Antippziele mindestens 44 px; Bewegung abschaltbar über «Bewegung reduzieren».

## Vorgehen

| Schritt | Inhalt | Abnahme | Stand |
|---|---|---|---|
| 1 | Struktur und Inhalte (dieses Dokument) | Entscheid Variante «Jetzt, Saison, Team, Verein» mit Spielseite im Mittelpunkt | abgenommen |
| 2 | Einfache Skizzen in Graustufen: Jetzt (Alltag, Spieltag, Live, Nachspiel), Spielseite (Vorschau, Live, Bericht), Saison, Team, Spieler, Verein, Ich | Aufbau abgenommen | abgenommen 5.11.2026, siehe [Seitenaufbau](#seitenaufbau) |
| 3 | Visuelles Design und Designsystem (Tokens, Typografie, Bausteine, Hell/Dunkel) | Richtung abgenommen | Richtung «Abend» abgenommen 5.11.2026; Designsystem und alle Seiten gestaltet |
| 4 | Technisches Gerüst: eigene Codebasis, Build, Service Worker, Datenzugriff, Tests, V1 bytegleich | `npm run verify` grün | umgesetzt, siehe [Technik](#technik) |
| 5 | Aufbau der Bereiche und der Spielseite | je Bereich Test und Browser-Prüfung | umgesetzt, siehe [Stand Schritt 5](#stand-schritt-5) |
| 6 | Umstellung `/v2/` auf die neue App | Funktionsumfang erreicht | vorbereitet, wird mit dem Merge veröffentlicht |

## Technik

`npm run build:pages` legt die neue App unter `dist/client/v2` ab; nach dem Merge auf `main` ersetzt sie die bisherige V2 unter `/v2/`.

**Aufbau der Oberfläche** (seit 20. November 2026, vorher ein einziges `main.js` mit 700 Zeilen):

| Datei | Aufgabe |
|---|---|
| `js/main.js` | setzt nur zusammen: Datendienst, Speicher, Ansichten, Steuermodule |
| `js/shell.js` | Hülle: Navigation (Verlauf, Scrollposition, Fokus), Zeichnen, Klick-Verteiler |
| `js/controllers/*.js` | je ein Steuermodul pro Bereich: `story` (Geschichten mit Zeitsteuerung), `cards` (Karten abholen, Fächer, Umdrehen), `wissen` (Nachladen, Regel-Blatt), `personal` (Darstellung, Lieblingsspieler, Tipp, Quiz, Installieren), `push`, `votes`, `sharing`, `gestures` (Halten und Wischen) |
| `js/views/*.js` | Ansichten, reine Funktionen ohne Seitenzugriff |

Ein Steuermodul meldet seine Klick-Aktionen als `[data-Attribut, Funktion]` an (`actions`) und kann `beforeRender`, `afterRender`, `onEnter` und `beforeNavigate` nutzen; Details im Kopf von `shell.js`. Neue Bedienung kommt als Aktion in das passende Steuermodul, nicht in `main.js`.

**Browser-Test:** `npm run test:browser` (nach `npm run build:pages`; Chromium einmalig mit `npx playwright install chromium`) prüft die Bedienung in echtem Chromium gegen `dist/client` mit nachgebildetem Datendienst und festem Datum: Navigation, Tickets-Marke, Filter, Lieblingsspieler, Tipp, Hallenbesuch, Quiz, Sammelkarten, Wissen, Geschichten mit Pause und «Bewegung reduzieren». In CI läuft er als eigener Auftrag «browser».

| Teil | Umsetzung |
|---|---|
| Quellen | `src/kadetten/`: `index.html`, `theme-init.js`, `manifest.webmanifest`, `sw.js`, `css/` (Layer `reset, tokens, base, components, views`; Tokens aus dem [Designsystem](kadetten-app-design.md)), `js/` (ES-Module), `assets/` (eigene Kopien von Wappen, Hallenfoto, App-Symbolen) |
| Module | `logic.js` (Zürcher Zeit, Zustände von «Jetzt», Form S/U/N, Tabelle, Countdown), `api.js` (nur GET, ohne Anmeldedaten, Zeitlimit, nur JSON), `store.js` (Datenstand mit letztem gültigem Stand unter `v2:app-snapshot`), `live.js` (30 s nur bei sichtbarer App und im Spielfenster), `router.js` (Hash-Routen `#/`, `#/saison[/tabellen\|/statistik]`, `#/team[/id]`, `#/verein`, `#/ich`, `#/spiel/id`), `theme.js` (System/Hell/Dunkel unter `v2:app-theme`), `text.js` (Entitäten beim Einlesen dekodieren, bei der Ausgabe maskieren), `views/` |
| Build | `npm run build:app` (esbuild, minimiert) nach `dist/app`; `KADETTEN_TARGET=pages` setzt den Datendienst `kadetten-api`. Inhaltsversion über alle Dateien der Hülle |
| Schriften | Inter und Barlow Condensed aus `@fontsource` (SIL OFL), lateinisch und erweitert lateinisch, mit der App ausgeliefert; keine Drittserver |
| Service Worker | Hülle aus dem Cache; `/api/data`, Berichte, Vorschauen u. a. zuerst aus dem Netz mit letztem gültigem Stand; `/api/live`, `/api/push/*` nie aus dem Cache; alte Hüllen-Caches werden beim Aktivieren gelöscht |
| Sicherheit | CSP ohne Inline-Skripte, `connect-src` nur eigener Host und `kadetten-api`; Manifest-ID und Scope `./` wie bisher |
| Prüfung | `tests/app-logic.test.mjs`, `tests/app-data.test.mjs`, `tests/app-build.test.mjs`; `scripts/check-v1-frozen.mjs` vergleicht die V1-Ausgabe (191 Dateien) mit `tests/fixtures/v1-pages.sha256`; alles in `npm run verify` |
| Vorschau | `npm run dev:app` baut nach `dist/app-dev` und liefert `/api/*` über den lokalen, schreibgeschützten Adapter auf http://127.0.0.1:3001 |

### Stand Schritt 5

Alle Bereiche sind aufgebaut (`src/kadetten/js/views/`):

| Bereich | Umsetzung | Daten |
|---|---|---|
| Jetzt | vier Zustände nach `logic.jetztState`; Alltag: nächstes Spiel, letztes Resultat, News, Tabelle in Kürze; Spieltag: Spielkarte mit Countdown und «Push zum Anpfiff», Ausgangslage, Vorschau-Auszug; Live: Spielstand, Phase, Halbzeit, «Stand vor x s», Live-Tabelle; Nachspiel: Endresultat, Spielbericht, Teilen, Tabelle danach, nächstes Spiel | `/api/data`, `/api/live`, `/api/previews` |
| Spielseite | Umschalter Vorschau · Live · Bericht (folgt automatisch dem Spiel, einzeln wählbar); Vorschau: Ausgangslage mit Form beider Teams, Vorschau-Text, direkte Duelle, letzte Spiele, Matchprogramm; Live: Live-Tabelle; Bericht: Torschützen (verlinkt aufs Spielerprofil), Paraden, Gegner aufklappbar, Teamvergleich, Zuschauer, Artikel zum Spiel; «Ich war in der Halle» bei Heimspielen | `/api/reports` (Rückfall `data/game-reports.json`), `/api/ehf-reports`, `/api/head-to-head`, `/api/recent-games`, `/api/programmes` |
| Saison | Spielplan nach Monat mit Filter Alle/QHL/EHL/Cup/Test und markiertem nächstem Spiel; Tabellen QHL und European League mit Bilanz und Tordifferenz; Statistik: Torschützen QHL | `/api/data` (`playerSeason` vom SHV) |
| Team | Kader nach Position mit Fotos; Spielerprofil mit Saisonwerten, Steckbrief, Lieblingsspieler | `data/squad.js`, `playerSeason` |
| Verein | Titelzahlen mit Jahren, Geschichte mit Archivbildern, Heimhalle | `data/club.js` |
| Ich | Push (30 Min. vorher, Anpfiff, Halbzeit, Endresultat) über den bestehenden Dienst, Meine Spiele, Lieblingsspieler, Kalenderdatei (.ics, auf dem Gerät erzeugt), Darstellung, App installieren | `/api/push/*` (bestehend), lokal |
| News | Liste und Artikel mit Volltext; Artikel-HTML wird von `sanitize.js` bereinigt (nur erlaubte Elemente, nur HTTPS) | `/api/articles` |

Abweichungen vom Seitenaufbau, weil Daten fehlen (nichts wird erfunden):
- **Ticket-Link** und **«Wo läuft das Spiel?»** erscheinen erst, wenn der Club die Angaben liefert (Offene Punkte).
- **Kalender-Abo** ist vorerst eine Kalenderdatei zum Herunterladen; ein abonnierbarer Kalender braucht einen zusätzlichen Endpunkt.
- **Push «News»** gibt es im bestehenden Dienst nicht; angeboten werden die vier Spielhinweise.
- **QHL-Vereinskarte** und **letzte Spiele je Spieler** sind nicht enthalten (Karte braucht Kartenkacheln eines Drittanbieters; Spielerwerte je Spiel nur aus einzelnen Berichten).
- **Playoff-Linie** in der Tabelle entfällt, solange der Modus nicht in den Daten steht.

Push: Die App übernimmt den Geräteeintrag `match-push-device-v1` der bisherigen V2; bestehende Abos laufen weiter und werden auf `kadetten` beschränkt. Das Push-Abo ist der einzige Schreibweg der App.

Prüfung: `tests/app-match.test.mjs` (Zuordnung Live/Endstand, Live-Tabelle, Berichte, Artikel zum Spiel, Kalender, Persönliches, Bereinigung), `tests/app-views.test.mjs` (alle 18 Routen in den Zuständen Alltag, Spieltag, Live, Nachspiel und offline). Im Browser (390 px hell/dunkel, 1280 px): keine Skriptfehler, kein horizontaler Überlauf, eine `<h1>`, axe ohne Verstösse; Zustände mit gestellter Uhr und gestelltem Live-Stand geprüft; Bedienelemente (Filter, Lieblingsspieler, Meine Spiele, Darstellung, Kalenderdatei) geprüft. Der echte Datendienst war aus der Prüfumgebung nicht erreichbar; geprüft wurde mit dem mitgelieferten Datenstand.

### Schritt 6: Umstellung

- `scripts/build-pages.mjs` baut V1 wie bisher und legt danach die neue App mit `buildApp({outDir: 'dist/client/v2', target: 'pages'})` unter `/v2/` ab. `scripts/check-preview.mjs` prüft die neue V2 (Titel, Pfade, Manifest-ID/Scope/Symbole, Offline-Hülle, Trennung von V1).
- Installierte Apps: gleiche Adresse, Manifest-ID `./`, Scope `./` und Symbole. Der Browser ersetzt den alten Service Worker unter `/v2/sw.js` beim nächsten Update-Check durch den neuen. Dieser löscht die Caches der bisherigen V2 (`kadetten-offline-*-<Pfad>`, `kadetten-articles-v2-<Pfad>`) und benennt eigene Caches mit dem Pfad der App, damit Caches von V1 auf derselben Domain unberührt bleiben.
- Push: Das Abo hängt an der Service-Worker-Registrierung und bleibt erhalten; der neue Service Worker zeigt die Mitteilungen an. Der Geräteeintrag `match-push-device-v1` wird weiterverwendet.
- Alte Hash-Adressen der bisherigen V2 (`#home`, `#season/…`) führen auf «Jetzt».
- Im Browser geprüft (Chromium, lokaler Server unter `/Kadetten-Schaffhausen/v2/`): bisherige V2 mit aktivem Service Worker geladen, Dateien durch die neue App ersetzt, Update ausgelöst → neuer Service Worker steuert die Seite, alter V2-Cache gelöscht, ein V1-Cache bleibt, neue Oberfläche erscheint, Neuladen ohne Netz zeigt die App aus der Offline-Hülle. Safari/iOS nicht geprüft.
- Nicht entfernt: Quellen der bisherigen V2 in `src/client/v2`, ihre Tests (`tests/v2-*.test.mjs`) und die manuellen Browser-Skripte `scripts/check-v2-*.mjs` und weitere, die `dist/client/v2` als alte V2 erwarten. `src/client` ist eingefroren; das Aufräumen ist ein eigener Schritt.

## Bisheriger Stand: Kadetten-Sperre in der alten V2 (#314)

- `src/client/v2/matchday.js` beschränkt `fanClubs` und `selectedClubs` vor `restoreActiveClub()` auf `kadetten` und setzt die gespeicherte Auswahl zurück. `?club=fcsg` und `?club=otmar` werden in V2 ignoriert.
- Bisherige Nutzer sehen einmalig den Hinweis auf Matchday; ein bestehendes Push-Abo wird auf die Kadetten beschränkt. Die Einstellungen zeigen statt «Meine Vereine» einen Link «FC St. Gallen und St. Otmar in Matchday» (`../`).
- Kopfzeile, Einführung, Teilen-Bild, Installationstexte, Manifest («Kadetten Fan-App»/«Kadetten»), Titel, Beschreibung und Offline-Seite nennen nur die Kadetten; Installations-ID und Scope bleiben.
- Regressionstest: `tests/v2-kadetten-only.test.mjs`; Build-Prüfung in `scripts/check-preview.mjs`.

## Feature-Backlog

Ideen für nach dem Grundumfang (Schritte 1–6). Noch nicht entschieden und nicht eingeplant.

### Umgesetzt nach dem Start (5.11.2026)

Ausbau nach dem Vergleich mit den Ansprüchen des Eigentümers, Best Practices und der bisherigen V2:

| Punkt | Umsetzung | Daten |
|---|---|---|
| Spielbericht | Matchbericht als Text (KI oder aus Daten, gekennzeichnet), Spielverlauf als Grafik mit grösster Führung, bestem Lauf, Führungswechseln, Auszeiten und Zeitstrafen, Torfolge (aufklappbar), Teamvergleich mit Halbzeiten, Wurfquote, Paraden mit Fangquote, 7-m, Zeitstrafen, Verwarnungen, technischen Fehlern, Spielerwerte beider Teams (Tore/Würfe, Quote, 7-m, 2′, Verwarnungen), Torhüter mit Fangquote, Zuschauer, Schiedsrichter; EHL zusätzlich «Woher die Würfe kamen» (Wurfergebnisse und Zonen) | `/api/reports`, `/api/match-reports`, `/api/ehf-reports` |
| Live | Teamwerte und Spielerwerte live (alle 30 s), «Kadetten-Werfer live» auf «Jetzt»; keine Ereignisliste | `/api/live` (`match.details`) |
| Spieler und Statistik | Profil mit Feld-/7-m-Toren, Strafen, Abschluss bzw. Fangquote der letzten fünf QHL-Spiele, EHL-Werten; Statistik mit Torschützen QHL und EHL und Torhüterliste aus den Spielberichten | `playerSeason`, `ehlPlayerSeason`, Spielberichte |
| Überraschen und involvieren | «Momente» (Serie, Szenario «Mit einem Sieg», Meilenstein, Lieblingsspieler, letztes Duell, höchster Saisonsieg, Geschichte des Tages), Tippspiel ohne Einsatz (lokal, Punkte 3/2/1), Teilen-Bild für Resultate (der Block «Deine Saison» in den Einstellungen entfiel am 19.11.2026; Bilanz und Bild leben im geplanten Saisonrückblick weiter), Lieblingsspieler in Tabellen hervorgehoben, Siegmoment (abschaltbar über «Bewegung reduzieren»), Regel-Erklärungen («?») | vorhandene Daten, lokal |
| Fan-Wahl «Spieler des Matchs» | Kandidaten aus dem gesicherten Spielbericht, offen von 90 Minuten nach Anpfiff bis 26 Stunden nach Anpfiff, eine Stimme pro Gerät (zufälliger Schlüssel, gehasht gespeichert), höchstens 6 Stimmen pro Anschluss und Spiel, Ergebnis nach der eigenen Stimme oder nach Schluss, als inoffiziell gekennzeichnet | `GET/POST /api/app/votes/:id` (KV `app/votes/…`) |
| Kalender-Abo | abonnierbarer Kalender (`webcal://…/api/app/calendar.ics`), aktualisiert sich selbst; die einmalige Kalenderdatei bleibt | `GET /api/app/calendar.ics` |
| Push Lieblingsspieler | Mitteilung bei jedem Tor des Lieblingsspielers in QHL-Spielen, aus der SHV-Ereignisliste, je Tor und Gerät einmal, nur frisch gesehene Tore | `/api/push/device` mit `favourite.shv`, server/push-monitor.mjs |

Die Endpunkte unter `/api/app/` und die Tor-Mitteilungen wirken erst nach der Bereitstellung des Datendienstes (Workflow «Cloudflare-Datendienst bereitstellen», läuft bei Änderungen unter `server/` auf `main` automatisch). Bis dahin blendet die App Kalender-Abo, Tor-Mitteilungen und Fan-Wahl aus.

### Erweiterungen vom 14. November 2026

| Punkt | Umsetzung | Daten |
|---|---|---|
| Erster Start | `#/start` in drei Schritten (Lieblingsspieler, Mitteilungen, erster Tipp), jeder Schritt überspringbar. Erscheint einmal beim Öffnen der Titelseite, wenn noch keine persönlichen Angaben vorhanden sind (`v2:app-welcome`). Später unter «Ich» → «App einrichten». | lokal |
| Gegner-Check | In der Vorschau von QHL- und EHL-Spielen: Tore und Gegentore pro Spiel beider Teams aus der Tabelle, in der EHL mit Hinweis auf die Zahl der Spiele. Bewusst ohne Spielerlisten, damit die Seite nicht überladen wird. | Tabelle |
| Spiel-Story | `#/spiel/<id>/kurz`: Geschichte aus Vollbild-Karten wie der Saisonrückblick (früher «Spiel in 30 Sekunden»), Details im Abschnitt «Spieltag in Karten» unten. Einstieg über die Kachel «Spiel-Story» im Reiter «Bericht» und auf der Titelseite nach dem Spiel. | Spielbericht, lokal |
| Spielervergleich | `#/team/vergleich/<Nr>/<Nr>`: zwei Kaderspieler mit den QHL-Saisonwerten, der höhere Wert ist hervorgehoben. Einstieg im Spielerprofil. | `playerSeason` |
| Saisonkurve | Unter der QHL-Tabelle: Punkte nach Runden gegen das Maximum, Punkte pro Spiel, Rang. Den Rang je Runde hält der Datendienst ab der Bereitstellung fest (`rankHistory`, server/rank-history.mjs); frühere Runden kennt die Quelle nicht. | Spielplan, Tabelle, `rankHistory` |
| Quiz der Woche | `#/quiz`: jede Kalenderwoche (ab Montag) drei Fragen aus `data/quiz.js`, für alle Geräte dieselben (bis 15.11.2026 waren es fünf; ältere Wochen behalten ihre fünf Fragen, damit die Bilanz stimmt). 45 Fragen reichen für fünfzehn Wochen, danach wiederholen sie sich. Antworten und Bilanz bleiben auf dem Gerät (`v2:app-quiz`). Hinweis auf der Titelseite an Tagen ohne Spiel. | lokal |
| Playoffs | Über dem Spielplan erscheinen die Serien der Kadetten (Stand, fehlende Siege, nächstes Spiel), sobald der Spielplan Playoff-Spiele enthält. Erkannt werden sie an Wettbewerb oder Runde («Playoff», «Viertelfinal», «Halbfinal», «Final»); der Datendienst übernimmt dafür neu das Feld `round` der Quelle. | Spielplan (`js/playoffs.js`) |
| Schnellzugriffe | Langer Druck auf das App-Symbol führt zu Spiele, Tabelle und Kader (`shortcuts` im Manifest). | keine |

Nicht gegen die Quelle geprüft: die Bezeichnung der Playoff-Spiele (im November stehen noch keine im Spielplan). Die Playoff-Ansicht bleibt unsichtbar, wenn die Daten fehlen oder anders aussehen. «Best of 5» gilt als Annahme, bis alle Spiele einer Serie angesetzt sind.

### Sammelkarten und Mein Bereich (14. November 2026)

`#/ich` ist «Mein Bereich» mit Quiz-Bilanz und Sammelkarten, die Einstellungen liegen unter `#/ich/einstellungen`. 112 Karten zu Kader, Geschichte, Orten, Titeln, legendären Spielen, Legenden, Trainern und Machern, dazu Momentkarten für besuchte Heimspiele. Karten gibt es für Quiz, Tipps, Hallenbesuche und live verfolgte Spiele, ohne Konto und ohne Doppelte. Details, Regeln und Quellen: [sammelkarten.md](sammelkarten.md).

### Spielort (15. November 2026)

Die Vorschau jedes Spiels zeigt unter dem Spielkopf die Zeile «Spielort»: Halle ohne vorangestellten Ort und den Ort aus dem Spielplan, bei der BBC Arena die Adresse Schweizersbildstrasse 10, 8207 Schaffhausen. «In Karten öffnen» führt zur Google-Maps-Suche nach der ganzen Spielortangabe (`venueInfo` in `views/parts.js`), ohne Schlüssel und ohne eingebettete Karte. Strassenadressen der Auswärtshallen liefert die Quelle nicht. ÖV, Parkplätze und Anreisezeiten bleiben bewusst weg.

Ein kleines Hallenfoto steht links im Block, wo eines vorhanden ist: BBC Arena (App-Bild) sowie AXA Arena, Mobiliar Arena, Kreuzbleiche, Saalsporthalle und Sala Polivalentă von Wikimedia Commons (freie Lizenzen, verkleinert in `assets/hallen/`, Liste in `data/hallen.js`). Die Nachweise stehen gesammelt unter Einstellungen → «Bildnachweise». Ohne Foto bleibt das Ortssymbol. Neue Fotos nur mit freier Lizenz und Eintrag in `data/hallen.js`.

Noch offen: Tippspiel mit Vergleich unter Fans (bräuchte einen weiteren Schreibweg), «An diesem Tag» mit Tagesdaten (die Geschichte enthält nur Jahre), Ticket-Link und Sender (Angaben vom Club).

## Bewusst nicht vorgesehen

Anreise- und Hallenführer, ÖV-Abfahrten, Tor-für-Tor-Ticker, Lärmmesser, Fanwand, Navigation in der Halle, Bestellen vom Sitzplatz, Chats, öffentliche Ranglisten, Mitgliederkarte ohne Vereinsdaten, native Live Activities, Wallet-Pässe.

## Offene Punkte

- Ob die SHV-Daten Daten von Nachwuchs- und Frauenteams liefern.
- Kontakt zum Club für Ticket-Links, «Wo läuft das Spiel?» und Bildrechte.
- `check-v2-ticket.mjs`, `check-v2-readability.mjs` und `check-v2-mobile.mjs` prüfen die alte V2 und scheitern bereits auf `main`; sie werden mit dem Neuaufbau ersetzt.

### Qualitätsverbesserungen 6. November 2026

- Unter «Ich» stehen der Zeitpunkt des Gesamtdatenstands und die einzelnen Quellenstände in Schweizer Zeit. Auch ein erfolgreicher Gesamtabruf kann verzögerte Spielerwerte enthalten: `status.*.ok` und `status.*.updatedAt` werden deshalb separat ausgewertet. Fehlende Zeitangaben, Quellenfehler und Stände über zwölf Stunden werden gekennzeichnet; das Zeitfenster berücksichtigt die Nachtpause des Datenlaufs.
- Der Spielplan springt nach dem Laden einmal zum nächsten Spiel, auch nach einem Wettbewerbswechsel. Vergangene Spiele bleiben darüber erreichbar. Beim Zurückkehren über den Browser oder den Zurück-Link der Spielseite gilt die gespeicherte Scrollposition. Spiellaschen behalten die Herkunft; Direktlinks fallen auf «Jetzt» zurück.
- Torhüterprofile zeigen zuerst Paraden und Fangquote aus den letzten verfügbaren QHL-Berichten, einschliesslich der Abdeckung (z. B. zwei von fünf Berichten). Fehlende Werte werden nicht geschätzt. Tore entfallen als führende QHL-Kennzahl für Torhüter.
- Die Kadetten-Form in QHL-/EHL-Vorschauen wird auf diesen Wettbewerb begrenzt. Die separat gelieferte Gegnerform nennt ihren Datenumfang ausdrücklich. Tabellenszenarien gelten nur beim aktuellen Tabellenstand; Punktgleichheit wird nicht als gesicherter Rang ausgegeben.
- «Jetzt» zeigt höchstens zwei Momente. Auf der Vorschauseite steht der persönliche Tipp nach der Ausgangslage.

## Navigation ab 6. November 2026

Die Hauptnavigation umfasst Start (`#/`), Spiele (`#/saison`), Statistik (`#/statistik`, Spielerwerte `#/statistik/spieler`), Team und Verein. Die bisherigen Saison-Unteradressen bleiben als kompatible Routen bestehen. Die Spielansicht trennt Übersicht, Ticker und Statistik; `#/spiel/:id/wahl` öffnet die Fan-Wahl mit Auswahl und expliziter Bestätigung. Das backendseitige Wahlfenster bleibt nach Spielende. Der SHV-Ereignisticker verwendet ausschliesslich die gelieferten `details.events`; bei fehlender Quelle, insbesondere EHF, wird kein Ereignisverlauf erfunden.

## Kadetten-Gewinnscore

Vorschau und Live-Reiter jedes QHL-Spiels zeigen die Siegchance der Kadetten mit Balken für Sieg, Remis und Niederlage. Im Bericht erscheint er bewusst nicht.

- Rechnung (`js/gewinnscore.js`): Stärke je Team ist die Tordifferenz pro Spiel aus der Tabelle, zu Saisonbeginn zur Vorsaison hin gezogen (`data/gewinnscore.js`, zählt wie 6 Spiele, geteilt durch Spiele + 3). Dazu Form aus den letzten 5 Spielen (Gewicht 2) und 1,5 Tore Heimvorteil. Die erwartete Tordifferenz streut mit 4,5 Toren (Normalverteilung); Remis heisst weniger als ein halbes Tor Abstand.
- Live: Der aktuelle Vorsprung zählt voll, Erwartung und Streuung nur noch für die Restzeit laut Spieluhr. Ohne Spieluhr erscheint keine Live-Zahl.
- Erst wenn beide Teams drei Spiele haben; QHL und Schweizer Cup (Mobiliar-Cup) nur zwischen zwei QHL-Teams, also wenn beide in der QHL-Tabelle stehen (für Europacup und Cup-Spiele gegen tiefere Ligen fehlen vergleichbare Daten). Alles im Gerät, kein neuer Dienst.
- **Cup (21.11.2026):** Gleiche Rechnung aus der QHL-Tabelle, aber mit 2 statt 1,5 Toren Heimvorteil und ohne Remis. Gleichstand nach 60 Minuten geht in die Verlängerung; die Chance darauf ist je zur Hälfte auf «Weiterkommen» und «Ausscheiden» verteilt (`advance` in `js/gewinnscore.js`, `MODEL.cupHome`). Die Karte heisst dann «Weiterkommen», der Balken hat zwei Teile. Live rechnet die Formel nach 60 Minuten mit dem Stand weiter. Geprüft an 31 Mobiliar-Cup-Spielen zwischen QHL-Teams 2022–2025 (`node scripts/gewinnscore-backtest.mjs 2021,2022,2023,2024,2025 cup`): richtiger Sieger 24 von 31 (77 %), Brier 0,28; mit 1,5 Toren Heimvorteil lag die Erwartung im Mittel 0,5 Tore zu tief (74 %, Brier 0,29), mit 2 Toren bei 0,0. Kleine Stichprobe: nach jeder Saison mitprüfen.
- Geprüft mit `scripts/gewinnscore-backtest.mjs` an 809 QHL-Spielen 2021–2025: Prüfsaison 2025/26 74 % richtige Siegertipps (Grundquote Heimteam 57 %), Brier 0,35 (0,53). Nach jeder Saison die Vorsaison-Werte neu auszählen.

## Tickets in der Spieltagskarte

Bei Kadetten-Heimspielen vor Anpfiff steht in der Kopfzeile der Spieltagskarte (Titelseite und Spielseite) neben dem Countdown die Marke «Tickets». Sie öffnet den Ticket-Shop in einem neuen Fenster; die Karte selbst führt weiter zur Vorschau. Mit Marke entfällt die Halle in der Kopfzeile (Heimspiele sind in der BBC Arena), die Karte bleibt gleich hoch.

- Quelle: `https://kadettensh.ch/wp-content/uploads/tickets.json`, dieselbe Datei, aus der die Kadetten-Homepage ihre Ticket-Knöpfe füllt (Spiel-ID des Matchcenters → Link). Der Datendienst liest sie bei jeder Spielplan-Aktualisierung mit (`server/update.mjs`: `parseTickets`, `withTickets`) und schreibt den Link ins Feld `tickets` des Spiels; Status unter `status.tickets`.
- Übernommen werden nur https-Links auf ticketmaster.ch und ticketcorner.ch (Datendienst und App prüfen beide). Fehlt die Datei, bleiben die bisherigen Links; fehlt ein Eintrag, wird ein alter Link entfernt. Kein Ersatzlink.

## Saisonrückblick «Deine Saison»

`#/rueckblick` zeigt die Saison als Geschichte aus Vollbild-Karten (Vorbild: Jahresrückblick von Spotify). Jede Karte läuft 5 Sekunden (oberer Balken füllt sich), dann folgt automatisch die nächste; die letzte Karte bleibt stehen. Gedrückt halten oder Leertaste hält an, ein verborgener Tab ebenfalls. Gilt auch für die Spiel-Story. Tippen rechts oder Wischen nach links: weiter; Tippen links oder Wischen nach rechts: zurück; Pfeiltasten ebenso. Keine Navigation, das × führt zu «Mein Bereich». Konzept: Design-Canvas, Brett «Saisonrückblick · Konzept».

- Karten (`js/rueckblick.js`, Ansicht `js/views/rueckblick.js`): Auftakt, In der Halle (Besuche, Bilanz, gesehene Tore, Siegquote mit dir und über die Saison), Dein Spiel der Saison (höchster Sieg in der Halle), Tippspiel (Punkte, exakt, richtige Differenz, beste Serie, bester Tipp), Lieblingsspieler (QHL-Tore, Spiele, Siebenmeter aus `playerSeason`), Quiz und Sammlung (Wochen, ohne Fehler, Quote, Karten, seltenste Karte), Deine Kadetten (Platz, QHL-Bilanz, Tore, Rangkurve aus `rankHistory`), Fan-Typ mit Teilen-Bild (`recapCard`).
- Karten ohne Daten fallen weg; Mannschaft und Fan-Typ erscheinen immer. Keine Vergleiche mit anderen Fans. Alles aus dem Gerät und dem Datenstand der App.
- Fan-Typ nach festen Regeln, die am deutlichsten erfüllte Schwelle gewinnt: Hallen-Stammgast (mind. die Hälfte der Heimspiele), Orakel (mind. 3 exakte Tipps), Live-Begleiter (mind. die Hälfte der Spiele live), Wissensdurst (mind. 20 Quiz-Wochen), Sammler (mind. drei Viertel der Karten); sonst «Treuer Fan» oder «Kadetten-Fan».
- Saisonende: kein Kadetten-Spiel ohne Resultat mehr im Spielplan. Dann erscheint der Hinweis «Deine Saison ist da» auf der Titelseite (ohne nächstes Spiel) und oben in «Mein Bereich». Vorher führt in «Mein Bereich» unter «Für dich» die Zeile «Saisonrückblick» zu einem Zwischenstand (unten vermerkt).
- Der frühere Block «Deine Saison» in den Einstellungen entfällt (19.11.2026).

## Spieltag in Karten

`#/spiel/<id>/kurz` (früher «Spiel in 30 Sekunden») ist eine Geschichte im selben Rahmen wie der Saisonrückblick (`storyShell` in `views/rueckblick.js`): Vollbild, Balken, Tippen, Wischen, Pfeiltasten; das × führt zum Spielbericht.

- Mannschaftskarten aus dem bestätigten Spielbericht (`shortCards` in `js/kurz.js`): Resultat, Wendepunkt, bester Werfer, Zahl des Spiels, Tabelle danach.
- Persönliche Karten (`personalCards`), nur mit Daten auf dem Gerät: Lieblingsspieler in diesem Spiel, dein Tipp (Punkte, Saisonstand, verdiente Sammelkarte), «Du warst dabei» bei Heimspielen mit «Ich war in der Halle».
- Letzte Karte: «Ganze Statistik» und «Resultat teilen» (Story-Bild). Keine Vorschau auf das nächste Spiel mehr (seit 22.11.2026).
- Einstieg über die Kachel «Spiel-Story» (schwarz mit Streifen wie der Saisonrückblick-Hinweis) auf der Titelseite nach dem Spiel und in der Spielseite (Reiter Bericht). Die Schlagzeile richtet sich nach Resultat und Ort («Der Sieg in der BBC Arena», «Die Niederlage in Thun», «Das Remis gegen Pfadi»), darunter die Tipp-Punkte. Konzept: Design-Canvas, Brett «Spieltagsrückblick · Konzept».

## Fanshop (20. November 2026)

Der Fanshop der Kadetten in der App: stöbern, Grösse und Farbe wählen, Warenkorb, Kasse bis vor die Zahlung. Bezahlen und bestellen geht weiterhin nur im Online-Shop (`https://kadettensh.ch/shop/`); die App sendet keine Bestellung und keine persönlichen Angaben. Konzept: Design-Canvas, Bretter «Fanshop · Konzept» und «Fanshop · Ablauf bis vor die Zahlung».

- **Einstieg:** «Mein Bereich»: dunkle Kachel «Kadetten Fanshop» mit orangem Streifenrand (wie Spiel-Story und Rückblick), links ein Produktbild (das erste lieferbare Trikot aus dem Katalog), rechts schräger Knopf «Zum Shop», mit Warenkorb ein Zähler und «Zum Warenkorb». Sie steht unter den Sammelkarten und vor «Spieltag»; ohne Katalog erscheint sie ohne Bild. Zusätzlich das Einkaufstaschen-Symbol oben rechts im Band neben den Einstellungen. Kein eigener Tab. Auf allen Shop-Seiten oben rechts der Warenkorb mit Anzahl.
- **Routen:** `#/shop` (Filter Trikots, Bekleidung, Fanartikel über `ui.shopKind`), `#/shop/<Produkt-ID>`, `#/warenkorb`, `#/kasse` (Lieferung), `#/kasse/adresse` (Angaben), `#/kasse/uebersicht`. Die Kasse zeigt keine Navigation.
- **Katalog:** Der Datendienst liest bei jedem Lauf die öffentliche WooCommerce-Store-API der Kadetten-Seite (zwei Abrufe: Produkte, Ausführungen mit Lagerstand; `server/shop.mjs`) und liefert ihn unter `data.shop` aus; Status unter `status.shop`. Bei einem Fehler bleibt der letzte Katalog. Übernommen werden nur Bilder aus `kadettensh.ch/wp-content/uploads/` über https und Produktlinks unter `kadettensh.ch/produkt/`; Texte ohne HTML. Die Art (Trikot, Bekleidung, Fanartikel) leitet `shopKind` aus dem Namen ab, weil der Shop nur die Kategorie «Fan-Shop» kennt.
- **Bilder:** Die Originale sind bis 2000 px gross. `scripts/shop-bilder.mjs` legt verkleinerte Kopien (720 px, WebP) unter `assets/shop/<Bild-ID>.webp` ab und schreibt die Liste `data/shop-bilder.js`. Ohne Kopie lädt die App das Original. Die Kopien sind nicht im Offline-Grundbestand des Service Workers.
- **Produkt:** Grössen und Farben als schräge Knöpfe; ausverkaufte Werte durchgestrichen und nicht wählbar. Optionen mit nur einem Wert sind vorgewählt. Bei Farben wechselt das Bild. Der Knopf unten bleibt gesperrt («Bitte Grösse wählen», «Ausverkauft»), bis eine lieferbare Ausführung gewählt ist. Nach dem Hinzufügen: «Im Warenkorb» mit Balken bis zum Gratisversand. Der Hinweis des Shops zum Druck mit Name und Nummer verlinkt die E-Mail der Geschäftsstelle; eine Personalisierung bietet die App nicht an (der Shop selbst auch nicht).
- **Warenkorb** (`v2:shop-cart`, nur Gerät): Menge 1 bis 9, Minus bei Menge 1 entfernt. Nicht mehr erhältliche oder ausverkaufte Zeilen bleiben sichtbar, werden aber nicht berechnet.
- **Versand** (Angaben des Vereins): Postversand pauschal CHF 10, ab CHF 100 Warenwert gratis; Abholen am Fanshop-Stand beim Heimspiel gratis, mit dem nächsten Heimspiel aus dem Spielplan.
- **Angaben** (`v2:shop-checkout`, nur Gerät): Post braucht Vorname, Nachname, Strasse, PLZ (4 Ziffern), Ort, E-Mail; Abholung nur Name und E-Mail. Eingaben werden beim Tippen gesichert, damit ein Neuzeichnen nichts verliert. «Angaben auf diesem Gerät löschen» in der Übersicht.
- **Übersicht:** Artikel, Lieferart, Total, Adresse; danach der Hinweis «Hier endet die Kasse in der App» mit Link in den Online-Shop und ein gesperrter Zahlungsknopf.

## Spielvorschau: Aufmacher, Cup-Einsatz, Anreise (21. November 2026)

Die Vorschau eines kommenden Spiels (QHL und Mobiliar-Cup) beginnt mit einem Aufmacher statt mit der Liste. Konzept: Design-Canvas, Bretter «Spielvorschau · Konzept» und «Spielvorschau · heute und Vorschlag».

- **Aufmacher** (`leadStory` in `js/vorschau.js`, Ansicht `views/vorschau.js`): ein Satz aus festen Vorlagen mit Zahlen aus Tabelle, Form und Direktduellen, keine KI. Der erste passende Satz gewinnt: Cup («Wer gewinnt, steht in der nächsten Runde.», auch gegen Teams aus tieferen Ligen); Einsatz in der QHL (Spitzenspiel Platz 1 gegen 2; «Ein Sieg bringt die Kadetten an die Tabellenspitze» bei mehr Punkten als der Führende nach einem Sieg; Augenhöhe bei Gleichstand; «Tabellenführung ausbauen»); Serie (ab 3 Siegen oder 2 Niederlagen in Folge); Direktduelle (ab 3 Duellen alle gewonnen oder verloren); sonst «Platz x gegen Platz y». Darunter bis zu drei Fakten als schräge Marken (Serie, Gewinnscore bzw. «Weiterkommen», Duellbilanz bzw. Heimrecht im Cup). Kein Aufmacher bei Europacup, Testspielen, anderen Turnieren und gespielten Spielen.
- **Worum geht es? im Cup** (`cupStakes`): zwei Kacheln «Sieg: Weiter» und «Niederlage: Aus» mit dem Hinweis, dass Gleichstand nach 60 Minuten in die Verlängerung geht. Der Rundenname fehlt, weil die Quelle ihn nicht liefert.
- **Anreise** (`travelInfo`, `anreiseBlock`): nur bei Auswärtsspielen in der Schweiz (nicht Europacup): Halle, Ort und zwei Knöpfe, «Route planen» (Google Maps, Auto) und «ÖV-Verbindung» (Google Maps, öffentlicher Verkehr). Die App kennt keinen Standort und rechnet keine Fahrzeit. Heimspiele haben noch keinen Anreise-Block (Parkplatz- und Türöffnungstexte stehen beim Verein aus).
- Nicht umgesetzt aus dem Konzept: «Worum geht es?» mit Punkten und Plätzen in der QHL, Kopf an Kopf mit gefährlichsten Werfern, Anreise bei Heimspielen.

## Gewinnchance, Liveticker und Spiel-Story (22. November 2026)

- **Gewinnchance nie 0 oder 100 %** (`percents` in `js/gewinnscore.js`): Sieg und Niederlage liegen immer zwischen 1 und 99 %, ein mögliches Remis nie bei 0 %. Im Cup, wo es kein Remis gibt, bleibt dieses bei 0. Es gibt immer Überraschungen; auch in den letzten Minuten bei hohem Vorsprung steht «99 %».
- **Liveticker mit Fokus** (`js/ticker.js`): Standard sind nur Tore (inkl. Siebenmeter), Zeitstrafen, Disqualifikationen und der Schlusspfiff; Paraden, Fehlwürfe, technische Fehler, Time-outs, Verwarnungen und «Empty Goal» erscheinen unter «Alle Ereignisse (n)» (`ui.tickerAll`). Erkannt über die Aktionskürzel der SHV (`bFeldTor`, `b7mTor`, `b2Min`, `bDoB`, `bSchlussPfiff`) und über den Text. Jede Zeile nennt die Mannschaft; Tor der Kadetten orange, Tor des Gegners mit hohlem Marker, Strafe mit dunklem Marker und «2′» statt Spielstand. Liefert die Quelle nichts Erkennbares (EHF), erscheint immer die ganze Liste ohne Umschalter.
- **Spiel-Story:**
  - Ein langer Wettbewerbsname («Mobiliar-Cup M») steht in der Kopfzeile statt als Marke mitten im Satz; kurze (QHL, EHL) bleiben als Marke im Satz (`competitionKicker`).
  - Bei einem Sieg ist die erste Karte euphorischer: Strahlen, Konfetti, Stempel («Sieg!» bzw. «Weiter im Cup!») und grössere Zahl (`storyWinDecor`). Nur Schmuck, für Screenreader verborgen, bei «Bewegung reduzieren» ohne Bewegung.
  - Die letzte Karte zeigt keine Vorschau auf das nächste Spiel mehr, nur «Ganze Statistik» und «Resultat teilen». Das Spiel bleibt im Fokus.
  - Die Tippkarte heisst «Tippspiel», nennt «Dein Tipp», den Endstand und die Punkte im Tippspiel.

## Teilbilder: Story-Bilder im Schnitt (22. November 2026)

Konzept: Design-Canvas, Brett «Teilbilder · kräftig und ruhig». Umgesetzt ist der Stil «kräftig im Schnitt»; der ruhige, filmische Stil wurde nicht gewählt.

- **Drei Anlässe, ein Format:** Halbzeit, Spielstand (mit Minute) und Endstand als Story-Bild 1080 × 1920 (9:16), auf dem Gerät gezeichnet, ohne Upload (`matchImage`, Inhalt aus `matchImageModel` in `js/share-image.js`). Orange Kante mit Streifenband, kursive Barlow-Zahlen, die Zahl der Kadetten in Orange, Wappen und Fusszeile «Kadetten Fan-App · inoffiziell». Wichtiges liegt zwischen y 250 und 1650, damit Instagram nichts überdeckt. Zweistellige Zahlen werden auf die Breite verkleinert.
- **Endstand:** der bisherige Weg «Resultat teilen» (letzte Karte der Spiel-Story, Spielbericht, Titelseite). Bei einem Sieg ein Stempel («Sieg!», im Cup «Weiter im Cup!»), bei Niederlage oder Remis eine Marke. Das frühere 4:5-Resultatbild (`resultImage`) entfällt; der Saisonrückblick bleibt 1080 × 1350.
- **Live:** im Live-Reiter der Knopf «Spielstand teilen», in der Pause «Halbzeitstand teilen» (`data-share-live`, `isHalftime` in `js/gewinnscore.js`; Phase genau «Halbzeit» oder «Pause»). Nur mit gültigem Spielstand; die Minute stammt aus der Spieluhr.
- Teilen über den Systemdialog, sonst Download.

## Laufendes Spiel: zwei Reiter (24. November 2026)

Während des Spiels gibt es nur noch «Live» (Gewinnchance, Fan-Wahl, Spielstand teilen, Ticker) und «Statistik» (Team- und Spielerwerte). Die frühere «Übersicht» zeigte dieselben Werte wie die Statistik ein zweites Mal und entfällt; ihre alte Adresse führt zu «Live». Bei Spielen der European League kommen die Ereignisse (Tore mit Torschütze, Siebenmeter, Zeitstrafen, Auszeiten) aus dem EHF-Ticker über einen eigenen Abruf `GET /api/ehf-live/<EHF-Spiel-ID>` (server/ehf-live.mjs, 20 Sekunden zwischengespeichert). Er ist vom Live-Stand getrennt: Fällt der EHF-Ticker aus oder überschreitet der Worker seine Rechenzeit, fehlen nur die Ereignisse, und der Live-Reiter zeigt den Hinweis mit Verweis auf die Statistik.

Nach dem Schlusspfiff zeigt der Reiter «Statistik» die letzten Live-Werte vom Spielende als «vorläufig», bis die Datenaktualisierung (06:20 bis 22:20 Uhr, siehe docs/betrieb.md) den bestätigten Spielbericht gespeichert hat. Der Rückblick wartet auf den bestätigten Bericht.

Startseite nach dem Spiel (25. November 2026): «Nächstes Spiel» ist eine kleine Spielkarte (Wappen, Anpfiff, Wappen, dazu Datum, Wettbewerb, Heim/auswärts und Countdown) im Muster der grossen Karte, statt einer Listenzeile (Variante B im Design-Canvas «Nächstes Spiel»). Das Resultat bleibt bis 12:00 Uhr des Folgetags, danach steht die Karte oben.

Quiz der Woche auf der Titelseite (25. November 2026): Die Karte zeigt den Zustand sichtbar (Variante B im Design-Canvas «Quiz der Woche · Erfolg sichtbar»). Offen: «Drei Fragen …» mit «Noch nicht gespielt»; laufend: «Frage n von 3» mit einem Strich je beantworteter Frage; abgeschlossen: grosse Ergebniszahl «3/3» (orange; bei Fehlern grau), «Alles richtig» bzw. «n von 3 richtig» und ein orange Strich je richtige Antwort. Die Striche sind Zierde (`aria-hidden`), der Text sagt dasselbe. Eine Serie über mehrere Wochen gibt es noch nicht.

Titelseite: Die einzeiligen weissen Kacheln (Unsere Saison, Letztes Resultat, Tabelle danach, Quiz der Woche) tragen die Klasse `tile` und sind mindestens 76 px hoch; geprüft von 320 bis 390 px Breite. Das Quiz zeigt dafür «Neues Quiz am Montag» ohne Datum, der Titel im offenen Zustand lautet «Drei neue Fragen». Die Spielkarten (Nächstes Spiel) und News-Karten sind bewusst grösser.

## Navigation: «Zurück» führt in die Menüstruktur (26. November 2026)

«Zurück» (Taste, Wischgeste, Zurück-Link in der App) führt immer zur übergeordneten Ansicht und nicht der Reihe nach durch die zuletzt besuchten:

- Hauptreiter (Spiele, Tabelle, Kader, Ich) → **Start**; vom Start verlässt «Zurück» die App.
- Unteransichten → ihre Liste: Spielerprofil und Vergleich → Kader; Artikel → News; Einstellungen, Sammlung, Shop, Wissen → Mein Bereich; Datenschutz → Einstellungen; Produkt und Warenkorb → Shop; Kasse → vorheriger Schritt; Verein-Unterseiten → Verein.
- Ein Spiel führt dorthin zurück, von wo es geöffnet wurde (Start, Spielplan, Spielerprofil …), sonst zum Spielplan.
- Wechsel zwischen den Hauptreitern und zwischen den Reitern eines Spiels ersetzen den Verlaufseintrag, es sammeln sich keine Schritte an.
- Ein Link auf eine Ansicht, die im Verlauf weiter unten liegt (z. B. «Zurück»-Link, Reiter «Start»), geht dorthin zurück statt einen neuen Eintrag anzulegen. Landet «Zurück» auf einer anderen Ansicht als der übergeordneten, korrigiert die App das sofort.
- Direktaufruf einer Unteransicht (Mitteilung, geteilter Link): die übergeordneten Ansichten werden unter der Ansicht in den Verlauf gelegt (`seedDeepLink` in `shell.js`); ein Neuladen legt sie nicht noch einmal an.

Umsetzung: `parentHash`, `ancestors`, `switchesSibling` in `router.js`, Verlaufskette (`prev`, `distanceTo`) in `createNavigation`, Klick- und `hashchange`-Behandlung in `shell.js`. Geprüft in `tests/app-quality.test.mjs` und mit echtem Verlauf in `scripts/browser-test.mjs`.

## Spielvorschau: «Die Reise» (26. November 2026)

Bei noch nicht gespielten Auswärtsspielen zeigt die Vorschau unter dem Aufmacher die Strecke von Schaffhausen zum Spielort als Luftlinie. Die Kachel vereint Karte, Spielort (Hallenfoto, Name, Ort), Distanz und Knöpfe; die Blöcke «Spielort» und «Anreise» entfallen dann. Knöpfe: Route und ÖV, wo die Anreise bekannt ist (QHL und Cup in der Schweiz), sonst «In Karten öffnen». Heimspiele und unbekannte Orte zeigen weiter nur «Spielort» (und «Anreise»). Konzept und Varianten: Design-Canvas «Reise zum Gegner».

- Schweizer Spielorte: helle Kachel mit Umriss der Schweiz. Alle anderen Orte (Europacup, Testspiele im Ausland): dunkle Punktkarte von Europa mit Bogen.
- `src/kadetten/js/reise.js`: Hallenorte mit Koordinaten (fest im Code, kein Kartendienst), Luftlinie (Haversine), Strecke als Bogen. Unbekannter Ort, Heimspiel oder gespieltes Spiel: keine Kachel. Neuer Spielort = neue Zeile in `PLACES`.
- `views/vorschau.js` (`reiseBlock`): Inline-SVG mit Linie und Punkt in Schleife. Bei «Bewegung reduzieren» steht die fertige Linie ohne Animation.
- Die App zeigt keine Fahrzeit; die Karten-App rechnet sie.

## Drei Kachelarten (26. November 2026)

Konzept: Design-Canvas «Weniger Kachelarten». Jede Kachel der Titelseite und von «Ich» gehört zu einer von drei Arten mit festen Massen (Tokens in `css/tokens.css`):

| Art | Aufbau | Mass | Klassen |
| --- | --- | --- | --- |
| Zeile | Zahl links (62 px breit, 40 px gross), Text, Pfeil | mindestens `--tile-h` (76 px) | `.card.rowcard`, `.card.quizcard`, `.tile` |
| Kennzahl | Zahl über Beschriftung, zwei bis drei nebeneinander, keine Aktion | `--kn-h` (96 px) | `.kn-row > .card.kn` |
| Fokus | dunkle Kachel mit Knöpfen, einmal je Seite | Innenabstand `--tile-pad` | `.card.claim`, `.card.nextcard` |

Umgesetzt: Quiz-Bilanz in «Ich» als drei Kennzahl-Kacheln, Sammelkarten als Zeile mit dünnem Fortschrittsbalken (`.sub-bar`; die Legende steht in der Zeile, die Seltenheiten auf der Sammlungsseite), Zeilen der Titelseite mit gleicher Zahlengrösse. Neue Funktionen wählen eine der drei Arten und bauen keine eigene Kachel. Nicht angepasst (Inhalte, keine Kacheln): Sammelkarten, Kader, Tabelle, Spiel-Story, Spielkarte im Band.
