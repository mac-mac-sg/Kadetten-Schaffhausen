import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
test('Shared design preserves unrelated renderers and leaves preview identity to the shell',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const original=()=> 'shared V1';
 const context=vm.createContext({document,home:original,fcsgHome:original,matchOverview:original,setupViews:original,clubPage:original,fcsgClubPage:original,squad:original,fcsgSquad:original});
 vm.runInContext(fs.readFileSync('src/client/js/club-design.js','utf8'),context);
 assert.equal(document.documentElement.dataset.clubLayout,'modern');
 assert.equal(document.documentElement.dataset.preview,undefined);
 assert.equal(document.documentElement.dataset.design,undefined);
 for(const name of ['home','fcsgHome','matchOverview','setupViews'])assert.equal(context[name],original,name);
 assert.match(fs.readFileSync('src/client/club-design.css','utf8'),/html\[data-club-layout='modern'\]/);
});
test('Production shell loads the approved shared design before main',()=>{
 const html=fs.readFileSync('src/client/index.html','utf8');
 assert.match(html,/data-club-layout="modern"/);
 assert.match(html,/href="club-design.css"/);
 assert.ok(html.indexOf('src="js/club-design.js"')<html.indexOf('src="js/main.js"'));
 assert.doesNotMatch(html,/data-preview="v2"/);
});
test('V2 separates the roster from the club archive while V1 keeps its club entry',()=>{
 const {document}=parseHTML('<html><body></body></html>'),noop=()=>{},fake=()=>({classList:{toggle:noop,add:noop,remove:noop},style:{},dataset:{},setAttribute:noop});
 const context=vm.createContext({document:{hidden:false,createElement:tag=>document.createElement(tag),createTextNode:t=>document.createTextNode(t),body:fake(),documentElement:fake(),querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:noop},location:{hash:'#season/squad',href:'https://example.test/v2/'},navigator:{onLine:true},window:{addEventListener:noop,scrollTo:noop},localStorage:{getItem:()=>null,setItem:noop},setInterval:()=>0,setTimeout:()=>0,clearTimeout:noop,clearInterval:noop,requestAnimationFrame:noop,cancelAnimationFrame:noop,fetch:()=>Promise.reject(Error('offline')),apiFetch:()=>Promise.reject(Error('offline')),console});
 context.document.documentElement.dataset.preview='v2';
 const scripts=[...fs.readFileSync('src/client/index.html','utf8').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(s=>(s.startsWith('js/')||s.startsWith('data/')||s==='enhancements.js')&&s!=='js/main.js'&&s!=='js/club-design.js');
 for(const file of scripts)vm.runInContext(fs.readFileSync('src/client/'+file,'utf8'),context,{filename:file});
 const run=code=>vm.runInContext(code,context),parse=html=>{const root=document.createElement('div');root.innerHTML=html;return root;};
 const baseline={};
 for(const club of ['kadetten','fcsg','otmar']){run(`activeClub='${club}'`);baseline[club]={roster:parse(run(club==='fcsg'?'fcsgSquad()':'squad()')),page:parse(run(club==='fcsg'?'fcsgClubPage()':'clubPage()'))};}
 vm.runInContext(fs.readFileSync('src/client/js/club-design.js','utf8'),context);
 for(const club of ['kadetten','fcsg','otmar']){
  run(`activeClub='${club}'`);
  const roster=parse(run(club==='fcsg'?'fcsgSquad()':'squad()')),entry=roster.querySelector('.v2-club-entry'),page=parse(run(club==='fcsg'?'fcsgClubPage()':'clubPage()'));
  assert.equal(entry,null);assert.equal(roster.querySelectorAll('.player-card').length,baseline[club].roster.querySelectorAll('.player-card').length);
  assert.equal(page.querySelector('.club-topline'),null);
  context.document.documentElement.dataset.preview='';
  const v1Roster=parse(run(club==='fcsg'?'fcsgSquad()':'squad()'));
  assert.equal(v1Roster.firstElementChild.className,'v2-club-entry');
  context.document.documentElement.dataset.preview='v2';
  assert.equal(page.querySelectorAll('h1').length,1);assert.equal(page.querySelectorAll('.v2-club-curve').length,1);assert.equal(page.querySelectorAll('.club-intro').length,0);assert.equal(page.querySelector('h1').textContent,run('v2ClubIdentity().name'));
  for(const selector of ['.club-cabinet','.club-history','.club-credits']){
   const original=baseline[club].page.querySelector(selector).cloneNode(true),updated=page.querySelector(selector).cloneNode(true);
   original.querySelectorAll('.club-next a[href="#season/squad"]').forEach(link=>{link.setAttribute('href','#home');link.textContent='Zum Magazin';});
   original.querySelector('h2')?.remove();updated.querySelector('h2')?.remove();assert.equal(updated.innerHTML,original.innerHTML,club+' preserves '+selector);
  }
  assert.equal(page.querySelector('.v2-club-hero-media img').getAttribute('src'),baseline[club].page.querySelector('.club-intro-photo').getAttribute('src'));
  assert.equal(page.querySelector('.v2-club-hero-media figcaption').textContent,baseline[club].page.querySelector('.club-intro-caption').textContent);
 }
});
test('V2 rounds the dynamic PDF arrow once without changing its link or adding a control',()=>{
 const {document}=parseHTML('<html><body><div class="programme-tools"><a href="https://example.test/match.pdf" target="_blank" rel="noopener noreferrer">PDF extern öffnen ↗</a></div><a class="back-link" href="#home">← Zurück</a></body></html>');
 const original=()=>'',context=vm.createContext({document,squad:original,fcsgSquad:original,clubPage:original,fcsgClubPage:original});
 vm.runInContext(fs.readFileSync('src/client/js/club-design.js','utf8'),context);
 context.v2DecorateForwardLinks(document.body);context.v2DecorateForwardLinks(document.body);
 const link=document.querySelector('.programme-tools a');
 assert.equal(link.getAttribute('href'),'https://example.test/match.pdf');assert.equal(link.getAttribute('target'),'_blank');assert.equal(link.getAttribute('rel'),'noopener noreferrer');
 assert.equal(link.firstChild.textContent,'PDF extern öffnen');assert.equal(link.querySelectorAll('.v2-forward-arrow').length,1);assert.equal(link.querySelector('.v2-forward-arrow').getAttribute('aria-hidden'),'true');assert.equal(link.querySelectorAll('a,button').length,0);
 assert.equal(document.querySelector('.back-link').innerHTML,'← Zurück');
});
test('Shared news arrows follow the title in DOM order and keep one shared diagonal SVG',()=>{
 const {document}=parseHTML('<html><body><a class="v1-news-link" href="#news/test" aria-labelledby="title"><div class="v1-news-copy"><p>20.10.2026</p><h2 id="title"><span>Ein sehr langer Titel mit mehreren Zeilen</span><span class="v1-news-arrow" aria-hidden="true"><svg></svg></span></h2></div></a><a class="v1-match-action" href="#match/test"><span>Spielvorschau</span><svg aria-hidden="true"></svg></a><button class="club-text-button" data-club-jump="club-history-test">Diesen Moment entdecken <span aria-hidden="true">↗</span></button></body></html>');
 const original=()=>'',context=vm.createContext({document,squad:original,fcsgSquad:original,clubPage:original,fcsgClubPage:original});
 vm.runInContext(fs.readFileSync('src/client/js/club-design.js','utf8'),context);
 context.v2DecorateForwardLinks(document.body);context.v2DecorateForwardLinks(document.body);
 const meta=document.querySelector('.v2-news-meta');assert.equal(document.querySelectorAll('.v2-news-meta').length,1);assert.equal(meta.querySelector('p').textContent,'20.10.2026');assert.equal(meta.querySelectorAll('.v1-news-arrow').length,0);assert.equal(document.querySelector('.v1-news-copy').lastElementChild.className,'v1-news-arrow');assert.equal(document.querySelector('h2').textContent,'Ein sehr langer Titel mit mehreren Zeilen');assert.equal(document.querySelector('.v1-news-link').getAttribute('aria-labelledby'),'title');
 assert.equal(document.querySelector('.v1-match-action').getAttribute('href'),'#match/test');assert.equal(document.querySelector('.v1-match-action > span').textContent,'Spielvorschau');assert.equal(document.querySelectorAll('.v1-match-action .v2-forward-arrow').length,1);
 const icons=document.querySelectorAll('.v2-arrow-glyph');assert.equal(icons.length,3);for(const icon of icons)assert.equal(icon.querySelector('path').getAttribute('d'),'M7 17 17 7M7 7h10v10');
});
