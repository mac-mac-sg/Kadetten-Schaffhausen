/* Run after build:pages. Mobile touch targets and typography in the real V2 bundle.
   Set GAMES_PLAYWRIGHT_MODULE, GAMES_CHROMIUM_EXECUTABLE and GAMES_AXE_SCRIPT if needed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist/client'),reports=[],errors=[];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 try {const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));assert.ok(file.startsWith(root+path.sep));res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}
 catch {res.writeHead(404);res.end();}
});
const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
let browser;
try {
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390])for(const club of ['kadetten','fcsg','otmar'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',bypassCSP:true,reducedMotion:'reduce'});
  await context.addInitScript(theme=>{localStorage.setItem('v2:fan-v1-theme',theme);for(const prefix of ['','v2:'])for(const key of ['fan-app-onboarding-v1','fan-app-install-intro-v1'])localStorage.setItem(prefix+key,'seen');},theme);
  // Deliberately unavailable feeds expose the real data-status control and preserve bundled data.
  await context.route('https://**/*',r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['home','season/games','season/table','season/squad','club']){
   await page.goto(origin+'/v2/?club='+club+'#'+route);await page.waitForSelector('#app > *');
   await page.waitForFunction(()=>[...document.querySelectorAll('.compact-status:not([hidden]) > summary')].length>0);
   await page.evaluate(()=>document.fonts.ready);
   const scope=width+' '+club+' '+theme+' '+route;
   assert.equal(await page.locator('html').getAttribute('data-preview'),'v2');
   assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   assert.equal(await page.locator('h1').count(),1,scope);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),scope+' has no horizontal overflow');
   assert.ok(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim().startsWith('Anton')),scope+' display font resolves without a cycle');
   for(const control of await page.locator('.compact-status:not([hidden]) > summary,.season-form a').all()){
    const rect=await control.boundingBox();assert.ok(rect.width>=44&&rect.height>=44,scope+' touch target is at least 44 by 44');
   }
   const summary=page.locator('.compact-status:not([hidden]) > summary').first();
   assert.ok(await summary.evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.top').getBoundingClientRect();return a.top>=b.bottom||a.bottom<=b.top||a.left>=b.right||a.right<=b.left;}),scope+' status target clears header controls');
   await summary.click();
   const popup=page.locator('.compact-status[open] .status-popover');await popup.waitFor({state:'visible'});
   assert.ok(await popup.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}),scope+' status popup stays inside phone viewport');
   await summary.click();
   if(route==='home'){
    for(const selector of ['.v2-ticket-heading','.v2-ticket-status','.v2-ticket-footer']){
     const element=page.locator(selector);if(!await element.count())continue;
     assert.ok(await element.evaluate((e,min)=>parseFloat(getComputedStyle(e).fontSize)>=min,selector==='.v2-ticket-footer'?13:12),scope+' readable '+selector);
    }
    // The magazine cover uses a neutral white rim; the result itself is checked in check-v2-ticket.mjs.
    assert.ok(await page.locator('.v2-masthead').evaluate(e=>e.getBoundingClientRect().height>=44),scope+' masthead is a 44 px touch target');
   }
   if(route==='season/table'){
    const form=page.locator('.season-form a').first();if(await form.count()){const href=await form.getAttribute('href');await form.click();await page.waitForURL(url=>url.hash===href);assert.equal(new URL(page.url()).hash,href,scope+' form link still opens its game');await page.goBack();await page.waitForSelector('.standings-table');}
   }
   await page.addScriptTag({content:axe});
   const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
   assert.deepEqual(violations,[],scope+' axe');
   reports.push({width,club,theme,route});
   if(process.env.V2_READABILITY_SHOTS&&width===390&&club==='kadetten'&&theme==='light')await page.screenshot({path:path.join(process.env.V2_READABILITY_SHOTS,route.replaceAll('/','-')+'.png')});
  }
  await page.locator('#club-settings').click();await page.waitForSelector('dialog[open]');
  await page.addScriptTag({content:axe});assert.deepEqual(await page.evaluate(async()=>(await axe.run(document)).violations.map(v=>v.id)),[],'Settings stay accessible');
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({views:reports.length,settings:12,errors,reports}));
} finally {await browser?.close();server.close();}
