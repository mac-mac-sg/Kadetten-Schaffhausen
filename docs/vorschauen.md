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

## KI-Fassung mit Cloudflare Workers AI
Dem Eigentümer ist der sachliche Text zu nüchtern. Deshalb formuliert ein Modell von Cloudflare Workers AI (Standard `@cf/mistralai/mistral-small-3.1-24b-instruct`, Umgebungsvariable `KI_MODELL`) den sachlichen Grundtext lebendiger um. Der Aufruf geschieht im Schreiblauf von «Cloudflare-Datenaktualisierung» (`scripts/lib/preview-rewrite.mjs`, `scripts/lib/preview-sync.mjs`) mit dem vorhandenen API-Token (Berechtigung «Workers AI: Edit»), nicht im Worker.

**Rückfall:** Der sachliche Text ist immer die Grundlage und der Rückfall. Er bleibt stehen, wenn die KI nicht erreichbar ist (nach dem ersten Ausfall wird sie im selben Lauf nicht weiter angefragt), wenn die Antwort die Prüfung nicht besteht oder wenn die KI abgeschaltet ist (Repository-Variable `KI_VORSCHAU` = `aus`, Einstellungen → Secrets and variables → Actions → Variables).

**Prüfung der KI-Antwort** (`server/preview-ai.mjs`, `checkAi`): 2 bis 3 Absätze, kein «ß», kein Markup, jede Zahl steht im Grundtext, beide Teamnamen kommen vor. Dazu die strenge Prüfung auf Erfundenes: Wörter wie Trainer, Verletzung, Rekord, Abstieg, Klassenerhalt, Meister, Bilanz, Serie (nur zulässig, wenn sie im Grundtext stehen), Personen- oder Eigennamen (zwei unbekannte Grossgeschriebene hintereinander mitten im Satz) und «Tabellenführer» nur für das Team auf Rang 1. Der Prompt verbietet Personen, Form, Prognosen und Saisonziele ausdrücklich. Grenze: Die Prüfung findet nicht jeden Fehler (zum Beispiel holprige Grammatik oder unscharfe Wertungen); deshalb bleibt die Kennzeichnung «KI-Match-Vorschau» mit dem Hinweis, Angaben mit den Quellen zu prüfen.

**Wiederverwendung:** Ein Fingerabdruck der Fakten (`baseHash`) wird mit der Vorschau gespeichert. Solange er gleich bleibt, wird derselbe KI-Text verwendet (nur der Zeitstempel wird nach 12 Stunden erneuert, damit die Vorschau sichtbar bleibt); ändern sich Tabelle, Termin oder Duell, wird neu formuliert. Ein sachlicher Rückfalltext wird bei jedem Lauf erneut mit der KI versucht.

**Kennzeichnung in der App:** `generator: 'ki'` → «KI-Match-Vorschau» mit Hinweis; `generator: 'daten'` → «Match-Vorschau»; ältere Einsendungen ohne Feld (ChatGPT) → «KI-Match-Vorschau».

**Kosten:** Free Plan 10'000 Neurons pro Tag, danach schlagen Aufrufe fehl und es bleibt beim sachlichen Text. Gemessen im Stilvergleich vom 6. Oktober 2026: rund 350 Tokens Eingabe und 200 Tokens Ausgabe je Vorschau, rechnerisch etwa 22 Neurons.

**Stilvergleich:** Der Workflow «Cloudflare-KI-Stilvergleich» (`scripts/cloudflare-ai-compare.mjs`, nur lesend) zeigt Grundtext und Modelltext mit Prüfergebnis, auch für andere Modelle (Eingabefeld). Stand 6. Oktober 2026: Apertus (`@cf/swiss-ai/apertus-v1.5-8b`) ist für das Konto nicht freigeschaltet (HTTP 403, Code 5018), GLM 4.7 Flash (`@cf/zai-org/glm-4.7-flash`) lieferte als Denkmodell eine leere Antwort.
