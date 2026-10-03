/* Kader, Spielerprofile und Torstatistik. Reine Daten, keine Logik. */
const playerBios = {
  18: {
    facts: [
      ['Geburtsdatum', '21.10.1999'],
      ['Grösse', '202 cm'],
      ['Gewicht', '107 kg'],
      ['Bei den Kadetten seit', '2023']
    ],
    url: 'https://kadettensh.ch/spieler/ariel-pietrasik/'
  },
  21: {
    facts: [
      ['Geburtsdatum', '26.03.1998'],
      ['Grösse', '190 cm'],
      ['Gewicht', '100 kg'],
      ['Bei den Kadetten seit', '2025']
    ],
    url: 'https://kadettensh.ch/spieler/daniel-reznicky/'
  },
  9: {
    facts: [
      ['Geburtsdatum', '18.02.1994'],
      ['Grösse', '191 cm'],
      ['Gewicht', '91 kg'],
      ['Bei den Kadetten seit', '2025']
    ],
    url: 'https://kadettensh.ch/spieler/dimitrij-kuettel/'
  },
  8: {
    facts: [
      ['Geburtsdatum', '05.07.1999'],
      ['Grösse', '192 cm'],
      ['Gewicht', '92 kg'],
      ['Bei den Kadetten seit', '2026']
    ],
    url: 'https://kadettensh.ch/spieler/frederik-tilsted/'
  },
  12: {
    facts: [
      ['Geburtsdatum', '15.08.2006'],
      ['Grösse', '188 cm'],
      ['Gewicht', '96 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/gwendal-dussey/'
  },
  10: {
    facts: [
      ['Geburtsdatum', '05.06.1992'],
      ['Grösse', '180 cm'],
      ['Gewicht', '86 kg'],
      ['Bei den Kadetten seit', '2025']
    ],
    url: 'https://kadettensh.ch/spieler/josip-peric/'
  },
  13: {
    facts: [
      ['Geburtsdatum', '12.01.2007'],
      ['Grösse', '185 cm'],
      ['Gewicht', '75 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/julian-kemmerling/'
  },
  1: {
    facts: [
      ['Geburtsdatum', '17.04.2004'],
      ['Grösse', '196 cm'],
      ['Gewicht', '100 kg'],
      ['Bei den Kadetten seit', '2025']
    ],
    url: 'https://kadettensh.ch/spieler/leon-bergmann/'
  },
  2: {
    facts: [
      ['Geburtsdatum', '16.08.1996'],
      ['Grösse', '196 cm'],
      ['Gewicht', '109 kg'],
      ['Bei den Kadetten seit', '2024']
    ],
    url: 'https://kadettensh.ch/spieler/lucas-meister/'
  },
  20: {
    facts: [
      ['Geburtsdatum', '20.03.1994'],
      ['Grösse', '196 cm'],
      ['Gewicht', '99 kg'],
      ['Bei den Kadetten seit', '2015']
    ],
    url: 'https://kadettensh.ch/spieler/luka-maros/'
  },
  4: {
    facts: [
      ['Geburtsdatum', '09.06.1997'],
      ['Grösse', '192 cm'],
      ['Gewicht', '93 kg'],
      ['Bei den Kadetten seit', '2025']
    ],
    url: 'https://kadettensh.ch/spieler/lukas-saueressig/'
  },
  14: {
    facts: [
      ['Geburtsdatum', '24.02.2006'],
      ['Grösse', '186 cm'],
      ['Gewicht', '80 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/manuel-speicher/'
  },
  16: {
    facts: [
      ['Geburtsdatum', '15.09.2004'],
      ['Grösse', '198 cm'],
      ['Gewicht', '98 kg'],
      ['Bei den Kadetten seit', '2026']
    ],
    url: 'https://kadettensh.ch/spieler/mathieu-seravalli/'
  },
  11: {
    facts: [
      ['Geburtsdatum', '01.11.2002'],
      ['Grösse', '201 cm'],
      ['Gewicht', '103 kg'],
      ['Bei den Kadetten seit', '2026']
    ],
    url: 'https://kadettensh.ch/spieler/mikkel-olsen/'
  },
  15: {
    facts: [
      ['Geburtsdatum', '21.06.2008'],
      ['Grösse', '186 cm'],
      ['Gewicht', '75 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/milan-lutz/'
  },
  5: {
    facts: [
      ['Geburtsdatum', '27.01.2005'],
      ['Grösse', '180 cm'],
      ['Gewicht', '80 kg'],
      ['Bei den Kadetten seit', '2026']
    ],
    url: 'https://kadettensh.ch/spieler/nikos-sarlos/'
  },
  6: {
    facts: [
      ['Geburtsdatum', '23.10.1997'],
      ['Grösse', '183 cm'],
      ['Gewicht', '84 kg'],
      ['Bei den Kadetten seit', '2022']
    ],
    url: 'https://kadettensh.ch/spieler/odinn-rikhardsson/'
  },
  22: {
    facts: [
      ['Geburtsdatum', '29.08.2000'],
      ['Grösse', '188 cm'],
      ['Gewicht', '91 kg'],
      ['Bei den Kadetten seit', '2024']
    ],
    url: 'https://kadettensh.ch/spieler/patrik-martinovic/'
  },
  7: {
    facts: [
      ['Geburtsdatum', '17.08.2005'],
      ['Grösse', '188 cm'],
      ['Gewicht', '88 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/silas-mueller/'
  },
  3: {
    facts: [
      ['Geburtsdatum', '23.01.2006'],
      ['Grösse', '190 cm'],
      ['Gewicht', '85 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/yari-prince/'
  },
  19: {
    facts: [
      ['Geburtsdatum', '06.05.1995'],
      ['Grösse', '197 cm'],
      ['Gewicht', '100 kg'],
      ['Bei den Kadetten seit', 'Seit den Junioren']
    ],
    url: 'https://kadettensh.ch/spieler/zoran-markovic/'
  }
};
const players = [
  [1, 'Leon Bergmann', 'Tor'],
  [2, 'Lucas Meister', 'Kreis'],
  [3, 'Yari Prince', 'Flügel links'],
  [4, 'Lukas Saueressig', 'Rückraum mitte'],
  [5, 'Nikos Sarlos', 'Flügel links'],
  [6, 'Odinn Rikhardsson', 'Flügel rechts'],
  [7, 'Silas Müller', 'Rückraum links'],
  [8, 'Frederik Tilsted', 'Rückraum mitte'],
  [9, 'Dimitrij Küttel', 'Rückraum rechts'],
  [10, 'Josip Perić', 'Rückraum mitte'],
  [11, 'Mikkel Olsen', 'Kreis'],
  [12, 'Gwendal Dussey', 'Tor'],
  [13, 'Julian Kemmerling', 'Flügel links'],
  [14, 'Manuel Speicher', 'Rückraum links'],
  [15, 'Milan Lutz', 'Flügel rechts'],
  [16, 'Mathieu Seravalli', 'Tor'],
  [18, 'Ariel Pietrasik', 'Rückraum links'],
  [19, 'Zoran Markovic', 'Rückraum links'],
  [20, 'Luka Maros', 'Rückraum links'],
  [21, 'Daniel Reznicky', 'Kreis'],
  [22, 'Patrik Martinovic', 'Rückraum rechts']
];
const goals = {1: 1, 2: 2, 3: 0, 4: 0, 5: 2, 6: 14, 8: 6, 9: 3, 10: 3, 11: 0, 15: 1, 16: 0, 18: 3, 19: 0, 20: 4, 21: 0};
