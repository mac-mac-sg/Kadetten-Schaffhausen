import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {refresh,parseGames,parseTables,fetchNewsPosts} from '../server/update.mjs';
test('Source failures preserve the last valid data',async()=>{const seed=JSON.parse(fs.readFileSync('server/seed.json'));const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};try{const next=await refresh(seed);assert.deepEqual(next.games,seed.games);assert.deepEqual(next.stories,seed.stories);assert.equal(next.status.games.ok,false)}finally{globalThis.fetch=original}});
test('Empty source pages cannot replace valid results',()=>{assert.throws(()=>parseGames('',[]));assert.throws(()=>parseTables(''))});
test('Changed official news image replaces stale remote URL while local assets and missing-image fallback survive',async()=>{
 const seed=JSON.parse(fs.readFileSync('server/seed.json')),original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};
 const link='https://kadettensh.ch/article/',newImage='https://kadettensh.ch/wp-content/uploads/current.jpg';
 const post={id:123,link,title:{rendered:'Artikel'},excerpt:{rendered:'Text'},date:'2026-10-03T10:00:00',_embedded:{'wp:featuredmedia':[{source_url:newImage}]}};
 try{for(const [before,source,expected] of [['https://kadettensh.ch/wp-content/uploads/removed.jpg',newImage,newImage],['news-123.jpg',newImage,'news-123.jpg'],['https://kadettensh.ch/previous.jpg',null,'https://kadettensh.ch/previous.jpg']]){
  seed.stories=[{id:'123',url:link,image:before}];post._embedded['wp:featuredmedia'][0].source_url=source;const next=await refresh(seed,{posts:[post]});assert.equal(next.status.news.ok,true);assert.equal(next.stories[0].image,expected);assert.equal(next.stories[0].id,'123');
 }}finally{globalThis.fetch=original}
});

test('News import uses small media-only pages, retries a transient failure and honours exact page counts',async()=>{
 const urls=[];let first=true;
 const posts=await fetchNewsPosts(async url=>{urls.push(url);const page=Number(new URL(url).searchParams.get('page'));if(first){first=false;return new Response('',{status:500});}return new Response(JSON.stringify(Array.from({length:20},(_,i)=>({id:(page-1)*20+i+1}))),{headers:{'X-WP-TotalPages':'2'}});});
 assert.equal(posts.length,40);assert.equal(urls.length,3);assert.ok(urls.every(url=>new URL(url).searchParams.get('per_page')==='20'&&new URL(url).searchParams.get('_embed')==='wp:featuredmedia'));
});
test('News import rejects permanent failures and repeated pages instead of accepting a partial archive',async()=>{
 let calls=0;await assert.rejects(fetchNewsPosts(async()=>{calls++;return new Response('',{status:403});}),/HTTP 403/);assert.equal(calls,1);
 await assert.rejects(fetchNewsPosts(async()=>new Response(JSON.stringify(Array.from({length:20},(_,i)=>({id:i+1}))),{headers:{'X-WP-TotalPages':'2'}})),/Duplicated news/);
});

test('Bestätigte Endresultate ergänzen den Saisonplan nach Mitternacht und bleiben bei leerem Vereinsresultat erhalten',async()=>{
 const {mergeConfirmedResults}=await import('../server/update.mjs');
 const fixture={id:'508386',date:'2026-10-24',home:'Kadetten Schaffhausen',away:'GC Amicitia Zürich',league:'QHL'};
 const final={...fixture,status:'finished',score:[37,26]};
 const merged=mergeConfirmedResults([fixture],[final]);assert.deepEqual(merged[0].score,[37,26]);assert.equal(fixture.score,undefined);
 for(const change of [{status:'live'},{date:'2026-10-25'},{home:'Fremder Verein'},{away:'Anderer Gegner'},{league:'EHL'},{score:[37,null]}])assert.equal(mergeConfirmedResults([fixture],[{...final,...change}])[0].score,undefined);
 const html=Array.from({length:18},(_,i)=>`<tr class="mc-row" data-gameid="${508386+i}" data-date="2026-10-24T18:00" data-home="Kadetten Schaffhausen" data-away="GC Amicitia Zürich" data-league="QHL" data-venue="BBC Arena" data-city="Schaffhausen"><td>VS</td></tr>`).join('');
 assert.deepEqual(parseGames(html,merged)[0].score,[37,26]);
 assert.equal(parseGames(html.replaceAll('2026-10-24','2026-10-25'),merged)[0].score,undefined,'Verschobene Partie übernimmt kein altes Ergebnis');
 assert.deepEqual(parseGames(html.replaceAll('<td>VS</td>','<td>38:26</td>'),merged)[0].score,[38,26],'Offizielle Korrektur bleibt möglich');
});
