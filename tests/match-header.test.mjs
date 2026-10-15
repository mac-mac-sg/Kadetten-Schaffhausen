import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function harness(design='v1'){
 const {document,window:dom}=parseHTML('<html><body><header class="top"></header><main id="app"><section class="match"><div class="match-top"><a href="#season/games">Zurück</a><div class="matchup"><div class="matchup-team"><img class="crest" src="home.svg"><span>Kadetten Schaffhausen</span></div><strong>VS</strong><div class="matchup-team"><span class="clubmark">RTV</span><span>RTV 1879 Basel</span></div></div><small>Samstag · 18:00 Uhr</small></div><nav class="match-tabs"><a class="selected" href="#match/a/overview">Vorschau</a><a href="#match/a/stats">Statistiken</a></nav><div>Inhalt</div></section></main></body></html>');
 document.documentElement.dataset.design=design;
 const events=new Map(),frames=new Map();let id=0,mutate;
 const window={scrollY:0,addEventListener(type,fn){events.set(type,fn);},removeEventListener(type){events.delete(type);},scrollTo({top}){this.scrollY=top;}};
 dom.HTMLElement.prototype.getBoundingClientRect=function(){return {top:this.classList.contains('match-sticky-bar')?Math.max(92,220-window.scrollY):0};};
 const c=vm.createContext({document,window,location:{hash:'#match/a/overview'},activeClub:'kadetten',getComputedStyle:()=>({top:'92px'}),requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),MutationObserver:class{constructor(fn){mutate=fn;}observe(){}disconnect(){mutate=null;}}});
 vm.runInContext(fs.readFileSync('src/client/js/match-header.js','utf8'),c);
 const flush=()=>{for(const [key,fn] of [...frames]){frames.delete(key);fn();}};
 return {document,window,events,c,flush,run:s=>vm.runInContext(s,c),scroll:y=>{window.scrollY=y;events.get('scroll')?.();flush();},mutate:()=>mutate?.()};
}
test('The match identity starts expanded, collapses at the tabs, and expands on return',()=>{
 const a=harness();a.run('setupCollapsingMatchHeader()');a.flush();const bar=a.document.querySelector('.match-sticky-bar');assert.ok(bar);assert.equal(bar.classList.contains('is-collapsed'),false);assert.equal(a.document.querySelector('[data-match-full]').className,'match-top');assert.ok(bar.querySelector('.match-tabs'));assert.equal(bar.querySelectorAll('a[aria-label="Zurück zu den Spielen"]').length,1);assert.equal(bar.querySelector('.match-compact-names').textContent,'Kadetten – RTV 1879 Basel');assert.equal(bar.querySelector('.match-compact-detail').textContent,'Samstag · 18:00 Uhr');assert.equal(bar.querySelector('.selected').getAttribute('aria-current'),'page');
 a.scroll(250);assert.equal(bar.classList.contains('is-collapsed'),true);a.scroll(0);assert.equal(bar.classList.contains('is-collapsed'),false);
 a.c.location.hash='#home';a.document.getElementById('app').innerHTML='';a.run('setupCollapsingMatchHeader()');assert.equal(a.events.has('scroll'),false);
});
test('Live score updates reach the compact row as text without replacing its navigation',()=>{
 const a=harness();a.run('setupCollapsingMatchHeader()');a.flush();a.scroll(250);const bar=a.document.querySelector('.match-sticky-bar'),tabs=bar.querySelector('.match-tabs');a.document.querySelector('.matchup > strong').textContent='23 : 21';a.document.querySelector('.match-top > small').textContent='2. Halbzeit · 47:12';a.mutate();a.flush();assert.equal(bar.querySelector('.match-compact-detail').textContent,'23 : 21 · 2. Halbzeit · 47:12');assert.equal(bar.querySelector('.match-tabs'),tabs);assert.equal(bar.classList.contains('is-collapsed'),true);
});
test('V2 and routes outside the match centre do not receive a compact header',()=>{
 const a=harness('v2');a.run('setupCollapsingMatchHeader()');assert.equal(a.document.querySelector('.match-sticky-bar'),null);const b=harness();b.c.location.hash='#season/games';b.run('setupCollapsingMatchHeader()');assert.equal(b.document.querySelector('.match-sticky-bar'),null);
});

test('An unchanged handball live poll preserves the enhanced header and its tabs',()=>{
 const a=harness(),section=a.document.querySelector('.match'),container=a.document.createElement('div');container.id='live-detail-content';container.append(...section.childNodes);section.append(container);
 a.c.games=[{id:'a'}];a.c.liveSource=container.innerHTML;vm.runInContext(fs.readFileSync('src/client/js/live.js','utf8'),a.c);a.run('liveMatchContent=()=>liveSource;loadEhfArchive=()=>{};setupCollapsingMatchHeader()');a.flush();a.scroll(250);
 const bar=container.querySelector('.match-sticky-bar');a.run('refreshLiveViews()');assert.equal(container.querySelector('.match-sticky-bar'),bar,'An unchanged response must not rebuild the enhanced DOM');
 a.c.liveSource=a.c.liveSource.replace('>VS<','>23 : 21<');a.run('refreshLiveViews()');a.flush();assert.match(container.querySelector('.match-compact-detail').textContent,/23 : 21/);assert.equal(container.querySelectorAll('.match-sticky-bar').length,1);assert.equal(a.window.scrollY,250,'Changed live data keeps the reading position');const updated=container.querySelector('.match-sticky-bar');a.run('refreshLiveViews()');assert.equal(container.querySelector('.match-sticky-bar'),updated);
});
