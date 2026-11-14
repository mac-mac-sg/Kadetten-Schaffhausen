// Sammelkarten: feste Karten zu Verein, Personen, Orten und Spielen. Kader- und Geschichtskarten entstehen in js/sammeln.js
// aus data/squad.js und data/club.js, Momentkarten aus dem Spielplan. Recherche und Quellen: docs/sammelkarten.md.
// Nur belegte Angaben; was eine Quelle nicht sagt, steht nicht auf der Karte.
//
// Felder: id, art (titel, spiel, ort, trainer, macher, legende), title, kicker, big (grosse Zahl oder Jahr auf der Vorderseite),
// text (Rückseite), facts ([[Bezeichnung, Wert]]), image (nur Archivbilder des Vereins oder Bilder der App), src (Quellen-Kürzel).

const WALL = 'https://kadettensh.ch/wp-content/uploads/2025/12/';

// Titeljahre laut Matchprogramm 2026/27 (wie data/club.js). Archivbilder nur, wo der Dateiname Jahr und Titel nennt.
const MEISTER_BILDER = {
  2005: 'Meister_2005_B_DL.jpg',
  2006: 'Meister_2006_B_DL.jpg',
  2010: 'Kadetten_2010_DL.jpg',
  2011: 'Meister_und_Cup_2011_C_DL.jpg',
  2012: 'Meister_2012_DL.jpg',
  2014: 'Meister_2014_B_DL.jpg',
  2016: 'Meister-2016-C.jpg'
};
const CUP_BILDER = {1999: 'Mannschaft-98_99_v2_DL.jpg', 2011: 'Meister_und_Cup_2011_C_DL.jpg', 2016: 'Cupsieg_2016.jpg'};
const MEISTER_TEXT = {
  2005: 'Die erste Meisterschaft der Vereinsgeschichte, im selben Jahr wie Cup und Supercup. Trainer war Goran Perkovac.',
  2010: 'Meister im Jahr des EHF-Cup-Finals gegen den TBV Lemgo.',
  2011: 'Meisterschaft und Cupsieg, die letzte Saison vor dem Umzug in die BBC Arena.',
  2016: 'Meister und Cupsieger unter Trainer Lars Walther.',
  2022: 'Erster von vier Meistertiteln in Folge, unter Trainer Aðalsteinn Eyjólfsson.',
  2025: 'Vierter Meistertitel in Folge, der fünfzehnte insgesamt.'
};
const CUP_TEXT = {
  1999: 'Der erste nationale Pokal. Trainer war Matjaž Tominec.',
  2004: 'Cupsieg in der ersten Saison von Trainer Goran Perkovac.',
  2026: 'Der elfte Cupsieg, Saison 2025/26, Final im Dezember 2025. Rekord im Schweizer Cup.'
};
const MEISTER = [2005, 2006, 2007, 2010, 2011, 2012, 2014, 2015, 2016, 2017, 2019, 2022, 2023, 2024, 2025];
const CUP = [1999, 2004, 2005, 2007, 2008, 2011, 2014, 2016, 2021, 2024, 2026];

const titel = [
  ...MEISTER.map((year, i) => ({
    id: 'm-' + year,
    art: 'titel',
    title: 'Schweizer Meister',
    kicker: `Meistertitel ${i + 1} von ${MEISTER.length}`,
    big: String(year),
    text: MEISTER_TEXT[year] || `Schweizer Meister ${year}, Titel Nummer ${i + 1} der ersten Mannschaft.`,
    image: MEISTER_BILDER[year] ? WALL + MEISTER_BILDER[year] : null,
    src: 'mp'
  })),
  ...CUP.map((year, i) => ({
    id: 'c-' + year,
    art: 'titel',
    title: 'Schweizer Cupsieger',
    kicker: `Cupsieg ${i + 1} von ${CUP.length}`,
    big: String(year),
    text: CUP_TEXT[year] || `Cupsieger ${year}, Cupsieg Nummer ${i + 1}.`,
    image: CUP_BILDER[year] ? WALL + CUP_BILDER[year] : null,
    src: 'mp'
  })),
  {
    id: 's-16',
    art: 'titel',
    title: 'Supercup-Rekord',
    kicker: '16 Supercupsiege',
    big: '16×',
    text: 'Das Spiel zwischen Meister und Cupsieger vor jeder Saison. Kein Schweizer Klub hat es öfter gewonnen.',
    facts: [
      ['Erster Sieg', '2005'],
      ['Letzter Sieg', '2025']
    ],
    src: 'mp, wp'
  }
];

const spiele = [
  {
    id: 'sp-1974',
    art: 'spiel',
    title: 'Final mit zwei Verlängerungen',
    kicker: 'Junioren · 1974',
    big: '1974',
    text: 'Unter Giorgio Behr steigen die Junioren nach einem denkwürdigen Final mit zweimaliger Verlängerung in die Interregionale Meisterschaft auf, damals die einzige nationale Juniorenklasse.',
    image: WALL + 'Mannschaft_74_farbig.jpg',
    src: 'ks'
  },
  {
    id: 'sp-1993',
    art: 'spiel',
    title: 'Das erste Europacup-Spiel',
    kicker: 'EHF-Pokal 1993/94 · Heim',
    big: '17:16',
    text: 'Gegen Elgorriaga Bidasoa Irún gewinnen die Kadetten ihr erstes Europacup-Heimspiel. Nach dem 18:22 im Rückspiel scheiden sie mit 35:38 aus.',
    src: 'wp, ks'
  },
  {
    id: 'sp-2004',
    art: 'spiel',
    title: '44:20 gegen Piatra Neamț',
    kicker: 'Cupsieger-Cup 2004/05 · Heim',
    big: '44:20',
    text: 'Mit 24 Toren Unterschied einer der höchsten Europacup-Siege der Kadetten. Nach dem 38:23 im Rückspiel steht es insgesamt 82:43.',
    src: 'wp'
  },
  {
    id: 'sp-2008',
    art: 'spiel',
    title: 'Halbfinal gegen Veszprém',
    kicker: 'Cupsieger-Cup 2007/08 · Heim',
    big: '28:28',
    text: 'Erstmals in einem Europacup-Halbfinal. Zu Hause halten die Kadetten gegen den ungarischen Spitzenklub ein Unentschieden, nach dem 24:30 auswärts ist Schluss.',
    src: 'wp'
  },
  {
    id: 'sp-2010-goeppingen',
    art: 'spiel',
    title: 'Aufholjagd gegen Göppingen',
    kicker: 'EHF-Pokal 2009/10 · Viertelfinal',
    big: '28:24',
    text: 'Nach dem 29:33 auswärts gewinnen die Kadetten zu Hause 28:24. Gesamt 57:57, die mehr erzielten Auswärtstore bringen den Halbfinal.',
    src: 'wp'
  },
  {
    id: 'sp-2010-flensburg',
    art: 'spiel',
    title: 'Flensburg ausgeschaltet',
    kicker: 'EHF-Pokal 2009/10 · Halbfinal',
    big: '24:21',
    text: 'Nach dem 30:31 in Flensburg gewinnen die Kadetten das Heimspiel 24:21 und stehen im Final.',
    src: 'wp'
  },
  {
    id: 'sp-2010-lemgo',
    art: 'spiel',
    title: 'EHF-Cup-Final',
    kicker: 'Final gegen den TBV Lemgo · 2010',
    big: '30:28',
    text: 'Nach dem 18:24 auswärts gewinnen die Kadetten das Heimspiel 30:28. Lemgo holt den Pokal mit insgesamt 52:48. Der grösste internationale Erfolg der Vereinsgeschichte; Trainer war Petr Hrachovec.',
    image: WALL + 'Kadetten_2010_DL.jpg',
    src: 'wp, ks, ehf'
  },
  {
    id: 'sp-2011-arena',
    art: 'spiel',
    title: 'Eröffnung der BBC Arena',
    kicker: '8. September 2011',
    big: '2011',
    text: 'Mit dem Spiel Kadetten Schaffhausen gegen HSC Suhr Aarau wird die neue Heimhalle eingeweiht.',
    image: 'assets/bbc-arena.webp',
    src: 'wp'
  },
  {
    id: 'sp-2011-montpellier',
    art: 'spiel',
    title: 'Sieg gegen Montpellier',
    kicker: 'Champions League 2010/11 · Achtelfinal',
    big: '31:26',
    text: 'Im Hinspiel schlagen die Kadetten Montpellier zu Hause mit fünf Toren. Das 27:35 im Rückspiel beendet den ersten Lauf in die K.-o.-Runde der Champions League.',
    src: 'wp'
  },
  {
    id: 'sp-2011-sarajevo',
    art: 'spiel',
    title: '43:18 in der Champions League',
    kicker: 'Champions League 2011/12 · Gruppe A',
    big: '43:18',
    text: 'Heimsieg gegen RK Bosna Sarajevo mit 25 Toren Unterschied, auf dem Weg in den zweiten Achtelfinal in Folge.',
    src: 'wp'
  },
  {
    id: 'sp-2012-atletico',
    art: 'spiel',
    title: 'Auswärtssieg in Madrid',
    kicker: 'Champions League 2011/12 · Achtelfinal',
    big: '30:26',
    text: 'Bei Atlético Madrid gewinnen die Kadetten auswärts mit vier Toren. Das 27:36 aus dem Hinspiel ist aber zu viel.',
    src: 'wp'
  },
  {
    id: 'sp-2012-szeged',
    art: 'spiel',
    title: 'Pick Szeged bezwungen',
    kicker: 'Champions League 2012/13 · Heim',
    big: '36:29',
    text: 'Deutlicher Heimsieg in der Gruppenphase gegen den ungarischen Spitzenklub.',
    src: 'wp'
  },
  {
    id: 'sp-2017-plock',
    art: 'spiel',
    title: 'Sieg gegen Wisła Płock',
    kicker: 'Champions League 2016/17 · Heim',
    big: '27:25',
    text: 'In einer Gruppe mit Kiel, Flensburg, Barcelona, Paris und Veszprém gewinnen die Kadetten zu Hause gegen Wisła Płock.',
    src: 'wp'
  }
];

const orte = [
  {
    id: 'o-arena',
    art: 'ort',
    title: 'BBC Arena',
    kicker: 'Heimhalle seit 2011',
    big: '3500',
    text: 'Das Nationale Handball-Trainings- und Leistungszentrum im Schweizersbild: Spielhalle mit rund 3500 Plätzen, Trainingshallen, Campus. Initiant und Hauptgeldgeber war Giorgio Behr.',
    facts: [
      ['Eröffnet', '8. September 2011'],
      ['Adresse', 'Schweizersbildstrasse 10, Schaffhausen'],
      ['Betreiberin', 'Stiftung NHTLZ']
    ],
    image: 'assets/bbc-arena.webp',
    src: 'wp, ks'
  },
  {
    id: 'o-zelt',
    art: 'ort',
    title: 'Das Zelt in Frauenfeld',
    kicker: 'Hallenhandball der frühen Jahre',
    big: 'Zelt',
    text: 'Unvergesslich: Spiele im Zelt der Messe Frauenfeld, auf Asphalt und wegen der Kälte mit Mütze, Trainingsanzug und mehreren Leibchen übereinander.',
    src: 'ks'
  },
  {
    id: 'o-kleinfeld',
    art: 'ort',
    title: 'Kleinfeld im Freien',
    kicker: 'Ab 1966',
    big: '1966',
    text: 'Nach dem Feldhandball wechseln die Kadetten 1966 aufs Kleinfeld, mangels Hallen meist im Freien auf harten Unterlagen. Der NLB-Aufstieg scheitert knapp an der Tordifferenz gegenüber dem BSV Stans.',
    src: 'ks'
  },
  {
    id: 'o-huette',
    art: 'ort',
    title: 'Kadetten-Hütte',
    kicker: 'Auf dem Hagen bei Merishausen',
    big: 'Hagen',
    text: 'Die Alt-Kadetten besitzen und betreiben die Hütte auf dem Hagen. Sie wird oft für Team-Anlässe genutzt.',
    src: 'ks'
  }
];

const trainer = [
  {
    id: 't-behr',
    art: 'trainer',
    title: 'Giorgio Behr',
    kicker: 'Spielertrainer und Trainer',
    big: '1979',
    text: 'Führte 1974 die Junioren in die Interregionale Klasse, 1978 als Spielertrainer die erste Mannschaft in die Interregionale 1. Liga und 1979 als Trainer erstmals in die Nationalliga B.',
    src: 'ks'
  },
  {
    id: 't-ruff',
    art: 'trainer',
    title: 'Marcel Ruff',
    kicker: 'Trainer in der NLB',
    big: 'NLB',
    text: 'Erfolgreicher Junioren-Trainer der 70er-Jahre und später Trainer der ersten Mannschaft in der Nationalliga B.',
    src: 'ks'
  },
  {
    id: 't-kocsis',
    art: 'trainer',
    title: 'Pál Kocsis',
    kicker: 'Spieler und Trainer aus Ungarn',
    big: '1988',
    text: 'Der erste ausländische Spieler der Kadetten, ein Crack aus dem ungarischen Nationalteam. Als Trainer führte er die Kadetten 1988 erstmals in die Nationalliga A und in den Europacup.',
    src: 'ks'
  },
  {
    id: 't-tominec',
    art: 'trainer',
    title: 'Matjaž Tominec',
    kicker: 'Aufstieg und erster Pokal',
    big: '1999',
    text: 'Mit ihm gelang der Wiederaufstieg in die NLA, 1991/92 erstmals der Ligaerhalt und 1999 der erste Cupsieg.',
    src: 'ks'
  },
  {
    id: 't-perkovac',
    art: 'trainer',
    title: 'Goran Perkovac',
    kicker: 'Trainer ab Oktober 2003',
    big: '2005',
    text: 'Übernahm im Oktober 2003, gewann 2004 und 2005 den Cup und 2005 die erste Meisterschaft der Vereinsgeschichte. Daneben betreute er die griechische Nationalmannschaft.',
    src: 'wp, ks'
  },
  {
    id: 't-hrachovec',
    art: 'trainer',
    title: 'Petr Hrachovec',
    kicker: 'Spieler und Trainer',
    big: '2010',
    text: 'Früher Flügel links der Kadetten, als Trainer 2010 im EHF-Cup-Final gegen den TBV Lemgo: die erste Teilnahme an einem Europacup-Final.',
    src: 'wp, ks'
  },
  {
    id: 't-baur',
    art: 'trainer',
    title: 'Markus Baur',
    kicker: 'Juli 2013 bis Dezember 2015',
    big: '2014',
    text: 'Unter seiner Führung gewannen die Kadetten 2014 und 2015 die Meisterschaft sowie 2014 den Cup.',
    src: 'wp'
  },
  {
    id: 't-walther',
    art: 'trainer',
    title: 'Lars Walther',
    kicker: 'Trainer ab Dezember 2015',
    big: '2016',
    text: 'Der Däne führte die Kadetten 2016 zum Double aus Meisterschaft und Cup.',
    src: 'wp'
  },
  {
    id: 't-ehret',
    art: 'trainer',
    title: 'Arno Ehret',
    kicker: 'Dezember 2017 bis 2018',
    big: '2018',
    text: 'Früherer deutscher Nationalspieler und Mitglied der Handball Hall of Fame. Trainer der Kadetten bis Ende der Saison 2017/18.',
    src: 'wp'
  },
  {
    id: 't-eyjolfsson',
    art: 'trainer',
    title: 'Aðalsteinn Eyjólfsson',
    kicker: 'Trainer ab Sommer 2020',
    big: '2022',
    text: 'Der Isländer gewann mit den Kadetten 2022 und 2023 die Meisterschaft.',
    src: 'wp'
  },
  {
    id: 't-wille',
    art: 'trainer',
    title: 'Jonas Wille',
    kicker: 'Cheftrainer seit 2026/27',
    big: '2026',
    text: 'Der Norweger will schnellen Handball spielen und die ganze Breite des Spielfelds nutzen. Assistent ist Jørgen Laug.',
    src: 'mp, wp'
  }
];

const macher = [
  {
    id: 'p-keller',
    art: 'macher',
    title: 'Martin Keller',
    kicker: 'Der Anfang',
    big: 'Start',
    text: 'Unter ihm begannen die Kadetten kurz nach dem Zweiten Weltkrieg mit Handball auf dem Grossfeld. Später wurde er in den Stadtrat gewählt.',
    src: 'ks'
  },
  {
    id: 'p-baader',
    art: 'macher',
    title: 'Kurt Baader',
    kicker: 'Vereinsführung der NLB-Jahre',
    big: 'Futura',
    text: 'Führte den Verein durch die Jahre in der Nationalliga B. Ehrenmitglied der Kadetten und Gründer der ersten Sponsorenorganisation, Kadetten Futura.',
    src: 'ks'
  },
  {
    id: 'p-mordasini',
    art: 'macher',
    title: 'Karl Mordasini',
    kicker: 'Präsident bis 1989',
    big: '1989',
    text: 'Übernahm das Präsidium nach dem Abstieg in die 1. Liga und führte den Neustart. Später erfolgreich im Schweizer Handball-Verband und dort Ehrenmitglied.',
    src: 'ks'
  },
  {
    id: 'p-hotz',
    art: 'macher',
    title: 'Walter Hotz',
    kicker: 'Präsident bis 1992',
    big: '1992',
    text: 'Sprang als Vizepräsident in die Bresche und schaffte mit Trainer Matjaž Tominec den Wiederaufstieg und den ersten Ligaerhalt in der NLA.',
    src: 'ks'
  },
  {
    id: 'p-behr',
    art: 'macher',
    title: 'Giorgio Behr',
    kicker: 'Präsident seit 1992',
    big: '1992',
    text: 'Spieler, Trainer und seit 1992 Präsident. In seiner Zeit kamen alle 15 Meistertitel. Initiant der BBC Arena, geboren 1948 in Schaffhausen.',
    src: 'ks, wp, mp'
  },
  {
    id: 'p-krebser',
    art: 'macher',
    title: 'Urs Krebser',
    kicker: 'Vereinspräsident ab 2013',
    big: '2013',
    text: 'Früherer Spieler der ersten Mannschaft. Übernahm 2013 von Giorgio Behr das Vereinspräsidium und damit Jugend- und Breitensport.',
    src: 'ks'
  },
  {
    id: 'p-leutwyler',
    art: 'macher',
    title: 'Peter Leutwyler',
    kicker: 'Manager Leistungssport',
    big: '2014',
    text: 'Lange für den Leistungssport verantwortlich. 2014 wurde er zum Vizepräsidenten des nationalen Verbandes gewählt.',
    src: 'ks'
  },
  {
    id: 'p-vass',
    art: 'macher',
    title: 'Gabor Vass',
    kicker: 'Spieler und Sportverantwortlicher',
    big: '2014',
    text: 'Langjähriger früherer Spieler. Übernahm 2014 die Verantwortung für den Leistungssport der Kadetten.',
    src: 'ks'
  }
];

const legenden = [
  {
    id: 'l-graubner',
    art: 'legende',
    title: 'David Graubner',
    kicker: 'Captain · Schweiz',
    big: '8×',
    text: 'Langjähriger Captain der Kadetten und der Nationalmannschaft. Achtmal Schweizer Meister, EHF-Cup-Finalist 2010. Seit Juli 2017 Geschäftsführer der Kadetten Handball AG.',
    facts: [['Meister', '2007, 2010–2012, 2014–2017']],
    src: 'wp, ks'
  },
  {
    id: 'l-liniger',
    art: 'legende',
    title: 'Manuel Liniger',
    kicker: 'Flügel links · Schweiz',
    big: '4×',
    text: 'Kam zweimal zu den Kadetten zurück. Meister 2010, 2015, 2016 und 2017, Cupsieger 2008 und 2016.',
    src: 'wp'
  },
  {
    id: 'l-tominec',
    art: 'legende',
    title: 'Nik Tominec',
    kicker: 'Flügel rechts · Schweiz',
    big: '7×',
    text: 'Ab 2011 bei den Kadetten, beendete 2023 hier seine Laufbahn. Siebenmal Meister, dreimal Cupsieger, achtmal Supercupsieger.',
    facts: [['Meister', '2012, 2014, 2016, 2017, 2019, 2022, 2023']],
    src: 'wp'
  },
  {
    id: 'l-gustavsson',
    art: 'legende',
    title: 'Björgvin Páll Gústavsson',
    kicker: 'Torhüter · Island',
    big: '2011',
    text: 'Der isländische Nationaltorhüter wurde mit den Kadetten 2010 und 2011 Meister und 2011 Cupsieger.',
    src: 'wp'
  },
  {
    id: 'l-csaszar',
    art: 'legende',
    title: 'Gábor Császár',
    kicker: 'Rückraum Mitte · Ungarn',
    big: '4×',
    text: 'Kam im Februar 2015 und gewann 2015, 2016, 2017 und 2019 die Meisterschaft sowie 2016 den Cup.',
    src: 'wp'
  },
  {
    id: 'l-canellas',
    art: 'legende',
    title: 'Joan Cañellas',
    kicker: 'Rückraum · Spanien',
    big: '3×',
    text: 'Der spanische Welt- und Europameister spielte von 2021 bis 2024 in Schaffhausen und wurde dreimal Schweizer Meister.',
    facts: [['Meister', '2022, 2023, 2024']],
    src: 'wp'
  },
  {
    id: 'l-sesum',
    art: 'legende',
    title: 'Žarko Šešum',
    kicker: 'Rückraum Mitte · Serbien',
    big: '2019',
    text: 'Wechselte 2018 nach Schaffhausen und wurde 2019 Meister. Die Kadetten waren seine letzte Station.',
    src: 'wp'
  },
  {
    id: 'l-patrail',
    art: 'legende',
    title: 'Mait Patrail',
    kicker: 'Rückraum · Estland',
    big: '2010',
    text: 'Ab 2008 bei den Kadetten. Meister 2010 und 2011 und Teil des Teams im EHF-Pokal-Final 2010.',
    src: 'wp'
  },
  {
    id: 'l-jurca',
    art: 'legende',
    title: 'Rareș Jurcă',
    kicker: 'Rückraum rechts · Rumänien',
    big: '4×',
    text: 'Zweimal bei den Kadetten: 2007 im Tausch für Dragan Jerković und ab 2010 erneut. Meister 2011, 2012, 2014 und 2015.',
    src: 'wp'
  },
  {
    id: 'l-jerkovic',
    art: 'legende',
    title: 'Dragan Jerković',
    kicker: 'Torhüter · Kroatien',
    big: '2006',
    text: 'Kam 2006 und wurde Meister, Cup- und Supercupsieger. Ab 2019/20 Torhütertrainer der Kadetten und der Suisse Handball Academy.',
    src: 'wp'
  },
  {
    id: 'l-pilipovic',
    art: 'legende',
    title: 'Kristian Pilipović',
    kicker: 'Torhüter · Kroatien und Österreich',
    big: '3×',
    text: 'Zweimal bei den Kadetten, Meister 2019, 2022 und 2023. Im Oktober 2025 wechselte er nach Ohrid.',
    src: 'wp'
  },
  {
    id: 'l-portner',
    art: 'legende',
    title: 'Nikola Portner',
    kicker: 'Torhüter · Schweiz',
    big: '2014',
    text: 'Der Schweizer Nationaltorhüter stand ab der Saison 2014/15 im Tor der Kadetten, auch in der Champions League.',
    src: 'wp'
  },
  {
    id: 'l-dissinger',
    art: 'legende',
    title: 'Christian Dissinger',
    kicker: 'Rückraum links · Deutschland',
    big: '2012',
    text: 'Kam 2011 als junges Talent, wurde 2012 Meister und Supercupsieger und spielte danach unter anderem beim THW Kiel.',
    src: 'wp'
  },
  {
    id: 'l-cho',
    art: 'legende',
    title: 'Cho Chi-hyo',
    kicker: 'Rückraum · Südkorea',
    big: '3×',
    text: 'Dreifacher Olympiateilnehmer. Nach neun Jahren bei Pfadi Winterthur spielte er zwei Jahre für die Kadetten.',
    src: 'wp'
  },
  {
    id: 'l-karipidis',
    art: 'legende',
    title: 'Savas Karipidis',
    kicker: 'Rückraum · Griechenland',
    big: '2005',
    text: 'Nur ein halbes Jahr in Schaffhausen, im Frühling 2005, und doch Teil der ersten Meistermannschaft. Später Torschützenkönig der Bundesliga 2008/09.',
    src: 'wp'
  },
  {
    id: 'l-rauh',
    art: 'legende',
    title: 'Matthias Rauh',
    kicker: 'Aussen · Deutschland',
    big: '2005',
    text: 'Spielte von 2005 bis 2010 für die Kadetten und feierte hier seine grössten Erfolge.',
    src: 'wp'
  },
  {
    id: 'l-elezovic',
    art: 'legende',
    title: 'Uroš Elezović',
    kicker: 'Rückraum Mitte · Serbien',
    big: '2012',
    text: 'Kam im Februar 2012 und feierte am Saisonende die Meisterschaft.',
    src: 'wp'
  },
  {
    id: 'l-bruengger',
    art: 'legende',
    title: 'Severin Brüngger',
    kicker: 'Kreisläufer · Schweiz',
    big: '1999',
    text: 'Von 1998 bis 2003 bei den Kadetten und 1999 Teil des ersten Cupsiegs. Später im Verwaltungsrat und Präsident von Junioren und Breitensport.',
    src: 'wp'
  },
  {
    id: 'l-frimmel',
    art: 'legende',
    title: 'Sebastian Frimmel',
    kicker: 'Flügel links · Österreich',
    big: '2019',
    text: 'Ab 2018/19 bei den Kadetten, Meister 2019 und Cupsieger 2021.',
    src: 'wp'
  },
  {
    id: 'l-jenny',
    art: 'legende',
    title: 'Pascal Jenny',
    kicker: 'Flügel links · Schweiz',
    big: 'CH',
    text: 'Schweizer Nationalspieler, spielte für TV Suhr, die Kadetten und GC. Später wurde er Tourismusdirektor von Arosa.',
    src: 'wp'
  }
];

export const FIXED_CARDS = [...titel, ...spiele, ...orte, ...trainer, ...macher, ...legenden];

/** Quellen-Kürzel der Rückseite. */
export const SOURCES = {
  ks: 'kadettensh.ch, Geschichte',
  kader: 'kadettensh.ch, Spielerprofile',
  mp: 'Matchprogramm 2026/27',
  wp: 'Wikipedia',
  ehf: 'EHF-Archiv'
};
