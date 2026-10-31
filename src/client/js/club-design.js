/* Shared club layout, promoted from the approved V2 design. */
document.documentElement.dataset.clubLayout = 'modern';
function v2ClubIdentity() {
  const club = activeClub === 'fcsg' ? 'fcsg' : activeClub === 'otmar' ? 'otmar' : 'kadetten';
  return {
    kadetten: {name:'Kadetten Schaffhausen',line:'Schaffhausen. Handball. Leidenschaft.',photo:'assets/bbc-arena-hall.webp'},
    fcsg: {name:'FC St.Gallen 1879',line:'St. Gallen. Fussball. Seit 1879.',photo:'assets/fcsg-stadium.webp'},
    otmar: {name:'TSV St. Otmar St. Gallen',line:'St. Gallen. Handball. Zämästoh.',photo:'assets/otmar-kreuzbleiche.webp'}
  }[club];
}
function v2ClubCurve() {
  return '<svg class="v2-club-curve" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 53C124 83 262 -17 400 12V64H0Z" fill="currentColor"/></svg>';
}
function v2ClubEntry() {
  const club=v2ClubIdentity();
  return `<a class="v2-club-entry" href="#club" aria-label="Unser Verein · ${liveEscape(club.name)}: Geschichte, Erfolge und Heimat"><img class="v2-club-entry-photo" src="${club.photo}" alt="" width="800" height="530" decoding="async"><div class="v2-club-entry-copy">${v2ClubCurve()}<div><h2>Unser Verein</h2><p>Geschichte, Erfolge und Heimat</p></div><span class="v2-club-arrow" aria-hidden="true">${v2ArrowSvg()}</span></div></a>`;
}
const v2SharedSquad=squad;
squad=function(...args){return (document.documentElement.dataset.preview==='v2'?'':v2ClubEntry())+v2SharedSquad(...args);};
const v2SharedFcsgSquad=fcsgSquad;
fcsgSquad=function(...args){return (document.documentElement.dataset.preview==='v2'?'':v2ClubEntry())+v2SharedFcsgSquad(...args);};
function v2ClubPage(markup) {
  const shell=document.createElement('div');shell.innerHTML=markup;
  const root=shell.querySelector('.club-page'),intro=shell.querySelector('.club-intro');
  if(!root||!intro)return markup;
  const club=v2ClubIdentity(),photo=intro.querySelector('.club-intro-photo'),caption=intro.querySelector('.club-intro-caption');
  root.classList.add('v2-club-page');
  if(document.documentElement.dataset.preview==='v2') {
    root.querySelector('.club-topline')?.remove();
    root.querySelectorAll('.club-next a[href="#season/squad"]').forEach(link=>{link.setAttribute('href','#home');link.textContent='Zum Magazin';});
  }
  intro.className='v2-club-hero';
  intro.innerHTML=`<figure class="v2-club-hero-media">${photo?.outerHTML||''}${caption?`<figcaption>${caption.innerHTML}</figcaption>`:''}</figure><div class="v2-club-hero-copy">${v2ClubCurve()}<p class="v2-club-label">Unser Verein</p><h1 id="club-title">${liveEscape(club.name)}</h1><p>${liveEscape(club.line)}</p></div>`;
  shell.querySelector('#club-cabinet-title').textContent='Unsere Erfolge';
  shell.querySelector('#club-history-title').textContent='Unsere Geschichte';
  if(document.documentElement.dataset.preview!=='v2'&&document.documentElement.dataset.design!=='v2') {
    root.classList.add('club-editorial');
    root.querySelectorAll('.club-chapter').forEach(chapter=>{
      const copy=chapter.querySelector('.club-chapter-copy');
      const heading=document.createElement('header');heading.className='club-chapter-heading';
      heading.append(copy.querySelector('.club-chapter-year'),copy.querySelector('h3'));
      chapter.prepend(heading);
      chapter.querySelector('.fcsg-history-mark')?.remove();
    });
    const home={
      kadetten:{name:'BBC Arena, Schaffhausen',alt:'Innenraum der BBC Arena in Schaffhausen'},
      fcsg:{name:'Stadion in St. Gallen',alt:'Blick auf das Stadion des FC St. Gallen'},
      otmar:{name:'Kreuzbleiche, St. Gallen',alt:'Handballhalle Kreuzbleiche in St. Gallen'}
    }[activeClub==='fcsg'?'fcsg':activeClub==='otmar'?'otmar':'kadetten'];
    const today=document.createElement('section');today.className='club-home-photo';
    today.setAttribute('aria-labelledby','club-home-title');
    today.innerHTML=`<p class="club-eyebrow">Geschichte lebt weiter</p><h2 id="club-home-title">Hier sind wir zuhause.</h2><figure><img src="${club.photo}" alt="${liveEscape(home.alt)}" loading="lazy" decoding="async"><figcaption>${liveEscape(home.name)} · Unsere heutige Heimstätte</figcaption></figure>`;
    root.querySelector('.club-credits').before(today);
  }
  return shell.innerHTML;
}
const v2SharedClubPage=clubPage;
clubPage=function(...args){return v2ClubPage(v2SharedClubPage(...args));};
const v2SharedFcsgClubPage=fcsgClubPage;
fcsgClubPage=function(...args){return v2ClubPage(v2SharedFcsgClubPage(...args));};

/* One decorative arrow for every forward link, including dynamically mounted dialogs. */
function v2ArrowSvg() {
  return '<svg class="v2-arrow-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg>';
}
function v2ArrowTargets(root,selector) {
  return [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
}
function v2DecorateForwardLinks(root) {
  v2ArrowTargets(root,'.v1-news-copy').forEach(copy=>{
    if(copy.querySelector('.v2-news-meta'))return;
    const date=copy.querySelector('p'),arrow=copy.querySelector('.v1-news-arrow');
    if(!date||!arrow)return;
    const meta=document.createElement('div');meta.className='v2-news-meta';
    date.before(meta);meta.append(date);copy.append(arrow);
  });
  v2ArrowTargets(root,'.v1-match-action > svg').forEach(svg=>{
    const arrow=document.createElement('span');arrow.className='v2-forward-arrow';arrow.setAttribute('aria-hidden','true');svg.replaceWith(arrow);
  });
  v2ArrowTargets(root,'.programme-tools > a').forEach(link=>{
    if(link.querySelector('.v2-forward-arrow'))return;
    const text=link.lastChild;
    if(text?.nodeType!==3||!text.textContent.trimEnd().endsWith('↗'))return;
    text.textContent=text.textContent.trimEnd().slice(0,-1).trimEnd();
    const arrow=document.createElement('span');arrow.className='v2-forward-arrow';arrow.setAttribute('aria-hidden','true');link.append(arrow);
  });
  v2ArrowTargets(root,'.v1-news-arrow,.v2-forward-arrow,.club-text-button[data-club-jump] > span[aria-hidden]').forEach(arrow=>{
    if(!arrow.querySelector('.v2-arrow-glyph'))arrow.innerHTML=v2ArrowSvg();
  });
}
if(typeof MutationObserver!=='undefined')new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)v2DecorateForwardLinks(node);
}).observe(document.body,{childList:true,subtree:true});
