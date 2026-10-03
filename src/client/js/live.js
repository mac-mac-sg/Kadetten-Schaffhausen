/* Live-Karte auf der Startseite und Live-Abfrage. */
let matchdayIntroDay = null;
function playMatchdayIntro(slot, day) {
  if (matchdayIntroDay === day) return;
  matchdayIntroDay = day;
  try {
    if (localStorage.getItem('kadetten-matchday-intro') === day) return;
    localStorage.setItem('kadetten-matchday-intro', day);
  } catch { /* Ohne Speicher höchstens einmal pro geöffneter App. */ }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  slot.classList.add('is-matchday-intro');
  setTimeout(() => slot.classList.remove('is-matchday-intro'), 1300);
}
function showLiveMatch() {
  const slot = document.getElementById('live-match');
  if (!slot) return;
  const {game: g, live} = homeFixture();
  if (!g) {
    slot.hidden = true;
    slot.innerHTML = '';
    return;
  }
  const today = g.date === swissToday(),
    ended = !!g.score && !live;
  const matchDate = live
    ? ''
    : new Date(g.date + 'T12:00:00Z').toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich',
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      });
  const result = ended ? teamResult(g, 'Kadetten Schaffhausen') : null;
  const html = `<div class="live-heading"><span>${live ? '<i aria-hidden="true"></i>JETZT LIVE' : ended ? 'HEUTE GESPIELT' : today ? '<i aria-hidden="true"></i>HEUTE SPIELT ORANGE' : 'NÄCHSTES SPIEL'}</span><small>${liveEscape(g.league)}${live && g.phase ? ' · ' + liveEscape(g.phase) : ''}${live && g.clock ? ' · ' + liveEscape(g.clock) : ''}</small></div><div class="live-score"><span>${badge(g.home)}<b>${liveEscape(g.home)}</b></span><strong>${live || ended ? (g.score ? g.score.join(' : ') : '– : –') : 'VS'}</strong><span>${badge(g.away)}<b>${liveEscape(g.away)}</b></span></div>${live ? '<span class="live-link">Zum offiziellen Liveticker</span>' : ended ? `<p class="match-preview-time">${result.label} · Zum Resultat und Rückblick</p>` : `<p class="match-preview-time">${relativeDay(g.date) ? relativeDay(g.date) + ' · ' : ''}${matchDate}${g.time ? ' · ' + liveEscape(g.time) + ' Uhr' : ' · Anspielzeit noch offen'}</p>${today ? `<p class="home-countdown${countdownSoon(g) ? ' is-soon' : ''}" data-countdown="${g.id}">${countdownText(g)}</p>` : ''}`}`;
  slot.href = live ? g.url : '#match/' + encodeURIComponent(g.id) + '/overview';
  if (live) {
    slot.target = '_blank';
    slot.rel = 'noopener noreferrer';
  } else {
    slot.removeAttribute('target');
    slot.removeAttribute('rel');
  }
  slot.setAttribute(
    'aria-label',
    (live ? 'Zum offiziellen Liveticker: ' : ended ? 'Zum Rückblick: ' : 'Zur Spielvorschau: ') +
      g.home +
      ' gegen ' +
      g.away
  );
  slot.classList.toggle('match-preview', !live);
  slot.classList.toggle('is-matchday', today || !!live);
  slot.classList.toggle('matchday-win', result?.state === 'win');
  slot.classList.toggle('matchday-upcoming', today && !live && !ended);
  slot.classList.toggle('is-live', !!live);
  slot.classList.toggle('matchday-over', ended && result?.state !== 'win');
  if (slot.innerHTML !== html) slot.innerHTML = html;
  slot.hidden = false;
  if (today) playMatchdayIntro(slot, g.date);
}

async function checkLiveMatch() {
  clearTimeout(liveTimer);
  if (document.hidden || !(['', '#home'].includes(location.hash) || location.hash.startsWith('#match/'))) return;
  if (!navigator.onLine) {
    liveState = null;
    showLiveMatch();
    return;
  }
  if (liveBusy) return;
  liveBusy = true;
  try {
    const r = await apiFetch('/api/live', {cache: 'no-store', signal: AbortSignal.timeout(30000)});
    const d = await r.json();
    liveState = r.ok && d.ok ? d : null;
  } catch {
    liveState = null;
  } finally {
    liveBusy = false;
    showLiveMatch();
    refreshMatchdayDetail();
    liveTimer = setTimeout(checkLiveMatch, liveState?.match ? 30000 : 60000);
  }
}
