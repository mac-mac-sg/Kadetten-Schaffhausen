import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function app() {
 const {document}=parseHTML('<html><body></body></html>');
 const noop=()=>{};
 const context=vm.createContext({document,location:{hash:'#home'},navigator:{onLine:true},window:{addEventListener:noop,scrollTo:noop},localStorage:{getItem:()=>null,setItem:noop},setInterval:()=>0,setTimeout:()=>0,clearInterval:noop,clearTimeout:noop,requestAnimationFrame:noop,cancelAnimationFrame:noop,console,apiFetch:()=>Promise.reject(Error('offline'))});
 const html=fs.readFileSync('src/client/index.html','utf8');
 for(const [,file] of html.matchAll(/<script src="([^"?]+)/g))if((file.startsWith('data/')||file.startsWith('js/')||file==='enhancements.js')&&file!=='js/main.js')vm.runInContext(fs.readFileSync('src/client/'+file,'utf8'),context,{filename:file});
 vm.runInContext(fs.readFileSync('src/client/v2/design.js','utf8'),context);
 const run=code=>vm.runInContext(code,context);run.context=context;return run;
}
test('V2 renders all club news and accessible discovery links without placeholder values',()=>{
 const run=app();
 for(const club of ['kadetten','fcsg','otmar']) {
  const html=run(`activeClub='${club}';v2Home()`);
  assert.doesNotMatch(html,/undefined|NaN|\[object /);
  const {document}=parseHTML(html);
  assert.equal(document.querySelectorAll('h1').length,1);
  assert.ok(document.querySelector('a[href="#club"]'));
  assert.ok(document.querySelector('.home-matchday'));
  assert.ok(document.querySelector('.v2-discover-main'));
 }
});
test('V2 future fixtures contain independently expandable preview, form, figures and venue',()=>{
 const run=app();
 const html=run("matchOverview(games.find(g=>!g.score))");
 const {document}=parseHTML(html);
 assert.equal(document.querySelectorAll('details.v2-layer').length,4);
 assert.equal(document.querySelectorAll('details[open]').length,1);
 assert.ok(document.querySelector('[data-match-preview]'));
 assert.equal(document.querySelectorAll('h1').length,1);
 assert.doesNotMatch(html,/undefined|NaN/);
});
test('Original source shell does not load experimental design',()=>{
 const html=fs.readFileSync('src/client/index.html','utf8');
 assert.doesNotMatch(html,/v2\/design/);
});

test('Classic V2 home restores large news and discovery after the complete feed',()=>{
 const run=app();
 for(const club of ['kadetten','fcsg','otmar']) {
  const html=run(`activeClub='${club}';v2Home()`);const {document}=parseHTML(html);
  const count=run("activeClub==='fcsg'?fcsgData.stories.length:stories.length");
  assert.ok(document.querySelector('.v2-home-classic'));
  assert.equal(document.querySelectorAll('.v2-story').length,count);
  for(let index=0;index<count;index++)assert.equal(document.querySelectorAll('#story-'+index).length,1);
  assert.equal(document.querySelector('.v2-story-compact'),null);
  assert.equal(document.querySelector('.v2-news-briefs'),null);
  assert.equal(document.querySelectorAll('[data-v2-reveal]').length,0);
  assert.equal(document.querySelector('.story-feed .v2-discover'),null);
  assert.ok(document.querySelector('.v2-news-grid'));
  assert.ok(document.querySelector('.home-news > .v2-discover'));
 }
});
test('Compact chrome appears only beyond the original header and changes surface after the hero',()=>{
 const run=app(), observers=[];
 run.context.IntersectionObserver=class {constructor(fn,options){this.fn=fn;this.options=options;observers.push(this);}observe(){}disconnect(){}};
 const doc=run.context.document;
 run("location.hash='#club'");
 doc.body.innerHTML='<header class="top"><a class="brand" href="#home">Verein</a></header><main><div class="club-intro"></div></main>';
 run('v2SetupScrollChrome()');
 const bar=doc.querySelector('.v2-scrollbar');assert.ok(bar.hidden);
 observers[0].fn([{isIntersecting:false}]);assert.equal(bar.hidden,false);
 observers[1].fn([{boundingClientRect:{bottom:10}}]);assert.equal(bar.dataset.surface,'content');
 observers[1].fn([{boundingClientRect:{bottom:300}}]);assert.equal(bar.dataset.surface,'photo');
 observers[0].fn([{isIntersecting:true}]);assert.equal(bar.hidden,true);
 for(const route of ['#home','#season/games']){run(`location.hash='${route}';v2SetupScrollChrome()`);assert.equal(doc.querySelector('.v2-scrollbar'),null);}
});
test('Editorial reveal skips reduced motion and never observes match or statistic elements',()=>{
 const run=app(), observed=[];
 run.context.IntersectionObserver=class {constructor(fn){this.fn=fn;}observe(el){observed.push(el);}disconnect(){}unobserve(){}};
 const doc=run.context.document;
 doc.body.innerHTML='<article data-v2-reveal="one"></article><section class="home-matchday"></section><section class="stat-facts"></section>';
 doc.querySelector('article').getBoundingClientRect=()=>({top:1000});run.context.window.innerHeight=844;
 run.context.matchMedia=()=>({matches:true});run('v2SetupReveals()');assert.equal(observed.length,0);
 run.context.matchMedia=()=>({matches:false});run('v2SetupReveals()');assert.equal(observed.length,1);
 assert.equal(observed[0],doc.querySelector('article'));
});

test('V2 compact header creates accessible controls once and hides the old picker',()=>{
 const run=app(),doc=run.context.document;
 doc.body.innerHTML='<header class="top"><a class="brand" href="#home">Kadetten</a><button id="club-settings" hidden></button><nav id="club-switch"></nav></header>';
 run('v2SetupHeader();v2SetupHeader()');
 assert.equal(doc.querySelectorAll('[data-v2-choose]').length,1);
 assert.equal(doc.querySelectorAll('[data-v2-theme]').length,1);
 assert.equal(doc.querySelector('#club-settings').hidden,false);
 assert.equal(doc.querySelector('#club-switch').hidden,true);
 assert.equal(doc.querySelector('[data-v2-choose]').getAttribute('aria-haspopup'),'dialog');
 assert.equal(doc.querySelector('.v2-test-tools'),null);
});
test('V2 match hierarchy handles preview, unknown time, live and result without invented values',()=>{
 const run=app();
 for(const club of ['kadetten','fcsg','otmar']) {
  run(`activeClub='${club}'`);
  const home=club==='fcsg'?'FC St.Gallen 1879':club==='otmar'?'TSV St. Otmar St. Gallen':'Kadetten Schaffhausen';
  const game={id:'test',date:'2030-10-14',time:'19:15',confirmed:true,league:'Liga',home,away:'Gast <script>',homeLogo:'',awayLogo:''};
  run.context.matchFixture=game;
  let {document}=parseHTML(run('v2MatchContents(matchFixture)'));
  assert.equal(document.querySelector('.v2-match-centre strong').textContent,'19:15');
  assert.equal(document.querySelectorAll('.live-score > span').length,2);
  assert.equal(document.querySelector('script'),null);
  assert.match(document.querySelector('.v2-match-context').textContent,/Heimspiel/);
  run.context.matchFixture={...game,time:'',confirmed:false};
  ({document}=parseHTML(run('v2MatchContents(matchFixture)')));
  assert.equal(document.querySelector('.v2-match-centre strong').textContent,'Zeit offen');
  run.context.matchFixture={...game,live:true,score:[24,21],liveScore:[2,1],phase:'2. Halbzeit',clock:'42′'};
  ({document}=parseHTML(run('v2MatchContents(matchFixture,true)')));
  assert.equal(document.querySelector('[data-v2-score]').textContent,club==='fcsg'?'2 : 1':'24 : 21');
  run.context.matchFixture={...game,score:[3,1]};
  ({document}=parseHTML(run('v2MatchContents(matchFixture)')));
  assert.equal(document.querySelector('[data-v2-score]').textContent,'3 : 1');
  assert.match(document.querySelector('.v2-match-context').textContent,/Sieg · Endresultat/);
 }
});
test('V2 action layer follows the real card route, live/result state and visibility',()=>{
 const run=app(),doc=run.context.document;
 doc.body.innerHTML='<section class="home-matchday"><a class="live-match match-preview" href="#match/real/overview"></a></section>';
 run('v2SyncMatchAction()');const action=doc.querySelector('.v2-match-action');
 assert.equal(action.getAttribute('href'),'#match/real/overview');assert.match(action.textContent,/Spielvorschau/);
 const card=doc.querySelector('.live-match');card.classList.add('is-live');card.setAttribute('href','#match/real/ticker');
 run('v2SyncMatchAction()');assert.match(action.textContent,/Live verfolgen/);assert.equal(action.getAttribute('href'),'#match/real/ticker');
 card.classList.remove('is-live');card.classList.add('matchday-loss');run('v2SyncMatchAction()');assert.match(action.textContent,/Spielrückblick/);
 card.hidden=true;run('v2SyncMatchAction()');assert.equal(action.hidden,true);
});
test('V2 countdown is compact and never turns an elapsed kickoff into a live claim',()=>{
 const run=app();
 run("countdownText=()=> 'Anpfiff in 01:00:00'");assert.equal(run("v2CountdownValue({time:'19:15'})"),'60:00');
 run("countdownText=()=> 'Anpfiff in 05:09'");assert.equal(run("v2CountdownValue({time:'19:15'})"),'05:09');
 run("countdownText=()=> 'Anspielzeit erreicht · Live-Status wird geprüft'");assert.equal(run("v2CountdownValue({time:'19:15'})"),'19:15');
});
