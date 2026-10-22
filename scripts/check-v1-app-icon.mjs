// Build first with npm run build:pages. Exercises the shipped V1 install identity and V2 isolation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist/client'),seed=vm.createContext({});
for(const file of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync('src/client/data/'+file+'.js','utf8'),seed);
const data=vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error();res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8'),errors=[];
 for(const [width,height] of [[375,844],[390,844],[844,390],[1280,844]])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/api/**',r=>{const i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(new URL(r.request().url()).pathname);return r.fulfill({contentType:'application/json',body:JSON.stringify(i>=0?data[i]:{ok:true,match:null,finished:null})})});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||r.request().url().includes('/api/')?r.fallback():r.abort());
  await context.addInitScript(({theme})=>{localStorage.setItem('fan-app-onboarding-v1','seen');localStorage.setItem('fan-v1-theme',theme);},{theme});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#season/table');
  const intro=page.locator('.install-intro[open]');await intro.waitFor();
  const img=intro.locator('img');assert.equal(await img.getAttribute('src'),'assets/app-v1-scarf-192.png');await img.evaluate(el=>el.decode());assert.equal(await img.evaluate(el=>el.naturalWidth),192);
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'assets/app-v1-scarf-favicon-64.png');assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'),'assets/app-v1-scarf-apple-180.png');
  const manifest=await (await page.request.get(origin+'/'+await page.locator('link[rel="manifest"]').getAttribute('href'))).json();assert.equal(manifest.name,'Meine Vereine');assert.equal(manifest.short_name,'Vereine');assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'),'Vereine');assert.ok(manifest.icons.every(icon=>icon.src.includes('app-v1-scarf')));
  await page.evaluate(axe);let audit=await page.evaluate(()=>axe.run());assert.deepEqual(audit.violations.map(v=>v.id),[],JSON.stringify(audit.violations));
  if(process.env.APP_ICON_SCREENSHOT&&width===390)await page.screenshot({path:process.env.APP_ICON_SCREENSHOT+'-'+theme+'.png'});
  await intro.locator('[data-later]').click();await page.locator('#app h1').waitFor();
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('.brand img').getAttribute('src'),'assets/logo.png');
  audit=await page.evaluate(()=>axe.run());assert.deepEqual(audit.violations.map(v=>v.id),[],JSON.stringify(audit.violations));
  console.log(JSON.stringify({width,height,theme,newInstallIcon:true,pngWidth:192,clubCrestPreserved:true,axeViolations:0}));await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server.close()}
