/* Optional browser regression: npm run build:pages, then node scripts/check-games-layout.mjs.
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
  browser=await chromium.launch({headless:true,...(process.env.GAMES_CHROMIUM_EXECUTABLE?{executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce',bypassCSP:true}),errors=[];
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
    localStorage.setItem('fan-app-onboarding-v1','seen');localStorage.setItem('fan-app-install-intro-v1','seen');
    for(let i=0;i<data.length;i++)localStorage.setItem(['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify({...data[i],checkedAt,...(new URL(location.href).searchParams.has('test-empty')?{games:[]}: {})}));
  },{data:snapshots,checkedAt});
  const axe=process.env.GAMES_AXE_SCRIPT ? fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8') : null;
  const selectors=['body > .top','.game-control-bar','.game-view-toggle','#competition'];
  async function measure() {
    await page.waitForTimeout(200);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(50);
    if(axe)assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)),[]);
    return page.evaluate(selectors=>({boxes:Object.fromEntries(selectors.map(selector=>{
      const element=document.querySelector(selector),rect=element.getBoundingClientRect();
      return [selector,{x:rect.x,y:rect.y,height:rect.height,font:getComputedStyle(element).fontSize}];
    })),h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,calendarBottom:document.querySelector('.calendar-panel')?.getBoundingClientRect().bottom,dockTop:document.querySelector('.dock').getBoundingClientRect().top,scrollY}),selectors);
  }
  function stable(before,after,label) {
    assert.equal(after.h1,1,label+': one heading');assert.equal(after.overflow,false,label+': no horizontal overflow');
    for(const selector of selectors)for(const key of ['x','y','height'])assert.ok(Math.abs(before.boxes[selector][key]-after.boxes[selector][key])<0.1,`${label}: ${selector} ${key} moved from ${before.boxes[selector][key]} to ${after.boxes[selector][key]}`);
    for(const selector of selectors)assert.equal(before.boxes[selector].font,after.boxes[selector].font,label+': type size');
  }
  let cases=0;
  for(const viewport of [{width:390,height:844},{width:1280,height:844},{width:375,height:667},{width:844,height:390}])for(const club of ['kadetten','fcsg','otmar'])for(const noFixtures of [false,true]) {
    empty=noFixtures;await page.setViewportSize(viewport);
    await page.goto(origin+'/?club='+club+(empty?'&test-empty=1':'')+'#season/games',{waitUntil:'domcontentloaded'});
    if(axe)await page.addScriptTag({content:axe});
    if(empty)await page.waitForFunction(()=>document.querySelectorAll('.game-timeline .game-card').length===0);
    const before=await measure();
    const bridge=await page.locator('.game-control-bar').evaluate(e=>{const css=getComputedStyle(e,'::before');return{content:css.content,height:parseFloat(css.height),colour:css.backgroundColor,pointerEvents:css.pointerEvents,gap:e.getBoundingClientRect().top-document.querySelector('body > .top').getBoundingClientRect().bottom};});
    assert.notEqual(bridge.content,'none',club+': gap above controls has a backing');
    assert.ok(bridge.height>=bridge.gap-1,club+': backing covers the gap to the club header');
    assert.ok(!bridge.colour.startsWith('rgba('),club+': scrolling text cannot show through the gap');
    assert.equal(bridge.pointerEvents,'none',club+': backing never intercepts navigation');
    await page.locator('[data-mode="calendar"]').click();const calendar=await measure();stable(before,calendar,club+' calendar');
    assert.ok(calendar.calendarBottom<=calendar.dockTop,club+': calendar fits above dock');assert.equal(calendar.scrollY,0);
    assert.equal(await page.locator('[data-mode="week"]').count(),0);
    const controls=await page.locator('.game-control-bar').evaluate(e=>{const a=e.querySelector('button').getBoundingClientRect(),b=e.querySelector('select').getBoundingClientRect();return{buttons:e.querySelectorAll('button').length,sameRow:Math.abs(a.y-b.y)<1};});
    assert.equal(controls.buttons,2);assert.equal(controls.sameRow,true);
    await page.locator('[data-mode="list"]').click();stable(before,await measure(),club+' list');
    if(!empty && viewport.height>550) {
      const start=await measure();
      await page.evaluate(()=>window.scrollTo({top:180,behavior:'instant'}));
      const moved=await page.evaluate(()=>({scrollY,top:document.querySelector('body > .top').getBoundingClientRect().y,bar:document.querySelector('.game-control-bar').getBoundingClientRect().y,tabs:document.querySelector('.game-view-toggle').getBoundingClientRect().y}));
      assert.ok(moved.scrollY>100,club+': list scrolls');
      assert.ok(Math.abs(start.boxes['body > .top'].y-moved.top)<1,club+': club header stays fixed');
      assert.ok(Math.abs(start.boxes['.game-control-bar'].y-moved.bar)<1,club+': view and competition controls stay fixed');
      assert.ok(moved.bar>=start.boxes['body > .top'].y+start.boxes['body > .top'].height,club+': controls sit beneath club header');
      await page.evaluate(()=>window.scrollTo({top:300,behavior:'instant'}));
      assert.ok(Math.abs(await page.locator('.game-view-toggle').evaluate(el=>el.getBoundingClientRect().y)-moved.tabs)<1,club+': tabs stay pinned');
      await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      assert.ok(Math.abs(await page.locator('.game-control-bar').evaluate(el=>el.getBoundingClientRect().y)-moved.bar)<1,club+': controls remain fixed at the end of the list');
      if(viewport.width===390)await page.screenshot({path:'/tmp/sticky-'+club+'.png'});
    }
    cases++;console.log(JSON.stringify({club,...viewport,empty,stable:true}));
  }
  assert.deepEqual(errors,[]);console.log(`${cases} List → Calendar → List cases passed.`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
