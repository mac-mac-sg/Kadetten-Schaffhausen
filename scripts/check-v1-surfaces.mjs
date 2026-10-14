/* Compare a baseline Pages build with the current build: paint changes, stable geometry, isolated V2.
   V1_BASELINE_DIR must point to the baseline dist/client; browser overrides mirror check-games-layout.mjs. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),baseline=process.env.V1_BASELINE_DIR;
assert.ok(baseline,'Set V1_BASELINE_DIR to the baseline Pages build');
const dirs={before:path.resolve(baseline),after:path.join(root,'dist/client')},seed=vm.createContext({});
for(const f of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync(path.join(root,'src/client/data/'+f+'.js'),'utf8'),seed);
const data=vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed),now='2026-10-14T10:00:00Z';
for(const d of data){d.checkedAt=now;d.status=Object.fromEntries(['news','games','players','table'].map(k=>[k,{ok:true,updatedAt:now}]));const g=d.games.find(g=>!g.score&&g.date>='2026-10-14');if(g){g.date='2026-10-14';g.time='18:45';}}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{try{const [variant,...parts]=new URL(req.url,'http://local').pathname.slice(1).split('/'),dir=dirs[variant],file=path.resolve(dir,parts.join('/'));const final=new URL(req.url,'http://local').pathname.endsWith('/')?path.join(file,'index.html'):file;if(!final.startsWith(dir+path.sep))throw Error();const content=fs.readFileSync(final);res.writeHead(200,{'Content-Type':types[path.extname(final)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
let browser;const errors=[];
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const origin='http://127.0.0.1:'+server.address().port,axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 async function inspect(variant,club,width,route,mode='list',theme=null){
  const ctx=await browser.newContext({serviceWorkers:'block',bypassCSP:true,reducedMotion:'reduce',viewport:{width,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null})});});
  await page.addInitScript(({now,theme})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');localStorage.setItem(prefix+'fan-v2-theme',theme||'light');localStorage.setItem(prefix+'kadetten-matchday-intro','2026-10-14');localStorage.setItem(prefix+'fcsg-matchday-intro','2026-10-14');localStorage.setItem(prefix+'otmar-matchday-intro','2026-10-14');}}, {now,theme});
  await page.goto(origin+'/'+variant+'/'+(theme?'v2/':'')+'?club='+club+'#'+route);await page.waitForTimeout(180);
  if(mode!=='list'){await page.locator('[data-mode="'+mode+'"]').click();await page.waitForTimeout(100);}
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo({top:0,behavior:'instant'});});await page.waitForTimeout(50);
  await page.addScriptTag({content:axe});
  const report=await page.evaluate(async()=>{const selectors=['.top','.club-picker','.dock','h1','.game-view-toggle','.game-card','.match-calendar','.table-wrap','.players','.player-bento','.fcsg-bento-grid','.home-matchday .live-match','.stats-block','.bento-metric','.fcsg-bento-tile'];const items=selectors.flatMap(s=>[...document.querySelectorAll(s)].filter(e=>e.getBoundingClientRect().height>0).map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {selector:s,box:[r.x,r.y,r.width,r.height],font:[c.fontFamily,c.fontSize,c.lineHeight],paint:[c.backgroundColor,c.backgroundImage,c.color,c.borderColor,c.boxShadow,c.backdropFilter]};}));return {items,text:document.querySelector('#app').textContent,h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,surface:getComputedStyle(document.body).backgroundColor,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,reason:n.failureSummary}))}))};});
  if(variant==='after'&&club==='kadetten'&&width===390&&!theme&&['home','season/games'].includes(route)&&mode==='list'&&process.env.V1_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.V1_SCREENSHOT_DIR,'v1-'+route.replace('/','-')+'.png')});
  await ctx.close();return report;
 }
 let count=0;
 for(const width of [390,1280])for(const club of ['kadetten','fcsg','otmar'])for(const [route,mode] of [['home','list'],['season/games','list'],['season/games','calendar'],['season/table','list'],['season/squad','list'],['player/'+(club==='fcsg'?data[1].players[0].id:6),'list']]){
  const a=await inspect('before',club,width,route,mode),b=await inspect('after',club,width,route,mode);assert.equal(b.h1,1);assert.equal(b.overflow,false);assert.deepEqual(b.violations,[]);assert.equal(a.text,b.text);assert.deepEqual(a.items.map(x=>[x.selector,x.box,x.font]),b.items.map(x=>[x.selector,x.box,x.font]));assert.notEqual(a.surface,b.surface);count++;console.log(JSON.stringify({club,width,route,mode,geometry:true,content:true,axe:true}));
 }
 for(const club of ['kadetten','fcsg','otmar'])for(const theme of ['light','dark'])for(const route of ['home','season/games']){const a=await inspect('before',club,390,route,'list',theme),b=await inspect('after',club,390,route,'list',theme);assert.deepEqual(a.items,b.items);assert.equal(a.surface,b.surface);assert.equal(a.text,b.text);console.log(JSON.stringify({club,theme,route,v2Unchanged:true}));}
 assert.deepEqual(errors,[]);console.log(count+' V1 comparisons and 12 unchanged V2 comparisons passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
