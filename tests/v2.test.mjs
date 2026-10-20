import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
test('V2 keeps unrelated V1 renderers and the independent preview identity',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const original=()=> 'shared V1';
 const context=vm.createContext({document,home:original,fcsgHome:original,matchOverview:original,setupViews:original,clubPage:original,fcsgClubPage:original,squad:original,fcsgSquad:original});
 vm.runInContext(fs.readFileSync('src/client/v2/design.js','utf8'),context);
 assert.equal(document.documentElement.dataset.preview,'v2');
 assert.equal(document.documentElement.dataset.design,undefined);
 for(const name of ['home','fcsgHome','matchOverview','setupViews'])assert.equal(context[name],original,name);
 assert.match(fs.readFileSync('src/client/v2/design.css','utf8'),/html\[data-preview='v2'\]/);
});
test('Original source shell does not load experimental design',()=>{
 assert.doesNotMatch(fs.readFileSync('src/client/index.html','utf8'),/v2\/design/);
});
test('V2 club entry is one whole link before every player group and preserves the full club archive',()=>{
 const {document}=parseHTML('<html><body></body></html>'),noop=()=>{},fake=()=>({classList:{toggle:noop,add:noop,remove:noop},style:{},dataset:{},setAttribute:noop});
 const context=vm.createContext({document:{hidden:false,createElement:tag=>document.createElement(tag),createTextNode:t=>document.createTextNode(t),body:fake(),documentElement:fake(),querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:noop},location:{hash:'#season/squad',href:'https://example.test/v2/'},navigator:{onLine:true},window:{addEventListener:noop,scrollTo:noop},localStorage:{getItem:()=>null,setItem:noop},setInterval:()=>0,setTimeout:()=>0,clearTimeout:noop,clearInterval:noop,requestAnimationFrame:noop,cancelAnimationFrame:noop,fetch:()=>Promise.reject(Error('offline')),apiFetch:()=>Promise.reject(Error('offline')),console});
 const scripts=[...fs.readFileSync('src/client/index.html','utf8').matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(s=>(s.startsWith('js/')||s.startsWith('data/')||s==='enhancements.js')&&s!=='js/main.js');
 for(const file of scripts)vm.runInContext(fs.readFileSync('src/client/'+file,'utf8'),context,{filename:file});
 const run=code=>vm.runInContext(code,context),parse=html=>{const root=document.createElement('div');root.innerHTML=html;return root;};
 const baseline={};
 for(const club of ['kadetten','fcsg','otmar']){run(`activeClub='${club}'`);baseline[club]={roster:parse(run(club==='fcsg'?'fcsgSquad()':'squad()')),page:parse(run(club==='fcsg'?'fcsgClubPage()':'clubPage()'))};}
 vm.runInContext(fs.readFileSync('src/client/v2/design.js','utf8'),context);
 for(const club of ['kadetten','fcsg','otmar']){
  run(`activeClub='${club}'`);
  const roster=parse(run(club==='fcsg'?'fcsgSquad()':'squad()')),entry=roster.querySelector('.v2-club-entry'),page=parse(run(club==='fcsg'?'fcsgClubPage()':'clubPage()'));
  assert.equal(roster.firstElementChild,entry);assert.equal(entry.tagName,'A');assert.equal(entry.getAttribute('href'),'#club');assert.equal(entry.querySelectorAll('a,button').length,0);assert.equal(entry.querySelector('h2').textContent,'Unser Verein');assert.equal(roster.querySelectorAll('.player-card').length,baseline[club].roster.querySelectorAll('.player-card').length);
  assert.equal(page.querySelectorAll('h1').length,1);assert.equal(page.querySelectorAll('.v2-club-curve').length,1);assert.equal(page.querySelectorAll('.club-intro').length,0);assert.equal(page.querySelector('h1').textContent,run('v2ClubIdentity().name'));
  for(const selector of ['.club-cabinet','.club-history','.club-credits']){
   const original=baseline[club].page.querySelector(selector).cloneNode(true),updated=page.querySelector(selector).cloneNode(true);
   original.querySelector('h2')?.remove();updated.querySelector('h2')?.remove();assert.equal(updated.innerHTML,original.innerHTML,club+' preserves '+selector);
  }
  assert.equal(page.querySelector('.v2-club-hero-media img').getAttribute('src'),baseline[club].page.querySelector('.club-intro-photo').getAttribute('src'));
  assert.equal(page.querySelector('.v2-club-hero-media figcaption').textContent,baseline[club].page.querySelector('.club-intro-caption').textContent);
 }
});
test('V2 rounds the dynamic PDF arrow once without changing its link or adding a control',()=>{
 const {document}=parseHTML('<html><body><div class="programme-tools"><a href="https://example.test/match.pdf" target="_blank" rel="noopener noreferrer">PDF extern öffnen ↗</a></div><a class="back-link" href="#home">← Zurück</a></body></html>');
 const original=()=>'',context=vm.createContext({document,squad:original,fcsgSquad:original,clubPage:original,fcsgClubPage:original});
 vm.runInContext(fs.readFileSync('src/client/v2/design.js','utf8'),context);
 context.v2DecorateForwardLinks(document.body);context.v2DecorateForwardLinks(document.body);
 const link=document.querySelector('.programme-tools a');
 assert.equal(link.getAttribute('href'),'https://example.test/match.pdf');assert.equal(link.getAttribute('target'),'_blank');assert.equal(link.getAttribute('rel'),'noopener noreferrer');
 assert.equal(link.firstChild.textContent,'PDF extern öffnen');assert.equal(link.querySelectorAll('.v2-forward-arrow').length,1);assert.equal(link.querySelector('.v2-forward-arrow').getAttribute('aria-hidden'),'true');assert.equal(link.querySelectorAll('a,button').length,0);
 assert.equal(document.querySelector('.back-link').innerHTML,'← Zurück');
});
