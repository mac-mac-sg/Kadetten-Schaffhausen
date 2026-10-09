# Arena-Puls für Kadetten

Nur die Kadetten-Karte auf der Startseite erhält einen warmen Lichtschein hinter dem eigenen Wappen und einen synchronen Doppelimpuls am Rand. FCSG bleibt unverändert. Texte und Buttons werden nicht skaliert.

Rhythmus: über 24 Stunden ein kräftigerer, sanfter Arena-Atemzug alle 12 s, ansonsten ruhig 12 s, am Spieltag 8 s, unter 2 Stunden 5 s, letzte 15 Minuten 3 s. Bestätigter Live-Status 5 s; nach Endresultat aus. Keine erfundene Live-Annahme nach überschrittener Anspielzeit. Ohne bestätigte Uhrzeit ruhig. Laufende Countdown-Aktualisierung übernimmt Phasenwechsel; Animationen pausieren bei verborgenem Dokument. Bei reduzierter Bewegung statischer Lichtschein.

Prüfung: `npm run verify` erfolgreich, zusätzlicher Test in `tests/logic.test.mjs` für Zeitgrenzen, offene Uhrzeit, Ergebnis und bestätigten Live-Status. `git diff --check` erfolgreich. Browser-/axe-Prüfung nicht möglich: kein lokales Chromium; Playwright-Browserdownload lieferte ungültiges Archiv. Kein visueller Prüfbeleg behauptet.

Keine Änderung an Datenquellen, Datendienst, Zeitplänen oder anderen Ansichten. Kein Toreffekt, da die vorliegende Änderung den Countdown-Puls fokussiert.
