// Device-specific opt-in. V1 never registers a subscription or exposes these controls.
const pushLabels={reminder:'30 Minuten vor dem Match',start:'Bei Spielbeginn',half:'Pausenresultat',final:'Endresultat'};
let pushDialog,pushBusy=false;
const pushPreview=()=>document.documentElement.dataset.preview==='v2';
function readPushDevice(){try{return JSON.parse(localStorage.getItem('match-push-device-v1'))||null}catch{return null}}
function savePushDevice(device){if(device)localStorage.setItem('match-push-device-v1',JSON.stringify(device));else localStorage.removeItem('match-push-device-v1')}
function pushSupported(){return isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
async function pushApi(path,method='GET',body,token){
 const r=await fetch((window.KADETTEN_PLATFORM?.apiOrigin||'')+'/api/push/'+path,{method,credentials:'omit',mode:'cors',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const d=await r.json();if(!r.ok)throw Error(d.error||'Die Verbindung ist gerade nicht verfügbar.');return d;
}
async function pushRegistration(){
 const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Bitte V2 neu laden und erneut versuchen.')),15000))]);
 if(new URL(reg.scope).pathname!==new URL('./',location.href).pathname)throw Error('Bitte V2 neu laden und erneut versuchen.');return reg;
}
function pushStatus(message){const status=pushDialog?.querySelector('[data-push-status]');if(status)status.textContent=message}
function syncPushControls(){
 if(!pushDialog)return;const device=readPushDevice(),supported=pushSupported();
 for(const input of pushDialog.querySelectorAll('[data-push-type]')){if(!pushBusy)input.checked=(device?.types||Object.keys(pushLabels)).includes(input.dataset.pushType);input.disabled=pushBusy}
 pushDialog.querySelector('[data-push-clubs]').textContent='Für: '+selectedClubs.map(c=>fanClubs[c].name).join(', ');
 for(const el of pushDialog.querySelectorAll('[data-push-enable],[data-push-test],[data-push-disable]'))el.disabled=pushBusy;
 pushDialog.querySelector('[data-push-enable]').hidden=!!device?.active;
 pushDialog.querySelector('[data-push-enable]').disabled=pushBusy||!supported||Notification.permission==='denied';
 pushDialog.querySelector('[data-push-test]').hidden=!device?.active;
 pushDialog.querySelector('[data-push-disable]').hidden=!device;
 if(!pushBusy)pushStatus(!supported?'Dieser Browser unterstützt hier keine Push-Mitteilungen. Auf iPhone und iPad V2 zuerst über «Zum Home-Bildschirm» installieren.':Notification.permission==='denied'?'Mitteilungen sind im Browser blockiert. Bitte in den Geräte- oder Website-Einstellungen erlauben.':device?.active?'Aktiv auf diesem Gerät.':'Noch nicht aktiviert.');
}
async function updatePushPreferences(){
 const device=readPushDevice();if(!pushPreview()||!device)return;
 await pushApi('device','PUT',{subscription:device.subscription,clubs:selectedClubs,types:device.types},device.token);
}
async function pushAction(action){
 if(pushBusy)return;const chosen=[...pushDialog.querySelectorAll('[data-push-type]:checked')].map(i=>i.dataset.pushType);pushBusy=true;syncPushControls();pushStatus('Wird eingerichtet …');
 try{
  let device=readPushDevice();
  if(action==='enable'){
   // Permission is requested only as the direct result of this button click.
   const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Mitteilungen wurden nicht erlaubt. Du kannst sie später in den Browser-Einstellungen aktivieren.');
   const config=await pushApi('config');if(!config.enabled)throw Error('Benachrichtigungen werden noch eingerichtet. Bitte später erneut versuchen.');
   const reg=await pushRegistration();let subscription=await reg.pushManager.getSubscription();
   const applicationServerKey=Uint8Array.from(atob(config.publicKey.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
   if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
   const token=device?.token||btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   device={token,subscription:subscription.toJSON(),types:chosen,active:false};
   // Keep ownership across a transient registration failure; retry uses the same token.
   savePushDevice(device);await updatePushPreferences();savePushDevice({...device,active:true});
  }else if(action==='disable'){
   if(device)await pushApi('device','DELETE',{subscription:device.subscription},device.token);
   const reg=await pushRegistration();await (await reg.pushManager.getSubscription())?.unsubscribe();savePushDevice(null);
  }else if(action==='test'){
   await pushApi('test','POST',{subscription:device.subscription},device.token);
  }
  pushBusy=false;syncPushControls();if(action==='test')pushStatus('Test an den Push-Dienst übergeben. Bitte die Mitteilungen auf deinem Gerät prüfen.');
 }catch(e){pushBusy=false;syncPushControls();pushStatus(e.message||'Das hat nicht geklappt. Bitte erneut versuchen.')}
}
function openPushSettings(){
 if(!pushPreview())return;
 if(!pushDialog){
  pushDialog=document.createElement('dialog');pushDialog.className='club-settings-dialog push-settings-dialog';pushDialog.setAttribute('aria-labelledby','push-title');
  pushDialog.innerHTML=`<header><h2 id="push-title">Benachrichtigungen</h2><button type="button" class="header-button" data-push-close aria-label="Benachrichtigungen schliessen">${v1ActionIcon('close','×')}</button></header><p class="push-intro">Deine Spielhinweise – auch wenn die App geschlossen ist.</p><p class="push-clubs" data-push-clubs></p><div class="theme-settings push-types">${Object.entries(pushLabels).map(([key,label])=>`<label class="theme-setting"><span>${label}</span><input type="checkbox" role="switch" data-push-type="${key}" aria-label="${label}"></label>`).join('')}</div><p class="push-status" role="status" data-push-status></p><div class="push-actions"><button type="button" class="button" data-push-enable>Auf diesem Gerät aktivieren</button><button type="button" class="button" data-push-test hidden>Testmitteilung senden</button><button type="button" class="button subtle" data-push-disable hidden>Deaktivieren</button></div><p class="push-note">Die Vereine wählst du unter «Meine Vereine». Resultate folgen der Live-Datenquelle; die Zustellung kann sich je nach Gerät verzögern.</p>`;
  document.body.append(pushDialog);
  pushDialog.querySelector('[data-push-close]').onclick=()=>pushDialog.close();
  for(const action of ['enable','disable','test'])pushDialog.querySelector('[data-push-'+action+']').onclick=()=>pushAction(action);
  pushDialog.addEventListener('close',()=>{clubSettingsDialog.showModal();clubSettingsDialog.querySelector('[data-open-push]')?.focus()});
  pushDialog.addEventListener('change',async e=>{
   if(!e.target.matches('[data-push-type]'))return;const old=readPushDevice();if(!old)return;
   const next={...old,types:[...pushDialog.querySelectorAll('[data-push-type]:checked')].map(i=>i.dataset.pushType)};
   pushBusy=true;syncPushControls();pushStatus('Wird gespeichert …');
   try{await pushApi('device','PUT',{subscription:next.subscription,clubs:selectedClubs,types:next.types},next.token);savePushDevice(next);pushBusy=false;syncPushControls();pushStatus('Auswahl gespeichert.')}catch{pushBusy=false;syncPushControls();pushStatus('Auswahl konnte nicht gespeichert werden. Bitte erneut versuchen.')}
  });
 }
 clubSettingsDialog.close();syncPushControls();pushDialog.showModal();
}
