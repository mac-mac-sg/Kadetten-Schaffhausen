import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {parseTickets, withTickets, ticketLink} from '../server/update.mjs';
import {ticketUrl} from '../src/kadetten/js/logic.js';
import {previewHero} from '../src/kadetten/js/views/jetzt.js';

const TM = 'https://www.ticketmaster.ch/event/kadetten-vs-chambery-tickets/761426654';

test('Datendienst: Ticket-Links aus tickets.json, nur Ticketmaster und Ticketcorner über https', () => {
  assert.equal(ticketLink(TM), TM);
  assert.equal(ticketLink('https://www.ticketcorner.ch/artist/x/#calendar'), 'https://www.ticketcorner.ch/artist/x/#calendar');
  for (const bad of [
    'http://www.ticketmaster.ch/event/1',
    'https://evil.example/ticketmaster.ch',
    'https://user:pw@www.ticketmaster.ch/',
    'javascript:alert(1)',
    42,
    null
  ])
    assert.equal(ticketLink(bad), null, String(bad));
  const map = parseTickets({
    matches: [
      {gameId: 508403, ticket_url: TM},
      {gameId: 'extra-ehl-20261124-kadetten-chambery', ticket_url: TM},
      {gameId: 'extra-ehl-20261013-chambery-kadetten', ticket_url: TM},
      {gameId: 1, ticket_url: 'https://evil.example/'}
    ]
  });
  assert.equal(map.size, 3);
  assert.equal(parseTickets({501717: TM}).get('501717'), TM, 'Format mit Spiel-ID als Schlüssel');
  assert.throws(() => parseTickets({matches: []}), /No ticket links/);
  const games = withTickets(
    [
      {id: '508403', home: 'Kadetten Schaffhausen'},
      {id: 'chambery', home: 'Chambery'},
      {id: '508418', home: 'Kadetten Schaffhausen', tickets: 'https://www.ticketmaster.ch/alt'}
    ],
    map
  );
  assert.equal(games[0].tickets, TM);
  assert.equal(games[1].tickets, TM, 'App-ID «chambery» wird über die Matchcenter-ID gefunden');
  assert.equal(games[2].tickets, undefined, 'veralteter Link wird entfernt');
});

const game = {
  id: '508403',
  date: '2026-12-05',
  time: '18:00',
  home: 'Kadetten Schaffhausen',
  away: 'TSV St. Otmar St. Gallen',
  league: 'QHL',
  venue: 'BBC Arena, Schaffhausen',
  tickets: TM
};
const before = Date.parse('2026-11-30T12:00:00+01:00');

test('App: Ticket-Link nur bei Heimspielen vor Anpfiff und nur mit gültigem Link', () => {
  assert.equal(ticketUrl(game, before), TM);
  assert.equal(ticketUrl(game, Date.parse('2026-12-05T18:00:00+01:00')), null, 'ab Anpfiff kein Link');
  assert.equal(ticketUrl({...game, home: game.away, away: game.home}, before), null, 'auswärts kein Link');
  assert.equal(ticketUrl({...game, tickets: 'https://evil.example/'}, before), null);
  assert.equal(ticketUrl({...game, tickets: undefined}, before), null);
});

test('Spieltagskarte: Marke «Tickets» neben dem Countdown, eigener Link, kein Link im Link', () => {
  const d = parseHTML('<html><body>' + String(previewHero(game, before)) + '</body></html>').document;
  const tk = d.querySelector('.meta .pills a.pill.tk');
  assert.ok(tk, 'Marke in der Kopfzeile');
  assert.equal(tk.getAttribute('href'), TM);
  assert.equal(tk.getAttribute('target'), '_blank');
  assert.match(tk.getAttribute('rel'), /noopener/);
  assert.match(tk.getAttribute('aria-label'), /Tickets für Kadetten/);
  assert.ok(d.querySelector('.meta .pills .pill:not(.tk)'), 'Countdown bleibt');
  assert.equal(d.querySelectorAll('a a').length, 0);
  assert.equal(d.querySelector('a.hero-link.cover').getAttribute('href'), '#/spiel/508403', 'Karte führt weiter zur Vorschau');
  const plain = parseHTML('<html><body>' + String(previewHero({...game, tickets: undefined}, before)) + '</body></html>').document;
  assert.ok(!plain.querySelector('.pill.tk') && !plain.querySelector('.cover'), 'ohne Link wie bisher');
  assert.ok(plain.querySelector('a.hero-link .meta'));
  const page = parseHTML('<html><body>' + String(previewHero(game, before, {link: false})) + '</body></html>').document;
  assert.ok(page.querySelector('.pill.tk') && !page.querySelector('.hero-link'), 'Spielseite: Marke ohne Kartenlink');
});
