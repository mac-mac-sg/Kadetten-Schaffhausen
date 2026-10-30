/* Optional browser regression after build:pages; fixtures never touch production data.
   Magazine cover ticket of V2 in every match state, the live bar, the result share button and a11y. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {chromium} = await import(process.env.GAMES_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist/client'), seed = vm.createContext({});
for (const f of ['fallback', 'fcsg-fallback', 'otmar-fallback']) vm.runInContext(fs.readFileSync('src/client/data/' + f + '.js', 'utf8'), seed);
const originals = vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]', seed);
const names = ['Kadetten Schaffhausen', 'FC St.Gallen 1879', 'TSV St. Otmar St. Gallen'];
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const server = http.createServer((req,res) => {
  try {
    const pathname = new URL(req.url, 'http://local').pathname;
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    assert.ok(file.startsWith(root + path.sep));
    const content = fs.readFileSync(file);
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'}); res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
let browser;
const errors = [], reports = [];
try {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless:true, executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE, args:['--no-sandbox','--disable-dev-shm-usage']});
  const axe = fs.readFileSync(process.env.GAMES_AXE_SCRIPT, 'utf8');
  const scenarios = [];
  for (const club of ['kadetten', 'fcsg', 'otmar']) for (const theme of ['light', 'dark']) for (const state of ['preview', 'soon', 'matchday', 'live', 'post']) scenarios.push({club, theme, state, width: 390});
  for (const width of [320, 1440]) for (const theme of ['light', 'dark']) scenarios.push({club: 'otmar', theme, state: 'preview', width});
  const expected = {
    preview: {day: 'Nächstes Spiel in 6 Tagen', effect: 'calm', score: '19:15', footer: '31.10.2026', action: 'Zur Vorschau'},
    soon: {day: 'Nächstes Spiel morgen', effect: 'soon', score: '10:00', footer: '26.10.2026', action: 'Zur Vorschau'},
    matchday: {day: 'Heute ist Matchday', effect: 'matchday', score: '19:15', footer: '25.10.2026', action: 'Zur Vorschau'},
    live: {day: 'Jetzt live', effect: 'live', score: '12 : 10', footer: '25.10.2026', action: 'Zum Liveticker'},
    post: {day: 'Heute gespielt', effect: 'result', score: '31 : 29', footer: '25.10.2026', action: 'Zum Rückblick'}
  };
  for (const scenario of scenarios) {
    const {club, theme, state, width} = scenario, index = ['kadetten', 'fcsg', 'otmar'].indexOf(club), now = '2026-10-25T12:00:00Z', want = expected[state];
    const data = structuredClone(originals[index]);
    const game = {...data.games.find(g => g.league !== 'Testspiel'), id: '12345', home: names[index], away: 'GC Amicitia Zürich', date: state === 'preview' ? '2026-10-31' : state === 'soon' ? '2026-10-26' : '2026-10-25', time: state === 'soon' ? '10:00' : '19:15', confirmed: true, score: state === 'post' ? [31, 29] : null, league: club === 'fcsg' ? 'Super League' : 'QHL'};
    data.games = [game]; data.checkedAt = now;
    const live = state === 'live' ? {...game, live: true, liveScore: [12, 10], score: [12, 10], phase: '2. Halbzeit', clock: '42:10'} : null;
    const ctx = await browser.newContext({viewport: {width, height: 844}, serviceWorkers: 'block', reducedMotion: 'reduce', bypassCSP: true, acceptDownloads: true});
    await ctx.addInitScript(({now, theme}) => {
      const D = Date; window.Date = class extends D {constructor(...a) {super(...(a.length ? a : [now]));} static now() {return D.parse(now);}};
      localStorage.setItem('v2:fan-v1-theme', theme);
      for (const prefix of ['', 'v2:']) for (const key of ['fan-app-onboarding-v1', 'fan-app-install-intro-v1']) localStorage.setItem(prefix + key, 'seen');
    }, {now, theme});
    await ctx.route('**/api/**', async r => {
      const p = new URL(r.request().url()).pathname;
      await r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(p.endsWith('/data') ? data : {ok: true, checkedAt: now, match: live, finished: null})});
    });
    await ctx.route('https://**/*', async r => {
      if (new URL(r.request().url()).pathname.startsWith('/api/')) return r.fallback();
      if (r.request().resourceType() === 'image') return r.fulfill({status: 200, contentType: 'image/webp', body: fs.readFileSync('src/client/assets/bbc-arena-hall.webp')});
      return r.abort();
    });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(club + ' ' + state + ': ' + e.message));
    const axeViolations = async () => { await page.addScriptTag({content: axe}); return page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations.map(v => v.id + ' ' + v.nodes[0].target.join(' '))); };
    await page.goto(origin + '/v2/?club=' + club + '#home');
    await page.waitForSelector('#v2-match-ticket');
    if (state === 'live') await page.waitForFunction(() => document.querySelector('#v2-match-ticket').classList.contains('is-live'));
    await page.waitForFunction(score => document.querySelector('#v2-match-ticket [data-v2-score]')?.textContent === score, want.score);
    const tag = JSON.stringify(scenario);
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    assert.equal(await page.locator('.v2-ticket-day').textContent(), want.day, tag);
    assert.equal(await page.locator('#v2-match-ticket').getAttribute('data-effect'), want.effect, tag);
    assert.match(await page.locator('.v2-cover-action').textContent(), new RegExp(want.action), tag);
    assert.match(await page.locator('.v2-ticket-footer').textContent(), new RegExp(want.footer.replaceAll('.', '\\.')), tag);
    assert.equal(await page.locator('h1').count(), 1, tag);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + ' overflows');
    assert.match(await page.locator('.v2-hero-media img').getAttribute('src'), new RegExp(['news-34268', 'v2-header-fcsg-evening', 'v2-header-otmar-heart'][index]), tag);
    // Readable metadata: at least 12 px, as for every V2 text.
    for (const selector of ['.v2-cover-kicker', '.v2-ticket-heading', '.v2-ticket-day', '.v2-ticket-league', '.v2-ticket-footer', '.v2-cover-action'])
      assert.ok(await page.locator(selector).first().evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 12), tag + ' ' + selector + ' is at least 12 px');
    assert.ok((await page.locator('.v2-masthead').boundingBox()).height >= 44, tag + ' masthead is a 44 px target');
    const rim = () => page.locator('#v2-match-ticket').evaluate(e => ({animation: getComputedStyle(e, '::after').animationName, pointer: getComputedStyle(e, '::after').pointerEvents}));
    assert.equal((await rim()).animation, 'none', 'Reduced motion keeps the ticket static');
    assert.equal((await rim()).pointer, 'none');
    assert.deepEqual(await axeViolations(), [], tag + ' axe');
    // A missing crest falls back to a readable badge on the dark cover.
    if (width === 390 && theme === 'light') {
      await page.locator('.v2-cover-crests img').first().evaluate(img => img.dispatchEvent(new Event('error')));
      const badge = page.locator('.v2-magazine-cover .v2-crest-fallback').first();
      if (await badge.count()) assert.ok(await badge.evaluate(e => getComputedStyle(e).color === 'rgb(255, 255, 255)'), tag + ' crest fallback is light on the dark cover');
    }
    if (state === 'live') {
      await page.evaluate(() => { location.hash = '#season/games'; });
      await page.waitForSelector('#v2-livebar:not([hidden])');
      const bar = await page.locator('#v2-livebar').evaluate(e => ({label: e.getAttribute('aria-label'), height: e.getBoundingClientRect().height, bottom: e.getBoundingClientRect().bottom, dock: document.querySelector('.dock').getBoundingClientRect().top}));
      assert.match(bar.label, /12 : 10/); assert.ok(bar.height >= 44 && bar.bottom <= bar.dock, tag + ' live bar sits above the navigation');
      await page.evaluate(() => { location.hash = '#home'; });
      await page.waitForSelector('#v2-match-ticket');
    }
    await page.locator('#v2-match-ticket').click({position: {x: 16, y: 16}}); await page.waitForTimeout(250);
    assert.match(new URL(page.url()).hash, /#match\/12345\//, tag);
    assert.equal(await page.locator('h1').count(), 1, tag + ' match page');
    if (width === 390) {
      await page.waitForSelector(state === 'post' ? '#app .match-top, #app .fcsg-match-header' : '#app .match');
      const share = page.locator('[data-v2-share]');
      if (state === 'post') {
        // The button must exist for every club, even after live updates replaced the header, and must not sit under the sticky bar.
        await share.waitFor({timeout: 5000});
        assert.ok(await share.evaluate(b => { const r = b.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; }), tag + ' share button is not covered');
        assert.ok((await share.boundingBox()).height >= 44, tag + ' share button is a 44 px target');
        const download = page.waitForEvent('download', {timeout: 8000});
        await share.click();
        assert.equal((await download).suggestedFilename(), 'resultat-2026-10-25.jpg', tag);
      } else assert.equal(await share.count(), 0, tag + ' share only after the game');
      assert.deepEqual(await axeViolations(), [], tag + ' match page axe');
    }
    reports.push(scenario); await ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({checks: reports.length, errors}));
} finally {await browser?.close(); await new Promise(r => server.close(r));}
