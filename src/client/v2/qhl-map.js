/* V2-only QHL explorer. The production shell never loads this module. */
const qhlMapSessions=new Map();
let qhlMapView=null,qhlLibraryPromise;
function qhlNormalise(name){return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function qhlVenue(name){return qhlVenueRegistry.find(v=>v.aliases.some(n=>qhlNormalise(n)===qhlNormalise(name)));}
function qhlMapTeams(){
 return (tables.QHL||[]).map((row,index)=>{
  const venue=qhlVenue(row[0]);
  return {...venue,id:venue?.id||'unknown-'+index,name:venue?.name||row[0],tableName:row[0],rank:index+1,played:Number.isFinite(row[1])?row[1]:null,points:Number.isFinite(row[4])?row[4]:null};
 });
}
function qhlGroups(teams,project,zoom){
 const groups=[];
 for(const team of teams){
  const p=project(team.coordinates),group=zoom<11?groups.find(g=>g.every(t=>{const q=project(t.coordinates);return Math.hypot(p.x-q.x,p.y-q.y)<60;})):null;
  if(group)group.push(team);else groups.push([team]);
 }
 return groups;
}
function qhlViewSwitch(map=false){return `<nav class="qhl-view-switch" aria-label="QHL-Ansicht"><a href="#season/table" ${map?'':'aria-current="page"'}>Tabelle</a><a href="#season/table/map" ${map?'aria-current="page"':''}>Karte</a></nav>`;}
function qhlLogo(team){const logo=clubLogos[team.tableName]||clubLogos[team.name]||qhlVenue(team.name)?.aliases.map(n=>clubLogos[n]).find(Boolean);return logo?`<img class="crest" src="${liveEscape(photoUrl(logo))}" alt="" width="48" height="60" loading="lazy" decoding="async">`:`<span class="clubmark" aria-hidden="true">${liveEscape(team.name.split(' ').map(w=>w[0]).slice(0,3).join(''))}</span>`;}
function qhlArrow(){return `<span class="qhl-card-arrow" aria-hidden="true">${v2ArrowSvg()}</span>`;}
function qhlMapPage(){
 const teams=qhlMapTeams();
 return `<section class="qhl-map-screen" aria-labelledby="qhl-map-title"><h1 id="qhl-map-title" class="season-screen-title">QHL-Vereinskarte</h1><div class="qhl-map-toolbar">${qhlViewSwitch(true)}<span>QHL · ${teams.length} Vereine</span></div><div class="qhl-map-stage"><div id="qhl-map-canvas" role="region" aria-label="Interaktive Karte der QHL-Heimspielstätten"></div><div class="qhl-map-tools"><button type="button" data-qhl-all>Alle Vereine</button><button type="button" data-qhl-list aria-expanded="false" aria-controls="qhl-team-list">Vereinsliste</button></div><div class="qhl-zoom"><button type="button" data-qhl-zoom="1" aria-label="Karte vergrössern">+</button><button type="button" data-qhl-zoom="-1" aria-label="Karte verkleinern">−</button></div><p class="qhl-map-status" role="status">Karte wird geladen …</p><p class="qhl-map-hint">Heimspielstätten entdecken.<br><span>Tippe auf ein Vereinswappen.</span></p><div id="qhl-team-list" class="qhl-team-list" hidden><div class="qhl-list-head"><h2>Die Vereine der QHL</h2><button type="button" data-qhl-close-list aria-label="Vereinsliste schliessen">×</button></div>${teams.map(t=>`<button type="button" class="qhl-list-row" data-qhl-team="${t.id}">${qhlLogo(t)}<span><strong>${liveEscape(t.name)}</strong><small>${liveEscape(t.city||'Standort noch nicht erfasst')}</small></span><span aria-hidden="true">↗</span></button>`).join('')}${teams.length?'':'<p>Zurzeit ist keine QHL-Tabelle verfügbar.</p>'}</div><div class="qhl-card-host"></div></div></section>`;
}
function qhlSession(){if(!qhlMapSessions.has(activeClub))qhlMapSessions.set(activeClub,{selected:null,camera:null});return qhlMapSessions.get(activeClub);}
function qhlCard(team){return `<button type="button" class="qhl-club-card" data-qhl-details aria-haspopup="dialog">${qhlLogo(team)}<span><small>${liveEscape(team.city||'QHL')}</small><strong>${liveEscape(team.name)}</strong><span>${liveEscape(team.venue||'Heimspielstätte noch nicht erfasst')}</span><small>${team.rank}. Rang · ${team.points??'–'} Punkte</small></span>${qhlArrow()}</button>`;}
function qhlEncounters(team){
 return games.filter(g=>g.league==='QHL'&&[g.home,g.away].some(n=>(qhlVenue(n)?.id===team.id||qhlNormalise(n)===qhlNormalise(team.tableName)))).slice().sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
}
function qhlDetailMarkup(team){
 const encounters=qhlEncounters(team),club=team.id==='kadetten'||team.id==='otmar'?team.id:null;
 const clubHref=club?'?club='+club+'#club':null;
 return `<dialog class="qhl-club-dialog" aria-labelledby="qhl-detail-title"><form method="dialog" class="qhl-detail-top"><span>QHL · ${liveEscape(team.city||'Verein')}</span><button aria-label="Vereinsprofil schliessen" autofocus>×</button></form>${team.photo?`<img class="qhl-venue-photo" data-photo-club="${team.id}" src="${team.photo}" alt="${liveEscape(team.venue)}" width="800" height="450">`:''}<div class="qhl-detail-copy"><div class="qhl-detail-identity">${qhlLogo(team)}<div><p>${liveEscape(team.city||'QHL')}</p><h2 id="qhl-detail-title">${liveEscape(team.name)}</h2></div></div>${team.description?`<p>${liveEscape(team.description)}</p>`:''}<dl class="qhl-facts"><div><dt>Tabellenrang</dt><dd>${team.rank}.</dd></div><div><dt>Punkte</dt><dd>${team.points??'–'}</dd></div><div><dt>Spiele</dt><dd>${team.played??'–'}</dd></div></dl><p class="qhl-data-date">${updateLabel('table')}</p><section><h3>Heimstätte</h3><p><strong>${liveEscape(team.venue||'Noch nicht erfasst')}</strong>${team.address?'<br>'+liveEscape(team.address):''}</p>${team.coordinates?`<a class="qhl-action" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(team.address)}" target="_blank" rel="noopener noreferrer">Anreise planen ${qhlArrow()}</a>`:''}</section>${clubHref?`<a class="qhl-action" data-qhl-club="${club}" href="${clubHref}">Geschichte &amp; Erfolge ${qhlArrow()}</a>`:''}${encounters.length?`<section><h3>${team.id===activeClub?'Spiele im Vereins-Spielplan':'Begegnungen mit '+liveEscape(handballTeamName())}</h3><div class="qhl-encounters">${encounters.map(g=>`<a href="#match/${liveEscape(g.id)}/overview"><span><small>${liveEscape(date(g))}</small><strong>${liveEscape(g.home)}<br>${liveEscape(g.away)}</strong></span><span>${g.score?liveEscape(g.score.join(':')):liveEscape(g.time||'Termin offen')}</span></a>`).join('')}</div></section>`:''}${team.website?`<a class="qhl-action" href="${team.website}" target="_blank" rel="noopener noreferrer">Offizielle Website ${qhlArrow()}</a>`:''}<details class="qhl-sources"><summary>Quellen und Standortangaben</summary><p>Reguläre Heimspielstätte · geprüft am 21.10.2026. Einzelne Spiele können an einem anderen Ort stattfinden; massgebend ist der jeweilige Spielplan.</p>${team.source?`<p><a href="${team.source}" target="_blank" rel="noopener noreferrer">Hallenangaben</a></p>`:''}${team.coordinateSource?`<p><a href="${team.coordinateSource.replaceAll('&','&amp;')}" target="_blank" rel="noopener noreferrer">Koordinaten: swisstopo Gebäudeadressverzeichnis</a></p>`:''}<p>Tabellenwerte und Begegnungen: vorhandener SHV-Datenstand der App.</p></details></div></dialog>`;
}
function qhlSetList(view,open){
 if(!view.host.isConnected)return;
 view.host.querySelector('#qhl-team-list').hidden=!open;view.host.querySelector('[data-qhl-list]').setAttribute('aria-expanded',String(open));
 if(open)view.host.querySelector('[data-qhl-close-list]').focus({preventScroll:true});
}
function qhlSelect(view,id,pan=true){
 const team=view.teams.find(t=>t.id===id);if(!team)return;
 view.session.selected=id;qhlSetList(view,false);if(view.host.querySelector('.qhl-map-status.is-notice'))view.host.querySelector('.qhl-map-status').hidden=true;
 view.host.querySelector('.qhl-card-host').innerHTML=qhlCard(team);view.host.querySelector('.qhl-map-hint').hidden=true;
 view.host.querySelector('[data-qhl-details]').onclick=()=>qhlOpenDetail(view,team);
 for(const {element,ids} of view.markers)element.setAttribute('aria-pressed',String(ids.includes(id)));
 if(pan&&team.coordinates&&view.map)view.map.easeTo({center:team.coordinates,offset:[0,-75],duration:view.reduced?0:300});
}
function qhlOpenDetail(view,team){
 view.dialog?.remove();const box=document.createElement('div');box.innerHTML=qhlDetailMarkup(team);const dialog=box.firstElementChild;view.host.append(dialog);view.dialog=dialog;
 dialog.addEventListener('close',()=>{dialog.remove();view.dialog=null;view.host.querySelector('[data-qhl-details]')?.focus({preventScroll:true});},{once:true});
 dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
 dialog.querySelector('[data-qhl-club]')?.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();dialog.close();const club=e.currentTarget.dataset.qhlClub;if(club===activeClub)location.hash='#club';else applyClubChange(club,'#club',true);});
 dialog.showModal();
}
function qhlFitAll(view,reset=true){
 if(reset){view.session.selected=null;view.host.querySelector('.qhl-card-host').innerHTML='';view.host.querySelector('.qhl-map-hint').hidden=false;for(const m of view.markers)m.element.setAttribute('aria-pressed','false');}
 if(view.map)view.map.fitBounds([[5.9,45.75],[10.6,47.85]],{padding:{top:80,bottom:105,left:20,right:20},duration:view.reduced?0:350});
}
function qhlSyncMarkers(view){
 if(!view.map||!view.host.isConnected)return;
 for(const marker of view.markers)marker.marker.remove();view.markers=[];
 for(const group of qhlGroups(view.teams.filter(t=>t.coordinates),c=>view.map.project(c),view.map.getZoom())){
  const button=document.createElement('button');button.type='button';button.className='qhl-map-marker'+(group.length>1?' is-cluster':'');
  const ids=group.map(t=>t.id),selected=ids.includes(view.session.selected);
  button.setAttribute('aria-pressed',String(selected));
  button.setAttribute('aria-label',group.length===1?group[0].name+', '+group[0].venue:group.length+' Vereine: '+group.map(t=>t.name).join(', '));
  button.innerHTML=group.length===1?qhlLogo(group[0]):`<strong>${group.length}</strong><span class="qhl-cluster-label">Vereine</span>`;
  button.onclick=()=>{
   if(group.length===1)qhlSelect(view,group[0].id);
   else {const coords=group.map(t=>t.coordinates);view.map.fitBounds([[Math.min(...coords.map(c=>c[0])),Math.min(...coords.map(c=>c[1]))],[Math.max(...coords.map(c=>c[0])),Math.max(...coords.map(c=>c[1]))]],{padding:{top:100,bottom:170,left:70,right:70},maxZoom:12,duration:view.reduced?0:350});}
  };
  const center=[0,1].map(i=>group.reduce((n,t)=>n+t.coordinates[i],0)/group.length);
  const marker=new view.lib.Marker({element:button,anchor:'center'}).setLngLat(center).addTo(view.map);view.markers.push({marker,element:button,ids});
 }
}
function qhlLoadLibrary(){
 if(!qhlLibraryPromise){
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('assets/maplibre-6.15.0/maplibre-gl.css',document.baseURI).href;document.head.append(css);
  qhlLibraryPromise=import(new URL('assets/maplibre-6.15.0/maplibre-gl.mjs',document.baseURI).href).catch(e=>{qhlLibraryPromise=null;css.remove();throw e;});
 }
 return qhlLibraryPromise;
}
function qhlLocalisedStyle(style){
 const localise=v=>Array.isArray(v)?v.map(localise):v==='name_en'?'name_de':v==='name:en'?'name:de':v;
 return {...style,layers:style.layers.map(l=>l.layout?.['text-field']?{...l,layout:{...l.layout,'text-field':localise(l.layout['text-field'])}}:l)};
}
function qhlMapUnavailable(view,message='Die Karte ist gerade nicht verfügbar. Alle Vereine findest du in der Liste.'){
 if(qhlMapView!==view||!view.host.isConnected)return;
 const status=view.host.querySelector('.qhl-map-status');status.textContent=message;status.classList.add('is-notice');qhlSetList(view,true);view.host.querySelector('.qhl-map-hint').hidden=true;
}
function qhlDisposeMap(){
 const view=qhlMapView;if(!view)return;qhlMapView=null;view.abort.abort();clearTimeout(view.timer);view.resize?.disconnect();view.themeObserver?.disconnect();window.removeEventListener('resize',view.measure);window.visualViewport?.removeEventListener('resize',view.measure);
 view.dialog?.close();view.dialog?.remove();if(view.map){view.session.camera={center:view.map.getCenter().toArray(),zoom:view.map.getZoom()};view.map.remove();}
 document.body.classList.remove('qhl-map-mode');
}
async function qhlMountMap(){
 const host=document.querySelector('.qhl-map-screen');if(!host)return;
 const view={host,teams:qhlMapTeams(),session:qhlSession(),markers:[],abort:new AbortController(),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};qhlMapView=view;document.body.classList.add('qhl-map-mode');
 view.measure=()=>{if(!host.isConnected)return;const top=document.querySelector('body > .top').getBoundingClientRect().bottom+12,bottom=Math.max(12,innerHeight-document.querySelector('body > .dock').getBoundingClientRect().top+12);host.style.top=top+'px';host.style.bottom=bottom+'px';view.map?.resize();};
 const status=host.querySelector('.qhl-map-status');status.hidden=false;status.textContent='Karte wird geladen …';status.classList.remove('is-notice');
 view.theme=document.documentElement.dataset.theme;view.themeObserver=new MutationObserver(()=>{if(qhlMapView===view&&document.documentElement.dataset.theme!==view.theme){qhlDisposeMap();qhlMountMap();}});view.themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
 view.measure();if(typeof ResizeObserver!=='undefined'){view.resize=new ResizeObserver(view.measure);for(const el of document.querySelectorAll('body > .top,body > .dock'))view.resize.observe(el);}window.addEventListener('resize',view.measure);window.visualViewport?.addEventListener('resize',view.measure);
 host.querySelector('[data-qhl-list]').onclick=()=>qhlSetList(view,host.querySelector('#qhl-team-list').hidden);host.querySelector('[data-qhl-close-list]').onclick=()=>{qhlSetList(view,false);host.querySelector('[data-qhl-list]').focus();};host.querySelector('[data-qhl-all]').onclick=()=>qhlFitAll(view);
 host.querySelectorAll('[data-qhl-team]').forEach(b=>b.onclick=()=>{qhlSelect(view,b.dataset.qhlTeam);host.querySelector('[data-qhl-details]').focus({preventScroll:true});});
 host.querySelectorAll('[data-qhl-zoom]').forEach(b=>b.onclick=()=>view.map?.easeTo({zoom:view.map.getZoom()+Number(b.dataset.qhlZoom),duration:view.reduced?0:200}));
 if(view.session.selected)qhlSelect(view,view.session.selected,false);
 view.timer=setTimeout(()=>{view.abort.abort();qhlMapUnavailable(view);},12000);
 try{
  const [lib,response]=await Promise.all([qhlLoadLibrary(),fetch('https://tiles.openfreemap.org/styles/'+(document.documentElement.dataset.theme==='light'?'positron':'dark'),{signal:view.abort.signal})]);
  if(!response.ok)throw Error('Map style unavailable');const style=await response.json();if(qhlMapView!==view||!host.isConnected)return;clearTimeout(view.timer);
  view.lib=lib;lib.setWorkerCount(1);lib.setWorkerUrl(new URL('assets/maplibre-6.15.0/maplibre-gl-worker.mjs',document.baseURI).href);
  const camera=view.session.camera;
  view.map=new lib.Map({container:host.querySelector('#qhl-map-canvas'),style:qhlLocalisedStyle(style),locale:{'Map.Title':'QHL-Vereinskarte','AttributionControl.ToggleAttribution':'Kartenquellen anzeigen'},center:camera?.center||[8.25,46.9],zoom:camera?.zoom||6.2,minZoom:5,maxZoom:16,maxBounds:[[4.8,44.8],[11.7,49.1]],attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false,touchPitch:false,canvasContextAttributes:{antialias:false}});
  if(!camera)qhlFitAll(view,false);
  view.map.on('load',()=>{if(qhlMapView!==view)return;host.querySelector('.qhl-map-status').hidden=true;qhlSyncMarkers(view);});
  view.map.on('moveend',()=>qhlSyncMarkers(view));
  view.map.on('error',()=>{if(qhlMapView!==view)return;const status=host.querySelector('.qhl-map-status');status.hidden=false;status.classList.add('is-notice');status.textContent='Einzelne Kartendaten fehlen. Die Vereinsliste bleibt verfügbar.';});
  qhlSyncMarkers(view);
 }catch(error){if(qhlMapView===view){clearTimeout(view.timer);qhlMapUnavailable(view);}}
}
const qhlSharedStanding=standing;
standing=function(...args){return (activeClub!=='fcsg'&&tableLeague==='QHL'?qhlViewSwitch():'')+qhlSharedStanding(...args);};
const qhlSharedSeason=season;
season=function(tab){return tab==='table'&&activeClub!=='fcsg'&&location.hash.split('/')[2]==='map'?qhlMapPage():qhlSharedSeason(tab);};
const qhlSharedSetup=setupViews;
setupViews=function(...args){qhlDisposeMap();qhlSharedSetup(...args);if(activeClub!=='fcsg'&&location.hash.split('/')[2]==='map'&&location.hash.startsWith('#season/table/'))qhlMountMap();};
