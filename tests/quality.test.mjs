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
 const c=vm.createContext({programmeDialog:{dataset:{route}},activeClub:'kadetten',location:{hash:'#match/izvidac/overview'},closeMatchProgramme(){closes++;},document:{documentElement:{style:{},classList:{toggle(){}}},body:{classList:{toggle(){}}}},window:{scrollY:300},mode:'list',games:[{id:'izvidac'}],match:()=>'',notFound:()=>'', $:()=>({set innerHTML(v){throw Error('render reached');}})});
 load(c,'js/router.js');
 assert.throws(()=>c.render(),/render reached/);assert.equal(closes,0);
 c.location.hash='#match/other/overview';assert.throws(()=>c.render(),/render reached/);assert.equal(closes,1);
});

function liveApp(){
 const {document}=parseHTML('<html><body><section data-fcsg-game="42"></section><section id="fcsg-overview"><details open><summary>Quellen</summary><p>Vorschau</p></details></section></body></html>');
 const game={id:'42',home:'FC St.Gallen 1879',away:'FC Sion',date:'2026-10-06',time:'18:00',confirmed:true,events:[],venue:'Stadion',tickets:''};
 document.getElementById('fcsg-overview').dataset.signature=JSON.stringify(['preview',game.home,game.away,game.date,game.time,game.confirmed,game.venue,game.tickets]);
 let now=1000000,calls=0,previewLoads=0;
 class Clock extends Date {static now(){return now;}}
 const c=vm.createContext({Date:Clock,document,activeClub:'fcsg',location:{hash:'#match/42/overview'},fcsgData:{games:[game]},fcsgFixture:()=>game,fcsgOverview:()=>'<h2>Geändert</h2>',loadMatchPreview(){previewLoads++;},AbortSignal,setInterval(){},apiFetch:async()=>{calls++;return {ok:true,json:async()=>({ok:true,checkedAt:new Date(now).toISOString(),match:{...game}})}}});load(c,'js/fcsg-live.js');
 return {c,document,game,advance:n=>now+=n,counts:()=>[calls,previewLoads]};
}
test('Unchanged FCSG live check keeps preview DOM and expanded sources',async()=>{
 const a=liveApp(),panel=a.document.getElementById('fcsg-overview'),details=panel.firstElementChild;
 await a.c.loadFcsgLive();a.c.updateFcsgLiveView();
 assert.equal(panel.firstElementChild,details);assert.equal(details.hasAttribute('open'),true);assert.equal(a.counts()[1],0);
 a.game.venue='Neues Stadion';a.advance(300000);await a.c.loadFcsgLive(true);
 assert.match(panel.textContent,/Geändert/);assert.equal(a.counts()[1],1);
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
 const c=vm.createContext({activeClub:'kadetten',handballClub:()=> 'kadetten',handballApiPath:p=>p,players:[],playerBios:{},games:[],tables:{QHL:[]},teamRecords:{},stories:[],clubLogos:{},otmarFallback:{},navigator:{onLine:true},offlineData:false,dataLoadFailed:false,updateState:old,AbortSignal,localStorage:{removeItem(){}},syncOfflineNotice(){notice++;},apiFetch:async()=>({ok:false,status:503})});load(c,'js/data-sync.js');
 await c.loadCurrentData();assert.equal(c.offlineData,false);assert.equal(c.dataLoadFailed,true);assert.equal(c.updateState,old);assert.equal(notice,1);
 c.navigator.onLine=false;c.apiFetch=async()=>{throw Error('offline')};await c.loadCurrentData();assert.equal(c.offlineData,true);assert.equal(c.updateState,old);
});

test('PWA prompts only for different versions and reloads only on user action',()=>{
 const {document}=parseHTML('<html><body><header class="top"></header><button id="install-app"></button></body></html>');
 Object.defineProperty(document,'currentScript',{value:{src:'https://app.test/pwa.js?v=abc'}});
 const listeners={},windowListeners={};let reloads=0;
 const c=vm.createContext({document,URL,Date,setInterval(){},localStorage:{removeItem(){}},location:{reload(){reloads++;}},navigator:{onLine:true,serviceWorker:{controller:{postMessage(){}},addEventListener:(k,f)=>listeners[k]=f}},window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(k,f)=>windowListeners[k]=f}});load(c,'pwa.js');
 listeners.message({data:{type:'APP_VERSION',version:'kadetten-offline-abc'}});assert.equal(document.getElementById('app-update'),null);
 listeners.message({data:{type:'APP_VERSION',version:'kadetten-offline-def'}});assert.ok(document.getElementById('app-update'));assert.equal(reloads,0);
 document.querySelector('#app-update .subtle').onclick();assert.equal(document.getElementById('app-update').hidden,true);assert.equal(reloads,0);
 document.querySelector('#app-update button').onclick();assert.equal(reloads,1);
});

test('Install intro appears once, skips standalone and installs only on a deliberate click',async()=>{
 for(const standalone of [false,true]){
  const {document}=parseHTML('<html><body><header class="top"></header><button id="install-app"></button></body></html>');
  const events={},store=new Map();let prompts=0;
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
  const c=vm.createContext({activeClub,programmeDialog:null,location:{hash:'#home'},mode:'list',fanClubs:{[activeClub]:{name:activeClub}},document:{documentElement:{style,classList},body:{classList},querySelectorAll:()=>[]},window:{scrollY:0,scrollTo:noop},requestAnimationFrame:noop,$:s=>s==='#app'?{set innerHTML(v){filled=false;}}:null,home:()=>'<a id="live-match" hidden></a>',showLiveMatch:()=>{filled=true;},updateClubHeader:noop,loadMatchPreview:noop,loadMatchProgramme:noop,setupClubPage:noop,setupRecentGames:noop,setupEnhancements:noop,loadGameReports:noop,loadPlayerReports:noop,loadEhfArchive:noop,loadFullArticle:noop});
  load(c,'js/router.js');c.setupViews=noop;
  c.measureAppChrome=()=>{measurements++;assert.equal(filled,true,'Layout darf nicht mit der ausgeblendeten Spielkarte gemessen werden');};
  c.render();assert.equal(measurements,1);
 }
});

test('Kopfzeilenhöhe behält Subpixel bei, auch nach einer Grössenänderung',()=>{
 let height=129.6875,resize;
 const rootValues={},bodyValues={},top={getBoundingClientRect:()=>({height})};
 const c=vm.createContext({document:{querySelector:()=>top,documentElement:{style:{setProperty:(k,v)=>rootValues[k]=v}},body:{style:{setProperty:(k,v)=>bodyValues[k]=v}}},ResizeObserver:class{constructor(callback){resize=callback;}observe(element){assert.equal(element,top);}}});
 load(c,'js/router.js');c.measureAppChrome();
 assert.equal(rootValues['--app-header-height'],'129.6875px');
 assert.equal(bodyValues['--games-header-height'],'129.6875px');
 height=152.3125;resize();
 assert.equal(rootValues['--app-header-height'],'152.3125px');
 assert.equal(bodyValues['--games-header-height'],'152.3125px');
});

test('Aktuelles Spiel liegt zwischen fixierter Kopfzeile und Dock; hohe Karten beginnen unter den Filtern',()=>{
 for(const [headerBottom,height] of [[350,320],[350,600],[240,320]]){
  let scrolled;
  const card={top:700,height},selectors={'.game-timeline .current-game':{getBoundingClientRect:()=>card},'body > .top':{getBoundingClientRect:()=>({bottom:140})},'.season-header':{getBoundingClientRect:()=>({bottom:headerBottom})},'.dock':{getBoundingClientRect:()=>({top:750})}};
  const c=vm.createContext({location:{hash:'#season/games'},mode:'list',cancelAnimationFrame(){},requestAnimationFrame:f=>{f();return 1;},document:{querySelector:s=>selectors[s]},window:{innerHeight:844,visualViewport:{height:820},scrollY:200,scrollTo:options=>scrolled=options}});
  load(c,'js/router.js');c.centerNextGame();
  const positionedTop=card.top+200-scrolled.top;
  assert.ok(positionedTop>=headerBottom+12);
  if(height<=750-12-headerBottom-12)assert.ok(positionedTop+height<=738);
  else assert.equal(positionedTop,headerBottom+12);
  assert.equal(scrolled.behavior,'instant');
  scrolled=null;c.location.hash='#season/table';c.centerNextGame();assert.equal(scrolled,null);
 }
});
