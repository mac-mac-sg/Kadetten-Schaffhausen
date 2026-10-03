import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {refresh,parseGames,parseTables} from '../server/update.mjs';
test('Source failures preserve the last valid data',async()=>{const seed=JSON.parse(fs.readFileSync('server/seed.json'));const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};try{const next=await refresh(seed);assert.deepEqual(next.games,seed.games);assert.deepEqual(next.stories,seed.stories);assert.equal(next.status.games.ok,false)}finally{globalThis.fetch=original}});
test('Empty source pages cannot replace valid results',()=>{assert.throws(()=>parseGames('',[]));assert.throws(()=>parseTables(''))});
