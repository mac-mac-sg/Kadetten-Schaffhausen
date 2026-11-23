# Prüfbericht Kadetten-App, 23. November 2026

Vorbereitung für eine mögliche Vorstellung beim Vorstand der Kadetten Schaffhausen. Stand: `main` nach PR #393. Geprüft in vier Dimensionen:

- Architektur und Code
- Gesamtkonzept
- Funktionsumfang
- Design

Grundlagen der Prüfung:

- Code und Doku gelesen.
- Alle Tests ausgeführt.
- 22 Seiten in echtem Chromium hell und dunkel aufgerufen und mit axe-core 4.10 automatisch auf Barrierefreiheit geprüft.
- Ladezeit gemessen, einmal schnell und einmal mit simuliertem 4G.

## Umsetzungsstand (23. November 2026)

| Punkt | Stand |
|---|---|
| D1 Erklär-Knöpfe | Die Tippfläche war schon 44 px (unsichtbare Fläche um das «?»); die Beschriftung nennt jetzt den Begriff, z. B. «Erklärung: Wurfquote» (`RULE_LABELS`, Test gegen die Regeltexte) |
| D2 Bildergalerie | per Tastatur erreichbar und beschriftet («Bilder von …»), mit Fokusrahmen; axe meldet keine Verstösse mehr |
| D3 Teamnamen | Kurznamen für Chambéry, Balingen und Bietigheim; die Spielkarte zeigt «Chambéry» statt «Chambery Sa-voie Mont Blanc HB» |
| K2 Datenschutz | eigene Seite «Datenschutz» unter Einstellungen (`#/ich/datenschutz`): inoffizielle Fan-App, was auf dem Gerät bleibt, was der Datendienst wie lange speichert (Push 180 Tage, Fan-Wahl 60 Tage, Anschluss 6 Stunden), Anbieter, Kontakt über GitHub. Offen: Name der verantwortlichen Person für ein Impressum (hängt am Entscheid K3) |

## Gesamturteil

Die App wirkt professionell und ist technisch sauberer gebaut als viele Vereins-Apps von Agenturen:

- eigenständige Gestaltung
- strenge Sicherheit
- über 500 automatische Tests
- keine Werbung, kein Tracking

Vor einer Vorstellung beim Vorstand liegen die grössten Lücken nicht im Code. Sie liegen bei **Rechten, Rechtstexten und Betrieb**:

- Logo, Fotos und Vereinstexte werden ohne geklärte Erlaubnis verwendet.
- Impressum und eine vollständige Datenschutzerklärung fehlen.
- Die App hängt an einem privaten Konto (GitHub, Cloudflare) und hat nur eine Person, die sie pflegt.

Das sind genau die Fragen, die ein Vorstand stellen wird. Sie sollten vor dem Termin beantwortet oder bewusst als Angebot formuliert sein.

| Dimension | Urteil | Kurz |
|---|---|---|
| Architektur und Code | **gut** | klare Schichten, strenge Sicherheit, sehr gute Testabdeckung; kein Linter, Altlasten im Datendienst |
| Gesamtkonzept | **gut, mit offenen Grundsatzfragen** | klarer Nutzen für Fans; Rechte, Rolle (inoffiziell oder offiziell) und Betrieb ungeklärt, Spezifikation veraltet |
| Funktionsumfang | **sehr breit** | deckt Spieltag, Saison, Team und Verein vollständig ab; für eine Vorstellung eher zu viel als zu wenig |
| Design | **stark** | eigene, wiedererkennbare Sprache «Schnitt», hell und dunkel; kleine Mängel bei Tippflächen und langen Teamnamen |

## Kennzahlen

| Bereich | Wert |
|---|---|
| App-Code | 9 953 Zeilen JS in 68 Dateien; grösste: `wissen/inhalt.js` (858, Inhalte), `views/bericht.js` (668), `views/spiel.js` (394) |
| CSS | 1 324 Zeilen in 8 Dateien, davon `views.css` 898 |
| Datendienst | 25 Module, 2 220 Zeilen (Cloudflare Worker) |
| Ausgeliefert | `app.js` 223 KB (komprimiert 77 KB), `app.css` 95 KB (komprimiert 19 KB), Assets 2,0 MB |
| Tests | 61 Testdateien, 518 Tests, alle grün; 14 Browser-Szenarien in Chromium, alle grün |
| Abhängigkeiten | 1 Laufzeit-Abhängigkeit (`jose`), `npm audit`: 0 Schwachstellen |
| Barrierefreiheit (axe) | 22 Seiten × hell/dunkel: 1 Befund (Bildergalerie im Shop), sonst keine Verstösse; keine horizontale Überbreite; je Seite genau eine Hauptüberschrift; keine Skriptfehler |
| Ladezeit Startseite | grösstes Element nach 0,2 s (lokal) bzw. 3,2 s (simuliertes 4G, 1,6 Mbit/s, unkomprimiert; mit Komprimierung schneller, nicht gemessen) |

## 1. Architektur und Code

**Stärken**

- **Klare Schichten:**
  - Reine Logik (`logic.js`, `gewinnscore.js`, `ticker.js`, `shop.js`) ist von den Ansichten (`views/*`) getrennt, Ereignisse von den Steuerungen (`controllers/*`).
  - `main.js` hat nur noch rund 120 Zeilen.
  - Die Logik ist ohne Browser testbar, das zeigen die 518 Tests.
- **Ohne Framework, mit wenigen Abhängigkeiten:**
  - ES-Module und esbuild, eine einzige Laufzeit-Abhängigkeit (`jose` für Web-Push im Datendienst).
  - Es gibt keine Abhängigkeit, die veralten kann, und keine Lieferkette mit Hunderten Paketen.
- **Sicherheit:**
  - Alle HTML-Ausgaben werden maskiert. Vereinsartikel laufen durch eine Positivliste (`sanitize.js`).
  - Die CSP ist streng: kein Inline-Skript und kein Inline-Stil.
  - Ein Ausbruchsschutz verhindert das Einbetten in fremde Seiten.
  - Der Datendienst nimmt Schreibzugriffe nur begrenzt an.
  - Es gibt keine Konten und keine Passwörter.
- **Datenschutz durch Bauart:**
  - Tipps, Sammlung, Lieblingsspieler und Warenkorb bleiben auf dem Gerät.
  - Auf dem Server liegen nur das Push-Abo (180 Tage) und gehashte Anschlüsse für Begrenzungen.
- **Ausfallsicherheit:**
  - Bei einem Ausfall einer Quelle bleibt der letzte Stand sichtbar.
  - Live-Daten kommen nie aus dem Cache.
  - Die App funktioniert offline (Service Worker).
- **Qualitätssicherung:**
  - Jeder PR durchläuft `verify` und die Browser-Tests.
  - Ein Test bewacht das Designsystem (Schrift-Token, Farb-Token).
  - Die Doku zu Betrieb und Saisonwechsel ist vorhanden.

**Schwächen**

| Nr. | Befund | Gewicht | Vorschlag |
|---|---|---|---|
| A1 | Kein Linter und keine Typprüfung. Prettier formatiert nur `src/kadetten/js`; Tests und Datendienst sind uneinheitlich formatiert, 120 Zeilen im Datendienst sind länger als 200 Zeichen. | mittel | ESLint mit wenigen Regeln (unbenutzte Variablen, fehlende Importe); Prettier auf `server/` und `tests/` ausdehnen (einmaliger, reiner Formatierungs-PR); optional `// @ts-check` für Logikmodule |
| A2 | Altlasten im Datendienst: Die Endpunkte von FC St. Gallen und St. Otmar (`/api/fcsg/*`, `/api/otmar/*`) sind archiviert, werden aber noch ausgeliefert, samt Seeds und Tests. | mittel | Endpunkte entfernen, Code nach `archive/` verschieben; das verkleinert die Angriffsfläche und den Wartungsaufwand |
| A3 | Abhängigkeit von nicht offiziell freigegebenen Quellen: SHV-GraphQL, EHF-Seiten und die Store-API von kadettensh.ch werden ohne Vereinbarung gelesen. Ändert ein Anbieter etwas, fällt eine Funktion aus (Tests merken es, Nutzer sehen den letzten Stand). | mittel | mit dem Verein klären, ob der SHV einen offiziellen Zugang bietet; Betriebsdoku um «was tun, wenn Quelle X ausfällt» ergänzen |
| A4 | Grosse Ansichten: `views/bericht.js` (668 Zeilen) bündelt Statistik, Spielverlauf, Ticker und Texte. | niedrig | bei der nächsten Änderung in Teile trennen (wie beim Umbau von `main.js`) |
| A5 | Offline-Hülle: Die App lädt 223 KB JavaScript auf einmal; nur das Wissen wird nachgeladen. | niedrig | Shop, Sammlung und Rückblick als eigene Chunks nachladen, wenn die Startzeit auf alten Handys stört |

## 2. Gesamtkonzept

**Stärken**

- **Klarer Nutzen:**
  - Die App bündelt, was Fans heute auf handball.ch, kadettensh.ch, EHF, RED+ und Instagram zusammensuchen.
  - Im Zentrum steht das nächste Spiel.
- **Gute Leitfragen:** Sechs Fragen der Fans tragen die Struktur, zum Beispiel «Wann spielen wir?» und «Wie stehen wir da?».
- **Haltung:**
  - Keine Werbung, kein Tracking, keine Konten.
  - KI-Texte sind als solche gekennzeichnet («Von einer KI aus bestätigten Spieldaten formuliert»).
  - Teilbilder tragen «inoffiziell».
- **Technisch günstig im Betrieb:** GitHub Pages und Cloudflare Worker im Gratis-Rahmen, keine Serverpflege.

**Offene Grundsatzfragen (vor dem Vorstand klären)**

| Nr. | Befund | Gewicht | Vorschlag |
|---|---|---|---|
| K1 | **Rechte:** Die App verwendet Vereinslogo, Spielerfotos, Produktbilder und ganze Vereinsartikel von kadettensh.ch. Die Spezifikation führt «Bildrechte» und «Kontakt zum Club» als offen. Für eine private Fan-App ist das eine Grauzone; vor dem Vorstand ist es die erste Frage. | **hoch** | die Vorstellung als Angebot formulieren: «Wir möchten die Inhalte mit eurer Erlaubnis nutzen»; Fotorechte (z. B. Felix Burrichter) gesondert klären |
| K2 | **Impressum fehlt, Datenschutz ist unvollständig:** «Mein Bereich» sagt «Persönliches bleibt auf diesem Gerät». Das stimmt nicht ganz: Das Push-Abo (mit Lieblingsspieler) liegt 180 Tage beim Datendienst, für Fan-Wahl und Push werden gehashte IP-Adressen kurz gespeichert, und Drittquellen (Cloudflare, GitHub) sehen die Zugriffe. | **hoch** | Seiten «Impressum» (verantwortliche Person, Kontakt) und «Datenschutz» (was, wo, wie lange; Cloudflare und GitHub als Anbieter) ergänzen; Satz in «Mein Bereich» präzisieren |
| K3 | **Rolle offiziell oder inoffiziell:** Die Spezifikation sagt «inoffizielle Fan-App, kein Auftreten als offizielles Angebot». Mit Vereinsdesign, Shop-Nachbau und Vorstellung beim Vorstand verschiebt sich das. | hoch | vorher entscheiden, was angeboten wird: (a) offizielle Vereins-App mit Verein als Herausgeber oder (b) geduldete Fan-App mit Erlaubnis für Inhalte. Davon hängen K1, K2 und K4 ab |
| K4 | **Betrieb und Abhängigkeit von einer Person:** Repository, GitHub Pages (`mac-mac-sg.github.io`), Cloudflare-Konto und Push-Schlüssel hängen an einem privaten Konto. Es gibt keine Vertretung. | hoch | für ein Vereinsangebot: eigene Domain (z. B. `app.kadettensh.ch`), Vereins-Organisation auf GitHub und Cloudflare, zweite Person mit Zugang; Kosten (heute 0 CHF) und Aufwand je Saison schriftlich festhalten |
| K5 | **Spezifikation veraltet:** `docs/kadetten-app.md` beschreibt noch vier Bereiche (heute fünf Reiter: Start, Spiele, Tabelle, Kader, Ich), «keine Anreise» (die Vorschau zeigt seit 21.11. die Anreise) und «Live ohne Ereignisliste» bzw. «kein Tor-für-Tor-Ticker» (seit 22.11. gibt es einen Ticker mit Fokus auf Tore und Strafen). | mittel | Abschnitte «Struktur», «Einschränkungen» und «Bewusst nicht vorgesehen» nachführen; für den Vorstand eine zweiseitige Kurzfassung (Ziel, Funktionen, Betrieb, Kosten, Datenschutz) |
| K6 | **Fanshop ohne Übergabe:** Die Kasse sagt klar «Hier endet die Kasse in der App, es wird nichts bestellt» und verlinkt den Online-Shop. Dort muss man den Warenkorb aber nochmals zusammenstellen. Das ist ein Bruch, den der Vorstand bemerken wird. | mittel | im Gespräch klären, ob der Verein eine Übergabe des Warenkorbs an WooCommerce will (z. B. über Links «in den Warenkorb legen» je Artikel); bis dahin den Shop in der Demo als Vorschau zeigen |

## 3. Funktionsumfang

**Vorhanden**

| Bereich | Funktionen |
|---|---|
| Spieltag | nächstes Spiel mit Tickets, Vorschau (Aufmacher, Gewinnchance, Anreise, Spielort), Live-Stand alle 30 s mit Ticker (Tore und Strafen), Halbzeit, Bericht mit Statistik und Spielverlauf, Spiel-Story, Teilbilder für Instagram |
| Saison | Spielplan und Resultate (QHL, Cup, European League), Tabelle, Statistik, Kalender-Abo, Saisonrückblick «Deine Saison» |
| Team | Kader mit Positionen, Spielerprofile mit Saisonwerten und Formkurve, Spielervergleich, Lieblingsspieler |
| Verein | Geschichte, Titel, Heimhalle, News mit ganzem Artikel (Spielbericht mit Fakten-Box) |
| Mitmachen | Tippspiel mit Punkten, Fan-Wahl, Quiz, Sammelkarten, Wissen (Regeln, Aufstellungen, Spielzüge mit Animation) |
| Fanshop | Katalog aus dem Online-Shop, Grössen und Farben, Warenkorb, Versand (CHF 10, ab CHF 100 gratis) oder Abholung am Heimspiel, Kasse bis vor die Zahlung |
| Mitteilungen | Push zu Anpfiff, Resultat und Toren des Lieblingsspielers |

**Bewertung**

- Der Funktionsumfang übertrifft übliche Vereins-Apps deutlich. Dort gibt es meist nur News, Spielplan und Tickets.
- Die Kernfragen der Fans sind alle abgedeckt.
- Für den Vorstand ist die Breite Stärke und Risiko zugleich:
  - Sie zeigt das Potenzial.
  - Sie wirft aber Fragen nach Pflegeaufwand und Fokus auf.

| Nr. | Befund | Gewicht | Vorschlag |
|---|---|---|---|
| F1 | Die Vorstellung kann sich in Details verlieren (Sammelkarten, Quiz, Wissen). | mittel | Demo in drei Akten: (1) ein Spieltag von Vorschau über Live bis Bericht, (2) der Fan («Mein Bereich», Tippspiel, Push), (3) was es dem Verein bringt (Shop, Tickets, News-Reichweite). Den Rest nur zeigen, wenn gefragt |
| F2 | Was dem Verein nützt, ist kaum messbar: Ohne Tracking gibt es keine Nutzungszahlen. | mittel | eine datenschutzfreundliche Zählung anbieten (z. B. Cloudflare Web Analytics ohne Cookies), nur mit Zustimmung des Vereins |
| F3 | Es fehlen Inhalte für weitere Teams (Nachwuchs, Frauen) und eine Ansprechstelle für Fans («Fehler melden»). | niedrig | Kontaktweg ergänzen (mit K2); weitere Teams als möglichen Ausbau nennen, je nach Daten des SHV |

## 4. Design

**Stärken**

- **Eigene Gestaltungssprache «Schnitt»:**
  - schräge Kanten, Streifenband, kursive Barlow-Zahlen, Orange aus der Vereinsfarbe
  - wiedererkennbar und nicht austauschbar
  - durchgängig in App, Story-Bildern und Teilbildern
- **Hell und dunkel:**
  - Beide Darstellungen sind auf allen 22 geprüften Seiten vollständig umgesetzt, ohne Verstösse gegen die Kontrastregeln.
  - Die Kontraste wurden bei der Feinarbeit gemessen.
- **Bewegung mit Mass:**
  - Animationen (Story, Konfetti, Feldbild) richten sich nach «Bewegung reduzieren».
  - Die Spiel-Story lässt sich anhalten.
- **Designsystem:**
  - Tokens für Farbe und Schrift, durch einen Test bewacht.
  - Ein Brand-Kit und eine Design-Doku sind vorhanden.

**Schwächen**

| Nr. | Befund | Gewicht | Vorschlag |
|---|---|---|---|
| D1 | Die Erklär-Knöpfe «?» sind nur 20 × 20 px gross (Spielseite 9-mal, Spielerprofil 3-mal). Das liegt unter dem WCAG-Minimum von 24 px und weit unter den empfohlenen 44 px. Alle heissen gleich: «Erklärung anzeigen». | mittel | Tippfläche auf mindestens 44 px vergrössern (Symbol kann klein bleiben); Beschriftung mit Begriff, z. B. «Erklärung: Wurfquote» |
| D2 | Die Bildergalerie auf der Produktseite ist per Tastatur nicht erreichbar (axe: `scrollable-region-focusable`, schwerwiegend). | mittel | `tabindex="0"` und Beschriftung für die Galerie |
| D3 | Lange Teamnamen werden mitten im Wort getrennt: «Chambery Sa-voie Mont Blanc HB» auf der Spielkarte der Startseite. | mittel | Kurznamen für Gegner (`shortTeam`) auch in der Spielkarte verwenden («Chambéry»); den Akzent in den Daten korrigieren |
| D4 | Am Computer zeigt die App eine Handyspalte in der Mitte und leere Flächen daneben. Für eine PWA ist das in Ordnung. Am Beamer vor dem Vorstand wirkt es klein. | niedrig | für die Vorstellung am Handy vorführen oder per Bildschirmspiegelung; später eine breitere Darstellung ab Tablet erwägen |
| D5 | Die Seite «Verein» liegt unter dem Reiter «Kader». Wer «Verein» sucht, findet es nicht in der Navigation. | niedrig | den Reiter umbenennen («Team & Verein») oder «Verein» von der Startseite verlinken |

## Empfohlene Reihenfolge vor dem Termin

1. **Entscheiden, was angeboten wird (K3).** Offizielle Vereins-App oder geduldete Fan-App: Davon hängen Rechte, Rechtstexte und Betrieb ab.
2. **Rechtstexte ergänzen (K2).** Impressum und Datenschutz, den Satz in «Mein Bereich» präzisieren. Aufwand gering, Wirkung gross.
3. **Kleine Mängel beheben (D1, D2, D3).** Tippflächen, Galerie und Teamnamen. Je unter einer Stunde. Die Übergabe des Warenkorbs (K6) als Frage an den Verein mitnehmen.
4. **Kurzfassung für den Vorstand und Spezifikation nachführen (K5).**
   - Ziel, Funktionen, Datenschutz, Betrieb, Kosten.
   - Offene Fragen an den Verein: Rechte (K1), Domain und Konten (K4), Datenzugang beim SHV (A3), Übergabe des Warenkorbs (K6).
5. **Aufräumen im Code (A1, A2).** Nicht nötig für den Termin, aber vor einer Übergabe an den Verein: Linter, einheitliche Formatierung, Altlasten von FCSG und St. Otmar entfernen.

## Nicht geprüft

- echte Geräte (iPhone und Android), installierte PWA und Push-Zustellung, Bildschirmleser mit Sprachausgabe
- Ladezeit über das echte Netz mit Komprimierung (gemessen wurde lokal, unkomprimiert, mit simuliertem 4G)
- rechtliche Würdigung; die Hinweise zu Rechten und Datenschutz sind keine Rechtsberatung
