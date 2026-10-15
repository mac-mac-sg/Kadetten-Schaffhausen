/* Optional collapsing match-header audit. Browser overrides match check-games-layout.mjs.
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
 await ctx.route('**/api/**',async r=>{const url=new URL(r.request().url()),p=url.pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);let d=i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null};if(p==='/api/ehf-reports/chambery'&&process.env.V1_THEME_FIXTURES_DIR&&fs.existsSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json')))d=JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json'),'utf8'));if(p.startsWith('/api/previews/'))d={generator:'daten',headline:'Vorschau auf die nächste Begegnung',paragraphs:Array.from({length:10},()=> 'Die Mannschaft bereitet sich auf die kommende Begegnung vor. Im Mittelpunkt stehen die bestätigten Spielinformationen und der Vergleich der beiden Teams.'),sources:[],generatedAt:now};if(p.includes('/articles/'))d={id:p.split('/').at(-1),version:url.searchParams.get('v'),html:'<h2>Vereinsbericht</h2>'+Array.from({length:30},(_,i)=>'<p>Abschnitt '+(i+1)+': Offizielle Vereinsnachrichten und Informationen zum letzten Spiel. Ein ausführlicher Bericht über die Mannschaft und ihre Vorbereitung.</p>').join('')};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}},now);

 await page.addInitScript(()=>localStorage.setItem('fan-v1-theme','light'));
 const pause=()=>page.waitForTimeout(200);
 async function audit(label){await page.evaluate(axe);const r=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}))}));reports.push({label,...r});assert.equal(r.overflow,false,label);assert.equal(r.h1,1,label);assert.deepEqual(r.violations,[],label);console.log(label+' passed');}
 const matches=clubs.map((club,i)=>({club,game:data[i].games.find(g=>!g.score&&g.date>='2026-10-14')}));
 for(const width of [390,1280])for(const theme of ['light','dark'])for(const {club,game} of matches){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/?club='+club+'#match/'+game.id+'/overview');await page.waitForTimeout(500);
  await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').setChecked(theme==='light');await page.locator('[data-close-clubs]').click();
  const bar=page.locator('.match-sticky-bar');assert.equal(await bar.count(),1);assert.equal(await bar.evaluate(e=>e.classList.contains('is-collapsed')),false,club+' starts expanded');
  const fullHeight=await page.locator('[data-match-full]').evaluate(e=>e.getBoundingClientRect().height);assert.ok(fullHeight>100);
  const content=page.locator(club==='fcsg'?'#fcsg-live-panel':'.match-hero');const before=await content.evaluate(e=>e.getBoundingClientRect().top+scrollY);
  await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await pause();
  assert.equal(await bar.evaluate(e=>e.classList.contains('is-collapsed')),true,club+' collapses');
  const after=await content.evaluate(e=>e.getBoundingClientRect().top+scrollY);assert.ok(Math.abs(before-after)<1,club+' has no layout jump');
  const compact=await page.locator('.match-compact-header').boundingBox(),tabs=await page.locator('.match-tabs').boundingBox();assert.ok(compact.height<=58);assert.ok(tabs.y>=compact.y+compact.height-1);assert.ok(tabs.y+tabs.height<260,club+' leaves room for content');
  const headerBottom=await page.locator('body > .top').evaluate(e=>e.getBoundingClientRect().bottom);assert.ok(compact.y>=headerBottom,club+' stays below club picker');
  await audit(width+' '+theme+' '+club+' collapsed');
  if(process.env.MATCH_HEADER_SCREENSHOT&&width===390&&theme==='dark'&&club==='kadetten')await page.screenshot({path:process.env.MATCH_HEADER_SCREENSHOT});
  await page.locator('.match-tabs a').last().click();await pause();assert.equal(await page.locator('.match-sticky-bar').evaluate(e=>e.classList.contains('is-collapsed')),true,club+' tab changes stay compact');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await pause();assert.equal(await page.locator('.match-sticky-bar').evaluate(e=>e.classList.contains('is-collapsed')),false,club+' expands again');
  await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await pause();await page.locator('.match-compact-back').click();await pause();assert.equal(new URL(page.url()).hash,'#season/games');assert.equal(await page.locator('.match-sticky-bar').count(),0);
 }
 // A changed source score/phase refreshes the compact row without replacing its sticky shell.
 await page.setViewportSize({width:390,height:844});const game=matches.find(m=>m.club==='fcsg').game;await page.goto(origin+'/?club=fcsg#match/'+game.id+'/ticker');await page.waitForTimeout(500);await page.evaluate(()=>scrollTo({top:500,behavior:'instant'}));await pause();
 await page.locator('.fcsg-match-header .matchup > strong').evaluate(e=>e.textContent='2 : 1');await page.locator('.fcsg-match-header [data-fcsg-phase]').evaluate(e=>e.textContent='JETZT LIVE · 63′');await pause();assert.match(await page.locator('.match-compact-detail').textContent(),/2 : 1.*63/);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.match-compact-header').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await page.goto(origin+'/v2/?club=kadetten#match/'+matches[0].game.id+'/overview');await page.waitForTimeout(300);assert.equal(await page.locator('.match-sticky-bar').count(),0);
 assert.deepEqual(errors,[]);if(process.env.MATCH_HEADER_REPORT)fs.writeFileSync(process.env.MATCH_HEADER_REPORT,JSON.stringify({reports,errors},null,2));console.log(reports.length+' collapsing-header accessibility checks passed.');await ctx.close();
}finally{await browser?.close();await new Promise(r=>server.close(r));}
