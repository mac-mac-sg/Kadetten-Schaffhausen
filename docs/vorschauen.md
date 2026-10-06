# Match-Vorschauen ohne KI

Die App zeigt auf der Spielseite eines künftigen Spiels die «Match-Vorschau». Sie wird seit dem Umzug auf Cloudflare nicht mehr von ChatGPT geschrieben, sondern aus bestätigten Daten zusammengesetzt (Weg B). Das Verfahren lässt Angaben weg, die fehlen, und rät nichts.

## Wann und für welche Spiele
Jeder Schreiblauf von «Cloudflare-Datenaktualisierung» (nach Zeitplan Schweizer Zeit 06:20, 09:20, 12:20, 15:20, 18:20, 21:20, 22:20 und manuell) erzeugt Vorschauen für die nächsten drei Spiele ohne Ergebnis, je für die Kadetten und den FC St. Gallen. Sie landen unter `previews/<club>/<id>.json` im KV-Speicher.

## Inhalt
1. Spielangaben: «Heim empfängt Gast (Wettbewerb), Wochentag, Datum, Uhrzeit in Spielort.» Ist die Anspielzeit nicht bestätigt (FCSG), steht das so da.
2. Tabelle: Rang, Punkte, Spiele und Torverhältnis beider Teams, nur wenn beide in der Tabelle des Wettbewerbs stehen (Kadetten: QHL und EHL, sobald die Tabelle vorliegt; FCSG: nur Super League).
3. Letztes Direktduell (Datum, Paarung, Ergebnis), nur für QHL-Spiele der Kadetten und nur, wenn die Quelle antwortet.

Ohne mindestens zwei dieser Abschnitte gibt es keine Vorschau; die Seite zeigt dann wie bisher die bestätigten Spielinformationen. Anzahl Siege, Unentschieden und Niederlagen werden bewusst nicht genannt.

## Verhalten beim Schreiben
- Eine noch gültige Vorschau anderer Herkunft (früher von ChatGPT) bleibt bis zu ihrem Ablauf (72 Stunden) unberührt.
- Eigene Vorschauen werden neu geschrieben, wenn sich der Text oder die Quellen ändern oder wenn sie älter als 12 Stunden sind (der Datendienst blendet Vorschauen nach 72 Stunden aus).
- Jede Vorschau wird mit denselben Regeln wie eine Einsendung geprüft (`validPreview` in `server/previews.mjs`). Ein Fehler bei einer Vorschau lässt alle anderen und den Datenstand unberührt.

## Code
`server/preview-text.mjs` (Text, reine Funktion), `scripts/lib/preview-sync.mjs` (Auswahl und Schreiben), Aufruf in `scripts/cloudflare-update.mjs`. Tests: `tests/preview-sync.test.mjs`.

## Stilvergleich mit Cloudflare Workers AI (Vorbereitung für eine KI-Fassung)
Der Text aus Weg B ist sachlich. Für einen lebendigeren Stil soll ein Modell von Cloudflare Workers AI den Grundtext umformulieren; ohne Treffer der Prüfung oder bei einem Fehler bleibt der Grundtext. Workflow «Cloudflare-KI-Stilvergleich» (manuell, nur lesend; Code `scripts/cloudflare-ai-compare.mjs`, `server/preview-ai.mjs`, `scripts/lib/workers-ai.mjs`): nimmt je einen künftigen Kadetten- und FCSG-Termin, zeigt den Grundtext und die Fassung jedes Modells (Standard: `@cf/swiss-ai/apertus-v1.5-8b`, `@cf/mistralai/mistral-small-3.1-24b-instruct`, `@cf/zai-org/glm-4.7-flash`; eigene Liste im Eingabefeld). Geprüft werden: 2 bis 3 Absätze, kein «ß», kein Markup, jede Zahl steht im Grundtext, beide Teamnamen kommen vor. Der API-Token braucht «Workers AI: Edit». Free Plan: 10'000 Neurons pro Tag, danach schlagen Aufrufe fehl (laut Cloudflare-Dokumentation vom 6. Oktober 2026). Die App nennt KI-Texte «KI-Match-Vorschau», Grundtexte «Match-Vorschau» (Feld `generator`: `ki` oder `daten`; der Einbau folgt nach der Modellwahl).
