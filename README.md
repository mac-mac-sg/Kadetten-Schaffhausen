# Kadetten Schaffhausen

Mobile Web-App (PWA) mit News, Spielplan, Kalender, Tabelle, Saisonstatistiken und Kader.

Öffentliche App: https://mac-mac-sg.github.io/Kadetten-Schaffhausen/

## Lokal starten

Voraussetzung: Node.js 22.12 oder neuer.

```sh
npm ci
npm run dev
```

Danach http://127.0.0.1:3000 öffnen. Die lokale Vorschau nutzt die mitgelieferten Saison-Daten und ist schreibgeschützt. Live- und historische Abfragen benötigen Internet und können bei gesperrten Quellen ausfallen. Vollständige Artikel liegen im produktiven Objektspeicher und sind nicht Teil des Repositorys. Ein lokaler API-Aufruf für einen nicht importierten Artikel liefert daher 404.

```sh
npm run verify   # alle Prüfungen wie in GitHub Actions
npm run build    # bisheriger Sites-Build (nur noch für den alten Dienst)
```

Einzelschritte: `npm run check`, `npm test`, `npm run build:pages`, `node scripts/check-pages.mjs`.

`src/client/` ist die editierbare Oberfläche. `server/` enthält die API und Quellenparser. `dist/` ist ausschliesslich erzeugtes Build-Ergebnis. Nicht direkt in `dist/` entwickeln.

## Änderungen und Veröffentlichung

1. Branch für die Änderung anlegen.
2. Änderung entwickeln, prüfen und in den Branch pushen.
3. Pull Request nach `main` erstellen; GitHub Actions führt Syntaxprüfung, Tests und Build aus.
4. Änderung überprüfen und übernehmen.

**Aktueller Stand (6. Oktober 2026):** GitHub ist die Codebasis. Die Oberfläche wird per GitHub Actions auf GitHub Pages veröffentlicht, nach erfolgreichen Prüfungen auf main. Der Datendienst läuft als Cloudflare Worker (`kadetten-api`, Speicher Workers KV); Daten, Artikel, Matchprogramme und Match-Vorschauen (KI von Cloudflare Workers AI mit sachlichem Rückfall) aktualisiert ein Workflow in GitHub Actions nach Zeitplan. Der frühere ChatGPT-Sites-Dienst läuft unverändert weiter, wird von der App aber nicht mehr gelesen und bis zu einem ausdrücklichen Auftrag nicht abgeschaltet. Das Android-Widget liest noch von dort. Die Pages-App liest ohne Zugangsschlüssel und ohne manuellen Aktualisieren-Button. Details: [Betrieb](docs/betrieb.md), [Umzug auf Cloudflare](docs/cloudflare-umzug.md), [Pages-Betrieb](docs/pages.md). Branchschutz ist noch nicht eingerichtet.

Weitere Informationen: [Architektur](docs/architecture.md), [Migrationsetappen](docs/migration.md), [GitHub Pages](docs/pages.md), [Arbeitsregeln für Menschen und KI-Agenten](AGENTS.md), [Einrichtung für Claude](CLAUDE.md), [Betrieb ausserhalb des Repositorys](docs/betrieb.md), [Quellen und frühere Implementierungsnotizen](docs/legacy-notes.md).

## Daten und Rechte

Die App ist ein unabhängiges Fan-Projekt. Vereinslogos, Fotos und Schriften behalten die Rechte und Lizenzen ihrer jeweiligen Urheber. Eine Veröffentlichung im Repository bedeutet keine freie Lizenzierung dieser Assets. Quellenangaben stehen in der App und den Implementierungsnotizen. Laufende Newsinhalte, vollständige Artikel und aktuelle Statistiken gehören in den Objektspeicher, nicht in regelmässige Git-Commits. Zugangsschlüssel sind niemals Teil des Codes.
