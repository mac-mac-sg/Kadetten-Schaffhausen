/* V1 keeps a separate place in each club/view for the current app session. */
const viewPositions=new Map(),clubViewOptions=new Map();
let currentViewMemory=null,viewRestoreFrame=0;
function viewOptions(){return {mode,competition,month,calendarYear,tableLeague};}
function applyViewOptions(options){if(!options)return;({mode,competition,month,calendarYear,tableLeague}=options);}
function viewPositionKey(club,route,options){return club+'|'+route+(route==='#season/games'?'|'+options.mode+'|'+options.competition:route==='#season/table'?'|'+options.tableLeague:'');}
function captureViewPosition(){
  const y=window.scrollY,top=clubHeaderOffset()+12;
  const candidates=[...document.querySelectorAll('#app .v1-news-card,#app .game-timeline .game-card')];
  const anchor=candidates.find(e=>e.getBoundingClientRect().bottom>top);
  return {y,anchor:anchor?{href:anchor.querySelector('a[href]')?.getAttribute('href'),offset:anchor.getBoundingClientRect().top}:null};
}
function positionScrollY(position,doc=document,win=window){
  if(!position)return 0;
  if(position.anchor){
    const card=[...doc.querySelectorAll('#app .v1-news-card,#app .game-timeline .game-card')].find(e=>e.querySelector('a[href]')?.getAttribute('href')===position.anchor.href);
    if(card)return Math.max(0,win.scrollY+card.getBoundingClientRect().top-position.anchor.offset);
  }
  return position.y;
}
function rememberViewPosition(){
  if(!currentViewMemory)return;
  viewPositions.set(currentViewMemory.key,captureViewPosition());
  if(viewPositions.size>100)viewPositions.delete(viewPositions.keys().next().value);
}
function rememberedView(route,club=activeClub){
  const options=clubViewOptions.get(club)||{mode:'list',competition:'Alle',month:initialCalendarDate[1]-1,calendarYear:initialCalendarDate[0],tableLeague:'QHL'};
  return {options,position:viewPositions.get(viewPositionKey(club,route,options))};
}
function beginViewRender(){
  if(document.documentElement.dataset.design==='v2')return null;
  cancelAnimationFrame(viewRestoreFrame);
  rememberViewPosition();
  const route=location.hash||'#home',routeKey=activeClub+'|'+route;
  if(currentViewMemory?.routeKey!==routeKey)applyViewOptions(rememberedView(route).options);
  const options=viewOptions(),key=viewPositionKey(activeClub,route,options);
  // V2's home header always starts at the same position when changing clubs.
  const clubChanged=currentViewMemory&&currentViewMemory.routeKey.split('|')[0]!==activeClub;
  if(document.documentElement.dataset.preview==='v2'&&route==='#home'&&clubChanged)viewPositions.delete(key);
  const memory={key,routeKey,route,options,position:viewPositions.get(key)};
  clubViewOptions.set(activeClub,options);currentViewMemory=memory;
  return memory;
}
function finishViewRender(memory){
  if(!memory)return;
  const restore=()=>{if(currentViewMemory!==memory)return;window.scrollTo({top:positionScrollY(memory.position),behavior:'instant'});};
  restore();
  // The first games visit is centred by centerNextGame; returning visits keep their place.
  if(memory.position||memory.route!=='#season/games'||memory.options.mode!=='list')viewRestoreFrame=requestAnimationFrame(restore);
}

/* Keep an incoming news list out of the way until the reader chooses to reveal it. */
const pendingNewsStories=new Map();
function deferUpdatedStories(club,incoming,current){
  if(document.documentElement.dataset.design==='v2'||activeClub!==club||(location.hash&&location.hash!=='#home')||window.scrollY<200&&!pendingNewsStories.has(club)||JSON.stringify(incoming)===JSON.stringify(current))return incoming;
  pendingNewsStories.set(club,incoming);
  let button=document.getElementById('new-stories');
  if(!button){button=document.createElement('button');button.id='new-stories';button.className='new-stories';button.type='button';button.textContent='Neue Beiträge verfügbar';document.body.append(button);button.onclick=()=>{viewPositions.delete(viewPositionKey(activeClub,'#home',viewOptions()));currentViewMemory=null;render();window.scrollTo({top:0,behavior:'instant'});const heading=document.querySelector('#home-news-title');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});};}
  return current;
}
function applyPendingNews(){
  for(const [club,next] of pendingNewsStories){
    if(club==='fcsg')fcsgData={...fcsgData,stories:next};
    else {const snapshot=handballSnapshots.get(club);if(snapshot)handballSnapshots.set(club,{...snapshot,stories:next});if(activeClub===club)stories=next;}
  }
  pendingNewsStories.clear();document.getElementById('new-stories')?.remove();
}
