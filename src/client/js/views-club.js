/* Vereinsseite: redaktionelle Geschichte, Trophäen und Kapitel-Navigation. */
let clubObserver;
function clubTrophyIcon(id) {
  const form = id === 'master'
    ? '<path d="M28 17h44v22c0 17-10 26-22 26S28 56 28 39Z"/><path d="M28 23H15v12c0 13 8 19 20 19M72 23h13v12c0 13-8 19-20 19" fill="none" stroke="currentColor" stroke-width="5"/>'
    : id === 'cup'
      ? '<path d="M32 13h36l-6 38-12 15-12-15Z"/><path d="M32 24H22v17l16 10M68 24h10v17L62 51" fill="none" stroke="currentColor" stroke-width="4"/>'
      : '<path d="m50 12 29 12-5 31-24 16-24-16-5-31Z"/><path d="m50 25 4 10 11 1-8 7 3 11-10-6-10 6 3-11-8-7 11-1Z" fill="#151914"/>';
  return `<svg viewBox="0 0 100 100" class="club-trophy-icon" aria-hidden="true">${form}<path d="M46 64h8v15h16v9H30v-9h16Z"/></svg>`;
}
function clubTrophyYears(id, selectedYear) {
  const trophy = clubTrophies.find(t => t.id === id) || clubTrophies[0];
  const year = trophy.years.includes(Number(selectedYear)) ? Number(selectedYear) : trophy.years.at(-1);
  const chapter = clubHistory.find(c => c.trophy === trophy.id && c.trophyYear === year);
  return `<h3>${trophy.title}</h3><p class="club-year-hint">Wähle ein Titeljahr.</p><div class="club-title-years">${trophy.years.map(y => `<button data-club-year="${y}" data-club-category="${trophy.id}" aria-pressed="${y === year}">${y}</button>`).join('')}</div><p class="club-selected-title" role="status">${trophy.title} · <strong>${year}</strong></p>${chapter ? `<button class="club-text-button" data-club-jump="club-history-${chapter.id}">Diesen Moment entdecken <span aria-hidden="true">↗</span></button>` : ''}`;
}
function clubPage() {
  const first = clubTrophies[0];
  return `<div class="club-page"><div class="club-topline">${backLink('#home', 'Zurück zu den News')}<span>UNSER VEREIN</span></div><section class="club-intro" aria-labelledby="club-title"><img class="club-intro-photo" src="${clubArchive}Meister_2005_B_DL.jpg" alt="Die Kadetten feiern ihre erste Schweizer Meisterschaft 2005" fetchpriority="high"><div class="club-intro-copy"><p class="club-eyebrow">Schaffhausen. Handball. Leidenschaft.</p><h1 id="club-title">Orange<br>Geschichte.</h1><p>Ein Verein. Generationen voller Leidenschaft.<br>Und Momente, die bleiben.</p><div class="club-intro-actions"><button data-club-jump="club-history">Zeitreise starten <span aria-hidden="true">↓</span></button><button data-club-jump="club-cabinet">Unsere Trophäen</button></div></div><span class="club-intro-caption">Der erste Meistertitel, 2005 · Vereinsarchiv</span></section><section class="club-cabinet" id="club-cabinet" aria-labelledby="club-cabinet-title"><p class="club-eyebrow">Erfolge der ersten Männermannschaft</p><h2 id="club-cabinet-title" tabindex="-1">Orange glänzt.</h2><p>Unser digitaler Trophäenschrank. Jeder Titel ein Stück Vereinsgeschichte.</p><div class="club-trophies" role="group" aria-label="Titelkategorie auswählen">${clubTrophies.map(t => `<button class="club-trophy" data-club-trophy="${t.id}" aria-pressed="${t.id === first.id}" aria-controls="club-title-panel">${clubTrophyIcon(t.id)}<strong>${t.years.length}</strong><span>${t.short}</span></button>`).join('')}</div><div id="club-title-panel" class="club-title-panel">${clubTrophyYears(first.id)}</div><p class="club-count-note">Titeljahre gemäss offiziellem Matchprogramm 2026/27. «2026» bezeichnet den Cupsieg der Saison 2025/26.</p></section><section class="club-history" id="club-history" aria-labelledby="club-history-title"><header class="club-history-heading"><p class="club-eyebrow">Durch die Jahrzehnte</p><h2 id="club-history-title" tabindex="-1">Deine Zeitreise.</h2><p>Scrolle durch die Geschichte oder springe direkt in ein Jahr.</p></header><nav class="club-years" aria-label="Stationen der Vereinsgeschichte">${clubHistory.map((c,i) => `<button data-club-jump="club-history-${c.id}" aria-pressed="${i === 0}" aria-label="${liveEscape(c.year + ': ' + c.title)}">${c.nav || c.year}</button>`).join('')}</nav><div class="club-chapters">${clubHistory.map((c,i) => `<article class="club-chapter${i === 0 ? ' history-active' : ''}${c.id === 'roots' ? ' club-roots' : ''}" id="club-history-${c.id}" aria-labelledby="club-chapter-title-${c.id}"><figure><img src="${c.image}" alt="${liveEscape(c.caption)}" loading="lazy" decoding="async"><figcaption>${c.caption}</figcaption></figure><div class="club-chapter-copy"><p class="club-chapter-position">${String(i+1).padStart(2,'0')} / ${String(clubHistory.length).padStart(2,'0')}</p><p class="club-chapter-year">${c.year}</p><h3 id="club-chapter-title-${c.id}">${c.title}</h3><p>${c.text}</p>${c.detail ? `<details class="club-more"><summary>Mehr zu diesem Kapitel</summary><p>${c.detail}</p></details>` : ''}${c.trophy ? `<button class="club-text-button" data-club-trophy="${c.trophy}" data-club-title-year="${c.trophyYear}">Zum Titel im Trophäenschrank <span aria-hidden="true">↗</span></button>` : ''}${i < clubHistory.length-1 ? `<button class="club-next" data-club-jump="club-history-${clubHistory[i+1].id}" aria-label="Nächstes Kapitel: ${clubHistory[i+1].year}">Weiterreisen <span aria-hidden="true">↓</span></button>` : `<div class="club-next">${backLink('#home', 'Zurück zu den News')}</div>`}</div></article>`).join('')}</div></section><footer class="club-credits"><details class="source-details"><summary>Quellen & Bildnachweise</summary><p>Chronik und Archivbilder: ${ext('https://kadettensh.ch/geschichte/', 'Kadetten Schaffhausen', '')}. Bildrechte bei den jeweiligen Urhebern.</p><p>Titelstand: ${ext('https://kadettensh.ch/wp-content/downloads/Matchprogramm_Kadetten_QHL.pdf', 'Offizielles Matchprogramm 2026/27', '')}. Europacup-Final: ${ext('https://history.eurohandball.com/ec/ehfc/men/2009-10/round/7/Final', 'EHF 2009/10', '')}.</p><p>Unabhängige Fan-App · kein offizieller Vereinsauftritt.</p></details></footer></div>`;
}
function setupClubPage() {
  clubObserver?.disconnect();
  const root = document.querySelector('.club-page');
  if (!root) return;
  const jump = id => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    const heading = target.querySelector('h2,h3');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({preventScroll: true}); }
  };
  root.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.clubJump) jump(button.dataset.clubJump);
    const category = button.dataset.clubTrophy || button.dataset.clubCategory;
    if (category && clubTrophies.some(t => t.id === category)) {
      document.getElementById('club-title-panel').innerHTML = clubTrophyYears(category, button.dataset.clubTitleYear || button.dataset.clubYear);
      root.querySelectorAll('.club-trophy').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clubTrophy === category)));
      if (button.dataset.clubTitleYear) jump('club-cabinet');
      else if (button.dataset.clubYear) document.querySelector(`#club-title-panel [data-club-year="${button.dataset.clubYear}"]`)?.focus({preventScroll: true});
    }
  });
  root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    // Keine Ersatzaufnahme als Archivbild ausgeben: Beschriftung bleibt erhalten.
    img.hidden = true;
    img.parentElement.classList.add('club-photo-missing');
  }, {once: true}));
  if (typeof IntersectionObserver !== 'undefined') {
    const visible = new Map();
    clubObserver = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) visible.set(e.target, e.intersectionRatio);
        else visible.delete(e.target);
      }
      const current = [...visible].sort((a,b) => b[1]-a[1])[0]?.[0];
      if (!current) return;
      root.querySelectorAll('.club-chapter').forEach(c => c.classList.toggle('history-active', c === current));
      root.querySelectorAll('.club-years button').forEach(b => {
        const active = b.dataset.clubJump === current.id;
        b.setAttribute('aria-pressed', String(active));
        if (active) {
          const rail = b.parentElement;
          if (b.offsetTop < rail.scrollTop || b.offsetTop + b.offsetHeight > rail.scrollTop + rail.clientHeight)
            rail.scrollTo({top: b.offsetTop - (rail.clientHeight - b.offsetHeight) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
        }
      });
    }, {threshold: [0,0.25,0.5,0.75]});
    root.querySelectorAll('.club-chapter').forEach(c => clubObserver.observe(c));
  }
}
