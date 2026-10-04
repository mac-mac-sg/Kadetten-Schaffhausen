import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {refresh,parseGames,parseTables} from '../server/update.mjs';
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
