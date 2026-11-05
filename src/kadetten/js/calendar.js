// Kalenderdatei (iCalendar, RFC 5545) mit den kommenden Kadetten-Spielen. Entsteht auf dem Gerät, ohne Dienst.
import {OWN_TEAM, ownGames, hasScore, kickoff, GAME_DURATION} from './logic.js';

const stamp = epoch => new Date(epoch).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
// Zeilen über 75 Zeichen werden nach RFC 5545 gefaltet.
const fold = line => line.length <= 74 ? line : line.match(/.{1,74}/g).join('\r\n ');

export function buildCalendar(games, now) {
  const upcoming = ownGames(games).filter(g => !hasScore(g) && kickoff(g) + GAME_DURATION > now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kadetten Fan-App//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Kadetten Schaffhausen'];
  for (const g of upcoming) {
    const start = kickoff(g), home = g.home === OWN_TEAM;
    lines.push('BEGIN:VEVENT', `UID:kadetten-${escape(g.id)}@kadetten-fan-app`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + GAME_DURATION)}`,
      `SUMMARY:${escape(`${g.home} – ${g.away} (${g.league})`)}`, `LOCATION:${escape(g.venue || '')}`, `DESCRIPTION:${escape(home ? 'Heimspiel' : 'Auswärtsspiel')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return {text: lines.map(fold).join('\r\n') + '\r\n', count: upcoming.length};
}
