# Archiv: Matchday (V1)

Matchday war die erste Version der App mit Kadetten Schaffhausen, FC St. Gallen und St. Otmar. Seit dem 13. November 2026 ist sie archiviert (Entscheid des Eigentümers): Sie wird nicht mehr gebaut und nicht mehr veröffentlicht. Unter derselben Adresse läuft jetzt die Kadetten-App (`src/kadetten`).

## Letzter veröffentlichter Stand

- Commit `8b2f505c807c20ee5ee247e62eeab45089c48e65` auf `main` (Merge von PR #345). In diesem Stand lag Matchday unter `/` und die Kadetten-App unter `/v2/`.
- Vorgesehenes Git-Tag: `matchday-final` auf diesem Commit. Es konnte aus der Arbeitsumgebung nicht gepusht werden; anlegen mit `git tag -a matchday-final 8b2f505 -m "Letzter Stand mit Matchday"` und `git push origin matchday-final` oder in GitHub unter «Releases».

## Inhalt

| Ordner oder Datei | Inhalt |
|---|---|
| `client/` | Quellen der Oberfläche (früher `src/client/`) |
| `build.mjs` | Build von Matchday nach `dist/client` (früher `scripts/build.mjs`, mit dem Server-Bündel für den alten Sites-Dienst) |
| `dev.mjs` | Lokale Vorschau auf http://127.0.0.1:3000 (früher `scripts/dev.mjs`) |
| `check-v1-frozen.mjs`, `v1-pages.sha256` | Prüfung, dass die veröffentlichte Ausgabe bytegleich blieb |
| `scripts/` | Browser-Prüfungen von Matchday (Playwright) |
| `tests/` | Tests, die nur Matchday betrafen |
| `docs/pages.md` | Beschreibung der Oberfläche von Matchday |

## Wieder starten

```sh
npm ci
node archive/matchday/dev.mjs          # lokale Vorschau
node archive/matchday/build.mjs        # Build nach dist/client
npm run test:archiv                    # archivierte Tests
```

Wieder veröffentlichen hiesse: `scripts/build-pages.mjs` auf diesen Build umstellen. Vorher klären, was dann mit der Kadetten-App unter `/` geschieht.

## Datendienst

FC St. Gallen und St. Otmar werden seit der Archivierung nicht mehr aktualisiert (keine Daten, Vorschauen, Matchberichte oder Rückblicke, kein Push). Die Endpunkte `/api/fcsg/*` und `/api/otmar/*` sowie `server/fcsg.mjs` und `server/otmar.mjs` bleiben bestehen und liefern den zuletzt gespeicherten Stand; Live-Endpunkte fragen die Quellen weiterhin bei Bedarf ab.
