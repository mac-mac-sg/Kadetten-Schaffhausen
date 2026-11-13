/* Editorial venue registry. Verified 2026-10-21; membership and standings come from the live QHL table. */
const qhlVenueRegistry=[
  {
    "id": "kadetten",
    "name": "Kadetten Schaffhausen",
    "aliases": [
      "Kadetten Schaffhausen"
    ],
    "city": "Schaffhausen",
    "venue": "BBC Arena",
    "address": "Schweizersbildstrasse 10, 8207 Schaffhausen",
    "coordinates": [
      8.647171,
      47.720398
    ],
    "website": "https://kadettensh.ch/",
    "source": "https://bbcarena.ch/kontakt/",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Schweizersbildstrasse+10+Schaffhausen&type=locations&origins=address&limit=1",
    "description": "Handball aus Schaffhausen. Die BBC Arena im Schweizersbild ist die Heimstätte der Kadetten.",
    "photo": "assets/bbc-arena-hall.webp"
  },
  {
    "id": "kriens",
    "name": "HC Kriens-Luzern",
    "aliases": [
      "HC Kriens-Luzern"
    ],
    "city": "Kriens",
    "venue": "Pilatus Arena",
    "address": "Am Mattenhof 3, 6010 Kriens",
    "coordinates": [
      8.301414,
      47.026409
    ],
    "website": "https://hckriens-luzern.ch/",
    "source": "https://pilatusarena.ch/",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Am+Mattenhof+3+Kriens&type=locations&origins=address&limit=1",
    "description": "Zentralschweizer Handball in der Pilatus Arena im Quartier Mattenhof.",
    "photo": null
  },
  {
    "id": "pfadi",
    "name": "Pfadi Winterthur",
    "aliases": [
      "Pfadi Winterthur"
    ],
    "city": "Winterthur",
    "venue": "AXA Arena",
    "address": "Grüzefeldstrasse 32, 8400 Winterthur",
    "coordinates": [
      8.749006,
      47.494526
    ],
    "website": "https://www.pfadi-winterthur.ch/",
    "source": "https://www.pfadi-winterthur.ch/sponsoren/axa-arena/",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Gr%C3%BCzefeldstrasse+32+Winterthur&type=locations&origins=address&limit=1",
    "description": "Pfadi spielt seine Heimpartien in der AXA Arena im Winterthurer Sportpark WIN4.",
    "photo": null
  },
  {
    "id": "bern",
    "name": "BSV Bern",
    "aliases": [
      "BSV Bern"
    ],
    "city": "Gümligen",
    "venue": "Mobiliar Arena",
    "address": "Rohrmattstrasse 8, 3073 Gümligen",
    "coordinates": [
      7.505899,
      46.931549
    ],
    "website": "https://www.bsvbern.ch/",
    "source": "https://www.bsvbern.ch/club",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Rohrmattstrasse+8+G%C3%BCmligen&type=locations&origins=address&limit=1",
    "description": "Der Berner Verein ist in der Mobiliar Arena in Gümligen zu Hause.",
    "photo": null
  },
  {
    "id": "thun",
    "name": "Wacker Thun",
    "aliases": [
      "Wacker Thun"
    ],
    "city": "Thun",
    "venue": "Sporthalle Lachen",
    "address": "Gwattstrasse 25, 3604 Thun",
    "coordinates": [
      7.627892,
      46.736992
    ],
    "website": "https://www.wackerthun.ch/",
    "source": "https://www.wackerthun.ch/verein/lachenhalle/",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Gwattstrasse+25+Thun&type=locations&origins=address&limit=1",
    "description": "Wacker Thun empfängt seine Gegner in der Lachenhalle am Thunersee.",
    "photo": null
  },
  {
    "id": "basel",
    "name": "RTV 1879 Basel",
    "aliases": [
      "RTV 1879 Basel"
    ],
    "city": "Basel",
    "venue": "Sporthalle Rankhof",
    "address": "Grenzacherstrasse 405, 4058 Basel",
    "coordinates": [
      7.621322,
      47.561726
    ],
    "website": "https://www.rtv1879basel.ch/",
    "source": "https://www.bs.ch/schwerpunkte/bauprojekte/seiten/hochbauprojekte/sporthalle-rankhof-neubau",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Grenzacherstrasse+405+Basel&type=locations&origins=address&limit=1",
    "description": "Der Basler Traditionsverein spielt seine Heimpartien in der Sporthalle Rankhof.",
    "photo": null
  },
  {
    "id": "otmar",
    "name": "TSV St. Otmar St. Gallen",
    "aliases": [
      "TSV St. Otmar St. Gallen",
      "St. Otmar St. Gallen",
      "TSV St.Otmar St.Gallen"
    ],
    "city": "St. Gallen",
    "venue": "Sporthalle Kreuzbleiche",
    "address": "Bogenstrasse 10, 9000 St. Gallen",
    "coordinates": [
      9.361887,
      47.419842
    ],
    "website": "https://otmar.ch/",
    "source": "https://www.sport.stadt.sg.ch/home/sportanlagen/sportanlage-kreuzbleiche.html",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Bogenstrasse+10+St.+Gallen&type=locations&origins=address&limit=1",
    "description": "Gelbschwarzer Handball aus St. Gallen. Heimspielstätte ist die Sporthalle Kreuzbleiche.",
    "photo": "assets/otmar-kreuzbleiche.webp"
  },
  {
    "id": "suhr",
    "name": "HSC Suhr Aarau",
    "aliases": [
      "HSC Suhr Aarau"
    ],
    "city": "Aarau",
    "venue": "Sporthalle Schachen",
    "address": "Schachenallee 29, 5000 Aarau",
    "coordinates": [
      8.040905,
      47.38892
    ],
    "website": "https://hscsuhraarau.ch/",
    "source": "https://www.ehsm.admin.ch/dam/fr/sd-web/87SWvdRvXQAh/sportanlagen-verzeichnis-hallen%20mit-1000-5000-zuschauerplaetzen_DE.pdf",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Schachenallee+29+Aarau&type=locations&origins=address&limit=1",
    "description": "Der HSC Suhr Aarau trägt seine Heimspiele in der Sporthalle Schachen in Aarau aus.",
    "photo": null
  },
  {
    "id": "gc",
    "name": "GC Amicitia Zürich",
    "aliases": [
      "GC Amicitia Zürich"
    ],
    "city": "Zürich",
    "venue": "Saalsporthalle",
    "address": "Giesshübelstrasse 41, 8045 Zürich",
    "coordinates": [
      8.52006,
      47.356915
    ],
    "website": "https://www.gc-amicitia.ch/",
    "source": "https://www.gc-amicitia.ch/maenner/qhl-maenner/kontakte/",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Giessh%C3%BCbelstrasse+41+Z%C3%BCrich&type=locations&origins=address&limit=1",
    "description": "Zürcher Spitzenhandball in der Saalsporthalle im Quartier Wiedikon.",
    "photo": null
  },
  {
    "id": "staefa",
    "name": "Handball Stäfa",
    "aliases": [
      "Handball Stäfa"
    ],
    "city": "Stäfa",
    "venue": "Sport- und Mehrzweckhalle Frohberg",
    "address": "Rhynerstrasse 62, 8712 Stäfa",
    "coordinates": [
      8.739185,
      47.247318
    ],
    "website": "https://www.handballstaefa.ch/",
    "source": "https://www.staefa.ch/verwaltung/gemeindeverwaltung/dienstleistungen-a-z.html/339/service/1140",
    "coordinateSource": "https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Rhynerstrasse+62+St%C3%A4fa&type=locations&origins=address&limit=1",
    "description": "Handball vom rechten Zürichseeufer. Gespielt wird in der Frohberg-Halle oberhalb von Stäfa.",
    "photo": null
  }
];
