import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

function setup(route,markup){
 const {document}=parseHTML('<html data-preview="v2"><body><main id="app">'+markup+'</main></body></html>'),noop=()=>{};
 const context=vm.createContext({document,location:{hash:route},window:{addEventListener:noop},setInterval:noop,
  openClubSettings:noop,loadFcsgData:noop,updateFcsgLiveView:noop,render:noop,showLiveMatch:noop,
  localStorage:{getItem:()=>null},activeClub:'kadetten',fanClubs:{kadetten:{name:'Kadetten Schaffhausen'}}});
 vm.runInContext(fs.readFileSync('src/client/js/home-title.js','utf8'),context);
 vm.runInContext(fs.readFileSync('src/client/v2/matchday.js','utf8'),context);
 return {document,context,decorate:()=>context.v2DetailPages()};
}
test('V2 story opening moves the original title and metadata without replacing the loaded article or its links',()=>{
 const {document,decorate}=setup('#news/a','<article class="news-article"><div class="article-bar"><a href="#home">Zurück</a></div><img class="article-photo" src="original.webp"><div class="content"><p class="muted">30.10.2026</p><h1>Ein Originaltitel</h1><div id="article-body" aria-live="polite"><p>Vollständiger Originaltext</p><a href="https://example.test/original">Quelle</a></div><a href="#news/b">Weiterlesen</a></div></article>');
 const title=document.querySelector('h1'),body=document.getElementById('article-body'),image=document.querySelector('.article-photo'),links=[...document.querySelectorAll('a')];
 decorate();decorate();
 assert.equal(document.querySelectorAll('h1').length,1);assert.equal(document.querySelector('.v2-article-heading h1'),title);
 assert.equal(document.querySelectorAll('.v2-article-heading').length,1);assert.equal(document.getElementById('article-body'),body);
 assert.equal(body.textContent,'Vollständiger OriginaltextQuelle');assert.equal(document.querySelector('.article-photo'),image);
 assert.deepEqual([...document.querySelectorAll('a')],links);assert.equal(document.querySelector('.v2-article-heading > .muted').textContent,'30.10.2026');
 // A later network response still writes into the same original target.
 body.innerHTML='<p>Nachgeladener Artikel</p>';decorate();assert.equal(document.getElementById('article-body').textContent,'Nachgeladener Artikel');
});
test('Football portrait retains the same facts, season filters, statistic target and section navigation',()=>{
 const {document,decorate}=setup('#player/10','<section class="fcsg-player"><section id="fcsg-profile-intro"><a href="#season/squad">Zurück</a><img class="fcsg-player-photo" src="player.webp"><p class="eyebrow">Sturm · Nr. 10</p><h1>Spielername</h1><div id="fcsg-player-facts">Originalfakten</div></section><section id="fcsg-profile-stats"><div id="fcsg-player-stats"><select data-fcsg-stat-season><option>2026/27</option></select></div></section><button data-section="fcsg-profile-stats">Statistik</button></section>');
 const facts=document.getElementById('fcsg-player-facts'),stats=document.getElementById('fcsg-player-stats'),photo=document.querySelector('img'),title=document.querySelector('h1'),filter=document.querySelector('select');
 decorate();decorate();
 assert.equal(document.querySelectorAll('.v2-player-cover').length,1);assert.equal(document.querySelector('.v2-player-cover img'),photo);
 assert.equal(document.querySelector('.v2-player-cover h1'),title);assert.equal(document.getElementById('fcsg-player-facts'),facts);
 assert.equal(document.getElementById('fcsg-player-stats'),stats);assert.equal(document.querySelector('select'),filter);
 assert.equal(document.querySelector('[data-section]').dataset.section,'fcsg-profile-stats');assert.equal(document.querySelectorAll('h1').length,1);
});
test('Every archive chapter retains its year, heading ID, original photograph, caption and complete copy',()=>{
 const {document,decorate}=setup('#club','<div class="v2-club-page"><h1>Unser Verein</h1><nav class="club-years"><button data-club-jump="chapter-1">2005</button></nav><article class="club-chapter" id="chapter-1" aria-labelledby="chapter-title"><figure><img src="archive.webp"><figcaption>Originalnachweis</figcaption></figure><div class="club-chapter-copy"><p class="club-chapter-year">2005</p><h3 id="chapter-title">Erster Titel</h3><p>Originaltext mit allen historischen Fakten.</p><button data-club-jump="chapter-2">Weiterreisen</button></div></article></div>');
 const chapter=document.querySelector('.club-chapter'),image=chapter.querySelector('figure'),copy=chapter.querySelector('.club-chapter-copy'),title=chapter.querySelector('h3');
 decorate();decorate();
 assert.equal(chapter.querySelectorAll('.v2-chapter-heading').length,1);assert.equal(chapter.querySelector('.v2-chapter-heading h3'),title);
 assert.equal(chapter.getAttribute('aria-labelledby'),title.id);assert.equal(chapter.querySelector('figure'),image);assert.equal(chapter.querySelector('.club-chapter-copy'),copy);
 assert.match(copy.textContent,/Originaltext mit allen historischen Fakten/);assert.equal(document.querySelectorAll('[data-club-jump]').length,2);
});
test('Live header updates remain idempotent and the same score and event nodes survive decoration',()=>{
 const {document,context,decorate}=setup('#match/live/stats','<header class="live-match-header"><div class="matchup"><strong>0 : 1</strong></div></header><div id="live-events">Originalereignisse</div>');
 const score=document.querySelector('strong'),events=document.getElementById('live-events');
 decorate();decorate();score.textContent='1 : 1';decorate();
 assert.equal(document.querySelectorAll('.v2-matchcenter-title').length,1);assert.equal(document.querySelector('strong'),score);assert.equal(score.textContent,'1 : 1');
 assert.equal(document.getElementById('live-events'),events);
 context.location.hash='#home';decorate();assert.equal(document.getElementById('app').classList.contains('v2-detail'),false);
});


test('Detached team previews receive the same magazine cover and show the roster directly',()=>{
 const {document,context}=setup('#season/table','');
 const preview=document.createElement('section');preview.className='season';
 preview.innerHTML='<header><h1>Kader</h1></header><div class="players"><a href="#player/6">Spieler</a></div>';
 context.liveEscape=v=>v;
 const title=preview.querySelector('h1'),players=preview.querySelector('.players');
 context.v2MagazineTeamCover(preview);context.v2MagazineTeamCover(preview);
 assert.equal(preview.querySelectorAll('.v2-team-cover').length,1);
 assert.equal(preview.querySelector('.v2-team-cover h1'),title);assert.equal(title.textContent,'DAS TEAM.');
 assert.equal(preview.querySelector('.players'),players);assert.equal(preview.querySelectorAll('.v2-club-entry').length,0);assert.equal(preview.querySelector('.players'),players);
 assert.equal(document.getElementById('app').children.length,0);
});


test('Team cover uses the real preferred player image and inserts history before the first position group',()=>{
 const {document,context}=setup('#season/squad','');
 const section=document.createElement('section');
 section.innerHTML='<h1>Kader</h1><a class="v2-club-entry" href="#club"><h2>Unser Verein</h2><p>Geschichte</p></a><h2>Torhüter</h2><div class="players" id="keepers"><a class="player-card" href="#player/1"><img src="keeper.webp" alt="Torhüter"></a></div><h2>Rückraum</h2><div class="players" id="field"><a class="player-card" href="#player/22"><img src="real-player.webp" alt="Patrik Martinovic"><div>Originalname und Nummer</div></a></div>';
 context.liveEscape=v=>v;
 const groups=[...section.querySelectorAll('.players')],cards=[...section.querySelectorAll('.player-card')],entry=section.querySelector('.v2-club-entry');
 context.v2MagazineTeamCover(section);context.v2MagazineTeamCover(section);
 assert.equal(section.querySelector('.v2-team-cover > img').getAttribute('src'),'real-player.webp');
 assert.equal(section.querySelector('h1').getAttribute('aria-label'),'Das Team');assert.equal(section.querySelectorAll('.v2-team-title > span').length,2);
 assert.equal(section.querySelector('.v2-team-cover').nextElementSibling,entry);assert.deepEqual([...section.querySelectorAll('.player-card')],cards);
 assert.equal(section.querySelectorAll('.players').length,2);assert.equal(entry.getAttribute('href'),'#club');
});
test('Match identity moves the original back link while retaining the live score target and every header fact',()=>{
 const {document,context}=setup('#match/test/stats','<header class="fcsg-match-header"><a class="back-link" href="#season/games">Zurück zu den Spielen</a><p class="eyebrow">Liga · 19:15 Uhr</p><div class="matchup"><strong data-fcsg-score="test">1 : 0</strong></div><p class="fcsg-match-venue">Stadion</p></header>');
 const header=document.querySelector('header'),back=header.querySelector('a'),score=header.querySelector('strong');
 context.v2MatchChrome(header);context.v2MatchChrome(header);
 assert.equal(header.querySelectorAll('.v2-matchcenter-title').length,1);assert.equal(header.querySelector('.v2-matchcenter-title a'),back);
 assert.equal(back.getAttribute('aria-label'),'Zurück zu den Spielen');assert.equal(header.querySelector('[data-fcsg-score]'),score);
 assert.equal(header.querySelector('.eyebrow').textContent,'Liga · 19:15 Uhr');assert.equal(header.querySelector('.fcsg-match-venue').textContent,'Stadion');
 score.textContent='2 : 0';context.v2MatchChrome(header);assert.equal(header.querySelector('[data-fcsg-score]').textContent,'2 : 0');
 header.innerHTML='<div class="matchup"><strong data-fcsg-score="test">3 : 0</strong></div>';context.v2MatchChrome(header);
 assert.equal(header.querySelector('.v2-match-back').getAttribute('href'),'#season/games');assert.equal(header.querySelector('[data-fcsg-score]').textContent,'3 : 0');
});
test('Ticker icons are decorative and leave original events, source links and unknown values intact',()=>{
 const {document,context}=setup('#match/test/report','<ol class="live-events"><li class="live-event"><time>52:00</time><div><strong>Tor · 28 : 24</strong><span>Originalspieler</span></div></li><li class="live-event"><time>–</time><div><strong>2 Minuten</strong><a href="https://example.test/source">Quelle</a></div></li></ol><ol class="fcsg-ticker"><li data-ticker-id="a"><span class="fcsg-ticker-minute">46′</span><div><h3>Wechsel</h3><p>Originalmeldung</p></div></li></ol>');
 const originals=[...document.querySelectorAll('time,strong,a,h3,p')],text=originals.map(e=>e.textContent);
 context.v2EditorialEvents();context.v2EditorialEvents();
 assert.equal(document.querySelectorAll('.v2-event-icon').length,3);
 assert.deepEqual([...document.querySelectorAll('[data-v2-event]')].map(e=>e.dataset.v2Event),['goal','penalty','change']);
 assert.deepEqual([...document.querySelectorAll('time,strong,a,h3,p')],originals);assert.deepEqual(originals.map(e=>e.textContent),text);
 assert.ok([...document.querySelectorAll('.v2-event-icon')].every(e=>e.getAttribute('aria-hidden')==='true'));
});
test('Installation stays reachable in settings and closes the dialog before invoking the existing install action',()=>{
 const {document,context}=setup('#home','');
 const install=document.createElement('button');install.id='install-app';install.innerHTML='<svg aria-hidden="true"></svg>';let sequence=[];install.click=()=>sequence.push('install');document.body.append(install);
 const dialog=document.createElement('dialog');dialog.className='club-settings-dialog';dialog.innerHTML='<button aria-label="Einstellungen schliessen"></button><section class="settings-app-info"></section>';dialog.querySelector('button').click=()=>sequence.push('close');document.body.append(dialog);
 context.v2InstallSettings();context.v2InstallSettings();
 const button=dialog.querySelector('[data-v2-install]');assert.ok(button);assert.equal(dialog.querySelectorAll('[data-v2-install]').length,1);
 button.onclick();assert.deepEqual(sequence,['close','install']);
 install.hidden=true;context.v2InstallSettings();assert.equal(dialog.querySelector('[data-v2-install]'),null);
});
