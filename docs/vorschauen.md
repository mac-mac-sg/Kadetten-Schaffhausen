# Match-Vorschauen ohne KI

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

## KI-Fassung mit Cloudflare Workers AI
Dem Eigentümer ist der sachliche Text zu nüchtern. Deshalb formuliert ein Modell von Cloudflare Workers AI (Standard `@cf/mistralai/mistral-small-3.1-24b-instruct`, Umgebungsvariable `KI_MODELL`) den sachlichen Grundtext lebendiger um. Der Aufruf geschieht im Schreiblauf von «Cloudflare-Datenaktualisierung» (`scripts/lib/preview-rewrite.mjs`, `scripts/lib/preview-sync.mjs`) mit dem vorhandenen API-Token (Berechtigung «Workers AI: Edit»), nicht im Worker.

**Faktenliste für die KI:** Die KI bekommt nicht den sachlichen Text, sondern eine eindeutige Liste (`facts` aus `buildPreview`): Heim- und Gastteam, Termin und Ort, je Team Rang, Punkte, Spiele, erzielte und kassierte Tore mit Tordifferenz samt Vorzeichen, Direktduelle mit Sieger, letzte Spiele aus Sicht des Teams («03.10.2026 bei SC Brühl (auswärts): 3:3 Unentschieden»). Ziel: Das Modell muss nichts umdrehen oder herleiten (im Stilvergleich vom 6. Oktober 2026 las es «16:19» als «mehr Tore erzielt als kassiert»). Die Liste wird nicht gespeichert; ihr Fingerabdruck bestimmt mit, wann neu formuliert wird.

**Keine inhaltliche Prüfung (Entscheid des Eigentümers, 6. Oktober 2026):** Der Text der KI wird so übernommen, wie sie ihn liefert. Dabei können Angaben vorkommen, die nicht in den Fakten stehen (im Stilvergleich erfand das Modell zum Beispiel einen Trainernamen und Aussagen zu Klassenerhalt und Abstieg). Deshalb nennt die App solche Texte «KI-Match-Vorschau» und weist darauf hin, Angaben mit den Quellen zu prüfen. Der Prompt (`server/preview-ai.mjs`) erlaubt Aussagen über frühere Spiele nur, soweit die Fakten sie nennen, und erklärt die Fakten für vollständig und verbietet Personen, Spitznamen und Regionsbezeichnungen, Zählungen und Einordnungen («erstes Heimspiel», «erstes Duell»), Aussagen zu Form, Saisonzielen und Prognosen zum Ausgang sowie ein Direktduell ohne Daten in den Fakten. Erlaubt sind ein bis zwei allgemeine Wertungen («mit Spannung erwartet»). Er verlangt Titelzeile, Leerzeile und zwei bis drei Absätze, einen anschaulichen Einstieg und Zahlen in Sätzen. Liefert das Modell keine Titelzeile (erster Block ist zu lang für einen Titel), gilt der bisherige Titel «Heim gegen Gast», und ein einzelner Block wird an einer Satzgrenze in zwei Absätze geteilt (`parseAiText`). Zusätzlich verbietet er relative Zeitangaben («vor einer Woche»), Aussagen über weitere Spiele und den Saisonverlauf und verlangt vollständige Teamnamen. Der Prompt ist keine Garantie.

**Technische Regeln und Rückfall:** Es gelten nur die Regeln des Datendienstes (`validPreview`: 2 bis 3 Absätze von 30 bis 1800 Zeichen, Titel 3 bis 160 Zeichen, kein `<` oder `>`); mehr als drei Absätze werden dem dritten angehängt. Der sachliche Text bleibt Grundlage und Rückfall, wenn die KI ausfällt (nach dem ersten Ausfall wird sie im selben Lauf nicht weiter angefragt), die Antwort nicht in Titel und Absätze zerlegbar ist oder die Regeln nicht erfüllt, oder wenn die KI abgeschaltet ist (Repository-Variable `KI_VORSCHAU` = `aus`, Einstellungen → Secrets and variables → Actions → Variables). Die frühere strenge Prüfung (`checkAi` in `server/preview-ai.mjs`) wird nicht mehr in der Erzeugung verwendet; sie dient nur noch dem Stilvergleich als Hinweis.

**Wiederverwendung:** Ein Fingerabdruck der Fakten (`baseHash`) wird mit der Vorschau gespeichert. Solange er gleich bleibt, wird derselbe KI-Text verwendet (nur der Zeitstempel wird nach 12 Stunden erneuert, damit die Vorschau sichtbar bleibt); ändern sich Tabelle, Termin oder Duell, wird neu formuliert. Ein sachlicher Rückfalltext wird bei jedem Lauf erneut mit der KI versucht.

**Kennzeichnung in der App:** `generator: 'ki'` → «KI-Match-Vorschau» mit Hinweis; `generator: 'daten'` → «Match-Vorschau»; ältere Einsendungen ohne Feld (ChatGPT) → «KI-Match-Vorschau».

**Kosten:** Free Plan 10'000 Neurons pro Tag, danach schlagen Aufrufe fehl und es bleibt beim sachlichen Text. Gemessen im Stilvergleich vom 6. Oktober 2026: rund 350 Tokens Eingabe und 200 Tokens Ausgabe je Vorschau, rechnerisch etwa 22 Neurons.

**Stilvergleich:** Der Workflow «Cloudflare-KI-Stilvergleich» (`scripts/cloudflare-ai-compare.mjs`, nur lesend) zeigt Grundtext und Modelltext mit Prüfergebnis, auch für andere Modelle (Eingabefeld; Standard: Mistral Small 3.1, Llama 3.3 70B `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, GPT-OSS 120B `@cf/openai/gpt-oss-120b`) und zeigt die Faktenliste, die die KI erhält. Stand 6. Oktober 2026: Apertus (`@cf/swiss-ai/apertus-v1.5-8b`) ist für das Konto nicht freigeschaltet (HTTP 403, Code 5018), GLM 4.7 Flash (`@cf/zai-org/glm-4.7-flash`) lieferte als Denkmodell eine leere Antwort.
