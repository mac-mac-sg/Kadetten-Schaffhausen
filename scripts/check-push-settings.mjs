// UI integration test with device APIs/push-service responses simulated; no real recipient is contacted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import {createECDH,randomBytes} from 'node:crypto';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright');
const dir=path.resolve('dist/client'),seed=vm.createContext({});
for(const f of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync('src/client/data/'+f+'.js','utf8'),seed);
const snapshots=vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{try{const file=path.resolve(dir,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(dir+path.sep))throw Error();res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
const key=createECDH('prime256v1');key.generateKeys();const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/qa-only',keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'}),calls=[],errors=[];
 await context.route('**/api/**',async r=>{
  const request=r.request(),url=new URL(request.url()),i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(url.pathname);
  if(url.pathname.startsWith('/api/push/'))calls.push({path:url.pathname,method:request.method(),body:request.postDataJSON(),token:request.headers().authorization});
  return r.fulfill({contentType:'application/json',body:JSON.stringify(i>=0?snapshots[i]:url.pathname==='/api/push/config'?{enabled:true,publicKey:subscription.keys.p256dh}:{ok:true,checkedAt:new Date().toISOString(),match:null,finished:null})});
 });
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||r.request().url().includes('/api/')?r.fallback():r.abort());
 await context.addInitScript(({subscription})=>{
  for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');localStorage.removeItem(prefix+'match-push-device-v1');}
  class MockNotification {static permission='default';static async requestPermission(){this.permission='granted';return 'granted'}}
  Object.defineProperty(window,'Notification',{value:MockNotification,configurable:true});
  window.PushManager=class {};
  let subscribed=null;const reg={scope:location.origin+'/v2/',pushManager:{getSubscription:async()=>subscribed,subscribe:async()=>subscribed={toJSON:()=>subscription,unsubscribe:async()=>{subscribed=null;return true}}}};
  Object.defineProperty(navigator.serviceWorker,'ready',{get:()=>Promise.resolve(reg),configurable:true});
 },{subscription});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 for(const width of [390,1280])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:844});await page.goto(origin+'/v2/');await page.evaluate(t=>localStorage.setItem('v2:fan-v1-theme',t),theme);await page.reload();
  await page.locator('#club-settings').click();await page.locator('[data-open-push]').click();const dialog=page.locator('.push-settings-dialog');await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('[data-push-type]').count(),4);
  if(process.env.PUSH_QA_SCREENSHOT&&width===390)await page.screenshot({path:process.env.PUSH_QA_SCREENSHOT+'-'+theme+'.png'});
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.evaluate(axe);const a=await page.evaluate(()=>axe.run());assert.deepEqual(a.violations.map(v=>v.id),[],JSON.stringify(a.violations));
  // A preference selected before activation must remain selected during the async permission flow.
  await dialog.locator('[data-push-type="reminder"]').uncheck();await dialog.locator('[data-push-enable]').click();await dialog.locator('[data-push-status]').filter({hasText:'Aktiv auf diesem Gerät.'}).waitFor();
  const put=calls.filter(c=>c.method==='PUT').at(-1);assert.deepEqual(put.body.types,['start','half','final']);assert.equal(put.body.clubs.length,3);assert.match(put.token,/^Bearer [-\w]{43}$/);
  await dialog.locator('[data-push-type="half"]').uncheck();await dialog.locator('[data-push-status]').filter({hasText:'Auswahl gespeichert.'}).waitFor();assert.deepEqual(calls.filter(c=>c.method==='PUT').at(-1).body.types,['start','final']);
  await dialog.locator('[data-push-test]').click();await dialog.locator('[data-push-status]').filter({hasText:'Test an den Push-Dienst'}).waitFor();assert.equal(calls.at(-1).path,'/api/push/test');
  await dialog.locator('[data-push-disable]').click();await dialog.locator('[data-push-status]').filter({hasText:'Noch nicht aktiviert.'}).waitFor();assert.equal(calls.at(-1).method,'DELETE');
  await dialog.locator('[data-push-close]').click();assert.equal(await page.locator('.club-settings-dialog[open]').count(),1);
  console.log(JSON.stringify({width,theme,axeViolations:a.violations.length,activation:true,preferences:true,test:true,deactivation:true}));
 }
 await page.goto(origin+'/v2/');await page.evaluate(()=>Notification.permission='denied');await page.locator('#club-settings').click();await page.locator('[data-open-push]').click();assert.equal(await page.locator('[data-push-enable]').isDisabled(),true);assert.match(await page.locator('[data-push-status]').textContent(),/blockiert/);await page.locator('[data-push-close]').click();await page.locator('[data-close-clubs]').click();
 await page.evaluate(()=>{delete window.PushManager});await page.locator('#club-settings').click();await page.locator('[data-open-push]').click();assert.equal(await page.locator('[data-push-enable]').isDisabled(),true);assert.match(await page.locator('[data-push-status]').textContent(),/unterstützt/);
 await page.goto(origin+'/');const before=calls.length;await page.locator('#club-settings').click();assert.equal(await page.locator('[data-open-push]').count(),0);assert.equal(calls.length,before);assert.deepEqual(errors,[]);
 console.log('V1: no notification settings or push requests; no browser script errors.');
}finally{await browser?.close();server.close()}
