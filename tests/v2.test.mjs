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
 return code=>vm.runInContext(code,context);
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
