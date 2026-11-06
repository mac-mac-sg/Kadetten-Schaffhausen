# V2: Matchday-Layout mit vier Companion-Funktionen

Entscheid des Eigentümers vom 6. November 2026: Das Layout von Matchday wird 1:1 übernommen. Der zuvor gewählte Mix aus drei Designrichtungen wird ersetzt.

## Oberfläche und Trennung

`src/kadetten/matchday/` enthält einen eigenen Quellstand der Matchday-Vorlagen, Skripte und Styles vom Commit `3b377604201f67125b67866ccefbe59cce32b5e5`. Das bedeutet gleiche Startseite, Titelbereiche, Vereinsauswahl, Navigation, Spiele, Tabellen, Statistiken, Spieleransichten und Vereinsseite. Es wird keine neue Designschicht darübergelegt. Die bestehenden Marken-, Bild- und Schriftrechte gelten unverändert.

Der Build liest ausschliesslich aus `src/kadetten/`. Die gemeinsam aussehenden Apps werden weiterhin unabhängig gebaut. `src/client/` und die veröffentlichte V1 bleiben unverändert. Die Assets der Vorlage liegen ebenfalls in der eigenen V2-Codebasis; Git kann identische Inhalte als bestehende Objekte wiederverwenden.

`matchday/shell.json` definiert die ursprüngliche Lade- und Stilreihenfolge. `scripts/build-app.mjs` bündelt die Vorlagen mit den V2-Ergänzungen. Die bisherigen ES-Modul-Ansichten (`js/main.js`, `js/views/`, `css/app.css`) sind kein Einstiegspunkt mehr. Ihre Daten-, Sicherheits- und persönlichen Speicherhelfer bleiben unabhängig getestet; die neuen Ergänzungen verwenden diese bestehenden Helfer. Die sichtbaren V2-Ergänzungen liegen in `js/matchday-features.js`, die Verbindung und Ereignisse in `js/matchday-companion.js`, deren begrenzte Styles in `css/matchday-companion.css`.

## Erhaltene Funktionen

| Kontext | Funktion | Verhalten |
|---|---|---|
| Abgeschlossenes Kadetten-QHL-Spiel | Artikel zum Spiel | Bis zu drei vorhandene Vereinsartikel mit Gegnerbezug, vom Spieltag bis zwei Tage danach; öffnen intern im Matchday-Artikelbildschirm |
| Abgeschlossenes Kadetten-QHL-Spiel | Spieler des Matchs | Aufklappbare Fan-Wahl mit Quellenkandidaten, Portrait-Zuordnung über SHV-ID, Auswahl und separater Bestätigung; Ergebnis erst nach Wahlende |
| Abgeschlossenes Kadetten-QHL-Spiel | Ich war in der Halle | Umschalter mit lokal gespeichertem Besuch, auch bei Auswärtsspielen |
| Kadetten-QHL-Spiel vor Anpfiff | Dein Tipp | Lokaler Ergebnistipp; ab Anpfiff gesperrt, auch wenn der Bildschirm geöffnet bleibt |

Die Zusatzfunktionen erscheinen in den bestehenden Spielansichten. Sie werden nicht auf EHL, Cup, andere Vereine oder laufende Spiele ausgeweitet. Fehlende Artikel werden nicht erfunden. Das Wahlfenster und die Begrenzungen im Datendienst bleiben unverändert; kein Worker-Deployment erforderlich.

## Speicher, Links und PWA

- Die installierte V2 behält Manifest-ID, Scope, Namen und Symbole. Der bestehende auf `/v2/` begrenzte Service Worker bleibt bestehen; V1-Caches werden nicht gelöscht.
- Die kopierte Matchday-Oberfläche verwendet `v2:` vor allen eigenen lokalen Schlüsseln. V1-Einstellungen und Daten werden nicht verändert.
- Die bereits gespeicherten Companion-Tipps, Stimmen und Hallenbesuche behalten ihre Schlüssel und Spiel-IDs. Ein vorhandener Companion-Snapshot und die Farbauswahl werden beim ersten Start übernommen, wenn kein neuerer Matchday-Speicher existiert.
- Alte Companion-Routen zu Spiel, Team, Spieler, Tabelle, Verein und Artikel werden vor dem ersten Render in die passenden Matchday-Routen überführt. Push-Links `#match/:id` bleiben unterstützt.
- Die bestehende lesende Datenanbindung bleibt; nur die bereits autorisierte Fan-Wahl verwendet deren eigenen POST-Endpunkt. Das persönliche Tippspiel und die Hallen-Erinnerungen schreiben ausschliesslich auf dem Gerät.

## Prüfung

`tests/app-matchday.test.mjs` prüft die Gleichheit der übernommenen Styles und der unveränderten Vorlagen, die Beschränkung auf Kadetten-QHL, die Tipp-Sperre ab Anpfiff, Artikelzuordnung, Besuchszustand und den Ablauf der Wahl. `npm run verify` prüft weiterhin die vollständige Anwendung und die bytegleiche V1-Ausgabe.
