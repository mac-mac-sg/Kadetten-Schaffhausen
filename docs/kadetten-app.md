# Kadetten-App (V2) – Spezifikation

Stand: 4. November 2026. Grundlage: [Recherche Vereins- und Fan-Apps](research/vereins-und-fan-apps.md) und [Designanalyse und Funktionskatalog](research/designanalyse-und-funktionen.md).

## Ziel

Die V2 unter `/v2/` wird zur eigenständigen App für Kadetten Schaffhausen: Spieltag-Begleiter, Magazin und Nachschlagewerk für einen Club. Sie bündelt, was Fans heute an fünf Orten zusammensuchen (handball.ch, RED+, SRF/Blick, EHF und kadettensh.ch), und ist in den rund drei Stunden um den Anpfiff verlässlich.

## Entscheide

| Thema | Entscheid |
|---|---|
| Matchday | Die V1 unter `/` ist die App «Matchday» mit Kadetten, FC St. Gallen und St. Otmar. Sie bleibt bestehen und wird durch diese Arbeit nicht verändert. |
| Ort der Kadetten-App | Weiter unter `/v2/`. Die Installations-ID, der Scope und die Speicherschlüssel mit `v2:`-Präfix bleiben, damit installierte Apps weiterlaufen. |
| Rückbau | Nur in der V2: Vereinswahl, Vereinsmenü, Einführungsschritt «Vereinswahl», FCSG-/Otmar-Push und -Bilder entfallen dort. Gemeinsame Module, Daten und Server-Endpunkte für FCSG und St. Otmar bleiben für Matchday bestehen. |
| Charakter | Inoffizielle Fan-App. Kein Auftreten als offizielles Club-Angebot, Videos nur verlinken (Rechte bei SHV/RED), keine Werbung und kein Drittanbieter-Tracking. |

## Informationsarchitektur

Fünf Ziele in der unteren Navigation, reine Navigation ohne Aktionen:

| Ziel | Inhalt |
|---|---|
| Magazin | Startseite mit Spieldeck (Zustände unten), News |
| Spiele | Liste, Kalender, «Meine Woche»; Matchcenter mit Vorschau, Ticker, Aufstellung, Statistik |
| Tabelle | QHL, European League, QHL-Karte |
| Team | Mannschaftsfoto, Spielergruppen, Spielerprofile |
| Verein | Geschichte, Erfolge, Heimstätte |

Einstellungen (Zahnrad): Darstellung, Benachrichtigungen, Installation, Einführung, Datenschutz und Impressum.

## Spieltag-Zustände der Startseite

| Zustand | Zeitraum | Inhalt und Hauptaktion |
|---|---|---|
| Normalbetrieb | ausserhalb der übrigen Zustände | Titelfoto, nächstes Spiel mit Countdown, News |
| Spieltag | etwa 24 h vor Anpfiff | Spieldeck ersetzt das Titelbild; Hauptaktion «Ticket»; Spieltagsleiste mit Anreise, ÖV, «Wo läuft das Spiel?» |
| Live | Anpfiff bis bestätigtes Endresultat | Spielstand als feste Leiste mit Text «LIVE» und Minute; Ticker und Statistik |
| Nachspiel | bis etwa 24 h nach Spielende | Resultat (nach Sieg Fläche in Orange), Bericht, Spieler des Spiels, Teilen-Bild, nächstes Spiel |

Der letzte gültige Stand bleibt bei Ausfällen sichtbar; Live-Antworten werden nie aus dem Cache gezeigt.

## Gestaltungsgrundsätze

- Ein Orange (`#ff790e`) und ein Schwarz, sonst neutrale Flächen. Orange vollflächig nur in Momenten wie Spieltag, Sieg oder Titel.
- Kontrast: Schrift auf Orange ist immer fast schwarz (7,19:1). Im hellen Modus steht Text in einem dunkleren Orange, etwa `#c2410c` (5,18:1 auf Weiss); `#ff790e` auf Weiss erreicht nur 2,63:1.
- Anton für Titel und Spielstände, ruhige Textschrift mit Tabellenziffern für Text, Tabellen und Statistik; Ersatzschrift mit angepassten Metriken gegen Layoutsprünge.
- Ein Handball-Erkennungszeichen (Schnitt nach der Freiwurflinie) für Abschnittstitel, Live-Leiste und Teilen-Bild.
- Glas nur auf dem schwebenden Navigationsdock, mit undurchsichtiger Rückfallebene bei reduzierter Transparenz oder erhöhtem Kontrast.
- Ergebnisse nie nur über Farbe: Formkurve als S/U/N mit Buchstabe, Form und Farbe.
- Bewegung als kleines System mit Tokens; bei «Bewegung reduzieren» Dauer null.
- Eigene V2-Grundschicht in `@layer` mit Token-Satz statt Ausnahmen über `html:not([data-design='v2'])`. Der Token-Vorschlag steht in der Designanalyse.

## Umsetzungsphasen

Jede Phase besteht aus kleinen PRs nach [AGENTS.md](../AGENTS.md). Für Oberflächenänderungen gelten zusätzlich die Browser-Skripte aus [design-v2.md](design-v2.md).

| Phase | Inhalt | Abnahme |
|---|---|---|
| 0 | Diese Spezifikation, Recherche unter `docs/research/` | Dokumente im Repository |
| 1 | Kadetten-Sperre in V2: nur `kadetten` aktiv, Vereinswahl und -menü entfallen, gespeicherte Auswahl und FCSG-/Otmar-Push bereinigt, Hinweis auf Matchday, App-Name und Beschreibung, keine FCSG-/Otmar-Bilder im V2-Offline-Paket | Test, der ohne Sperre fehlschlägt; V1 unverändert; Browser-Prüfung aller V2-Routen |
| 2 | Gestaltungsgrundlage: Tokens, `@layer`-Grundschicht, Kontrastregeln, Ersatzschrift, ein Navigationsstil; Korrektur von `--font-display` in `style.css` als eigener PR | Layout-Audit ohne neue Befunde, axe ohne Verstösse |
| 3 | Startseiten-Zustände, einheitliche Spielkarte, Live-Leiste, Tabelle mit fixierter Teamspalte, Formkurve, Handball-Diagramme | Zustände mit gestellter Uhr geprüft |
| 4 | Begleitfunktionen: Kalender-Abo, «Wo läuft das Spiel?», Regel-Erklärer, ÖV-Abfahrten, Offline-Spieltagspaket, «Ich war dabei», Push-Neuaufbau, Spieler des Spiels, Auswärtsführer, Arena-Karte | je Funktion Test und Browser-Prüfung |
| 5 | Mit dem Club: Arena-Fakten, Ticket-Links, Topscorer-Zähler, Matchprogramm, Bildrechte | schriftliche Zustimmung |

Datenschutzerklärung und Impressum mit Vermerk «inoffizielle Fan-App» gehören in Phase 1 oder 2.

## Bewusst nicht vorgesehen

Lärmmesser, Fanwand, Navigation in der Halle, Wartezeiten, Bestellen vom Sitzplatz, Chats, öffentliche Ranglisten, Mitgliederkarte ohne Vereinsdaten, flächendeckendes Glas und 3D-Symbole, native Live Activities, Wallet-Pässe.

## Offene Punkte

- Haltestelle und Linien zur BBC Arena für die ÖV-Abfahrten.
- Ob die SHV-Daten Wurfpositionen und Daten von Nachwuchs- und Frauenteams liefern.
- Kontakt zum Club für Arena-Fakten, Ticket-Links und Bildrechte.
