// Wissensbereich: Regeln, Aufstellungen und Spielzüge. Eine Quelle für Seiten, «?»-Blätter und Feldbilder.
// Texte in eigenen Worten nach den Spielregeln der IHF; vor der Veröffentlichung von einer fachkundigen Person zu lesen.
// Feldbild: Koordinaten in einem Rahmen von 220 × 150, das Tor liegt oben in der Mitte (x 110, y 10).

export const CHAPTERS = [['regeln', 'Regeln'], ['aufstellungen', 'Aufstellungen'], ['spielzuege', 'Spielzüge']];

const round = n => Math.round(n * 10) / 10;
/** Punkt im Abstand r vom Tor-Mittelpunkt, Winkel in Grad (0 = geradeaus, negativ = links). */
export const pol = (r, deg) => [round(110 + r * Math.sin(deg * Math.PI / 180)), round(10 + r * Math.cos(deg * Math.PI / 180))];

const POS = {LA: [26, 18], RL: pol(92, -44), RM: pol(92, 0), RR: pol(92, 44), RA: [194, 18], KR: pol(62, 0)};
const player = (l, [x, y], team = 'a', extra = {}) => ({l, x, y, team, ...extra});
const attackers = (hl = null, base = POS) => Object.entries(base).map(([l, p]) => player(l, p, 'a', hl ? (hl === l ? {hl: true} : {ghost: true}) : {}));
const defense = (angles, r = 64, from = 1) => angles.map((a, i) => player(String(from + i), pol(r, a), 'd'));
const D60 = defense([-78, -50, -17, 17, 50, 78]);

export const GROUPS = {
  regeln: [['spiel', 'Spiel'], ['strafen', 'Strafen'], ['statistik', 'Statistik-Begriffe']],
  aufstellungen: [['abwehr', 'Abwehrformationen'], ['angriff', 'Angriffsformen'], ['positionen', 'Positionen']],
  spielzuege: [['grundzuege', 'Grundmuster']]
};

const R = (id, group, title, short, body, extra = {}) => ({id, chapter: 'regeln', group, title, short, body, ...extra});

const REGELN = [
  R('spielzeit', 'spiel', 'Spielzeit und Anwurf', 'Zwei Halbzeiten à 30 Minuten, dazwischen zehn Minuten Pause. Nach jedem Tor geht es mit einem Anwurf in der Mitte weiter.',
    ['Gespielt wird zweimal 30 Minuten. Die Pause dauert in der Regel zehn Minuten. In Ligaspielen kann ein Spiel unentschieden enden.', 'In K.-o.-Spielen wie im Cup folgt bei Gleichstand je nach Wettbewerb eine Verlängerung (zweimal fünf Minuten) und danach bei Bedarf das Siebenmeterwerfen.', 'Den Anwurf führt nach einem Tor die Mannschaft aus, die das Tor kassiert hat. Er erfolgt aus der Spielfeldmitte, sobald der Schiedsrichter pfeift.'],
    {app: 'Spielstand und Halbzeitstand siehst du auf jeder Spielkarte und im Spielverlauf.', related: ['wechsel', 'auszeit']}),
  R('spielfeld', 'spiel', 'Spielfeld und Torraum', 'Das Feld ist 40 mal 20 Meter gross. Der Torraum bis zur 6-Meter-Linie gehört der Torhüterin oder dem Torhüter.',
    ['Das Tor ist drei Meter breit und zwei Meter hoch. Der Torraum reicht bis zur durchgezogenen 6-Meter-Linie. Feldspieler dürfen ihn nicht betreten, aber im Sprung darüber werfen, solange sie ihn erst nach dem Wurf berühren.', 'Die gestrichelte 9-Meter-Linie markiert die Freiwurflinie. Bei einem Strafwurf liegt die Marke sieben Meter vor dem Tor, die Torhüter müssen bis zum Wurf hinter der 4-Meter-Linie bleiben.'],
    {field: {label: 'Spielfeldhälfte mit Torraum und Linien', players: [], marks: [{l: '6 m', x: 60, y: 39}, {l: '9 m', x: 34, y: 54}, {l: '7 m', x: 110, y: 90}]}, related: ['freiwurf', '7m', 'torhueter']}),
  R('schritte', 'spiel', 'Schritte und Dribbeln', 'Mit dem Ball sind höchstens drei Schritte und drei Sekunden Halten erlaubt. Dribbeln ist erlaubt, aber nicht zweimal hintereinander.',
    ['Wer den Ball fängt, darf bis zu drei Schritte machen, bevor er passt, wirft oder dribbelt. Den Ball darf man höchstens drei Sekunden festhalten.', 'Wer gedribbelt hat und den Ball danach in die Hände nimmt, darf nicht erneut dribbeln («Doppeldribbling»), bis ein anderer Spieler den Ball berührt hat. Auch der Fuss unterhalb des Knies darf den Ball nicht absichtlich spielen.', 'Solche Verstösse zählen als technischer Fehler: Der Ball geht an den Gegner.'],
    {related: ['tf', 'passiv']}),
  R('passiv', 'spiel', 'Passives Spiel', 'Spielt eine Mannschaft zu lange ohne erkennbaren Torabschluss, zeigt das Schiedsrichtergespann das Vorwarnzeichen. Danach bleiben höchstens vier Pässe bis zum Wurf.',
    ['Das Regelwerk soll verhindern, dass eine Mannschaft den Ball nur noch kreisen lässt. Sobald das Vorwarnzeichen gezeigt wird, muss der Angriff sichtbar auf den Abschluss hinarbeiten.', 'Gelingt das nicht, pfeift der Schiedsrichter passives Spiel: Der Ball geht als Freiwurf an die Gegner.'],
    {related: ['tf', 'schritte']}),
  R('auszeit', 'spiel', 'Auszeit (Team-Time-out)', 'Jede Mannschaft darf pro Spiel drei Auszeiten von einer Minute nehmen, höchstens zwei pro Halbzeit und keine in den letzten fünf Minuten nach der zweiten.',
    ['Eine Auszeit beantragt der Trainerstab am Kampfgericht, meist mit einer grünen Karte. Sie ist möglich, wenn die eigene Mannschaft im Ballbesitz ist oder das Spiel unterbrochen ist.', 'Die Uhr läuft in dieser Zeit nicht weiter. Trainer nutzen die Minute für taktische Anpassungen oder, um den Rhythmus des Gegners zu stören.'],
    {app: 'Im Spielverlauf eines abgeschlossenen Spiels steht ein «T» für eine Auszeit.', related: ['spielzeit']}),
  R('wechsel', 'spiel', 'Spielerwechsel', 'Sieben Spieler stehen auf dem Feld, einer davon im Tor. Gewechselt wird jederzeit und beliebig oft an der eigenen Wechsellinie.',
    ['Eine Mannschaft hat bis zu 16 Spieler im Spielbericht. Wechsel sind ohne Unterbruch möglich, der Spieler muss das Feld erst verlassen haben, bevor der Nächste hereinkommt.', 'Weil so schnell zwischen Angriff und Abwehr gewechselt wird, gibt es Spezialisten für beide Phasen.'],
    {related: ['torhueter', '2min']}),
  R('freiwurf', 'spiel', 'Freiwurf', 'Nach einem Regelverstoss ohne Strafe wird ein Freiwurf zugesprochen. Der Gegner muss dabei drei Meter Abstand halten.',
    ['Der Freiwurf wird dort ausgeführt, wo das Foul passierte. Geschah es innerhalb der 9-Meter-Linie, wird er an der 9-Meter-Linie ausgeführt.', 'Die verteidigende Mannschaft stellt eine «Mauer» auf, oft mit den Kreisläufern an den Rändern. Der Angriff spielt meist sofort einen eingeübten Zug.'],
    {related: ['spielfeld', 'freiwurf-zug']}),
  R('wiederbeginn', 'spiel', 'Einwurf, Abwurf und Eckwurf', 'Das Spiel geht nach einem Ball im Aus weiter: Einwurf an der Seitenlinie, Abwurf durch die Torhüter oder Eckwurf.',
    ['Verlässt der Ball das Feld seitlich, folgt ein Einwurf für die Gegner des letzten Berührers. Fliegt er hinter dem Tor ins Aus und hat ihn zuletzt ein Angreifer berührt, ist es ein Abwurf durch den Torhüter.', 'Hat ihn zuletzt ein Verteidiger berührt, wird der Ball per Eckwurf von der nächstgelegenen Ecke wieder ins Spiel gebracht.'],
    {related: ['spielfeld', 'torhueter']}),
  R('torhueter', 'spiel', 'Torhüter', 'Im Torraum dürfen die Torhüter den Ball mit dem ganzen Körper abwehren. Verlassen sie ihn, gelten sie als Feldspieler.',
    ['Torhüter tragen ein Trikot in anderer Farbe. Im Torraum dürfen sie Bälle mit jedem Körperteil halten. Sie dürfen den Torraum verlassen und mitspielen, dann gelten für sie die Regeln der Feldspieler.', 'Manche Mannschaften ersetzen den Torhüter im Angriff durch einen siebten Feldspieler («sieben gegen sechs»).'],
    {app: 'Paraden und Fangquote der Torhüter findest du in den Spielerwerten.', related: ['parade', '7m', 'pos-tor']}),

  R('gelb', 'strafen', 'Verwarnung', 'Gelbe Karte als erste Warnung für unsportliches oder regelwidriges Verhalten. Pro Spieler gibt es höchstens eine, pro Mannschaft höchstens drei.',
    ['Die Verwarnung ist die erste Stufe. Sie kann auch Offiziellen und Trainern gezeigt werden. Wer nach einer Verwarnung wieder auffällt, bekommt in der Regel eine Zeitstrafe.'],
    {app: 'Im Spielerprofil und im Spielbericht steht die Zahl der Verwarnungen als «G».', related: ['2min', 'rot']}),
  R('2min', 'strafen', 'Zeitstrafe (2 Minuten)', 'Für grobe oder wiederholte Regelverstösse muss ein Spieler zwei Minuten raus; die Mannschaft spielt so lange in Unterzahl. Die dritte Zeitstrafe desselben Spielers führt zur Disqualifikation.',
    ['Während der Strafe darf die Mannschaft niemanden nachschicken. Ein Tor des Gegners beendet die Strafe nicht.', 'Zeitstrafen entscheiden Spiele oft mit: Wer in Überzahl spielt, trifft meist öfter. Die Zahl der Zeitstrafen steht deshalb in der Statistik.'],
    {app: 'Im Spielbericht und Spielerprofil steht die Zahl als «2′».', related: ['unterzahl', 'gelb', 'rot']}),
  R('rot', 'strafen', 'Disqualifikation', 'Rote Karte: Der Spieler darf nicht mehr mitspielen. Die Mannschaft spielt zwei Minuten in Unterzahl und darf danach ergänzen.',
    ['Die rote Karte gibt es für grobe Fouls, gefährliche Aktionen oder nach der dritten Zeitstrafe. Der Spieler muss die Halle bzw. den Spielbereich verlassen.', 'Bei sehr schweren Vergehen wird nachträglich ein Bericht geschrieben und es folgt eine Sperre.'],
    {app: 'Im Spielerprofil und im Spielbericht steht die Zahl als «R».', related: ['2min', 'gelb']}),
  R('unterzahl', 'strafen', 'Überzahl und Unterzahl', 'Bei einer Zeitstrafe spielt die Mannschaft mit einem Spieler weniger. Der Gegner hat Überzahl.',
    ['In Überzahl lohnt es sich, den Ball schnell zu bewegen, bis ein Spieler frei steht. Die Mannschaft in Unterzahl verteidigt oft enger und versucht, die Zeit herunterzuspielen.', 'Eine Strafe läuft nach zwei Minuten ab, unabhängig davon, wie viele Tore in dieser Zeit fallen.'],
    {related: ['2min', 'ueberzahl']}),
  R('7m', 'strafen', 'Siebenmeter (7-m)', 'Strafwurf aus sieben Metern, wenn eine klare Torchance regelwidrig verhindert wird. Nur die Torhüterin oder der Torhüter darf abwehren. Angabe «4/5» heisst: vier Tore aus fünf Würfen.',
    ['Der Werfer steht an der 7-Meter-Marke, der Torhüter muss bis zum Wurf hinter der 4-Meter-Linie bleiben. Alle anderen Spieler halten Abstand und stehen ausserhalb der 9-Meter-Linie.', 'Der Wurf muss innerhalb von drei Sekunden nach dem Pfiff erfolgen.'],
    {app: 'In der Torschützenliste und im Spielbericht steht die Zahl als «7-m».', related: ['spielfeld', 'siebenmeter-zug']}),

  R('parade', 'statistik', 'Paraden und Fangquote', 'Gehaltene Würfe der Torhüterinnen und Torhüter. Die Fangquote ist der Anteil gehaltener Würfe an allen Würfen aufs Tor (Paraden + Gegentore).',
    ['Ein Wert von 33 Prozent ist für Torhüter gut, über 40 Prozent ist hervorragend. Die Quote hängt stark davon ab, wie schwierig die Würfe waren.'],
    {app: 'In der Tabelle unter «Spielerwerte», Reiter «Torhüter», und im Spielbericht.', related: ['torhueter', 'wurfzonen']}),
  R('wurfquote', 'statistik', 'Wurfquote', 'Anteil der Würfe, die zu einem Tor führen. «28/40 · 70 %» heisst: 28 Tore aus 40 Würfen.',
    ['Die Wurfquote sagt, wie effizient ein Spieler oder eine Mannschaft abschliesst. Wer wenig wirft, aber viel trifft, hat eine hohe Quote.'],
    {app: 'In der Torschützenliste und im Teamvergleich eines Spielberichts.', related: ['parade', 'wurfzonen']}),
  R('tf', 'statistik', 'Technischer Fehler', 'Ballverlust ohne Wurf, etwa durch Fehlpass, Schrittfehler, Doppeldribbling, Fuss oder Stürmerfoul.',
    ['Technische Fehler kosten Tempo und Torchancen. Eine Mannschaft mit wenigen Fehlern kann den Ball länger im Besitz halten.'],
    {app: 'Im Teamvergleich eines Spielberichts.', related: ['schritte', 'passiv']}),
  R('tordifferenz', 'statistik', 'Tordifferenz', 'Erzielte Tore minus kassierte Tore, hier aus Sicht der Kadetten: Plus heisst Führung, Minus Rückstand. Die Linie zeigt den Unterschied im Spielstand während des Spiels, die Null-Linie den Gleichstand.',
    ['Die Tordifferenz einer ganzen Saison dient in der Tabelle als Zusatzkriterium bei Punktgleichheit.'],
    {app: 'Im Spielverlauf eines abgeschlossenen Spiels.', related: ['punkte']}),
  R('punkte', 'statistik', 'Punkte in der Tabelle', 'In der QHL gibt ein Sieg zwei Punkte, ein Unentschieden einen Punkt. Bei Punktgleichheit entscheidet zuerst die Tordifferenz.',
    ['Eine Niederlage gibt keinen Punkt. Die Tabelle zeigt neben den Punkten auch die Spiele und die Tordifferenz.'],
    {app: 'In der Tabelle.', related: ['tordifferenz']}),
  R('wurfzonen', 'statistik', 'Wurfzonen', 'Das Feld wird in Zonen eingeteilt. So sieht man, von wo geworfen wurde und wo Tore fallen.',
    ['Die Zonen im Spielbericht: Distanzwürfe aus dem Rückraum (links, Mitte, rechts), Würfe aus der Nähe des Torraums (links, Mitte, rechts), die beiden Flügel, Siebenmeter, Gegenstoss und Durchbruch.', 'Aus der Nähe fallen mehr Tore als aus der Distanz. Eine hohe Quote aus der Distanz gilt deshalb als besondere Stärke.'],
    {field: {label: 'Wurfzonen auf der Spielfeldhälfte', players: [], marks: [
      {l: 'Distanz links', x: 46, y: 80}, {l: 'Distanz Mitte', x: 110, y: 112}, {l: 'Distanz rechts', x: 174, y: 80},
      {l: 'nah links', x: 52, y: 48}, {l: 'nah Mitte', x: 110, y: 56}, {l: 'nah rechts', x: 168, y: 48},
      {l: 'Flügel links', x: 42, y: 22}, {l: 'Flügel rechts', x: 178, y: 22}, {l: '7-m', x: 110, y: 84}, {l: 'Durchbruch', x: 110, y: 34}, {l: 'Gegenstoss', x: 160, y: 134}]},
     app: 'Im Spielbericht der EHL und QHL unter «Wie die Würfe endeten».', related: ['wurfquote', 'parade']})
];

const POSITIONEN = [
  ['pos-tor', 'Tor', 'TW', [110, 17], 'Die letzte Verteidigerin oder der letzte Verteidiger. Hält Würfe, löst Gegenstösse mit schnellen Pässen aus.', ['Torhüter stehen im Torraum und haben das ganze Spiel im Blick. Sie lesen Wurfbewegungen und sind oft die ersten, die einen Gegenstoss einleiten.', 'Gute Torhüter halten 30 bis 35 Prozent der Würfe aufs Tor.']],
  ['pos-fluegel-links', 'Flügel links', 'LA', POS.LA, 'Steht links aussen nahe der Torlinie. Schnell, springt aus spitzem Winkel und läuft Gegenstösse.', ['Linksaussen sind oft Rechtshänder. Sie werfen aus einem engen Winkel und müssen den Torhüter überlisten.', 'In der Abwehr verteidigen sie meist auf der Aussenposition.']],
  ['pos-fluegel-rechts', 'Flügel rechts', 'RA', POS.RA, 'Steht rechts aussen nahe der Torlinie. Wie links: schnell und wendig, oft Linkshänder.', ['Rechtsaussen sind oft Linkshänder und werfen aus dem spitzen Winkel auf die rechte Seite des Tores.', 'Sie sind wichtig für den Gegenstoss, weil sie zuerst nach vorne laufen.']],
  ['pos-rueckraum-links', 'Rückraum links', 'RL', POS.RL, 'Wurfstarker Spieler im linken Rückraum, oft gross und kräftig.', ['Im Rückraum wird aus Distanz geworfen. Der linke Rückraum ist häufig mit einem Rechtshänder besetzt.', 'Er sucht Lücken, kann aber auch den Kreisläufer anspielen.']],
  ['pos-rueckraum-mitte', 'Rückraum mitte', 'RM', POS.RM, 'Der Spielmacher: leitet den Angriff, verteilt die Bälle und gibt Tempo und Richtung vor.', ['Der Mittelrückraum bestimmt, wer wann wirft. Er braucht Übersicht und einen guten Pass.', 'In der Abwehr steht er oft in der Mitte und leitet die Abwehr.']],
  ['pos-rueckraum-rechts', 'Rückraum rechts', 'RR', POS.RR, 'Wurfstarker Spieler im rechten Rückraum, oft ein Linkshänder.', ['Der rechte Rückraum ist häufig mit einem Linkshänder besetzt, weil er so besser auf das Tor werfen kann.', 'Er ergänzt den linken Rückraum und sorgt dafür, dass die Abwehr beide Seiten beachten muss.']],
  ['pos-kreis', 'Kreis', 'KR', POS.KR, 'Der Kreisläufer: steht zwischen den Verteidigern nahe am Torraum, stellt Sperren und wirft aus kurzer Distanz.', ['Kreisläufer arbeiten im dichtesten Gedränge. Sie stellen Sperren für die Rückraumspieler, laufen in Lücken und bekommen den Ball oft kurz vor dem Torraum.', 'Sie sind körperlich stark und werfen meist aus nächster Nähe.']]
];

const A = (id, title, short, body, extra) => ({id, chapter: 'aufstellungen', title, short, body, ...extra});
const POSITIONSARTIKEL = POSITIONEN.map(([id, title, hl, point, short, body]) => A(id, title, short, body, {group: 'positionen', field: {label: `Feldbild: Position «${title}» hervorgehoben`, players: id === 'pos-tor' ? [player('TW', point, 'a', {hl: true})] : attackers(hl)}, related: id === 'pos-kreis' ? ['sperre', 'einlaufen'] : ['kreuzen']}));

const FORMATION = (id, group, title, short, field, idee, staerke, schwaeche, related = []) => A(id, title, short, [`Idee: ${idee}`, `Stärke: ${staerke}`, `Schwäche: ${schwaeche}`], {group, field, idee, staerke, schwaeche, related});
const CHIPS = {'angriff-2-4': '2 Kreisläufer', 'angriff-7-6': '7 gegen 6', 'abwehr-mann': 'Mann'};
const ABWEHR = [
  FORMATION('abwehr-6-0', 'abwehr', 'Abwehr 6-0', 'Alle sechs Verteidiger stehen in einer Reihe an der 6-Meter-Linie.', {label: 'Abwehr 6-0: sechs Verteidiger auf der 6-Meter-Linie', players: D60},
    'Alle sechs stehen in einer Reihe an der 6-Meter-Linie und schliessen den Weg zum Tor.', 'Sehr kompakt, wenig Raum für Durchbrüche und gut gegen den Kreisläufer.', 'Niemand attackiert weit vorne, deshalb sind Distanzwürfe aus dem Rückraum möglich.', ['abwehr-5-1']),
  FORMATION('abwehr-5-1', 'abwehr', 'Abwehr 5-1', 'Fünf Verteidiger an der 6-Meter-Linie, einer ist vorgezogen.', {label: 'Abwehr 5-1: fünf an der 6-Meter-Linie, ein Verteidiger vorgezogen', players: [...defense([-72, -36, 0, 36, 72], 64), player('6', pol(98, 0), 'd')]},
    'Ein Spieler steht vor der Reihe und stört den Spielmacher oder den besten Werfer.', 'Mehr Druck auf den Rückraum, oft schwierige Pässe für den Angriff.', 'Hinter dem vorgezogenen Spieler entstehen Lücken, die der Kreisläufer nutzen kann.', ['abwehr-6-0', 'abwehr-4-2']),
  FORMATION('abwehr-3-2-1', 'abwehr', 'Abwehr 3-2-1', 'Gestaffelt in drei Linien: drei hinten, zwei in der Mitte, einer vorne.', {label: 'Abwehr 3-2-1: gestaffelt in drei Linien', players: [player('1', pol(64, -38), 'd'), player('2', pol(64, 0), 'd'), player('3', pol(64, 38), 'd'), player('4', pol(80, -22), 'd'), player('5', pol(80, 22), 'd'), player('6', pol(98, 0), 'd')]},
    'Die Verteidiger sind gestaffelt und decken Passwege im ganzen Raum.', 'Schliesst viele Passwege und stört das Zusammenspiel.', 'Verlangt viel Laufarbeit, schnelle Seitenwechsel bringen Lücken.', ['abwehr-5-1']),
  FORMATION('abwehr-4-2', 'abwehr', 'Abwehr 4-2', 'Vier Verteidiger an der 6-Meter-Linie, zwei vorgezogen.', {label: 'Abwehr 4-2: vier an der 6-Meter-Linie, zwei vorgezogen', players: [...defense([-58, -20, 20, 58], 64), player('5', pol(92, -26), 'd'), player('6', pol(92, 26), 'd')]},
    'Zwei Spieler stören die Halbspieler, vier sichern das Zentrum.', 'Starker Druck auf beide Rückraumhälften.', 'Die Mitte hinten ist offen für Kreisläufer und Durchbrüche.', ['abwehr-6-0']),
  FORMATION('abwehr-mann', 'abwehr', 'Manndeckung', 'Jeder Verteidiger bewacht einen bestimmten Angreifer eng.', {label: 'Manndeckung: jeder Verteidiger steht bei seinem Angreifer', players: [...attackers(), ...Object.entries(POS).map(([l, p], i) => player(String(i + 1), [p[0] + (p[0] < 110 ? 6 : -6), p[1] + 7], 'd'))]},
    'Jeder Verteidiger bleibt bei seinem Gegenspieler, besonders gegen Schlüsselspieler.', 'Stoppt einzelne Stars und zwingt zu Fehlern.', 'Sperren und Kreuzen können die Zuordnung sprengen, und es gibt mehr Fouls.', ['kreuzen', 'sperre'])
];
const ANGRIFF = [
  FORMATION('angriff-3-3', 'angriff', 'Angriff 3-3', 'Drei Spieler im Rückraum, zwei an den Flügeln, einer am Kreis.', {label: 'Angriff 3-3 gegen eine 6-0-Abwehr', players: [...attackers(), ...D60]},
    'Die drei Rückraumspieler werfen oder lösen den Angriff aus, Flügel und Kreis binden die Abwehr.', 'Ausgewogen, Würfe aus allen Positionen und viele Spielzüge sind möglich.', 'Ein sehr kompakter Gegner nimmt Raum und Zeit.', ['kreuzen', 'sperre']),
  FORMATION('angriff-2-4', 'angriff', 'Angriff mit zwei Kreisläufern', 'Zwei Kreisläufer stehen nahe am Torraum, vier Spieler spielen davor.', {label: 'Zwei Kreisläufer und vier Spieler davor', players: [player('K1', pol(62, -14), 'a'), player('K2', pol(62, 14), 'a'), player('RL', pol(92, -50), 'a'), player('RM', pol(92, -17), 'a'), player('RR', pol(92, 17), 'a'), player('RA', pol(92, 50), 'a'), ...D60]},
    'Zwei Spieler stehen im Zentrum der Abwehr und stellen Sperren oder suchen Anspiele.', 'Die Abwehr muss mehr Rücksicht auf die Mitte nehmen, es entstehen Lücken für die Rückraumspieler.', 'Weniger Spieler an den Flügeln, deshalb weniger Breite.', ['sperre', 'einlaufen']),
  FORMATION('angriff-7-6', 'angriff', 'Sieben gegen Sechs', 'Der Torhüter wird durch einen siebten Feldspieler ersetzt.', {label: 'Sieben Feldspieler greifen eine 6-0-Abwehr an', players: [player('LA', POS.LA), player('RL', pol(92, -50)), player('RM', pol(92, -17)), player('RM', pol(92, 17)), player('RR', pol(92, 50)), player('RA', POS.RA), player('KR', POS.KR), ...D60]},
    'Der Angriff spielt dauerhaft in Überzahl. Das eigene Tor bleibt dafür leer.', 'Mehr Optionen und besser gegen eine geschlossene Abwehr.', 'Ein Ballverlust kann mit einem Wurf aufs leere Tor bestraft werden.', ['ueberzahl', 'torhueter'])
];

const S = (id, title, short, idee, base, steps, defenders = D60, related = []) => ({id, chapter: 'spielzuege', group: 'grundzuege', title, short, idee, base, steps, defenders, body: steps.map((s, i) => `Schritt ${i + 1}: ${s.text}`), related});
const g = [110, 10];
const SPIELZUEGE = [
  S('kreuzen', 'Kreuzen', 'Zwei Rückraumspieler tauschen im Laufen die Plätze und übergeben den Ball.', 'Beim Kreuzen müssen die Verteidiger ihre Gegenspieler übergeben. Dabei entsteht oft kurz eine Lücke.',
    POS, [
      {text: 'Der Mittelspieler hat den Ball. Er läuft nach links, der linke Rückraum läuft nach innen.', ball: 'RM', moves: [{k: 'run', from: POS.RM, to: [POS.RL[0] + 8, POS.RL[1] + 4]}, {k: 'run', from: POS.RL, to: [POS.RM[0] - 8, POS.RM[1] + 4]}]},
      {text: 'Die beiden kreuzen. Der Ball wird übergeben.', at: {RM: [POS.RL[0] + 8, POS.RL[1] + 4], RL: [POS.RM[0] - 8, POS.RM[1] + 4]}, ball: 'RM', moves: [{k: 'pass', from: [POS.RL[0] + 8, POS.RL[1] + 4], to: [POS.RM[0] - 8, POS.RM[1] + 4]}]},
      {text: 'Der Spieler mit dem Ball kommt in der Mitte frei zum Wurf.', at: {RM: [POS.RL[0] + 8, POS.RL[1] + 4], RL: [POS.RM[0] - 8, POS.RM[1] + 4]}, ball: 'RL', moves: [{k: 'shot', from: [POS.RM[0] - 8, POS.RM[1] + 4], to: g}]}
    ], D60, ['sperre']),
  S('sperre', 'Sperre stellen', 'Der Kreisläufer stellt sich neben einen Verteidiger und hält ihn auf.', 'Mit der Sperre bekommt der Rückraumspieler Raum zum Wurf, weil sein Gegenspieler festgehalten wird.',
    POS, [
      {text: 'Der rechte Rückraum hat den Ball. Der Kreisläufer läuft zum Verteidiger, der ihn bewachen soll.', ball: 'RR', moves: [{k: 'run', from: POS.KR, to: pol(63, 36)}]},
      {text: 'Der Kreisläufer steht und sperrt den Verteidiger. Der Ballführende läuft an der Sperre vorbei.', at: {KR: pol(63, 36)}, ball: 'RR', moves: [{k: 'run', from: POS.RR, to: pol(80, 24)}]},
      {text: 'Er hat Platz und wirft aufs Tor.', at: {KR: pol(63, 36), RR: pol(80, 24)}, ball: 'RR', moves: [{k: 'shot', from: pol(80, 24), to: g}]}
    ], D60, ['kreuzen', 'einlaufen']),
  S('einlaufen', 'Einlaufen des Kreisläufers', 'Der Kreisläufer läuft in eine Lücke der Abwehr und bekommt den Ball.', 'Eine kurze Bewegung genügt, wenn die Abwehr nur den Ballführenden beachtet.',
    {...POS, KR: pol(62, -38)}, [
      {text: 'Der Mittelspieler hat den Ball. Der Kreisläufer startet aus der Ecke zur Mitte.', ball: 'RM', moves: [{k: 'run', from: pol(62, -38), to: pol(60, 0)}]},
      {text: 'Der Kreisläufer steht in der Lücke. Der Ball geht auf ihn.', at: {KR: pol(60, 0)}, ball: 'RM', moves: [{k: 'pass', from: POS.RM, to: pol(60, 0)}]},
      {text: 'Er fängt und wirft aus kurzer Distanz.', at: {KR: pol(60, 0)}, ball: 'KR', moves: [{k: 'shot', from: pol(60, 0), to: g}]}
    ], D60, ['sperre']),
  S('doppelpass', 'Doppelpass', 'Ein Pass auf den Kreisläufer und gleich zurück: Der Passgeber läuft in den freien Raum.', 'Der Verteidiger folgt dem Ball, der Passgeber läuft hinter ihm in die Lücke.',
    POS, [
      {text: 'Der Mittelspieler spielt auf den Kreisläufer und läuft sofort in die Lücke neben ihm.', ball: 'RM', moves: [{k: 'pass', from: POS.RM, to: POS.KR}, {k: 'run', from: POS.RM, to: pol(76, 16)}]},
      {text: 'Der Kreisläufer gibt den Ball sofort zurück.', at: {RM: pol(76, 16)}, ball: 'KR', moves: [{k: 'pass', from: POS.KR, to: pol(76, 16)}]},
      {text: 'Der Mittelspieler wirft aus der Lücke.', at: {RM: pol(76, 16)}, ball: 'RM', moves: [{k: 'shot', from: pol(76, 16), to: g}]}
    ], D60, ['einlaufen']),
  S('ueberzahl', 'Überzahl ausspielen', 'Wenn ein Verteidiger fehlt, wandert der Ball schnell dorthin, wo ein Angreifer frei steht.', 'Eine Zeitstrafe öffnet Platz. Der Ball muss schneller laufen als die Abwehr.',
    POS, [
      {text: 'Die Abwehr hat nur fünf Spieler. Auf der rechten Seite fehlt ein Verteidiger. Der Mittelspieler hat den Ball.', ball: 'RM', moves: []},
      {text: 'Der Ball läuft schnell über den rechten Rückraum zum Flügel.', ball: 'RM', moves: [{k: 'pass', from: POS.RM, to: POS.RR}, {k: 'pass', from: POS.RR, to: POS.RA}]},
      {text: 'Der Flügel steht frei und wirft.', ball: 'RA', moves: [{k: 'shot', from: POS.RA, to: g}]}
    ], D60.filter(p => p.l !== '6'), ['unterzahl', '2min']),
  S('gegenstoss', 'Tempogegenstoss', 'Nach einem Ballgewinn läuft ein Spieler sofort nach vorne und wirft, bevor die Abwehr steht.', 'Wer schnell ist, trifft die Abwehr unvorbereitet.',
    {LA: [28, 112], RM: [110, 122]}, [
      {text: 'Der Ball ist gewonnen. Der Flügelspieler hat ihn und läuft allein nach vorne.', ball: 'LA', moves: [{k: 'run', from: [28, 112], to: [28, 70]}]},
      {text: 'Er läuft weiter, nur zwei Verteidiger sind noch zurück.', at: {LA: [28, 70], RM: [110, 100]}, ball: 'LA', moves: [{k: 'run', from: [28, 70], to: [34, 30]}]},
      {text: 'Er wirft aus kurzer Distanz.', at: {LA: [34, 30], RM: [110, 84]}, ball: 'LA', moves: [{k: 'shot', from: [34, 30], to: g}]}
    ], [player('1', [86, 38], 'd'), player('2', [136, 40], 'd')], ['wurfzonen']),
  S('freiwurf-zug', 'Freiwurf mit Abspiel', 'Nach dem Freiwurf spielt die Mannschaft den Ball schnell an eine Stelle, die die Mauer nicht deckt.', 'Die Mauer steht gerade, wenn gespielt wird. Eine schnelle Freigabe findet oft einen freien Mann.',
    {RM: [110, 112], RL: pol(94, -48), RR: pol(94, 48), KR: pol(60, 6), LA: POS.LA, RA: POS.RA}, [
      {text: 'Freiwurf knapp ausserhalb der 9-Meter-Linie. Die Abwehr steht in einer Mauer davor.', ball: 'RM', moves: []},
      {text: 'Der Ball geht schnell auf den Kreisläufer.', ball: 'RM', moves: [{k: 'pass', from: [110, 112], to: pol(60, 6)}]},
      {text: 'Der Kreisläufer wirft aus kurzer Distanz.', ball: 'KR', moves: [{k: 'shot', from: pol(60, 6), to: g}]}
    ], D60, ['freiwurf']),
  S('siebenmeter-zug', 'Siebenmeter', 'Strafwurf aus sieben Metern: Werfer gegen Torhüter, alle anderen stehen hinter der 9-Meter-Linie.', 'Der Torhüter darf bis zum Wurf nicht über die 4-Meter-Linie, der Werfer muss die Marke beachten.',
    {W: [110, 80], X1: pol(104, -56), X2: pol(104, 56)}, [
      {text: 'Der Werfer steht an der 7-Meter-Marke, der Torhüter im Tor. Die anderen Spieler stehen hinter der 9-Meter-Linie.', ball: 'W', moves: []},
      {text: 'Der Schiedsrichter pfeift. Der Werfer darf innerhalb von drei Sekunden werfen.', ball: 'W', moves: [{k: 'shot', from: [110, 80], to: g}]},
      {text: 'Trifft er, geht es mit Anwurf weiter. Wird der Ball gehalten, spielt der Torhüter ihn zu einem Mitspieler.', ball: 'W', moves: []}
    ], [player('TW', [110, 17], 'd')], ['7m'])
];

export const ARTICLES = [...REGELN, ...POSITIONSARTIKEL, ...ABWEHR, ...ANGRIFF, ...SPIELZUEGE];
/** Kurze Beschriftung für den Wahlknopf: «6-0», «3-3», «Kreis» … */
export const chipLabel = a => CHIPS[a.id] || a.title.replace(/^(Abwehr|Angriff) /, '');
export const article = id => ARTICLES.find(a => a.id === id) || null;
export const inChapter = chapter => ARTICLES.filter(a => a.chapter === chapter);

/** Wissens-Artikel zu einer Position der Kader-Daten («Rückraum mitte», «Flügel links», «Kreis», «Tor»). */
export function positionArticle(position) {
  const slug = String(position || '').toLowerCase().replace(/ü/g, 'ue').replace(/\s+/g, '-');
  return article('pos-' + slug);
}
