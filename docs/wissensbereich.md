# Wissensbereich

Stand: 9. November 2026. Gilt für die Kadetten App unter `/v2/`. Entscheid des Eigentümers: Die Regeln wandern aus «Ich» in einen eigenen Bereich «Wissen», der auch typische Aufstellungen und Spielzüge zeigt. Das Konzept lag als Boards «Wissen · Konzept» und «Wissen · Skizzen» im Design-Canvas.

## Aufbau

- **Eintritt:** Buch-Symbol im Titelband, neben Wappen und «Ich». Kein fünfter Reiter. Die Seite hat keine markierte Reiterleiste (wie «Ich»).
- **Adressen:** `#/wissen` (Regeln), `#/wissen/aufstellungen`, `#/wissen/spielzuege`, je Artikel `#/wissen/<kapitel>/<artikel>`, bei Spielzügen mit Schritt `#/wissen/spielzuege/<artikel>/<1–3>`. Unbekannte Kapitel führen zu den Regeln, unbekannte Artikel zur Kapitelübersicht, ungültige Schritte auf Schritt 1.
- **Aufstellungen und Spielzüge als Wahlseiten:** Art (Abwehr, Angriff, Positionen) und Formation sind Wahlknöpfe (Links, `#/wissen/aufstellungen/<artikel>`). Feldbild, Idee, Stärke und Schwäche erscheinen an derselben Stelle. Darunter steht «Im Vergleich»: alle Formationen der Art als Raster mit Mini-Feldbild, Stärke und Schwäche in einer Zeile; die gewählte ist umrandet. Spielzüge funktionieren gleich: Art (Rückraum, Kreisläufer, Sonderlagen), Spielzug, darunter Feldbild mit Schritten, Schritttext, Idee und alle Schritte; im Vergleich zeigt das Mini-Bild den ersten Schritt mit seinen Laufwegen.
- **Kapitel Regeln:** Gruppen Spiel, Strafen, Statistik-Begriffe (20 Artikel). **Aufstellungen:** Positionen (7), Abwehrformationen (5), Angriffsformen (3), je mit Feldbild sowie Idee, Stärke, Schwäche. **Spielzüge:** acht Grundmuster in drei Schritten, geordnet nach Rückraum, Kreisläufer und Sonderlagen.
- **Verknüpfungen:** Jedes «?» in der App öffnet das Kurzblatt (`rules.js`) mit «Mehr dazu» zum Artikel. Der Spielbericht verweist bei «Woher die Würfe kamen» auf «Wurfzonen». Das Spielerprofil verweist auf die Position (`positionArticle`). «Ich» enthält keine Regelliste mehr.

## Technik

- Alle Inhalte stehen in `src/kadetten/js/wissen/inhalt.js` (eine Quelle für Seiten, «?»-Blätter und Feldbilder). `rules.js` leitet die Blätter daraus ab.
- Feldbilder (`wissen/feld.js`) sind SVG aus Datensätzen: Spielerpositionen je Schritt, Laufwege, Ballweg. Koordinaten in einem Rahmen von 220 × 150, Tor oben in der Mitte. Keine Bilder, keine `style`-Attribute, Farben über Klassen und Tokens (Angreifer Akzent, Verteidiger Graphit, jeweils mit Beschriftung). Spieler sind Figuren von oben (Schultern, Blickrichtung, Nummer, Schatten), der Boden hat feine Streifen, der Torraum ist getönt, das Tor hat ein Netz.
- **Bewegung der Spielzüge** (`wissen/bewegung.js`, Draufsicht): Aus den drei Schritten der Daten wird eine Zeitleiste von 0 bis 6 Sekunden (Marken bei 0, 2 und 4 s). `frame(zug, t)` berechnet rein rechnerisch Orte (sanfte Bögen, Beschleunigung und Abbremsen), Blickrichtung, zwei Nachbilder, den Ball (in der Hand, im Bogen, im Tor; mehrere Pässe nacheinander) und einen Hinweis. Verteidiger gleiten mit dem Ball zur Seite, dazu kommen Eigenbewegungen je Spielzug (`react` in `inhalt.js`). Hinweise (`hints`) nennen kurz, warum der Zug funktioniert. Die Verteidiger-Bewegungen sind Annahmen und gehören fachlich geprüft.
- **Wiedergabe** (`wissen/steuerung.js`): Regler, Abspielen/Pause, Tempo (1× oder 0,5×), Neu starten, Marken 1 bis 3 und Zurück/Weiter als Links. Der Zeitgeber läuft nur beim Abspielen, hält am Ende, bei versteckter Seite und ausserhalb des sichtbaren Bildes an. Die Funktion `updateFeld` setzt nur Attribute (`transform` usw.) im vorhandenen SVG. Bei «Bewegung reduzieren» entfallen Abspielen und Tempo, der Regler springt in Schritten von 2 Sekunden. Der Zustand (`ui.anim`) bleibt beim Neuzeichnen erhalten.
- Schritte sind Links (Zurück, Weiter, Marken), die Seite behält beim Wechsel ihre Scrollposition und das Bild steht am Anfang des Schritts. Jeder Schritt hat eine Textfassung, das Bild hat eine Beschreibung für Screenreader, der Regler einen Textwert («Schritt 2 von 3, 0:02 von 0:06»).
- Mehrgewicht der Bewegung: etwa 10 KB in `app.js` (158 auf 169 KB, minifiziert).
- Alles liegt in der App: funktioniert offline, braucht keinen Datendienst, speichert nichts.

## Inhalte pflegen

- Neue Regel: Eintrag in `REGELN` (`R(id, gruppe, titel, kurzfassung, absätze, {app, related})`). Kurzfassung ist zugleich das «?»-Blatt.
- Neue Formation oder Position: `FORMATION(...)` bzw. `POSITIONEN`. Spielzug: `S(...)` mit Grundaufstellung, drei Schritten (`at`, `ball`, `moves`) und Verteidigern.
- `tests/app-wissen.test.mjs` prüft eindeutige Kennungen, Verweise, Gruppen, dass alle Spieler im Feld liegen und der Ballführende existiert.

## Offen

- Die Texte sind in eigenen Worten nach den IHF-Spielregeln geschrieben, aber nicht von einer Schiedsrichter- oder Trainerperson geprüft. Vor allem Angriffsformen (Benennung), Verlängerungsregeln im Cup und Angaben zu Linkshändern auf den Positionen sollten gelesen werden.
- Keine vereinsspezifischen Taktiken: Die Bilder zeigen Grundformen, nicht, was die Kadetten spielen.

- Noch nicht umgesetzt (Stufen C und D des Animationskonzepts): Abwehrformationen mit Ball, Kurzschleifen in den Vergleichskarten, Regel-Animationen, Schrägansicht.
