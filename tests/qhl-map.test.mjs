import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
function fixture(){
 const original=()=>'<p>Original</p>';
 const context=vm.createContext({tables:{QHL:[]},games:[],clubLogos:{},activeClub:'kadetten',tableLeague:'QHL',standing:original,season:original,setupViews:original,location:{hash:'#season/table'},liveEscape:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),photoUrl:x=>x,v2ArrowSvg:()=>'<svg aria-hidden="true"></svg>',handballTeamName:()=> 'Kadetten Schaffhausen',updateLabel:()=> '<span data-update-key="table">Stand: 21.10.2026</span>',date:g=>g.date});
 vm.runInContext(fs.readFileSync('src/client/v2/qhl-clubs.js','utf8'),context);
 vm.runInContext(fs.readFileSync('src/client/v2/qhl-map.js','utf8'),context);
 return {context,run:code=>vm.runInContext(code,context)};
}
test('QHL explorer is injected only into the preview shell; production and football keep their existing views',()=>{
 const {context,run}=fixture();
 assert.doesNotMatch(fs.readFileSync('src/client/index.html','utf8'),/qhl-map|qhl-clubs|maplibre/);
 const build=fs.readFileSync('scripts/build.mjs','utf8');assert.match(build,/if\(v2\)\{\s+shellFiles.push\('v2\/qhl-clubs.js'/);
 context.tables.QHL=[['Kadetten Schaffhausen',8,262,232,13]];
 assert.match(run('standing()'),/Tabelle[\s\S]*Karte/);context.tableLeague='EHL';assert.equal(run('standing()'),'<p>Original</p>');
 context.location.hash='#season/table/map';context.activeClub='fcsg';assert.equal(run("season('table')"),'<p>Original</p>');
 context.activeClub='kadetten';const root=parseHTML(run("season('table')")).document;
 assert.equal(root.querySelectorAll('h1').length,1);assert.equal(root.querySelectorAll('[data-qhl-team]').length,1);assert.equal(root.querySelector('a[aria-current]').getAttribute('href'),'#season/table/map');
});
test('Verified venue registry covers the seeded QHL teams and uses Swiss building coordinates with primary sources',()=>{
 const {context,run}=fixture(),seed=vm.createContext({});vm.runInContext(fs.readFileSync('src/client/data/fallback.js','utf8'),seed);context.tables=vm.runInContext('tables',seed);
 assert.equal(run('qhlMapTeams().length'),10);assert.equal(run('qhlMapTeams().filter(t=>!t.coordinates).length'),0);
 assert.equal(run('new Set(qhlVenueRegistry.map(t=>t.id)).size'),10);
 assert.equal(run("qhlVenueRegistry.every(t=>t.coordinates[0]>5.9&&t.coordinates[0]<10.6&&t.coordinates[1]>45.7&&t.coordinates[1]<47.9&&t.source.startsWith('https://')&&t.coordinateSource.startsWith('https://api3.geo.admin.ch/'))"),true);
 assert.equal(run("qhlVenue('TSV St.Otmar St.Gallen').id"),'otmar');
});
test('Membership and figures come from the current table; missing venues and unknown values are not invented',()=>{
 const {context,run}=fixture();context.tables.QHL=[['Handball Stäfa',0,0,0,0],['Neuer Verein',null,null,null,null]];
 assert.equal(run('qhlMapTeams().length'),2);assert.equal(run('qhlMapTeams()[0].points'),0);assert.equal(run('qhlMapTeams()[1].points'),null);assert.equal(run('qhlMapTeams()[1].coordinates'),undefined);
 const root=parseHTML(run('qhlDetailMarkup(qhlMapTeams()[1])')).document;assert.equal(root.querySelectorAll('dialog').length,1);assert.equal(root.querySelectorAll('a[href*="maps/dir"]').length,0);assert.match(root.textContent||root.querySelector('dialog').textContent,/Noch nicht erfasst/);
});
test('Nearby markers cluster without losing or duplicating clubs, and separate at higher zoom',()=>{
 const {context,run}=fixture();context.teams=[{id:'a',coordinates:[0,0]},{id:'b',coordinates:[35,0]},{id:'c',coordinates:[200,0]}];
 assert.equal(run('qhlGroups(teams,c=>({x:c[0],y:c[1]}),6).length'),2);assert.equal(run('qhlGroups(teams,c=>({x:c[0],y:c[1]}),11).length'),3);
 assert.equal(run("qhlGroups(teams,c=>({x:c[0],y:c[1]}),6).flat().map(t=>t.id).sort().join(',')"),'a,b,c');
 context.teams=[{coordinates:[0,0]},{coordinates:[50,0]},{coordinates:[100,0]}];assert.equal(run('qhlGroups(teams,c=>({x:c[0],y:c[1]}),6).length'),2,'A chain must not merge distant locations into one cluster');
});
test('Profiles keep one modal, escape names, use real figures and offer only encounters in the selected club data',()=>{
 const {context,run}=fixture();context.tables.QHL=[['St. Otmar St. Gallen',7,201,208,6]];
 context.games=[{id:'ok',home:'Kadetten Schaffhausen',away:'TSV St.Otmar St.Gallen',league:'QHL',date:'2026-11-01',time:'18:00',score:null},{id:'wrong',home:'Kadetten Schaffhausen',away:'TSV St.Otmar St.Gallen',league:'EHL',date:'2026-11-02'}];
 assert.equal(run('qhlEncounters(qhlMapTeams()[0]).length'),1);
 const root=parseHTML(run('qhlDetailMarkup(qhlMapTeams()[0])')).document;
 assert.equal(root.querySelectorAll('dialog').length,1);assert.ok(root.querySelector('.qhl-data-date [data-update-key="table"]'));assert.doesNotMatch(root.querySelector('.qhl-data-date').textContent,/<span/);assert.equal(root.querySelector('#qhl-detail-title').textContent,'TSV St. Otmar St. Gallen');assert.equal(root.querySelectorAll('.qhl-encounters a').length,1);assert.match(root.querySelector('.qhl-facts').textContent,/6/);
 context.tables.QHL=[['<img src=x onerror=alert(1)>',null,0,0,null]];const hostile=parseHTML(run('qhlMapPage()')).document;assert.equal(hostile.querySelectorAll('[onerror]').length,0);
});
test('Map selection and camera are independent per club within the app session',()=>{
 const {context,run}=fixture();run("qhlSession().selected='bern';qhlSession().camera={zoom:9,center:[7.5,46.9]}");context.activeClub='otmar';assert.equal(run('qhlSession().selected'),null);context.activeClub='kadetten';assert.equal(run('qhlSession().selected'),'bern');assert.equal(run('qhlSession().camera.zoom'),9);
});

test('German map labels preserve local-name fallbacks without changing attribution or input data',()=>{
 const {context,run}=fixture();context.style={version:8,sources:{},layers:[{id:'country',layout:{'text-field':['coalesce',['get','name_en'],['get','name']]}}],attribution:'OpenStreetMap'};
 assert.equal(run("qhlLocalisedStyle(style).layers[0].layout['text-field'][1][1]"),'name_de');assert.equal(run("qhlLocalisedStyle(style).layers[0].layout['text-field'][2][1]"),'name');assert.equal(context.style.layers[0].layout['text-field'][1][1],'name_en');assert.equal(run('qhlLocalisedStyle(style).attribution'),'OpenStreetMap');
});
