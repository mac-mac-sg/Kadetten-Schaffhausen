# Design-Testversion «Verein erleben»

Die ausdrücklich beauftragte zweite Oberfläche wird unter `https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/` veröffentlicht. Die bestehende Startadresse behält ihre Oberfläche. Beide Fassungen lesen dieselben öffentlichen Cloudflare-APIs; es gibt keine zusätzlichen Datenjobs oder Schreibzugänge.

`scripts/build-pages.mjs` baut zuerst die bisherige Oberfläche, danach die separate V2. Nur der zweite Build lädt `src/client/v2/design.js` vor dem Startcode und `design.css` nach den vorhandenen Styles. Der V2-Build erhält eine eigene Manifest-Bezeichnung, relative PWA-ID und Scope sowie durchgehend mit `v2:` getrennte Browser-Speicherschlüssel. Die bestehenden Service-Worker-Caches enthalten bereits den jeweiligen Pfad im Namen. Die Testversion wird unabhängig installiert und aktualisiert.

Die erste Fassung enthält den bildstarken Arena-Einstieg für alle drei Vereine, schwebende Glasnavigation, normale News im Magazinlayout, gestapelte Entdeckungsbereiche, aufklappbare Spielvorschauen, Kader-Einstiege, angepasste Spielerprofile und einen Hell-/Dunkelwechsel. Spielplan, Kalender, gemeinsame Woche und Statistikfunktionen bleiben aus der aktuellen App erhalten. Die vorhandenen Spieltags-/Live-Effekte und aktualisierten Daten werden weiterverwendet. «Spielzustände» öffnet ausschliesslich gekennzeichnete fiktive Gestaltungsbeispiele; die echten Daten werden dabei nicht verändert.

`npm run verify` prüft zusätzlich drei V2-Ansichtstests. Der Pages-Build prüft mit `scripts/check-preview.mjs` die Trennung der beiden Skript-Bündel, PWA-Scopes, Cache-Namensräume und lokale Assets. Die ursprünglichen App-Bündel können gegen einen einzelnen `KADETTEN_TARGET=pages node scripts/build.mjs`-Build verglichen werden.

Die Browser-Prüfung bei 390 px und Desktop sowie mit axe-core ist zusätzlich erforderlich. Ist kein Browser installiert, muss diese Grenze ausdrücklich dokumentiert werden. Ein reales Smartphone bleibt für Bildausschnitte, Touchbedienung, Glasflächen und Scrollgefühl der wichtigste Abnahmeschritt.

Zur Rücknahme der Testversion die Änderung an `scripts/build-pages.mjs` zurücknehmen; die ursprüngliche App und der Datendienst benötigen keine Umstellung. Das neue Layout wird erst nach Rückmeldung in die Hauptoberfläche übernommen.
