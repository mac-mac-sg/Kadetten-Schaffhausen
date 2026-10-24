/* Handball live statistic colour and layout audit. Browser overrides match check-games-layout.mjs.
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
 const ctx=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce',hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));

 let current=null;
 await ctx.route('**/api/**',async r=>{
  const p=new URL(r.request().url()).pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);
  const d=i>=0?data[i]:p.endsWith('/live')?{ok:true,checkedAt:now,match:current,finished:null}:{ok:false};
  await r.fulfill({contentType:'application/json',body:JSON.stringify(d)});
 });
 await ctx.route('https://**/*',r=>r.request().url().includes('/api/')?r.fallback():r.abort());
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}for(const c of ['kadetten','otmar'])localStorage.removeItem(c+'-public-data-v1');},now);
 for(const club of ['kadetten','otmar'])for(const ownHome of [true,false])for(const width of [390,1280])for(const theme of ['light','dark']){
  const own=club==='kadetten'?'Kadetten Schaffhausen':'TSV St. Otmar St. Gallen',other='RTV 1879 Basel';
  const fixture={id:'live-colours',date:'2026-10-14',time:'14:00',league:'QHL',home:ownHome?own:other,away:ownHome?other:own,score:null};
  data[club==='kadetten'?0:2].games=[fixture];
  const home={goals:20,shots:30,misses:10,efficiency:67,sevenGoals:3,sevenShots:4,twoMinutes:2,warnings:1,disqualifications:0,technicalFaults:3},guest={...home,goals:18,efficiency:null,technicalFaults:7};
  current={...fixture,status:'live',score:[20,18],half:[12,10],clock:'42:00',phase:'2. Halbzeit',details:{ok:true,teamStats:{home,guest},players:[{id:1,name:'Testspieler Heim',home:true,goals:5,shots:8,seven:1,sevenShots:1,yellow:0,twoMinutes:0,red:0},{id:2,name:'Testspieler Gast',home:false,goals:4,shots:7,seven:0,sevenShots:0,yellow:0,twoMinutes:0,red:0}]}};
  await page.setViewportSize({width,height:844});await page.goto(origin+'/?club='+club+'&case='+ownHome+width+theme+'#match/live-colours/stats');await page.locator('.handball-stat-row').first().waitFor();await page.waitForFunction(own=>document.querySelector('.handball-stat-row .fcsg-stat-bar')?.classList.contains(own?'fcsg-home':'fcsg-away'),ownHome);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(300);
  const styles=await page.locator('.handball-stat-card').evaluate((e,ownHome)=>{
   const row=e.querySelector('.handball-stat-row'),bar=row.querySelector('.fcsg-stat-bar'),own=bar.children[ownHome?0:1],opponent=bar.children[ownHome?1:0];
   const root=document.documentElement,probe=document.createElement('i');e.append(probe);probe.style.color='var(--v1-stat-own)';const expected=getComputedStyle(probe).color;probe.style.color='var(--v1-stat-opponent)';const expectedOpponent=getComputedStyle(probe).color;probe.remove();
   return {gradient:getComputedStyle(e).backgroundImage,bar:getComputedStyle(own).backgroundColor,opponent:getComputedStyle(opponent).backgroundColor,expected,expectedOpponent,overflow:root.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length};
  },ownHome);
  assert.match(styles.gradient,/linear-gradient/);assert.equal(styles.bar,styles.expected);assert.equal(styles.opponent,styles.expectedOpponent);assert.equal(styles.overflow,false);assert.equal(styles.h1,1);
  const quota=page.locator('.handball-stat-row').filter({has:page.locator('.fcsg-stat-values > span',{hasText:'Wurfquote'})});assert.equal(await quota.locator('.is-leading').count(),0);
  await page.locator('.handball-stat-card').scrollIntoViewIfNeeded();await page.evaluate(axe);
  const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,why:n.failureSummary}))})));assert.deepEqual(violations,[]);
  const switches=page.locator('.report-player-section [data-stats-team]');await switches.last().click();assert.equal(await page.locator('.report-player-section [data-stats-panel]:not([hidden])').count(),1);
  if(process.env.HANDBALL_STATS_SCREENSHOTS&&width===390&&ownHome)await page.screenshot({path:path.join(process.env.HANDBALL_STATS_SCREENSHOTS,club+'-'+theme+'-live.png')});
  console.log(club+' '+ownHome+' '+width+' '+theme+' passed');
 }
 await page.goto(origin+'/v2/?club=kadetten#match/live-colours/stats');await page.waitForTimeout(250);assert.equal(await page.locator('.handball-stat-row').count(),0);
 assert.deepEqual(errors,[]);console.log('16 live colour/accessibility cases and V2 isolation passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
