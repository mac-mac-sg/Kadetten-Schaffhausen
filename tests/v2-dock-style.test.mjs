import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('src/client/v2/matchday.css', 'utf8');
const rule = selector => {
  const start = css.indexOf(selector + ' {');
  assert.ok(start >= 0, `Missing navigation rule: ${selector}`);
  return css.slice(start, css.indexOf('}', start));
};
const dock = "html[data-preview='v2'][data-theme] body > .dock.v2-orbit-dock";

test('V2 navigation frosts the complete masked surface and keeps its active circle inside the menu', () => {
  const surface = rule(dock + '::before');
  assert.match(surface, /top:0;/);
  assert.match(rule("html[data-preview='v2'][data-theme='dark'] body > .dock.v2-orbit-dock"), /--v2-dock-surface:color-mix\(in srgb,var\(--surface\) 92%,#fff\)/);
  assert.match(surface, /var\(--v2-dock-surface\)/);
  assert.match(surface, /background:color-mix\([^;]*transparent\)/);
  assert.match(surface, /backdrop-filter:blur\(16px\)/);
  assert.match(surface, /-webkit-backdrop-filter:blur\(16px\)/);
  // A separate mask band extends the same glass material through the safe area.
  assert.match(surface, /linear-gradient\(#000 0 0\) center 70px/);
  const circle = rule(dock + ' a::before');
  assert.match(circle, /top:0;/);
  // A clip-path on an ancestor would prevent the glass from sampling page content.
  assert.match(rule(dock), /clip-path:none;/);
  assert.match(rule(dock), /overflow:hidden;/);
  assert.match(css, /@supports not \(\(backdrop-filter:/);
});
