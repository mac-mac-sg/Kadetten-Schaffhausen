/* V1 editorial news and history audit. Browser overrides match check-games-layout.mjs.
   V1_THEME_FIXTURES_DIR optionally supplies public {club}-data.json snapshots.
   EDITORIAL_SCREENSHOT_DIR optionally saves screenshots; EDITORIAL_ARCHIVE_FILE supplies the 1974 archive photo. */
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
 await ctx.route('**/api/**',async r=>{const url=new URL(r.request().url()),p=url.pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);let d=i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null};if(p==='/api/ehf-reports/chambery'&&process.env.V1_THEME_FIXTURES_DIR&&fs.existsSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json')))d=JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json'),'utf8'));if(p.startsWith('/api/previews/'))d={generator:'daten',headline:'Vorschau auf die nächste Begegnung',paragraphs:Array.from({length:10},()=> 'Die Mannschaft bereitet sich auf die kommende Begegnung vor. Im Mittelpunkt stehen die bestätigten Spielinformationen und der Vergleich der beiden Teams.'),sources:[],generatedAt:now};if(p.includes('/articles/'))d={id:p.split('/').at(-1),version:url.searchParams.get('v'),html:'<h2>Vereinsbericht</h2>'+Array.from({length:30},(_,i)=>'<p>Abschnitt '+(i+1)+': Offizielle Vereinsnachrichten und Informationen zum letzten Spiel. Ein ausführlicher Bericht über die Mannschaft und ihre Vorbereitung.</p>').join('')};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}},now);

 await page.addInitScript(()=>localStorage.setItem('fan-v1-theme','light'));
 const pause=()=>page.waitForTimeout(200);
 async function audit(label){await page.evaluate(axe);const r=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}))}));reports.push({label,...r});assert.equal(r.overflow,false,label);assert.equal(r.h1,1,label);assert.deepEqual(r.violations,[],label);console.log(label+' passed');}

 await ctx.route('https://**/*',r=>r.request().url().includes('/api/')?r.fallback():r.abort());
 if(process.env.EDITORIAL_ARCHIVE_FILE)await ctx.route('**/Mannschaft_74_farbig.jpg',r=>r.fulfill({contentType:'image/jpeg',body:fs.readFileSync(process.env.EDITORIAL_ARCHIVE_FILE)}));
 for(const width of [390,1280])for(const theme of ['light','dark'])for(const club of clubs){
  await page.setViewportSize({width,height:844});
  await page.goto(origin+'/?club='+club+'#home');await page.waitForTimeout(300);
  await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').setChecked(theme==='light');await page.locator('[data-close-clubs]').click();
  assert.equal(await page.locator('.news-featured').count(),1);
  const first=await page.locator('.news-featured .v1-news-image').boundingBox(),next=await page.locator('.news-compact .v1-news-image').first().boundingBox();
  assert.ok(first.width>next.width*2,'Lead photograph is visually distinct');
  for(const copy of await page.locator('.v1-news-copy').all())assert.ok(await copy.evaluate(e=>{const a=e.querySelector(':scope > .v1-news-arrow').getBoundingClientRect(),t=e.querySelector('h2').getBoundingClientRect();return Math.abs(a.bottom-t.bottom)<1&&a.left>=t.right;}),'Arrow stays alongside complete title');
  await audit(width+' '+theme+' '+club+' news');
  if(process.env.EDITORIAL_SCREENSHOT_DIR&&width===390&&theme==='light'&&club==='kadetten'){await page.locator('.news-featured').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.EDITORIAL_SCREENSHOT_DIR,'editorial-news.png')});await page.locator('.news-compact').first().evaluate(e=>scrollTo({top:e.getBoundingClientRect().top+scrollY-100,behavior:'instant'}));await page.screenshot({path:path.join(process.env.EDITORIAL_SCREENSHOT_DIR,'editorial-news-list.png')});}
  await page.locator('.news-compact a').first().click();await page.waitForTimeout(100);assert.match(new URL(page.url()).hash,/#news\//);
  await page.goto(origin+'/?club='+club+'#club');await page.waitForTimeout(200);
  assert.equal(await page.locator('.club-editorial').count(),1);assert.equal(await page.locator('.fcsg-history-mark').count(),0);
  await page.locator('.club-home-photo').scrollIntoViewIfNeeded();await page.locator('.club-home-photo img').evaluate(e=>e.decode());
  assert.equal(await page.locator('.club-home-photo img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
  const target=page.locator('.club-years button').nth(1);await target.scrollIntoViewIfNeeded();await target.click();await page.waitForTimeout(700);
  assert.match(await page.evaluate(()=>document.activeElement.id),/^club-chapter-title-/);
  await audit(width+' '+theme+' '+club+' history');
  if(process.env.EDITORIAL_SCREENSHOT_DIR&&width===390&&theme==='light'&&club==='kadetten')await page.screenshot({path:path.join(process.env.EDITORIAL_SCREENSHOT_DIR,'editorial-history.png')});
 }
 await page.goto(origin+'/v2/?club=kadetten#home');await page.waitForTimeout(200);assert.equal(await page.locator('.news-featured,.news-compact').count(),0);
 await page.goto(origin+'/v2/?club=otmar#club');await page.waitForTimeout(200);assert.equal(await page.locator('.club-editorial,.club-home-photo').count(),0);assert.ok(await page.locator('.fcsg-history-mark').count()>0);
 assert.deepEqual(errors,[]);console.log(reports.length+' editorial accessibility checks passed; V2 preserved. External archive images blocked in this offline fixture.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
