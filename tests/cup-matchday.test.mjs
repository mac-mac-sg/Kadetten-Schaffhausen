import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

const shell=fs.readFileSync('src/client/index.html','utf8');
const scripts=[...shell.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(s=>(s.startsWith('js/')||s.startsWith('data/')||s==='enhancements.js')&&s!=='js/main.js');
function harness(preview){
 const {document}=parseHTML(shell),noop=()=>{},now=Date.parse('2026-10-31T19:04:00Z');
 class Clock extends Date {constructor(...a){a.length?super(...a):super(now);}static now(){return now;}}
 if(preview)document.documentElement.dataset.preview='v2';
 const context=vm.createContext({document,Date:Clock,Intl,URL,location:{hash:'#home',href:'https://example.test/'+(preview?'v2/':'')+'#home'},navigator:{onLine:true},window:{addEventListener:noop,scrollTo:noop,scrollY:0},localStorage:{getItem:()=>null,setItem:noop},setInterval:noop,setTimeout:noop,clearTimeout:noop,clearInterval:noop,requestAnimationFrame:noop,cancelAnimationFrame:noop,fetch:()=>Promise.reject(Error('offline')),apiFetch:()=>Promise.reject(Error('offline')),console});
 for(const file of scripts)vm.runInContext(fs.readFileSync('src/client/'+file,'utf8'),context,{filename:file});
 if(preview)vm.runInContext(fs.readFileSync('src/client/v2/matchday.js','utf8'),context);
 const run=code=>vm.runInContext(code,context);
 run("activeClub='kadetten';offlineData=false;games=[{id:'517266',date:'2026-10-31',time:'20:00',home:'Handball Emmen',away:'Kadetten Schaffhausen',league:'Mobiliar-Cup M',venue:'Emmen Rossmoos'},{id:'next',date:'2026-11-11',time:'19:15',home:'Kadetten Schaffhausen',away:'HSC Suhr Aarau',league:'QHL'}]");
 const render=()=>{run("document.getElementById('app').innerHTML=home()");return document.querySelector('#v2-match-ticket');};
 return {document,run,render};
}
test('V1 and V2 keep the cup fixture after kickoff and open its own live statistics when SHV confirms it',()=>{
 for(const preview of [false,true]){
  const {document,run,render}=harness(preview);
  let card=render();assert.ok(card);assert.match(card.textContent,/Handball Emmen/);assert.doesNotMatch(card.textContent,/HSC Suhr Aarau/);
  run("liveState={ok:true,checkedAt:'2026-10-31T19:03:55Z',sources:{SHV:{ok:true}},match:{id:517266,home:'Handball Emmen (MNLB)',away:'Kadetten Schaffhausen (QHL)',league:'Mobiliar-Cup M',score:[1,1],clock:'1:29',phase:'1. Halbzeit'}};liveRequestFailed=false");
  card=render();assert.match(card.textContent,/1\s*:\s*1/);assert.match(card.textContent,/Handball Emmen/);
  assert.equal(run('liveMatchHref(liveState.match)'),'#match/517266/stats');
  assert.ok(card.querySelector('img[alt^="Kadetten Schaffhausen"]'),'The cup live name must retain the club crest');
  if(preview)assert.equal(card.getAttribute('href'),'#match/517266/stats');
  assert.equal(run("liveForFixture(games[0]).id"),517266);
  const switcher=document.createElement('div');switcher.innerHTML=run("teamSwitchMarkup('cup',liveState.match.home,liveState.match.away,()=> '')");
  assert.equal(switcher.querySelector('[data-stats-team=away] img').getAttribute('alt'),'');
  run('liveRequestFailed=true');card=render();assert.match(card.textContent,/Handball Emmen/);assert.doesNotMatch(card.textContent,/HSC Suhr Aarau/);
  run("liveRequestFailed=false;liveState={match:null,finished:{...liveState.match,status:'finished',date:'2026-10-31',score:[20,30]}};applyFinishedMatch(liveState.finished)");
  card=render();assert.match(card.textContent,/20\s*:\s*30/);assert.match(card.textContent,/Handball Emmen/);assert.equal(run('games[0].score[1]'),30);
 }
});
