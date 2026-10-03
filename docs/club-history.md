# Vereinsseite

`#club` wird über das kleine Wappen oben rechts geöffnet. Die Hauptnavigation bleibt bei vier Laschen. `data/club.js` enthält redaktionelle Stationen und Titeljahre; `views-club.js` rendert Einstieg, Trophäenschrank und Zeitreise, `club.css` gestaltet sie.

## Redaktion und Quellen

- Chronik und echte Archivaufnahmen: https://kadettensh.ch/geschichte/
- Titeljahre der ersten Männermannschaft: offizielles Matchprogramm 2026/27, https://kadettensh.ch/wp-content/downloads/Matchprogramm_Kadetten_QHL.pdf (15 Meisterschaften, 11 Cupsiege, 16 Supercups). Die Supercup-Liste folgt dieser Ausgabe; ältere Ausgaben führen teils andere Kalenderjahre. Cupsieg «2026» = Saison 2025/26, Finale im Dezember 2025.
- EHF-Cup-Final 2009/10: https://history.eurohandball.com/ec/ehfc/men/2009-10/round/7/Final – Finalist, kein Europacupsieg. Das Bild dieses Kapitels zeigt die Schweizer Meistermannschaft 2010, keinen Europacup-Pokal.
- 1791 bezeichnet die Gründung des Kadettencorps, nicht die Handballmannschaft. Der Handballsport beginnt nach dem Zweiten Weltkrieg.

Die öffentlich erreichbaren Originalbilder werden direkt vom Vereinsarchiv geladen. Sie benötigen beim ersten Abruf Internet. Bei Bildfehlern wird keine andere Aufnahme als historisches Foto ausgegeben; der Quellenhinweis bleibt sichtbar. Rechte verbleiben bei den Urhebern. Quellen stehen gesammelt in einem aufklappbaren Nachweis.

## Interaktion

Titelkategorien und Titeljahre sind native Buttons mit gedrücktem Zustand; Ereignisdelegation funktioniert auch nach dem Austausch der Jahresauswahl. Historische Titel führen direkt in den Trophäenschrank und zurück ins passende Kapitel. Die horizontale Jahresleiste folgt der aktuell sichtbaren Station, ohne die vertikale Scrollposition zu verändern. Scrollen nutzt sanftes Einrasten; direkte Sprünge setzen den Tastaturfokus auf die Überschrift. Animationen und Einrasten sind bei reduzierter Bewegung deaktiviert. Ohne IntersectionObserver bleiben alle Inhalte und Sprungbuttons zugänglich.

Die historische Redaktion ist bewusst statisch. Neue Titel müssen in `data/club.js` nach einer Prüfung der offiziellen Quellen ergänzt werden; die Zweistunden- und Live-Aktualisierung für News und Spiele bleibt bestehen.
