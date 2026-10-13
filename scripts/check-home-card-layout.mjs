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

  let empty=false,live=null;
  await page.route('**/api/**',async route=>{
    const index=endpoints.indexOf(new URL(route.request().url()).pathname);
    const data=index<0?{ok:true,checkedAt,match:live,finished:null}:empty?{...snapshots[index],games:[]}:snapshots[index];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
  });
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'||route.request().url().includes('/api/')?route.fallback():route.abort());
  await page.addInitScript(({data,checkedAt})=>{
    const RealDate=Date;window.Date=class extends RealDate { constructor(...args){super(...(args.length?args:[checkedAt]));} static now(){return RealDate.parse(checkedAt);} };
    localStorage.setItem('fan-app-onboarding-v1','seen');localStorage.setItem('fan-app-install-intro-v1','seen');

  },{data:snapshots,checkedAt});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  const axe=process.env.GAMES_AXE_SCRIPT ? fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8') : null;
  let cases=0;
  for(const viewport of [{width:390,height:844},{width:1280,height:844},{width:320,height:667}]) {
    await page.setViewportSize(viewport);
    const boxes=[];
    for(const [index,club] of ['kadetten','fcsg','otmar'].entries()) {
      const original=structuredClone(snapshots[index]);
      for(const stage of ['preview','day','live','finished']) {
        const game={...original.games.find(g=>!g.score),date:stage==='preview'?'2026-10-15':'2026-10-12',time:'18:45',confirmed:true};
        delete game.score;
        if(stage==='finished')game.score=index===1?[2,1]:[30,25];
        snapshots[index].games=[game];
        live=stage==='live'?{...game,score:index===1?[1,0]:[13,11],liveScore:index===1?[1,0]:[13,11],live:true,status:'live',phase:'1. Halbzeit',clock:'25:00'}:null;
        await page.evaluate(data=>{for(let i=0;i<data.length;i++)localStorage.setItem(['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify(data[i]));},snapshots);
        await page.goto(origin+'/?club='+club+'&layout-stage='+stage+'&width='+viewport.width+'#home',{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(200);
        if(live)await page.waitForSelector('.home-matchday .is-live',{timeout:5000});
        const box=await page.evaluate(()=>{
          const card=document.querySelector('.home-matchday .live-match'),rect=card.getBoundingClientRect();
          const rows=[...card.querySelectorAll('.live-heading,.live-score,.match-preview-time,.live-link,.home-countdown')].map(el=>({name:el.className,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
          return {text:card.innerText, x:rect.x,y:rect.y,width:rect.width,height:rect.height,rows,h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,clipped:rows.some(row=>row.top<rect.top||row.bottom>rect.bottom)};
        });
        console.log(JSON.stringify({club,stage,...viewport,box}));
        assert.ok(box.text.includes(stage==='preview'?'NÄCHSTES SPIEL':stage==='day'?'MATCHDAY':stage==='live'?'JETZT LIVE':'HEUTE GESPIELT'),club+' '+stage+': correct fixture phase');
        assert.equal(box.h1,1);assert.equal(box.overflow,false);assert.equal(box.clipped,false,club+' '+stage+': no clipped content');
        for(let i=1;i<box.rows.length;i++)assert.ok(box.rows[i].top>=box.rows[i-1].bottom-1,club+' '+stage+': content rows do not overlap');
        if(axe){await page.addScriptTag({content:axe});assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)),[],club+' '+stage+': accessibility');}
        boxes.push(box);cases++;
        if(viewport.width===390&&stage==='day')await page.screenshot({path:'/tmp/card-'+club+'.png'});
      }
      snapshots[index]=original;
    }
    for(const box of boxes)for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-boxes[0][key])<.1,`${viewport.width}: shared card ${key}`);
  }
  assert.deepEqual(errors,[]);console.log(`${cases} shared home-card cases passed.`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
