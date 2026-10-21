/* Compact standings regression: npm run build:pages, then run with browser/axe overrides. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve(process.env.STANDINGS_CLIENT_DIR||'dist/client'),seed=vm.createContext({}),clubs=['kadetten','fcsg','otmar'];
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
 const page=pages[0],measure=()=>[...document.querySelectorAll('.standings-table tbody tr')].map(e=>{const r=e.getBoundingClientRect(),cells=[...e.children].filter(c=>getComputedStyle(c).display!=='none').map(c=>c.getBoundingClientRect());return {height:r.height,name:e.querySelector('.standing-name').textContent,overlap:cells.some((c,i)=>i&&c.left<cells[i-1].right-1),overflow:e.scrollWidth>e.clientWidth+1};});
 for(const width of [320,375,390,430,1280])for(const club of clubs)for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/');await page.evaluate(t=>localStorage.setItem('fan-v1-theme',t),theme);
  await page.goto(origin+'/?club='+club+'&qa='+width+theme+'#season/table');await page.locator('.standings-table tbody tr').first().waitFor();await page.evaluate(async()=>document.fonts.ready);
  const check=async(label)=>{
   const rows=await page.evaluate(measure);assert.ok(rows.length>0);assert.ok(rows.every(r=>!r.overflow&&!r.overlap),JSON.stringify({label,rows}));
   if(width<=640){const sorted=rows.map(r=>r.height).sort((a,b)=>a-b);assert.ok(sorted[Math.floor(sorted.length/2)]<=72,label+': median row height '+sorted);assert.equal(await page.locator('.standings-table .standing-meta').first().evaluate(e=>getComputedStyle(e).clipPath),'inset(50%)');}
   assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.evaluate(axe);const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));assert.deepEqual(violations,[],label);
   const median=rows.map(r=>r.height).sort((a,b)=>a-b)[Math.floor(rows.length/2)];results.push({width,club,theme,label,rows:rows.length,median});
   if(process.env.STANDINGS_SCREENSHOTS&&width===390){await page.screenshot({path:path.join(process.env.STANDINGS_SCREENSHOTS,label+'-'+theme+'.png')});}
  };
  await check(club+'-qhl');
  if(club==='kadetten'){await page.locator('[data-league="EHL"]').click();await check(club+'-ehl');}
 }
 // Browser zoom/text enlargement: full team names can wrap without clipping.
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/?club=fcsg#season/table');await page.evaluate(()=>{document.querySelectorAll('.standing-name').forEach(e=>e.style.fontSize='20px');});assert.ok((await page.evaluate(measure)).every(r=>!r.overlap&&!r.overflow));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({views:results.length,results,axe:0,errors}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
