/* The large match identity scrolls naturally; a compact row takes over at the tabs. */
let matchHeaderCleanup=()=>{},matchHeaderKey='',matchHeaderCollapsed=false;
function matchCompactIdentity(header){
  const teams=[...header.querySelectorAll('.matchup-team')];
  const names=teams.map(team=>team.querySelector('span:not(.clubmark)')?.textContent.trim()||team.textContent.trim());
  const score=header.querySelector('.matchup > strong')?.textContent.trim()||'';
  const time=header.querySelector(':scope > small:not(.live-checked),.eyebrow')?.textContent.trim()||'';
  const phase=header.querySelector('[data-fcsg-phase],:scope > .matchup + p')?.textContent.trim()||header.querySelector('.live-status')?.firstChild?.textContent.trim();
  return {teams,names,detail:score&&score!=='VS'?score+' · '+(phase||time):time};
}
function setupCollapsingMatchHeader(viewMemory){
  matchHeaderCleanup();matchHeaderCleanup=()=>{};
  if(document.documentElement.dataset.design==='v2'||!location.hash.startsWith('#match/')){matchHeaderKey='';matchHeaderCollapsed=false;return;}
  const app=document.getElementById('app'),header=app?.querySelector('.match-top,.fcsg-match-header,.live-match-header'),tabs=app?.querySelector('.match-tabs');
  if(!header||!tabs)return;
  const fixtureKey=activeClub+'|'+location.hash.split('/')[1],carry=!!viewMemory&&matchHeaderKey===fixtureKey&&matchHeaderCollapsed&&!viewMemory.position;
  matchHeaderKey=fixtureKey;
  const liveContainer=header.closest('#live-detail-content');
  if(liveContainer&&typeof liveDetailSourceHTML!=='undefined'&&!liveDetailSourceHTML.has(liveContainer))liveDetailSourceHTML.set(liveContainer,liveContainer.innerHTML);
  header.setAttribute('data-match-full','');
  const bar=document.createElement('div');bar.className='match-sticky-bar';
  const compact=document.createElement('div');compact.className='match-compact-header';
  const back=document.createElement('a');back.className='match-compact-back';back.href='#season/games';back.setAttribute('aria-label','Zurück zu den Spielen');
  back.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m14 6-6 6 6 6M8 12h12"/></svg>';
  const home=document.createElement('span'),away=document.createElement('span');home.className=away.className='match-compact-crest';home.setAttribute('aria-hidden','true');away.setAttribute('aria-hidden','true');
  const copy=document.createElement('div');copy.className='match-compact-copy';
  const names=document.createElement('span'),detail=document.createElement('small');names.className='match-compact-names';detail.className='match-compact-detail';copy.append(names,detail);compact.append(back,home,copy,away);
  tabs.before(bar);bar.append(compact,tabs);
  tabs.querySelectorAll('a.selected').forEach(a=>a.setAttribute('aria-current','page'));
  let signature='',frame=0;
  const sync=()=>{
    const identity=matchCompactIdentity(header),next=identity.names.join('|')+'|'+identity.detail;
    if(next===signature)return;signature=next;
    names.textContent=identity.names.map(name=>name.replace('Kadetten Schaffhausen','Kadetten').replace(/^TSV /,'')).join(' – ');
    names.setAttribute('title',identity.names.join(' gegen '));detail.textContent=identity.detail;
    for(const [slot,team] of [[home,identity.teams[0]],[away,identity.teams[1]]]){const badge=team?.querySelector('.crest,.clubmark');slot.replaceChildren(...(badge?[badge.cloneNode(true)]:[]));}
  };
  const update=()=>{
    frame=0;if(!bar.isConnected)return;
    const top=parseFloat(getComputedStyle(bar).top)||0;
    matchHeaderCollapsed=window.scrollY>0&&bar.getBoundingClientRect().top<=top+1;
    bar.classList.toggle('is-collapsed',matchHeaderCollapsed);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  sync();update();
  const observer=typeof MutationObserver==='undefined'?null:new MutationObserver(()=>{sync();schedule();});observer?.observe(header,{childList:true,subtree:true,characterData:true});
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);resize?.observe(header);const club=document.querySelector('body > .top');if(club)resize?.observe(club);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  frame=requestAnimationFrame(()=>{frame=0;if(carry){const top=parseFloat(getComputedStyle(bar).top)||0;window.scrollTo({top:Math.max(0,window.scrollY+bar.getBoundingClientRect().top-top),behavior:'instant'});}update();});
  matchHeaderCleanup=()=>{cancelAnimationFrame(frame);observer?.disconnect();resize?.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
}
