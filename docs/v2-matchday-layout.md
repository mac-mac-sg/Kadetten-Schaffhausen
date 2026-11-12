# V2: Matchday-Layout mit vier Companion-Funktionen

**Abgelöst am 7. November 2026:** Auf ausdrücklichen Wunsch des Eigentümers ersetzt die neue Kadetten App in der [Designsprache «Schnitt»](kadetten-app-design.md) dieses Layout. Der Matchday-Quellstand unter `src/kadetten/matchday/` ist entfernt (er bleibt in der Git-Historie, letzter Stand: Commit `e866fa1`). Die Companion-Funktionen (Tipp, Spieler des Matchs, «Ich war in der Halle», Artikel zum Spiel) sind Teil der neuen App. Die Spielseite nach Screenshot-Referenz (PR #320) ist in der neuen Spielseite aufgegangen; `js/match-center.js` und `css/match-center.css` entfallen. Das folgende Dokument beschreibt den früheren Stand.

Entscheid des Eigentümers vom 6. November 2026: Das Layout von Matchday wird 1:1 übernommen. Der zuvor gewählte Mix aus drei Designrichtungen wird ersetzt.

## Oberfläche und Trennung

`src/kadetten/matchday/` enthält einen eigenen Quellstand der Matchday-Vorlagen, Skripte und Styles vom Commit `3b377604201f67125b67866ccefbe59cce32b5e5`. Das bedeutet gleiche Startseite, Titelbereiche, Vereinsauswahl, Navigation, Spiele, Tabellen, Statistiken, Spieleransichten und Vereinsseite. Es wird keine neue Designschicht darübergelegt. Die bestehenden Marken-, Bild- und Schriftrechte gelten unverändert.

Der Build liest ausschliesslich aus `src/kadetten/`. Die gemeinsam aussehenden Apps werden weiterhin unabhängig gebaut. `src/client/` und die veröffentlichte V1 bleiben unverändert. Die Assets der Vorlage liegen ebenfalls in der eigenen V2-Codebasis; Git kann identische Inhalte als bestehende Objekte wiederverwenden.

`matchday/shell.json` definiert die ursprüngliche Lade- und Stilreihenfolge. `scripts/build-app.mjs` bündelt die Vorlagen mit den V2-Ergänzungen. Die bisherigen ES-Modul-Ansichten (`js/main.js`, `js/views/`, `css/app.css`) sind kein Einstiegspunkt mehr. Ihre Daten-, Sicherheits- und persönlichen Speicherhelfer bleiben unabhängig getestet; die neuen Ergänzungen verwenden diese bestehenden Helfer. Die sichtbaren V2-Ergänzungen liegen in `js/matchday-features.js`, die Verbindung und Ereignisse in `js/matchday-companion.js`, deren begrenzte Styles in `css/matchday-companion.css`.

## Erhaltene Funktionen

| Kontext | Funktion | Verhalten |
|---|---|---|
| Abgeschlossenes Kadetten-QHL-Spiel | Artikel zum Spiel | Bis zu drei vorhandene Vereinsartikel mit Gegnerbezug, vom Spieltag bis zwei Tage danach; öffnen intern im Matchday-Artikelbildschirm |
| Laufendes Kadetten-Spiel | Spieler des Matchs | Fan-Wahl nur vom Anpfiff bis zum Schlusspfiff, Kandidaten aus dem Live-Stand, Portrait-Zuordnung über SHV-ID, Auswahl und separater Bestätigung; Ergebnis erst nach dem Schlusspfiff auf der Spielseite |
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

## Spielseiten nach Screenshot-Referenz (7. November 2026)

Die Kadetten-Spielseite erhält einen eigenen, auf diese Seite begrenzten Rahmen: Zurück und Teilen, grosse neutrale Resultatkarte mit Wappen, Tabs «Übersicht / Ticker / Statistik». Nach einem bestätigten Endresultat steht der Einstieg zur QHL-Fan-Wahl vor dem Matchbericht. Die Wahl ist ein eigener Bildschirm mit Rückweg zum Spiel. Artikel und Hallenbesuch bleiben bei der Übersicht erhalten, der QHL-Tipp vor Anpfiff. Die übrigen Matchday-Seiten und ihre Navigation bleiben erhalten; die neue Kopfgestaltung der Startseite ist noch eine Designentscheidung.

Die vorhandenen Matchday-Datenloader und geprüften Statistik-/Berichtsvorlagen bleiben die Datenbasis. `js/match-center.js` übernimmt ausschliesslich bereits maskiertes Vorlagen-HTML und entfernt den doppelten Spielkopf. `css/match-center.css` gilt nur für die Kadetten-Spielseite. Direkte alte «report»-Links öffnen nach Spielende die Übersicht, während eines Live-Spiels den Ticker. Ausdrücklich gewählte Tabs wechseln bei einem Datenupdate nicht automatisch.

### Vorschlag: interaktives Live-Match-Center (noch nicht umgesetzt)

| Phase | Übersicht | Ticker | Statistik |
|---|---|---|---|
| Vor Anpfiff | Paarung, Zeit, Matchprogramm, Vorschau und eigener Tipp | Hinweis auf den Start | Form und Direktvergleich |
| Während des Spiels | Bestätigter Live-Stand, Halbzeit, letzte Ereignisse und kompakte Highlights | Ereignisse mit Filtern Alle/Kadetten/Tore/Strafen, neue Einträge auf Wunsch öffnen | Torverlauf, Teamvergleich, Spieler und Torhüter |
| Halbzeit | Pausenstand und drei sachliche Erkenntnisse aus bestätigten Werten | Verlauf bleibt lesbar | Halbzeitvergleich, wenn die Quelle ihn liefert |
| Nach Abpfiff | Bericht, Artikel, Tippauswertung, Wahl und Hallenbesuch | Archivierter Verlauf | Endgültige Matchwerte |

Umsetzung in zwei Stufen: zuerst ein stabiles Live-Dashboard mit bestehenden Daten, Filtern, auswählbaren Spielern und einer Schaltfläche «Neue Ereignisse» statt erzwungenem Scrollen. Danach Fan-Interaktion: eigener Tipp als Spielbegleiter, Spielerwahl während Heimspielen, optional eine einfache Pausenfrage. Für eine Wahl vor Abpfiff braucht der Datendienst eine neue Freigabe- und Schlusslogik mit Serverseitiger Begrenzung; bisher bleibt sie nach Spielende. Keine öffentliche Chatfunktion oder zusätzliche Konten als Einstieg.

Technisch zunächst bestehendes Polling bei sichtbarer App nutzen (30 Sekunden bei beobachtetem Live-Spiel), fehlgeschlagene Quellen behalten ihren letzten bestätigten Stand. Kein angebliches Echtzeitgeschehen aus Uhrzeit oder Spielstand ableiten. QHL liefert Ereignisse, EHF derzeit keinen vollständigen Live-Ereignisticker. Ein Phasenwechsel folgt offiziellen Statusmeldungen und erhält den aktuell gelesenen Tab. Updates ändern weder Tastaturfokus noch Leseposition; für Assistenztechnik nur kurze relevante Meldungen statt einer ständig vorgelesenen Spieluhr.

Grundlagen: [W3C zu Live-Regionen](https://w3c.github.io/aria/#dfn-live-region), [Material App Bars](https://m3.material.io/components/app-bars/), [Apple Navigation Bars](https://developer.apple.com/documentation/uikit/uinavigationbar/preferslargetitles).

### Vier Titelstudien ohne Vereinsauswahl

Zusätzlich angefragt am 7. November, noch nicht aktiviert: (1) Kompakt – Wappen und zweizeilige Kadetten-Identität mit einer Einstellungsschaltfläche; (2) Arena Glas – kurzes Hallenfoto mit lesbarem Titel und überlappender Spielzeile; (3) Editorial – grosse Vereins-Typografie auf neutralem Grund; (4) Matchday-Fokus – kompakte Marke und situationsbezogene Spielkarte. Die visuelle Empfehlung für eine leichte Alltags-App ist Variante 1; Variante 4 priorisiert den Spieltag. Die Bildstudien sind Entwürfe mit Beispieldaten, keine bereits veröffentlichten Bildschirme. Eine Auswahl für den Startseitenkopf steht noch aus.
