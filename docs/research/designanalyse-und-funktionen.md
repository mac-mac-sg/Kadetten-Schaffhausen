# Kadetten-App gewinnt durch Reduktion und Spieltag-Zustände

> **Einordnung (4.11.2026):** Dieser Recherchebericht ist die Grundlage der Kadetten-App unter `/v2/`. Entschieden ist: Die V1 unter `/` bleibt als «Matchday» mit allen drei Vereinen bestehen. Der Rückbau auf die Kadetten gilt deshalb nur für die V2; gemeinsame Module, Daten und Server-Endpunkte für FCSG und St. Otmar bleiben. Verbindlich ist die Spezifikation in [docs/kadetten-app.md](../kadetten-app.md).

Die führenden Vereins- und Sport-Apps der Jahre 2023 bis 2026 gewinnen nicht durch mehr Effekte. Sie reduzieren zuerst ihr visuelles Durcheinander auf wenige feste Mittel und verstärken dann ein einziges, unverwechselbares Erkennungszeichen. Liverpool hat rund 30 Rottöne und 50 Schriften auf zwei Hausschriften eingedampft, Dortmund baut sein ganzes System auf einem 34-Grad-Winkel auf, Apple Sports setzt auf dunkle, typografische Flächen mit Teamfarben als blossem Akzent. Zugleich gilt die Darstellung von Live-Daten inzwischen als eigene Gestaltungsdisziplin: Die NBA-App gewann 2026 einen Apple Design Award, und Apple Sports wird vor allem wegen seiner Live-Anzeige auf dem Sperrbildschirm genutzt. Für die Kadetten-V2 folgen daraus drei Dinge. Erstens sollte der visuelle Rückbau dem funktionalen Rückbau auf einen Club folgen: ein Orange, ein Schwarz, Anton für Spielstände und Titel, eine ruhige Textschrift mit Tabellenziffern, ein Handball-Erkennungszeichen und ein Token-Satz, der die heute rund 500 aus V1 durchsickernden Sonderregeln ersetzt. Zweitens sollte die Startseite sichtbar mit dem Spielzustand wechseln (Normalbetrieb, Spieltag, Live, Nachspiel), und Glaseffekte gehören nur auf kleine, schwebende Bedienelemente mit undurchsichtiger Rückfallebene. Drittens braucht die App bei den Funktionen weniger Spektakel und mehr Begleitung. Die stärksten neuen Bausteine sind ÖV-Abfahrten nach dem Spiel, ein Kalender-Abo, ein Offline-Spieltagspaket, ein Besuchstagebuch «Ich war dabei» mit Saisonrückblick, ein Regel-Erklärer für Neulinge sowie Arena-, Barrierefreiheits- und Auswärtsinfos. Fast alles davon kommt ohne Club aus. Lärmmesser, Fanwand, Indoor-Navigation und Mobile Ordering sollte die App bewusst weglassen.

> **Hinweis zur Evidenz.** Die zugrunde liegende Recherche (Stand 4.11.2026) konnte viele Primärseiten nicht im Volltext laden. Gesperrt waren unter anderem apple.com, m3.material.io, nngroup.com, web.dev, w3.org, designweek.co.uk und mehrere Club-Seiten. Die meisten Belege beruhen deshalb auf Suchauszügen der verlinkten Seiten. Kein Screen einer Vereins-App wurde direkt angesehen. In diesem Bericht gilt: Aussagen mit Quellenlink sind **belegt** (mindestens per Suchauszug). Mit **[Ableitung]** markierte Sätze sind eigene Schlussfolgerungen aus den Belegen. Mit **[unbelegt]** markierte Sätze beruhen auf Fachwissen ohne Quelle aus dieser Recherche. Mit **[Repo]** markierte Angaben stammen aus einer Prüfung des Repositorys, mit **[eigene Messung]** markierte aus einer eigenen Kontrastberechnung.

## Clubs reduzieren erst und setzen dann ein einziges Erkennungszeichen

Die am besten dokumentierten Club-Arbeiten der letzten drei Jahre sind Identitätssysteme. Einzelne App-Screens stehen dort nicht im Vordergrund. Bulletproof fand bei Liverpool **rund 30 Rottöne, 50 Schriften und 20 Bildstile** vor und formulierte den Auftrag als «simplify and amplify» ([Design Week](https://www.designweek.co.uk/bulletproof-on-simplifying-and-amplifying-liverpool-fcs-brand/)). Daraus wurden zwei Hausschriften, **LFC Sans und LFC Serif** ([DesignRush](https://www.designrush.com/best-designs/logo/liverpool)). Dortmund ging den umgekehrten Weg: Das Studio nahm ein einziges Motiv und spielte es überall durch. Blaze Type baute die Schriftfamilie um einen **34-Grad-«angle of attack»**, der aus der Tribünengeometrie stammt. Die Titelschrift «BVB Classic» hat Alternativzeichen mit 34-Grad-Schnitten und ist mit einer funktionalen Textschrift gepaart ([Blaze Type](https://blazetype.eu/case-studies/borussia-dortmund/); [Creative Review](https://www.creativereview.co.uk/borussia-dortmund-design-identity/)). Arsenal verteilt drei exklusive Schriften auf drei Rollen: **Northbank für das Team und «die Intensität der 90 Minuten», Chapman für die Community, Rocastle für Kultur** ([Fast Company](https://www.fastcompany.com/91624387/arsenal-rocastle-new-font)). Die Bundesliga beschreibt **Motion Design als «treibende Kraft»** ihrer Marke, mit modularen Bausteinen und festen Bewegungsprinzipien ([Mutabor](https://www.mutabor.de/en/work/dfl-bundesliga-brand-relaunch/)). Für die NBA-App entwickelte Brand New School ein **modulares Motion-System mit universellem Raster** ([Brand New School](https://www.brandnewschool.com/work/nba-app-this-is-happening)).

Bei den eigentlichen Produkten ist die Lage dünner. Die Barça-App gewann 2025 als erste Fussballclub-App einen Webby (People's Voice) ([FC Barcelona](https://www.fcbarcelona.com/en/club/news/4252520/fc-barcelona-official-app-wins-webby-award)). Die Website von Athletic Club wurde 2025 für ihre mobile Nutzererfahrung als Webby Honoree ausgezeichnet ([Athletic Club](https://www.athletic-club.eus/en/news/2025/05/06/international-recognition-for-athletic-club-s-website)). Jenseits des Fussballs ist das klarste Signal der Apple Design Award 2026 in der Kategorie Innovation für **«NBA: Live Games & Scores»**. Gewürdigt wurden Live-Statistiken, ein flüssiges Onboarding und eine gelungene Liquid-Glass-Umsetzung ([MacStories](https://www.macstories.net/news/2026-apple-design-awards-winners-announced/)). Die Datenapp **Tide Guide** gewann im selben Jahr die Kategorie Visuals & Graphics ([9to5Mac](https://9to5mac.com/2026/06/02/apple-reveals-apple-design-awards-app-and-game-winners-for-2026/)). Apple Sports zeigt die Gegenrichtung zum Effekt: Die App ist bewusst schlicht und schnell ([MacRumors](https://www.macrumors.com/2024/02/21/apple-sports-app-simplicity/)), dunkel und typografisch, mit Teamfarben als Akzent ([Daring Fireball](https://daringfireball.net/2024/02/apple_sports)). Rezensenten nennen die Live Activities auf dem Sperrbildschirm «den eigentlichen Grund», die App zu nutzen ([MacRumors](https://www.macrumors.com/2024/09/16/apple-sports-app-live-activities/)).

Für die Kadetten passt die Übertragung gut. **[Ableitung]** Anton ist bereits eine schmale Titelschrift im Sinne von Arsenals «Team»-Rolle. Was fehlt, ist die ruhige Gegenstimme für Text, Tabellen und Statistik. Heute setzt `style.css` dafür nur `system-ui` ein **[Repo]**. Eine selbst gehostete Textschrift mit Tabellenziffern (`font-variant-numeric: tabular-nums`) würde Spielstände und Tabellen beruhigen. Auch mit `system-ui` lassen sich Tabellenziffern konsequent erzwingen. Ein eigener Schriftschnitt ist für eine Fan-PWA unerreichbar, wohl aber ein Erkennungszeichen nach dem Prinzip des BVB-Winkels. Denkbar sind ein schräger Schnitt oder eine Unterstreichung, abgeleitet von der 9-Meter-Linie (Freiwurflinie) oder vom Torraum. Dieses Zeichen würde einheitlich auf Abschnittstitel, Spielstand-Leiste und Teilen-Bild angewendet. Bei den Farben gilt das Liverpool-Prinzip: ein festes Orange, ein festes Schwarz, sonst neutrale Flächen. Das Orange ist Akzent für Hauptaktion, Live-Marker und aktiven Tab. Vollflächig erscheint es nur in «Übernahme-Momenten» wie Spieltag, Sieg oder Titel.

Das Repository zeigt, dass dieser Rückbau auch technisch fällig ist. `v1-theme.css` enthält **454 Regeln mit dem Selektor `html:not([data-design='v2'])`**, `enhancements.css` weitere 57 **[Repo]**. Genau diese Schicht hat die bekannten Layoutfehler verursacht. Die V2 arbeitet zudem mit mehreren Eckenradien nebeneinander: 22 px und 16 px als Tokens, 14 px bei den Statistik-Kacheln, dazu viele Einzelwerte für Ticket, Band, Orbit und Status **[Repo]**. In `style.css` verweist die Variable `--font-display` auf sich selbst (`--font-display: var(--font-display), Impact, …`). Nach CSS-Regeln ist das ein Zyklus, der die Variable ungültig macht. In V2 fängt `matchday.css` das ab, im V1-Pfad bleibt es ein Fehler **[Repo]**. Ein kleiner Token-Satz mit eigener V2-Grundschicht würde diese Altlasten gleich mit beseitigen.

## Glas gehört auf kleine Bedienelemente, Inhalte bleiben undurchsichtig

Beide Plattformen haben 2025 die flache Gestaltung hinter sich gelassen, und beide ernteten dafür Kritik. Apples Liquid Glass (iOS 26) legt durchscheinende Bedienelemente über die Inhalte. Die Nielsen Norman Group hielt fest, die Gestaltung «verdecke Inhalte, statt sie ins Zentrum zu stellen» ([NN/g via Mirror](https://hn.jakechampion.name/reader/https://www.nngroup.com/articles/liquid-glass)). Bei schwebenden Tab-Leisten verschwinde der aktive Tab oft im Hintergrund ([pimpmytype](https://pimpmytype.com/?p=23406)). Apple machte das Glas schon in den Betas undurchsichtiger und führte mit iOS 26.1 eine Einstellung «Getönt» ein, die laut Apple **«die Deckkraft erhöht und mehr Kontrast hinzufügt»** ([MacRumors](https://www.macrumors.com/how-to/ios-26-1-reduce-liquid-glass-effects/)). Google stützt Material 3 Expressive auf **46 Studien mit über 18'000 Teilnehmenden**. Nach eigener, nicht unabhängig geprüfter Angabe fanden Nutzer zentrale Elemente wie den Senden-Knopf **bis zu viermal schneller** ([Dezeen](https://www.dezeen.com/2025/05/28/google-ushers-in-age-of-expressive-interfaces-with-material-design-update/amp/)). Die Bewegung beruht dort auf Federphysik: «Spatial springs» steuern Position und Grösse, «Effects springs» Farbe und Deckkraft ([supercharge.design](https://supercharge.design/blog/material-3-expressive)). Airbnb führte im Mai 2025 ein «dimensionales» System mit 3D-Icons und animierten Elementen ein ([It's Nice That](https://www.itsnicethat.com/articles/airbnb-app-redesign-140525)). Bloomberg sah darin zusammen mit Liquid Glass den «Todesstoss» für flaches Design ([Bloomberg](https://www.bloomberg.com/news/articles/2025-06-13/apple-airbnb-ditch-flat-app-icons-for-new-3d-ui-design)). Kurz darauf kamen KI-generierte Imitations-Iconsets auf den Markt. Das Muster wird also rasch beliebig ([Product Hunt BnBicons](https://www.producthunt.com/products/bnbicons)).

Daraus lassen sich drei Übertragungen ableiten **[Ableitung]**. Die Bedienleiste schwebt als eigene Ebene über randlosen Fotos, das kann die V2 mit ihrem schwebenden Dock schon. Unter jedem `backdrop-filter` muss aber eine fast deckende Grundfarbe liegen, und bei `prefers-reduced-transparency` sowie `prefers-contrast: more` wird die Leiste vollständig undurchsichtig. Der aktive Tab braucht eine Markierung, die nicht vom Hintergrund abhängt, etwa eine gefüllte Pille in Orange mit dunkler Schrift. Zweitens lohnt sich die Lehre von M3 Expressive: Eine einzige Hauptaktion pro Ansicht wird durch Grösse, Farbe und Form hervorgehoben, etwa «Ticket» am Spieltag oder «Live verfolgen» während des Spiels. Drittens sollte die App den Dimensionaltrend nur punktuell aufnehmen. Ein paar hochwertige Illustrationen für leere Zustände oder einen Sieg wirken. 3D-Icons in der ganzen Oberfläche wären teuer und bald austauschbar. `backdrop-filter` über scrollenden Fotos ist auf mittleren Android-Geräten rechenintensiv **[unbelegt]**. Der Effekt sollte deshalb auf die feste Leiste beschränkt bleiben.

## Die Startseite wechselt mit dem Spielzustand

Die Ligen bauen eigene Live-Ebenen. Die Premier League hat 2025 App und Website um «myPremierLeague», «Matchday Live» und **«Matchday Stories»** neu aufgebaut, einen vertikalen Story-Feed pro Spiel in Echtzeit ([Broadcast Now](https://www.broadcastnow.co.uk/tech-innovation/fan-engagement-premier-league-overhauls-app-and-website/5206642.article)). Reine Datenapps bleiben bewusst nüchtern: FotMob gilt als «frei von grellen Grafiken», OneFootball als weniger überladen als das «gedrängte» Sofascore ([The Daily Star](https://www.thedailystar.net/life-living/news/top-5-apps-football-updates-4226806)). Handballclubs zeigen auf der Startseite sichtbar Tabellen. THW Kiel kombiniert Highlights, Bundesliga-Tabelle und News ([THW Kiel](https://thw-handball.de/)), die Füchse Berlin stellen eine Champions-League-Tabelle neben Ticketlinks ([Füchse Berlin](https://fuechse.berlin/o.red.t/start.php)). Apples Gestaltungsrichtlinien enthalten für Live Activities ein Sportresultat-Beispiel in kompakter, minimaler und erweiterter Form ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities.md)). Für eine PWA bleiben diese Flächen allerdings verschlossen. Laut IBM nutzen **82 % der Stadionbesucher Apps während eines Events**, 35 % der App-Nutzer für Echtzeit-Updates ([IBM](https://newsroom.ibm.com/2025-08-18-ibm-study-sports-fans-demand-more-dynamic-digital-content,-powered-by-ai)).

Die Magazin-Startseite der V2 ist darum richtig, aber nur für den Normalbetrieb. **[Ableitung]** Die Gestaltung sollte die schon empfohlene Zustandsmaschine (Normalbetrieb, Spieltag ab etwa T−24 h, Live, Nachspiel bis etwa T+24 h) sichtbar machen. Im **Normalbetrieb** führt das Foto: ein Titelbild mit Verlaufsschleier, die nächste Partie als kompakte Karte, News, ein Tabellenausschnitt mit hervorgehobener Kadetten-Zeile. Am **Spieltag** übernimmt das Spieldeck den Platz des Titelbilds: Wappen gegen Wappen, Countdown, Ticket als einzige hervorgehobene Aktion, darunter die Spieltagsleiste mit Anreise, Türöffnung und «Wo läuft das Spiel?». **Live** wird der Spielstand zur festen Leiste unter der Statuszeile. Sie zeigt sichtbaren Text «LIVE» und die Spielminute, nicht nur einen pulsierenden Punkt. Beim Torwechsel reicht eine kurze Hervorhebung der geänderten Ziffer von höchstens 300 ms ohne Dauerpuls. Im **Nachspiel** zeigt die Karte das Resultat, nach einem Sieg vollflächig in Orange, nach einer Niederlage neutral. Dazu kommen Bericht, Abstimmung und Teilen-Bild. Die Story-Form der Premier League ist für die Kadetten erst später sinnvoll, als «Spieltag in Bildern» mit lizenzierten Fotos. Ohne Redaktion bliebe sie leer.

Als Ersatz für Live Activities stehen der PWA Web Push, das App-Badge und eine gute In-App-Live-Leiste zur Verfügung. Push funktioniert auf iOS ab 16.4 nur für installierte Web-Apps, und die Berechtigung darf erst nach einer Nutzerhandlung angefragt werden ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Das Badge setzt eine Push-Berechtigung voraus ([WebKit Badging](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/)). Auf Android deckt das vorhandene Widget einen Teil der Lücke ab **[Repo]**.

## Tabelle, Formkurve und Statistik brauchen mehr als Farbe

Die am besten belegte Komponentenregel betrifft die mobile Tabelle. Sky UI kombiniert horizontales Scrollen mit fixierter erster Spalte und Zeilenköpfen sowie vertikales Scrollen mit fixierten Spaltenköpfen ([Sky UI](https://sky-ui.cf.sky.com/components/comparison-table/usage)). Die Nielsen Norman Group weist darauf hin, dass grosse Tabellen auf kleinen Bildschirmen zusätzliche Mittel zum Ausblenden und Umordnen von Spalten brauchen können ([NN/g](https://www.nngroup.com/videos/big-tables-small-screens/)). Auf kleinen Telefonen lassen drei fixierte Leisten fast keinen Platz mehr für die Tabelle. Empfohlen wird deshalb, nur ein Element zu fixieren ([Pravin Kumar](https://www.pravinkumar.co/blog/how-to-design-a-mobile-comparison-table-2026)). Für Formkurven ist die BBC das Lehrbeispiel. Ihre alten rot-grünen Symbole waren für farbenblinde Menschen schwer unterscheidbar. Heute zeigt sie grössere Symbole mit Buchstaben: **grün W, rot L, grau D** ([We Are Colorblind](https://wearecolorblind.com/examples/bbc-online-football-tables/)). Der Guardian codiert zusätzlich über Form und Richtung ([Visualising Data](https://visualisingdata.com/?p=16602)). Allgemein gilt für Diagramme: Muster, Symbole und Beschriftungen ergänzen die Farbe, und grössere Farbflächen sind leichter zu unterscheiden ([McMaster SPARK](https://spark.mcmaster.ca/?p=3857)).

Handball-spezifische Visualisierungsregeln fand die Recherche nicht. Die folgenden Vorschläge sind deshalb **[Ableitung]**. Die Tabelle fixiert Rang, Wappen und Kurzname, Spiele bis Punkte scrollen horizontal. Die Punkte-Spalte und die Kadetten-Zeile bleiben immer sichtbar. Die scrollbare Fläche ist per Tastatur erreichbar (`role="region"`, `tabindex="0"`). Die Formkurve zeigt **S/U/N** als Buchstaben in Formen. Die Farbe ist nur dritter Kanal, und jedes Symbol hat einen Text wie «Sieg 31:28 gegen Pfadi». Die Statistik-Kacheln der V2 lassen sich um vier Handball-Darstellungen ergänzen, die auf 360 px Breite funktionieren. Gespiegelte Balken zeigen Wurfquote, 7-m-Verwertung, Paraden und Zeitstrafen, immer mit Zahl («7/9, 78 %»). Eine Säulenreihe «Tore pro 5 Minuten» setzt die Kadetten oberhalb und den Gegner unterhalb der Achse. Eine Stufenlinie der Tordifferenz mit Nulllinie ersetzt zwei Linien in Teamfarben. Ein 3×3-Torraster für Wurfecken kommt nur in Frage, falls die Datenquelle Wurfpositionen liefert, was ungeprüft ist. Jedes Diagramm braucht eine Text- oder Tabellenalternative.

Für Spielkarte, Ticker, Spielerkarte und Countdown fehlen Primärquellen aus Sportprodukten. Die Empfehlungen folgen allgemeiner Praxis **[Ableitung]**. Die **Spielkarte** behält in allen drei Zuständen dieselbe Anatomie: Wettbewerb und Runde, Teams mit Wappen, Resultat oder Anwurfzeit, Ort und Übertragung, Status-Chip. Feste Masse verhindern Layoutsprünge, wenn der Spielstand nachlädt. Der **Ticker** sagt nur Spielstandsänderungen über eine kleine, von Anfang an vorhandene `aria-live="polite"`-Region an. Diese Regel stützte schon der frühere Bericht ([A11y Collective](https://www.a11y-collective.com/blog/aria-live/)). Neben «2 Min.» oder «7 m» steht ein «?», das zum Regel-Erklärer führt. Der **Countdown** tickt für Screenreader nicht im Sekundentakt, sondern liest sich als ruhiger Text («Anwurf in 2 Tagen»). Die **Spielerkarte** im Format 3:4 bleibt. Weil die Fotos aus lizenzierten Quellen stammen müssen, braucht sie einen würdigen Platzhalter mit Rückennummer in Anton auf Orange-Schwarz. **Ladeplatzhalter** haben die Endmasse der Inhalte und schimmern nicht, wenn reduzierte Bewegung gewünscht ist. Ein Detail aus den Belegen: Die Premier-League-Schrift musste bis hinunter in Tabellen funktionieren, mit schmalen Schnitten für lange Spielernamen ([Monotype](https://www.monotype.com/resources/case-studies/premier-league)). Für Kader mit Doppelnamen spricht das für eine schmale Variante in Tabellen. Anton allein ist dafür zu laut **[Ableitung]**.

## Tokens, Bewegung, Barrierefreiheit und Tempo sind heute Webstandard

Die W3C Design Tokens Community Group hat am **28. Oktober 2025 ihre erste stabile Spezifikation (2025.10)** veröffentlicht. Sie unterstützt Themes, mehrere Token-Dateien und moderne Farbräume wie OKLCH und Display P3 ([W3C](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)). Zalando nutzt ausschliesslich semantische Tokens mit «Colour Schemes» statt eines eigenen Themes pro Farbvariante ([Zalando Design](https://medium.com/zalando-design/bringing-more-character-to-the-zalando-design-system-with-theming-e69e18359c39)). Porsche empfiehlt, Tokens nach Bedeutung statt nach Aussehen zu benennen ([Porsche Tech Radar](https://opensource.porsche.com/porschedigital-technology-radar/methods-and-patterns/design-tokens/)). BBC Sport baut mit Grandstand auf einer ITCSS-artigen Schichtung aus Werkzeugen, Objekten (Media, Liste, Tabelle, Flag) und Hilfsklassen auf. Eigene Komponenten liefert Grandstand nicht, sie entstehen «grösstenteils aus Objekten und Hilfsklassen mit wenig eigenem Stil» ([bbc/grandstand](https://github.com/bbc/grandstand)). **[Ableitung]** Für eine Vanilla-CSS-PWA ist das ein passendes Vorbild. Sie braucht drei Token-Ebenen (Rohwerte, Bedeutung, Komponente), wenige Objekte, kein Framework und eine eigene V2-Grundschicht in `@layer`, die nicht mehr von V1-Ausschlussselektoren lebt. Mit dem Wegfall von FCSG und Otmar braucht es kein Vereins-Theming mehr. Bleiben müssen nur die Tokens `--team-home` und `--team-away` für Gegnerfarben, und die nur als kleine Akzente.

Bei der Bewegung ist die Lage für eine Mehrseiten-PWA günstig. Dokumentübergreifende View Transitions werden mit `@view-transition { navigation: auto; }` auf beiden Seiten aktiviert und laufen in **Chrome und Edge ab 126 sowie Safari ab 18.2, nicht in Firefox**. Gleichseitige Übergänge unterstützt auch Firefox ab 144 ([Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions)). Reduzierte Bewegung soll CSS-Übergänge, JS-Animationen, Scroll-Effekte und Autoplay gleichermassen betreffen ([specification.website](https://specification.website/spec/accessibility/reduced-motion/)). WCAG 2.3.3 verlangt auf Stufe AAA, dass durch Interaktion ausgelöste Bewegung abschaltbar ist ([TestParty](https://testparty.ai/blog/wcag-2-3-3-animation-from-interactions-2025-guide)). **[Ableitung]** Die V2 sollte ihre Übergänge deshalb als kleines Bewegungssystem mit Tokens festlegen. Statt Einzelanimationen gibt es dann feste Regeln für Seitenwechsel, Spielkarte zu Matchkopf, Torwechsel, Tabelleneinlauf und Siegmoment. Unter `prefers-reduced-motion` setzt das System alle Dauern auf null oder auf eine Überblendung. Federn lassen sich mit der CSS-Funktion `linear()` annähern **[unbelegt]**. Haptik ist auf iOS nur über einen Nebeneffekt von `<input type="checkbox" switch>` ab Safari 17.4 möglich, die Vibration API fehlt dort. Haptik bleibt deshalb eine progressive Ergänzung ([azukiazusa.dev](https://azukiazusa.dev/en/blog/ios-safari-web-haptics)). Für Einstellungs-Schalter liefert ein echtes `switch`-Element sie ohne Trick **[Ableitung]**.

Barrierefreiheit und Tempo haben feste Zahlen. WCAG 2.2 AA verlangt Zielflächen von **mindestens 24×24 CSS-Pixel** oder ausreichend Abstand, 44×44 sind die AAA-Stufe ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). Die V2 setzt `--v2-touch-size: 44px` bereits richtig **[Repo]**. Gute Core Web Vitals heissen **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** am 75. Perzentil ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)). Eine Ersatzschrift mit angepassten Metriken (`size-adjust`, `ascent-override` usw.) verhindert Layoutsprünge beim Schriftwechsel. Die Werte müssen pro Schriftpaar gemessen werden ([web.dev](https://web.dev/articles/css-size-adjust); [Shopify](https://shopify.dev/docs/storefronts/themes/best-practices/performance/reduce-cls-font-swapping)). Anton wird heute mit `font-display: swap`, aber ohne angepasste Ersatzschrift geladen **[Repo]**. Weil Anton deutlich schmaler läuft als Impact, springen Titel und Spielstände beim Laden sichtbar **[Ableitung]**. `theme_color` lässt sich im Manifest nicht nach Farbschema trennen, wohl aber über `<meta name="theme-color" media="(prefers-color-scheme: dark)">` ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/theme_color)). Android zeigt im kompakten Fenster eine untere Navigationsleiste und im breiten eine Seitenleiste ([Android Developers](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation)). Apples Richtlinie, nach der Tabs der Navigation dienen und nicht Aktionen auslösen, wird in der iOS-26-Debatte zitiert ([Ryan Ashcraft](https://hn.jakechampion.name/reader/https://ryanashcraft.com/ios-26-tab-bar-beef)). **[Ableitung]** Die fünf Ziele der V2-Leiste bleiben deshalb reine Navigation, «Ticket» gehört nicht hinein. Ab etwa 840 px Breite wird die Leiste zur Seitenleiste. Von den zwei umschaltbaren Leisten-Stilen sollte einer verschwinden, denn eine Wahl ohne Bedeutung kostet Pflege und Testaufwand.

Die Kontrastprüfung zeigt den kritischsten Punkt der Markenfarbe. Das Kadetten-Orange `#ff790e` erreicht auf Weiss nur **2,63:1** und erfüllt damit weder 4,5:1 für Text noch 3:1 für Bedienelemente. Weisse Schrift auf Orange hat denselben Wert. Auf der dunklen Fläche `#101310` erreicht das Orange dagegen **7,12:1**, und fast schwarze Schrift auf Orange **7,19:1** **[eigene Messung]**. Daraus folgen zwei Regeln. Erstens ist die Schrift auf Orange immer fast schwarz. Zweitens braucht der helle Modus ein dunkleres Text-Orange, etwa `#c2410c` mit 5,18:1 auf Weiss **[eigene Messung]**. Das leuchtende Orange bleibt Flächen und Grafik vorbehalten.

## Neue Funktionen begleiten den ganzen Fan-Tag

Die Belege zu den Nutzungsgewohnheiten sind eindeutig, wenn auch teils älter. Fans legen am meisten Wert auf **leicht auffindbare Inhalte (42 %)** und haben wenig Interesse an Live-Social-Feeds und integriertem Shopping oder Wetten ([NewscastStudio zu Deloitte 2023](https://www.newscaststudio.com/2023/06/28/deloitte-survey-sports-fan-engagement-broadcasting/)). Laut IBM nutzen 40 % Sport-Apps für gebündelte Informationen ([IBM](https://newsroom.ibm.com/2025-08-18-ibm-study-sports-fans-demand-more-dynamic-digital-content,-powered-by-ai)). Eine nur per Suchauszug belegte Umfrage nennt Abstürze (39,7 %) als häufigsten Grund, eine Plattform während des Spiels zu verlassen (unverifiziert). Das stützt die Linie des früheren Berichts: Zuverlässigkeit geht vor Funktionsfülle, und neue Module dürfen den Ticker nicht verlangsamen.

Im Katalog unten sind die bereits empfohlenen Bausteine mit «(bereits empfohlen)» markiert, nämlich Spieltag-Zustand mit Ticket und Arena-Guide, «Wo läuft das Spiel?», Wettbewerbskalender, Push-Neubau, Spieler-des-Spiels-Voting, Tippspiel, Topscorer-Zähler und digitales Matchprogramm. Neu sind vor allem fünf Bausteine, die belegte Muster auf die Kadetten übertragen. Der erste ist ein **ÖV-Abfahrtsboard «Nach dem Spiel heim»**. Die offene Schnittstelle OJP 2.0 von opentransportdata.swiss liefert mit einem kostenlosen Schlüssel die nächsten Abfahrten einer Haltestelle ([opendata.swiss](https://opendata.swiss/en/perma/ojp2-0@oevch)). Der Schlüssel gehört in den Worker, nicht in den Client **[Ableitung]**. Welche Haltestelle die BBC Arena bedient, ist noch zu prüfen. Der zweite ist ein **Kalender-Abo**, wie es Liverpool und Bolton anbieten. Bolton betont, dass sich der Kalender bei Terminänderungen automatisch aktualisiert ([LFC](https://www.liverpoolfc.com/news/download-now-never-miss-match-official-lfc-ecalendar); [BWFC](https://www.bwfc.co.uk/news/never-miss-matchday-ecal)). Eine ICS-Datei aus dem Daten-Build mit `VALARM` bringt Erinnerungen ganz ohne Push-Server **[Ableitung]**. Der dritte ist ein **Besuchstagebuch «Ich war dabei»**. Futbology und Match Days bauen ganze Produkte auf Check-ins, Saison- und Lebensbilanz und Abzeichen ([App Store Futbology](https://apps.apple.com/de/app/futbology/id489247406); [App Store Match Days](https://apps.apple.com/ro/app/match-days/id6475305513?l=ro)). Die Glastonbury-App macht daraus den Rückblick «My Highlights» ([App Store Glastonbury](https://apps.apple.com/gb/app/official-glastonbury-app-2025/id6502346488)). Lokal gespeichert und mit dem vorhandenen Teilen-Bild als «Deine Saison» braucht das weder Konto noch Club **[Ableitung]**. Der vierte ist ein **Regel-Erklärer «Handball verstehen»**. Die IHF-App «Rule Interpretation» richtet sich an Schiedsrichter, wenn auch ausdrücklich ebenso an Fans ([App Store IHF](https://apps.apple.com/us/app/id1632201038)). Das EHF-Profil der App nennt keinen Erklärer für Neulinge ([EHF](https://old.eurohandball.com/article/041869/EHF+launches+new+Home+of+Handball+app)). Die seit 1. Juli 2025 geltenden Regeländerungen liefern Stoff für «Was ist neu» ([EHF](https://ehfec.eurohandball.com/news/en/rules-and-regulations-adjustments-for-202526-season/)). Der fünfte sind **Arena-, Barrierefreiheits- und Auswärtsinfos**. Die FIFA-Club-WM-App hatte einen eigenen Barrierefreiheitsbereich pro Stadion ([FIFA](https://inside.fifa.com/en/news/accessibility-club-world-cup-2025-disability-social-inclusion)). BVB, Bayer 04 und HSV veröffentlichen für jedes Auswärtsspiel Faninfos zu Parkhaus, S-Bahn und Busadresse ([BVB](https://www.bvb.de/de/de/aktuelles/news/news.html/2026/10/15/Auf-nach-Koepenick-Faninfos-fuer-das-Auswaertsspiel-bei-Union-Berlin.html)).

| Fan-Aufgabe | Funktion | Aufwand | Club nötig? | Grundlage |
|---|---|---|---|---|
| **Vor dem Spieltag** | ICS-Kalender-Abo (alle Spiele, nur Heim, nur EHF) mit Erinnerung | niedrig | nein | belegt (LFC, Bolton) |
| | Spieltag-Zustand mit Ticket-Shortcut (bereits empfohlen) | mittel | nein (Ticketlinks öffentlich) | belegt (BVB, Real) |
| | «Wo läuft das Spiel?» (bereits empfohlen) | niedrig | nein | belegt (Rechtelage SHV/RED) |
| | Tippspiel ohne Einsatz (bereits empfohlen) | mittel | nein, für Preise ja | belegt (Leicester, EHF) |
| | Auswärtsführer pro QHL-/EHF-Halle (ÖV, Parkplätze, Gästesektor, Tickets) | mittel (redaktionell) | nein | belegt (BVB/Bayer/HSV-Faninfos) |
| | Offline-Spieltagspaket (Karte, Regeln, Aufstellung, Programm vorab speichern) | niedrig–mittel | nein | Ableitung (Festival-Apps) |
| **In der Arena** | Statische Arena-Karte als SVG (Eingänge, Kasse, Verpflegung, WC, Rollstuhlplätze, Velo, Parkplätze) | niedrig | empfohlen zur Prüfung | belegt (Tottenham, Chase Center) |
| | Barrierefreiheitsseite (Zugang, Lift, Begleitpersonen, ruhigere Zonen, Gehörschutz) | niedrig | ja (Fakten) | belegt (FIFA 2025) |
| | Info-Zeile Bezahlung und Fundsachen | niedrig | ja (Fakten) | Ableitung |
| **Während des Spiels** | Regel-Erklärer, kontextuell aus dem Ticker («?» neben 2 Min., 7 m, passives Spiel) | niedrig–mittel | nein | belegt (Lücke IHF/EHF) |
| | Lieblingsspieler: Hervorhebung in Ticker, Aufstellung, Statistik, optional Tor-Push | niedrig | nein | Ableitung |
| | Mehr Statistiktiefe: Läufe (z. B. 5:0), Zeitstrafen-Zeitachse, Tore pro 5 Min. | niedrig–mittel | nein | Ableitung (aus Tickerdaten) |
| | Wurfbild 3×3 und Paradenquote nach Ecke | mittel–hoch | nein, aber Daten ungeprüft | Ableitung |
| | Topscorer-Zähler «CHF 30 pro Tor» (bereits empfohlen) | niedrig | ja (Mobiliar/Club) | belegt (Mobiliar) |
| **Nach dem Spiel** | ÖV-Abfahrtsboard «Nach dem Spiel heim» (ab Abpfiff hervorgehoben) | niedrig–mittel | nein | belegt (OJP 2.0) |
| | Spieler-des-Spiels-Voting, Teilen-Bild (bereits empfohlen) | mittel | nein | belegt (THW, EHF, Tottenham) |
| | «Ich war dabei»-Knopf im Resultat-Zustand | niedrig | nein | belegt (Futbology, Match Days) |
| | Links zu offiziellen Highlights (nur verlinken) | niedrig | nein | belegt (Rechte SHV/RED) |
| **Zwischen den Spielen / Off-Season** | «An diesem Tag» aus den Historiendaten | niedrig | nein | Ableitung |
| | Kaderwechsel-Tracker inkl. Verletztenliste (nur aus offiziellen Quellen) | niedrig–mittel | nein | belegt (HCD «Medicalreport», unverifiziert) |
| | Alle Kadetten-Teams (Nachwuchs, Espoirs, Frauen) im Spielplan | mittel | nein, Datenlage ungeprüft | Ableitung |
| | Quiz zu Geschichte und Regeln (lokal) | niedrig | nein | Ableitung |
| | Club-Events, offene Trainings, Helferaufrufe | niedrig | ja (Inhalte) | belegt (Chant-App) |
| | Digitales Matchprogramm (bereits empfohlen) | mittel | ja | belegt (FCS) |
| **Community** | Besuchstagebuch mit Bilanz, Serien, Notiz, Export | niedrig–mittel | nein | belegt (Futbology, Match Days) |
| | Saisonrückblick «Deine Saison» als Teilen-Bild | niedrig | nein | belegt (Glastonbury) |
| | Lokale Abzeichen (nur zusammen mit dem Tagebuch) | niedrig | nein | belegt (Futbology) |
| | Fanclub-Verzeichnis und Fanbus-Hinweis | niedrig | ja (Fanclub) | Ableitung |
| | «Gesänge der Kadetten» offline | niedrig | ja (Fanszene) | belegt (Chant-App) |
| **Service / Personalisierung** | Push-Neubau mit Kategorien (bereits empfohlen) | mittel | nein | belegt (web.dev, WebKit) |
| | Manifest-Shortcuts (Nächstes Spiel, Tabelle, Live) | niedrig | nein | Ableitung |
| | Deep-Links zu Shop, Ticketing, Gönnerverein, Nachwuchs-Spenden | niedrig | ja (Zustimmung) | Ableitung |
| | Englisch für EHF-Gäste und internationale Spieler | mittel | nein | Ableitung, später |
| **Kinder / Barrierefreiheit** | Familienseite: Regeln kindgerecht, Gehörschutz, «Mein erstes Handballspiel», Kinderpreise | niedrig | ja (Fakten) | Ableitung |
| | Spielerkarten zum Sammeln als PDF/Teilen-Bild | niedrig | ja (Bildrechte) | Ableitung |
| | Link zum Schnuppertraining «Selber spielen» | niedrig | ja | belegt (EHF/Learn Handball, indirekt) |
| | Regel-Erklärer in Leichter Sprache, dosierte Ansagen, abschaltbare Bewegung | niedrig–mittel | nein | Ableitung |

## Spektakel ohne Nutzen gehört nicht in die App

Was Fans nachweislich wenig nutzen oder was eine Fan-PWA nicht verantworten kann, sollte bewusst fehlen. Für Lärmmesser fand die Recherche nur generische Apps und Corona-Experimente von 2020, aber keine Club-Funktion mit belegter Dauernutzung ([CNN 2020](https://amp.cnn.com/cnn/2020/05/27/sport/japan-remote-cheerer-app-scli-intl-spt/index.html)). Live-Social-Feeds stossen laut Deloitte auf geringes Interesse ([NewscastStudio](https://www.newscaststudio.com/2023/06/28/deloitte-survey-sports-fan-engagement-broadcasting/)). Selbst das Chase Center führte Mobile Ordering laut Store-Eintrag vom Dezember 2025 nur als **Beta für ausgewählte Nutzer** ([Chase Center Release Notes](https://chasecenter.com/app/release-notes)). Tottenhams Wegleitung «von der Strasse bis zum Sitz» beruht auf Bluetooth-Indoor-Ortung ([Retail Tech Innovation Hub](https://retailtechinnovationhub.com/home/2026/4/15/premier-league-club-tottenham-hotspur-lays-claim-to-best-digital-experience-in-world-football)). Für eine Halle mit rund 3'500 Plätzen wäre das unverhältnismässig **[Ableitung]**. Auch der Fall der Premier League mahnt zur Vorsicht: Eine Community-Kritik des FPL-Redesigns bemängelt prominent platzierte KI-Hilfe als Reibung ([Medium](https://medium.com/@ragesh-changam/is-the-new-fantasy-premier-league-app-a-lesson-in-how-not-to-redesign-07b71964602d)). Für die KI-Vorschauen der V2 heisst das, sie als gekennzeichneten Lesestoff anzubieten, nicht als Assistenten in jedem Screen **[Ableitung]**.

**[Ableitung]** Die Weglassliste umfasst Lärmmesser, Fanwand und Fan Cam (Moderation, Persönlichkeitsrechte), Indoor-Navigation, Warteschlangenzeiten, Mobile Ordering und Cashless-Wallet (brauchen Kassen- und Betreiberintegration), eigene Chats und öffentliche Ranglisten (Konten, Moderation), zusätzliche Live-Umfragen neben dem Spieler-des-Spiels-Voting, Abzeichen ohne Tagebuch und Wetter für den Hallenweg. Auch eine digitale Mitgliederkarte oder Treuepunkte ohne Vereinsdaten gehören dazu. Laut einer nur per Suchauszug belegten Umfrage sind Treuepunkte zwar der meistgewünschte Wunsch (65,6 %, unverifiziert), ohne Ticketing-Anbindung würden sie aber zu einem Schein-Ausweis. Gestalterisch gehören dazu flächendeckendes Glas, 3D-Icons im ganzen Interface, Dauerpuls-Animationen und zwei gleichwertige Navigationsstile.

## Roadmap: Jetzt, als Nächstes, später

Die Reihenfolge folgt einer einfachen Logik **[Ableitung]**. Zuerst kommt das Fundament, das den Rückbau auf einen Club technisch abschliesst und Layoutfehler verhindert. Danach folgen die Spieltagsfunktionen, die ohne Club funktionieren. Zuletzt kommt alles, was Zustimmung oder Daten des Clubs braucht.

| Phase | Gestaltung und Technik | Funktionen | Club nötig? |
|---|---|---|---|
| **Jetzt** | Token-Satz einführen (siehe unten). Eigene V2-Grundschicht in `@layer` statt 511 `html:not([data-design='v2'])`-Regeln. Selbstbezug von `--font-display` beheben. Text-Orange für den hellen Modus. Schrift auf Orange immer fast schwarz. Tabellenziffern überall. Ersatzschrift mit angepassten Metriken für Anton. Einen Navigationsstil streichen. Dock mit undurchsichtiger Rückfallebene für reduzierte Transparenz und hohen Kontrast. Bewegungs-Tokens mit Null-Fallback | Rückbau auf einen Club (bereits empfohlen). ICS-Kalender-Abo. Formkurve S/U/N mit Formen und Text. «An diesem Tag» | nein |
| **Als Nächstes** | Startseiten-Zustände sichtbar gestalten (Foto im Normalbetrieb, Spieldeck übernimmt am Spieltag, feste Live-Leiste mit Text-Label, Siegfläche). Einheitliche Spielkarte für drei Zustände. Tabelle mit fixierter Teamspalte. Statistik mit gespiegelten Balken, Tore pro 5 Min., Tordifferenz-Linie. Ein Erkennungszeichen (Freiwurflinien-Schnitt) festlegen. View Transitions Spielkarte zu Matchkopf als Regel. Seitenleiste ab ca. 840 px | Spieltag-Zustand, «Wo läuft das Spiel?», Wettbewerbskalender, Push-Neubau (bereits empfohlen). ÖV-Abfahrtsboard über Worker. Offline-Spieltagspaket. Regel-Erklärer mit Ticker-Verknüpfung. «Ich war dabei» und Besuchstagebuch. Lieblingsspieler. Auswärtsführer. Statische Arena-Karte. Spieler-des-Spiels-Voting (bereits empfohlen) | nein, Arena-Karte zur Prüfung empfohlen |
| **Später** | Illustrationen für leere Zustände und Siegmoment. «Spieltag in Bildern» im Story-Format mit lizenzierten Fotos. Wurfbild 3×3, falls Daten vorhanden. Englische Oberfläche. Optional DTCG-JSON als Quelle für die Tokens | Saisonrückblick «Deine Saison». Tippspiel (bereits empfohlen). Kaderwechsel-Tracker. Alle Kadetten-Teams im Spielplan. Quiz. Barrierefreiheits- und Familienseite. Gesänge, Fanclub-Verzeichnis, Events und Helferaufrufe. Topscorer-Zähler und digitales Matchprogramm (bereits empfohlen) | teils ja (Fakten, Inhalte, Sponsoren) |

### Vorschlag für einen Kadetten-Token-Satz

Der Vorschlag folgt dem dreistufigen Modell (Rohwert, Bedeutung, Komponente) und der Benennung nach Bedeutung **[Ableitung]**. Die Farbwerte für Orange und den dunklen Grund übernehmen die heutigen Werte aus `style.css` **[Repo]**. Die Werte für den hellen Modus und das Text-Orange sind Vorschläge, ihre Kontraste sind nachgerechnet **[eigene Messung]**. Alle übrigen Werte sind vor der Umsetzung zu prüfen.

```css
@layer tokens {
  :root {
    /* 1 · Rohwerte (nur hier Hex-Werte) */
    --ks-orange-500: #ff790e;   /* Markenorange: Flächen, Grafik, dunkler Modus */
    --ks-orange-700: #c2410c;   /* Text-Orange heller Modus, 5,18:1 auf Weiss */
    --ks-black-900:  #101310;   /* heutiger dunkler Grund */
    --ks-black-950:  #0b0d0b;
    --ks-paper-50:   #f7f5f0;
    --ks-white:      #ffffff;
    --ks-red-live:   #ff565f;   /* heutiger Alarmwert, nur dunkler Modus */

    /* 2 · Bedeutung, dunkler Modus als Standard */
    --color-bg:            var(--ks-black-900);
    --color-surface-1:     color-mix(in oklch, var(--ks-white) 5%, var(--color-bg));
    --color-surface-2:     color-mix(in oklch, var(--ks-white) 9%, var(--color-bg));
    --color-text:          #f5f5ef;
    --color-text-muted:    #bbc3b5;
    --color-line:          #ffffff20;
    --color-brand:         var(--ks-orange-500);
    --color-on-brand:      var(--ks-black-950);   /* nie Weiss auf Orange */
    --color-brand-text:    var(--ks-orange-500);
    --color-live:          var(--ks-red-live);
    --color-win:  #a2cf75;  --color-draw: #d5c778;  --color-loss: #f07d6c;
    --color-team-home:     var(--color-brand);
    --color-team-away:     var(--color-text-muted);  /* Gegnerfarbe nur als Akzent */
    --color-scrim: linear-gradient(to top, #000c, #0000 60%);

    /* Schrift */
    --font-display: Anton, 'Anton Fallback', Impact, sans-serif;
    --font-text:    system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --num:          tabular-nums;
    --type-score:   clamp(2.75rem, 12vw, 4.5rem);
    --type-title:   clamp(1.75rem, 7vw, 2.5rem);
    --type-section: 1.25rem;
    --type-body:    1rem;
    --type-meta:    0.8125rem;
    --type-caption: 0.75rem;

    /* Raum, Form, Fläche */
    --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
    --space-5: 24px; --space-6: 32px; --space-7: 48px;
    --radius-s: 10px; --radius-m: 16px; --radius-l: 22px; --radius-pill: 999px;
    --touch-min: 44px;
    --elev-1: 0 6px 18px #0004;
    --elev-2: 0 12px 32px #0009;
    --signature-angle: -12deg;  /* Erkennungszeichen, Wert gestalterisch festzulegen */

    /* Bewegung */
    --motion-fast: 140ms; --motion-base: 240ms; --motion-slow: 420ms;
    --ease-standard: cubic-bezier(.2, 0, 0, 1);
    --ease-spring: linear(0, .5 12%, 1.05 30%, .99 45%, 1);  /* Annäherung, zu prüfen */

    /* 3 · Komponenten (Auswahl) */
    --dock-bg:        color-mix(in oklch, var(--color-surface-2) 88%, transparent);
    --dock-blur:      blur(16px) saturate(1.4);
    --dock-active-bg: var(--color-brand);
    --dock-active-fg: var(--color-on-brand);
    --card-bg:        var(--color-surface-1);
    --card-radius:    var(--radius-l);
    --tile-radius:    var(--radius-m);
    --scorebar-h:     56px;
  }
  :root[data-theme='light'] {
    --color-bg: var(--ks-paper-50);
    --color-surface-1: var(--ks-white);
    --color-surface-2: color-mix(in oklch, var(--ks-black-900) 5%, var(--ks-white));
    --color-text: #15180f; --color-text-muted: #545c50; --color-line: #0000001a;
    --color-brand-text: var(--ks-orange-700);
    --color-live: #d92d20;  /* 4,83:1 auf Weiss */
  }
  @media (prefers-reduced-motion: reduce) {
    :root { --motion-fast: 0ms; --motion-base: 0ms; --motion-slow: 0ms; }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
    :root { --dock-bg: var(--color-surface-2); --dock-blur: none; }
  }
}
```

Die drei Radien ersetzen die heutigen 22, 16 und 14 px sowie die verstreuten Einzelwerte **[Repo]**. Die Statistik-Kacheln wechseln damit auf `--tile-radius`. Die Gewinn-, Unentschieden- und Niederlagenfarben sind die heutigen Werte und dienen nur als dritter Kanal neben Buchstabe und Form.

### Komponentenliste

| Komponente | Zweck und Regeln | Status |
|---|---|---|
| Navigationsdock | 5 Ziele, Label plus Icon, `aria-current`, aktive Pille in Orange, undurchsichtige Rückfallebene, Seitenleiste ab ca. 840 px | umbauen (ein Stil) |
| Titelbild (Cover) | Foto mit Verlaufsschleier, `fetchpriority="high"`, festes Seitenverhältnis | vorhanden, an Zustände koppeln |
| Spieldeck | Zustände Normal, Spieltag, Live, Nachspiel, Siegfläche, eine Hauptaktion | ausbauen |
| Spielkarte | eine Anatomie für drei Zustände, feste Masse, `view-transition-name` pro Spiel | vereinheitlichen |
| Live-Leiste | fest unter der Statuszeile, Text «LIVE» plus Minute, Ziffernwechsel ≤ 300 ms, ruhige Live-Region | neu |
| Status-Chip | Live, Final, Verschoben, Abgesagt, mit Text | vereinheitlichen |
| Countdown | ruhiger Text für Screenreader, grob aktualisiert | anpassen |
| Ticker-Eintrag | Ereignistyp, Minute, Stand, «?»-Link zum Regel-Erklärer, ohne Emojis | anpassen |
| Tabelle | fixierte Teamspalte, horizontales Scrollen, Kadetten-Zeile, Tabellenziffern, Tastatur-Region | anpassen |
| Formkurve | S/U/N als Buchstabe, Form und Farbe, mit Textalternative | neu |
| Statistikbalken (gespiegelt) | Wert an beiden Enden, Position vor Farbe | neu |
| Diagramm «Tore pro 5 Min.» und Tordifferenz-Linie | 360 px tauglich, mit Tabellenalternative | neu |
| Spielerkarte 3:4 | Foto oder Platzhalter mit Rückennummer, Lieblingsspieler-Stern | vorhanden, ergänzen |
| Newszeile | Bild, Titel, Quelle, Datum, KI-Kennzeichnung für Vorschauen | vorhanden |
| Spieltagsleiste | Ticket, Anreise, ÖV, «Wo läuft das Spiel?», Arena-Karte | neu |
| ÖV-Abfahrtstafel | Linie, Ziel, Abfahrt, Verspätung, Stand-Zeitpunkt | neu |
| Regelkarte | Kurzregel, Bild, «Was ist neu», Leichte Sprache als Option | neu |
| «Ich war dabei»-Knopf und Tagebuch | lokal, Bilanz, Export | neu |
| Teilen-Bild | Resultat, Spieler des Spiels, «Deine Saison» | vorhanden, ausbauen |
| Abschnittstitel mit Erkennungszeichen | Anton, Schnitt nach `--signature-angle` | neu |
| Ladeplatzhalter, leerer Zustand, Fehlerzustand | Endmasse, kein Schimmern bei reduzierter Bewegung, letzter gültiger Stand sichtbar | vereinheitlichen |
| Dialog und Bottom Sheet | `<dialog>` bzw. `popover` für Filter, Push-Vordialog, Installationshilfe | vereinheitlichen |
| Schalter | echtes `<input type="checkbox" switch>` für Einstellungen | neu |

## Fazit

Die wichtigste neue Einsicht ist, dass der Rückbau auf einen Club auch die eigentliche Gestaltungschance ist. Die grossen Clubs mussten erst Dutzende Rottöne und Schriften einsammeln, bevor sie ein Erkennungszeichen verstärken konnten. Die V2 kann mit dem Wegfall von FCSG und Otmar denselben Schritt in einem Zug machen. Sie löst damit gleichzeitig ihr technisches Hauptproblem, die rund 500 V1-Ausschlussregeln. Die Messung zeigt ausserdem, dass die Markenfarbe selbst der kritischste Punkt für die Barrierefreiheit ist. Im dunklen Modus funktioniert das Orange hervorragend, im hellen Modus als Text gar nicht. Dunkel als Leitmodus für Spieltag und Live ist also nicht nur Trend, sondern die robustere Wahl. Das ist eine Ableitung aus den Kontrastwerten, kein Nutzertest.

Bei den Funktionen verschiebt sich die Messlatte vom Spielgeschehen auf die Stunden davor und danach. Die belegten Lieblingsfunktionen von Fans sind unspektakulär: auffindbare Infos, Zuverlässigkeit, Echtzeit. Der Ticker existiert bereits. Was der App fehlt, liegt um ihn herum: der Weg zur Halle und zurück, die Erinnerung im eigenen Kalender, das Verständnis der Regeln und die persönliche Geschichte «Ich war dabei». Diese Bausteine kann ein einzelner Entwickler ohne Club bauen, und sie sind lokal und datenschutzfreundlich. Gleichzeitig schaffen sie die Nutzungszahlen, mit denen sich später die clubabhängigen Funktionen begründen lassen.
