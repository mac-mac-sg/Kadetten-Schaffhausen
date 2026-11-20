# Prüfbericht Kadetten-App, 20. November 2026

Stand: `main` nach PR #378 (Sammlung in gemischten Formaten). Geprüft wurden App (`src/kadetten`), Datendienst (`server/`), Build und Tests.

## Umsetzungsstand (20. November 2026)

Die schnellen und mittleren Vorschläge sind umgesetzt (PR zu diesem Bericht):

| Punkt | Stand |
|---|---|
| A3 toter Code | entfernt: `lastGamesOf`, `momentCards` samt CSS, `inChapter` |
| S1 SVG-Beschriftungen | maskiert mit `escapeHtml` |
| A6, D5 Doku und Kommentare | Spiel-Story in Kommentaren und `docs/kadetten-app.md` angeglichen |
| D1 Tokens (Geschichten) | Bandverlauf über `--band-bg`, helle Fläche über neues `--c-cream` |
| D4 Barrierefreiheit der Geschichten | sichtbarer Pause-Knopf; keine Automatik bei «Bewegung reduzieren»; `aria-live` nur bei Wechseln von Hand |
| A2 Geschichten-Rahmen | eigenes Modul `views/story.js` (Rahmen, Schlagzeile, Kachel) |
| A4 doppelte Hilfen | `storage.js` (sechs Kopien ersetzt), `shortDate()` (fünf Stellen), eine Prozentfunktion |
| A5 Saisonwerte | `server/season.mjs` für den Datendienst, Test zwischen App und Datendienst, Checkliste «Saisonwechsel» in `docs/betrieb.md` |

Die grösseren Punkte sind am selben Tag umgesetzt (zweiter PR):

| Punkt | Stand |
|---|---|
| A1 `main.js` | von 703 auf 121 Zeilen; `shell.js` (Navigation, Zeichnen, Klick-Verteiler) und `controllers/*` (story, cards, wissen, personal, push, votes, sharing, gestures); Aktionen melden sich als `[data-Attribut, Funktion]` an |
| Browser-Test | `npm run test:browser` mit 10 Szenarien in echtem Chromium, in CI als eigener Auftrag; fand schon beim Umbau einen echten Fehler (Zurück-Knopf des Wissen-Platzhalters) |
| D1 Tokens | Schriftgrössen-Skala als Token (38 Stellen umgestellt), Karten-Überlagerungen als Farb-Token; Test `designsystem.test.mjs` bewacht beides |
| D2 | `--fs-meta` und `--fs-small` bleiben bewusst getrennt (Angaben und Beschriftungen gegen Nebentext), in der Design-Doku erklärt |
| D3 Marken und Kacheln | `.rb-tag` und `.sk-tag` teilen die schräge Basis mit Pill und Tag (Text bleibt gerade); eine Hinweis-Kachel `.teaser` statt `rb-teaser`; toter Karussell-CSS (`.kurz*`) entfernt |

Das CSS wurde mit Bildschirmfotos von 18 Seiten in Hell und Dunkel vorher und nachher verglichen: Die Token-Umstellung ist pixelgleich, Unterschiede gibt es nur an den Marken (gerader statt schräger Text).

S2 (Einbetten in fremde Seiten) ist behoben: `theme-init.js` bricht aus fremden Rahmen aus und blendet die Seite sonst aus (Test `tests/einbettung.test.mjs`). Damit ist der Bericht vollständig abgearbeitet.

## Gesamturteil

Die App ist in gutem Zustand. Sicherheit und Datenschutz sind solide gebaut: Ausgaben werden standardmässig maskiert, die CSP ist streng, Schreibzugriffe sind eng begrenzt. Es gibt keine bekannten Schwachstellen in Abhängigkeiten, und alle 473 Tests sind grün. Die grössten Baustellen sind nicht Fehler, sondern Wachstumsspuren der letzten Wochen:

- Die Ereignissteuerung in `main.js` ist zu einem Sammelbecken geworden.
- Einige Hilfsfunktionen gibt es mehrfach.
- Die neuesten Bausteine (Geschichten, Gewinnscore, Querkarten) halten sich nicht ganz an die Design-Tokens.
- Saisonabhängige Werte sind über mehrere Dateien verteilt.

## Kennzahlen

| Bereich | Wert |
|---|---|
| App-Code | 8 553 Zeilen JS in 50 Dateien, grösste: `wissen/inhalt.js` (860), `main.js` (703), `views/bericht.js` (668) |
| CSS | 1 141 Zeilen, davon `views.css` 835 |
| Datendienst | 23 Module, 2 065 Zeilen |
| Ausgeliefert | `app.js` 195 KB, `app.css` 81 KB (beide minifiziert), Assets 1,2 MB |
| Tests | 52 Testdateien, 473 Tests, alle grün; `npm audit`: 0 Schwachstellen |

## 1. Sicherheit

**Gut gelöst**

- **HTML-Ausgabe:** Alle HTML-Ausgaben laufen über `html```, das jeden Wert maskiert (`text.js`).
- **Ausnahmen mit `raw()`:** Es gibt nur vier Stellen, alle kontrolliert:
  - feste Symbole (`icons.js`)
  - drei SVG-Diagramme aus Zahlen
  - Vereinsartikel, die vorher durch `sanitize.js` laufen (Positivliste, nur https-Links und -Bilder)
- **Content-Security-Policy:**
  - Kein Inline-Skript und kein Inline-Stil.
  - Berechnete Breiten setzt `main.js` per CSSOM, nur für `width` und `flex` mit reinen Zahlen.
  - Bilder nur über `self`, `https:` und `data:`.
- **Externe Links und Bilder:**
  - Alle externen Links mit `target="_blank"` tragen `rel="noopener"`.
  - Bilder aus Daten werden auf `https://` geprüft (`storyImage`).
  - Ticket-Links werden doppelt geprüft, im Datendienst und in der App: https, nur Ticketmaster und Ticketcorner, ohne Benutzerdaten und Port.
- **Datendienst:**
  - Er nimmt nur GET an, ausser bei Fan-Wahl, Push-Anmeldung und Aktualisierung.
  - Diese drei Wege haben Begrenzungen: Stimmen je Anschluss, eine Minute zwischen Anmeldungen und Tests.
  - Der Aktualisierungsschlüssel wird gehasht und in konstanter Zeit verglichen (`auth.mjs`).
- **Service Worker:** Live, Push, Zugang und Aktualisierung kommen nie aus dem Cache.
- **Geheimnisse:** Im Repository liegen keine, nur Testplatzhalter.

**Hinweise (niedrig)**

1. **S1 · SVG-Beschriftungen:** In `views/bericht.js:135` und `views/saison.js:109` gelangt `aria-label` ohne `escapeHtml` in `raw()`. Heute stehen dort nur Zahlen, aber eine spätere Textänderung wäre ungeschützt. Vorschlag: wie in `bericht.js:95` immer `escapeHtml(label)` verwenden.
2. **S2 · Einbettung in fremde Seiten:** GitHub Pages kann keine Kopfzeilen setzen, und `frame-ancestors` wirkt im Meta-Tag nicht. Die App liesse sich also theoretisch in fremde Seiten einbetten. Weil sie keine Konten und keine heiklen Aktionen hat, ist das Risiko gering. Behoben mit einem kleinen Ausbruchsschutz in `theme-init.js`; mit einem späteren Wechsel auf Cloudflare Pages liesse sich zusätzlich eine Kopfzeile setzen.

## 2. Architektur

1. **A1 · `main.js` ist zu breit:**
   - 703 Zeilen, 14 Ereignis-Listener, 23 verschiedene `data-*`-Aktionen und 22 Funktionen.
   - Darin stecken Darstellung, Navigation, Karten-Umdrehen, Fächer, Geschichten-Zeitsteuerung, Teilen, Push, Fan-Wahl und Kalender.
   - Jede neue Funktion vergrössert die Klick-Weiche weiter.
   - **Vorschlag:** kleine Steuermodule (`controllers/story.js`, `controllers/cards.js`, `controllers/share.js` …), die ihre Aktionen bei einer zentralen Aktionsliste anmelden. `main.js` behält nur Darstellen und Weiterleiten.
2. **A2 · Geschichten-Rahmen am falschen Ort:**
   - `storyShell`, `storyTeaser` und `storyHeadline` liegen in `views/rueckblick.js`, werden aber auch von `views/spiel.js` genutzt.
   - **Vorschlag:** ein eigenes `views/story.js`, sodass `rueckblick.js` nur den Saisonrückblick enthält.
3. **A3 · Toter Code:**
   - Diese Exporte nutzt niemand: `lastGamesOf` (`match.js`), `momentCards` (`views/parts.js`, samt CSS `.moments`) und `inChapter` (`wissen/inhalt.js`).
4. **A4 · Doppelte Hilfsfunktionen:**
   - Fünf eigene `storage()`-Helfer mit `try/catch` um `localStorage` (`push`, `sammeln`, `fan-vote`, `personal`, `quiz`). Besser wäre ein Modul `storage.js` mit `readJson(key, prüfen)` und `writeJson`.
   - Fünf Stellen formatieren Daten mit `split('-').reverse()`. Besser wäre eine Funktion `shortDate()` in `logic.js`.
   - `pct` ist zweimal definiert, einmal mit und einmal ohne Rundung (`report.js`, `rueckblick.js`).
5. **A5 · Saisonwerte verstreut:**
   - Bei jedem Saisonwechsel müssen von Hand nachgeführt werden:
     - `SEASON` (`season.js`)
     - Vorsaison-Werte des Gewinnscores (`data/gewinnscore.js`)
     - Quiz-Umstellungswoche `SHORT_FROM` (`quiz.js`)
     - Saisonnummer 2026 im Live-Abruf (`server/live.mjs`)
     - Jahresprüfung `202[67]` im Spielplan (`server/update.mjs`)
   - Vergisst man eine Stelle, fallen Live-Daten oder Spielplan still aus.
   - **Vorschlag:** eine gemeinsame Saison-Konfiguration für App und Datendienst und eine Checkliste «Saisonwechsel» in `docs/betrieb.md`.
6. **A6 · Veraltete Kommentare und Doku:**
   - `kurz.js:1` und `views/spiel.js:239` sprechen noch von «Spiel in 30 Sekunden» mit höchstens fünf Karten.
   - `docs/kadetten-app.md` beschreibt in der Funktionstabelle (Zeile 227) noch den alten Stand. Gemeint ist inzwischen die Spiel-Story.

## 3. Designprinzipien «Schnitt»

**Durchgängig umgesetzt:**
- Schräge Marken und Knöpfe (`--skew`).
- Kursive Barlow-Ziffern für grosse Zahlen.
- Streifen als Markenzeichen.
- Orange nur für Akzent und aktive Zustände.
- Hell- und Dunkelmodus über Tokens.
- «Bewegung reduzieren» für Animationen.
- Neue Funktionen (Gewinnscore, Tickets-Marke, Spiel-Story, Saisonrückblick, Querkarten) übernehmen Schrift, Schräge und Streifen sauber.

**Abweichungen**

1. **D1 · Feste Werte statt Tokens:**
   - `views.css` enthält 25 feste Farbwerte und 45 Schriftangaben in Pixel. Dem stehen 92 Token-Verwendungen gegenüber.
   - Die neuesten Bausteine verwenden eigene Farben: `#ff7d26` und `#e85200` für den orangen Verlauf in den Geschichten, `#f6f3ee` für die helle Story-Fläche.
   - **Vorschlag:** Tokens `--c-accent-hi` und `--c-accent-lo` für den Bandverlauf, den es schon gibt; die helle Fläche über `--c-paper`; Schriftgrössen über `--fs-*`.
2. **D2 · Doppelte Tokens:** `--fs-meta` und `--fs-small` sind beide 13 px. Entweder zusammenlegen oder bewusst unterscheiden.
3. **D3 · Vier Varianten derselben schrägen Marke:**
   - `.pill`, `.tag-ink`, `.rb-tag` und `.sk-tag` sind im Kern dasselbe Element.
   - Dazu kommen drei Kachel-Typen: `.rowcard`, `.rb-teaser` und `.card`.
   - **Vorschlag:** eine Marke mit Varianten (`.mark.ink`, `.mark.accent`, `.mark.on-band`) und eine Hinweis-Kachel (`.teaser`). Das hält künftige Funktionen einheitlich.
4. **D4 · Geschichten und Barrierefreiheit:**
   - Die Karten laufen nach 5 Sekunden automatisch weiter, auch bei «Bewegung reduzieren».
   - `aria-live` liest jede neue Karte vor, also alle 5 Sekunden.
   - Anhalten geht nur durch Halten oder die Leertaste. Für Screenreader und Schalterbedienung fehlt ein sichtbarer Pause-Knopf (WCAG 2.2.2).
   - **Vorschlag:**
     - Sichtbarer Pause-Knopf neben dem ×.
     - Bei «Bewegung reduzieren» keine Automatik.
     - `aria-live` nur bei Wechseln von Hand.
5. **D5 · Begriffe:**
   - Die Spiel-Story heisst in Adresse und Code `kurz`, in Kommentaren «Spiel in 30 Sekunden».
   - Der Tab heisst «Ich», die Seite «Mein Bereich».
   - Der Saisonrückblick heisst «Deine Saison», das Teilen-Bild «Meine Saison».
   - Das ist für Nutzer verständlich, intern sollte aber je ein Name gelten. Mindestens die Doku sollte angeglichen werden.

## 4. Innere Konsistenz der Funktionen

- **Wettbewerbe** sind bewusst unterschiedlich abgedeckt:
  - Der Gewinnscore gilt nur für die QHL.
  - Die Tickets-Marke gilt für alle Heimspiele mit Link (QHL und EHL).
  - Die Tabelle nach dem Spiel erscheint nur beim letzten QHL-Spiel.
  - Das ist korrekt und dokumentiert.
- **Persönliche Daten** bleiben überall auf dem Gerät. Saisonrückblick, Spiel-Story und Sammlung lesen dieselben Schlüssel. Ein neues Gerät beginnt leer; das steht in der Doku.
- **Quiz:** Wochen vor der Umstellung behalten fünf Fragen, Bilanz und Belohnungen rechnen pro Woche richtig. `QUIZ_SIZE`, `quizSize()` und `weekResult()` sind die einzigen Quellen.
- **Tests:**
  - Logik und Darstellung sind breit getestet.
  - Bedienung (Wischen, Halten, Zeitsteuerung, Umdrehen) habe ich bisher nur von Hand im Browser geprüft.
  - **Vorschlag:** ein kurzer Playwright-Rauchtest in CI für Geschichte (Weiterblättern nach 5 s, Pause beim Halten), Karten-Umdrehen und Spieltagskarte mit Tickets-Marke.

## 5. Vorschläge nach Aufwand

**Schnell (unter einer Stunde)**

1. Toten Code entfernen: `lastGamesOf`, `momentCards` mit CSS `.moments`, `inChapter` (A3).
2. `escapeHtml` in den zwei SVG-Beschriftungen (S1).
3. Kommentare und Doku zur Spiel-Story angleichen (A6, D5).
4. Feste Farben der Geschichten durch Tokens ersetzen (D1, Teil).

**Mittel (halber Tag)**

5. Geschichten barrierefrei machen: sichtbarer Pause-Knopf, keine Automatik bei «Bewegung reduzieren», `aria-live` nur bei Wechseln von Hand (D4).
6. `storage.js`, `shortDate()` und ein einziges `pct` (A4).
7. `views/story.js` für den gemeinsamen Geschichten-Rahmen (A2).
8. Saison-Konfiguration und Checkliste «Saisonwechsel» (A5).

**Grösser (ein bis zwei Tage)**

9. `main.js` in Steuermodule mit Aktionsliste aufteilen (A1).
10. Marken und Hinweis-Kacheln zu je einem Baustein zusammenführen, restliche Pixel-Schriftgrössen auf Tokens (D1 bis D3).
11. Playwright-Rauchtest in CI für die Bedienung (Abschnitt 4).
