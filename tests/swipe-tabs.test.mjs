import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const source=fs.readFileSync('src/client/js/router.js','utf8');
function harness(route='#home',design='v1',preview=''){
 const {document,window:dom}=parseHTML('<html><body><main id="app"><a href="#news/article"><span id="content">Inhalt</span></a><button id="control">Filter</button><div class="calendar-panel" id="calendar">Kalender</div><div id="scroll" style="overflow-x:auto">Tabelle</div></main><div id="compact-club-menu" hidden></div></body></html>');
 document.documentElement.dataset.design=design;document.documentElement.dataset.preview=preview;
 let url=new URL('https://example.test/?club=otmar'+route),now=1000,reduced=false;
 const events={},location={get href(){return url.href;},get hash(){return url.hash;},set hash(v){url.hash=v;}};
 const window={innerWidth:390,addEventListener:(type,fn)=>{events[type]=fn;},matchMedia:()=>({matches:reduced}),getSelection:()=>({isCollapsed:true})};
 const app=document.getElementById('app');
 const pagerEvents=[];
 const pager={begin:route=>{pagerEvents.push(['begin',route]);return true;},move:dx=>pagerEvents.push(['move',dx]),finish:next=>{pagerEvents.push(['finish',next]);return true;},cancel:()=>pagerEvents.push(['cancel']),routeChanged:()=>pagerEvents.push(['route'])};
 const context=vm.createContext({createPagerStub:()=>pager,document,window,location,mode:'calendar',competition:'QHL',Date:{now:()=>now},getComputedStyle:e=>({overflowX:e.style.overflowX||'visible',position:e.style.position||'static'})});
 vm.runInContext(source,context);vm.runInContext('createMainTabPager=createPagerStub;setupMainTabSwipe()',context);
 const touch=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
 const emit=(type,target,x=220,y=200,{touches,changedTouches,cancelable=true}={})=>{
  const e=new dom.Event(type,{bubbles:true,cancelable});Object.assign(e,{touches:touches??(type==='touchend'?[]:[touch(x,y)]),changedTouches:changedTouches??[touch(x,y)]});target.dispatchEvent(e);return e;
 };
 const swipe=(dx=-120,dy=0,target=document.getElementById('content'),x=220)=>{emit('touchstart',target,x,200);emit('touchmove',target,x+dx,200+dy);return emit('touchend',target,x+dx,200+dy);};
 return {document,window,context,location,events,pagerEvents,emit,swipe,touch,app,setTime:v=>now=v,setReduced:v=>reduced=v};
}
test('Swipes follow the four main tabs in both directions and stop at the ends',()=>{
 for(const [route,dx,expected] of [['#home',-120,'#season/games'],['#season/games',-120,'#season/table'],['#season/table',-120,'#season/squad'],['#season/squad',120,'#season/table'],['#season/table',120,'#season/games'],['#season/games',120,'#home'],['#home',120,'#home'],['#season/squad',-120,'#season/squad']]){
  const a=harness(route);const e=a.swipe(dx);assert.equal(a.location.hash,expected);assert.ok(e.defaultPrevented);assert.match(a.location.href,/club=otmar/);
  if(expected==='#season/games'&&route!==expected){assert.equal(a.context.mode,'calendar');assert.equal(a.context.competition,'QHL');}
 }
});
test('Vertical, diagonal, short, cancelled and multi-touch gestures do not navigate',()=>{
 for(const [dx,dy] of [[10,150],[-40,0],[-100,90],[-120,60]]){const a=harness();a.swipe(dx,dy);assert.equal(a.location.hash,'#home');}
 for(const kind of ['cancel','multi','vertical-first','route-change','detached']){
  const a=harness(),target=a.document.getElementById('content');a.emit('touchstart',target);
  if(kind==='cancel')a.emit('touchcancel',target);
  if(kind==='multi')a.emit('touchmove',target,100,200,{touches:[a.touch(100,200),a.touch(200,200,2)]});
  if(kind==='vertical-first')a.emit('touchmove',target,220,230);
  if(kind==='route-change')a.location.hash='#season/table';
  if(kind==='detached')target.remove();
  a.emit('touchend',kind==='detached'?a.app:target,100,200);
  assert.equal(a.location.hash,kind==='route-change'?'#season/table':'#home',kind);
 }
});
test('Controls, calendars, horizontal scrollers, dialogs, edge gestures and details retain their own input',()=>{
 for(const id of ['control','calendar','scroll']){const a=harness(),target=a.document.getElementById(id);if(id==='scroll'){Object.defineProperties(target,{scrollWidth:{value:600},clientWidth:{value:200}});}a.swipe(-120,0,target);assert.equal(a.location.hash,'#home',id);}
 for(const x of [10,380]){const a=harness();a.swipe(x<100?120:-120,0,undefined,x);assert.equal(a.location.hash,'#home');}
 for(const route of ['#news/article','#match/test/stats','#player/6','#club']){const a=harness(route);a.swipe();assert.equal(a.location.hash,route);}
 for(const type of ['dialog','menu','selection']){const a=harness();if(type==='dialog'){const d=a.document.createElement('dialog');d.setAttribute('open','');a.document.body.append(d);}if(type==='menu')a.document.getElementById('compact-club-menu').removeAttribute('hidden');if(type==='selection')a.window.getSelection=()=>({isCollapsed:false});a.swipe();assert.equal(a.location.hash,'#home',type);}
 const v2=harness('#home','v2');v2.swipe();assert.equal(v2.location.hash,'#home');
});
test('Horizontal movement drives the pager before release and short drags return without navigation',()=>{
 const a=harness(),target=a.document.getElementById('content');
 a.emit('touchstart',target);a.emit('touchmove',target,180,200);
 assert.equal(a.location.hash,'#home');assert.deepEqual(a.pagerEvents,[['begin','#home'],['move',-40]]);
 a.emit('touchend',target,180,200);assert.equal(a.location.hash,'#home');assert.deepEqual(a.pagerEvents.at(-2),['finish',null]);
 const b=harness(),t=b.document.getElementById('content');b.emit('touchstart',t);b.setTime(4000);b.emit('touchmove',t,100,200);b.emit('touchend',t,100,200);assert.equal(b.location.hash,'#season/games','A deliberate slow drag can complete');
});


test('Swipe preview documents retain the active layout identity, theme and shared-calendar mode',()=>{
 const {document}=parseHTML('<html data-preview="v2" data-home-title="modern" data-club-layout="modern" data-theme="light"><head><link rel="stylesheet" href="app.css"></head><body class="games-mode calendar-mode"><main id="app"><h1>Spiele</h1></main></body></html>');
 let scheduled;
 const context=vm.createContext({document,location:{hash:'#season/games',href:'https://example.test/v2/#season/games'},activeClub:'otmar',window:{innerWidth:390,innerHeight:844,addEventListener(){},matchMedia:()=>({matches:false})},getComputedStyle:()=>({getPropertyValue:()=> '68px'}),setTimeout(fn){scheduled=fn;},clearTimeout(){},liveEscape:v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;'),rememberedView:()=>({options:{mode:'week'},position:null})});
 vm.runInContext(source,context);vm.runInContext("mainTabPreviewMarkup=()=>'<h1>Vorschau</h1>';createMainTabPager(document.getElementById('app'))",context);scheduled();
 const frames=[...document.querySelectorAll('.main-tab-pager iframe')];assert.equal(frames.length,3);
 for(const frame of frames){
  const preview=parseHTML(frame.srcdoc).document;
  for(const key of ['preview','homeTitle','clubLayout','theme'])assert.equal(preview.documentElement.dataset[key],document.documentElement.dataset[key]);
  assert.equal(preview.documentElement.dataset.club,'otmar');
  assert.ok(preview.querySelector('link[href="app.css"]'));assert.equal(preview.querySelectorAll('script').length,0);
 }
 assert.ok(parseHTML(frames[1].srcdoc).document.body.classList.contains('calendar-mode'));
});


test('V2 treats Verein as a fifth main tab with its own active state and swipe boundaries',()=>{
 for(const [route,dx,expected] of [['#season/squad',-120,'#club'],['#club',120,'#season/squad'],['#club',-120,'#club']]){
  const a=harness(route,'v1','v2');a.swipe(dx);assert.equal(a.location.hash,expected);
 }
 const v2=harness('#club','v1','v2');assert.equal(v2.context.mainNavigationKey('club'),'club');assert.equal(v2.context.mainNavigationKey('player'),'squad');
 const v1=harness('#club');assert.equal(v1.context.mainNavigationKey('club'),'squad');
});

test('V2 club swipe previews render the selected club archive instead of the season view',()=>{
 const a=harness('#season/squad','v1','v2');
 Object.assign(a.context,{activeClub:'kadetten',viewOptions:()=>({}),rememberedView:()=>({options:{}}),applyViewOptions:()=>{},clubPage:()=>'<h1>Unsere Geschichte</h1>',fcsgClubPage:()=>'<h1>Grün-Weisse Geschichte</h1>',v2DecorateForwardLinks:()=>{}});
 assert.match(a.context.mainTabPreviewMarkup('#club'),/Unsere Geschichte/);
 a.context.activeClub='fcsg';assert.match(a.context.mainTabPreviewMarkup('#club'),/Grün-Weisse Geschichte/);
});
