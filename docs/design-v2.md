# Design-Testversion «Verein erleben»

Die ausdrücklich beauftragte zweite Oberfläche wird unter `https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/` veröffentlicht. Die bestehende Startadresse behält ihre Oberfläche. Beide Fassungen lesen dieselben öffentlichen Cloudflare-APIs; es gibt keine zusätzlichen Datenjobs oder Schreibzugänge.

`scripts/build-pages.mjs` baut zuerst die bisherige Oberfläche, danach die separate V2. Nur der zweite Build lädt `src/client/v2/design.js` vor dem Startcode und `design.css` nach den vorhandenen Styles. Der V2-Build erhält eine eigene Manifest-Bezeichnung, relative PWA-ID und Scope sowie durchgehend mit `v2:` getrennte Browser-Speicherschlüssel. Die bestehenden Service-Worker-Caches enthalten bereits den jeweiligen Pfad im Namen. Der Service Worker der Haupt-App lässt den untergeordneten V2-Pfad ausdrücklich passieren, damit seine gecachte Startseite die erste V2-Navigation nicht abfängt. Die Testversion wird unabhängig installiert und aktualisiert.

Die erste Fassung enthält den bildstarken Arena-Einstieg für alle drei Vereine, schwebende Glasnavigation, normale News im Magazinlayout, gestapelte Entdeckungsbereiche, aufklappbare Spielvorschauen, Kader-Einstiege, angepasste Spielerprofile und einen Hell-/Dunkelwechsel. Spielplan, Kalender, gemeinsame Woche und Statistikfunktionen bleiben aus der aktuellen App erhalten. Die vorhandenen Spieltags-/Live-Effekte und aktualisierten Daten werden weiterverwendet. «Spielzustände» öffnet ausschliesslich gekennzeichnete fiktive Gestaltungsbeispiele; die echten Daten werden dabei nicht verändert.

`npm run verify` prüft zusätzlich dreizehn V2-Ansichtstests. Der Pages-Build prüft mit `scripts/check-preview.mjs` die Trennung der beiden Skript-Bündel, PWA-Scopes, Cache-Namensräume und lokale Assets. Die ursprünglichen App-Bündel können gegen einen einzelnen `KADETTEN_TARGET=pages node scripts/build.mjs`-Build verglichen werden.

Die Browser-Prüfung bei 390 px und Desktop sowie mit axe-core ist zusätzlich erforderlich. Ist kein Browser installiert, muss diese Grenze ausdrücklich dokumentiert werden. Ein reales Smartphone bleibt für Bildausschnitte, Touchbedienung, Glasflächen und Scrollgefühl der wichtigste Abnahmeschritt.

Zur Rücknahme der Testversion die Änderung an `scripts/build-pages.mjs` zurücknehmen; die ursprüngliche App und der Datendienst benötigen keine Umstellung. Das neue Layout wird erst nach Rückmeldung in die Hauptoberfläche übernommen.

## Gestaltungsrichtung nach Rückmeldung

V2 richtet sich ausschliesslich an Smartphone-Nutzung. Die klare Informationsstruktur der ersten App bleibt die Grundlage: News, Spiele, Tabelle und Kader. V2 soll leichter und moderner wirken, mit ruhigen hellen Inhaltsflächen, gut lesbarer Typografie, dezenten Glasflächen und klarer Hierarchie. Zusätzliche Ebenen und Animationen sollen Orientierung unterstützen.

Auf Wunsch ist die erste V2-Startseite wiederhergestellt: grosse Newsbilder und Entdecken-Layer nach dem Newsfeed, ohne kompakte Meldungen oder zusätzliche Scrollleiste auf Home. Die Vereinsseite behält die kompakte Glasnavigation und ihre sanften Einblendungen. Spiele behalten die angeheftete Ansichtenwahl.

Der Spieltagsblock ist eine eigenständige dunkle Glasfläche in beiden Seiten-Themen. Seine Text-, Metadaten- und Ergebnisfarben bleiben bei Hell/Dunkel identisch; der übrige Bildschirm folgt weiterhin dem gewählten Thema. Die Vereinsfarben sowie Vorschau-, Matchday-, Live- und Endresultat-Zustände bleiben erhalten. Der mobile Browser-Regressionslauf vergleicht die berechneten Farben des Blocks und seiner Kinder für alle drei Vereine und sechs Zustände zwischen Hell und Dunkel.

## Kompakter Kopf und Matchkarte

Der Kopfbereich zeigt Vereinslogo/-name, einen 44 px grossen Vereinswahl-Knopf, Einstellungen und den Themenwechsel in einer Zeile. Ein Dropdown direkt unter dem Kopf zeigt die gewählten Vereine inklusive vorhandener Spieltagshinweise. Der Wechsel erhält die aktuelle Hauptroute; nicht übertragbare Artikel/Spieler/Matchdetails wechseln zur jeweiligen Übersicht. Installieren und die gekennzeichneten V2-Testwerkzeuge liegen in den Einstellungen.

Die dunkle Matchkarte verwendet für alle Vereine dieselbe Grundgeometrie: Status und Wettbewerb oben, Wappen und Namen auf beiden Seiten, Anspielzeit beziehungsweise bestätigtes Resultat in der Mitte, Datum/Heim-/Auswärtskontext oder Live-Phase unten. Unbestätigte Zeiten bleiben offen. Innerhalb der letzten Stunde zeigt die Mitte einen ruhigen Countdown; das Erreichen der Startzeit behauptet keinen Live-Status. Eine leicht versetzte Aktionsebene unter der Karte führt auf dieselbe echte Spielroute und folgt Vorschau/Matchday/Live/Rückblick. Die grossen Newsbilder bleiben erhalten.

Der bisherige Glanz, Hintergrundschimmer und Herzschlag sind im V2-Matchblock entfernt. Am Matchday verbleibt ein dezenter umlaufender Lichtakzent, live ein kleiner Statuspunkt. Neue Ergebniswerte blenden kurz um; reduzierte Bewegung schaltet diese Animationen aus. API-Läufe, Quellen und ursprüngliche App bleiben unverändert.

Die Aktionsebene ist eine vollständige, an allen vier Ecken abgerundete Kachel. Sie beginnt 24 px unterhalb der oberen Matchkante, liegt hinter der Matchkarte und bleibt seitlich um 8 px sowie unten um 50 px sichtbar. Die Beschriftung steht im freien unteren Bereich. So verschwindet ihre obere Kante unter der Vorderkarte, statt als rechteckiger Balken am Kartenfuss zu enden. Der Smartphone-Regressionslauf misst Überlappung, obere Rundung, seitlichen Versatz und den frei bedienbaren unteren Streifen.

Der Arena-Einstieg enthält ausschliesslich die Matchkarte unter dem kompakten Kopf. Slogan, grosser Vereinstitel und Saisonzeile entfallen; die Hauptüberschrift steht im News-Bereich. Der Vereins-Pfeil klappt eine direkt am Kopf verankerte Auswahl auf, ohne Dialog oder Hintergrundabdunklung. Er schliesst beim erneuten Antippen, nach der Auswahl, ausserhalb, beim Scrollen oder mit Escape; ArrowDown öffnet ihn mit Tastaturfokus auf den ersten Verein.

Die News-Vorschau besteht aus einem einzigen zugänglichen Link um Bild, Datum und Titel. «Geschichte lesen» entfällt. Ein dekorativer SVG-Pfeil nach rechts steht neben der ersten Titelzeile; die Fläche gibt beim Antippen kurz über die Deckkraft Rückmeldung. Die offenen Flächen und grossen Bilder bleiben erhalten. Die Browserprüfung öffnet denselben Artikel über Foto, Überschrift und Enter-Taste.

### Vereinskapitel als Kartenstapel
Im Kader öffnet die gesamte Kachel «Unser Verein» die Vereinsübersicht. Diese beginnt direkt mit drei vollständigen, versetzten Karten für Geschichte, Erfolge und Heimstätte. Hintere Kapitelstreifen holen die betreffende Karte nach vorne; nur die Vorderseite verlinkt zur Detailansicht. Die Reihenfolge bleibt je Verein im laufenden App-Besuch erhalten. Detailrouten: `#club/history`, `#club/achievements`, `#club/venue`; «Zurück» öffnet wieder den ausgewählten Stapel.

Zeitreise und Trophäenschrank verwenden die bestehenden Daten und Bedienelemente. Verknüpfungen zwischen Titeljahr und historischem Moment wechseln das passende Kapitel. Bestehende Links von der Startseite führen ebenfalls ins zugehörige Kapitel. Ohne verfügbare Archivbilder bleibt die ruhige Kartenfarbe sichtbar. Reduzierte Animationen deaktivieren die Wechselbewegung. V1 bleibt unverändert.

Browserprüfung nach `npm run build:pages`: `node scripts/check-v2-club-deck.mjs` mit denselben Browser-/axe-Umgebungsvariablen wie `scripts/check-v2-mobile.mjs`.
