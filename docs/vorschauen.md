# KI-Vorschauen auf dem Cloudflare-Datendienst

Die Vorschauen schreibt weiterhin ein Auftrag bei ChatGPT. Er schickt sie an den Datendienst; der Datendienst prüft Form und Inhalt und speichert sie unter `previews/<club>/<id>.json` im KV-Speicher. Die App liest sie öffentlich über `GET /api/previews/<club>/<id>`.

Seit der Umstellung (Phase 3, `docs/cloudflare-umzug.md`) liest die App nur noch den Cloudflare-Dienst. Der Auftrag muss deshalb an `https://kadetten-api.mac-mac-sg.workers.dev` schreiben; Vorschauen, die an den bisherigen Sites-Dienst gehen, erreichen die App nicht mehr.

## Einmalige Einrichtung (Eigentümer)

1. **Schlüssel erzeugen.** Ein langer Zufallswert, z. B. `openssl rand -hex 32` im Terminal. Nicht in Chats, Issues oder Commits schreiben.
2. **GitHub-Secret anlegen:** Repository → Settings → Secrets and variables → Actions → New repository secret, Name `KADETTEN_UPDATE_KEY`, Wert = der Schlüssel.
3. **Datendienst neu bereitstellen:** Actions → «Cloudflare-Datendienst bereitstellen» → Run workflow. Dabei wird nur der SHA-256-Digest des Schlüssels beim Worker hinterlegt (Secret `KADETTEN_UPDATE_KEY_SHA256`); der Schlüssel selbst verlässt GitHub nicht.
4. **Schreibweg prüfen:** Actions → «Cloudflare-Schreibweg prüfen» → Run workflow. Grün heisst: Der Dienst nimmt den Schlüssel an. Rot mit 403 bei «mit Schlüssel»: Schritt 3 wiederholen.
5. **Schlüssel im ChatGPT-Auftrag hinterlegen** (dort, wo der Auftrag seine Geheimnisse speichert) und die Adresse des Dienstes auf `https://kadetten-api.mac-mac-sg.workers.dev` ändern. Den bisherigen Bezug des Schlüssels aus dem Sites-Konto (`docs/legacy-notes.md`) ersetzen.

## Vertrag für den Auftrag

`POST https://kadetten-api.mac-mac-sg.workers.dev/api/previews`, Header `Content-Type: application/json` und `X-Kadetten-Update-Key: <Schlüssel>`. Kein `Origin`-Header zu einer anderen Adresse senden.

```json
{"previews": [{
  "club": "kadetten",
  "id": "<Spiel-ID aus /api/data bzw. /api/fcsg/data>",
  "fixtureKey": "<siehe unten>",
  "headline": "3 bis 160 Zeichen",
  "paragraphs": ["30 bis 1800 Zeichen", "2 bis 3 Absätze"],
  "sources": [{"label": "2 bis 100 Zeichen", "url": "https://…"}],
  "generatedAt": "2026-10-06T10:00:00.000Z"
}]}
```

- Höchstens 12 Vorschauen je Sendung, Sendung höchstens 100 000 Zeichen. `club` ist `kadetten` oder `fcsg`.
- Kein `<`, `>` oder Steuerzeichen in Texten. 1 bis 6 Quellen mit `https`-Adresse.
- `fixtureKey` = `JSON.stringify([String(id), home, away, date, time || '', league, venue || ''])` des Spiels, so wie es `GET /api/data` (Kadetten) bzw. `GET /api/fcsg/data` (FCSG) liefert. Ändert sich eines dieser Felder, ist die Vorschau veraltet und wird ausgeblendet; `409` heisst: Spiel hat sich geändert oder ist beendet.
- Nur künftige, noch nicht gespielte Spiele werden angenommen. Eine Vorschau wird 72 Stunden nach `generatedAt` ausgeblendet.
- Antworten: `200` gespeichert, `400` ungültiger Inhalt, `403` Schlüssel fehlt oder passt nicht, `409` Spiel veraltet, `413` zu gross, `503` Speicher vorübergehend nicht erreichbar (später erneut senden).

## Grenzen

- Der Worker auf dem Free Plan hat 10 ms CPU je Anfrage. Eine Sendung mit wenigen Vorschauen sollte reichen; gemessen ist das noch nicht. Antwortet der Dienst bei einer grossen Sendung mit `503`, die Sendung in kleinere Teile aufteilen.
- Der Schreibweg wird mit `npm test` (`tests/previews-cloudflare.test.mjs`) gegen den echten Worker mit KV-Speicher geprüft und mit dem Workflow «Cloudflare-Schreibweg prüfen» gegen den veröffentlichten Dienst.
