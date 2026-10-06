# Anleitung für Entwickler und KI-Agenten

Diese Datei ist die einzige Quelle für Arbeitsregeln. Sie gilt für jeden Agenten und jeden Menschen (Claude, ChatGPT/Codex, Copilot, Cursor und andere). Werkzeugspezifische Dateien (`CLAUDE.md`) verweisen hierher und enthalten nur Einrichtungshinweise.

## Zuerst lesen
README.md, docs/architecture.md, docs/pages.md und docs/betrieb.md. Bei Widersprüchen haben README.md und die aktuelle Implementierung Vorrang vor docs/legacy-notes.md.

## Einrichten und prüfen
Voraussetzung: Node.js 22.12 oder neuer (`.node-version`). Ein Devcontainer (`.devcontainer/`) richtet das für Codespaces und ähnliche Umgebungen ein.

```sh
npm ci          # Abhängigkeiten
npm run dev     # lokale, schreibgeschützte Vorschau auf http://127.0.0.1:3000
npm run verify  # alle Prüfungen wie in GitHub Actions: check, test, build:pages, check-pages
```

`npm run verify` muss vor jedem Push grün sein. Zusätzlich gilt `npm run build` (Sites-Build), wenn `server/` geändert wurde.

## Arbeitsablauf
1. Aktuellen Stand von `origin/main` holen; Änderungen anderer erhalten.
2. Eigener Branch pro Änderung. Nur `src/client/` (Oberfläche), `server/` (Datendienst), `tests/`, `scripts/`, `docs/` und `.github/` bearbeiten. `dist/` ist erzeugt und wird nicht committet.
3. Prüfen (`npm run verify`), committen, pushen, Pull Request nach `main` erstellen (Vorlage: `.github/pull_request_template.md`). GitHub Actions prüft den PR.
4. Merge auf `main` veröffentlicht die Oberfläche automatisch auf GitHub Pages. Direkte Pushes auf `main` nur auf ausdrücklichen Auftrag, nach allen Prüfungen, niemals mit Force.
5. Kleine, einzeln prüfbare PRs. Verhalten ändern und Umbauen nicht mischen.

Definition of Done: `npm run verify` grün, neues Verhalten durch einen Test abgedeckt (der ohne die Änderung fehlschlägt), PR beschreibt Problem, Verhalten, Prüfung, Veröffentlichung und Ausgelassenes.

## Regeln für die App
- Sprache der App: Deutsch mit Schweizer Rechtschreibung. Mobile Nutzung zuerst; bestehendes orange/dunkles Design erhalten.
- Fehlende Werte nicht erfinden und nicht als null Tore interpretieren. Fehlgeschlagene Datenquellen müssen ihren letzten gültigen Stand behalten.
- Texte aus dem Datendienst kommen HTML-maskiert an; `sanitiseSnapshot` (js/logic.js) normalisiert sie beim Einlesen. Neue Datenfelder, die als HTML ausgegeben werden, dort aufnehmen.
- Neue Client-Dateien in `index.html`, `sw.js` (SHELL) und `scripts/build.mjs` (shellFiles) eintragen; `tests/shell.test.mjs` prüft das.
- Keine Tests auf Dateien in /tmp oder persönliche lokale Pfade aufbauen.
- GitHub Actions nur mit Commit-SHA einbinden (`tests/hardening.test.mjs` prüft das).
- Behauptungen belegen: nicht „geprüft" schreiben, ohne den Befehl oder die Messung zu nennen. Nicht Geprüftes ausdrücklich als solches kennzeichnen.

## Sicherheit und Grenzen
- Öffentliche Leser dürfen niemals schreiben. Plattform-Identitätsheader sind nur hinter dem Sites-Gateway vertrauenswürdig. Bei einem Hosting-Wechsel zuerst Authentifizierung ersetzen; Header allein sind dort kein Login.
- Keine Tokens, persönlichen Servicezugänge oder `.env`-Dateien committen oder in Chats, Issues oder PRs schreiben. Laufende Daten und Artikel bleiben im Objektspeicher, nicht in Git.
- `server/` läuft im getrennten Sites-Datendienst. Ein Frontend-Merge aktualisiert ihn nicht. Bestehende Datenautomation und Backend-Speicher nicht ohne entsprechenden Auftrag umstellen oder abschalten.
- Keine zusätzliche Testumgebung einrichten, ausser der Eigentümer beauftragt es ausdrücklich.
- Kann ein Agent nicht schreiben oder pushen, die fehlende Berechtigung konkret melden. Nie behaupten, etwas sei gepusht, gemergt oder veröffentlicht, ohne es geprüft zu haben (Commit, PR und Deploy-Lauf verlinken).

## Browser- und Barrierefreiheitsprüfung
Für Änderungen an der Oberfläche zusätzlich im Browser prüfen (Handy-Breite 390 px und Desktop): keine Skriptfehler, kein horizontaler Überlauf, eine `<h1>` pro Seite, `axe-core` ohne Verstösse. `npm run dev` startet die lokale Vorschau. Externe Bilder und Quellen sind in manchen Agentenumgebungen gesperrt; das ist dann keine App-Störung.

## Einrichtung pro Werkzeug
Der Agent braucht nur Lesezugriff auf das Repository und die Möglichkeit, Branches zu pushen und PRs zu erstellen. Die Freigabe erfolgt im eigenen Konto des Eigentümers; keine separate Person als Collaborator einladen.

- **Claude:** siehe `CLAUDE.md`.
- **ChatGPT / Codex:** Repository mit der GitHub-Anbindung verbinden. Setup-Befehl der Umgebung: `npm ci`. Prüfbefehl: `npm run verify`. Codex liest diese Datei automatisch.
- **Andere (Copilot, Cursor, …):** Repository öffnen bzw. klonen, `npm ci`, diese Datei als Anweisung verwenden.

Eine Schreibfreigabe gilt erst als belegt, wenn der jeweilige Agent einen eigenen Branch mit einer kleinen, sinnvollen Änderung erfolgreich gepusht hat.
