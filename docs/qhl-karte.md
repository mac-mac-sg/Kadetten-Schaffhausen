# QHL-Vereinskarte – V2

Die QHL-Karte wird ausschliesslich in der Testversion `/v2/` geladen. Bei Kadetten und St. Otmar erscheint unter «Tabelle» für QHL der Umschalter «Tabelle | Karte». Die Route ist `#season/table/map`; Fussball und European League erhalten keinen Karten-Umschalter. Vier bestehende Hauptlaschen bleiben erhalten.

## Bedienung und Daten

Die Schweizer Übersicht zeigt die regulären Heimspielstätten. Wappen sind mindestens 48 px grosse, beschriftete Schaltflächen. Nahe Punkte werden bei kleinem Zoom gruppiert; eine Gruppe öffnet einen näheren Kartenausschnitt. «Alle Vereine» setzt die Übersicht zurück. Die Vereinsliste ist eine Alternative zum Verschieben und Zoomen und bleibt bei fehlender Kartenverbindung oder fehlendem WebGL verfügbar. Ein Standortzugriff ist nicht nötig.

Antippen zeigt eine vollständig anklickbare Detailkachel. Das Vereinsprofil öffnet als nativer Dialog mit Tastaturfokus, Escape und Schliessen-Button. Es enthält Hallenangaben, Datenstand, aktuelle Tabellenwerte, vorhandene Begegnungen im Spielplan des gewählten App-Vereins, Anreise- und Quellenlinks. Kadetten und St. Otmar verweisen auf die vollständige Vereinsgeschichte. Auswahl und Kartenausschnitt bleiben pro App-Verein innerhalb der Sitzung erhalten, auch bei Rückkehr mit Browser-Zurück. Externe Anreiseplanung startet erst nach einem Link-Klick.

Mitgliedschaft, Reihenfolge, Punkte und Spiele kommen aus `tables.QHL`. Das redaktionelle Register `src/client/v2/qhl-clubs.js` ergänzt Hallen und Koordinaten. Unbekannte künftige Teams bleiben in der Liste sichtbar, ohne einen Standort zu erfinden. Fehlende Zahlen erscheinen als Strich. Es wird kein separater Datenlauf eingerichtet.

Standortprüfung am **21.10.2026**: Adressen wurden anhand der im Register verlinkten Vereins-/Betreiber-/Behördenquellen geprüft; Koordinaten stammen für jede Adresse aus dem amtlichen Gebäudeadressverzeichnis über den swisstopo SearchServer (`api3.geo.admin.ch`, individuelle Abfrage im Register). Markiert ist die Gebäudeadresse, kein bestimmter Halleneingang. Reguläre Hallen können von einzelnen Spielorten abweichen; massgebend bleibt der Spielplan. Die Profile zeigen diesen Hinweis und verlinken ihre Quellen.

## Kartentechnik und Einbindung

- MapLibre GL JS **6.15.0**, ESM und separater Modul-Worker, lokal unter `src/client/assets/maplibre-6.15.0/`; Original-Lizenz liegt daneben. Bezugsquelle: `https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-6.15.0.tgz`.
- Die Bibliothek und ihr Stylesheet werden erst beim Öffnen der Karte geladen. Sie sind nicht Teil der vorab geladenen Offline-Hülle. Bereits geladene lokale Assets kann der bestehende Service Worker zwischenspeichern.
- Basiskarte: OpenFreeMap, `https://tiles.openfreemap.org/styles/positron` für Hell und `/styles/dark` für Dunkel. Sichtbare Quellenangabe stammt aus den Kartendaten: OpenFreeMap, OpenMapTiles und OpenStreetMap.
- Nur die V2-CSP erhält `https://tiles.openfreemap.org` als zusätzliche Verbindungsquelle sowie `blob:` für interne Bilddekodierung. Bibliothek und Worker bleiben am eigenen Ursprung; kein `unsafe-eval`, kein Karten-API-Schlüssel.
- Keine flächige Offline-Kartensicherung. Bei Provider-/Netzfehlern sind Vereinsliste und redaktionelle Profile weiterhin nutzbar, sofern die App-Hülle geladen ist.
- `scripts/build.mjs` fügt Register, Oberfläche und Karten-CSS nur im V2-Build ein. Bibliotheksdateien werden in dessen Versionshash berücksichtigt. Die ausgelieferten V1-Dateien `index.html`, `js/app.js`, `app.css` und `sw.js` wurden mit dem unveränderten Ausgangs-Build verglichen.

## Prüfung

`tests/qhl-map.test.mjs` prüft Mitglieder aus dem aktuellen Tabellenstand, zehn gültige Schweizer Standorte, Alias-Namen, fehlende Werte, HTML-Maskierung, Marker-Gruppierung ohne Standortverlust, Begegnungsfilter und getrennten Sitzungszustand.

`node scripts/check-qhl-map.mjs` prüft MapLibre mit deterministischem Kartenstil bei 360/390/430/1280 px, beiden Handballvereinen und Hell/Dunkel: sichtbare Marker, Cluster-Klick, Detaildialog, Rückwege, Farbmodus, Abstand zu beiden Navigationsleisten, axe, kein Überlauf, V1/Fussball/European League und die Liste bei Kartenfehlern. Dieser Teststil enthält keine geografischen Kacheln.

Mit `QHL_MAP_LIVE=1 QHL_MAP_SMOKE=1 node --use-env-proxy scripts/check-qhl-map.mjs` wird derselbe Kernablauf bei 390 px in beiden Farbmodi mit echten OpenFreeMap-Vektorkacheln geprüft. Der Node-Prozess vermittelt im Test die Provider-Anfragen, damit der Browser die Netzwerkumgebung nutzen kann; die veröffentlichte App lädt direkt vom Provider. Browser-/axe-Pfade werden über die bestehenden `GAMES_*`-Variablen gesetzt. Screenshots sind optional über `QHL_MAP_SCREENSHOTS`.

Referenzen: [MapLibre Dokumentation](https://maplibre.org/maplibre-gl-js/docs/), [V6-Modul-/Worker-Format](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [OpenFreeMap](https://openfreemap.org/quick_start/).
