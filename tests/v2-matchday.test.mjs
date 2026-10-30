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

test('V2 compact identity overlays the outgoing header without a negative tab margin or a large share spacer', () => {
  assert.match(css, /\.match-sticky-bar \{ top:calc\(var\(--v1-content-top,68px\) \+ 56px\); margin-top:0;/);
  assert.match(css, /\.match-compact-header \{ position:absolute; inset:auto 0 100%; width:100%; \}/);
  assert.match(css, /\.v2-share-inline \{ display: flex; margin: 12px auto 0;/);
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

test('V2 neutralises V1 surfaces that leak in through html:not([data-design=v2])', () => {
  // Table cells, magazine news frames and the match tab border came from V1 rules and hugged the text.
  assert.match(css, /\.table-wrap \.standings-table tbody tr > \* \{ background:transparent; \}/);
  assert.match(css, /\.table-wrap \.standings-table thead th \{ background:transparent; \}/);
  assert.match(css, /\.v2-magazine \.v1-news-grid \.v1-news-link \{ border:0; overflow:visible; \}/);
  assert.match(css, /\.match-tabs\.segments \{ border-width:0 0 1px; \}/);
  assert.match(css, /#app :is\(\.notice,\.club-title-panel\) \{ padding-inline:16px; \}/);
});

test('Text keeps its distance from edges on narrow phones and desktop', () => {
  assert.match(css, /#app\.v2-detail \.match-hero > div \{ left:22px; right:22px; \}/, 'match preview hero text');
  assert.match(css, /\.player-card b \{ bottom:100%;/, 'squad number above long names');
  assert.match(css, /\.settings-app-info \{ flex-wrap:wrap;/, 'settings data stamp wraps');
  assert.match(css, /\.profile-back \{ left:max\(16px,calc\(\(100vw - 600px\) \/ 2 \+ 16px\)\); \}/, 'profile back link inside the 600 px column');
  assert.match(css, /\.scoreline \.clubmark \{ width:auto; min-width:30px;/, 'three-letter badges');
});

test('Club switcher never truncates the club name', () => {
  const fit = js.match(/function v2FitClubLabel\(\) \{[\s\S]*?\n\}/)[0];
  assert.match(fit, /club\.title/); assert.match(fit, /club\.short/); assert.match(fit, /v2-club-crest-only/);
  assert.match(js.match(/function v2MagazineChrome\(\) \{[\s\S]*?\n\}/)[0], /v2FitClubLabel\(\)/);
  assert.match(css, /\.compact-club-trigger\.v2-club-crest-only > span \{ display:none; \}/);
});
