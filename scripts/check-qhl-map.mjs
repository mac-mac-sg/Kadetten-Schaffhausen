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
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{try{const f=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!f.startsWith(dir+path.sep))throw Error();const content=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
let browser;const errors=[],results=[],inherited=[],tileResults=[];
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/api/**',r=>{const i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(new URL(r.request().url()).pathname);return r.fulfill({contentType:'application/json',body:JSON.stringify(i>=0?snapshots[i]:{ok:true,checkedAt:now,match:null,finished:null})});});
 await context.route('https://tiles.openfreemap.org/**',async r=>{if(process.env.QHL_MAP_LIVE==='1'){try{const response=await fetch(r.request().url(),{signal:AbortSignal.timeout(15000)});tileResults.push({url:r.request().url(),status:response.status});return r.fulfill({status:response.status,contentType:response.headers.get('content-type')||'application/octet-stream',body:Buffer.from(await response.arrayBuffer())});}catch{return r.abort();}}return r.fulfill({contentType:'application/json',body:JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e2e8e0'}}]})});});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||r.request().url().includes('/api/')||new URL(r.request().url()).hostname==='tiles.openfreemap.org'?r.fallback():r.abort());
 await context.addInitScript(({now,snapshots})=>{
  const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};
  for(const p of ['','v2:']){localStorage.setItem(p+'fan-app-onboarding-v1','seen');localStorage.setItem(p+'fan-app-install-intro-v1','seen');for(let i=0;i<3;i++)localStorage.setItem(p+['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify(snapshots[i]));}
 },{now,snapshots});
 const pages=await Promise.all([context.newPage(),context.newPage()]);for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 const p=pages[1];p.on('console',m=>{if(m.type()==='error'&&m.text().includes('Content Security Policy'))console.error(m.text());});
 const ready=async()=>{await p.locator('.qhl-map-screen').waitFor();await p.waitForFunction(()=>document.querySelectorAll('.qhl-map-marker').length>0);};
 for(const width of (process.env.QHL_MAP_SMOKE?[390]:[360,390,430,1280]))for(const club of (process.env.QHL_MAP_SMOKE?['kadetten']:['kadetten','otmar']))for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:844});await p.goto(origin+'/v2/',{waitUntil:'domcontentloaded'});await p.evaluate(t=>localStorage.setItem('v2:fan-v1-theme',t),theme);
  await p.goto(origin+'/v2/?club='+club+'#season/table/map',{waitUntil:'domcontentloaded'});await ready();if(process.env.QHL_MAP_LIVE==='1')await p.locator('.qhl-map-status[hidden]').waitFor({state:'attached',timeout:25000});
  assert.equal(await p.locator('.qhl-map-screen h1').count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const chrome=await p.locator('.qhl-map-screen').evaluate(e=>{const r=e.getBoundingClientRect(),top=document.querySelector('body > .top').getBoundingClientRect(),bottom=document.querySelector('body > .dock').getBoundingClientRect();return r.top>=top.bottom+8&&r.bottom<=bottom.top-8;});assert.ok(chrome,'Map clears both navigation bars');
  if(process.env.QHL_MAP_SCREENSHOTS&&width===390)await p.screenshot({path:path.join(process.env.QHL_MAP_SCREENSHOTS,club+'-'+theme+'-overview.png')});
  const cluster=p.locator('.qhl-map-marker.is-cluster').first();if(await cluster.count()){const before=await p.locator('.qhl-map-marker').count();await cluster.click();await p.waitForTimeout(100);assert.ok(await p.locator('.qhl-map-marker').count()>=before,'Cluster opens into separate locations');}
  assert.ok(await p.locator('.qhl-map-marker:not(.is-cluster)').evaluateAll(nodes=>{const n=nodes.find(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit&&(hit===e||e.contains(hit));});n?.setAttribute('data-qa-visible','true');return !!n;}),'An individual marker is reachable in the current viewport');
  await p.locator('[data-qa-visible]').click();await p.locator('.qhl-club-card').click();await p.locator('.qhl-club-dialog[open]').waitFor();
  assert.equal(await p.locator('.qhl-facts div').count(),3);assert.equal(await p.locator('.qhl-action[href*="maps/dir"]').getAttribute('target'),'_blank');
  const box=await p.locator('.qhl-club-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await p.evaluate(axe);const violations=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[],club+' '+theme+' '+width+' dialog axe');
  await p.keyboard.press('Escape');await p.locator('.qhl-club-dialog').waitFor({state:'detached'});
  if(process.env.QHL_MAP_SCREENSHOTS&&width===390){await p.screenshot({path:path.join(process.env.QHL_MAP_SCREENSHOTS,club+'-'+theme+'-map.png')});}
  await p.evaluate(axe);const mapViolations=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(mapViolations,[],club+' '+theme+' '+width+' map axe');
  await p.locator('[data-qhl-all]').click();assert.equal(await p.locator('.qhl-club-card').count(),0);
  await p.locator('[data-qhl-list]').click();assert.equal(await p.locator('.qhl-list-row').count(),10);await p.locator('[data-qhl-team="'+club+'"]').click();await p.locator('.qhl-club-card').click();
  if(process.env.QHL_MAP_SCREENSHOTS&&width===390)await p.screenshot({path:path.join(process.env.QHL_MAP_SCREENSHOTS,club+'-'+theme+'-profile.png')});
  await p.locator('[data-qhl-club]').click();await p.locator('.v2-club-hero').waitFor();await p.goBack();await ready();assert.equal(await p.locator('.qhl-club-card strong').textContent(),club==='otmar'?'TSV St. Otmar St. Gallen':'Kadetten Schaffhausen');
  results.push({width,club,theme});
 }
 await p.goto(origin+'/v2/?club=kadetten#season/table',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'European League',exact:true}).click();assert.equal(await p.locator('.qhl-view-switch').count(),0);await p.getByRole('button',{name:'QHL',exact:true}).click();await p.locator('.qhl-view-switch a').last().click();await ready();
 await p.locator('#club-settings').click();const lightMode=p.locator('[data-v1-light-mode]');await lightMode.check();await p.keyboard.press('Escape');await ready();assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
 await p.locator('.dock [data-nav="news"]').click();await p.locator('.v1-news-layout').waitFor();assert.equal(await p.locator('.qhl-map-screen,.maplibregl-canvas').count(),0);
 await p.goto(origin+'/v2/?club=fcsg#season/table',{waitUntil:'domcontentloaded'});assert.equal(await p.locator('.qhl-view-switch').count(),0);
 for(const club of ['kadetten','otmar']){await pages[0].goto(origin+'/?club='+club+'#season/table',{waitUntil:'domcontentloaded'});assert.equal(await pages[0].locator('.qhl-view-switch,.qhl-map-screen').count(),0);}
 // Style unavailable: every club and its details remain reachable without a map or location permission.
 await context.route('https://tiles.openfreemap.org/**',r=>r.fulfill({status:503,body:'Unavailable'}));
 await p.goto(origin+'/v2/?club=kadetten#season/table/map',{waitUntil:'domcontentloaded'});await p.locator('#qhl-team-list:not([hidden])').waitFor();await p.locator('[data-qhl-team="bern"]').click();await p.locator('.qhl-club-card').click();assert.equal(await p.locator('#qhl-detail-title').textContent(),'BSV Bern');await p.keyboard.press('Escape');
 if(process.env.QHL_MAP_LIVE==='1')assert.ok(tileResults.some(t=>t.status===200&&t.url.includes('/planet/')&&!t.url.endsWith('/planet')),'Real vector tiles loaded');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({views:results.length,markerSelection:true,clustering:true,profiles:true,historyReturn:true,leagueIsolation:true,productionUnchanged:true,fallbackList:true,axeViolations:0,errors,liveTiles:process.env.QHL_MAP_LIVE==='1',successfulTileRequests:tileResults.filter(t=>t.status===200).length}));
}catch(error){console.error('Map diagnostic:',errors);const p=browser?.contexts()[0]?.pages().at(-1);if(p){console.error(await p.locator('body').innerText());await p.screenshot({path:process.env.QHL_MAP_ERROR_SCREENSHOT||'qhl-map-error.png'});}throw error;}finally{await browser?.close();await new Promise(r=>server.close(r));}
