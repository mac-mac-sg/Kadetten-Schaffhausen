# Spielerwahl «Spieler des Matchs»

Stand: 8. November 2026. Konzept und Umsetzung der Fan-Wahl in der Kadetten App (Designsprache [«Schnitt»](kadetten-app-design.md)). Umgesetzt ist **Variante C, Stufe 1**. Stufe 2 ist nicht umgesetzt und braucht einen eigenen Auftrag.

## Ablauf

| Phase | Was die Fans sehen |
|---|---|
| Vor Anpfiff | nichts zu wählen |
| Live | Karte «Dein Favorit?» im Ticker und in der Übersicht: bis zu drei Chips mit den besten eigenen Torschützen (Rückennummer und Nachname), «Alle» blendet den ganzen Kader ein. Antippen merkt den Favoriten, nochmals antippen entfernt ihn. Es wird nichts abgestimmt. |
| Abpfiff | Sobald der bestätigte Bericht vorliegt, öffnet die Wahl. Hinweis auf der Titelseite und in der Statistik; der Favorit ist vorgewählt. |
| Wahlfenster | Wahlseite mit Vorschlägen nach Spieldaten; Stimme abgeben, eine pro Gerät. |
| Ergebnis | erst nach Schluss: Anteile je Spieler, eigene Stimme markiert |

## Wahlseite (Variante C)

Kopfband mit Titel, darunter **Vorschläge nach Spieldaten** als Zeilen mit Porträt, Nummer, Name, gemeldeten Werten und einer Begründung: «Meiste Tore», «Zweitmeiste Tore» (oder «Gleich viele Tore») und «Meiste Paraden». Alle weiteren Spieler stehen eingeklappt darunter, geordnet nach Beitrag. Ohne gemeldete Werte gibt es keine Vorschläge und alle Spieler sind sichtbar; Begründungen werden nie erfunden. Die Auswahl ist ein Tipp auf die Zeile (Streifenrand, «Gewählt»), die Stimme geht erst mit dem festen Knopf «Stimme für <Nachname> abgeben» raus. Der Favorit aus dem Live-Spiel trägt das Etikett «Dein Favorit». Unter der Liste steht «Inoffizielle Fan-Wahl, keine Auszeichnung des Vereins».

## Technik

| Teil | Datei |
|---|---|
| Vorschläge, Live-Chips, Nummernzuordnung (reine Funktionen) | `src/kadetten/js/wahl.js` |
| Favorit je Spiel, nur lokal (`v2:app-picks`, höchstens 200 Spiele, Eingaben geprüft) | `src/kadetten/js/personal.js` |
| Karte «Dein Favorit?» und Wahlliste | `src/kadetten/js/views/bericht.js` (`pickSection`, `voteSection`) |
| Einbindung in Spielseite und Titelseite | `views/spiel.js`, `views/jetzt.js`, `main.js` |
| Wahl selbst (Fenster, Kandidaten, eine Stimme pro Gerät) | `server/app-fan.mjs`, **unverändert** |

Der Favorit verlässt das Gerät nie. Es gibt keinen neuen Schreibweg und keine Änderung am Datendienst.

## Regeln, die immer gelten

- Keine Zwischenstände und keine Live-Rangliste, damit niemand dem Stand hinterherwählt.
- Vorschläge nach Daten (Tore, Paraden), nie nach Meinung.
- Keine Personendaten; Gerätekennung zufällig und nur gehasht im Datendienst.
- Heim- und Auswärtsspiele gleich.

## Heute im Datendienst (unverändert)

Die Wahl öffnet 90 Minuten nach Anpfiff und nur, wenn Resultat und Spielbericht bestätigt sind. Kandidaten stammen aus dem Bericht. Sie schliesst 26 Stunden nach Anpfiff. Eine Stimme pro Gerät, höchstens sechs pro Anschluss. Das Ergebnis erscheint erst nach Schluss.

## Nicht umgesetzt

- **Push «Wahl offen»:** braucht eine Änderung im Datendienst (neuer Push-Typ im Push-Monitor und Neubereitstellung des Workers). Bis dahin weisen Titelseite und Spielseite auf die offene Wahl hin.
- **Stufe 2 (Wahl ab der 2. Halbzeit):** Kandidaten aus der Live-Aufstellung, Stimme bis zum Schluss änderbar. Erweitert den bestehenden Schreibweg in `server/app-fan.mjs` (Zeitfenster, Kandidaten aus Live-Daten, Ändern statt Sperren); braucht den ausdrücklichen Auftrag des Eigentümers (AGENTS.md).
- Entwürfe der Varianten A (Karten) und B (Bühne) liegen im Design-Canvas; sie wurden nicht gewählt.
