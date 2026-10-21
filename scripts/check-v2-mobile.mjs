/* Shared production/preview design parity and club navigation. Run after npm run build:pages. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve('dist/client'),seed=vm.createContext({}),clubs=['kadetten','fcsg','otmar'];
for(const f of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync('src/client/data/'+f+'.js','utf8'),seed);
const snapshots=vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed),now='2026-10-20T12:00:00Z';
for(const d of snapshots){d.checkedAt=now;for(const s of Object.values(d.status||{})){s.ok=true;s.updatedAt=now;}}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{try{const f=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!f.startsWith(dir+path.sep))throw Error();const content=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
let browser;const errors=[],results=[],inherited=[];
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/api/**',r=>{const i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(new URL(r.request().url()).pathname);return r.fulfill({contentType:'application/json',body:JSON.stringify(i>=0?snapshots[i]:{ok:true,checkedAt:now,match:null,finished:null})});});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||r.request().url().includes('/api/')?r.fallback():r.abort());
 await context.addInitScript(({now,snapshots})=>{
  const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};
  for(const p of ['','v2:']){localStorage.setItem(p+'fan-app-onboarding-v1','seen');localStorage.setItem(p+'fan-app-install-intro-v1','seen');for(let i=0;i<3;i++)localStorage.setItem(p+['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify(snapshots[i]));}
 },{now,snapshots});
 const pages=await Promise.all([context.newPage(),context.newPage()]);for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 const fingerprint=()=>{
  const root=document.documentElement;return {theme:root.dataset.theme,h1:document.querySelectorAll('h1').length,overflow:root.scrollWidth>innerWidth,text:(()=>{const copy=document.querySelector('main').cloneNode(true);copy.querySelectorAll('.v1-image-fallback,.qhl-view-switch').forEach(e=>e.remove());return copy.textContent;})(),controls:[...document.querySelectorAll('.top button,.dock a,.game-control-bar button,.game-control-bar select')].map(e=>({text:e.textContent,aria:e.getAttribute('aria-label')})),surfaces:[...document.querySelectorAll('.top,.dock,.story-screen,.game-card,.game-control-bar,.standings-table,.player-card,.club-intro,.v1-news-copy,.v2-club-entry,.v2-club-hero')].slice(0,12).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {class:e.className,width:Math.round(r.width),height:Math.round(r.height),background:s.background,color:s.color,border:s.borderRadius,font:s.font};})};
 };
 for(const width of (process.env.V2_QA_FOCUS==='interaction'?[]:process.env.V2_QA_WIDTHS?process.env.V2_QA_WIDTHS.split(',').map(Number):[360,390,430,1280]))for(const club of clubs)for(const theme of ['light','dark']){
  for(const p of pages){await p.setViewportSize({width,height:844});await p.goto(origin+'/',{waitUntil:'domcontentloaded'});await p.evaluate(t=>{for(const prefix of ['','v2:'])localStorage.setItem(prefix+'fan-v1-theme',t);},theme);}
  for(const route of process.env.V2_QA_FOCUS==='home'?['home']:process.env.V2_QA_FOCUS==='arrows'?(width===390?['home','club']:['home']):['home','season/games','season/table','season/squad','club']){
   for(let i=0;i<2;i++){const p=pages[i];await p.goto(origin+(i?'/v2/':'/')+'?club='+club+'&qa='+width+theme+'#'+route,{waitUntil:'domcontentloaded'});await p.locator('.v1-compact-header').waitFor();await p.evaluate(async()=>document.fonts.ready);}
   assert.equal(await pages[1].locator('html').getAttribute('data-preview'),'v2');assert.equal(await pages[1].locator('html').getAttribute('data-design'),null);
   const a=await pages[0].evaluate(fingerprint),b=await pages[1].evaluate(fingerprint);assert.deepEqual(b,a,club+' '+theme+' '+route+' '+width);
   assert.equal(await pages[0].locator('html').getAttribute('data-preview'),null);
   for(const page of pages)assert.equal(await page.locator('html').getAttribute('data-club-layout'),'modern');
   if(route==='home'){
    assert.equal(b.text,a.text,'News and match labels stay intact independently of decorative image fallback timing');
    for(const arrow of await pages[1].locator('.v1-news-arrow,.v1-match-action > .v2-forward-arrow').all()){const style=await arrow.evaluate(e=>{const s=getComputedStyle(e);return {width:s.width,height:s.height,radius:s.borderRadius,border:s.borderTopWidth};});assert.deepEqual(style,{width:'32px',height:'32px',radius:'50%',border:'1px'});}
    assert.equal(await pages[1].locator('.v1-news-copy h2 .v1-news-arrow').count(),0);
    const copies=pages[1].locator('.v1-news-copy');
    for(const copy of await copies.all())assert.ok(await copy.evaluate(e=>{const arrow=e.querySelector(':scope > .v1-news-arrow').getBoundingClientRect(),title=e.querySelector('h2').getBoundingClientRect(),box=e.getBoundingClientRect(),s=getComputedStyle(e);return Math.abs(arrow.bottom-title.bottom)<1&&Math.abs(arrow.left-title.right-14)<1&&Math.abs(arrow.right-(box.right-parseFloat(s.paddingRight)))<1&&Math.abs(arrow.bottom-(box.bottom-parseFloat(s.paddingBottom)))<1;}),'Every news arrow sits beside the title with a 14px gap and aligned bottom edges');
    const front=pages[1].locator('.home-front-page .live-match:not([hidden])'),oldFront=pages[0].locator('.home-front-page .live-match:not([hidden])');
    if(await front.count()&&await oldFront.count()){const h=(await front.boundingBox()).height,old=(await oldFront.boundingBox()).height;assert.ok(Math.abs(h-old)<1,'Production and preview share the compact match card');}

    assert.equal(await pages[1].locator('.v1-news-arrow .v2-arrow-glyph path').first().getAttribute('d'),'M7 17 17 7M7 7h10v10');
    const action=pages[1].locator('.v1-match-action:not([hidden])');if(await action.count()){
     const row=await action.evaluate(e=>{const front=e.closest('.v1-match-stack').querySelector('.live-match').getBoundingClientRect(),r=e.getBoundingClientRect(),a=e.querySelector('.v2-forward-arrow').getBoundingClientRect(),t=e.firstElementChild.getBoundingClientRect();return {height:r.bottom-front.bottom,center:a.y+a.height/2-(front.bottom+(r.bottom-front.bottom)/2),label:t.y+t.height/2-(a.y+a.height/2)};});
     assert.ok(Math.abs(row.height-56)<1&&Math.abs(row.center)<1&&Math.abs(row.label)<1,'Match action has a centered 56px row');
    }
    if(process.env.V2_CLUB_SCREENSHOTS&&width===390)for(let i=0;i<2;i++)await pages[i].screenshot({path:path.join(process.env.V2_CLUB_SCREENSHOTS,club+'-'+theme+(i?'-preview':'-production')+'-home.png')});
    const back=await pages[1].evaluate(()=>getComputedStyle(document.querySelector('.top .header-button svg')).borderTopWidth);assert.equal(back,'0px','Unrelated icons remain unframed');
   }else if(route==='season/squad'){
    const entry=pages[1].locator('a.v2-club-entry');assert.equal(await entry.count(),1);assert.equal(await entry.locator('a,button').count(),0);assert.equal(await entry.locator('h2').textContent(),'Unser Verein');
    const box=await entry.boundingBox();assert.ok(box.height>=200&&box.height<=260,'Compact club entry');
    assert.equal(await pages[1].locator('.player-card').count(),await pages[0].locator('.player-card').count());
    assert.ok(await entry.evaluate(e=>e.getBoundingClientRect().bottom<document.querySelector('.players').getBoundingClientRect().top));
   }else if(route==='club'){
    assert.equal(await pages[1].locator('.v2-club-hero .v2-club-curve').count(),1);
    assert.equal(await pages[1].locator('.club-chapter').count(),await pages[0].locator('.club-chapter').count());
    assert.equal(await pages[1].locator('.club-trophy').count(),await pages[0].locator('.club-trophy').count());
    if(process.env.V2_CLUB_SCREENSHOTS&&width===390)await pages[1].screenshot({path:path.join(process.env.V2_CLUB_SCREENSHOTS,club+'-'+theme+'-club.png')});
   }
   assert.equal(b.h1,1);assert.equal(b.overflow,false);
   await pages[1].evaluate(axe);const violations=await pages[1].evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));if(violations.length&&route==='club')assert.deepEqual(violations,[],'New club design must pass axe');if(violations.length){await pages[0].evaluate(axe);const baseline=await pages[0].evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,baseline,'V2 must not introduce accessibility violations');inherited.push({width,club,theme,route,violations});}
   results.push({width,club,theme,route});
  }
 }
 console.log(JSON.stringify({phase:'views',views:results.length,inherited,errors}));
 for(const p of pages){
 const base=origin+(p===pages[0]?'/':'/v2/');
 await p.setViewportSize({width:390,height:844});await p.goto(base,{waitUntil:'domcontentloaded'});
 await p.evaluate(()=>{for(const prefix of ['','v2:'])localStorage.setItem(prefix+'fan-v1-theme','dark');});
 for(const club of clubs){
  await p.setViewportSize({width:390,height:844});await p.goto(base+'?club='+club+'#season/squad',{waitUntil:'domcontentloaded'});
  await p.locator('.v2-club-entry').focus();await p.keyboard.press('Enter');await p.locator('.v2-club-hero').waitFor();
  const forward=p.locator('.club-text-button[data-club-jump] > span').first();if(await forward.count())assert.equal(await forward.evaluate(e=>getComputedStyle(e).borderRadius),'50%');
  await p.locator('.club-trophy').last().click();assert.equal(await p.locator('.club-trophy').last().getAttribute('aria-pressed'),'true');
  await p.locator('.club-title-years button').last().click();assert.equal(await p.locator('.club-title-years button').last().getAttribute('aria-pressed'),'true');
  const moment=p.locator('[data-club-jump^="club-history-"]').first();if(await moment.count()){await moment.click();await p.waitForTimeout(100);assert.ok(await p.evaluate(()=>scrollY>0));}
  await p.locator('.club-topline a').click();await p.locator('.v2-club-entry').waitFor();
  if(process.env.V2_CLUB_SCREENSHOTS)await p.screenshot({path:path.join(process.env.V2_CLUB_SCREENSHOTS,club+'-entry.png')});
  await p.locator('.v2-club-entry img').click();await p.locator('.v2-club-hero').waitFor();await p.goBack();await p.locator('.v2-club-entry').waitFor();
 }
 await p.evaluate(()=>{const host=document.createElement('section');host.id='qa-pdf-tools';host.innerHTML='<div class="programme-tools"><a href="https://example.test/match.pdf" target="_blank" rel="noopener noreferrer">PDF extern öffnen ↗</a></div>';document.body.append(host);});
 await p.locator('#qa-pdf-tools .v2-forward-arrow').waitFor();
 assert.equal(await p.locator('#qa-pdf-tools .v2-forward-arrow').evaluate(e=>getComputedStyle(e).borderRadius),'50%');
 assert.equal(await p.locator('#qa-pdf-tools a').getAttribute('href'),'https://example.test/match.pdf');
 await p.evaluate(()=>document.getElementById('qa-pdf-tools').remove());
 await p.goto(base+'?club=kadetten#season/games',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Kalender',exact:true}).click();await p.locator('.match-calendar').waitFor();await p.getByRole('button',{name:'Liste',exact:true}).click();await p.locator('.game-timeline').waitFor();
 await p.locator('#club-settings').click();await p.locator('[data-v1-light-mode]').waitFor();assert.equal(await p.locator('.settings-info-row > .v1-action-icon').evaluate(e=>getComputedStyle(e).borderRadius),'50%');await p.locator('[data-v1-light-mode]').uncheck();
 assert.deepEqual(await p.evaluate(()=>[localStorage.getItem('fan-v1-theme'),localStorage.getItem('v2:fan-v1-theme')]),['dark','dark']);
 await p.locator('[data-v1-light-mode]').check();assert.deepEqual(await p.evaluate(()=>[localStorage.getItem('fan-v1-theme'),localStorage.getItem('v2:fan-v1-theme')]),p===pages[0]?['light','dark']:['dark','light']);
 await p.reload();assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({views:results.length,sharedViewsParity:true,clubEntryAndHistory:true,newAxeViolations:0,inherited,errors,calendarReturn:true,isolatedTheme:true}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
