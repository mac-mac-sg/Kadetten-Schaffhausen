import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function app() {
 const {document}=parseHTML(fs.readFileSync('src/client/index.html','utf8'));
 const location={href:'https://example.test/?club=kadetten#season/games',hash:'#season/games'};
 const timers=[],requests=[],history=[];
 const context=vm.createContext({document,location,URL,AbortSignal,navigator:{onLine:true},console,localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){},scrollTo(){},scrollY:0},setInterval(){},setTimeout(fn,delay){timers.push({fn,delay});return timers.length;},clearTimeout(){},clearInterval(){},requestAnimationFrame(){},cancelAnimationFrame(){},history:{replaceState(_,__,url){location.href=url;location.hash=new URL(url).hash;},pushState(_,__,url){history.push(location.href);location.href=url;location.hash=new URL(url).hash;}},apiFetch:async path=>{requests.push(path);return {ok:true,json:async()=>({ok:true,checkedAt:new Date().toISOString(),match:null,finished:null})};}});
 const scripts=[...fs.readFileSync('src/client/index.html','utf8').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(s=>(s.startsWith('js/')||s.startsWith('data/')||s==='enhancements.js')&&s!=='js/main.js');
 for(const file of scripts)vm.runInContext(fs.readFileSync('src/client/'+file,'utf8'),context,{filename:file});
 const run=code=>vm.runInContext(code,context);
 run("mode='week';swissToday=()=> '2026-10-12';render=()=>{};loadCurrentData=()=>{};checkLiveMatch=()=>{};showLiveMatch=()=>{};refreshLiveViews=()=>{};loadFcsgData=()=>{};loadFcsgLive=()=>{};");
 return {context,document,location,run,timers,requests,history};
}
const home='Kadetten Schaffhausen',otmar='TSV St. Otmar St. Gallen';
function seed(a,kadetten=[],fcsg=[],otmarGames=[]) {
 a.context.seed={kadetten,fcsg,otmar:otmarGames};
 a.run("handballSnapshots.set('kadetten',{games:seed.kadetten});handballSnapshots.set('otmar',{games:seed.otmar});fcsgData={...fcsgData,games:seed.fcsg};");
}
test('Swiss Monday-to-Sunday weeks stay correct across Sundays, DST and year boundaries',()=>{
 const a=app();
 for(const [day,expected] of [['2026-10-12','2026-10-12'],['2026-10-18','2026-10-12'],['2026-10-25','2026-10-19'],['2027-01-01','2026-12-28']])assert.equal(a.run(`weekStart('${day}',0)`),expected);
 assert.equal(a.run("shiftWeekDate(weekStart('2026-10-25',1),6)"),'2026-11-01');
});
test('All selected clubs share a chronological week; an inter-club fixture appears once with both route IDs',()=>{
 const a=app();seed(a,[{id:'own-alias',date:'2026-10-13',time:'19:00',home,away:otmar,league:'QHL'}],[{id:'587',date:'2026-10-13',time:'18:00',home:'FC St.Gallen 1879',away:'Sion',league:'Super League'}],[{id:'508',date:'2026-10-13',time:'19:00',home,away:otmar,league:'QHL'}]);
 const entries=a.run('weekFixtures()');assert.equal(entries.length,2);assert.equal(entries[0].game.id,'587');assert.equal(entries[1].references.length,2);
 const out=a.run('sharedWeekContent()');assert.match(out,/2 Spiele/);assert.match(out,/data-week-match="own-alias"/);assert.match(out,/week-club-otmar/);
 a.run("activeClub='otmar'");assert.match(a.run('sharedWeekContent()'),/data-week-match="508"/);
 a.run("selectedClubs=['fcsg']");assert.equal(a.run('weekFixtures().length'),1);assert.doesNotMatch(a.run('sharedWeekContent()'),/week-club-kadetten|week-club-otmar/);
});
test('Week boundaries exclude adjacent weeks and a quiet week jumps to the next published fixture',()=>{
 const a=app();seed(a,[{id:'before',date:'2026-10-11',home,away:'A',league:'QHL'},{id:'next',date:'2026-10-27',home,away:'B',league:'QHL'}]);
 a.document.getElementById('app').innerHTML=a.run("season('games')");a.run('bindWeekControls()');
 assert.match(a.document.querySelector('.week-empty').textContent,/spielfrei/);
 a.document.querySelector('[data-week-next]').onclick();assert.equal(a.run('weekOffset'),2);assert.match(a.run('sharedWeekContent()'),/data-week-match="next"/);
});
test('Official live and final results overlay fixture aliases without inventing missing scores; failures keep the last score',async()=>{
 const a=app();seed(a,[{id:'alias',date:'2026-10-12',home,away:'Basel',league:'QHL'}]);
 a.run("selectedClubs=['kadetten']");
 a.context.apiFetch=async()=>({ok:true,json:async()=>({ok:true,checkedAt:new Date().toISOString(),sources:{SHV:{ok:true},EHF:{ok:false}},match:{id:'official',date:'2026-10-12',home,away:'Basel',league:'QHL',status:'live',score:[13,11],clock:'25:00'}})});
 await a.run('pollWeekLive()');assert.match(a.run('sharedWeekContent()'),/13 : 11/);assert.match(a.run('sharedWeekContent()'),/data-week-match="alias"/);
 a.context.apiFetch=async()=>{throw Error('offline');};await a.run('pollWeekLive()');assert.match(a.run('sharedWeekContent()'),/13 : 11/);assert.match(a.run('sharedWeekContent()'),/Letzter verfügbarer Stand/);
 a.context.apiFetch=async()=>({ok:true,json:async()=>({ok:true,checkedAt:new Date().toISOString(),match:null,finished:{date:'2026-10-12',home,away:'Basel',league:'QHL',status:'finished',score:[25,23]}})});
 await a.run('pollWeekLive()');assert.match(a.run('sharedWeekContent()'),/25 : 23/);assert.match(a.run('sharedWeekContent()'),/Beendet/);assert.doesNotMatch(a.run('sharedWeekContent()'),/week-card-live/);
 a.run("weekLive.clear()");assert.doesNotMatch(a.run('sharedWeekContent()'),/0 : 0/);assert.match(a.run('sharedWeekContent()'),/Anspielzeit offen/);
});
test('Weekly live polling requests only selected clubs and stops outside the view or in background',async()=>{
 const a=app();a.run("selectedClubs=['fcsg','otmar']");await a.run('pollWeekLive()');assert.deepEqual(a.requests.sort(),['/api/fcsg/live','/api/otmar/live']);assert.equal(a.timers.at(-1).delay,30000);
 a.run("mode='list'");await a.run('pollWeekLive()');assert.equal(a.requests.length,2);
 a.run("mode='week';document.hidden=true");await a.run('pollWeekLive()');assert.equal(a.requests.length,2);
});
test('Cross-club opening pushes a direct match route; modifier clicks preserve native link behaviour',()=>{
 const a=app();seed(a,[],[{id:'587',date:'2026-10-13',home:'FC St.Gallen 1879',away:'Sion',league:'Super League'}]);
 a.document.getElementById('app').innerHTML=a.run("season('games')");a.run('bindWeekControls()');
 const link=a.document.querySelector('[data-week-club]');let prevented=0;
 link.onclick({button:0,ctrlKey:true,preventDefault(){prevented++;}});assert.equal(prevented,0);assert.equal(a.history.length,0);
 link.onclick({button:0,preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(a.run('activeClub'),'fcsg');assert.equal(a.location.hash,'#match/587/overview');assert.match(a.history[0],/#season\/games/);
});
test('Week cards escape source names and do not claim an unconfirmed kickoff',()=>{
 const a=app();seed(a,[],[{id:'587',date:'2026-10-13',time:'18:00',confirmed:false,home:'FC St.Gallen 1879',away:'<img onerror=alert(1)>',league:'A & B'}]);
 const html=a.run('sharedWeekContent()');assert.doesNotMatch(html,/<img onerror/);assert.match(html,/&lt;img/);assert.match(html,/Anspielzeit offen/);assert.doesNotMatch(html,/18:00 Uhr/);
});
test('Browser history restores the club and weekly route on popstate without rendering the following hashchange twice',()=>{
 const a=app(),events={};a.context.window.addEventListener=(event,handler)=>events[event]=handler;
 a.run("render=()=>{renderedRouteURL=location.href;};activeClub='fcsg';renderedRouteURL='https://example.test/?club=fcsg#match/587/overview';");
 const main=fs.readFileSync('src/client/js/main.js','utf8'),start=main.indexOf('function handleRouteChange()'),end=main.indexOf('\nrender();',start);
 vm.runInContext(main.slice(start,end),a.context);
 assert.ok(events.popstate);assert.ok(events.hashchange);
 events.popstate();assert.equal(a.run('activeClub'),'kadetten');assert.equal(a.location.hash,'#season/games');assert.equal(a.run('renderedRouteURL'),a.location.href);
 a.run("render=()=>{throw Error('Duplicate render');}");assert.doesNotThrow(()=>events.hashchange());
});
