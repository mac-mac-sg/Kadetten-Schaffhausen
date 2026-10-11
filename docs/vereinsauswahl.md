# Vereinsauswahl und St. Otmar

Die News-Seite öffnet über das Zahnrad «Meine Vereine». Die Auswahl wird im lokalen Browser unter `fan-app-selected-clubs-v1` gespeichert. Mindestens ein Verein bleibt aktiv. Die Kopfzeile zeigt die ausgewählten Vereine direkt; bei einem Verein entfällt die Auswahlleiste. Beim Vereinswechsel bleiben News, Spiele, Tabelle und Kader geöffnet; vereinsabhängige Detailseiten führen zur entsprechenden Übersicht. Der Zugang zur Vereinsgeschichte steht oben rechts im Kader.

TSV St. Otmar St. Gallen nutzt dieselben Handballansichten wie die Kadetten. Eigene Quellen: `otmar.ch/aktuelles`, `otmar.ch/1-mannschaft/team`, `otmar.ch/1-mannschaft/saison` und `otmar.ch/verein/historie`; SHV-Team 40900, Verein 140684. Die QHL-Tabelle stammt aus derselben geprüften Ligatabelle. Saisonwerte werden aus allen bestätigten QHL-Spielberichten summiert: Die SHV-Spielerliste enthält auch Cupwerte und darf deshalb nicht direkt als QHL-Saisonstatistik dienen. Fehlende Einzelwerte bleiben offen. Ausfälle behalten den letzten gültigen Stand der jeweiligen Quelle.

Snapshots, Berichte, Artikelanfragen und Browser-Caches bleiben nach Verein getrennt. `/api/otmar/data`, `/api/otmar/live`, `/api/otmar/reports/:id`, `/api/otmar/articles/:id`, `/api/otmar/head-to-head` und `/api/otmar/match-reports/:id` sind nur lesend. Der bestehende Actions-Schreiblauf aktualisiert zusätzlich Otmar und erstellt Vorschauen und QHL-Matchberichte. Der bestehende Zeitplan und die KI-Einstellung bleiben bestehen.

Bei Änderungen an `server/` veröffentlicht der Cloudflare-Deploy-Workflow nach dem Merge nun auch den Datendienst und initialisiert die Vereinsdaten. GitHub Pages veröffentlicht die Oberfläche wie bisher. Die manuellen Workflows bleiben verfügbar.

Historische Otmar-Stationen verwenden klar erkennbare Jahresgrafiken, wenn keine belegten Archivbilder vorliegen. Es werden keine Archivaufnahmen erfunden. Die Darstellung von Titelkategorien und Zeitreise bleibt gleich.
