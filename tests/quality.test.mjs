import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const source=name=>fs.readFileSync('src/client/'+name,'utf8');
const load=(c,name)=>vm.runInContext(source(name),c);

test('Snapshot warning follows Zurich schedule, grace period, night and DST',()=>{
 const c=vm.createContext({Date,Intl});load(c,'js/logic.js');
 const delayed=(stamp,now)=>c.snapshotDelayed(stamp,new Date(now));
 assert.equal(delayed('2026-10-04T22:27:00+02:00','2026-10-05T06:55:00+02:00'),false);
 assert.equal(delayed('2026-10-04T22:27:00+02:00','2026-10-05T07:06:00+02:00'),true);
 assert.equal(delayed('2026-10-05T09:27:00+02:00','2026-10-05T13:06:00+02:00'),true);
 assert.equal(delayed('2026-10-05T21:27:00+02:00','2026-10-05T23:06:00+02:00'),true);
 assert.equal(delayed('2026-10-24T22:27:00+02:00','2026-10-25T07:00:00+01:00'),false);
 assert.equal(delayed('2026-03-28T22:27:00+01:00','2026-03-29T07:06:00+02:00'),true);
 assert.equal(c.goalAverage(16,9),'1.8');assert.equal(c.goalAverage(null,9),'–');
});

test('PDF survives same-route render, while navigation closes it',()=>{
 let closes=0;
 const route='kadetten#match/izvidac/overview';
 const c=vm.createContext({applyPendingNews(){},beginViewRender:()=>null,programmeDialog:{dataset:{route}},activeClub:'kadetten',location:{hash:'#match/izvidac/overview'},closeMatchProgramme(){closes++;},document:{documentElement:{style:{},classList:{toggle(){}}},body:{classList:{toggle(){}}}},window:{scrollY:300},mode:'list',games:[{id:'izvidac'}],match:()=>'',notFound:()=>'', $:()=>({set innerHTML(v){throw Error('render reached');}})});
 load(c,'js/router.js');
 assert.throws(()=>c.render(),/render reached/);assert.equal(closes,0);
 c.location.hash='#match/other/overview';assert.throws(()=>c.render(),/render reached/);assert.equal(closes,1);
});

function liveApp(){
 const {document}=parseHTML('<html><body><section data-fcsg-game="42"></section><section id="fcsg-live-panel"><details open><summary>Quellen</summary><p>Vorschau</p></details></section></body></html>');
 const game={id:'42',home:'FC St.Gallen 1879',away:'FC Sion',date:'2026-10-06',time:'18:00',confirmed:true,events:[],venue:'Stadion',tickets:''};
 document.getElementById('fcsg-live-panel').dataset.signature=JSON.stringify(['preview',game.home,game.away,game.date,game.time,game.confirmed,game.venue,game.tickets]);
 let now=1000000,calls=0,previewLoads=0;
 class Clock extends Date {static now(){return now;}}
 const c=vm.createContext({Date:Clock,document,activeClub:'fcsg',location:{hash:'#match/42/overview'},fcsgData:{games:[game]},fcsgFixture:()=>game,fcsgMatchTicker:()=>'<h2>Geändert</h2>',fcsgMatchStage:g=>g.live?'live':g.score?'finished':'preview',fcsgMatchTickerSignature:g=>JSON.stringify(['preview',g.home,g.away,g.date,g.time,g.confirmed,g.venue,g.tickets]),loadMatchPreview(){previewLoads++;},AbortSignal,setInterval(){},apiFetch:async()=>{calls++;return {ok:true,json:async()=>({ok:true,checkedAt:new Date(now).toISOString(),match:{...game}})}}});load(c,'js/fcsg-live.js');
 return {c,document,game,advance:n=>now+=n,counts:()=>[calls,previewLoads]};
}
test('Unchanged FCSG live check keeps preview DOM and expanded sources',async()=>{
 const a=liveApp(),panel=a.document.getElementById('fcsg-live-panel'),details=panel.firstElementChild;
 await a.c.loadFcsgLive();a.c.updateFcsgLiveView();
 assert.equal(panel.firstElementChild,details);assert.equal(details.hasAttribute('open'),true);assert.equal(a.counts()[1],0);
 a.game.venue='Neues Stadion';a.advance(300000);await a.c.loadFcsgLive(true);
 assert.match(panel.textContent,/Geändert/);assert.equal(a.counts()[1],1);
});
test('FCSG tab changes in place from Vorschau to Liveticker and Rückblick',()=>{
 const a=liveApp(),link=a.document.createElement('a');link.setAttribute('data-fcsg-ticker-tab','');link.href='#match/42/ticker';link.textContent='Liveticker';a.document.body.append(link);
 const ticker=a.c.fcsgMatchTicker;load(a.c,'js/fcsg-match.js');a.c.fcsgMatchTicker=ticker;a.c.updateFcsgLiveView();assert.equal(link.textContent,'Vorschau');a.game.live=true;a.c.updateFcsgLiveView();assert.equal(link.textContent,'Liveticker');
 a.game.live=false;a.game.score=[0,0];a.c.updateFcsgLiveView();assert.equal(link.textContent,'Rückblick');assert.equal(a.document.querySelector('[data-fcsg-ticker-tab]'),link);assert.equal(link.getAttribute('href'),'#match/42/ticker');
});
test('FCSG polls live matches fast and future/finished matches less often',async()=>{
 const a=liveApp();await a.c.loadFcsgLive();a.advance(45000);await a.c.loadFcsgLive(true);assert.equal(a.counts()[0],1);
 a.advance(255000);await a.c.loadFcsgLive(true);assert.equal(a.counts()[0],2);
 a.game.live=true;a.advance(300000);await a.c.loadFcsgLive(true);a.advance(45000);await a.c.loadFcsgLive(true);assert.equal(a.counts()[0],4);
 a.game.live=false;a.game.score=[2,1];a.advance(45000);await a.c.loadFcsgLive(true);a.advance(45000);await a.c.loadFcsgLive(true);assert.equal(a.counts()[0],5);
});

test('HTTP and network errors preserve data and distinguish connectivity',async()=>{
 let notice=0;
 const old={checkedAt:'2026-10-05T10:27:00Z'};
 const c=vm.createContext({activeClub:'kadetten',handballClub:()=> 'kadetten',handballApiPath:p=>p,players:[],playerBios:{},games:[],tables:{QHL:[]},teamRecords:{},stories:[],clubLogos:{},otmarFallback:{},navigator:{onLine:true},offlineData:false,dataLoadFailed:false,updateState:old,weekDataFailures:new Set(),refreshWeekView(){},AbortSignal,localStorage:{removeItem(){}},syncOfflineNotice(){notice++;},apiFetch:async()=>({ok:false,status:503})});load(c,'js/data-sync.js');
 await c.loadCurrentData();assert.equal(c.offlineData,false);assert.equal(c.dataLoadFailed,true);assert.equal(c.updateState,old);assert.equal(notice,1);
 c.navigator.onLine=false;c.apiFetch=async()=>{throw Error('offline')};await c.loadCurrentData();assert.equal(c.offlineData,true);assert.equal(c.updateState,old);
});

test('PWA prompts only for different versions and reloads only on user action',()=>{
 const {document}=parseHTML('<html><body><header class="top"></header><button id="install-app"></button></body></html>');
 Object.defineProperty(document,'currentScript',{value:{src:'https://app.test/pwa.js?v=abc'}});
 const listeners={},windowListeners={};let reloads=0;
 const c=vm.createContext({document,URL,Date,setInterval(){},localStorage:{removeItem(){}},location:{reload(){reloads++;}},navigator:{onLine:true,serviceWorker:{controller:{postMessage(){}},addEventListener:(k,f)=>listeners[k]=f}},window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(k,f)=>windowListeners[k]=f}});load(c,'pwa.js');
 listeners.message({data:{type:'APP_VERSION',version:'kadetten-offline-abc'}});assert.equal(document.getElementById('app-update'),null);
 listeners.message({data:{type:'APP_VERSION',version:'kadetten-offline-def'}});assert.ok(document.getElementById('app-update'));assert.equal(document.getElementById('app-update').tagName,'DETAILS');assert.ok(document.querySelector('#app-update .status-dot'));assert.equal(reloads,0);
 document.querySelector('#app-update .subtle').onclick();assert.equal(document.getElementById('app-update').hidden,true);assert.equal(reloads,0);
 document.querySelector('#app-update button').onclick();assert.equal(reloads,1);
});

test('Install intro appears once, skips standalone and installs only on a deliberate click',async()=>{
 for(const standalone of [false,true]){
  const {document}=parseHTML('<html><body><header class="top"></header><button id="install-app"></button></body></html>');
  const events={},store=new Map([['fan-app-onboarding-v1','seen']]);let prompts=0;
  document.createElement=(original=>function(tag){const el=original.call(this,tag);if(tag==='dialog'){el.showModal=()=>el.setAttribute('open','');el.close=()=>el.removeAttribute('open');}return el;})(document.createElement);
  const c=vm.createContext({document,URL,Date,setInterval(){},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},navigator:{userAgent:'Chrome',platform:'Linux'},window:{matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(k,f)=>events[k]=f}});
  load(c,'pwa.js');events.load();
  if(standalone){assert.equal(document.querySelector('dialog'),null);continue;}
  assert.ok(document.querySelector('dialog[open]'));assert.equal(prompts,0);
  events.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'dismissed'})});
  await document.querySelector('[data-install]').onclick();assert.equal(prompts,1);assert.equal(document.querySelector('dialog'),null);
  events.load();assert.equal(document.querySelector('dialog'),null);
 }
});

test('Handball-Startseite füllt die Spielkarte vor der ersten Layoutmessung',()=>{
 for(const activeClub of ['kadetten','otmar']){
  let filled=false,measurements=0;
  const noop=()=>{},style={set scrollSnapType(v){},removeProperty:noop},classList={toggle:noop};
  const c=vm.createContext({applyPendingNews(){},beginViewRender:()=>null,finishViewRender(){},setupGameJumps(){},setupCollapsingMatchHeader(){},activeClub,programmeDialog:null,location:{hash:'#home'},mode:'list',fanClubs:{[activeClub]:{name:activeClub}},document:{documentElement:{style,classList},body:{classList},querySelectorAll:()=>[]},window:{scrollY:0,scrollTo:noop},requestAnimationFrame:noop,$:s=>s==='#app'?{set innerHTML(v){filled=false;}}:null,home:()=>'<a id="live-match" hidden></a>',showLiveMatch:()=>{filled=true;},updateClubHeader:noop,loadMatchPreview:noop,loadMatchProgramme:noop,setupClubPage:noop,setupRecentGames:noop,setupEnhancements:noop,loadGameReports:noop,loadPlayerReports:noop,loadEhfArchive:noop,loadFullArticle:noop});
  load(c,'js/router.js');c.setupViews=noop;c.setupWeekView=noop;
  c.measureAppChrome=()=>{measurements++;assert.equal(filled,true,'Layout darf nicht mit der ausgeblendeten Spielkarte gemessen werden');};
  c.render();assert.equal(measurements,1);
 }
});

test('Kopfzeilenhöhe behält Subpixel bei, auch nach einer Grössenänderung',()=>{
 let height=129.6875,resize;
 const rootValues={},bodyValues={},top={getBoundingClientRect:()=>({height})};
 const c=vm.createContext({document:{querySelector:()=>top,documentElement:{style:{setProperty:(k,v)=>rootValues[k]=v}},body:{style:{setProperty:(k,v)=>bodyValues[k]=v}}},ResizeObserver:class{constructor(callback){resize=callback;}disconnect(){}observe(element){assert.equal(element,top);}}});
 load(c,'js/router.js');c.measureAppChrome();
 assert.equal(rootValues['--app-header-height'],'129.6875px');
 assert.equal(bodyValues['--games-header-height'],'129.6875px');
 height=152.3125;resize();
 assert.equal(rootValues['--app-header-height'],'152.3125px');
 assert.equal(bodyValues['--games-header-height'],'152.3125px');
});

test('Aktuelles Spiel liegt unter der dauerhaft sichtbaren Vereinsauswahl und den eingerasteten Laschen',()=>{
 for(const [headerBottom,height] of [[350,320],[350,600],[240,320],[350,900]]){
  let scrolled;
  const card={top:700,height},selectors={'.game-timeline .current-game':{getBoundingClientRect:()=>card},'body > .top':{getBoundingClientRect:()=>({bottom:140,height:140})},'.season-header':{getBoundingClientRect:()=>({top:140,height:headerBottom-140}),querySelector:()=>({getBoundingClientRect:()=>({top:180})})},'.dock':{getBoundingClientRect:()=>({top:750})}};
  const c=vm.createContext({location:{hash:'#season/games'},mode:'list',cancelAnimationFrame(){},requestAnimationFrame:f=>{f();return 1;},document:{querySelector:s=>selectors[s]},window:{innerHeight:844,visualViewport:{height:820},scrollY:200,scrollTo:options=>scrolled=options}});
  load(c,'js/router.js');c.centerNextGame();
  const positionedTop=card.top+200-scrolled.top;
  const pinnedHeight=154+headerBottom-180;
  assert.ok(positionedTop>=pinnedHeight+12);
  if(height<=750-24-pinnedHeight)assert.ok(positionedTop+height<=738);
  else assert.equal(positionedTop,pinnedHeight+12);
  assert.equal(scrolled.behavior,'instant');
  scrolled=null;c.location.hash='#season/table';c.centerNextGame();assert.equal(scrolled,null);
 }
});

test('Introduction guides first-time users, remembers dismissal and can be reopened in standalone',()=>{
 for(const standalone of [false,true]){
  const {document}=parseHTML('<html><body><button id="install-app"></button><button id="club-settings"></button></body></html>');
  const events={},store=new Map();
  document.createElement=(original=>function(tag){const el=original.call(this,tag);if(tag==='dialog'){el.showModal=()=>el.setAttribute('open','');el.close=()=>el.removeAttribute('open');}return el;})(document.createElement);
  const window={matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(k,f)=>events[k]=f};
  const c=vm.createContext({document,URL,Date,setInterval(){},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},navigator:{userAgent:'Chrome',platform:'Linux'},window});
  load(c,'pwa.js');events.load();
  assert.equal(document.querySelector('.guide-progress').textContent,'1 von 4 · Deine Vereine');
  assert.equal(document.querySelector('[data-back]').hidden,true);
  assert.equal(document.querySelector('.install-intro'),null);
  assert.equal(document.querySelector('.guide-visual').getAttribute('aria-hidden'),'true');
  assert.equal(document.querySelector('.guide-visual').querySelectorAll('button,a,input').length,0);
  document.querySelector('[data-next]').onclick();
  assert.equal(document.querySelector('.guide-progress').textContent,'2 von 4 · News');
  document.querySelector('[data-back]').onclick();
  assert.match(document.querySelector('h2').textContent,/Deine Vereine/);
  document.querySelector('[data-skip]').onclick();
  assert.equal(store.get('fan-app-onboarding-v1'),'seen');
  assert.equal(document.querySelector('dialog'),null);
  store.set('fan-app-install-intro-v1','seen');events.load();
  assert.equal(document.querySelector('dialog'),null);
  window.showAppIntroduction();
  for(let i=0;i<2;i++)document.querySelector('[data-next]').onclick();
  assert.doesNotMatch(document.querySelector('.app-introduction').textContent,/Meine Woche/);
  assert.match(document.querySelector('.app-introduction').textContent,/Wettbewerbsfilter/);
  document.querySelector('[data-next]').onclick();
  assert.match(document.querySelector('.guide-visual').textContent,/Wappen antippen.*Geschichte/);
  assert.equal(document.querySelector('[data-next]').textContent,'Los geht’s');
  document.querySelector('[data-next]').onclick();
  assert.equal(document.querySelector('dialog'),null);
  window.showAppIntroduction();
  document.querySelector('dialog').dispatchEvent(new document.defaultView.Event('cancel',{cancelable:true}));
  assert.equal(document.querySelector('dialog'),null);
 }
});

test('Completing the first introduction offers installation only outside standalone',()=>{
 for(const standalone of [false,true]){
  const {document}=parseHTML('<html><body><button id="install-app"></button></body></html>');
  const events={},store=new Map();
  document.createElement=(original=>function(tag){const el=original.call(this,tag);if(tag==='dialog'){el.showModal=()=>el.setAttribute('open','');el.close=()=>el.removeAttribute('open');}return el;})(document.createElement);
  const c=vm.createContext({document,URL,Date,setInterval(){},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},navigator:{userAgent:'Chrome',platform:'Linux'},window:{matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(k,f)=>events[k]=f}});
  load(c,'pwa.js');events.load();
  for(let i=0;i<4;i++)document.querySelector('[data-next]').onclick();
  assert.equal(document.querySelector('.app-introduction'),null);
  assert.equal(Boolean(document.querySelector('.install-intro')),!standalone);
 }
});

test('Calendar opens in the current Zurich month rather than a fixed October',()=>{
 class NovemberDate extends Date {constructor(...args){super(...(args.length?args:['2026-11-17T10:00:00Z']));}}
 const c=vm.createContext({Date:NovemberDate,document:{querySelector:()=>null}});load(c,'js/core.js');
 assert.equal(vm.runInContext('calendarYear',c),2026);assert.equal(vm.runInContext('month',c),10);
});

test('Live content updates preserve the orbit node; confirmed completion hides it and restart creates only one contour',()=>{
 const {document}=parseHTML('<html><body><a id="card"></a></body></html>');
 const c=vm.createContext({document,URL,location:{href:'https://app.test/'},navigator:{onLine:true},window:{},Date});
 load(c,'js/logic.js');load(c,'js/core.js');
 const slot=document.getElementById('card'),g={date:c.swissToday(),time:'18:00'};
 c.setMatchdayContent(slot,'<b>Vorschau</b>');c.syncMatchdayOrbit(slot,g);
 const orbit=slot.querySelector('.matchday-orbit');assert.ok(orbit);assert.equal(orbit.getAttribute('aria-hidden'),'true');assert.equal(orbit.getAttribute('focusable'),'false');
 c.setMatchdayContent(slot,'<b>Live-Spiel · 13:11</b>');c.syncMatchdayOrbit(slot,g,true);
 assert.equal(slot.querySelector('.matchday-orbit'),orbit);assert.match(slot.textContent,/13:11/);assert.equal(slot.style.getPropertyValue('--orbit-period'),'3s');
 c.syncMatchdayOrbit(slot,{...g,score:[25,23]});assert.equal(orbit.hasAttribute('hidden'),true);
 c.syncMatchdayOrbit(slot,g);assert.equal(orbit.hasAttribute('hidden'),false);assert.equal(slot.querySelectorAll('.matchday-orbit').length,1);
});

test('V1 inset match action follows preview, live, result and hidden states without changing the foreground card',()=>{
 const {document}=parseHTML('<html><body><section class="home-matchday"><a class="live-match" href="#match/one/overview"><b>Vorschau</b></a></section></body></html>');
 const c=vm.createContext({document,Date});load(c,'js/core.js');
 const slot=document.querySelector('.live-match'),original=slot.outerHTML;
 c.syncV1MatchAction(slot);
 const action=document.querySelector('.v1-match-action');
 assert.equal(slot.parentNode.className,'v1-match-stack');assert.equal(slot.parentNode.parentNode.className,'home-matchday');
 assert.equal(slot.outerHTML,original);assert.equal(action.parentNode,slot.parentNode);assert.equal(slot.contains(action),false);
 assert.equal(action.textContent,'Spielvorschau');assert.equal(action.getAttribute('href'),'#match/one/overview');
 slot.classList.add('is-matchday');c.syncV1MatchAction(slot);assert.equal(action.textContent,'Zum Spiel');
 slot.classList.add('is-live');slot.setAttribute('href','#match/two/ticker');c.syncV1MatchAction(slot);
 assert.equal(action.textContent,'Live verfolgen');assert.equal(action.getAttribute('href'),'#match/two/ticker');
 slot.classList.remove('is-live');slot.classList.add('matchday-win');c.syncV1MatchAction(slot);assert.equal(action.textContent,'Zum Spielrückblick');
 slot.hidden=true;c.syncV1MatchAction(slot);assert.equal(action.hidden,true);
 slot.hidden=false;c.syncV1MatchAction(slot);assert.equal(action.hidden,false);assert.equal(document.querySelectorAll('.v1-match-action').length,1);
 action.remove();document.documentElement.dataset.design='v2';c.syncV1MatchAction(slot);assert.equal(document.querySelector('.v1-match-action'),null);
 delete document.documentElement.dataset.design;slot.closest('.home-matchday').classList.add('games-matchday');c.syncV1MatchAction(slot);assert.equal(document.querySelector('.v1-match-action'),null);
});

test('V1 reserves the complete fixed club header and gap; V2 keeps its existing header height',()=>{
 const document={documentElement:{dataset:{}},querySelector:()=>({getBoundingClientRect:()=>({top:14,height:64,bottom:78})})};
 const c=vm.createContext({document});load(c,'js/router.js');
 assert.equal(c.clubHeaderOffset(),92);
 document.querySelector=()=>({getBoundingClientRect:()=>({top:38,height:80,bottom:118})});assert.equal(c.clubHeaderOffset(),132);
 document.documentElement.dataset.design='v2';assert.equal(c.clubHeaderOffset(),80);
 document.querySelector=()=>null;assert.equal(c.clubHeaderOffset(),0);
});
