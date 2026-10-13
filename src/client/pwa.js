(()=>{
 let promptEvent,installed=false;const button=document.getElementById('install-app');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const INTRO_KEY='fan-app-install-intro-v1';let intro;
 const dismissIntro=()=>{if(!intro)return;intro.close();intro.remove();intro=null;};
 const sync=()=>{button.hidden=installed||standalone();if(button.hidden)dismissIntro();};sync();
 const install=async()=>{
  if(promptEvent){const event=promptEvent;promptEvent=null;dismissIntro();await event.prompt();await event.userChoice;sync();return;}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const instructions=ios?'In Safari: Teilen → Zum Home-Bildschirm → Hinzufügen.':'In Chrome: Menü ⋮ → Zum Startbildschirm hinzufügen → Installieren.';
  if(intro){intro.querySelector('.install-instructions').textContent=instructions;intro.querySelector('[data-install]').hidden=true;}
  else appFeedback(instructions);
 };
 const showIntro=()=>{
  if(installed||standalone())return;
  try{if(localStorage.getItem(INTRO_KEY))return;}catch{}
  intro=document.createElement('dialog');intro.className='install-intro';intro.setAttribute('aria-labelledby','install-intro-title');
  intro.innerHTML='<img src="assets/icon-192.png" width="64" height="64" alt=""><h2 id="install-intro-title">Deine Vereine auf dem Startbildschirm</h2><p class="install-instructions">Installiere die App für schnellen Zugriff auf News, Spiele und Resultate.</p><div class="install-intro-actions"><button class="button" type="button" data-install>App installieren</button><button class="button subtle" type="button" data-later>Später</button></div>';
  document.body.append(intro);intro.showModal();
  try{localStorage.setItem(INTRO_KEY,'seen');}catch{}
  intro.querySelector('[data-install]').onclick=install;intro.querySelector('[data-later]').onclick=dismissIntro;
  intro.addEventListener('cancel',event=>{event.preventDefault();dismissIntro();});
 };
 const GUIDE_KEY='fan-app-onboarding-v1';let guide;
 const steps=[
  {label:'Deine Vereine',title:'Eine App. Deine Vereine.',text:'Wechsle oben zwischen Kadetten, FCSG und St. Otmar. In den Einstellungen wählst du, welche Vereine du sehen möchtest.',tip:'Deine Vereinsauswahl wird auf diesem Gerät gespeichert.'},
  {label:'News',title:'Bleib am Ball.',text:'Auf der Startseite findest du die aktuellen News deines Vereins. Öffne einen Artikel, um den ganzen Bericht zu lesen.',tip:'Wische durch die News, um weitere Artikel zu entdecken.'},
  {label:'Spiele',title:'Vorher. Live. Danach.',text:'Unter «Spiele» findest du den Spielplan und die Resultate. Öffne ein Spiel für die Vorschau, den Liveticker oder den Rückblick – mit den verfügbaren Aufstellungen und Statistiken.',tip:'Liste und Kalender zeigen den aktiven Verein. «Meine Woche» vereint die Spiele aller ausgewählten Vereine. Die Tabelle findest du über die Navigation.'},
  {label:'Kader & Verein',title:'Lerne dein Team und deinen Verein kennen.',text:'Im Kader entdeckst du die Spieler und ihre Saisonstatistiken. Über das Vereinswappen oben rechts öffnest du auch die Vereinsgeschichte und die Erfolge deines Vereins.',tip:'Diese Einführung kannst du jederzeit auf der Startseite unter Einstellungen → Einführung & Tipps erneut öffnen.'}
 ];
 const crests='<span><img src="assets/logo.png" alt="">Kadetten</span><span><img src="assets/fcsg-logo.svg" alt="">FCSG</span><span><img src="assets/club-140684.webp" alt="">St. Otmar</span>';
 const visuals=[
  '<div class="guide-preview-picker">'+crests+'</div><div class="guide-preview-note">Oben wechseln · In den Einstellungen auswählen</div>',
  '<div class="guide-preview-news"><span>NEWS AUS DEINEM VEREIN</span><strong>Alles rund um dein Team.</strong><i>Zum Artikel →</i></div>',
  '<div class="guide-preview-tabs"><span>Liste</span><span>Kalender</span><b>Meine Woche</b></div><div class="guide-preview-week">'+crests+'</div><div class="guide-preview-note">Ein Kalender. Alle deine Vereine.</div>',
  '<div class="guide-preview-roster"><span>KADER</span><div class="guide-preview-history"><img src="assets/logo.png" alt=""><b>Verein</b></div></div><div class="guide-preview-players"><span><i></i>Spieler</span><span><i></i>Spieler</span><span><i></i>Spieler</span></div><div class="guide-preview-note">Wappen antippen → Geschichte &amp; Erfolge</div>'
 ];
 window.showAppIntroduction=(firstVisit=false)=>{
  if(guide)return;
  dismissIntro();
  const previousFocus=document.activeElement;let step=0;
  guide=document.createElement('dialog');guide.className='app-introduction';guide.setAttribute('aria-labelledby','app-introduction-title');
  guide.innerHTML='<header><span class="eyebrow">WILLKOMMEN IN DEINER FAN-APP</span><button type="button" class="guide-skip" data-skip>Überspringen</button></header><p class="guide-progress" aria-live="polite" aria-atomic="true"></p><div class="guide-dots" aria-hidden="true"></div><div class="guide-visual" aria-hidden="true"></div><h2 id="app-introduction-title" tabindex="-1"></h2><p class="guide-text"></p><aside class="guide-tip"><span>TIPP</span><p></p></aside><footer><button type="button" class="button subtle" data-back>Zurück</button><button type="button" class="button" data-next>Weiter</button></footer>';
  const finish=(offerInstall)=>{
   try{localStorage.setItem(GUIDE_KEY,'seen');}catch{}
   const current=guide;guide=null;current.close();current.remove();previousFocus?.focus();
   if(firstVisit&&offerInstall)showIntro();
  };
  const render=()=>{
   const item=steps[step];
   guide.querySelector('.guide-progress').textContent=`${step+1} von ${steps.length} · ${item.label}`;
   guide.querySelector('.guide-dots').innerHTML=steps.map((_,index)=>`<i class="${index===step?'is-current':''}"></i>`).join('');
   guide.querySelector('.guide-visual').innerHTML=visuals[step];
   if(step===3)guide.querySelector('.guide-preview-history img').setAttribute('src',document.querySelector('.brand img')?.getAttribute('src') || 'assets/logo.png');
   guide.querySelector('h2').textContent=item.title;
   guide.querySelector('.guide-text').textContent=item.text;
   guide.querySelector('.guide-tip p').textContent=item.tip;
   guide.querySelector('[data-back]').hidden=step===0;
   guide.querySelector('[data-next]').textContent=step===steps.length-1?'Los geht’s':'Weiter';
   guide.querySelector('h2').focus({preventScroll:true});guide.scrollTop=0;
  };
  document.body.append(guide);render();guide.showModal();guide.querySelector('h2').focus({preventScroll:true});
  guide.querySelector('[data-next]').onclick=()=>{if(step===steps.length-1)finish(true);else{step++;render();}};
  guide.querySelector('[data-back]').onclick=()=>{if(step>0){step--;render();}};
  guide.querySelector('[data-skip]').onclick=()=>finish(false);
  guide.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
 };
 window.addEventListener('load',()=>{
  let seen=false;try{seen=Boolean(localStorage.getItem(GUIDE_KEY));}catch{}
  if(seen)showIntro();else window.showAppIntroduction(true);
 });

 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;sync()});
 window.addEventListener('appinstalled',()=>{promptEvent=null;installed=true;button.hidden=true;appFeedback('Meine Vereine wurde installiert.')});
 window.matchMedia('(display-mode: standalone)').addEventListener('change',sync);
 button.addEventListener('click',install);
 if('serviceWorker' in navigator){
  const version=new URL(document.currentScript.src).searchParams.get('v');
  const checkVersion=()=>navigator.serviceWorker.controller?.postMessage({type:'GET_APP_VERSION'});
  let registration,lastCheck=0;
  const checkUpdate=()=>{if(document.hidden||!navigator.onLine)return;checkVersion();if(registration&&Date.now()-lastCheck>900000){lastCheck=Date.now();registration.update().catch(()=>{});}};
  navigator.serviceWorker.addEventListener('message',event=>{
   if(event.data?.type==='CLEAR_SAVED_DATA'){try{localStorage.removeItem(SNAPSHOT_KEY)}catch{}}
   if(event.data?.type==='APP_VERSION'&&version&&event.data.version!=='kadetten-offline-'+version&&!document.getElementById('app-update')){
    const notice=document.createElement('details');notice.id='app-update';notice.className='compact-status';notice.setAttribute('aria-label','App aktualisieren');
    notice.innerHTML='<summary aria-label="Neue App-Version verfügbar" title="Neue App-Version verfügbar"><span class="status-dot" aria-hidden="true"></span></summary><div class="status-popover"><p>Neue Version verfügbar</p><button type="button" class="button">Jetzt aktualisieren</button><button type="button" class="button subtle" aria-label="Aktualisierungshinweis schliessen">Später</button></div>';
    notice.querySelector('button').onclick=()=>location.reload();notice.querySelector('.subtle').onclick=()=>{notice.hidden=true};
    document.body.append(notice);
    document.addEventListener('click',event=>{if(!notice.contains(event.target))notice.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&notice.open){notice.open=false;notice.querySelector('summary').focus();}});
   }
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{checkVersion();navigator.serviceWorker.controller?.postMessage({type:'SAVE_OFFLINE'});});
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(async r=>{registration=r;await navigator.serviceWorker.ready;checkVersion();(navigator.serviceWorker.controller||r.active)?.postMessage({type:'SAVE_OFFLINE'});}).catch(()=>{});});
  document.addEventListener('visibilitychange',checkUpdate);setInterval(checkUpdate,900000);
 }
})();
