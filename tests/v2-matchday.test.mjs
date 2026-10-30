import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync('src/client/v2/matchday.css', 'utf8');
const mapCss = fs.readFileSync('src/client/v2/qhl-map.css', 'utf8');
const js = fs.readFileSync('src/client/v2/matchday.js', 'utf8');
const rule = (source, selector) => source.split('\n').filter(line => line.includes(selector)).join('\n');

test('V2 text never drops below 12 px (the MapLibre attribution control is third-party)', () => {
  for (const [name, source] of [['matchday.css', css], ['qhl-map.css', mapCss]]) {
    const small = source.split('\n').filter(line => !line.includes('maplibregl-ctrl-attrib') && /font(-size)?:\s*(?:[0-9]+ )?(?:[0-9.]+\/[0-9.]+\s+)?(?:[0-9]|1[01])(\.[0-9]+)?px\b/.test(line.replace(/font:[^;]*?(\d+)px\/[^;]*/g, 'font: $1px')));
    assert.deepEqual(small.map(line => line.slice(0, 90)), [], name + ' has text below 12 px');
  }
});

test('Masthead link is a 44 px touch target', () => {
  assert.match(rule(css, ".v2-masthead { display:inline-flex"), /min-height:44px/);
});

test('Share button keeps clear of the pulled-up sticky match bar', () => {
  const bar = fs.readFileSync('src/client/v1-theme.css', 'utf8').match(/\.match-sticky-bar \{[^}]*margin-top:\s*-(\d+)px/);
  const share = css.match(/\.v2-share-inline \{[^}]*margin:\s*\d+px auto (\d+)px/);
  assert.ok(bar && share, 'both rules exist');
  assert.ok(Number(share[1]) >= Number(bar[1]), 'bottom margin covers the sticky bar overlap');
});

test('Share button is restored after live updates replace the match header', () => {
  const tick = js.match(/function v2Tick\(\) \{[\s\S]*?\n\}/)[0];
  assert.match(tick, /v2AddShareButton\(\)/);
  assert.match(js, /function v2AddShareButton\(\)/);
});

test('Missing crest badges stay readable on the dark magazine cover', () => {
  assert.match(css, /\.v2-magazine-cover :is\(\.clubmark,\.v2-crest-fallback,\.v1-image-fallback\.crest\) \{ background:#ffffff26; color:#fff; \}/);
});

test('The temporary download link of the result image is hidden from assistive technology', () => {
  assert.match(js, /link\.download = file\.name;\s*link\.hidden = true;/);
});
