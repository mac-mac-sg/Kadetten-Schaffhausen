/* V2 smartphone regression: npm run build:pages, then node scripts/check-v2-mobile.mjs.
   Requires GAMES_AXE_SCRIPT pointing to axe.min.js; optional MOBILE_QA_SCREENSHOTS directory.
   Uses an installed Playwright browser; module/executable overrides support existing runtimes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)), directory=path.join(root,'dist/client');
const seed=vm.createContext({});
for(const file of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync(path.join(root,'src/client/data/'+file+'.js'),'utf8'),seed);
const snapshots=vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed);
const checkedAt='2026-10-12T12:00:00Z';
for(const data of snapshots){data.checkedAt=checkedAt;data.status={...data.status,games:{ok:true,updatedAt:checkedAt}};}
const endpoints=['/api/data','/api/fcsg/data','/api/otmar/data'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((request,response)=>{
  try {
    const file=path.resolve(directory,'.'+new URL(request.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!file.startsWith(directory+path.sep))throw Error('Outside preview');
    const content=fs.readFileSync(file);response.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});response.end(content);
  } catch {response.writeHead(404);response.end();}
});
let browser;
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.GAMES_CHROMIUM_EXECUTABLE?{executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--disable-software-rasterizer']});
  const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce',bypassCSP:true,isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date(checkedAt)});
  let empty=false;
  await page.route('**/api/**',async route=>{
    const index=endpoints.indexOf(new URL(route.request().url()).pathname);
    const data=index<0?{ok:true,checkedAt,match:null,finished:null}:empty?{...snapshots[index],games:[]}:snapshots[index];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
  });
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'||route.request().url().includes('/api/')?route.fallback():route.abort());
  await page.addInitScript(({data,checkedAt})=>{
    localStorage.setItem('v2:fan-app-onboarding-v1','seen');localStorage.setItem('v2:fan-app-install-intro-v1','seen');
    for(let i=0;i<data.length;i++)localStorage.setItem('v2:'+['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify({...data[i],checkedAt,...(new URL(location.href).searchParams.has('test-empty')?{games:[]}: {})}));
  },{data:snapshots,checkedAt});
  const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
  let cases=0;
  for(const width of [360,375,390,430])for(const club of ['kadetten','fcsg','otmar'])for(const theme of ['light','dark'])for(const route of ['season/squad','club','club/history','club/achievements','club/venue']){
    await page.setViewportSize({width,height:width===360?740:844});
    await page.goto(origin+'/v2/?club='+club+'#'+route,{waitUntil:'domcontentloaded'});
    await page.locator('[data-v2-theme]').waitFor();
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-v2-theme]').tap();
    await page.waitForTimeout(70);
    assert.equal(await page.locator('h1').count(),1,club+' '+route+' h1');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,club+' '+route+' overflow');
    await page.addScriptTag({content:axe});
    const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))})));
    assert.deepEqual(issues,[],club+' '+theme+' '+route+' axe');
    if(route==='season/squad'){
      const intro=page.locator('a.v2-roster-intro');assert.equal(await intro.count(),1);assert.equal(await intro.locator('a,button').count(),0);
      assert.equal(await intro.locator('h2').textContent(),'Unser Verein');
    }
    if(route==='club'){
      assert.equal(await page.locator('.v2-club-card').count(),3);
      const geometry=await page.locator('.v2-club-card').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect(),css=getComputedStyle(card);return {top:r.top,bottom:r.bottom,right:r.right,corner:parseFloat(css.borderTopRightRadius)};}));
      assert.ok(geometry[1].top>geometry[0].top&&geometry[1].top<geometry[0].bottom-100,'complete card continues behind front');
      assert.ok(geometry[1].right>geometry[0].right&&geometry[2].right>geometry[1].right,'side edges visible');
      assert.ok(geometry.every(card=>card.corner>=20),'all cards have rounded upper edges');
      for(const tab of await page.locator('.v2-club-tab:visible').all())assert.ok((await tab.boundingBox()).height>=44);
    }
    if(process.env.MOBILE_QA_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.MOBILE_QA_SCREENSHOTS,club+'-'+theme+'-'+route.replace('/','-')+'.png')});
    cases++;
  }
  for(const club of ['kadetten','fcsg','otmar']){
    await page.setViewportSize({width:390,height:844});
    await page.goto(origin+'/v2/?club='+club+'#season/squad');
    await page.locator('.v2-roster-intro img').tap();await page.locator('.v2-club-deck').waitFor();
    for(const chapter of ['achievements','venue','history']){
      await page.locator('[data-v2-club-select="'+chapter+'"]').tap();
      assert.equal(await page.locator('.v2-club-face:visible').getAttribute('href'),'#club/'+chapter);
      assert.ok(await page.locator('.v2-club-face:visible').evaluate(el=>el===document.activeElement));
      await page.keyboard.press('Enter');await page.locator('.v2-club-detail').waitFor();
      assert.equal(await page.locator('.v2-club-detail').getAttribute('data-v2-club-chapter'),chapter);
      if(chapter==='achievements'){
        await page.locator('.club-trophy').last().tap();assert.equal(await page.locator('.club-trophy').last().getAttribute('aria-pressed'),'true');
        await page.locator('.club-title-years button').first().tap();
      }
      await page.goBack();await page.locator('.v2-club-deck').waitFor();
      assert.equal(await page.locator('.v2-club-face:visible').getAttribute('href'),'#club/'+chapter,'back restores front card');
    }
    await page.goto(origin+'/v2/?club='+club+'#club/history');
    const trophy=page.locator('.club-text-button[data-club-trophy]').first();await trophy.scrollIntoViewIfNeeded();
    const year=await trophy.getAttribute('data-club-title-year');await trophy.tap();await page.locator('.v2-club-detail[data-v2-club-chapter="achievements"]').waitFor();
    assert.ok((await page.locator('.club-selected-title').textContent()).includes(year),'history opens the matching title year');
    const moment=page.locator('[data-club-jump^="club-history"]');if(await moment.count()){await moment.first().tap();await page.locator('.v2-club-detail[data-v2-club-chapter="history"]').waitFor();}
  }
  await page.goto(origin+'/v2/?club=kadetten#club');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-v2-club-select="venue"]').tap();assert.equal(await page.locator('.v2-club-face:visible').getAttribute('href'),'#club/venue');
  await page.waitForTimeout(300);assert.equal(await page.locator('.v2-club-face:visible').evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-v2-club-select="history"]').tap();
  assert.equal(await page.locator('.v2-club-face:visible').evaluate(el=>el.getAnimations().length),0);
  assert.deepEqual(errors,[]);console.log(cases+' club/roster mobile view/theme cases, three full deck flows, title links, back restoration and motion checks passed.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
