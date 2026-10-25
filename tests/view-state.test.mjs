import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function harness(){
 const {document}=parseHTML('<html><body><main id="app"></main></body></html>');
 let frame=0;const frames=new Map(),window={scrollY:0,scrollTo({top}){this.scrollY=top;}};
 const c=vm.createContext({document,window,location:{hash:'#home'},activeClub:'kadetten',mode:'list',competition:'Alle',month:9,calendarYear:2026,tableLeague:'QHL',initialCalendarDate:[2026,10,15],clubHeaderOffset:()=>80,requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame;},cancelAnimationFrame:id=>frames.delete(id),handballSnapshots:new Map([['kadetten',{stories:[]}]]),stories:[],fcsgData:{stories:[]},render(){}});
 vm.runInContext(fs.readFileSync('src/client/js/view-state.js','utf8'),c);
 const run=s=>vm.runInContext(s,c),visit=(route,club)=>{c.location.hash=route;if(club)c.activeClub=club;run('var memory=beginViewRender();finishViewRender(memory)');for(const [id,fn] of frames){frames.delete(id);fn();}};
 return {document,window,c,run,visit};
}
test('Returning from details or another club restores independent reading positions and club preferences',()=>{
 const a=harness();a.visit('#home');a.window.scrollY=640;a.visit('#news/a');assert.equal(a.window.scrollY,0);a.window.scrollY=920;a.visit('#home');assert.equal(a.window.scrollY,640);
 a.visit('#home','fcsg');assert.equal(a.window.scrollY,0);a.window.scrollY=230;a.visit('#home','kadetten');assert.equal(a.window.scrollY,640);a.visit('#news/a');assert.equal(a.window.scrollY,920);
 a.visit('#season/games');a.run("mode='calendar';competition='QHL';month=11;calendarYear=2026");a.visit('#season/games');a.visit('#season/table');a.visit('#season/games','fcsg');assert.equal(a.run('mode'),'list');assert.equal(a.run('competition'),'Alle');
 a.visit('#season/games','kadetten');assert.equal(a.run('mode'),'calendar');assert.equal(a.run('competition'),'QHL');assert.equal(a.run('month'),11);
});
test('Calendar and list filters have separate positions; first visits have no saved position',()=>{
 const a=harness();a.visit('#season/games');assert.equal(a.run('memory.position'),undefined);a.window.scrollY=500;
 a.run("mode='calendar'");a.visit('#season/games');a.window.scrollY=0;a.run("mode='list'");a.visit('#season/games');assert.equal(a.window.scrollY,500);
 a.run("competition='QHL'");a.visit('#season/games');assert.equal(a.window.scrollY,0);a.window.scrollY=300;a.run("competition='Alle'");a.visit('#season/games');assert.equal(a.window.scrollY,500);
});
test('Incoming news stays out of a reader’s visible list until consumed; V2 remains immediate',()=>{
 const a=harness();a.window.scrollY=600;a.run("stories=[{id:'old'}];var incoming=[{id:'new'},{id:'old'}];var visible=deferUpdatedStories('kadetten',incoming,stories)");assert.equal(a.run('visible[0].id'),'old');assert.ok(a.document.getElementById('new-stories'));
 a.run('applyPendingNews()');assert.equal(a.run('stories[0].id'),'new');assert.equal(a.run("handballSnapshots.get('kadetten').stories[0].id"),'new');assert.equal(a.document.getElementById('new-stories'),null);
 a.document.documentElement.dataset.design='v2';a.run("visible=deferUpdatedStories('kadetten',[{id:'v2'}],stories)");assert.equal(a.run('visible[0].id'),'v2');assert.equal(a.document.getElementById('new-stories'),null);
});
test('V2 home starts at the same header position after switching clubs, while details retain reading position',()=>{
 const a=harness();a.document.documentElement.dataset.preview='v2';
 a.visit('#home');a.window.scrollY=40;a.visit('#home','fcsg');a.window.scrollY=90;
 a.visit('#home','otmar');a.window.scrollY=130;a.visit('#home','kadetten');assert.equal(a.window.scrollY,0);
 a.window.scrollY=260;a.visit('#news/a');a.visit('#home');assert.equal(a.window.scrollY,260);
 a.visit('#home','fcsg');assert.equal(a.window.scrollY,0);
 a.visit('#home','otmar');assert.equal(a.window.scrollY,0);
});
