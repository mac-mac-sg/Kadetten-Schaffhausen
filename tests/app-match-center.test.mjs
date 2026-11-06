import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {matchCenterMarkup,centerTab,centerBody,centerFeatures} from '../src/kadetten/js/match-center.js';
const doc=s=>parseHTML('<html><body>'+String(s)+'</body></html>').document;
const game={id:'508386',date:'2026-10-24',time:'18:00',league:'QHL',home:'Kadetten Schaffhausen',away:'GC Amicitia Zürich',venue:'Schaffhausen BBC Arena A',score:[37,26]};
test('Referenz-Spielansicht: Resultatkarte vor drei Tabs, Fan-Wahl vor Matchbericht',()=>{
 const d=doc(matchCenterMarkup({game,body:'<p>Bestätigter Bericht</p>',crest:()=>'<img src="assets/logo.png" alt="">'}));
 assert.equal(d.querySelector('.mc-result').textContent,'37:26');
 assert.equal(d.querySelector('.mc-pill').textContent,'S · Sieg');
 assert.deepEqual([...d.querySelectorAll('.mc-tabs a')].map(a=>a.textContent),['Übersicht','Ticker','Statistik']);
 assert.equal(d.querySelector('[aria-current="page"]').getAttribute('href'),'#match/508386/overview');
 assert.equal(d.querySelector('.mc-vote-teaser').getAttribute('href'),'#match/508386/vote');
 assert.ok(String(d.body.innerHTML).indexOf('mc-vote-teaser')<String(d.body.innerHTML).indexOf('mc-report'));
 assert.equal(d.querySelectorAll('h1').length,1);
 assert.ok(!d.querySelector('.match-top'));
});
test('Live nutzt bestätigten Spielstand und Phase; explizite Tabs bleiben bei Phasenwechsel stabil',()=>{
 const d=doc(matchCenterMarkup({game:{...game,score:null},tab:'ticker',live:{score:[18,15],phase:'2. Halbzeit',clock:'35:12'}}));
 assert.equal(d.querySelector('.mc-result').textContent,'18:15');
 assert.match(d.querySelector('.mc-pill').textContent,/35:12/);
 assert.equal(d.querySelector('[aria-current="page"]').textContent,'Ticker');
 assert.ok(!d.querySelector('.mc-vote-teaser'));
 assert.equal(centerTab('report',false),'overview');
 assert.equal(centerTab('report',true),'ticker');
 assert.equal(centerTab('stats',true),'stats');
 assert.match(String(matchCenterMarkup({game,live:{score:[18,15]},stale:true})),/letzter bestätigter Stand/);
 assert.doesNotMatch(String(matchCenterMarkup({game:{...game,score:null},tab:'stats'})),/mc-report/);
});
test('Wahl hat eigenen Bildschirm ohne doppelte Artikel und Rückweg zum Spiel',()=>{
 const document=doc('');
 const features='<section id="companion-qhl"><section>Artikel</section><details class="companion-vote"><summary>Spielerwahl</summary><button>Spieler</button></details><section>Hallenbesuch</section></section>';
 const only=centerFeatures(features,true,document);
 assert.doesNotMatch(only,/Artikel|Hallenbesuch/);
 assert.match(only,/open/);
 assert.doesNotMatch(centerFeatures(features,false,document),/companion-vote/);
 const d=doc(matchCenterMarkup({game,tab:'vote',features:only}));
 assert.ok(d.querySelector('a[href="#match/508386/overview"]'));
 assert.equal(d.querySelectorAll('h1').length,1);
});
test('Matchday-Bericht wird ohne zweiten Spielkopf und doppelte Hauptüberschrift übernommen',()=>{
 const document=doc('');
 const out=centerBody('<section class="match"><div class="match-top">Alter Kopf</div><div class="content narrow match-recap"><h1>Bericht</h1><p>Text</p><section class="report-history">Alter Ticker</section></div></section>','overview',document);
 assert.match(out,/<h3>Bericht<\/h3>/);
 assert.doesNotMatch(out,/Alter Kopf|Alter Ticker|<h1>/);
});

test('Statistiken behalten Mannschaftszuordnung und interaktive Datenattribute',()=>{
 const document=doc('');
 const body=centerBody('<div class="content narrow finished-match-stats" data-own-side="home"><button data-stats-team="away">Gegner</button></div>','stats',document);
 assert.match(body,/data-own-side="home"/);
 assert.match(body,/data-stats-team="away"/);
});
