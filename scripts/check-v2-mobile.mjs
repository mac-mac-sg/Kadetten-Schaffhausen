/* V2 smartphone regression: npm run build:pages, then node scripts/check-v2-mobile.mjs.
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
    localStorage.setItem('v2:fan-app-onboarding-v1','seen');localStorage.setItem('v2:fan-app-install-intro-v1','seen');
    for(let i=0;i<data.length;i++)localStorage.setItem('v2:'+['kadetten','fcsg','otmar'][i]+'-public-data-v1',JSON.stringify({...data[i],checkedAt,...(new URL(location.href).searchParams.has('test-empty')?{games:[]}: {})}));
  },{data:snapshots,checkedAt});
  const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
  const results=[];
  for(const width of [360,375,390,430])for(const club of ['kadetten','fcsg','otmar'])for(const theme of ['light','dark'])for(const route of ['home','season/games','season/table','season/squad','club']) {
    await page.setViewportSize({width,height:width===360?740:844});
    await page.goto(origin+'/v2/?club='+club+'#'+route,{waitUntil:'domcontentloaded'});
    await page.locator('[data-v2-theme]').waitFor();
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-v2-theme]').tap();
    await page.waitForTimeout(150);
    await page.addScriptTag({content:axe});
    const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    const measure=await page.evaluate(()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('.top > button:not([hidden]):not(.install-button),.v2-match-action,.v2-story-link')].slice(0,8).map(e=>({text:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
    results.push({width,club,theme,route,...measure,issues});
    assert.ok(await page.locator('body > .top').evaluate(el=>el.getBoundingClientRect().height<=90),'compact header');
    if(route==='home'){
      const chrome=await page.evaluate(()=>{
        const header=document.querySelector('body > .top'),style=getComputedStyle(header),dock=getComputedStyle(document.querySelector('.dock'));
        const rgba=value=>value.match(/[\d.]+/g).map(Number);
        return {background:rgba(style.backgroundColor),text:rgba(style.color),
          controlColors:[...header.querySelectorAll('.brand,.v2-club-trigger,[data-v2-theme],#club-settings')].map(el=>getComputedStyle(el).color),
          headerColor:style.color,dockBorder:rgba(dock.borderTopColor),
          dates:[...document.querySelectorAll('.v2-story-link .story-copy p')].map(el=>parseFloat(getComputedStyle(el).fontSize))};
      });
      assert.ok(chrome.background[3]>0&&chrome.background[3]<1,'home header remains translucent');
      assert.ok(chrome.dates.every(size=>size===13),'news dates use a readable 13px size in both themes');
      assert.ok(chrome.controlColors.every(color=>color===chrome.headerColor),'header text and controls follow the glass surface');
      if(theme==='dark'){
        assert.ok(chrome.background.slice(0,3).every(value=>value<80),'dark header uses dark glass');
        assert.ok(chrome.text.slice(0,3).every(value=>value>200),'dark header uses light text and icons');
        assert.ok((chrome.dockBorder[3]??1)>.2,'dark dock has a clearer outer edge');
      }else{
        assert.ok(chrome.background.slice(0,3).every(value=>value>200),'light header retains its pale glass');
      }
      assert.equal(await page.locator('.v2-story .v2-text-link,.v2-story-link a').count(),0);
      assert.equal(await page.locator('.v2-story-link').count(),await page.locator('.v2-story').count());
      const newsCards=await page.locator('.v2-story-link').evaluateAll(cards=>cards.map(card=>{
        const image=card.querySelector('.v2-story-image'),copy=card.querySelector('.story-copy');
        const tile=card.getBoundingClientRect(),photo=image.getBoundingClientRect(),text=copy.getBoundingClientRect();
        const style=getComputedStyle(card),imageStyle=getComputedStyle(image),copyStyle=getComputedStyle(copy);
        return {background:style.backgroundColor,pageBackground:getComputedStyle(document.body).backgroundColor,
          corner:parseFloat(style.borderBottomLeftRadius),imageBottomCorner:parseFloat(imageStyle.borderBottomLeftRadius),
          padding:parseFloat(copyStyle.paddingLeft),gap:text.top-photo.bottom,containsText:tile.bottom>=text.bottom,
          shadow:style.boxShadow};
      }));
      for(const card of newsCards){
        assert.notEqual(card.background,'rgba(0, 0, 0, 0)','news has a shared tinted surface');
        assert.notEqual(card.background,card.pageBackground,'news surface separates it from the page');
        assert.ok(card.corner>=16&&card.imageBottomCorner===0,'photo and text form one rounded tile');
        assert.ok(card.padding>=16&&Math.abs(card.gap)<1&&card.containsText,'text sits inside the tile directly below its photo');
        assert.equal(card.shadow,'none','news tiles remain free of shadows');
      }
      const action=page.locator('.v2-match-action');
      if(await action.count()){
        assert.equal(await action.getAttribute('href'),await page.locator('.home-matchday .live-match').getAttribute('href'));
        const layer=await action.evaluate(el=>{
          const front=el.parentElement.querySelector('.live-match').getBoundingClientRect(),back=el.getBoundingClientRect(),label=el.querySelector('span').getBoundingClientRect();
          return {frontTop:front.top,frontBottom:front.bottom,frontRight:front.right,backTop:back.top,backBottom:back.bottom,backRight:back.right,labelTop:label.top,corner:parseFloat(getComputedStyle(el).borderTopRightRadius)};
        });
        assert.ok(layer.corner>0,'underlying tile has a rounded upper edge');
        assert.ok(layer.backTop>layer.frontTop&&layer.backTop<layer.frontBottom-80,'underlying tile continues behind the card');
        assert.ok(layer.backRight>layer.frontRight,'underlying tile is visible along the side');
        assert.ok(layer.labelTop>=layer.frontBottom,'action label remains uncovered');
        assert.ok(layer.backBottom-layer.frontBottom>=44,'uncovered action strip remains touch sized');
      }
    }
    assert.equal(measure.h1,1,club+' '+route+': heading');
    assert.equal(measure.overflow,false,club+' '+route+': overflow');
    assert.deepEqual(issues,[],club+' '+theme+' '+route+': accessibility');
    for(const target of measure.small)assert.ok(target.height>=44,target.text+': touch height');
    if(process.env.MOBILE_QA_SCREENSHOTS&&width===390&&club==='kadetten')await page.screenshot({path:path.join(process.env.MOBILE_QA_SCREENSHOTS,theme+'-'+route.replace('/','-')+'.png')});
  }
  for(const width of [360,390,430]) {
    await page.setViewportSize({width,height:740});
    await page.goto(origin+'/v2/?club=kadetten#club');
    await page.evaluate(()=>window.scrollTo({top:350,behavior:'instant'}));
    await page.waitForTimeout(100);
    await page.locator('.v2-scrollbar').waitFor({state:'visible'});
    assert.equal(await page.locator('.v2-scrollbar').getAttribute('data-surface'),'photo');
    await page.evaluate(()=>window.scrollTo({top:document.querySelector('.club-intro')?.getBoundingClientRect().bottom+scrollY+120||800,behavior:'instant'}));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.v2-scrollbar').getAttribute('data-surface'),'content');
    await page.locator('[data-v2-menu]').tap();
    await page.locator('[data-v2-select="fcsg"]').tap();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('html').getAttribute('data-club'),'fcsg');
    assert.equal(await page.evaluate(()=>scrollY),0);
    await page.locator('.dock a[href="#season/games"]').tap();
    for(const mode of ['calendar','week','list']) {
      await page.locator('[data-mode="'+mode+'"]').tap();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.ok(await page.locator('[data-mode="'+mode+'"]').evaluate(el=>getComputedStyle(el).backgroundColor!==getComputedStyle(el.parentElement).backgroundColor),'selected game mode stays visible');
    }
    await page.locator('.dock a[data-nav="news"]').tap();
    assert.equal(await page.locator('.v2-story-compact,.v2-scrollbar,.v2-hero-copy').count(),0);
    const entry=await page.locator('.home-title-zone').boundingBox();assert.ok(entry.height<420,'slim home entry');
    await page.locator('[data-v2-choose]').tap();
    assert.equal(await page.locator('.v2-club-dropdown').isVisible(),true);
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-v2-choose]').getAttribute('aria-expanded'),'false');
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.evaluate(()=>document.activeElement.hasAttribute('data-v2-pick')),'keyboard opens club choices');
    await page.evaluate(()=>window.scrollTo({top:30,behavior:'instant'}));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.v2-club-dropdown').isVisible(),false);
    assert.ok(await page.evaluate(()=>document.activeElement.hasAttribute('data-v2-choose')),'scroll returns focus to visible trigger');
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.locator('[data-v2-choose]').tap();
    await page.locator('.v2-news-heading h1').tap();
    assert.equal(await page.locator('.v2-club-dropdown').isVisible(),false);
    await page.locator('[data-v2-choose]').tap();
    if(process.env.MOBILE_QA_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.MOBILE_QA_SCREENSHOTS,'club-dropdown.png')});
    await page.addScriptTag({content:axe});
    assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)),[],'club chooser accessibility');
    await page.locator('[data-v2-pick="otmar"]').tap();
    assert.equal(await page.locator('html').getAttribute('data-club'),'otmar');
    await page.locator('#club-settings').tap();
    assert.ok(await page.locator('dialog[open]').count());
    await page.addScriptTag({content:axe});
    for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))),[],'settings '+theme+' accessibility');}
    assert.equal(await page.locator('.v2-test-menu').count(),1);
    await page.locator('.v2-test-menu summary').tap();
    await page.locator('[data-v2-demo]').tap();
    assert.equal(await page.locator('.v2-demo[open]').count(),1);
    await page.locator('.v2-demo [data-close]').tap();
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/v2/?club=kadetten#home');
  const firstNews=page.locator('.v2-story-link').first(),newsHref=await firstNews.getAttribute('href');
  await firstNews.scrollIntoViewIfNeeded();
  if(process.env.MOBILE_QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.MOBILE_QA_SCREENSHOTS,'news-link.png')});
  await firstNews.locator('.v2-story-image').tap();
  assert.equal(await page.evaluate(()=>location.hash),newsHref,'photo opens the complete article route');
  await page.goBack();
  await page.locator('.v2-story-link').first().locator('h2').tap();
  assert.equal(await page.evaluate(()=>location.hash),newsHref,'headline opens the same article');
  await page.goBack();
  await page.locator('.v2-story-link').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>location.hash),newsHref,'whole link works with keyboard');
  // Matchday colours belong to the dark card, independently of the page theme.
  for(const club of ['kadetten','fcsg','otmar']) {
    await page.goto(origin+'/v2/?club='+club+'#home');
    await page.locator('.home-matchday .live-match').waitFor();
    const states=['match-preview','match-preview is-matchday matchday-upcoming','is-matchday is-live','match-preview matchday-win','match-preview matchday-draw','match-preview matchday-loss'];
    for(const state of states) {
      const styles=[];
      for(const theme of ['dark','light']) {
        styles.push(await page.evaluate(({theme,state})=>{
          document.documentElement.dataset.theme=theme;
          const card=document.querySelector('.home-matchday .live-match');card.className='live-match '+(card.classList.contains('fcsg-matchday')?'fcsg-matchday ':'')+state;
          return [card,...card.querySelectorAll('*')].map(el=>{
            const css=getComputedStyle(el);
            return Object.fromEntries(['color','backgroundColor','backgroundImage','borderColor','boxShadow','fill','stroke'].map(key=>[key,css[key]]));
          });
        },{theme,state}));
      }
      assert.deepEqual(styles[1],styles[0],club+' '+state+': same dark matchday card in both themes');
    }
  }
  assert.deepEqual(errors,[]);
  console.log(`${results.length} V2 mobile view/theme cases and 3 touch flows plus 18 matchday theme comparisons passed.`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
