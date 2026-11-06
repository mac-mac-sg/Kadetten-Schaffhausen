import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {qhlFeatureState,featureMarkup,votingMarkup} from '../src/kadetten/js/matchday-features.js';
const read=p=>readFileSync(p,'utf8');
const doc=s=>parseHTML('<html><body>'+String(s)+'</body></html>').document;
const now=Date.parse('2026-11-06T11:00Z');
const game={id:'508393',date:'2026-11-11',time:'19:15',home:'Kadetten Schaffhausen',away:'HSC Suhr Aarau',league:'QHL'};
const ctx={club:'kadetten',game,tab:'overview',data:{playerSeason:{players:{6:{shvPlayerId:'99'}}},stories:[{id:'article',title:'Kadetten schlagen Suhr Aarau',date:'12.11.2026'},{id:'old',title:'Suhr Aarau',date:'10.11.2026'}]}};

test('V2 verwendet die echten Matchday-Styles und Vorlagen ohne neues Design darüber',()=>{
 const shell=JSON.parse(read('src/kadetten/matchday/shell.json'));
 for(const file of shell.styles)assert.equal(read('src/kadetten/matchday/'+file),read('src/client/'+file),file);
 for(const file of shell.scripts.filter(f=>!['js/views-match.js','pwa.js'].includes(f)))assert.equal(read('src/kadetten/matchday/'+file),read('src/client/'+file),file);
 const original=read('src/client/js/views-match.js');
 assert.equal(read('src/kadetten/matchday/js/views-match.js').replace("${window.KADETTEN_COMPANION?.markup(g,tab)||''}",'').replace("import('./vendor/pdf.mjs')","import('../vendor/pdf.mjs')"),original);
});
test('Zusätze nur für Kadetten-QHL: Tipp vor Anpfiff, Besuch und Wahl nach bestätigtem Ergebnis',()=>{
 assert.equal(qhlFeatureState(ctx,now),'preview');
 assert.equal(qhlFeatureState({...ctx,game:{...game,score:[30,28]}},now),'finished');
 for(const c of [{...ctx,club:'otmar'},{...ctx,live:true},{...ctx,game:{...game,league:'EHL'}},{...ctx,game:{...game,league:'Cup'}}])assert.equal(qhlFeatureState(c,now),null);
 assert.equal(qhlFeatureState(ctx,Date.parse('2026-11-11T18:15Z')),null,'Anpfiff sperrt den Tipp');
 const d=doc(featureMarkup(ctx,{now,tip:[29,27]}));
 assert.equal(d.querySelectorAll('[data-companion-tip]').length,4);
 assert.equal(d.querySelectorAll('.companion-tip-value')[0].textContent,'29');
 assert.ok(!d.querySelector('.companion-vote'));
 assert.equal(String(featureMarkup({...ctx,live:true},{now})), '');
});
test('Abgeschlossenes QHL-Spiel verbindet echte Spielartikel mit Wahl und gespeicherter Hallen-Erinnerung',()=>{
 const finished={...ctx,game:{...game,score:[30,28]}};
 const d=doc(featureMarkup(finished,{now,visited:true,voteOpen:true}));
 assert.equal(d.querySelector('[data-companion-attendance]').getAttribute('aria-pressed'),'true');
 assert.ok(d.querySelector('.companion-vote').hasAttribute('open'));
 assert.equal(d.querySelectorAll('a[href="#news/article"]').length,1);
 assert.equal(d.querySelectorAll('a[href="#news/old"]').length,0);
 assert.ok(!d.querySelector('[data-companion-tip]'));
});
test('Matchday-Wahl: Auswahl sendet noch nicht, Bestätigung separat, echte Portrait-Zuordnung, Ergebnis erst nach Schluss',()=>{
 const vote={open:true,candidates:[{id:'99',name:'RIKHARDSSON Odinn',goals:8}],total:8,counts:{99:8}};
 const d=doc(votingMarkup({vote,data:ctx.data}));
 assert.ok(d.querySelector('[data-companion-confirm]').hasAttribute('disabled'));
 assert.equal(d.querySelector('img').getAttribute('src'),'assets/players/6.webp');
 const selected=doc(votingMarkup({vote,data:ctx.data,selected:'99'}));
 assert.ok(!selected.querySelector('[data-companion-confirm]').hasAttribute('disabled'));
 assert.equal(selected.querySelector('[data-companion-player]').getAttribute('aria-pressed'),'true');
 const saved=doc(votingMarkup({vote,mine:'99'}));
 assert.match(saved.body.textContent,/Ergebnis erscheint nach Wahlende/);
 assert.doesNotMatch(saved.body.textContent,/100 %/);
 const closed=doc(votingMarkup({vote:{...vote,open:false},mine:'99'}));
 assert.match(closed.body.textContent,/100 %/);
 assert.ok(!closed.querySelector('button'));
 const escaped=String(votingMarkup({vote:{...vote,candidates:[{id:'99',name:'<script>alert(1)</script>'}]}}));
 assert.doesNotMatch(escaped,/<script>/);
});
