# Arena-Puls für Kadetten

Nur die Kadetten-Karte auf der Startseite erhält einen warmen Lichtschein hinter dem eigenen Wappen und einen synchronen Doppelimpuls am Rand. FCSG bleibt unverändert. Texte und Buttons werden nicht skaliert.

Rhythmus: über 24 Stunden ein kräftigerer, sanfter Arena-Atemzug alle 12 s, ansonsten ruhig 12 s, am Spieltag 8 s, unter 2 Stunden 5 s, letzte 15 Minuten 3 s. Bestätigter Live-Status 5 s; nach Endresultat aus. Keine erfundene Live-Annahme nach überschrittener Anspielzeit. Ohne bestätigte Uhrzeit ruhig. Laufende Countdown-Aktualisierung übernimmt Phasenwechsel; Animationen pausieren bei verborgenem Dokument. Bei reduzierter Bewegung statischer Lichtschein.

Prüfung: `npm run verify` erfolgreich, zusätzlicher Test in `tests/logic.test.mjs` für Zeitgrenzen, offene Uhrzeit, Ergebnis und bestätigten Live-Status. `git diff --check` erfolgreich. Browser-/axe-Prüfung nicht möglich: kein lokales Chromium; Playwright-Browserdownload lieferte ungültiges Archiv. Kein visueller Prüfbeleg behauptet.

Keine Änderung an Datenquellen, Datendienst, Zeitplänen oder anderen Ansichten. Kein Toreffekt, da die vorliegende Änderung den Countdown-Puls fokussiert.

## FCSG
Der FCSG-Startseitenblock nutzt dieselben Animationsphasen in Grün. Der Lichtschein folgt nur dem eigenen Wappen, auch auswärts. Bestätigte Anspielzeiten steuern die Phasen; unbestätigte Uhrzeiten bleiben ruhig. Am Spieltag wird der Vorschau-Block kräftiger grün. Aktualisierungen des Live-Blocks übernehmen den neuen Pulsstatus, eine sichtbare Sekundentakt-Prüfung aktualisiert Phasen ohne zusätzliche Datenabfragen. Verborgene App pausiert, reduzierte Bewegung bleibt statisch.

Prüfung: neuer Test in `tests/views.test.mjs` für Heim/Auswärts-Wappen, bestätigte/offene Uhrzeit, Endresultat und Live-Status. Visuelle Browser-/axe-Prüfung weiterhin nicht verfügbar.

## Schimmer statt Doppelrahmen (10.10.)
Über 24h nur breite bewegte Hintergrund-Lichtfläche in Vereinsfarbe; Zusatzrahmen und Wappenpuls verborgen. Ab 24h Rahmen-Doppelimpuls alle8s, 2h/15min/Live unverändert. Randanimation verändert nur Deckkraft, bleibt am bestehenden Kartenrand und erzeugt keinen skalierten inneren Rahmen. Fehlende/überholte Uhrzeit ohne Rahmenimpuls; Endresultat ohne Schimmer. Hintergrundebene getrennt von Rand, reduziert/verborgen pausiert. Visuelle Browserprüfung weiterhin offen.
