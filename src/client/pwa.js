(()=>{
 let promptEvent,installed=false;const button=document.getElementById('install-app');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const sync=()=>{button.hidden=installed||standalone()};sync();
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;sync()});
 window.addEventListener('appinstalled',()=>{promptEvent=null;installed=true;button.hidden=true;refreshFeedback('Kadetten wurde installiert.')});
 window.matchMedia('(display-mode: standalone)').addEventListener('change',sync);
 button.addEventListener('click',async()=>{
  if(promptEvent){const event=promptEvent;promptEvent=null;await event.prompt();await event.userChoice;sync();return}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  refreshFeedback(ios?'In Safari: Teilen → Zum Home-Bildschirm.':'In Chrome: Menü ⋮ → Zum Startbildschirm hinzufügen → Installieren. Falls die Option noch fehlt, die Seite einmal neu laden.');
 });
 if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='CLEAR_SAVED_DATA'){try{localStorage.removeItem(SNAPSHOT_KEY)}catch{}}});navigator.serviceWorker.addEventListener('controllerchange',()=>navigator.serviceWorker.controller?.postMessage({type:'SAVE_OFFLINE'}));window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(async()=>{const registration=await navigator.serviceWorker.ready;(navigator.serviceWorker.controller||registration.active)?.postMessage({type:'SAVE_OFFLINE'})}).catch(()=>{})})}
})();
