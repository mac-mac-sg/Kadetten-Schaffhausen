# Etappe 2: separater Testhost und Eigentümer-Login

Stand: Implementierung vorbereitet; kein Cloudflare-Konto, Bucket oder Access-Projekt eingerichtet. Die öffentliche App, Sites-Secrets und laufende Datenautomation bleiben auf dem bisherigen Host. Diese Änderung ist kein Produktionswechsel.

## Zielarchitektur für die Testumgebung

Cloudflare Workers mit R2 passt zum bestehenden Worker und Objektspeicher. `wrangler.staging.example.json` ist eine manuell zu aktivierende Testkonfiguration, keine automatische Veröffentlichung. Der Build nutzt esbuild; JWTs werden mit jose verifiziert. Abhängigkeiten und Versionen sind im Lockfile festgehalten.

1. Im eigenen Cloudflare-Konto einen **separaten** R2-Bucket `kadetten-staging-data` anlegen. Keine produktiven Sites-Bindings übernehmen.
2. Beispiel nach `wrangler.staging.json` kopieren (ignoriert). Worker-/Bucketnamen bei Bedarf anpassen. Wrangler im eigenen Konto installieren/authentifizieren und für diese Datei konfigurieren.
3. `KADETTEN_OWNER_EMAIL`, `KADETTEN_ACCESS_ISSUER` (z. B. `https://TEAM.cloudflareaccess.com`) und `KADETTEN_ACCESS_AUD` als Worker-Laufzeitwerte setzen. Keine persönlichen E-Mails oder Zugangsschlüssel ins Repository schreiben. `KADETTEN_AUTH_PROVIDER=cloudflare-access` steht bereits in der Vorlage. Bis zur vollständigen Einrichtung bleiben Browser-Schreibzugriffe gesperrt.
4. Cloudflare Access für die **exakte Testdomain und `/admin/*`** einrichten, mit Allow-Regel ausschliesslich für die Eigentümer-E-Mail. Anmeldung z. B. per One-time PIN. Die Daten-/Lesewege bleiben öffentlich. Einen ausreichenden Session-Zeitraum wählen; direkte API-Aufrufe erhalten keine Sonderrechte.
5. Erst die Testumgebung manuell veröffentlichen. Zum Anmelden `/admin/login` öffnen. Access setzt sein Cookie; die App verifiziert bei `/api/access` und `/api/refresh` die JWT-Signatur, den konfigurierten Aussteller, die App-Audience, Ablaufzeit, Subject und Eigentümer-E-Mail. Nach erfolgreicher Anmeldung führt der Worker zurück auf die Startseite. Auf öffentlichen API-Wegen kann der signierte `CF_Authorization`-Cookie genutzt werden, auch ohne von Access hinzugefügten Assertion-Header.
6. Für spätere Automationsproben einen **neuen** zufälligen Update-Schlüssel erzeugen; ausschliesslich seinen SHA-256-Digest als Secret `KADETTEN_UPDATE_KEY_SHA256` hinterlegen. Den ursprünglichen Sites-Servicezugang niemals übernehmen. Bestehenden Zweistundentask noch nicht umstellen.

## Vor einer Testveröffentlichung prüfen

- Öffentliche News, Spielplan, Tabelle und Kader erreichbar; `/api/access` anonym `canUpdate: false`.
- Gefälschte Sites-/Cloudflare-E-Mailheader verleihen keine Berechtigung.
- Eigentümer-Login auf `/admin/login`; danach `canUpdate: true` und Aktualisieren-Button sichtbar.
- Fremde E-Mail, falsche Audience, abgelaufene/ungültig signierte Tokens und fehlende Schlüssel bleiben gesperrt.
- Cross-Origin-Schreibrequests und direkte anonyme `POST /api/refresh` scheitern vor Speicherzugriffen.
- Testdaten landen ausschliesslich im Testbucket. Ohne Datenimport werden Startdaten angezeigt, vollständige Artikel liefern 404. Archivimport und Mengen-/Hashvergleich folgen in Etappe 4.

Lokale Authentifizierungstests verwenden selbst erzeugte RSA-Schlüssel und einen simulierten JWKS-Endpunkt. Sie belegen die Prüfung im Code; ein realer Login und die Cookie-/Access-Regeln müssen auf der echten Testdomain zusätzlich geprüft werden.

## Bestehende Sites-Veröffentlichungen dieses neuen Codes

Vor Übernahme dieses Branchs in den produktiven Sites-Host müssen dort zusätzlich `KADETTEN_AUTH_PROVIDER=sites` und `KADETTEN_SITES_ORIGIN=https://kadetten.ma-ra10.chatgpt.site` konfiguriert werden. Bestehende Owner-E-Mail und Update-Key-Digest beibehalten. Fehlende Providerkonfiguration deaktiviert bewusst den Browser-Schreibzugang. Sites-Header sind ausschliesslich hinter dem Sites-Gateway vertrauenswürdig; ein Hostwechsel muss den Provider auf `cloudflare-access` setzen. Niemals Sites-Zugang durch ungeschützte Header auf einem anderen Host nachbilden.

## Offener Einrichtungsschritt

Zum echten Testdeployment werden das Zielkonto und dessen Worker-/R2-/Access-Konfiguration benötigt. Im Repository und in GitHub Actions sind keine Cloudflare-Zugänge hinterlegt. Die derzeitige CI prüft und baut ausschliesslich. Automatische Veröffentlichungen, Produktionsdomain und Datenautomation sind spätere Etappen.

## Referenzen

- [Cloudflare: JWT verifizieren](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Cloudflare: Wrangler-Konfiguration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [jose: JWTVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md)
