# Wissensbereich

Stand: 9. November 2026. Gilt für die Kadetten App unter `/v2/`. Entscheid des Eigentümers: Die Regeln wandern aus «Ich» in einen eigenen Bereich «Wissen», der auch typische Aufstellungen und Spielzüge zeigt. Das Konzept lag als Boards «Wissen · Konzept» und «Wissen · Skizzen» im Design-Canvas.

## Aufbau

- **Eintritt:** Buch-Symbol im Titelband, neben Wappen und «Ich». Kein fünfter Reiter. Die Seite hat keine markierte Reiterleiste (wie «Ich»).
- **Adressen:** `#/wissen` (Regeln), `#/wissen/aufstellungen`, `#/wissen/spielzuege`, je Artikel `#/wissen/<kapitel>/<artikel>`, bei Spielzügen mit Schritt `#/wissen/spielzuege/<artikel>/<1–3>`. Unbekannte Kapitel führen zu den Regeln, unbekannte Artikel zur Kapitelübersicht, ungültige Schritte auf Schritt 1.
- **Aufstellungen als Wahlseite:** Art (Abwehr, Angriff, Positionen) und Formation sind Wahlknöpfe (Links, `#/wissen/aufstellungen/<artikel>`). Feldbild, Idee, Stärke und Schwäche erscheinen an derselben Stelle. Darunter steht «Im Vergleich»: alle Formationen der Art als Raster mit Mini-Feldbild, Stärke und Schwäche in einer Zeile; die gewählte ist umrandet.
- **Kapitel Regeln:** Gruppen Spiel, Strafen, Statistik-Begriffe (20 Artikel). **Aufstellungen:** Positionen (7), Abwehrformationen (5), Angriffsformen (3), je mit Feldbild sowie Idee, Stärke, Schwäche. **Spielzüge:** acht Grundmuster in drei Schritten.
- **Verknüpfungen:** Jedes «?» in der App öffnet das Kurzblatt (`rules.js`) mit «Mehr dazu» zum Artikel. Der Spielbericht verweist bei «Woher die Würfe kamen» auf «Wurfzonen». Das Spielerprofil verweist auf die Position (`positionArticle`). «Ich» enthält keine Regelliste mehr.

## Technik

- Alle Inhalte stehen in `src/kadetten/js/wissen/inhalt.js` (eine Quelle für Seiten, «?»-Blätter und Feldbilder). `rules.js` leitet die Blätter daraus ab.
- Feldbilder (`wissen/feld.js`) sind SVG aus Datensätzen: Spielerpositionen je Schritt, Laufwege, Ballweg. Koordinaten in einem Rahmen von 220 × 150, Tor oben in der Mitte. Keine Bilder, keine `style`-Attribute, Farben über Klassen und Tokens (Angreifer Akzent, Verteidiger Graphit, jeweils mit Beschriftung).
- Schritte sind Links (Zurück, Weiter, Nummern), die Seite behält beim Wechsel ihre Scrollposition. «Abspielen» wechselt alle 2,4 Sekunden den Schritt und fehlt bei «Bewegung reduzieren». Jeder Schritt hat eine Textfassung, das Bild hat eine Beschreibung für Screenreader.
- Alles liegt in der App: funktioniert offline, braucht keinen Datendienst, speichert nichts.

## Inhalte pflegen

- Neue Regel: Eintrag in `REGELN` (`R(id, gruppe, titel, kurzfassung, absätze, {app, related})`). Kurzfassung ist zugleich das «?»-Blatt.
- Neue Formation oder Position: `FORMATION(...)` bzw. `POSITIONEN`. Spielzug: `S(...)` mit Grundaufstellung, drei Schritten (`at`, `ball`, `moves`) und Verteidigern.
- `tests/app-wissen.test.mjs` prüft eindeutige Kennungen, Verweise, Gruppen, dass alle Spieler im Feld liegen und der Ballführende existiert.

## Offen

- Die Texte sind in eigenen Worten nach den IHF-Spielregeln geschrieben, aber nicht von einer Schiedsrichter- oder Trainerperson geprüft. Vor allem Angriffsformen (Benennung), Verlängerungsregeln im Cup und Angaben zu Linkshändern auf den Positionen sollten gelesen werden.
- Keine vereinsspezifischen Taktiken: Die Bilder zeigen Grundformen, nicht, was die Kadetten spielen.
