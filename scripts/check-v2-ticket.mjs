/* Optional browser regression after build:pages; fixtures never touch production data. */
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
  for (const style of ['arena','curve']) for (const club of ['kadetten','fcsg','otmar']) for (const theme of ['light','dark']) for (const state of ['preview','live','post']) scenarios.push({club,theme,state,style,width:390});
  for (const style of ['arena','curve']) for (const width of [320,1440]) for (const theme of ['light','dark']) scenarios.push({club:'otmar',theme,state:'preview',style,width});
  for (const scenario of scenarios) {
    const {club,theme,state,style,width} = scenario, index = ['kadetten','fcsg','otmar'].indexOf(club), now = '2026-10-25T12:00:00Z';
    const data = structuredClone(originals[index]);
    const game = {...data.games.find(g => g.league !== 'Testspiel'), id:'12345', home:names[index], away:'GC Amicitia Zürich', date:state==='preview'?'2026-10-31':'2026-10-25', time:'19:15', confirmed:true, score:state==='post'?[31,29]:null, league:club==='fcsg'?'Super League':'QHL'};
    data.games = [game]; data.checkedAt = now;
    const live = state==='live'?{...game, live:true, liveScore:[12,10], score:[12,10], phase:'2. Halbzeit', clock:'42:10'}:null;
    const ctx = await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce',bypassCSP:true});
    await ctx.addInitScript(({now,theme,style}) => {
      const D=Date; window.Date=class extends D {constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};
      localStorage.setItem('v2:fan-v1-theme',theme);
      if(!localStorage.getItem('v2:fan-v2-header-style'))localStorage.setItem('v2:fan-v2-header-style',style);
      for(const prefix of ['','v2:']) for(const key of ['fan-app-onboarding-v1','fan-app-install-intro-v1'])localStorage.setItem(prefix+key,'seen');
    },{now,theme,style});
    await ctx.route('**/api/**', async r => {
      const p = new URL(r.request().url()).pathname;
      const body = p.endsWith('/data') ? data : {ok:true,checkedAt:now,match:live,finished:null};
      await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    await ctx.route('https://**/*', async r => {
      if (new URL(r.request().url()).pathname.startsWith('/api/')) return r.fallback();
      if (r.request().resourceType()==='image')return r.fulfill({status:200,contentType:'image/webp',body:fs.readFileSync('src/client/assets/bbc-arena-hall.webp')});
      return r.abort();
    });
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/v2/?club='+club+'#home');
    await page.waitForSelector('#v2-match-ticket');
    if(state==='live')await page.waitForFunction(()=>document.querySelector('#v2-match-ticket').classList.contains('is-live'));
    await page.waitForFunction(expected=>document.querySelector('#v2-match-ticket [data-v2-score]')?.textContent===expected,state==='live'?'12:10':state==='post'?'31:29':'19:15');
    await page.waitForTimeout(120);
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    assert.equal(await page.locator('html').getAttribute('data-v2-header'),style);
    assert.equal(await page.locator('.v2-hero-curve').isVisible(),style==='curve');
    assert.match(await page.locator('.v2-hero-media img').getAttribute('src'),new RegExp(['bbc-arena-hall','fcsg-stadium','otmar-kreuzbleiche'][index]));
    await page.waitForFunction(()=>document.querySelector('.v2-hero-media img')?.naturalWidth>0);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('.v1-match-action,.v2-glance').count(),0);
    assert.equal(await page.locator('#v2-match-ticket a,#v2-match-ticket button,#v2-match-ticket .v2-ticket-arrow').count(),0);
    const positions = await page.locator('.v2-ticket-matchup').evaluate(e=>[...e.children].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
    assert.ok(positions[0].x+positions[0].width<=positions[1].x&&positions[1].x+positions[1].width<=positions[2].x,'Teams flank the time/score horizontally');
    assert.ok(Math.abs(positions[0].y-positions[2].y)<1,'Both teams start at the same height');
    const geometry=await page.locator('#v2-match-ticket').evaluate(e=>{
      const r=e.getBoundingClientRect(),top=document.querySelector('.top').getBoundingClientRect(),news=document.querySelector('.home-news-heading').getBoundingClientRect();
      return {height:r.height,top:r.top,headerBottom:top.bottom,newsTop:news.top,overflow:document.documentElement.scrollWidth>innerWidth,background:getComputedStyle(e).backgroundColor};
    });
    assert.ok(!geometry.overflow,JSON.stringify(scenario)+' overflows');
    assert.ok(geometry.top>=geometry.headerBottom-1,'Ticket clears the header: '+JSON.stringify({scenario,geometry}));
    assert.ok(geometry.height<220,'Compact ticket grows only for necessary wrapping');
    assert.ok(await page.locator('.v2-ticket-time').evaluate(e=>e.querySelector('strong').getBoundingClientRect().right<=e.getBoundingClientRect().right+1),'Time and score stay inside their column '+JSON.stringify(scenario));
    assert.equal(await page.locator('.v1-news-card').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','News keeps one surface');
    assert.ok(geometry.newsTop>=geometry.top+geometry.height,'News follows the ticket');
    const score=await page.locator('[data-v2-score]').first().textContent();
    assert.equal(score,state==='live'?'12:10':state==='post'?'31:29':'19:15');
    await page.addScriptTag({content:axe});
    const violations=await page.evaluate(async()=> (await axe.run(document,{rules:{'region':{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[],JSON.stringify(scenario));
    if(state==='preview'&&width===390) {
      await page.screenshot({path:'/tmp/v2-header-'+club+'-'+style+'-'+theme+'.png',fullPage:false});
      await page.evaluate(()=>window.headerTestTicket=document.getElementById('v2-match-ticket'));
      await page.locator('#club-settings').click();
      const select=page.locator('[data-v2-header-style]');
      assert.equal(await select.count(),1);
      const other=style==='arena'?'curve':'arena';
      await select.selectOption(other);
      assert.equal(await page.locator('html').getAttribute('data-v2-header'),other);
      assert.ok(await page.evaluate(()=>window.headerTestTicket===document.getElementById('v2-match-ticket')),'Switching preserves the match link');
      assert.equal(await page.evaluate(()=>localStorage.getItem('fan-v2-header-style')),null,'V1 storage remains untouched');
      const settingsViolations=await page.evaluate(async()=> (await axe.run(document,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
      assert.deepEqual(settingsViolations,[],'Header selector accessibility');
      await page.locator('[data-close-clubs]').click();
      await page.reload();
      await page.waitForSelector('#v2-match-ticket');
      assert.equal(await page.locator('html').getAttribute('data-v2-header'),other,'Selection survives reload');
      await page.locator('#club-settings').click();
      await page.locator('[data-v2-header-style]').selectOption(style);
      await page.locator('[data-close-clubs]').click();
      if(club==='kadetten'&&theme==='light'&&style==='arena') {
        await page.locator('.v2-hero-media img').evaluate(img=>img.src='assets/unavailable-test-photo.webp');
        await page.waitForFunction(()=>document.querySelector('.v2-hero-media').classList.contains('v2-media-missing'));
        assert.ok(await page.locator('#v2-match-ticket').isVisible(),'Match remains usable without the background image');
      }
    }
    await page.locator('#v2-match-ticket').click({position:{x:16,y:16}});await page.waitForTimeout(150);
    assert.match(new URL(page.url()).hash,/#match\/12345\//);
    reports.push({...scenario,...geometry});await ctx.close();
  }
  assert.deepEqual(errors,[]);
  // Main version retains its approved card and does not load the new ticket.
  const page=await browser.newPage();await page.addInitScript(()=>{localStorage.setItem('fan-app-onboarding-v1','seen');localStorage.setItem('fan-app-install-intro-v1','seen');});await page.goto(origin+'/#home');await page.waitForSelector('#live-match');assert.equal(await page.locator('#v2-match-ticket').count(),0);await page.locator('#club-settings').click();assert.equal(await page.locator('[data-v2-header-style]').count(),0);await page.close();
  console.log(JSON.stringify({checks:reports.length,errors,reports},null,2));
} finally {await browser?.close();await new Promise(r=>server.close(r));}
