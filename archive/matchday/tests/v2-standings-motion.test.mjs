import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

function setup(club='kadetten',reduced=false) {
  const {document}=parseHTML('<html><body><main id="app"><table class="standings-table"><tbody>'+Array.from({length:12},(_,i)=>`<tr><td>${i+1}</td></tr>`).join('')+'</tbody></table></main></body></html>');
  const noop=()=>{}, calls=[];
  for(const row of document.querySelectorAll('tr')) row.animate=(frames,options)=>calls.push({row,frames,options});
  const context=vm.createContext({document,location:{hash:'#season/table'},window:{addEventListener:noop},setInterval:noop,
    openClubSettings:noop,loadFcsgData:noop,updateFcsgLiveView:noop,render:noop,showLiveMatch:noop,
    localStorage:{getItem:()=>null},activeClub:club,tableLeague:'QHL',matchMedia:()=>({matches:reduced})});
  vm.runInContext(fs.readFileSync('archive/matchday/client/v2/matchday.js','utf8'),context);
  return {document,context,calls,animate:()=>context.v2AnimateStandings()};
}
test('V2 standings enter in reading order for all clubs and finish within 400ms',()=>{
  for(const club of ['kadetten','fcsg','otmar']) {
    const {animate,calls,document}=setup(club);animate();
    assert.equal(calls.length,12);assert.deepEqual(calls.map(c=>c.row),[...document.querySelectorAll('tr')]);
    assert.ok(calls.every(c=>c.options.duration+c.options.delay<400));
    assert.ok(calls[1].options.delay>calls[0].options.delay);
    assert.equal(calls[0].frames[0].transform,'translateY(-10px)');
    assert.equal(calls[0].frames[1].opacity,1);
    assert.equal(calls[0].options.fill,'backwards'); // Never retain transformed rows after entry.
  }
});
test('Refreshes stay still; changing league or returning from another page enters again',()=>{
  const {animate,calls,context}=setup();animate();animate();assert.equal(calls.length,12);
  context.tableLeague='EHL';animate();assert.equal(calls.length,24);
  context.location.hash='#home';animate();context.location.hash='#season/table';animate();assert.equal(calls.length,36);
});
test('Keyboard navigation and reduced motion display the standings without movement',()=>{
  const reduced=setup('fcsg',true);reduced.animate();assert.equal(reduced.calls.length,0);
  const keyboard=setup();keyboard.document.dispatchEvent(new keyboard.document.defaultView.Event('keydown'));
  keyboard.animate();assert.equal(keyboard.calls.length,0);
  keyboard.context.location.hash='#home';keyboard.animate();
  keyboard.document.dispatchEvent(new keyboard.document.defaultView.Event('pointerdown'));
  keyboard.context.location.hash='#season/table';keyboard.animate();assert.equal(keyboard.calls.length,12);
});
test('Empty initial standings can animate when football data arrives',()=>{
  const {animate,document,calls}=setup('fcsg'),body=document.querySelector('tbody'),rows=[...body.children];
  body.replaceChildren();animate();body.append(...rows);animate();assert.equal(calls.length,12);
});
test('Map and match statistics never receive table entrance animations',()=>{
  const {animate,calls,context}=setup();
  for(const route of ['#season/table/map','#match/508386/stats','#season/squad']){context.location.hash=route;animate();}
  assert.equal(calls.length,0);
});
test('Browsers without Web Animations keep all standings visible',()=>{
  const {animate,document,calls}=setup();for(const row of document.querySelectorAll('tr'))delete row.animate;
  assert.doesNotThrow(animate);assert.equal(calls.length,0);assert.equal(document.querySelectorAll('tr').length,12);
});
