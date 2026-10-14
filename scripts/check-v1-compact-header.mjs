/* V1 compact header regression: npm run build:pages, then node scripts/check-v1-compact-header.mjs.
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
    localStorage.setItem('fan-app-onboarding-v1','seen');localStorage.setItem('v2:fan-app-onboarding-v1','seen');localStorage.setItem('v2:fan-app-install-intro-v1','seen');localStorage.setItem('fan-app-install-intro-v1','seen');
    for(let i=0;i<data.length;i++)localStorage.setItem(''+['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify({...data[i],checkedAt,...(new URL(location.href).searchParams.has('test-empty')?{games:[]}: {})}));
  },{data:snapshots,checkedAt});
  const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
  let count=0;
  for(const width of [360,375,390,430])for(const club of ['kadetten','fcsg','otmar'])for(const route of ['home','season/games','season/table','season/squad','club']){
    await page.setViewportSize({width,height:844});
    await page.goto(origin+'/?club='+club+'#'+route,{waitUntil:'domcontentloaded'});
    await page.locator('[data-compact-clubs]').waitFor();
    await page.waitForTimeout(100);
    const header=await page.locator('body > .top').boundingBox();assert.ok(header.height<=70,'single compact row');
    const target=await page.locator('[data-compact-clubs]').boundingBox(),name=await page.locator('.brand > span').boundingBox(),arrow=await page.locator('.compact-club-chevron').boundingBox();
    assert.ok(target.width>name.width+44,'one generous trigger for crest, name and arrow');assert.ok(target.height>=44);
    assert.ok(arrow.x-(name.x+name.width)<=12,'arrow immediately follows club name');
    const hash=new URL(page.url()).hash;await page.locator('.brand > span').tap();assert.equal(await page.locator('#compact-club-menu').isVisible(),true);assert.equal(new URL(page.url()).hash,hash);await page.keyboard.press('Escape');
    await page.locator('.brand > img').tap();assert.equal(await page.locator('#compact-club-menu').isVisible(),true);await page.keyboard.press('Escape');
    if(route==='home'){const card=await page.locator('.home-matchday .live-match').boundingBox();if(card)assert.ok(card.y>=header.y+header.height+8,'matchday clears the compact header');}
    assert.equal(await page.locator('#club-switch').isVisible(),false);
    await page.addScriptTag({content:axe});
    const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
    assert.deepEqual(issues,[],club+' '+route);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('h1').count(),1);
    if(width===390&&club==='kadetten'&&process.env.MOBILE_QA_SCREENSHOTS)await page.screenshot({path:process.env.MOBILE_QA_SCREENSHOTS+'/'+route.replace('/','-')+'.png'});
    count++;
  }
  for(const width of [360,390,430]){
    await page.setViewportSize({width,height:844});await page.goto(origin+'/?club=kadetten#home');
    await page.locator('[data-compact-clubs]').tap();
    assert.equal(await page.locator('#compact-club-menu').isVisible(),true);assert.equal(await page.locator('dialog[open]').count(),0);
    await page.addScriptTag({content:axe});
    assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.querySelector('body > .top'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))),[]);
    await page.keyboard.press('Escape');assert.equal(await page.locator('[data-compact-clubs]').getAttribute('aria-expanded'),'false');
    await page.locator('[data-compact-clubs]').focus();await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(()=>document.activeElement.hasAttribute('data-compact-pick')));
    await page.locator('[data-compact-pick="fcsg"]').tap();assert.equal(await page.locator('html').getAttribute('data-club'),'fcsg');
    assert.equal(await page.locator('#compact-club-menu').isVisible(),false);
    await page.locator('.dock a[data-nav="games"]').tap();
    for(const mode of ['list','calendar']){
      await page.locator('[data-mode="'+mode+'"]').tap();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('[data-compact-clubs]').tap();await page.locator('[data-compact-pick="otmar"]').tap();
      assert.equal(await page.evaluate(()=>location.hash),'#season/games');
    }
    await page.locator('[data-compact-clubs]').tap();await page.locator('[data-compact-manage]').tap();
    assert.equal(await page.locator('.club-settings-dialog').isVisible(),true);
    await page.locator('[data-close-clubs]').tap();
    await page.locator('.dock a[data-nav="news"]').tap();
    await page.locator('[data-compact-clubs]').tap();await page.locator('#app').tap({position:{x:10,y:500}});
    assert.equal(await page.locator('#compact-club-menu').isVisible(),false);
  }
  await page.goto(origin+'/v2/?club=kadetten#home');await page.locator('[data-v2-choose]').waitFor();
  assert.equal(await page.locator('[data-compact-clubs],.v1-compact-header').count(),0);
  await page.locator('[data-v2-choose]').tap();assert.equal(await page.locator('.v2-club-dropdown').isVisible(),true);
  assert.deepEqual(errors,[]);console.log(count+' V1 mobile route cases, 3 dropdown flows and V2 header isolation passed.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
