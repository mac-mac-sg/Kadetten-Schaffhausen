import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code = readFileSync('src/kadetten/theme-init.js', 'utf8');
const run = framed => {
  const window = {location: {href: 'https://example.test/app/'}};
  window.self = window;
  window.top = framed ? {location: {replace: url => (window.broke = url)}} : window;
  const documentElement = {dataset: {}, hidden: false};
  vm.runInNewContext(code, {window, document: {documentElement}, localStorage: {getItem: () => null}});
  return {window, documentElement};
};

test('Einbettung: im eigenen Fenster bleibt alles unverändert', () => {
  const {window, documentElement} = run(false);
  assert.equal(window.broke, undefined);
  assert.equal(documentElement.hidden, false);
});

test('Einbettung: in einem fremden Rahmen bricht die Seite aus und blendet sich aus', () => {
  const {window, documentElement} = run(true);
  assert.equal(window.broke, 'https://example.test/app/');
  assert.equal(documentElement.hidden, true);
});
