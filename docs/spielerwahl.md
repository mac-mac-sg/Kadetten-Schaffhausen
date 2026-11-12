# Spielerwahl «Spieler des Matchs»

Stand: 12. November 2026. Konzept und Umsetzung der Fan-Wahl in der Kadetten App (Designsprache [«Schnitt»](kadetten-app-design.md)). Umgesetzt ist **Variante C**. Seit dem 12. November 2026 ist die Wahl **nur während des Spiels** offen, vom Anpfiff bis zum Schlusspfiff (Entscheid des Eigentümers). Die frühere Karte «Dein Favorit?» (merken statt abstimmen) entfällt.

## Ablauf

| Phase | Was die Fans sehen |
|---|---|
| Vor Anpfiff | nichts zu wählen; die Wahlseite sagt «öffnet mit dem Anpfiff» |
| Live | Karte «Wähle den Spieler des Matchs» auf der Titelseite, im Ticker und in der Statistik, sobald die Live-Quelle die Spieler der Kadetten meldet. Wahlseite mit Vorschlägen nach den Live-Werten; Stimme abgeben, eine pro Gerät. Kein Zwischenstand. |
| Schlusspfiff | Die Wahl schliesst, sobald die Live-Quelle das Spiel nicht mehr als laufend meldet (spätestens 3 Stunden nach dem geplanten Anpfiff oder mit dem bestätigten Resultat im Datenstand). |
| Ergebnis | nach dem Schlusspfiff auf der Spielseite: Anteile je Spieler, eigene Stimme markiert |

## Wahlseite (Variante C)

Kopfband mit Titel, darunter **Vorschläge nach Spieldaten** als Zeilen mit Porträt, Nummer, Name, gemeldeten Werten und einer Begründung: «Meiste Tore», «Zweitmeiste Tore» (oder «Gleich viele Tore») und «Meiste Paraden». Alle weiteren Spieler stehen eingeklappt darunter, geordnet nach Beitrag. Ohne gemeldete Werte gibt es keine Vorschläge und alle Spieler sind sichtbar; Begründungen werden nie erfunden. Die Auswahl ist ein Tipp auf die Zeile (Streifenrand, «Gewählt»), die Stimme geht erst mit dem festen Knopf «Stimme für <Nachname> abgeben» raus. Ein früher gemerkter Favorit ist vorgewählt und trägt das Etikett «Dein Favorit». Unter der Liste steht «Inoffizielle Fan-Wahl, keine Auszeichnung des Vereins».

## Technik

| Teil | Datei |
|---|---|
| Vorschläge, Nummernzuordnung (reine Funktionen) | `src/kadetten/js/wahl.js` |
| Favorit je Spiel, nur lokal (`v2:app-picks`, höchstens 200 Spiele, Eingaben geprüft) | `src/kadetten/js/personal.js` |
| Live-Hinweis und Wahlliste | `src/kadetten/js/views/bericht.js` (`liveVoteCard`, `voteSection`) |
| Einbindung in Spielseite und Titelseite | `views/spiel.js`, `views/jetzt.js`, `main.js` |
| Wahl selbst (Fenster, Kandidaten aus dem Live-Stand, eine Stimme pro Gerät) | `server/app-fan.mjs` |

Es gibt keinen neuen Schreibweg; geändert sind nur Zeitfenster und Herkunft der Kandidaten.

## Regeln, die immer gelten

- Keine Zwischenstände und keine Live-Rangliste, damit niemand dem Stand hinterherwählt.
- Vorschläge nach Daten (Tore, Paraden), nie nach Meinung.
- Keine Personendaten; Gerätekennung zufällig und nur gehasht im Datendienst.
- Heim- und Auswärtsspiele gleich.

## Im Datendienst

Die Wahl ist offen, solange `/api/live` ein laufendes Kadetten-Spiel meldet und der geplante Anpfiff höchstens 15 Minuten in der Zukunft und höchstens 3 Stunden zurück liegt; ein bestätigtes Resultat im Datenstand schliesst sie. Kandidaten sind die Spieler der Kadetten aus dem Live-Stand (SHV oder EHF). Die Liste wird unter `app/votes/<id>/candidates` gesichert (60 Tage), damit das Ergebnis nach dem Schlusspfiff alle Kandidaten zeigt, auch eingewechselte. Fällt die Live-Quelle aus, bleibt die Wahl geschlossen statt zu raten. Eine Stimme pro Gerät, höchstens sechs pro Anschluss. Ältere Wahlen ohne gesicherte Liste zeigen die Kandidaten aus dem Spielbericht.

## Nicht umgesetzt

- **Push «Wahl offen»:** braucht eine Änderung im Datendienst (neuer Push-Typ im Push-Monitor und Neubereitstellung des Workers). Bis dahin weisen Titelseite und Spielseite auf die offene Wahl hin.
- **Stimme ändern:** Die Stimme ist endgültig; Ändern bis zum Schlusspfiff bräuchte einen eigenen Auftrag.
- Entwürfe der Varianten A (Karten) und B (Bühne) liegen im Design-Canvas; sie wurden nicht gewählt.
