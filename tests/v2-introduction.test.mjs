import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function introduction(preview){
 const {document}=parseHTML('<html><body><button id="install-app"></button></body></html>');
 if(preview)document.documentElement.dataset.preview='v2';
 const create=document.createElement.bind(document);
 document.createElement=tag=>{const e=create(tag);if(tag==='dialog'){e.showModal=()=>e.setAttribute('open','');e.close=()=>e.removeAttribute('open');}return e;};
 const context=vm.createContext({document,window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}},navigator:{},localStorage:{getItem:()=>null,setItem(){}},appFeedback(){}});
 vm.runInContext(fs.readFileSync('src/client/pwa.js','utf8'),context);
 context.window.showAppIntroduction();
 return {document,next:()=>document.querySelector('[data-next]').onclick()};
}
test('V2 introduction describes the magazine, shared calendar and the independent club destination',()=>{
 const a=introduction(true);a.next();
 assert.match(a.document.querySelector('.guide-progress').textContent,/Magazin/);
 assert.match(a.document.querySelector('.guide-text').textContent,/«Magazin»/);
 assert.match(a.document.querySelector('.guide-tip').textContent,/Scrolle/);
 a.next();assert.match(a.document.querySelector('.guide-tip').textContent,/Meine Woche/);assert.match(a.document.querySelector('.guide-visual').textContent,/Meine Woche/);
 a.next();assert.match(a.document.querySelector('.guide-progress').textContent,/Team & Verein/);
 assert.match(a.document.querySelector('.guide-text').textContent,/«Team».*Menüpunkt «Verein».*Heimstätte/);
 assert.doesNotMatch(a.document.querySelector('.guide-text').textContent,/oben rechts/);
 assert.match(a.document.querySelector('.guide-visual').textContent,/TEAM.*Unser Verein/);
});
test('V1 keeps its existing navigation wording and two-view introduction',()=>{
 const a=introduction(false);a.next();assert.match(a.document.querySelector('.guide-progress').textContent,/News/);
 a.next();assert.doesNotMatch(a.document.querySelector('.guide-tip').textContent,/Meine Woche/);
 a.next();assert.match(a.document.querySelector('.guide-progress').textContent,/Kader & Verein/);
});
