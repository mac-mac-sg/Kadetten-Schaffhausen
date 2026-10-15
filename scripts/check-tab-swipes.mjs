/* Optional native-touch navigation audit. Browser overrides match check-games-layout.mjs.
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
 const ctx=await browser.newContext({serviceWorkers:'block',bypassCSP:true,reducedMotion:'no-preference',hasTouch:true,isMobile:true,viewport:{width:390,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/api/**',async r=>{const url=new URL(r.request().url()),p=url.pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);let d=i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null};if(p==='/api/ehf-reports/chambery'&&process.env.V1_THEME_FIXTURES_DIR&&fs.existsSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json')))d=JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json'),'utf8'));if(p.includes('/articles/'))d={id:p.split('/').at(-1),version:url.searchParams.get('v'),html:'<h2>Vereinsbericht</h2><p>Offizielle Vereinsnachrichten und Informationen zum letzten Spiel.</p>'};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}},now);

 const cdp=await ctx.newCDPSession(page);
 await page.addInitScript(()=>localStorage.setItem('fan-v1-theme','light'));
 await page.addInitScript(()=>{
  window.swipeMotionChecks=[];
  const original=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   const result=original.call(this,frames,options);
   if(options?.duration===180&&frames[0]?.transform?.startsWith('translateX(')){
    const selectors=['body > .top','body > .dock','.games-mode .game-control-bar'];
    const measure=()=>selectors.map(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
    const before=measure(),target=this;
    setTimeout(()=>{const after=measure();window.swipeMotionChecks.push({direction:frames[0].transform,overflow:document.documentElement.scrollWidth>innerWidth,pinnedMoved:before.some((r,i)=>r&&after[i]&&r.some((v,j)=>Math.abs(v-after[i][j])>1)),pinnedDescendant:[...target.querySelectorAll('*')].some(e=>['fixed','sticky'].includes(getComputedStyle(e).position))});},45);
   }
   return result;
  };
 });

 async function touchSwipe(dx=-160,dy=0,x=dx<0?275:110,y=400){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let n=1;n<=6;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*n/6,y:y+dy*n/6}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);
 }
 async function go(club,route='#home'){await page.goto(origin+'/?club='+club+route);await page.waitForTimeout(150);}
 async function audit(label){
  await page.addScriptTag({content:axe});const r=await page.evaluate(async()=>({route:location.hash,club:document.documentElement.dataset.club,active:document.querySelector('.dock a.active')?.getAttribute('href'),overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))}));
  reports.push({label,...r});assert.equal(r.active,r.route);assert.equal(r.overflow,false);assert.equal(r.h1,1);assert.deepEqual(r.violations,[]);const motion=await page.evaluate(()=>window.swipeMotionChecks);assert.ok(motion.every(m=>!m.overflow&&!m.pinnedMoved&&!m.pinnedDescendant),'Swipe motion stays within viewport and leaves pinned controls stationary: '+JSON.stringify(motion));console.log(label+' passed');
 }
 for(const club of clubs){
  await go(club);await audit(club+' initial');
  await touchSwipe(160);assert.equal(new URL(page.url()).hash,'#home');
  for(const route of ['#season/games','#season/table','#season/squad']){await touchSwipe();assert.equal(new URL(page.url()).hash,route);assert.equal(new URL(page.url()).searchParams.get('club'),club);await audit(club+' forward '+route);}
  await touchSwipe();assert.equal(new URL(page.url()).hash,'#season/squad');
  for(const route of ['#season/table','#season/games','#home']){await touchSwipe(160);assert.equal(new URL(page.url()).hash,route);await audit(club+' backward '+route);}
 }
 const directions=await page.evaluate(()=>window.swipeMotionChecks.map(m=>m.direction));assert.ok(directions.includes('translateX(14px)')&&directions.includes('translateX(-14px)'));
 await go('kadetten');await touchSwipe(-20);assert.equal(new URL(page.url()).hash,'#home');
 await touchSwipe(-80,-100);assert.equal(new URL(page.url()).hash,'#home');
 await go('kadetten');await touchSwipe(0,-160,200,450);assert.equal(new URL(page.url()).hash,'#home');assert.ok(await page.evaluate(()=>scrollY>0),'Native vertical scrolling still works');
 await go('kadetten');await page.locator('#club-settings').click();await touchSwipe();assert.equal(new URL(page.url()).hash,'#home');await page.locator('[data-close-clubs]').click();
 await page.evaluate(()=>{const e=document.createElement('div');e.id='swipe-scroll-fixture';e.style.cssText='position:fixed;top:260px;left:30px;width:330px;height:80px;overflow-x:auto;z-index:12;background:white';e.innerHTML='<div style="width:900px;height:80px">Horizontaler Inhalt</div>';document.getElementById('app').prepend(e);});
 await touchSwipe(-160,0,275,300);assert.equal(new URL(page.url()).hash,'#home');assert.ok(await page.locator('#swipe-scroll-fixture').evaluate(e=>e.scrollLeft>0),'Native horizontal scroller still works');
 await go('kadetten','#season/games');await page.locator('[data-mode="calendar"]').click();await touchSwipe();assert.equal(new URL(page.url()).hash,'#season/games');assert.equal(await page.locator('[data-mode="calendar"]').getAttribute('aria-pressed'),'true');
 const story=data[0].stories[0];await go('kadetten','#news/'+story.id);await touchSwipe();assert.equal(new URL(page.url()).hash,'#news/'+story.id);
 await go('kadetten','#player/6');await touchSwipe();assert.equal(new URL(page.url()).hash,'#player/6');
 await go('kadetten');await page.emulateMedia({reducedMotion:'reduce'});await touchSwipe();assert.equal(new URL(page.url()).hash,'#season/games');
 await page.goto(origin+'/v2/?club=kadetten#home');await touchSwipe();assert.equal(new URL(page.url()).hash,'#home');
 assert.deepEqual(errors,[]);if(process.env.V1_SWIPE_REPORT)fs.writeFileSync(process.env.V1_SWIPE_REPORT,JSON.stringify({reports,errors},null,2));
 console.log(reports.length+' main-route accessibility checks and all touch-navigation guards passed.');await ctx.close();
}finally{await browser?.close();await new Promise(r=>server.close(r));}
