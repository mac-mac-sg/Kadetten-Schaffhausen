/* Vereinswahl bleibt getrennt von den Kadetten-Snapshots und Live-Daten.
   Etappe 1: gemeinsamer Einstieg; FCSG-Daten werden separat angebunden. */
const fanClubs = {
  kadetten: {name: 'Kadetten Schaffhausen', title: 'KADETTEN', subtitle: 'SCHAFFHAUSEN', logo: 'assets/logo.png'},
  fcsg: {name: 'FC St. Gallen', title: 'FC ST. GALLEN', subtitle: '1879', logo: 'assets/fcsg-logo.svg'}
};
const CLUB_CHOICE_KEY = 'fan-app-active-club-v1';
let activeClub = 'kadetten';
function restoreActiveClub() {
  let choice;
  try {
    choice = new URL(location.href).searchParams.get('club') || localStorage.getItem(CLUB_CHOICE_KEY);
  } catch {}
  activeClub = Object.hasOwn(fanClubs, choice) ? choice : 'kadetten';
}
function clubSwitchRoute(hash) {
  const [page, id] = (hash.slice(1) || 'home').split('/');
  if (page === 'match') return '#season/games';
  if (page === 'player') return '#season/squad';
  if (page === 'news') return '#home';
  if (page === 'club') return '#club';
  if (page === 'season' && ['games', 'table', 'squad'].includes(id)) return '#season/' + id;
  return '#home';
}
function updateClubHeader() {
  const club = fanClubs[activeClub], other = activeClub === 'kadetten' ? 'fcsg' : 'kadetten';
  document.documentElement.dataset.club = activeClub;
  const brand = document.querySelector('.brand');
  if (brand) {
    brand.innerHTML = `<img src="${club.logo}" alt="${club.name}" width="38" height="54"><span>${club.title}<small>${club.subtitle}</small></span>`;
    brand.setAttribute('aria-label', club.name + ' · Startseite');
  }
  const button = document.getElementById('club-switch');
  if (button) {
    button.querySelector('span').textContent = other === 'fcsg' ? 'FCSG' : 'Kadetten';
    button.setAttribute('aria-label', 'Aktueller Verein: ' + club.name + '. Zu ' + fanClubs[other].name + ' wechseln');
    button.title = 'Zu ' + fanClubs[other].name + ' wechseln';
  }
}
function switchClub(id) {
  if (!Object.hasOwn(fanClubs, id) || id === activeClub) return;
  activeClub = id;
  try { localStorage.setItem(CLUB_CHOICE_KEY, id); } catch {}
  clearTimeout(liveTimer);
  clearInterval(dayTimer);
  highlightObserver?.disconnect();
  competition = 'Alle';
  const url = new URL(location.href);
  url.searchParams.set('club', id);
  url.hash = clubSwitchRoute(location.hash);
  history.replaceState(null, '', url.href);
  render();
  window.scrollTo({top: 0, behavior: 'instant'});
  document.getElementById('app')?.focus({preventScroll: true});
  appFeedback(fanClubs[id].name + ' ausgewählt');
  if (id === 'kadetten') checkLiveMatch();
}
function fcsgFooter() {
  return `<footer><span class="footer-updated">FCSG-Datenanbindung folgt</span><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Unabhängige Fan-App · kein offizieller Vereinsauftritt.</p><p>${ext('https://www.fcsg.ch/', 'FC St.Gallen 1879', '')} · Vereinslogo: FC St.Gallen 1879</p></details></footer>`;
}
function fcsgPending(title, text, url, link) {
  return `<section class="fcsg-pending"><span class="fcsg-status">Datenanbindung folgt</span><h2>${title}</h2><p>${text}</p>${ext(url, link, 'button subtle')}</section>`;
}
function fcsgView(page, id) {
  if (page === 'club') return `<section class="content season fcsg-season"><p class="eyebrow">FC St.Gallen 1879</p><h1>Unser Verein</h1>${fcsgPending('Grün und Weiss. Dein zweiter Verein.', 'Auch die Vereinsseite erhält den bekannten Aufbau mit Geschichte und Erfolgen. Die Inhalte werden separat recherchiert und ergänzt.', 'https://www.fcsg.ch/', 'Zur Vereinswebsite')}</section>${fcsgFooter()}`;
  if (page === 'season') {
    const tab = ['games', 'table', 'squad'].includes(id) ? id : 'games';
    const content = {
      games: ['Spiele', 'Spielplan und Resultate', 'Hier folgen Vorschau, Rückblick und Kalender für den FC St. Gallen. Bestätigte Paarungen und Anspielzeiten werden aus den offiziellen Quellen übernommen.', 'https://www.fcsg.ch/pages/resultate', 'Offizielle Resultate öffnen'],
      table: ['Tabelle', 'Super League und Saisonstatistiken', 'Hier folgen Tabelle, Saisonbilanz, Heim- und Auswärtswerte sowie Torschützen und gelbe/rote Karten. Noch nicht angebundene Werte werden nicht als Null angezeigt.', 'https://www.fcsg.ch/', 'Zur offiziellen Vereinswebsite'],
      squad: ['Kader', 'Die Mannschaft', 'Hier folgen Kader und Spielerprofile im gleichen Aufbau wie bei den Kadetten. Die FCSG-Spielerdaten werden separat angebunden.', 'https://www.fcsg.ch/', 'Zur offiziellen Vereinswebsite']
    }[tab];
    return `<section class="content season fcsg-season ${tab === 'table' ? 'standings-season' : ''}"><div class="season-header"><p class="eyebrow">1. Mannschaft · Saison 2026/27</p><h1>${content[0]}</h1></div>${fcsgPending(...content.slice(1))}</section>${fcsgFooter()}`;
  }
  return `<section class="content fcsg-home"><div class="fcsg-welcome"><p class="eyebrow">DEINE VEREINE. EINE APP.</p><img src="assets/fcsg-logo.svg" alt="FC St.Gallen 1879" width="120" height="140"><h1>Hopp St. Gallen.</h1><p>News, Spiele, Tabelle und Kader – im vertrauten Aufbau.</p></div><header class="home-news-heading"><span aria-hidden="true"></span><h2>Neues aus dem Verein</h2></header>${fcsgPending('Der FCSG ist dabei.', 'Die Vereinsumschaltung ist eingerichtet. Vereinsnews und vollständige Artikel werden im nächsten Schritt angebunden. Bis dahin findest du sie auf der offiziellen Website.', 'https://www.fcsg.ch/', 'Offizielle FCSG-News öffnen')}</section>${fcsgFooter()}`;
}
