/* Gemeinsamer Zustand, Escape-Helfer und kleine Bausteine (Karten, Wappen, Fusszeile). */
let updateState = null;
let liveState = null,
  liveTimer,
  liveBusy = false;
// Only plain web links may end up in href attributes (blocks javascript: and data: URLs from external data).
function safeUrl(value) {
  try {
    const u = new URL(String(value), location.href);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '#';
  } catch {
    return '#';
  }
}
function liveEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
let base = 'https://kadettensh.ch/',
  report = base + 'perfekter-start-in-der-european-league/';
const initialCalendarDate=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'}).split('-').map(Number);
let calendarYear = initialCalendarDate[0];
let competition = 'Alle',
  mode = 'list',
  month = initialCalendarDate[1]-1,
  tableLeague = 'QHL';
const $ = s => document.querySelector(s),
  ext = (u, t, c = 'button') =>
    `<a class="${c}" href="${liveEscape(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${t}</a>`,
  date = g =>
    new Date(g.date + 'T12:00:00').toLocaleDateString('de-CH', {day: '2-digit', month: '2-digit', year: 'numeric'}),
  league = g =>
    g.league === 'QHL' ? 'Quickline Handball League' : g.league === 'EHL' ? 'EHF European League' : g.league;
function footer() {
  if(document.documentElement.dataset.design!=='v2')return '';
  const [page = 'home', id, tab = 'overview'] = (location.hash.slice(1) || 'home').split('/');
  const game = page === 'match' ? games.find(g => g.id === id) : null;
  const key =
    page === 'match' || (page === 'season' && id === 'games')
      ? 'games'
      : page === 'season' && id === 'table'
        ? 'table'
        : page === 'season' && id === 'squad'
          ? 'players'
          : 'news';
  const url =
    game?.url ||
    (page === 'season' && id === 'games'
      ? base + 'matchcenter/'
      : page === 'season' && id === 'squad'
        ? base + '1-mannschaft/'
        : base);
  const hasDirectSource = page === 'news' || (page === 'match' && (tab === 'overview' || verifiedReport(game)));
  const historySource = page === 'match' && tab === 'stats' && game?.league === 'QHL' && !verifiedReport(game);
  return `<footer><span class="footer-updated">${updateLabel(key)}</span><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Inoffizielles, nicht-kommerzielles Fan-Projekt und privater Designentwurf · kein offizieller Vereinsauftritt · keine Verbindung zu den Vereinen.</p><p>Alle Marken- und Bildrechte liegen bei den Kadetten Schaffhausen, dem FC St.Gallen 1879 bzw. den jeweiligen Vereinen und Urhebern.</p>${hasDirectSource ? '' : `<p>${ext(handballClub()==='otmar'?'https://otmar.ch/':url, handballTeamName(), '')}${historySource ? ' · ' + ext('https://www.handball.ch/de/matchcenter/', 'SHV: Resultate und Direktvergleich', '') : ''}</p>`}<p>Bilder: ${handballClub()==='otmar'?'TSV St. Otmar St. Gallen und jeweilige Urheber':'Kadetten Schaffhausen · Spielbilder © André Frensel / Erich Mosberger'}</p></details></footer>`;
}
function badge(name) {
  const logo = clubLogos[name];
  return logo
    ? `<img class="crest" src="${liveEscape(photoUrl(logo))}" alt="${name}" width="48" height="60" loading="lazy" decoding="async">`
    : `<span class="clubmark" aria-hidden="true">${name
        .split(' ')
        .map(w => w[0])
        .slice(0, 3)
        .join('')}</span>`;
}
function card(g, current = false) {
  const live = g.date === swissToday() && sameFixture(g, freshLive()) ? freshLive() : null;
  if (live) return `<article class="game-card current-game live-game-card" data-game-card="${liveEscape(g.id)}"><section class="home-matchday games-matchday" aria-label="Laufendes Kadetten-Spiel"><a id="live-match" class="live-match is-matchday is-live" href="${liveMatchHref(live)}" aria-label="Spiel live verfolgen" aria-live="polite"></a></section></article>`;
  const result = g.score ? teamResult(g, handballTeamName()) : null;
  const derby = handballClub()==='kadetten' && /Pfadi/.test(isOwnHandballTeam(g.home) ? g.away : g.home);
  return `<article data-game-card="${liveEscape(g.id)}" class="game-card ${g.score ? 'finished result-' + result.state : ''} ${current ? 'current-game' : ''}" ${current ? 'aria-label="Nächstes Spiel"' : ''}>${current ? '<p class="current-label">Nächstes Spiel' + (relativeDay(g.date) ? ' · ' + relativeDay(g.date) : '') + '</p>' : ''}<p class="meta">${g.score ? `<span class="game-result-label">${result.label}</span> · ` : ''}${league(g)} · ${date(g)}${g.time ? ' · ' + g.time : ''}${derby ? ' <span class="game-derby">Derby</span>' : ''}</p><div class="scoreline"><div>${badge(g.home)}<span>${g.home}</span></div><strong>${g.score ? g.score.join(' : ') : 'VS'}<small>${g.half ? '(' + g.half.join(':') + ')' : g.score ? 'Endstand' : 'Vorschau'}</small></strong><div>${badge(g.away)}<span>${g.away}</span></div></div><p class="venue">${g.venue}</p><div class="actions"><a class="button ${g.score ? 'subtle' : ''}" href="#match/${liveEscape(g.id)}/overview">${g.score ? 'Rückblick' : 'Vorschau'}</a></div></article>`;
}
// Fotos und Wappen liegen als WebP vor. Namen aus den Daten (z. B. "news-34317.jpg" oder "assets/club-1.png") werden hier umgestellt;
// vollständige https-Adressen bleiben unverändert.
function photoUrl(name) {
  const value = String(name);
  if (/^https?:/.test(value)) return value;
  return (value.startsWith('assets/') ? value : 'assets/' + value).replace(/\.(png|jpe?g)$/i, '.webp');
}

/* V1 controls share one decorative line-icon vocabulary; V2 keeps its markup. */
function v1ActionIcon(name, fallback) {
  if (document.documentElement?.dataset?.design === 'v2') return fallback;
  const paths={back:'M19 12H5m6-6-6 6 6 6',close:'m6 6 12 12M18 6 6 18',previous:'m15 6-6 6 6 6',next:'m9 6 6 6-6 6',external:'M7 17 17 7M7 7h10v10'};
  return `<svg class="v1-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]}"/></svg>`;
}

/* Gemeinsame Navigation für Detailseiten. */
function backLink(href, label, placement = '') {
  return `<a href="${liveEscape(href)}" class="back-link ${placement}">${v1ActionIcon('back','<span aria-hidden="true">←</span>')}${liveEscape(label)}</a>`;
}

function sourceNoticeText(key) {
 const snapshot=typeof activeClub!=='undefined'&&activeClub==='fcsg'?fcsgData:updateState;
 return sourceHealth(snapshot?.status?.[key],snapshot?.checkedAt,key);
}
function sourceNotice(key) {
 const text=sourceNoticeText(key);
 return `<p class="source-health" data-source-key="${key}" role="status" hidden>${liveEscape(text)}</p>`;
}
function syncSourceNotices() {
 document.querySelectorAll('[data-source-key]').forEach(el=>{const text=sourceNoticeText(el.dataset.sourceKey);el.textContent=text;el.hidden=true;});
}

/* Decorative rim: one contour, with coincident fading trail/head strokes. */
const matchdayOrbitMarkup='<svg class="matchday-orbit" aria-hidden="true" focusable="false"><g class="matchday-orbit-pulse"><path class="matchday-orbit-trail" pathLength="1000"/><path class="matchday-orbit-middle" pathLength="1000"/><path class="matchday-orbit-head" pathLength="1000"/></g></svg>';
const matchdayContentHTML=new WeakMap();
let matchdayOrbitObserver, matchdayOrbitCard;
function syncV1MatchAction(slot) {
  if(document.documentElement.dataset.design==='v2')return;
  const section=slot.closest('.home-matchday');
  if(!section||section.classList.contains('games-matchday'))return;
  let action=section.querySelector('.v1-match-action');
  if(slot.hidden){if(action)action.hidden=true;return;}
  if(!action){
    action=document.createElement('a');action.className='v1-match-action';
    action.innerHTML='<span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
    const stack=document.createElement('div');stack.className='v1-match-stack';
    slot.before(stack);stack.append(slot,action);
  }
  action.hidden=false;action.setAttribute('href',slot.getAttribute('href')||'#season/games');
  const label=slot.classList.contains('is-live')?'Live verfolgen':slot.matches('.matchday-win,.matchday-draw,.matchday-loss')?'Zum Spielrückblick':slot.classList.contains('is-matchday')?'Zum Spiel':'Spielvorschau';
  if(action.firstElementChild.textContent!==label)action.firstElementChild.textContent=label;
}
function setMatchdayContent(slot,html) {
  if(matchdayContentHTML.get(slot)===html)return;
  const orbit=slot.querySelector('.matchday-orbit');
  if(!orbit)slot.innerHTML=html;
  else {
    const template=document.createElement('template');template.innerHTML=html;
    for(const child of [...slot.childNodes])if(child!==orbit)child.remove();
    slot.append(template.content);
  }
  matchdayContentHTML.set(slot,html);
}
function updateMatchdayOrbitGeometry(slot) {
  const svg=slot.querySelector('.matchday-orbit');if(!svg||typeof getComputedStyle!=='function')return;
  const css=getComputedStyle(slot),width=parseFloat(css.width),height=parseFloat(css.height);
  if(!width||!height)return;
  const borderX=parseFloat(css.borderLeftWidth)||0,borderY=parseFloat(css.borderTopWidth)||0;
  const corners=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(key=>{
    const values=css[key].split(/\s+/),read=(value,total)=>(parseFloat(value)||0)*(value.endsWith('%')?total/100:1);
    return {x:read(values[0],width),y:read(values[1]||values[0],height)};
  });
  const d=matchdayOrbitPath(width,height,corners,Math.max(.5,borderX/2));
  svg.style.width=width+'px';svg.style.height=height+'px';svg.style.left=-borderX+'px';svg.style.top=-borderY+'px';
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.querySelectorAll('path').forEach(path=>{if(path.getAttribute('d')!==d)path.setAttribute('d',d);});
}
function syncMatchdayOrbit(slot,g,live=false) {
  const state=matchdayOrbitState(g,live),old=slot.querySelector('.matchday-orbit');
  slot.dataset.orbit=String(state.active);slot.style.setProperty('--orbit-period',state.seconds+'s');
  if(state.active&&!old)slot.insertAdjacentHTML('beforeend',matchdayOrbitMarkup);
  const orbit=slot.querySelector('.matchday-orbit');if(orbit)orbit.toggleAttribute('hidden',!state.active);
  if(state.active){
    if(!old)updateMatchdayOrbitGeometry(slot);
    if(matchdayOrbitCard!==slot){
      matchdayOrbitObserver?.disconnect();matchdayOrbitCard=slot;
      if(typeof ResizeObserver!=='undefined'){
        matchdayOrbitObserver ||= new ResizeObserver(()=>{if(matchdayOrbitCard?.isConnected&&!matchdayOrbitCard.hidden)updateMatchdayOrbitGeometry(matchdayOrbitCard);});
        matchdayOrbitObserver.observe(slot);
      }
      updateMatchdayOrbitGeometry(slot);
    }
  } else if(matchdayOrbitCard===slot){matchdayOrbitObserver?.disconnect();matchdayOrbitCard=null;}
}
function setupMatchdayOrbit() {
  const slot=document.querySelector('.home-matchday .live-match:not([hidden])');
  if(matchdayOrbitCard!==slot){matchdayOrbitObserver?.disconnect();matchdayOrbitCard=null;}
  if(activeClub==='fcsg')updateFcsgPulse();else updateMatchPulse();
}

// Failed media keeps its original slot and an honest text alternative, without retry loops.
function handleV1ImageError(event) {
  if(document.documentElement.dataset.design==='v2')return;
  const img=event.target;
  if(!img?.matches?.('.v1-news-image > img,.player-card > img,img.crest,img.article-photo,.related-story > img'))return;
  const replacement=document.createElement('span');
  replacement.className=img.className+' v1-image-fallback';
  const name=img.getAttribute('alt')||'';
  const portrait=!!img.closest('.player-card');
  const crest=img.matches('.crest');
  replacement.textContent=crest?name.split(/\s+/).map(word=>word[0]).slice(0,3).join(''):portrait?'Kein Foto':'Bild nicht verfügbar';
  replacement.setAttribute('role','img');
  replacement.setAttribute('aria-label',name?name+' – Bild nicht verfügbar':'Bild nicht verfügbar');
  img.replaceWith(replacement);
}

function markArticleLoading(target) {
  if(document.documentElement.dataset.design==='v2')return;
  target.setAttribute('aria-busy','true');
  const retry=target.querySelector('#retry-article,#fcsg-retry-article');
  if(retry){retry.disabled=true;retry.textContent='Wird geladen …';}
}
