/* Optional real-browser theme audit. Browser overrides match check-games-layout.mjs.
   V1_THEME_FIXTURES_DIR optionally supplies public {club}-data.json snapshots. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.GAMES_PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'dist/client'),clubs=['kadetten','fcsg','otmar'],now='2026-10-14T12:30:00Z',seed=vm.createContext({});
for(const f of ['fallback','fcsg-fallback','otmar-fallback'])vm.runInContext(fs.readFileSync(path.join(root,'src/client/data/'+f+'.js'),'utf8'),seed);
const data=process.env.V1_THEME_FIXTURES_DIR?clubs.map(c=>JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,c+'-data.json'),'utf8'))):vm.runInContext('[{games,tables,teamRecords,stories,clubLogos},fcsgData,otmarFallback]',seed);
for(const d of data){d.checkedAt=now;for(const s of Object.values(d.status||{})){s.ok=true;s.updatedAt=now;}}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://local'),f=path.resolve(dir,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!f.startsWith(dir+path.sep))throw Error();const content=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end();}});
let browser;const reports=[],errors=[];
try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.GAMES_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});const axe=fs.readFileSync(process.env.GAMES_AXE_SCRIPT,'utf8');
 const ctx=await browser.newContext({serviceWorkers:'block',bypassCSP:true,reducedMotion:'reduce',deviceScaleFactor:2.75,viewport:{width:390,height:844}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/api/**',async r=>{const url=new URL(r.request().url()),p=url.pathname,i=['/api/data','/api/fcsg/data','/api/otmar/data'].indexOf(p);let d=i>=0?data[i]:{ok:true,checkedAt:now,match:null,finished:null};if(p==='/api/ehf-reports/chambery'&&process.env.V1_THEME_FIXTURES_DIR&&fs.existsSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json')))d=JSON.parse(fs.readFileSync(path.join(process.env.V1_THEME_FIXTURES_DIR,'ehf-light-fixture.json'),'utf8'));if(p.includes('/articles/'))d={id:p.split('/').at(-1),version:url.searchParams.get('v'),html:'<h2>Vereinsbericht</h2><p>Offizielle Vereinsnachrichten und Informationen zum letzten Spiel.</p>'};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
 await ctx.addInitScript(now=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return D.parse(now);}};for(const prefix of ['','v2:']){localStorage.setItem(prefix+'fan-app-onboarding-v1','seen');localStorage.setItem(prefix+'fan-app-install-intro-v1','seen');}},now);
 async function compareUnderlayWithV2(){
  const action=page.locator('.v1-match-action');if(!await action.count())return;
  const colours=locator=>locator.evaluate(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e).color}));
  const glass=locator=>locator.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,blur:s.backdropFilter};});
  const dock=await glass(page.locator('.dock'));
  const edge=await page.locator('.dock').evaluate(e=>{const s=getComputedStyle(e),c=s.borderTopColor;return {width:s.borderTopWidth,alpha:c.startsWith('rgba')?Number(c.match(/[\d.]+/g).at(-1)):1,shadow:s.boxShadow,overflow:s.overflow,backgroundClip:s.backgroundClip,backface:s.backfaceVisibility};});
  assert.equal(edge.overflow,'hidden','Navigation clips glass and selection at its rounded contour');
  assert.equal(edge.backgroundClip,'padding-box','Glass tint does not overlap the subtle border');
  assert.equal(edge.backface,'hidden','Navigation uses the composited mobile edge treatment');
  assert.equal(edge.width,'1px','Navigation keeps a sharp one-pixel edge');
  assert.ok(edge.alpha<=.11,'Navigation edge has low opacity');
  assert.ok(!edge.shadow.includes('inset'),'Navigation has no bright inner rim');
  const expected=await colours(action),club=await page.locator('html').getAttribute('data-club'),theme=await page.locator('html').getAttribute('data-theme'),reference=await ctx.newPage();
  try {
   await reference.setViewportSize(page.viewportSize());await reference.goto(origin+'/v2/?club='+club+'#home');
   if(await reference.locator('html').getAttribute('data-theme')!==theme)await reference.locator('[data-v2-theme]').click();
   assert.deepEqual(await colours(reference.locator('.v2-match-action')),expected,club+' '+theme+': V1 underlay matches V2');
   assert.deepEqual(await glass(reference.locator('.dock')),dock,club+' '+theme+': V1 navigation glass matches V2');
  } finally {await reference.close();}
 }
 async function compareTableSpacing(label){
  if(!/^\w+ table$/.test(label))return;
  const club=label.split(' ')[0],gap=selector=>page.locator(selector).first().evaluate(e=>e.getBoundingClientRect().top-document.querySelector('body > .top').getBoundingClientRect().bottom);
  const tableGap=await gap('.standings-season .season-header + *');
  await page.goto(origin+'/?club='+club+'#season/squad');
  const squadGap=await gap('.season .subhead');
  assert.ok(Math.abs(tableGap-squadGap)<1,club+': table starts with the same gap as the roster heading ('+tableGap+' vs '+squadGap+')');
  await page.goto(origin+'/?club='+club+'#season/table');
 }
 async function checkDisclaimerPopup(label){
  const settings=page.locator('.club-settings-dialog');
  assert.equal(await settings.locator('h2').textContent(),'Einstellungen');
  assert.deepEqual(await settings.locator('.settings-group h3').allTextContents(),['Meine Vereine','Darstellung']);
  assert.equal(await settings.locator('form').count(),0);
  const rows=await settings.locator('.club-settings-list label,.theme-setting').evaluateAll(rows=>rows.map(e=>e.getBoundingClientRect().height));
  assert.ok(Math.max(...rows)-Math.min(...rows)<1,'Settings switch rows use consistent heights');

  assert.equal(await settings.locator('.settings-app-info > .settings-info-row').count(),1);
  const inline=await settings.locator('.settings-app-info').evaluate(e=>{const a=e.querySelector('button').getBoundingClientRect(),b=e.querySelector('.settings-update').getBoundingClientRect();return {height:e.getBoundingClientRect().height,alignment:Math.abs(a.y+a.height/2-b.y-b.height/2),overflow:e.scrollWidth>e.clientWidth};});
  assert.ok(inline.height<=52&&inline.alignment<1&&!inline.overflow,'Disclaimer and timestamp fit on a single row');
  assert.match(await settings.locator('[data-settings-updated]').textContent(),/\d{2}\.\d{2}\.\d{4}/);
  await settings.locator('[data-open-disclaimer]').click();
  assert.equal(await page.locator('.app-disclaimer-dialog').isVisible(),true);
  assert.equal(await settings.isVisible(),true);
  await audit(label);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.app-disclaimer-dialog').isVisible(),false);
  assert.equal(await settings.isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-open-disclaimer]')),true);
  await settings.locator('[data-open-disclaimer]').click();await page.locator('.app-disclaimer-dialog form button').click();
  assert.equal(await page.locator('.app-disclaimer-dialog').isVisible(),false);
 }
 async function checkCompactGames(label){
  if(!label.includes('games-list'))return;
  const sizes=await page.locator('.game-timeline .game-card').evaluateAll(cards=>cards.map(e=>({current:e.matches('.current-game,.fcsg-game-live'),height:e.getBoundingClientRect().height,link:e.querySelector('.actions a')?.getAttribute('href')})));
  const current=sizes.find(e=>e.current),compact=sizes.filter(e=>!e.current);
  assert.ok(compact.length>0,label+': compact fixtures present');
  assert.ok(compact.every(e=>e.link?.startsWith('#match/')),label+': every fixture still opens its match');
  if(current)assert.ok(compact.every(e=>e.height<current.height*.75),label+': compact fixtures leave more room than the current game');
  const card=page.locator('.game-timeline .game-card:not(.current-game):not(.fcsg-game-live)').first();
  await card.scrollIntoViewIfNeeded();
  const href=await card.locator('.actions a').getAttribute('href');
  const hit=await card.evaluate(e=>{const b=e.getBoundingClientRect();const x=b.x+b.width/2,y=b.y+b.height/2;return {x,y,href:document.elementFromPoint(x,y)?.closest('a')?.getAttribute('href')};});
  assert.equal(hit.href,href,label+': whole fixture is tappable');
  await page.mouse.click(hit.x,hit.y);await page.waitForTimeout(60);assert.equal(new URL(page.url()).hash,href);
  await page.goto(origin+'/?club='+label.match(/\b(kadetten|fcsg|otmar)\b/)[1]+'#season/games');await page.locator('[data-mode="list"]').click();
 }
 async function checkLightSurfaceHierarchy(label){
  if(!label.includes('games-list')||await page.locator('html').getAttribute('data-theme')!=='light')return;
  const colours=await page.evaluate(()=>({page:getComputedStyle(document.body).backgroundColor,card:getComputedStyle(document.querySelector('.game-timeline .game-card:not(.current-game):not(.fcsg-game-live)')).backgroundColor,bar:getComputedStyle(document.querySelector('.game-control-bar')).backgroundColor,selected:getComputedStyle(document.querySelector('[data-mode][aria-pressed="true"]')).backgroundColor}));
  const rgb=value=>value.match(/[\d.]+/g).map(Number),blend=(value,under)=>{const a=rgb(value),b=rgb(under),opacity=a[3]??1;return a.slice(0,3).map((n,i)=>n*opacity+b[i]*(1-opacity));};
  const luminance=values=>values.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const card=luminance(blend(colours.card,colours.page)),canvas=luminance(rgb(colours.page).slice(0,3)),bar=luminance(blend(colours.bar,colours.page));
  assert.ok(card-canvas>=.12,label+': white cards clearly separate from the page canvas');
  assert.ok(card-bar>=.15,label+': tinted filter bar clearly separates from white cards');
  assert.ok(luminance(rgb(colours.selected).slice(0,3))<bar-.2,label+': selected view has a strong filled state');
 }
 async function checkLeagueButtons(label){
  if(!label.endsWith(' table')||await page.locator('html').getAttribute('data-theme')!=='light'||!await page.locator('.league-toggle').count())return;
  const states=await page.locator('.league-toggle button').evaluateAll(buttons=>buttons.map(e=>{const s=getComputedStyle(e);return {selected:e.getAttribute('aria-pressed')==='true',background:s.backgroundColor,color:s.color,border:s.borderTopWidth,borderStyle:s.borderTopStyle,height:e.getBoundingClientRect().height};}));
  for(const s of states){assert.ok(s.height>=44,label+': competition has a full touch target');assert.equal(s.border,'1px',label+': competition has a visible border');assert.equal(s.borderStyle,'solid');assert.notEqual(s.background,'rgba(0, 0, 0, 0)',label+': both competitions have an opaque button surface');if(s.selected)assert.equal(s.color,'rgb(255, 255, 255)',label+': selected competition uses white text');else assert.equal(s.background,'rgb(255, 255, 255)',label+': unselected competition remains a white button');}
  if(states.length>1){assert.notEqual(states[0].background,states[1].background,label+': competition states are distinct');await page.locator('[data-league="EHL"]').click();assert.equal(await page.locator('[data-league="EHL"]').getAttribute('aria-pressed'),'true');await page.locator('[data-league="QHL"]').click();}
 }
 async function checkGamesHeaderAlignment(label){
  if(!label.includes('games-list')&&!label.endsWith(' calendar'))return;
  const layout=await page.locator('.game-control-bar').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('body > .top').getBoundingClientRect(),s=getComputedStyle(document.body,'::before');return {left:a.left,headerLeft:b.left,width:a.width,headerWidth:b.width,gap:a.top-b.bottom,coverHeight:parseFloat(s.height),coverLeft:parseFloat(s.left),coverWidth:parseFloat(s.width),viewport:innerWidth,cover:s.backgroundColor};});
  assert.ok(Math.abs(layout.left-layout.headerLeft)<.5,label+': controls align with club header');
  assert.ok(Math.abs(layout.width-layout.headerWidth)<.5,label+': controls match club header width');
  assert.ok(layout.coverHeight>=layout.gap,label+': entire vertical gap is covered');
  assert.ok(Math.abs(layout.coverLeft)<.5&&Math.abs(layout.coverWidth-layout.viewport)<.5,label+': gap backing spans the viewport');
  assert.ok(!layout.cover.startsWith('rgba('),label+': gap backing is opaque');
  assert.equal(await page.locator('.game-view-toggle').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)',label+': no rectangular panel behind the view buttons');
  const bar=page.locator('.game-control-bar');
  assert.equal(await bar.evaluate(e=>getComputedStyle(e,'::before').content),'none',label+': no old gap cover overlaps the top border');
  await page.evaluate(async()=>document.fonts.ready);
  const visible=await bar.screenshot();
  await bar.evaluate(e=>e.style.visibility='hidden');
  const rect=await bar.boundingBox();
  try {assert.ok(!(await page.screenshot({clip:rect})).equals(visible),label+': toolbar is painted above its opaque backing');}
  finally {await bar.evaluate(e=>e.style.removeProperty('visibility'));}
  for(const selector of ['[data-mode="list"]','[data-mode="calendar"]','#competition'])assert.equal(await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true,label+': '+selector+' is directly tappable');
  const clip=await page.locator('.game-control-bar').evaluate(e=>({x:0,y:0,width:innerWidth,height:Math.floor(e.getBoundingClientRect().bottom)}));
  const before=await page.screenshot({clip});
  await page.evaluate(height=>{const probe=document.createElement('div');probe.id='chrome-underlay-probe';probe.style.cssText='position:fixed;top:0;left:0;width:100%;height:'+height+'px;background:#ff00ff;z-index:23;pointer-events:none';document.body.append(probe);},clip.height);
  try {assert.deepEqual(await page.screenshot({clip}),before,label+': content behind the entire chrome, including rounded corners, is invisible');}
  finally {await page.locator('#chrome-underlay-probe').evaluate(e=>e.remove());}

 }
 async function audit(label){await checkCompactGames(label);await checkLightSurfaceHierarchy(label);await checkGamesHeaderAlignment(label);await compareTableSpacing(label);await checkLeagueButtons(label);if(label.includes('home'))await compareUnderlayWithV2();await page.waitForTimeout(120);await page.evaluate(async()=>document.fonts.ready);await page.addScriptTag({content:axe});const r=await page.evaluate(async()=>({theme:document.documentElement.dataset.theme,h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,why:n.failureSummary}))}))}));reports.push({label,...r});console.log(JSON.stringify({label,violations:r.violations.length}));if(process.env.V1_THEME_SCREENSHOTS&&/kadetten (home|settings|games-list|table|player)/.test(label))await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,label.replaceAll(' ','-')+'.png')});}
 await page.goto(origin+'/?club=kadetten#home');await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').check();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await audit('kadetten settings');await checkDisclaimerPopup('light disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 for(let i=0;i<clubs.length;i++){const club=clubs[i],d=data[i],player=club==='fcsg'?d.players[0].id:club==='otmar'?d.roster[0].number:6,game=d.games.filter(g=>g.score).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||d.games[0],story=d.stories[0];
  const routes=[['home','home'],['season/games','games-list'],['season/games','calendar'],['season/table','table'],['season/squad','squad'],['player/'+player,'player'],['club','club'],['news/'+story.id,'article'],['match/'+game.id+'/stats','match-stats'],['match/'+game.id+'/squad','lineup'],['match/'+game.id+'/overview','ticker']];
  if(club==='kadetten'&&d.games.some(g=>g.id==='chambery'))routes.push(['match/chambery/stats','ehf-stats'],['match/chambery/report','ehf-report']);
  for(const [route,label] of routes){await page.goto(origin+'/?club='+club+'#'+route);if(['games-list','calendar'].includes(label))await page.locator('[data-mode="'+(label==='games-list'?'list':label)+'"]').click();await audit(club+' '+label);}
 }
 await page.goto(origin+'/?club=kadetten#home');await page.evaluate(()=>window.showAppIntroduction());for(let n=0;n<4;n++){await audit('introduction '+n);await page.locator('.app-introduction [data-next]').click();}
 await page.setViewportSize({width:375,height:667});await page.locator('#club-settings').click();await audit('small settings');await page.locator('[data-v1-light-mode]').uncheck();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await audit('dark settings');await checkDisclaimerPopup('dark disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 for(const club of clubs){for(const route of ['home','season/games','season/squad']){await page.goto(origin+'/?club='+club+'#'+route);if(route==='season/games')await page.locator('[data-mode="list"]').click();await audit('dark '+club+' '+(route==='season/games'?'games-list':route));if(route==='season/games'){await page.locator('[data-mode=calendar]').click();await audit('dark '+club+' calendar');await page.locator('[data-mode=list]').click();}}}
 await page.goto(origin+'/v2/?club=kadetten#home');await page.locator('#club-settings').click();assert.equal(await page.locator('[data-v1-light-mode]').count(),0);await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.goto(origin+'/?club=kadetten#home');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').check();await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.setViewportSize({width:1280,height:844});
 for(let i=0;i<clubs.length;i++){const d=data[i],player=i===1?d.players[0].id:i===2?d.roster?.[0]?.number||6:6,g=d.games.filter(g=>g.score).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||d.games[0];for(const route of ['home','season/games','season/table','player/'+player,'match/'+g.id+'/stats']){await page.goto(origin+'/?club='+clubs[i]+'#'+route);if(route==='season/games')await page.locator('[data-mode="list"]').click();await audit('desktop '+clubs[i]+' '+(route==='season/games'?'games-list':route));if(route==='season/games'){await page.locator('[data-mode=calendar]').click();await audit('desktop '+clubs[i]+' calendar');await page.locator('[data-mode=list]').click();}}}
 await page.locator('#club-settings').click();await checkDisclaimerPopup('desktop disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();
 if(process.env.V1_THEME_REPORT)fs.writeFileSync(process.env.V1_THEME_REPORT,JSON.stringify({reports,errors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(reports.filter(r=>r.violations.length||r.overflow||r.h1!==1),[]);console.log(reports.length+' theme/accessibility checks passed.');await ctx.close();
}finally{await browser?.close();await new Promise(r=>server.close(r));}
