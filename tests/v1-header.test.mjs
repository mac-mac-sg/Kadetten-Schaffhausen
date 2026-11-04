import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function setup(){
 const {document}=parseHTML('<html><body><header class="top v1-compact-header"><button class="brand compact-club-trigger" data-compact-clubs><img src="crest.svg"><span>Verein<small>Ort</small></span><svg></svg></button><button id="install-app">Installieren</button><button id="club-settings">Einstellungen</button><nav id="compact-club-menu"><button>Verein wählen</button></nav></header><main id="app"><h1>Originalinhalt</h1></main><dialog class="club-settings-dialog"><button aria-label="Einstellungen schliessen">Schliessen</button></dialog></body></html>');
 const noop=()=>{},context=vm.createContext({document,location:{hash:'#home'},window:{addEventListener:noop},setInterval:noop,render:noop,showLiveMatch:noop,updateFcsgLiveView:noop,loadFcsgData:noop,openClubSettings:noop,localStorage:{getItem:()=>null,setItem:noop},liveEscape:String,activeClub:'kadetten',fanClubs:{kadetten:{short:'Kadetten'},fcsg:{short:'FCSG'},otmar:{short:'St. Otmar'}}});
 vm.runInContext(fs.readFileSync('src/client/js/home-title.js','utf8'),context);return {document,context};
}
test('V1 keeps the same Matchday identity and original club controls on every route',()=>{
 const {document,context}=setup(),picker=document.querySelector('[data-compact-clubs]'),menu=document.getElementById('compact-club-menu'),content=document.getElementById('app').innerHTML;
 for(const club of ['kadetten','fcsg','otmar'])for(const route of ['#home','#season/games','#season/table','#season/squad','#club','#match/592/stats','#news/1','#player/1']){
  context.activeClub=club;context.location.hash=route;context.v1HeaderChrome();context.v1HeaderChrome();
  assert.equal(document.documentElement.dataset.v1Header,'matchday');assert.equal(document.querySelectorAll('.v1-start-masthead').length,1);
  assert.equal(document.querySelector('.v1-start-masthead').getAttribute('href'),'#home');assert.equal(document.querySelector('[data-compact-clubs]'),picker);
  assert.equal(document.getElementById('compact-club-menu'),menu);assert.equal(picker.querySelector('span').textContent,context.fanClubs[club].short.toUpperCase());
  assert.equal(document.getElementById('app').innerHTML,content);
 }
});
test('V1 installation remains reachable from settings and closes settings before starting installation',()=>{
 const {document,context}=setup(),actions=[];document.querySelector('[aria-label="Einstellungen schliessen"]').onclick=()=>actions.push('close');document.getElementById('install-app').onclick=()=>actions.push('install');
 context.openClubSettings();context.openClubSettings();assert.equal(document.querySelectorAll('[data-v1-install]').length,1);
 document.querySelector('[data-v1-install]').click();assert.deepEqual(actions,['close','install']);
 document.getElementById('install-app').hidden=true;context.openClubSettings();assert.equal(document.querySelector('[data-v1-install]'),null);
});
