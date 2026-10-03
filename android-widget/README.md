# Kadetten Widget für Android

Separate Begleitapp ab Android 8.0 (API 26). Kein WebView und keine Kopie der Web-App. Vorschau, Matchday und bestätigte Endresultate erscheinen als 4×2-Widget; Antippen öffnet die vorhandene Pages-Spielseite. Der öffentliche Sites-Datendienst wird ausschliesslich per GET gelesen, ohne Login, Tokens oder Schreibzugriffe.

## Installation

Die GitHub Action «Android Widget» erzeugt die installierbare APK im Artefakt «Kadetten-Widget-Android». ZIP herunterladen, entpacken, `app-debug.apk` auf Android öffnen und die Installation für diese Downloadquelle zulassen. Danach «Kadetten Widget» öffnen und «Widget hinzufügen» wählen, oder den Homescreen lange drücken → Widgets → Kadetten Widget.

## Daten und Aktualisierung

- WorkManager plant eine Aktualisierung alle 30 Minuten. Android kann sie im Energiesparmodus verzögern; kein sekundengenauer Hintergrund-Ticker.
- Das Refresh-Symbol fordert eine sofortige Aktualisierung an. Antippen der Karte öffnet das Spiel inklusive des bestehenden Live-Tickers in der Web-App.
- Spieltag und Anspielzeit nutzen Europe/Zurich, inklusive Sommer-/Winterzeit. Ein heute gespieltes Resultat bleibt bis zum nächsten Tag sichtbar.
- Nur vollständig validierte Antworten ersetzen den letzten gültigen Stand. Fehlende Tore werden nie als 0 interpretiert. Bei Fehlern bleibt der gespeicherte Stand mit Offline-Hinweis; beim ersten Abruf ohne Netz wird kein Spiel erfunden.
- Logos werden nur über geprüfte lokale Asset-Pfade auf der bestehenden Pages-Domain geladen. Cache und letzte Daten bleiben auf dem Gerät. Keine Analyse- oder Werbedienste.
- Aufgaben werden entfernt, sobald das letzte Widget entfernt wird.

## Entwicklung

Java 17, Android SDK 35, Gradle 8.9; Android Gradle Plugin 8.7.3. Mit installiertem Gradle: `gradle testDebugUnitTest lintDebug assembleDebug` im Ordner `android-widget`. Android Studio kann das Projekt direkt öffnen. Die getrennte GitHub Action bringt Gradle und Android SDK mit. Node- und Pages-Builds bleiben unverändert.

Die erste APK ist eine Debug-signierte Testversion. Für dauerhaft kompatible APK-Updates/Play-Veröffentlichung benötigt das Projekt einen dauerhaft gesicherten privaten Signierschlüssel und entsprechend eingerichtete CI-Secrets. Schlüssel gehören niemals ins Repository. Bei neuem Debug-Signierschlüssel ist vor einer Folgeinstallation das Entfernen der bisherigen Begleitapp erforderlich; die Web-App ist davon nicht betroffen.
