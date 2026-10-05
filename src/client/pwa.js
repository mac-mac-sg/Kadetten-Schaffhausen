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
 window.addEventListener('load',showIntro);

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
    const notice=document.createElement('aside');notice.id='app-update';notice.className='app-update';notice.setAttribute('aria-label','App aktualisieren');
    notice.innerHTML='<p role="status">Neue Version verfügbar</p><button type="button" class="button">Jetzt aktualisieren</button><button type="button" class="button subtle" aria-label="Aktualisierungshinweis schliessen">Später</button>';
    notice.querySelector('button').onclick=()=>location.reload();notice.querySelector('.subtle').onclick=()=>{notice.hidden=true};
    document.querySelector('.top').after(notice);
   }
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{checkVersion();navigator.serviceWorker.controller?.postMessage({type:'SAVE_OFFLINE'});});
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(async r=>{registration=r;await navigator.serviceWorker.ready;checkVersion();(navigator.serviceWorker.controller||r.active)?.postMessage({type:'SAVE_OFFLINE'});}).catch(()=>{});});
  document.addEventListener('visibilitychange',checkUpdate);setInterval(checkUpdate,900000);
 }
})();
