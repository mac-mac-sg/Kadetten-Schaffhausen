// Fotos der Spielhallen für die Zeile «Spielort». Fremde Hallen nur mit Fotos unter freier Lizenz von Wikimedia Commons,
// verkleinert in assets/hallen/. Die Nachweise stehen gesammelt unter «Einstellungen» → «Bildnachweise».
export const HALLEN = [
  {match: /BBC Arena/i, image: 'assets/bbc-arena.webp'},
  {
    match: /AXA Arena/i,
    image: 'assets/hallen/axa-arena.webp',
    title: 'AXA Arena, Winterthur',
    author: 'Mokeol',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Axa_Arena_Winterthur.jpg'
  },
  {
    match: /Mobiliar Arena/i,
    image: 'assets/hallen/mobiliar-arena.webp',
    title: 'Mobiliar Arena, Gümligen',
    author: 'Mokeol',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:DieMobiliar-Arena.jpg'
  },
  {
    match: /Kreuzbleiche/i,
    image: 'assets/hallen/kreuzbleiche.webp',
    title: 'Sporthalle Kreuzbleiche, St. Gallen',
    author: 'Denkmalpflege Stadt St. Gallen',
    license: 'gemeinfrei',
    url: 'https://commons.wikimedia.org/wiki/File:Sporthalle_Kreuzbleiche_NW.jpg'
  },
  {
    match: /Saalsporthalle/i,
    image: 'assets/hallen/saalsporthalle.webp',
    title: 'Saalsporthalle, Zürich',
    author: 'Bobo11',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Zuerich_Saalsporthalle_P6A5414.jpg'
  },
  {
    match: /Sala Polivalent/i,
    image: 'assets/hallen/sala-polivalenta.webp',
    title: 'Sala Polivalentă, Bukarest',
    author: 'Darius291209',
    license: 'CC0',
    url: 'https://commons.wikimedia.org/wiki/File:Sala_Polivalent%C4%83_Bucure%C8%99ti_Exterior.jpg'
  }
];
export const hallImage = venue => HALLEN.find(h => h.match.test(String(venue || '')))?.image || null;
