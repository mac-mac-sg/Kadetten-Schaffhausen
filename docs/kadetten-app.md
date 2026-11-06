# Kadetten Companion App (V2) – Spezifikation

**Aktuell ab 6. November 2026:** Auf ausdrücklichen Wunsch ersetzt das [Matchday-Layout mit vier Companion-Funktionen](v2-matchday-layout.md) die bisherige Oberfläche. Die folgenden älteren Design- und Seitenbeschreibungen dokumentieren den vorherigen Stand.

Stand: 5. November 2026. Grundlage: [Recherche Vereins- und Fan-Apps](research/vereins-und-fan-apps.md) und [Designanalyse und Funktionskatalog](research/designanalyse-und-funktionen.md).

## Ziel

Die V2 unter `/v2/` wird als eigenständige Kadetten Companion App neu aufgebaut: Spieltag-Begleiter und Nachschlagewerk für einen Club. Sie bündelt, was Fans heute an mehreren Orten zusammensuchen (handball.ch, RED+, SRF/Blick, EHF und kadettensh.ch), und ist rund um den Anpfiff verlässlich.

## Entscheide

| Thema | Entscheid |
|---|---|
| Matchday | Die V1 unter `/` ist die App «Matchday» mit Kadetten, FC St. Gallen und St. Otmar. An der V1 werden keine Änderungen mehr vorgenommen. |
| Neuaufbau | Die Kadetten-App wird komplett neu gestaltet und neu aufgebaut. Die bisherige V2 dient nur als Fundus (Datenlogik, Prüfwissen); sie gibt Struktur und Gestaltung nicht vor. |
| Ort | Die neue App ersetzt die bisherige V2 direkt unter `/v2/`. Installations-ID, Scope und `v2:`-Speicherschlüssel bleiben, damit installierte Apps weiterlaufen. |
| Technik | Ohne Framework: ES-Module, CSS mit Layern und Tokens, esbuild. Eigene Codebasis ohne gemeinsame Client-Dateien mit V1; die V1-Ausgabe bleibt nachweisbar bytegleich. |
| Datendienst | Die App liest den bestehenden Datendienst `kadetten-api`. Neue Funktionen erhalten nur zusätzliche Endpunkte unter eigenem Präfix (`/api/app/`, server/app-fan.mjs); bestehende Routen bleiben unverändert. |
| Charakter | Inoffizielle Fan-App. Kein Auftreten als offizielles Club-Angebot, Videos nur verlinken (Rechte bei SHV/RED), keine Werbung und kein Drittanbieter-Tracking. |

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
| Nachspiel | bis etwa 24 h nach Spielende | Endresultat, Spielbericht mit Torschützen und Teamwerten, Tabelle danach, Teilen-Bild, nächstes Spiel |

### Spielseite: Zustände

| Zustand | Inhalt |
|---|---|
| Vorschau | Ausgangslage, Vorschau-Text, direkte Duelle, letzte Spiele beider Teams, «Wo läuft das Spiel?», Matchprogramm |
| Live | Spielstand, Phase und Spielzeit, Halbzeitstand, Live-Tabelle, «Stand vor x Sekunden» |
| Bericht | Endresultat und Halbzeit, Torschützen, Paraden, 7-m, Zeitstrafen, Teamvergleich, Tabelle danach, Artikel zum Spiel |

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
| Ich | Benachrichtigungen (Anpfiff, Endresultat, Halbzeitstand, News) · Meine Spiele · Lieblingsspieler · Kalender-Abo · Darstellung System/Hell/Dunkel · App installieren · Datenschutz & Impressum · Link zu Matchday |

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
| Ich | Push (30 Min. vorher, Anpfiff, Halbzeit, Endresultat) über den bestehenden Dienst, Meine Spiele, Lieblingsspieler, Kalenderdatei (.ics, auf dem Gerät erzeugt), Darstellung, App installieren, Link zu Matchday | `/api/push/*` (bestehend), lokal |
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
| Überraschen und involvieren | «Momente» (Serie, Szenario «Mit einem Sieg», Meilenstein, Lieblingsspieler, letztes Duell, höchster Saisonsieg, Geschichte des Tages), Tippspiel ohne Einsatz (lokal, Punkte 3/2/1), Teilen-Bild für Resultate, «Deine Saison» mit Teilen-Bild, Lieblingsspieler in Tabellen hervorgehoben, Siegmoment (abschaltbar über «Bewegung reduzieren»), Regel-Erklärungen («?») | vorhandene Daten, lokal |
| Fan-Wahl «Spieler des Matchs» | Kandidaten aus dem gesicherten Spielbericht, offen von 90 Minuten nach Anpfiff bis 26 Stunden nach Anpfiff, eine Stimme pro Gerät (zufälliger Schlüssel, gehasht gespeichert), höchstens 6 Stimmen pro Anschluss und Spiel, Ergebnis nach der eigenen Stimme oder nach Schluss, als inoffiziell gekennzeichnet | `GET/POST /api/app/votes/:id` (KV `app/votes/…`) |
| Kalender-Abo | abonnierbarer Kalender (`webcal://…/api/app/calendar.ics`), aktualisiert sich selbst; die einmalige Kalenderdatei bleibt | `GET /api/app/calendar.ics` |
| Push Lieblingsspieler | Mitteilung bei jedem Tor des Lieblingsspielers in QHL-Spielen, aus der SHV-Ereignisliste, je Tor und Gerät einmal, nur frisch gesehene Tore | `/api/push/device` mit `favourite.shv`, server/push-monitor.mjs |

Die Endpunkte unter `/api/app/` und die Tor-Mitteilungen wirken erst nach der Bereitstellung des Datendienstes (Workflow «Cloudflare-Datendienst bereitstellen», läuft bei Änderungen unter `server/` auf `main` automatisch). Bis dahin blendet die App Kalender-Abo, Tor-Mitteilungen und Fan-Wahl aus.

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
