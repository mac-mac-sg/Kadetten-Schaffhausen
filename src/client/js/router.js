/* Hash-Routing, Seitenaufbau und Ansichten-Setup. */
let viewObserver, newsRegionObserver;
function newsDotWindow(index, total) {
  const count = Math.min(5, total),
    start = Math.max(0, Math.min(index - (count - 2), total - count));
  return {start, end: start + count};
}
function updateNewsDots(index) {
  const buttons = [...document.querySelectorAll('[data-story]')],
    {start, end} = newsDotWindow(index, buttons.length);
  for (const button of buttons) {
    const position = Number(button.dataset.story),
      visible = position >= start && position < end,
      entering = visible && button.hidden;
    button.hidden = !visible;
    button.setAttribute('aria-pressed', String(position === index));
    button.classList.toggle('dot-entering', entering);
  }
  document
    .querySelectorAll('.story-screen')
    .forEach(el => el.classList.toggle('story-current', el.id === 'story-' + index));
}
function setupViews() {
  viewObserver?.disconnect();
  newsRegionObserver?.disconnect();
  document.body.classList.toggle('player-mode', location.hash.startsWith('#player/'));
  document.querySelectorAll('[data-player-competition]').forEach(
    b =>
      (b.onclick = () => {
        playerCompetition = b.dataset.playerCompetition;
        document
          .querySelectorAll('[data-player-competition]')
          .forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        $('#player-stats').innerHTML = playerStats(Number(location.hash.split('/')[1]));
      })
  );
  document.body.classList.toggle('immersive', location.hash === '#home' || !location.hash);
  document.documentElement.classList.toggle('snap-news', location.hash === '#home' || !location.hash);
  document.documentElement.classList.toggle('snap-profile', location.hash.startsWith('#player/'));
  document
    .querySelectorAll('[data-story]')
    .forEach(
      b =>
        (b.onclick = () =>
          (b.dataset.story === '0'
            ? document.querySelector('.home-front-page')
            : document.getElementById('story-' + b.dataset.story))
            ?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}))
    );
  document
    .querySelectorAll('[data-section]')
    .forEach(
      b =>
        (b.onclick = () =>
          document
            .getElementById(b.dataset.section)
            ?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}))
    );
  if (typeof IntersectionObserver !== 'undefined') {
    viewObserver = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            if (e.target.classList.contains('story-screen')) updateNewsDots(Number(e.target.id.replace('story-', '')));
            else
              document
                .querySelectorAll('[data-section]')
                .forEach(b => b.setAttribute('aria-pressed', String(e.target.id === b.dataset.section)));
          }
        });
      },
      {threshold: 0.45}
    );
    document.querySelectorAll('.story-screen,.profile-slide').forEach(e => viewObserver.observe(e));
  }
  const newsFeed = document.querySelector('.story-feed');
  const newsDots = document.querySelector('.story-dots');
  if (newsFeed && newsDots) {
    if (typeof IntersectionObserver !== 'undefined') {
      const visibleStories = new Set();
      newsRegionObserver = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) visibleStories.add(entry.target);
            else visibleStories.delete(entry.target);
          }
          newsDots.hidden = visibleStories.size === 0;
        },
        {rootMargin: '-35% 0px -45% 0px', threshold: 0}
      );
      newsFeed.querySelectorAll('.story-screen').forEach(story => newsRegionObserver.observe(story));
    } else newsDots.hidden = false;
  }
  $('.share')?.addEventListener('click', async e => {
    try {
      if (navigator.share) await navigator.share({title: document.title, url: location.href});
      else {
        await navigator.clipboard.writeText(location.href);
        e.target.textContent = 'Link kopiert';
      }
    } catch {
      e.target.textContent = 'Link aus Adresszeile teilen';
    }
  });
}
function notFound() {
  return '<section class="content"><h1>Hier geht’s zurück aufs Feld.</h1><a class="button" href="#home">Zur Startseite</a></section>';
}
function render() {
  if (programmeDialog && programmeDialog.dataset.route !== activeClub + location.hash) closeMatchProgramme();
  const scrollRoot = document.documentElement,
    scrollTop = window.scrollY;
  scrollRoot.style.scrollSnapType = 'none';
  const [page = 'home', id, tab = 'overview'] = (location.hash.slice(1) || 'home').split('/');
  const fixedCalendar = page === 'season' && id === 'games' && mode === 'calendar';
  document.body.classList.toggle('games-mode', page === 'season' && id === 'games');
  scrollRoot.classList.toggle('calendar-mode', fixedCalendar);
  document.body.classList.toggle('calendar-mode', fixedCalendar);
  $('#app').innerHTML =
    activeClub === 'fcsg'
      ? fcsgView(page, id, tab)
      : page === 'home'
      ? home()
      : page === 'club'
        ? clubPage()
        : page === 'news'
        ? article(id)
        : page === 'season'
          ? season(['games', 'table', 'squad'].includes(id) ? id : 'games')
          : page === 'match'
            ? id === 'live' ? liveMatchPage({id:'live'},tab) : games.find(g => g.id === id)
              ? match(
                  games.find(g => g.id === id),
                  ['overview', 'squad', 'stats'].includes(tab) ? tab : 'overview'
                )
              : notFound()
            : page === 'player'
              ? profile(Number(id))
              : notFound();
  document.querySelectorAll('[data-nav]').forEach(a => {
    const active =
      a.dataset.nav ===
      (['home', 'news', 'club'].includes(page)
        ? 'news'
        : page === 'player'
          ? 'squad'
          : page === 'match'
            ? 'games'
            : page === 'season'
              ? ['games', 'table', 'squad'].includes(id)
                ? id
                : 'games'
              : 'news');
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('#competition')?.addEventListener('change', e => {
    competition = e.target.value;
    render();
  });
  document.querySelectorAll('[data-mode]').forEach(
    b =>
      (b.onclick = () => {
        mode = b.dataset.mode;
        render();
      })
  );
  document.querySelectorAll('[data-league]').forEach(
    b =>
      (b.onclick = () => {
        tableLeague = b.dataset.league;
        render();
      })
  );
  $('#prev-month')?.addEventListener('click', () => {
    if (calendarYear * 12 + month > 2026 * 12 + 6) {
      month--;
      if (month < 0) {
        month = 11;
        calendarYear--;
      }
    }
    render();
  });
  $('#next-month')?.addEventListener('click', () => {
    if (calendarYear * 12 + month < 2027 * 12 + 5) {
      month++;
      if (month > 11) {
        month = 0;
        calendarYear++;
      }
    }
    render();
  });
  document.title =
    (page === 'match'
      ? 'Matchcenter'
      : page === 'player'
        ? 'Spielerprofil'
        : page === 'season'
          ? {games: 'Spiele', table: 'Tabelle', squad: 'Kader'}[id] || 'Spiele'
          : page === 'club'
            ? 'Unser Verein'
            : page === 'news'
            ? 'Artikel'
            : 'News') + ' · ' + fanClubs[activeClub].name;
  setupViews();
  updateClubHeader();
  loadMatchPreview();
  loadMatchProgramme();
  if (activeClub === 'fcsg') {
    document.body.classList.toggle('player-mode', false);
    scrollRoot.classList.toggle('snap-profile', false);
    document.querySelector('[data-nav="games"]')?.classList.remove('is-matchday');
    document.querySelector('[data-nav="games"]')?.setAttribute('aria-label', 'Spiele');
    if (page === 'season' && id === 'games' && mode === 'list') centerNextGame();
    syncOfflineNotice();
    loadFcsgArticle();
    setupClubPage();
    loadFcsgLive();
    loadFcsgPlayerDetails();
    window.scrollTo({top: fixedCalendar ? 0 : scrollTop, behavior: 'instant'});
    requestAnimationFrame(() => scrollRoot.style.removeProperty('scroll-snap-type'));
    return;
  }
  setupClubPage();
  setupRecentGames();
  showLiveMatch();
  if (page === 'season' && id === 'games' && mode === 'list') centerNextGame();
  setupEnhancements();
  loadGameReports();
  loadFullArticle();
  window.scrollTo({top: fixedCalendar ? 0 : scrollTop, behavior: 'instant'});
  requestAnimationFrame(() => scrollRoot.style.removeProperty('scroll-snap-type'));
}
let gameCenterFrame;
function centerNextGame() {
  cancelAnimationFrame(gameCenterFrame);
  gameCenterFrame = requestAnimationFrame(() => {
    if (location.hash !== '#season/games' || mode !== 'list') return;
    document
      .querySelector('.game-timeline .current-game')
      ?.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});
  });
}
