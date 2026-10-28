/* Optional browser regression: npm run build:pages, then node scripts/check-games-parity.mjs.
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
const reports=[],errors=[];
try {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
  const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
  for(const width of [390,320,1440])for(const theme of ['light','dark'])for(const [index,club] of ['kadetten','fcsg','otmar'].entries())for(const phase of (width===390?['preview','live']:['preview'])) {
    const data=structuredClone(snapshots[index]);
    const own=['Kadetten Schaffhausen','FC St.Gallen 1879','TSV St. Otmar St. Gallen'][index],away=club==='fcsg'?'FC Basel 1893':'GC Amicitia Zürich',league=club==='fcsg'?'Brack Super League':'QHL';
    const fixture={...data.games[0],home:own,away,league,leagueId:club==='fcsg'?24:undefined,time:'19:15',confirmed:true,venue:'Test-Halle',homeLogo:'assets/fcsg-logo.svg',awayLogo:'assets/fcsg-logo.svg'};
    data.games=[
      {...fixture,id:'parity-win',date:'2026-10-08',score:[32,26]},
      {...fixture,id:'parity-draw',date:'2026-10-09',home:away,away:own,score:[25,25]},
      {...fixture,id:'parity-loss',date:'2026-10-10',score:[23,31]},
      {...fixture,id:'parity-current',date:phase==='live'?'2026-10-12':'2026-10-18',score:null},
      {...fixture,id:'parity-future',date:'2026-10-25',score:null,league:club==='fcsg'?'Schweizer Cup':'Mobiliar-Cup M'}
    ];
    if(club!=='fcsg')data.clubLogos={...data.clubLogos,[own]:'assets/club-140684.webp',[away]:'assets/club-140684.webp'};
    const live=phase==='live'?{...data.games[3],live:true,liveScore:[12,10],score:[12,10],phase:'1. Halbzeit',clock:'20:00'}:null;
    let baseline;
    for(const version of ['v1','v2']) {
      const prefix=version==='v2'?'v2:':'',ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce',bypassCSP:true});
      await ctx.addInitScript(({prefix,theme,checkedAt})=>{
        const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:[checkedAt]));}static now(){return D.parse(checkedAt);}};
        localStorage.setItem(prefix+'fan-v1-theme',theme);
        for(const p of ['','v2:'])for(const key of ['fan-app-onboarding-v1','fan-app-install-intro-v1'])localStorage.setItem(p+key,'seen');
      },{prefix,theme,checkedAt});
      await ctx.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(r.request().url()).pathname.endsWith('/data')?data:{ok:true,checkedAt,match:live,finished:null})}));
      await ctx.route('https://**/*',r=>new URL(r.request().url()).pathname.startsWith('/api/')?r.fallback():r.request().resourceType()==='image'?r.fulfill({status:200,contentType:'image/png',body:fs.readFileSync(path.join(root,'src/client/assets/logo.png'))}):r.abort());
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin+(version==='v2'?'/v2/':'/')+'?club='+club+'#season/games');
      await page.waitForSelector('.game-card.result-win');await page.waitForFunction(()=>document.querySelectorAll('.game-timeline .game-card').length===5);
      if(phase==='live')await page.waitForSelector('.game-timeline .is-live,.game-card.fcsg-game-live');
      await page.waitForTimeout(120);
      const properties=['display','backgroundColor','backgroundImage','borderTopColor','borderTopWidth','borderLeftColor','borderLeftWidth','borderRadius','boxShadow','paddingTop','paddingRight','paddingBottom','paddingLeft','columnGap','rowGap','fontFamily','fontSize','fontWeight','lineHeight','color','textTransform','letterSpacing','flexDirection'];
      const selectors=['.meta','.game-result-label','.scoreline','.scoreline > strong','.scoreline > strong small','.scoreline > div','.scoreline > div > span:last-child','.crest,.clubmark','.venue','.actions .button','.current-label','.live-score','.live-score > strong','.live-score b','.live-heading','.match-preview-time'];
      const measured=await page.evaluate(({properties,selectors})=>[...document.querySelectorAll('.game-timeline .game-card')].map(card=>{
        const style=e=>e?Object.fromEntries(properties.map(p=>[p,getComputedStyle(e)[p]])):null;
        return {classes:card.className,card:style(card),parts:Object.fromEntries(selectors.map(s=>[s,style(card.querySelector(s))]))};
      }),{properties,selectors});
      if(version==='v1')baseline=measured;else assert.deepEqual(measured,baseline,JSON.stringify({club,theme,width,phase})+': V2 games follow V1');
      for(const state of ['win','draw','loss']) {
        const edge=await page.locator('.game-card.result-'+state+':not(.current-game)').evaluate(e=>({color:getComputedStyle(e).borderLeftColor,width:getComputedStyle(e).borderLeftWidth,wanted:getComputedStyle(e).getPropertyValue('--result-color').trim()}));
        assert.equal(edge.width,'2px');assert.notEqual(edge.color,'rgba(0, 0, 0, 0)');
        assert.ok(await page.locator('.game-card.result-'+state+':not(.current-game) .game-result-label').innerText());
      }
      assert.equal(await page.locator('h1').count(),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.addScriptTag({content:axe});
      assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))),[],JSON.stringify({version,club,theme,width}));
      if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/games-'+version+'-'+club+'-'+theme+'-'+phase+'.png'});}
      await page.selectOption('#competition',league);await page.waitForFunction(()=>document.querySelectorAll('.game-timeline .game-card').length===4);
      await page.locator('.game-card.result-win:not(.current-game) .actions a').click();await page.waitForTimeout(100);
      assert.match(new URL(page.url()).hash,/#match\/parity-win\//);
      reports.push({version,club,theme,width,phase,cards:measured.length});await ctx.close();
    }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:reports.length,errors,reports},null,2));
} finally {await browser?.close();await new Promise(r=>server.close(r));}
