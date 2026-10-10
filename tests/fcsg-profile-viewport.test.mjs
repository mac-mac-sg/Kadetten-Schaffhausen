import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

test('FCSG profile clearance follows header, dock, viewport and route changes', () => {
  const {document} = parseHTML('<html><body><header class="top"></header><nav class="dock"></nav></body></html>');
  let headerHeight = 82, dockTop = 690, observerCallback, disconnected = 0;
  document.querySelector('.top').getBoundingClientRect = () => ({height: headerHeight});
  document.querySelector('.dock').getBoundingClientRect = () => ({top: dockTop});
  const listeners = new Map();
  const window = {innerHeight: 800, addEventListener: (n, fn) => listeners.set(n, fn), removeEventListener: n => listeners.delete(n)};
  class ResizeObserver { constructor(fn) { observerCallback = fn; } observe() {} disconnect() { disconnected++; } }
  const c = vm.createContext({document, window, ResizeObserver, activeClub: 'fcsg', location: {hash: '#player/6858'}});
  vm.runInContext(fs.readFileSync('src/client/js/router.js', 'utf8'), c);
  c.setupFcsgProfileViewport();
  const value = n => document.documentElement.style.getPropertyValue('--fcsg-profile-' + n);
  assert.equal(value('top'), '82px');
  assert.equal(value('bottom'), '126px');
  assert.ok(document.body.classList.contains('fcsg-profile-mode'));
  headerHeight = 106; dockTop = 660; observerCallback();
  assert.equal(value('top'), '106px');
  assert.equal(value('bottom'), '156px');
  window.innerHeight = 700; dockTop = 600; listeners.get('resize')();
  assert.equal(value('bottom'), '116px');
  c.location.hash = '#season/squad'; c.setupFcsgProfileViewport();
  assert.equal(value('top'), '');
  assert.equal(value('bottom'), '');
  assert.equal(document.body.classList.contains('fcsg-profile-mode'), false);
  assert.ok(disconnected > 0);
  c.location.hash = '#player/7'; c.activeClub = 'kadetten'; c.setupFcsgProfileViewport();
  assert.equal(document.body.classList.contains('fcsg-profile-mode'), false);
});
