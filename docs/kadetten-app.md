# Kadetten Companion App (V2) – Spezifikation

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
| Datendienst | Die App liest den bestehenden Datendienst `kadetten-api`. Neue Funktionen erhalten nur zusätzliche Endpunkte unter eigenem Präfix; bestehende Routen bleiben unverändert. |
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
- **Live nur auf Ebene Spielstand.** Der Liveticker wird alle 30 Sekunden abgerufen; in dieser Zeit fallen im Handball oft mehrere Tore. Einzelne Tore, Torschützen und Tor-für-Tor-Abläufe werden live deshalb nicht dargestellt. Torschützen und Spielerwerte erscheinen erst im bestätigten Spielbericht.
- Der letzte gültige Stand bleibt bei Ausfällen sichtbar; Live-Antworten werden nie aus dem Cache gezeigt.

## Gestaltung

Richtung «Abend» (dunkel mit Hallenfoto, schmale grosse Zahlen, runde und warme Formen), Hell- und Dunkelmodus. Farben, Schrift, Abstände und Bausteine: [Designsystem](kadetten-app-design.md).

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
| 6 | Umstellung `/v2/` auf die neue App | Funktionsumfang erreicht | offen |

## Technik

Die neue App ist gebaut und geprüft, aber noch nicht veröffentlicht: `/v2/` zeigt bis Schritt 6 weiterhin die bisherige V2.

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

Für Schritt 6 offen: `scripts/build-pages.mjs` legt dann `dist/app` statt der bisherigen V2 unter `dist/client/v2` ab; der neue Service Worker räumt dabei die Caches der alten V2 (`kadetten-offline-*`, `kadetten-articles-v2-*`) ab.

## Bisheriger Stand: Kadetten-Sperre in der alten V2 (#314)

- `src/client/v2/matchday.js` beschränkt `fanClubs` und `selectedClubs` vor `restoreActiveClub()` auf `kadetten` und setzt die gespeicherte Auswahl zurück. `?club=fcsg` und `?club=otmar` werden in V2 ignoriert.
- Bisherige Nutzer sehen einmalig den Hinweis auf Matchday; ein bestehendes Push-Abo wird auf die Kadetten beschränkt. Die Einstellungen zeigen statt «Meine Vereine» einen Link «FC St. Gallen und St. Otmar in Matchday» (`../`).
- Kopfzeile, Einführung, Teilen-Bild, Installationstexte, Manifest («Kadetten Fan-App»/«Kadetten»), Titel, Beschreibung und Offline-Seite nennen nur die Kadetten; Installations-ID und Scope bleiben.
- Regressionstest: `tests/v2-kadetten-only.test.mjs`; Build-Prüfung in `scripts/check-preview.mjs`.

## Feature-Backlog

Ideen für nach dem Grundumfang (Schritte 1–6). Noch nicht entschieden und nicht eingeplant.

### Fan-Wahl «Spieler des Matchs»

Fans wählen nach dem Spiel den besten Kadetten-Spieler.

| Punkt | Vorschlag |
|---|---|
| Ort | Spielseite · Bericht und «Jetzt» · Nachspiel |
| Auswahl | Kadetten-Spieler mit Einsatz laut bestätigtem Spielbericht, mit Toren und Paraden als Entscheidungshilfe |
| Zeitfenster | ab bestätigtem Endresultat bis etwa 24 Stunden danach |
| Ergebnis | Sieger und Anteile erst nach Abschluss der Wahl; auf dem Spielerprofil «Spieler des Matchs» pro Saison |
| Stimmen | eine Stimme pro Gerät und Spiel, ohne Konto |

Zu klären vor der Umsetzung:
- **Schreibzugriff:** Bisher schreibt die Öffentlichkeit nie in den Datendienst (AGENTS.md). Die Wahl bräuchte erstmals einen öffentlichen, schreibenden Endpunkt unter eigenem Präfix (z. B. `POST /api/votes/…`) mit eigenem Speicher. Das ist ein Entscheid des Eigentümers.
- **Missbrauch:** Ohne Konto lässt sich Mehrfachabstimmen nur erschweren, nicht verhindern (Gerätekennung, Ratenbegrenzung, allenfalls Cloudflare Turnstile). Das Ergebnis ist deshalb ein Stimmungsbild, keine offizielle Auszeichnung.
- **Datenschutz:** keine Personendaten speichern; die Gerätekennung bleibt zufällig und lokal, Stimmen nur gezählt.
- **Abgrenzung:** «Öffentliche Ranglisten» sind bewusst nicht vorgesehen; eine Wahl pro Spiel ohne Nutzerranglisten widerspricht dem nicht.
- **Charakter:** Inoffizielle Fan-Wahl, klar als solche bezeichnet; kein Bezug zu einer allfälligen offiziellen Auszeichnung des Clubs.

## Bewusst nicht vorgesehen

Anreise- und Hallenführer, ÖV-Abfahrten, Tor-für-Tor-Ticker, Lärmmesser, Fanwand, Navigation in der Halle, Bestellen vom Sitzplatz, Chats, öffentliche Ranglisten, Mitgliederkarte ohne Vereinsdaten, native Live Activities, Wallet-Pässe.

## Offene Punkte

- Ob die SHV-Daten Daten von Nachwuchs- und Frauenteams liefern.
- Kontakt zum Club für Ticket-Links, «Wo läuft das Spiel?» und Bildrechte.
- `check-v2-ticket.mjs`, `check-v2-readability.mjs` und `check-v2-mobile.mjs` prüfen die alte V2 und scheitern bereits auf `main`; sie werden mit dem Neuaufbau ersetzt.
