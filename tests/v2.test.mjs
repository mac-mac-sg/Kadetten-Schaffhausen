import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
test('V2 marks the preview without replacing V1 renderers, theme or behaviour',()=>{
 const {document}=parseHTML('<html><body></body></html>');
 const original=()=> 'shared V1';
 const context=vm.createContext({document,home:original,fcsgHome:original,matchOverview:original,setupViews:original,clubPage:original,fcsgClubPage:original});
 vm.runInContext(fs.readFileSync('src/client/v2/design.js','utf8'),context);
 assert.equal(document.documentElement.dataset.preview,'v2');
 assert.equal(document.documentElement.dataset.design,undefined);
 for(const name of ['home','fcsgHome','matchOverview','setupViews','clubPage','fcsgClubPage'])assert.equal(context[name],original,name);
 assert.equal(fs.readFileSync('src/client/v2/design.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'').trim(),'');
});
test('Original source shell does not load experimental design',()=>{
 assert.doesNotMatch(fs.readFileSync('src/client/index.html','utf8'),/v2\/design/);
});
