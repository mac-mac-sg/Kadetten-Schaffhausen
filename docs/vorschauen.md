# Match-Vorschauen (aus Daten)

Die App zeigt auf der Spielseite eines künftigen Spiels die «Match-Vorschau». Sie wird seit dem Umzug auf Cloudflare nicht mehr von ChatGPT geschrieben, sondern aus bestätigten Daten zusammengesetzt (Weg B). Das Verfahren lässt Angaben weg, die fehlen, und rät nichts.

## Wann und für welche Spiele
Jeder Schreiblauf von «Cloudflare-Datenaktualisierung» (nach Zeitplan Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20 und manuell) erzeugt Vorschauen für die nächsten drei Spiele ohne Ergebnis, je für die Kadetten und den FC St. Gallen. Sie landen unter `previews/<club>/<id>.json` im KV-Speicher.

## Inhalt
1. Spielangaben: «Heim empfängt Gast (Wettbewerb), Wochentag, Datum, Uhrzeit in Spielort.» Ist die Anspielzeit nicht bestätigt (FCSG), steht das so da.
2. Tabelle: Rang, Punkte, Spiele und Torverhältnis beider Teams, nur wenn beide in der Tabelle des Wettbewerbs stehen (Kadetten: QHL und EHL, sobald die Tabelle vorliegt; FCSG: nur Super League).
3. Letzte Direktduelle (bis zu drei: Datum, Paarung, Ergebnis) und die letzten Resultate beider Teams (bis zu drei, Datum, Paarung, Ergebnis), beides in einem Absatz. Resultate des eigenen Teams stammen aus dem gespeicherten Datenstand (Kadetten: alle Wettbewerbe, FCSG: alle Wettbewerbe), Direktduelle und Resultate des Gegners aus der SHV-Quelle und nur für QHL-Spiele der Kadetten; fehlt eine Quelle, fehlt die Angabe. Gesammelt in `scripts/lib/preview-facts.mjs`.

Ohne mindestens zwei dieser Abschnitte gibt es keine Vorschau; die Seite zeigt dann wie bisher die bestätigten Spielinformationen. Anzahl Siege, Unentschieden und Niederlagen werden bewusst nicht genannt.

## Verhalten beim Schreiben
- Eine noch gültige Vorschau anderer Herkunft (früher von ChatGPT) bleibt bis zu ihrem Ablauf (72 Stunden) unberührt.
- Eigene Vorschauen werden neu geschrieben, wenn sich der Text oder die Quellen ändern oder wenn sie älter als 12 Stunden sind (der Datendienst blendet Vorschauen nach 72 Stunden aus).
- Jede Vorschau wird mit denselben Regeln wie eine Einsendung geprüft (`validPreview` in `server/previews.mjs`). Ein Fehler bei einer Vorschau lässt alle anderen und den Datenstand unberührt.

## Code
`server/preview-text.mjs` (Text, reine Funktion), `scripts/lib/preview-sync.mjs` (Auswahl und Schreiben), Aufruf in `scripts/cloudflare-update.mjs`. Tests: `tests/preview-sync.test.mjs`.

## Keine Vorschau- und Rückblick-Texte mehr in der App (26. November 2026)

Die KI-Texte waren zu allgemein, die sachlichen Texte aus Daten ebenfalls. Die App zeigt deshalb weder den Abschnitt «Vorschau» (Spielseite vor dem Spiel) noch den Reiter «Rückblick» (Spielseite nach dem Spiel). Abgeschlossene Spiele zeigen nur noch die Statistik ohne Reiterleiste; die alte Adresse `#/spiel/<id>/rueckblick` führt dorthin. Geblieben sind der Aufmacher («Worum geht es?», aus Daten) und die Ausgangslage mit Zahlen.

- **KI-Schicht entfernt (26. November 2026):** `server/preview-ai.mjs`, `server/report-ai.mjs`, `scripts/lib/preview-rewrite.mjs`, `scripts/lib/workers-ai.mjs`, der Workflow «Cloudflare-KI-Stilvergleich» (`cloudflare-ai-compare`) und die Variable `KI_VORSCHAU` gibt es nicht mehr. Ältere Vorschauen und Berichte mit `generator: 'ki'` im Speicher werden von der App nicht angezeigt; Vorschauen mit KI-Kennzeichnung ersetzt der Schreiblauf durch den sachlichen Text.
- Der Datendienst schreibt weiterhin sachliche Vorschauen (`previews/…`) und Berichte (`report`) in den Speicher, die die App nicht mehr liest. Aufräumen wäre ein eigener Schritt (`server/previews.mjs`, `server/preview-text.mjs`, `scripts/lib/preview-sync.mjs`, `scripts/lib/ehf-archive.mjs`).
- Der Saisonrückblick (`#/rueckblick`, «Deine Saison») ist davon nicht betroffen.
