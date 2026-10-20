/* V2-only club experiment on the shared V1 baseline. */
document.documentElement.dataset.preview = 'v2';
function v2ClubIdentity() {
  const club = activeClub === 'fcsg' ? 'fcsg' : activeClub === 'otmar' ? 'otmar' : 'kadetten';
  return {
    kadetten: {name:'Kadetten Schaffhausen',line:'Schaffhausen. Handball. Leidenschaft.',photo:'assets/bbc-arena-hall.webp'},
    fcsg: {name:'FC St.Gallen 1879',line:'St. Gallen. Fussball. Seit 1879.',photo:'assets/fcsg-stadium.jpg'},
    otmar: {name:'TSV St. Otmar St. Gallen',line:'St. Gallen. Handball. Zämästoh.',photo:'assets/otmar-kreuzbleiche.webp'}
  }[club];
}
function v2ClubCurve() {
  return '<svg class="v2-club-curve" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 53C124 83 262 -17 400 12V64H0Z" fill="currentColor"/></svg>';
}
function v2ClubEntry() {
  const club=v2ClubIdentity();
  return `<a class="v2-club-entry" href="#club" aria-label="Unser Verein · ${liveEscape(club.name)}: Geschichte, Erfolge und Heimat"><img class="v2-club-entry-photo" src="${club.photo}" alt="" width="800" height="530" decoding="async"><div class="v2-club-entry-copy">${v2ClubCurve()}<div><h2>Unser Verein</h2><p>Geschichte, Erfolge und Heimat</p></div><span class="v2-club-arrow" aria-hidden="true">↗</span></div></a>`;
}
const v2SharedSquad=squad;
squad=function(...args){return v2ClubEntry()+v2SharedSquad(...args);};
const v2SharedFcsgSquad=fcsgSquad;
fcsgSquad=function(...args){return v2ClubEntry()+v2SharedFcsgSquad(...args);};
function v2ClubPage(markup) {
  const shell=document.createElement('div');shell.innerHTML=markup;
  const root=shell.querySelector('.club-page'),intro=shell.querySelector('.club-intro');
  if(!root||!intro)return markup;
  const club=v2ClubIdentity(),photo=intro.querySelector('.club-intro-photo'),caption=intro.querySelector('.club-intro-caption');
  root.classList.add('v2-club-page');
  intro.className='v2-club-hero';
  intro.innerHTML=`<figure class="v2-club-hero-media">${photo?.outerHTML||''}${caption?`<figcaption>${caption.innerHTML}</figcaption>`:''}</figure><div class="v2-club-hero-copy">${v2ClubCurve()}<p class="v2-club-label">Unser Verein</p><h1 id="club-title">${liveEscape(club.name)}</h1><p>${liveEscape(club.line)}</p></div>`;
  shell.querySelector('#club-cabinet-title').textContent='Unsere Erfolge';
  shell.querySelector('#club-history-title').textContent='Unsere Geschichte';
  return shell.innerHTML;
}
const v2SharedClubPage=clubPage;
clubPage=function(...args){return v2ClubPage(v2SharedClubPage(...args));};
const v2SharedFcsgClubPage=fcsgClubPage;
fcsgClubPage=function(...args){return v2ClubPage(v2SharedFcsgClubPage(...args));};
