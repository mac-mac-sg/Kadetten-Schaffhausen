/* Optional navigation, reading and loading audit. Browser overrides match check-games-layout.mjs.
   V1_THEME_FIXTURES_DIR optionally supplies public {club}-data.json snapshots. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'dist/client'),clubs=['kadetten','fcsg','otmar'],now='2026-10-14T12:30:00Z',seed=vm.createContext({});
for(const f of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync(path.join(root,'src/client/data/'+f+'.js'),'utf8'),seed);
const data=process.env.V1_THEME_FIXTURES_DIR?clubs.map(c=>JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,c+'-data.json'),'utf8'))):vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed);
for(const d of data){d.checkedAt=now;for(const s of Object.values(d.status||{})){s.ok=true;s.updatedAt=now;}}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://local'),f=path.resolve(dir,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!f.startsWith(dir+path.sep))throw Error();const content=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
let browser;const reports=[],errors=[];
try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 const ctx=await browser.newContext({serviceWorkers:'block',reducedMotion:'no-preference',hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/api/**',async r=>{const url=new URL(r.request().url()),p=url.pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);let d=i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null};if(p==='/api/ehf-reports/chambery'&&process.env.V1_THEME_FIXTURES_DIR&&fs.existsSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json')))d=JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json'),'utf8'));if(p.includes('/articles/'))d={id:p.split('/').at(-1),version:url.searchParams.get('v'),html:'<h2>Vereinsbericht</h2>'+Array.from({length:30},(_,i)=>'<p>Abschnitt '+(i+1)+': Offizielle Vereinsnachrichten und Informationen zum letzten Spiel. Ein ausführlicher Bericht über die Mannschaft und ihre Vorbereitung.</p>').join('')};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}},now);

 await page.addInitScript(()=>localStorage.setItem('fan-v1-theme','light'));
 const pause=()=>page.waitForTimeout(200);
 async function go(club,route='#home'){await page.goto(origin+'/?club='+club+route);await page.waitForTimeout(700);}
 async function nav(route){await page.locator('.dock a[href="'+route+'"]').click();await pause();}
 async function audit(label){await page.evaluate(axe);const r=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}))}));reports.push({label,...r});assert.equal(r.overflow,false,label);assert.equal(r.h1,1,label);assert.deepEqual(r.violations,[],label);console.log(label+' passed');}
 for(const club of clubs){
  await go(club,'#season/games');
  const current=page.locator('.game-timeline .current-game');assert.equal(await current.count(),1);
  const original=await page.evaluate(()=>scrollY);assert.ok(original>0,'First visit centres next game');
  await page.evaluate(()=>scrollTo(0,300));await nav('#season/table');await nav('#season/games');assert.ok(Math.abs(await page.evaluate(()=>scrollY)-300)<2,club+' list returns to saved position');
  assert.equal(await page.locator('[data-game-jump],.game-jumps').count(),0,club+' removes jump buttons');
  const markers=await current.evaluate(e=>({before:e.previousElementSibling?.dataset.gamePeriod,after:e.nextElementSibling?.dataset.gamePeriod}));assert.deepEqual(markers,{before:'past',after:'upcoming'},club+' dividers surround current game');
  await page.evaluate(()=>scrollTo(0,0));await pause();assert.equal(await page.locator('#return-current-game').isVisible(),true);await page.locator('#return-current-game').click();await page.waitForTimeout(600);
  const rect=await current.boundingBox();assert.ok(rect.y>100&&rect.y+rect.height<780,club+' current game remains fully visible');
  if(process.env.GAME_DIVIDER_SCREENSHOT&&club==='kadetten')await page.screenshot({path:process.env.GAME_DIVIDER_SCREENSHOT});
  await page.locator('[data-mode="calendar"]').click();await page.locator('#next-month').click();const month=await page.locator('.calendar-head h2').textContent();
  await nav('#season/table');await nav('#season/games');assert.equal(await page.locator('[data-mode="calendar"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.calendar-head h2').textContent(),month);
  await page.locator('[data-mode="list"]').click();await page.locator('#competition').selectOption({index:1});const league=await page.locator('#competition').inputValue();await nav('#season/squad');await nav('#season/games');assert.equal(await page.locator('#competition').inputValue(),league);
  await audit(club+' game list');
  await nav('#home');await page.evaluate(()=>scrollTo(0,620));await pause();const y=await page.evaluate(()=>scrollY);
  await page.locator('.v1-news-link').first().evaluate(e=>e.click());await page.waitForSelector('.article-fulltext[aria-busy="false"]');await page.waitForTimeout(200);
  await page.evaluate(()=>scrollTo(0,900));await pause();await page.goBack();await pause();assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2,club+' back from article keeps reading position');
  await page.goForward();await pause();assert.ok(Math.abs(await page.evaluate(()=>scrollY)-900)<2,club+' article remembers position');
  await page.locator('#club-settings').click();await page.locator('[data-v1-text-size]').selectOption('large');await page.locator('[data-close-clubs]').click();assert.equal(await page.locator('.article-fulltext').evaluate(e=>getComputedStyle(e).fontSize),'20px');await audit(club+' large article');
 }
 await go('kadetten');await page.evaluate(()=>scrollTo(0,500));await pause();const saved=await page.evaluate(()=>scrollY);await page.locator('[data-compact-clubs]').click();await page.locator('[data-compact-pick="fcsg"]').click();await pause();await page.evaluate(()=>scrollTo(0,250));await pause();await page.locator('[data-compact-clubs]').click();await page.locator('[data-compact-pick="kadetten"]').click();await pause();assert.ok(Math.abs(await page.evaluate(()=>scrollY)-saved)<2,'Club-specific reading position');
 // Incoming data must not replace the list while the reader is below the first card.
 for(const [i,club] of clubs.entries()){
  await go(club);await page.evaluate(()=>scrollTo(0,500));await pause();const readingY=await page.evaluate(()=>scrollY),oldTitle=await page.locator('.v1-news-copy h2').first().textContent();data[i].stories=[{...data[i].stories[0],id:'comfort-new-'+club,title:'Neue Nachricht für den Lesetest'},...data[i].stories];
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await pause();assert.equal(await page.locator('.v1-news-copy h2').first().textContent(),oldTitle);assert.equal(await page.locator('#new-stories').isVisible(),true);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-readingY)<2);await page.locator('#new-stories').click();await pause();assert.match(await page.locator('.v1-news-copy h2').first().textContent(),/Neue Nachricht/);assert.equal(await page.evaluate(()=>scrollY),0);await audit(club+' deferred news');
 }
 await go('kadetten');
 // Slow first article load has a static placeholder, a busy state, and readable status.
 await ctx.route('**/api/articles/**',async route=>{await page.waitForTimeout(1400);await route.fulfill({status:503,contentType:'application/json',body:'{}'});});
 await page.locator('.v1-news-link').first().click();assert.equal(await page.locator('.article-fulltext').getAttribute('aria-busy'),'true');assert.equal(await page.locator('.article-placeholder').count(),1);await audit('article loading');await page.waitForSelector('#retry-article');assert.equal(await page.locator('.article-fulltext').getAttribute('aria-busy'),'false');await audit('article retry');
 await page.setViewportSize({width:1280,height:900});await nav('#season/games');await audit('desktop games');await page.locator('#club-settings').click();await audit('desktop settings');await page.locator('[data-close-clubs]').click();
 await page.setViewportSize({width:390,height:844});await page.locator('#club-settings').click();await audit('mobile settings');await page.locator('[data-close-clubs]').click();
 assert.deepEqual(errors,[]);if(process.env.VIEW_COMFORT_REPORT)fs.writeFileSync(process.env.VIEW_COMFORT_REPORT,JSON.stringify({reports,errors},null,2));console.log(reports.length+' comfort/accessibility checks passed.');await ctx.close();
}finally{await browser?.close();await new Promise(r=>server.close(r));}
