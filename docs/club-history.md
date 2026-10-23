# Vereinsseite

`#club` wird über das kleine Wappen oben rechts geöffnet. Die Hauptnavigation bleibt bei vier Laschen. `data/club.js` enthält redaktionelle Stationen und Titeljahre; `views-club.js` rendert Einstieg, Trophäenschrank und Zeitreise, `club.css` gestaltet sie.

## Redaktion und Quellen

- Chronik und echte Archivaufnahmen: https://kadettensh.ch/geschichte/
- Titeljahre der ersten Männermannschaft: offizielles Matchprogramm 2026/27, https://kadettensh.ch/wp-content/downloads/Matchprogramm_Kadetten_QHL.pdf (15 Meisterschaften, 11 Cupsiege, 16 Supercups). Die Supercup-Liste folgt dieser Ausgabe; ältere Ausgaben führen teils andere Kalenderjahre. Cupsieg «2026» = Saison 2025/26, Finale im Dezember 2025.
- EHF-Cup-Final 2009/10: https://history.eurohandball.com/ec/ehfc/men/2009-10/round/7/Final – Finalist, kein Europacupsieg. Das Bild dieses Kapitels zeigt die Schweizer Meistermannschaft 2010, keinen Europacup-Pokal.
- 1791 bezeichnet die Gründung des Kadettencorps, nicht die Handballmannschaft. Der Handballsport beginnt nach dem Zweiten Weltkrieg.

Die öffentlich erreichbaren Originalbilder werden direkt vom Vereinsarchiv geladen. Sie benötigen beim ersten Abruf Internet. Bei Bildfehlern wird keine andere Aufnahme als historisches Foto ausgegeben; der Quellenhinweis bleibt sichtbar. Rechte verbleiben bei den Urhebern. Quellen stehen gesammelt in einem aufklappbaren Nachweis.

## Interaktion

Titelkategorien und Titeljahre sind native Buttons mit gedrücktem Zustand; Ereignisdelegation funktioniert auch nach dem Austausch der Jahresauswahl. Historische Titel führen direkt in den Trophäenschrank und zurück ins passende Kapitel. Der feine vertikale Jahresstrahl links folgt der aktuell sichtbaren Station und scrollt bei Bedarf innerhalb seiner eigenen Leiste mit. Die gesamte Zeitreise ist frei scrollbar, ohne Einrastpunkte oder Scroll-Lock. Direkte Sprünge über die Jahresbuttons setzen den Tastaturfokus auf die Überschrift. Animationen sind bei reduzierter Bewegung deaktiviert. Ohne IntersectionObserver bleiben alle Inhalte und Sprungbuttons zugänglich.

Die historische Redaktion ist bewusst statisch. Neue Titel müssen in `data/club.js` nach einer Prüfung der offiziellen Quellen ergänzt werden; die Zweistunden- und Live-Aktualisierung für News und Spiele bleibt bestehen.

## V1: Bildsprache in News und Geschichte (23. Oktober 2026)

Die erste News erhält ein grösseres Aufmacherfoto mit Titel darunter (auf Desktop daneben). Weitere Meldungen erscheinen als kompakte Zeilen mit Bild, vollständigem Titel, Datum und dem bestehenden Pfeil. Reihenfolge und Datenquellen bleiben bestehen; weitere Bilder laden verzögert.

In der Geschichte stehen Jahr und Titel unmittelbar vor dem zugehörigen Archivfoto. Originale Bildausschnitte und Nachweise bleiben erhalten. Kapitel ohne Foto erhalten keine wiederholte Wappen-Jahresgrafik. Die offizielle Otmar-Chronik enthält derzeit nur das bereits eingebundene Einstiegsfoto, keine zuordenbaren historischen Kapitelbilder; es werden keine aktuellen Fotos als historische Aufnahmen ausgegeben. Als visueller Abschluss folgt bei allen drei Vereinen die vorhandene Aufnahme ihrer heutigen Heimstätte, ausdrücklich so beschriftet. V2 bleibt bei der bisherigen Darstellung.
