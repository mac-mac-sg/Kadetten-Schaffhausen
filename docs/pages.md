# GitHub Pages

Öffentliche App: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/

Seit dem 13. November 2026 liefert GitHub Pages nur noch die Kadetten-App aus `src/kadetten` aus, an zwei Orten mit demselben Stand:

| Pfad | Zweck |
|---|---|
| `/` | Gültige App. Gleiche Manifest-ID (`./`) und gleicher Scope wie die frühere App Matchday: Auf Geräten mit installiertem Matchday wird daraus die Kadetten-App. Android übernimmt Name und Symbol nach einiger Zeit, iOS behält Name und Symbol der Installation, zeigt aber die neue App. |
| `/v2/` | Kopie für bereits dort installierte Apps und ihre Push-Abos. Später auf `/` umleiten (eigener Auftrag). |

`npm run build:pages` (gleich `npm run build`) baut beide Orte nach `dist/client`; `scripts/check-preview.mjs` und `scripts/check-pages.mjs` prüfen Pfade, Manifest, Offline-Hülle und dass kein Rest von Matchday ausgeliefert wird. Der Workflow `.github/workflows/deploy.yml` veröffentlicht nach jedem Merge auf `main`.

## Übergang von Matchday

- Der Service Worker unter `/` hat dieselbe Adresse wie der von Matchday und ersetzt ihn beim nächsten Öffnen. Dabei löscht er die Caches von Matchday (`kadetten-offline-*`, `kadetten-articles-v2-*`). Im Browser geprüft: Beim ersten Öffnen nach der Umstellung erscheint noch einmal Matchday aus dem Speicher, ab dem zweiten Öffnen die Kadetten-App.
- Lieblingsspieler, Tipps und weitere Einstellungen liegen im Speicher der Domain und gelten an beiden Orten.
- Alte Adressen von Matchday führen zur passenden Ansicht: `#match/<id>` zum Spiel, `#season/games` zum Spielplan, `#season/table` zur Tabelle, `#season/squad` und `#player/<Name>` zum Kader, `#player/<Nummer>` zum Spieler, alles andere zur Titelseite.

Matchday selbst liegt mit Quellen, Build und Tests in `archive/matchday` (siehe dortiges README).
