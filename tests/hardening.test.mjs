import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import worker from '../server/worker.mjs';
import {wpLink,parseGames} from '../server/update.mjs';

const env={KADETTEN_OWNER_EMAIL:'owner@example.test',KADETTEN_AUTH_PROVIDER:'sites',KADETTEN_SITES_ORIGIN:'https://kadetten.example.chatgpt.site',KADETTEN_UPDATE_KEY_SHA256:createHash('sha256').update('geheim').digest('hex'),BUCKET:{get:async()=>null,put:async()=>{}}};

test('Article links from the feed are limited to https on the club domain',()=>{
  assert.equal(wpLink('https://kadettensh.ch/news/abc/'),'https://kadettensh.ch/news/abc/');
  assert.equal(wpLink('https://www.kadettensh.ch/x'),'https://www.kadettensh.ch/x');
  for(const bad of ['javascript:alert(1)','http://kadettensh.ch/x','https://evil.test/x','https://kadettensh.ch.evil.test/x','https://user:pw@kadettensh.ch/x','not a url',undefined,null])
    assert.equal(wpLink(bad),'https://kadettensh.ch/');
});

test('Malformed article paths are client errors, not storage outages',async()=>{
  const r=await worker.fetch(new Request('https://app.test/api/articles/%E0%A4%A'),env);
  assert.equal(r.status,400);
});

test('Authorised refresh with invalid JSON or a non-object body is rejected with 400',async()=>{
  for(const body of ['{broken','[]','null','"text"']){
    const r=await worker.fetch(new Request('https://app.test/api/refresh',{method:'POST',headers:{'X-Kadetten-Update-Key':'geheim'},body}),env);
    assert.equal(r.status,400,body);
  }
});

test('CSP hash in index.html matches the inline script, so a script edit cannot silently break the app',()=>{
  const html=fs.readFileSync('src/client/index.html','utf8');
  const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  assert.ok(csp,'CSP meta tag missing');
  assert.ok(html.indexOf('Content-Security-Policy')<html.indexOf('<script'),'CSP must precede all scripts');
  assert.match(csp,/connect-src[^;]*https:\/\/kadettensh\.ch/);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0);
  for(const [,code] of scripts)assert.ok(csp.includes("'sha256-"+createHash('sha256').update(code).digest('base64')+"'"),'inline script not covered by CSP');
  assert.match(csp,/object-src 'none'/);assert.match(csp,/base-uri 'self'/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
});

test('Missing and malformed fixture IDs are rejected before replacing saved games',()=>{
  for(const attr of ['', 'data-gameid="bad/id"', 'data-gameid="bad&lt;id"'])
    assert.throws(()=>parseGames('<tr class="mc-row" data-date="2026-10-03T18:00" '+attr+'></tr>',[]),/Game ID schema changed/);
});

test('Alle GitHub Actions sind auf einen Commit fixiert und laufen mit Timeout', () => {
  for (const name of fs.readdirSync('.github/workflows').filter(f => /\.ya?ml$/.test(f))) {
    const text = fs.readFileSync('.github/workflows/' + name, 'utf8');
    const uses = [...text.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)/gm)].map(m => m[1]);
    assert.ok(uses.length > 0, name);
    for (const ref of uses) assert.match(ref, /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, name + ': ' + ref);
    assert.equal((text.match(/^\s{4}runs-on:/gm) || []).length, (text.match(/^\s{4}timeout-minutes:/gm) || []).length, name + ': Timeout je Job');
  }
});
