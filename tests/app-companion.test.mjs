import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {parseRoute,AREAS} from '../src/kadetten/js/router.js';
import {tickerEvents,renderTicker} from '../src/kadetten/js/ticker.js';
import {renderJetzt} from '../src/kadetten/js/views/jetzt.js';
import {renderSpiel} from '../src/kadetten/js/views/spiel.js';
import {voteSection} from '../src/kadetten/js/views/bericht.js';
import {nav} from '../src/kadetten/js/views/parts.js';
const doc = html => parseHTML('<html><body>'+String(html)+'</body></html>').document;
const now=Date.parse('2026-11-06T10:00:00Z');
const game={id:'next',home:'Kadetten Schaffhausen',away:'HSC Suhr Aarau',date:'2026-11-11',time:'19:15',league:'QHL'};
const data={games:[game],tables:{QHL:[[game.home,12,400,300,21]]},stories:[{id:'1',title:'Aktuelle Geschichte',image:'https://example.org/photo.webp',date:'06.11.2026'},{id:'2',title:'Zweite Geschichte',date:'05.11.2026'}],playerSeason:{players:{6:{shvPlayerId:99}}}};
const ctx={state:{data},now,load:()=>({status:'loading'}),api:{},ui:{}};

test('Titelseite im Stil «Schnitt»: Kopfband mit Wappen, Spielkarte, echte News, keine erfundenen Meldungen',()=>{
  const d=doc(renderJetzt(ctx));
  assert.equal(d.querySelectorAll('h1').length,1);
  assert.equal(d.querySelector('h1').textContent,'Kadetten');
  assert.ok(d.querySelector('.band.band-home'),'Kopfband mit Schnittkante');
  assert.equal(d.querySelector('.band-crest').getAttribute('href'),'#/verein','Wappen führt zum Verein');
  assert.equal(d.querySelector('.band-acts a[href="#/ich"]').getAttribute('href'),'#/ich');
  assert.match(d.querySelector('.band-tag').textContent,/Tradition seit 1791/,'1791 ist die Gründung des Kadettencorps, nicht des Handballteams');
  assert.doesNotMatch(d.body.textContent,/Handball seit 1791/);
  assert.equal(d.querySelector('.match-score .hero-link').getAttribute('href'),'#/spiel/next','Nächstes Spiel als Karte');
  assert.match(d.querySelector('.lead-story').textContent,/Aktuelle Geschichte/);
  assert.equal(d.querySelector('.lead-story img').getAttribute('src'),'https://example.org/photo.webp');
  assert.ok(!d.querySelector('.moments'));
  const empty=doc(renderJetzt({...ctx,state:{data:{...data,stories:[]}}}));
  assert.ok(!empty.querySelector('.lead-story'),'ohne News keine erfundene Bildgeschichte');
});
test('Vier Tabs: News, Spiele, Tabelle, Kader; Verein über das Wappen, Persönliches über «Ich»',()=>{
  assert.deepEqual(AREAS.map(a=>a.label),['News','Spiele','Tabelle','Kader']);
  const d=doc(nav('statistik'));
  assert.equal(d.querySelectorAll('a[aria-label]').length,4);
  assert.equal(d.querySelector('[aria-current="page"]').getAttribute('href'),'#/statistik');
  assert.equal(d.querySelectorAll('a svg').length,4,'jeder Tab hat ein Symbol und eine sichtbare Beschriftung');
  assert.equal(d.querySelectorAll('a span').length,4);
  assert.equal(parseRoute('#/statistik').view,'tabellen');
  assert.equal(parseRoute('#/verein').view,'verein');
  assert.equal(parseRoute('#/spiel/next/wahl').tab,'wahl');
});
test('Ticker nutzt nur bestätigte, gültige Ereignisse, sortiert und entfernt Duplikate',()=>{
 const match={details:{events:[{id:1,seconds:45,action:'Tor',score:[1,0]},{id:2,seconds:50,action:'<script>schlecht</script>',homePlayer:'<b>Name</b>'},{id:1,seconds:45,action:'Tor',score:[1,0]},{id:3,seconds:-1,action:'ungültig'},{id:4,seconds:55,action:''}]}};
 assert.deepEqual(tickerEvents(match).map(e=>e.id),[2,1]);
 const out=String(renderTicker(match));
 assert.doesNotMatch(out,/<script>|<b>Name/);
 assert.match(out,/&lt;script&gt;/);
 assert.equal(doc(out).querySelectorAll('[data-event-id]').length,2);
 assert.match(String(renderTicker({league:'European League',details:{events:null}})),/noch keine einzelnen Ereignisse/);
 assert.match(String(renderTicker({...match,details:{...match.details,ok:false}})),/verzögert/);
});
test('Livetab zeigt Ereignisse, Statistik bleibt separat erreichbar',()=>{
 const match={...game,id:'next',score:[32,28],phase:'2. Halbzeit',clock:'54:12',details:{ok:true,events:[{id:9,seconds:3252,action:'Tor Kadetten',score:[32,28]}]}};
 const d=doc(renderSpiel({...ctx,state:{data,live:{match}},route:{id:'next',tab:'live'}}));
 assert.match(d.querySelector('.event-list').textContent,/Tor Kadetten/);
 assert.equal(d.querySelector('[aria-current="page"]').textContent.trim(),'Ticker');
 assert.equal(d.querySelector('a[href="#/spiel/next/bericht"]').textContent,'Statistik');
});
test('Spielerwahl benötigt Auswahl und Bestätigung, Fotos werden anhand Quellen-ID zugeordnet',()=>{
 const vote={status:'ready',value:{open:true,total:8,counts:{99:8},closesAt:now+100000,candidates:[{id:'99',name:'RIKHARDSSON Odinn',goals:8},{id:'100',name:'Unbekannter Spieler'}]}};
 const d=doc(voteSection({vote,now,data}));
 assert.ok(d.querySelector('[data-vote-confirm]').hasAttribute('disabled'));
 assert.equal(d.querySelector('img').getAttribute('src'),'assets/players/6.webp');
 assert.equal(d.querySelectorAll('[data-vote]').length,0,'Auswahl sendet keine Stimme');
 const selected=doc(voteSection({vote,now,data,selected:'99'}));
 assert.ok(!selected.querySelector('[data-vote-confirm]').hasAttribute('disabled'));
 assert.equal(selected.querySelector('[aria-pressed="true"]').getAttribute('data-vote-select'),'99');
 const invalid=doc(voteSection({vote,now,data,selected:'evil'}));
 assert.ok(invalid.querySelector('[data-vote-confirm]').hasAttribute('disabled'));
 const receipt=doc(voteSection({vote,now,data,mine:'99'}));
 assert.match(receipt.body.textContent,/Ergebnis erscheint nach dem Schlusspfiff/);
 assert.doesNotMatch(receipt.body.textContent, /100\s*%/);
 assert.ok(!receipt.querySelector('[data-vote-confirm]'));
 const closed=doc(voteSection({vote:{...vote,value:{...vote.value,open:false}},now,data,mine:'99'}));
 assert.match(closed.body.textContent,/100\s*%/);
});

test('Adressen der archivierten App Matchday führen zur passenden Ansicht der Kadetten-App', () => {
  assert.deepEqual(parseRoute('#match/508393/stats'), {area: 'saison', view: 'spiel', id: '508393'});
  assert.equal(parseRoute('#season/games').view, 'spielplan');
  assert.equal(parseRoute('#season/table').view, 'tabellen');
  assert.equal(parseRoute('#season/squad').view, 'team');
  assert.deepEqual(parseRoute('#player/10'), {area: 'team', view: 'spieler', id: '10'});
  assert.equal(parseRoute('#player/josip-peric').view, 'team', 'Namen als Kennung führen zum Kader');
  assert.equal(parseRoute('#home').view, 'jetzt');
  assert.equal(parseRoute('#club').view, 'jetzt');
});
