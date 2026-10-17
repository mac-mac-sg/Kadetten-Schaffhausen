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
  const preview=page.locator('.game-timeline .game-card:not(.current-game):not(.fcsg-game-live):not(.finished)').first();
  if(await preview.count()){
   assert.equal(await preview.locator('.scoreline small').isVisible(),false,label+': no duplicate preview caption');
   assert.equal(await preview.locator('.scoreline > strong').evaluate(e=>getComputedStyle(e).fontSize),'18px');
  }
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
  for(const s of states){assert.ok(s.height>=44,label+': competition has a full touch target');assert.equal(s.border,'1px',label+': competition has a visible border');assert.equal(s.borderStyle,'solid');if(s.selected)assert.equal(s.color,'rgb(255, 255, 255)',label+': selected competition uses white text');else assert.equal(s.background,'rgba(0, 0, 0, 0)',label+': unselected competition belongs to the shared control tray');}
  if(states.length>1){assert.notEqual(states[0].background,states[1].background,label+': competition states are distinct');await page.locator('[data-league="EHL"]').click();assert.equal(await page.locator('[data-league="EHL"]').getAttribute('aria-pressed'),'true');await page.locator('[data-league="QHL"]').click();}
 }
 async function checkGamesHeaderAlignment(label){
  if(!label.includes('games-list')&&!label.endsWith(' calendar'))return;
  const layout=await page.locator('.game-control-bar').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('body > .top').getBoundingClientRect(),s=getComputedStyle(document.body,'::before');return {left:a.left,headerLeft:b.left,width:a.width,headerWidth:b.width,gap:a.top-b.bottom,coverHeight:parseFloat(s.height),coverLeft:parseFloat(s.left),coverWidth:parseFloat(s.width),viewport:innerWidth,cover:s.backgroundColor};});
  assert.ok(Math.abs(layout.left-layout.headerLeft)<.5,label+': controls align with club header');
  const labelFits=await page.locator('#competition').evaluate(e=>{if(e.value!=='Alle')return true;const c=document.createElement('canvas').getContext('2d'),s=getComputedStyle(e);c.font=s.font;return c.measureText(e.selectedOptions[0].text).width+34<=e.clientWidth;});
  assert.ok(labelFits,label+': competition label fits beside the dropdown arrow');

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
 async function checkExpandedClubHistory(label){
  if(!label.endsWith(' club'))return;
  const history=page.locator('.club-history');
  assert.equal(await history.locator('details,[data-club-trophy],[data-club-title-year]').count(),0,label+': timeline has no collapsed text or cabinet links');
  const details=history.locator('.club-chapter-detail');
  if(label==='kadetten club')assert.ok(await details.count()>0,label+': expanded chapter details are present');
  for(const detail of await details.all()){
   await detail.scrollIntoViewIfNeeded();
   assert.ok(await detail.isVisible(),label+': extra text is readable without opening anything');
   assert.ok(await detail.evaluate(e=>e.getBoundingClientRect().height>0&&!e.closest('details')),label+': detail is in the timeline flow');
  }
  if(process.env.V1_THEME_SCREENSHOTS&&label==='kadetten club')await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'kadetten-expanded-timeline.png')});
 }
 async function checkHandballRankingPhotos(label){
  if(!label.includes('table'))return;
  const club=await page.locator('html').getAttribute('data-club');
  if(club==='fcsg')return;
  const rows=await page.locator('.player-leader').evaluateAll(rows=>rows.map(e=>({id:Number(e.getAttribute('href').split('/').at(-1)),image:e.querySelector('img').getAttribute('src')})));
  if(club==='otmar')assert.ok(rows.length>0,label+': Otmar player rankings exist');
  for(const row of rows){const expected=club==='otmar'?data[2].roster.find(p=>p.number===row.id)?.image||'assets/club-140684.webp':'assets/player-'+row.id+'.webp';assert.equal(row.image,expected,label+': ranking uses the active club player photo');}
  if(process.env.V1_THEME_SCREENSHOTS&&label==='otmar table'){await page.locator('.season-player-stats').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'otmar-ranking-photos.png')});}
 }
 const controlRoles=new Map();
 async function checkConsistentRoles(label){
  const key=await page.locator('html').evaluate(e=>e.dataset.club+' '+e.dataset.theme);
  const control=page.locator('.game-control-bar .game-view-toggle button[aria-pressed="true"],.league-toggle button[aria-pressed="true"],.match-tabs a.selected').first();
  if(await control.count()){
   const style=await control.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,text:s.color,size:s.fontSize,weight:s.fontWeight,radius:s.borderRadius};});
   assert.equal(style.size,'14px',label+': shared control type size');assert.equal(style.weight,'650',label+': shared selection weight');assert.equal(style.radius,'12px',label+': shared selection shape');
   if(controlRoles.has(key))assert.deepEqual(style,controlRoles.get(key),label+': selection role matches other screens');else controlRoles.set(key,style);
  }
  const news=page.locator('.v1-news-link').first();
  if(await news.count()){
   const actual=await news.evaluate(e=>getComputedStyle(e).backgroundColor),expected=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim());
   const resolved=await page.evaluate(value=>{const e=document.createElement('span');e.style.backgroundColor=value;document.body.append(e);const colour=getComputedStyle(e).backgroundColor;e.remove();return colour;},expected);
   assert.equal(actual,resolved,label+': news uses the shared card surface');
   assert.equal(await page.locator('.v1-news-copy h2').first().evaluate(e=>getComputedStyle(e).fontFamily),await page.locator('body').evaluate(e=>getComputedStyle(e).fontFamily),label+': news uses the shared heading family');
  }
 }
 async function checkGeometryRoles(label){
  const geometry=await page.evaluate(()=>{
   const style=e=>{const s=getComputedStyle(e);return {radius:s.borderTopLeftRadius,shadow:s.boxShadow,padding:s.paddingLeft};};
   return {gutter:innerWidth>=800?'32px':innerWidth<360?'16px':'20px',
    content:[...document.querySelectorAll('.content,.v1-news-card,.home-news-heading')].filter(e=>!(innerWidth>=800&&e.matches('.v1-news-grid .v1-news-card'))).map(style),
    cards:[...document.querySelectorAll('.v1-news-link,.player-card,.stats-block,.bento-metric:not(.bento-panel .bento-metric),.fcsg-bento-tile:not(.fcsg-bento-duo > *):not(.fcsg-bento-cards > *),.bento-panel,.report-comparison,.report-score-card,.journey-chart,.duel-summary,.fcsg-stat-card,.game-timeline .game-card:not(.current-game):not(.fcsg-game-live)')].map(style),
    insets:[...document.querySelectorAll('.stats-block .season-split,.stats-block .season-number-grid > div,.bento-panel .bento-metric:not(.bento-primary)')].map(style),
    dialogs:[...document.querySelectorAll('.club-settings-dialog,.app-disclaimer-dialog,.app-introduction,.install-intro')].map(style)};
  });
  for(const c of geometry.content)assert.equal(c.padding,geometry.gutter,label+': shared content gutter');
  for(const c of geometry.cards)assert.equal(c.radius,'18px',label+': shared card radius');
  for(const c of geometry.insets){assert.equal(c.radius,'12px',label+': inset radius');assert.equal(c.shadow,'none',label+': insets have no stacked shadow');}
  for(const c of geometry.dialogs){assert.equal(c.radius,'24px',label+': dialog radius');assert.equal(c.padding,'24px',label+': dialog spacing');}
  if(geometry.cards.length>1)assert.ok(geometry.cards.every(c=>c.shadow===geometry.cards[0].shadow),label+': shared card elevation');
 }
 async function checkTouchActions(label){
  const sizes=await page.locator('button,.button,.back-link,.club-entry,.match-compact-back,.match-tabs a').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,40),height:e.getBoundingClientRect().height})));
  for(const s of sizes)assert.ok(s.height>=43.9,label+': touch height for '+s.label+' ('+s.height+')');
  const icons=await page.locator('.header-button:not([hidden]),.calendar-head button,.match-compact-back').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  for(const s of icons){assert.equal(s.width,44,label+': icon action width');assert.equal(s.height,44,label+': icon action height');}
  const decorative=await page.locator('.v1-action-icon').evaluateAll(nodes=>nodes.every(e=>e.getAttribute('aria-hidden')==='true'&&e.getAttribute('focusable')==='false'));
  assert.ok(decorative,label+': action icons do not duplicate accessible names');
  assert.equal(await page.locator('button[hidden]').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).length),0,label+': hidden actions stay hidden');
 }
 async function checkPressFeedback(){
  // Use actual pointer-down without activating navigation, then verify reduced motion and keyboard.
  await page.goto(origin+'/?club=kadetten#home');await page.locator('#club-settings').click();
  const button=page.locator('.settings-help-row'),point=await button.boundingBox();
  const release=async target=>{await target.evaluate(e=>e.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();},{once:true,capture:true}));await page.mouse.up();await page.mouse.move(0,0);};
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.waitForTimeout(170);
  let pressed=await button.evaluate(e=>({opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform}));
  assert.ok(Math.abs(Number(pressed.opacity)-.82)<.01,'Pointer press gives the shared feedback');assert.notEqual(pressed.transform,'none','Pointer press compresses a compact action');
  await release(button);
  await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.waitForTimeout(170);
  assert.equal(await button.evaluate(e=>getComputedStyle(e).transform),'none','Reduced motion keeps the touch target still');await release(button);
  await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await button.evaluate(e=>document.activeElement===e),true,'Keyboard reaches the settings help action');
  const focus=await button.evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth,transition:getComputedStyle(e).transitionDuration}));
  assert.equal(focus.style,'solid');assert.equal(focus.width,'2px');assert.equal(focus.transition,'0s','Keyboard actions have immediate focus feedback');
  await page.keyboard.press('Enter');assert.equal(await page.locator('.app-introduction').isVisible(),true,'Keyboard activates settings help');await page.keyboard.press('Escape');assert.equal(await page.locator('.club-settings-dialog').isVisible(),false,'Help replaces settings without stacked dialogs');
  const news=page.locator('.v1-news-link').first();await news.scrollIntoViewIfNeeded();const card=await news.boundingBox();
  await page.mouse.move(card.x+card.width/2,Math.min(card.y+card.height/2,600));await page.mouse.down();await page.waitForTimeout(170);
  assert.ok(Math.abs(Number(await news.evaluate(e=>getComputedStyle(e).opacity))-.82)<.01,'Whole news card confirms a press');await release(news);
 }
 async function checkMatchdayBadge(){
  for(const width of [320,375,390,1280])for(const theme of ['light','dark'])for(const club of clubs){
   await page.setViewportSize({width,height:844});await page.goto(origin+'/?club='+club+'#home');
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await page.evaluate(async()=>document.fonts.ready);
   const link=page.locator('[data-nav="games"]');assert.equal(await link.getAttribute('aria-label'),'Spiele');
   for(const selected of [false,true]){
    await link.evaluate((e,selected)=>e.classList.toggle('active',selected),selected);
    const state=await link.evaluate(e=>({matchday:e.classList.contains('is-matchday'),content:getComputedStyle(e,'::after').content,icon:getComputedStyle(e.querySelector('.nav-icon')).transform}));assert.equal(state.matchday,false);assert.ok(['none','normal','""'].includes(state.content));assert.equal(state.icon,'none');
   }
   await page.addScriptTag({content:axe});const health=await page.evaluate(async()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)}));assert.equal(health.h1,1);assert.equal(health.overflow,false);assert.deepEqual(health.violations,[]);
  }
  console.log('Games navigation has no Today badge or shifted icon for all clubs, light/dark at 320/375/390/1280px.');
 }
 async function checkOtherClubHints(){
  const own=['Kadetten Schaffhausen','FC St.Gallen 1879','TSV St. Otmar St. Gallen'];
  for(let i=0;i<3;i++)data[i].games=[{...data[i].games[0],id:'hint-'+clubs[i],date:'2026-10-14',time:'18:00',home:own[i],away:i===1?'FC Sion':'BSV Bern',score:null,confirmed:true,live:false,league:i===1?'Super League':'QHL'}];
  await ctx.route(/\/api\/(?:fcsg\/|otmar\/)?live(?:\?|$)/,async r=>{
   const url=new URL(r.request().url()),i=url.pathname.includes('fcsg')?1:url.pathname.includes('otmar')?2:0;
   const game=data[i].games[0],match=i===1?{...game,live:true,liveScore:[1,0]}:null,finished=i===2?{...game,status:'finished',score:[32,29]}:null;
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,checkedAt:now,match,finished})});
  });
  for(const width of [320,390,1280])for(const theme of ['light','dark'])for(const club of clubs){
   await page.setViewportSize({width,height:844});await page.goto(origin+'/?club='+club+'#home');
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
   await page.waitForFunction(()=>document.querySelectorAll('.club-match-hint').length===2);
   await page.waitForTimeout(180);
   const hints=await page.locator('.club-match-hint').evaluateAll(nodes=>nodes.map(e=>({club:e.dataset.hintClub,text:e.textContent,height:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth})));
   assert.equal(hints.length,2);assert.ok(hints.every(h=>h.club!==club&&h.height>=44&&!h.overflow));
   for(const hint of hints){if(hint.club==='fcsg')assert.match(hint.text,/Live · 1:0/);if(hint.club==='otmar')assert.match(hint.text,/32:29 · Ende/);}
   await page.addScriptTag({content:axe});const health=await page.evaluate(async()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,why:n.failureSummary}))}))}));
   assert.equal(health.h1,1);assert.equal(health.overflow,false);assert.deepEqual(health.violations,[]);
   if(process.env.V1_THEME_SCREENSHOTS&&club==='kadetten'&&width===390)await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'other-club-hints-'+theme+'.png')});
   const link=page.locator('.club-match-hint').first(),target=await link.getAttribute('href');await link.click();
   assert.equal(new URL(page.url()).hash,new URL(target).hash);assert.equal(new URL(page.url()).searchParams.get('club'),new URL(target).searchParams.get('club'));
   await page.goto(origin+'/?club='+club+'#season/games');await page.locator('[data-mode="list"]').click();if(width>=375)await checkGamesHeaderAlignment(club+' games-list');else{const aligned=await page.locator('.game-control-bar').evaluate(e=>{const b=e.getBoundingClientRect(),h=document.querySelector('body > .top').getBoundingClientRect();return Math.abs(b.width-h.width)<.5&&b.y>=h.bottom;});assert.ok(aligned,'Narrow game controls remain aligned below the taller header');}
  }
  await page.goto(origin+'/?club=kadetten#home');await page.locator('#club-settings').click();for(const club of ['fcsg','otmar'])await page.locator('[data-club-choice="'+club+'"]').uncheck();await page.locator('[data-close-clubs]').click();assert.equal(await page.locator('.club-match-hints').isVisible(),false,'No hints for unselected clubs');
  for(const d of data)for(const g of d.games)g.date='2026-10-15';await page.locator('#club-settings').click();for(const club of ['fcsg','otmar'])await page.locator('[data-club-choice="'+club+'"]').check();await page.locator('[data-close-clubs]').click();await page.reload();await page.waitForTimeout(300);assert.equal(await page.locator('.club-match-hint').count(),0,'No extra row without fixtures today');
  console.log('18 other-club hint layouts, direct links, pinned controls and empty states passed.');
 }
 async function checkFinishTransition(){
  const fixture={...data[0].games[0],id:'finish-now',date:'2026-10-14',time:'18:00',league:'QHL',home:'Kadetten Schaffhausen',away:'RTV 1879 Basel',score:null,half:null};
  data[0].games=[fixture];let finished=false,ready=false,liveUpdated=false;
  const details={ok:true,events:[{id:1,seconds:3600,time:'60:00',score:[42,26],action:'Tor',homePlayer:'Testspieler'}],players:[{id:1,name:'Testspieler',home:true,goals:8,shots:10,seven:0,sevenShots:0,yellow:0,twoMinutes:0,red:0}],teamStats:null};
  await ctx.route('**/api/live',r=>{const score=finished?[42,26]:liveUpdated?[41,26]:[40,26],clock=finished?'60:00':liveUpdated?'49:00':'48:00';const game={...fixture,status:finished?'finished':'live',score,half:[19,11],clock,details:{...details,events:details.events.map(e=>({...e,seconds:finished?3600:liveUpdated?2940:2880,time:clock,score}))}};return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,checkedAt:now,match:finished?null:game,finished:finished?game:null})});});
  await ctx.route('**/api/match-reports/finish-now',r=>r.fulfill({status:ready?200:404,contentType:'application/json',body:JSON.stringify(ready?{report:{score:[42,26],players:[],report:{headline:'Kadetten entscheiden die Partie früh',paragraphs:['Die Kadetten Schaffhausen gewinnen gegen den RTV 1879 Basel mit 42:26. Bereits zur Pause führen sie mit 19:11.','Auch nach dem Seitenwechsel behalten die Kadetten die Führung. Die zweite Halbzeit endet mit 23:15.'],generator:'ki',generatedAt:now},source:{url:'https://example.test/'}}}:{})}));
  for(const width of [390,1280])for(const theme of ['light','dark']){
   finished=false;ready=false;liveUpdated=false;await page.setViewportSize({width,height:844});await page.goto(origin+'/?club=kadetten&finishCase='+width+theme+'#match/finish-now/stats');await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   await page.locator('.live-match-page').waitFor();
   await page.locator('a[href="#match/finish-now/report"]').click();await page.locator('.report-score-chart').waitFor();
   assert.equal(await page.locator('.report-score-status').textContent(),'Live · 48:00');
   assert.equal(await page.locator('.live-events').count(),1);assert.equal(await page.locator('.live-all-events').count(),0);
   const before=await page.locator('.chart-line').first().getAttribute('d');
   liveUpdated=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await page.waitForFunction(()=>document.querySelector('.report-score-status')?.textContent==='Live · 49:00');
   assert.notEqual(await page.locator('.chart-line').first().getAttribute('d'),before);
   assert.ok((await page.locator('.report-score-legend').textContent()).includes('41Tore'));
   if(process.env.V1_THEME_SCREENSHOTS){await page.locator('.report-score-card').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'live-curve-'+theme+'-'+width+'.png')});}
   await page.addScriptTag({content:axe});assert.deepEqual(await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)),[]);
   finished=true;await page.locator('a[href="#match/finish-now/stats"]').click();
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   await page.waitForFunction(()=>!document.querySelector('.live-match-page')&&document.querySelector('.report-score-chart'));
   assert.equal(await page.locator('.match-tabs a').allTextContents().then(t=>t.join('/')),'Statistiken/Rückblick');
   assert.ok((await page.locator('#app').textContent()).includes('Testspieler'));
   assert.equal(await page.locator('.report-score-card + .report-player-section > h2').textContent(),'Spielerstatistiken');
   await page.locator('a[href="#match/finish-now/report"]').click();await page.locator('.report-feed').waitFor();assert.equal(await page.locator('.ai-match-report').count(),0);
   ready=true;await page.evaluate(()=>{Date.now=()=>new Date('2026-10-14T12:33:00Z').getTime();document.dispatchEvent(new Event('visibilitychange'));});
   await page.locator('.ai-match-report').waitFor();assert.ok((await page.locator('.ai-match-report').textContent()).includes('Kadetten entscheiden die Partie früh'));
   assert.equal(await page.locator('.match-recap .ai-match-report > h1').count(),1);
   assert.equal(await page.locator('.match-recap img,.match-hero').count(),0);
   assert.ok(await page.locator('.match-recap > .ai-match-report:first-child').count());
   assert.ok((await page.locator('.match-recap-details').textContent()).includes('Datum'));
   if(process.env.V1_THEME_SCREENSHOTS){await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120);await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'recap-'+theme+'-'+width+'.png')});}

   await page.addScriptTag({content:axe});const health=await page.evaluate(async()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)}));
   assert.equal(health.h1,1);assert.equal(health.overflow,false);assert.deepEqual(health.violations,[]);
  }
  console.log('Live curve updates with confirmed goals above one event feed; finished transition and later report succeed without reload, in light/dark at 390/1280px.');
 }
 async function checkFcsgColours(){
  const base=data[1].games.find(g=>g.score),values={possessionPercentage:55,totalScoringAtt:12,onTargetScoringAtt:6};
  for(const ownHome of [true,false]){
   const match={...base,home:ownHome?'FC St. Gallen 1879':'FC Basel 1893',away:ownHome?'FC Basel 1893':'FC St. Gallen 1879',score:[2,1],homeStats:values,awayStats:{...values,possessionPercentage:45,totalScoringAtt:9},momentum:[{period:1,minute:10,value:.2},{period:1,minute:25,value:-.3},{period:2,minute:60,value:.4},{period:2,minute:90,value:-.2}]};
   await ctx.route('**/api/fcsg/matches/'+base.id,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,checkedAt:now,match})}));
   for(const width of [390,1280])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:844});await page.goto(origin+'/?club=fcsg&colourcase='+ownHome+'-'+theme+'-'+width+'#match/'+base.id+'/stats');await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.locator('.fcsg-momentum svg').waitFor();await page.waitForFunction(home=>document.querySelector('.fcsg-stat-legend span')?.textContent.startsWith(home),match.home);
    assert.equal(await page.locator('[data-fcsg-ticker-tab]').textContent(),'Rückblick');
    const colours=await page.locator('.fcsg-match-dashboard').evaluate((root,ownHome)=>{
     const bar=root.querySelector('.fcsg-stat-bar'),svg=root.querySelector('.fcsg-momentum svg');
     return {opponent:getComputedStyle(bar.children[ownHome?1:0]).backgroundColor,own:getComputedStyle(bar.children[ownHome?0:1]).backgroundColor,line:getComputedStyle(svg.querySelectorAll('path[stroke-width]')[ownHome?1:0]).stroke,fill:[...svg.querySelectorAll(ownHome?'#fcsg-momentum-bottom stop':'#fcsg-momentum-top stop')].map(e=>getComputedStyle(e).stopColor)};
    },ownHome);
    const expected=theme==='light'?'rgb(73, 101, 121)':'rgb(164, 184, 200)';assert.equal(colours.opponent,expected);assert.equal(colours.line,expected);assert.deepEqual(colours.fill,[expected,expected]);assert.notEqual(colours.own,expected);
    await page.locator('.fcsg-momentum').scrollIntoViewIfNeeded();await page.addScriptTag({content:axe});const health=await page.evaluate(async()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)}));assert.equal(health.h1,1);assert.equal(health.overflow,false);assert.deepEqual(health.violations,[]);
    if(process.env.V1_THEME_SCREENSHOTS)await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'fcsg-slate-'+ownHome+'-'+theme+'-'+width+'.png')});
   }
  }
  console.log('FCSG home/away bars and momentum share slate opponent colours; light/dark accessibility passed at 390/1280px.');
 }
 async function checkFinishedScorePlacement(){
  const stored=JSON.parse(fs.readFileSync(path.join(root,'src/client/assets/game-reports.json'),'utf8')).reports.stgallen;
  data[2].games=[{...data[0].games.find(g=>g.id==='stgallen')}];
  const report={...stored,events:[{id:1,seconds:90,time:'01:30',score:[1,0],action:'Tor',homePlayer:'Testspieler'},{id:2,seconds:3600,time:'60:00',score:stored.score,action:'Tor'}]};
  await ctx.route('**/api/reports/stgallen',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({report})}));
  await ctx.route('**/api/otmar/reports/stgallen',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({report})}));
  for(const club of ['kadetten','otmar'])for(const width of [390,1280])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:844});await page.goto(origin+'/?club='+club+'#match/stgallen/stats');
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   await page.locator('.report-score-chart').waitFor();
   assert.equal(await page.locator('.report-score-card + .report-player-section > h2').textContent(),'Spielerstatistiken');
   assert.equal(await page.locator('.report-score-card').count(),1);
   const family=await page.evaluate(()=>{
    const root=document.querySelector('.finished-match-stats'),style=e=>{const s=getComputedStyle(e);return {radius:s.borderRadius,padding:s.paddingLeft,border:s.borderTopColor,shadow:s.boxShadow,background:s.backgroundColor,gradient:s.backgroundImage,glass:s.backdropFilter};};
    const probe=document.createElement('span');probe.style.color='var(--v1-stat-own)';root.append(probe);const own=getComputedStyle(probe).color;probe.style.color='var(--v1-stat-opponent)';const opponent=getComputedStyle(probe).color;probe.remove();
    const side=root.dataset.ownSide==='home'?'first-child':'last-child';
    return {cards:[...root.querySelectorAll(':scope > .report-comparison,:scope > .panel,:scope > .report-score-card,:scope > .report-player-section')].map(style),own,opponent,opponentChart:getComputedStyle(root.querySelector('.report-score-team:not(.is-kadetten)')).color,opponentBar:getComputedStyle(root.querySelector('.report-bars span:not(.is-kadetten) i')).backgroundColor,opponentSvg:getComputedStyle(root.querySelector('linearGradient[id$="-line-'+(root.dataset.ownSide==='home'?1:0)+'"] stop')).stopColor,chart:getComputedStyle(root.querySelector('.report-score-team.is-kadetten')).color,bar:getComputedStyle(root.querySelector('.report-bars .is-kadetten i')).backgroundColor,half:getComputedStyle(root.querySelector('.comparison strong:'+side)).color,svg:getComputedStyle(root.querySelector('linearGradient[id$="-line-'+(root.dataset.ownSide==='home'?0:1)+'"] stop')).stopColor,heading:getComputedStyle(root.querySelector('.report-player-section > h2')).fontSize};
   });
   assert.equal(family.cards.length,4);for(const card of family.cards){assert.equal(card.radius,'18px');assert.equal(card.padding,'16px');assert.equal(card.glass,'none');assert.ok(card.gradient.includes('radial-gradient'),JSON.stringify(family));assert.equal(card.border,family.cards[0].border);assert.equal(card.shadow,family.cards[0].shadow);assert.equal(card.background,family.cards[0].background);}
   assert.equal(family.opponent,theme==='light'?'rgb(73, 101, 121)':'rgb(164, 184, 200)',club+' '+theme+': opponent uses the readable slate palette');for(const part of ['opponentChart','opponentBar','opponentSvg'])assert.equal(family[part],family.opponent,club+' '+theme+': '+part+' shares the opponent colour');
   assert.equal(family.heading,'22px');for(const part of ['chart','bar','half','svg'])assert.equal(family[part],family.own,club+' '+theme+': '+part+' uses the same own-team colour');

   await page.locator('.report-score-card').scrollIntoViewIfNeeded();
   await page.addScriptTag({content:axe});
   const health=await page.evaluate(async()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id)}));
   assert.equal(health.h1,1);assert.equal(health.overflow,false);assert.deepEqual(health.violations,[]);
   if(process.env.V1_THEME_SCREENSHOTS)await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'finished-score-'+club+'-'+theme+'-'+width+'.png')});
   const selected=page.locator('.report-player-section [data-stats-panel]:not([hidden])');
   assert.equal(await selected.count(),1);
   const other=page.locator('.report-player-section .team-switch button[aria-pressed="false"]');await other.click();assert.equal(await page.locator('.report-player-section [data-stats-panel]:not([hidden])').count(),1);
   if(process.env.V1_THEME_SCREENSHOTS&&width===390){await page.locator('.report-player-section').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,'players-'+club+'-'+theme+'.png')});}
   await page.locator('a[href="#match/stgallen/report"]').click();await page.waitForTimeout(150);
   assert.equal(await page.locator('.report-score-chart').count(),0);assert.equal(await page.locator('.report-feed').count(),1);
  }
  console.log('Finished score chart placement, retained event feed and light/dark accessibility passed at 390/1280px.');
 }
 async function checkFailedMedia(label){
  if(!label.endsWith('home'))return;
  const img=page.locator('.v1-news-image > img').first();if(!await img.count())return;
  const slot=page.locator('.v1-news-image').first(),before=await slot.boundingBox();
  await img.evaluate(e=>e.dispatchEvent(new Event('error')));
  assert.equal(await slot.locator('.v1-image-fallback').textContent(),'Bild nicht verfügbar');
  const after=await slot.boundingBox();assert.ok(Math.abs(before.height-after.height)<1,'Failed news image keeps its height');
 }
 async function audit(label){await page.waitForTimeout(120);await page.evaluate(async()=>document.fonts.ready);await checkFailedMedia(label);await checkTouchActions(label);await checkGeometryRoles(label);await checkConsistentRoles(label);await checkExpandedClubHistory(label);await checkCompactGames(label);await checkLightSurfaceHierarchy(label);await checkGamesHeaderAlignment(label);await compareTableSpacing(label);await checkLeagueButtons(label);await checkHandballRankingPhotos(label);if(label.includes('home'))await compareUnderlayWithV2();await page.addScriptTag({content:axe});const r=await page.evaluate(async()=>({theme:document.documentElement.dataset.theme,h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,why:n.failureSummary}))}))}));reports.push({label,...r});console.log(JSON.stringify({label,violations:r.violations.length}));if(process.env.V1_THEME_SCREENSHOTS&&/kadetten (home|settings|games-list|table|player)/.test(label))await page.screenshot({path:path.join(process.env.V1_THEME_SCREENSHOTS,label.replaceAll(' ','-')+'.png')});}
 if(process.env.V1_THEME_FCSG_COLOURS_ONLY){await checkFcsgColours();assert.deepEqual(errors,[]);await ctx.close();}else if(process.env.V1_THEME_FINISH_ONLY){await checkFinishTransition();assert.deepEqual(errors,[]);await ctx.close();}else if(process.env.V1_THEME_SCORE_ONLY){await checkFinishedScorePlacement();assert.deepEqual(errors,[]);await ctx.close();}else if(process.env.V1_THEME_HINTS_ONLY){await checkOtherClubHints();assert.deepEqual(errors,[]);await ctx.close();}else if(process.env.V1_THEME_BADGE_ONLY){await checkMatchdayBadge();assert.deepEqual(errors,[]);await ctx.close();}else if(process.env.V1_THEME_INTERACTIONS_ONLY){await checkPressFeedback();assert.deepEqual(errors,[]);console.log('Pointer, keyboard and reduced-motion interaction checks passed.');await ctx.close();}else{
 await page.goto(origin+'/?club=kadetten#home');await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').check();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');await audit('kadetten settings');await checkDisclaimerPopup('light disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 for(let i=0;i<clubs.length;i++){const club=clubs[i],d=data[i],player=club==='fcsg'?d.players[0].id:club==='otmar'?d.roster[0].number:6,game=d.games.filter(g=>g.score).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||d.games[0],story=d.stories[0];
  const routes=[['home','home'],['season/games','games-list'],['season/games','calendar'],['season/table','table'],['season/squad','squad'],['player/'+player,'player'],['club','club'],['news/'+story.id,'article'],['match/'+game.id+'/stats','match-stats'],['match/'+game.id+'/squad','lineup'],['match/'+game.id+'/overview','ticker']];
  if(club==='kadetten'&&d.games.some(g=>g.id==='chambery'))routes.push(['match/chambery/stats','ehf-stats'],['match/chambery/report','ehf-report']);
  for(const [route,label] of routes){await page.goto(origin+'/?club='+club+'#'+route);if(['games-list','calendar'].includes(label))await page.locator('[data-mode="'+(label==='games-list'?'list':label)+'"]').click();await audit(club+' '+label);}
 }
 await page.goto(origin+'/?club=kadetten#home');await page.evaluate(()=>window.showAppIntroduction());for(let n=0;n<4;n++){await audit('introduction '+n);await page.locator('.app-introduction [data-next]').click();}
 await page.setViewportSize({width:375,height:667});await page.locator('#club-settings').click();await audit('small settings');await page.locator('[data-v1-light-mode]').uncheck();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await audit('dark settings');await checkDisclaimerPopup('dark disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 for(const club of clubs){for(const route of ['home','season/games','season/table','season/squad','match/'+(data[clubs.indexOf(club)].games.filter(g=>g.score).at(-1)||data[clubs.indexOf(club)].games[0]).id+'/stats']){await page.goto(origin+'/?club='+club+'#'+route);if(route==='season/games')await page.locator('[data-mode="list"]').click();await audit('dark '+club+' '+(route==='season/games'?'games-list':route));if(route==='season/games'){await page.locator('[data-mode=calendar]').click();await audit('dark '+club+' calendar');await page.locator('[data-mode=list]').click();}}}
 await page.goto(origin+'/v2/?club=kadetten#home');await page.locator('#club-settings').click();assert.equal(await page.locator('[data-v1-light-mode]').count(),0);await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.goto(origin+'/?club=kadetten#home');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.locator('#club-settings').click();await page.locator('[data-v1-light-mode]').check();await page.locator('.club-settings-dialog [data-close-clubs]').click();await page.setViewportSize({width:1280,height:844});
 for(let i=0;i<clubs.length;i++){const d=data[i],player=i===1?d.players[0].id:i===2?d.roster?.[0]?.number||6:6,g=d.games.filter(g=>g.score).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)||d.games[0];for(const route of ['home','season/games','season/table','player/'+player,'match/'+g.id+'/stats']){await page.goto(origin+'/?club='+clubs[i]+'#'+route);if(route==='season/games')await page.locator('[data-mode="list"]').click();await audit('desktop '+clubs[i]+' '+(route==='season/games'?'games-list':route));if(route==='season/games'){await page.locator('[data-mode=calendar]').click();await audit('desktop '+clubs[i]+' calendar');await page.locator('[data-mode=list]').click();}}}
 await page.locator('#club-settings').click();await checkDisclaimerPopup('desktop disclaimer');await page.locator('.club-settings-dialog [data-close-clubs]').click();
 await checkPressFeedback();
 if(process.env.V1_THEME_REPORT)fs.writeFileSync(process.env.V1_THEME_REPORT,JSON.stringify({reports,errors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(reports.filter(r=>r.violations.length||r.overflow||r.h1!==1),[]);console.log(reports.length+' theme/accessibility checks passed.');await ctx.close();}
}finally{await browser?.close();await new Promise(r=>server.close(r));}
