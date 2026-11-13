/* Hallenfotos mit Quellen und Bildnachweis. Reine Daten, keine Logik. */
const venuePhotos = [
  {
    url: 'https://storage.flyo.cloud/schachenhalle-aarau-1_8787a5ae.jpg?w=1920&format=webp',
    source: 'https://www.aarauinfo.ch/ort/sporthalle-schachen-aarau',
    credit: 'Aarau Info',
    hall: 'Sporthalle Schachen',
    image: 'hall-aarau.jpg',
    width: 800,
    height: 533,
    match: 'Schachen',
    alt: 'Innenansicht der Sporthalle Schachen'
  },
  {
    url: 'https://www.pfadi-winterthur.ch/wp-content/uploads/2022/10/221026_3117_AXA-ARENA_ausverkauft_Pfadi-Kriens_deuring.jpg',
    source: 'https://www.pfadi-winterthur.ch/sponsoren/axa-arena/',
    credit: 'Martin Deuring / Pfadi Winterthur',
    hall: 'AXA Arena',
    image: 'hall-winterthur.jpg',
    width: 800,
    height: 533,
    match: 'AXA Arena',
    alt: 'Innenansicht der AXA Arena'
  },
  {
    url: 'https://www.stadt.sg.ch/news/stsg_medienmitteilungen/2026/05/sporthalle-kreuzbleiche--machbarkeitsstudie-gestartet/_jcr_content/newsdetail/image.imageWidth__1140.jpg',
    source:
      'https://www.stadt.sg.ch/news/stsg_medienmitteilungen/2026/05/sporthalle-kreuzbleiche--machbarkeitsstudie-gestartet.html',
    credit: 'Stadt St.Gallen',
    hall: 'Sporthalle Kreuzbleiche',
    image: 'hall-stgallen.jpg',
    width: 800,
    height: 450,
    match: 'Kreuzbleiche',
    alt: 'Aussenansicht der Sporthalle Kreuzbleiche'
  },
  {
    url: 'https://www.europlan-online.de/files/bd8306a7dc1b84377758ab45605f756d.jpg',
    source: 'https://www.europlan-online.de/sporthalle-lachen/stadion-71466.html',
    credit: 'Adrian Spiak / Europlan',
    hall: 'Lachenhalle',
    image: 'hall-thun.jpg',
    width: 600,
    height: 450,
    match: 'Lachen',
    alt: 'Innenansicht der Lachenhalle'
  },
  {
    url: 'https://mobiliar.rokka.io/dynamic/noop/7e6a07627e6493dcfecf0dbfed7b884a041daadb/header-mobiliar-arena.jpg',
    source: 'https://www.mobiliar.ch/ueber-uns/sponsoring-und-events/mobiliar-arena',
    credit: 'Die Mobiliar',
    hall: 'Mobiliar Arena',
    image: 'hall-bern.jpg',
    width: 800,
    height: 196,
    match: 'Mobiliar Arena',
    alt: 'Aussenansicht der Mobiliar Arena'
  },
  {
    url: 'https://media.bs.ch/fe_nuxt_crop/variables-w-796-h-448/681ee6678c89c0682ad1bb69b99621e52910661a/image.jpg',
    source: 'https://www.bs.ch/schwerpunkte/bauprojekte/seiten/hochbauprojekte/sporthalle-rankhof-neubau',
    credit: 'Kanton Basel-Stadt',
    hall: 'Sporthalle Rankhof',
    image: 'hall-basel.jpg',
    width: 796,
    height: 448,
    match: 'Rankhof',
    alt: 'Aussenansicht der Sporthalle Rankhof'
  },
  {
    url: 'https://www.halter-gruppe.ch/files/newsarticle/res-1920x829xccenters/Pre-Opening-Pilatus-Arena-01.jpg',
    source:
      'https://www.halter-gruppe.ch/de/news/von-der-vision-zur-realitaet-die-pilatus-arena-eroeffnet-ein-neues-kapitel-fuer-sport-events-und-kultur-in-der-zentralschweiz',
    credit: 'Halter Gruppe',
    hall: 'Pilatus Arena',
    image: 'hall-kriens.jpg',
    width: 800,
    height: 345,
    match: 'Pilatus Arena',
    alt: 'Innenansicht der Pilatus Arena'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Zuerich_Saalsporthalle_P6A5414.jpg',
    image: 'hall-zuerich.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Zuerich_Saalsporthalle_P6A5414.jpg',
    credit: 'Bobo11',
    width: 800,
    height: 533,
    hall: 'Saalsporthalle',
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    match: 'Saalsporthalle',
    alt: 'Aussenansicht der Saalsporthalle'
  },
  {
    url: 'https://www.handballstaefa.ch/wp-content/uploads/2021/10/2122_Camp-Tag5-5.jpg',
    image: 'hall-staefa.jpg',
    source: 'https://www.handballstaefa.ch/2021/10/22/sport-handball-camp-tag-5/',
    credit: 'Handball Stäfa',
    width: 800,
    height: 306,
    hall: 'Sporthalle Frohberg',
    match: 'Frohberg',
    alt: 'Innenansicht der Sporthalle Frohberg'
  },
  {
    match: 'BBC Arena',
    image: 'bbc-arena-hall.jpg',
    width: 795,
    height: 530,
    alt: 'Innenansicht der BBC Arena mit Handballfeld und Tribünen',
    credit: 'BBC Arena',
    source: 'https://bbcarena.ch/portfolio-item/halle/'
  }
];
