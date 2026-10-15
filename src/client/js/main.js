// Keyboard navigation stays immediate; pointer feedback never sticks after a tap.
document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'), true);
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'), true);
/* Start: registriert Ereignisse und baut die erste Ansicht. Muss als letzte App-Datei geladen werden. */
document.querySelector('.dock [data-nav="games"]').addEventListener('click', event => {
  if(document.documentElement.dataset.design==='v2'){mode='list';competition='Alle';}
  if (location.hash === '#season/games') {
    event.preventDefault();
    render();
    $('#app').focus({preventScroll: true});
  }
});
restoreV1Theme();
restoreV1TextSize();
restoreActiveClub();
restoreFcsgData();
document.getElementById('club-switch').addEventListener('click', e=>{const button=e.target.closest('[data-select-club]');if(button)switchClub(button.dataset.selectClub);});
document.getElementById('club-settings').addEventListener('click',openClubSettings);
restoreCurrentData();
function handleRouteChange() {
  if(renderedRouteURL===location.href)return;
  const club=new URL(location.href).searchParams.get('club') || (selectedClubs.includes('kadetten')?'kadetten':selectedClubs[0]);
  if(Object.hasOwn(fanClubs,club)&&club!==activeClub){applyClubChange(club,location.hash);return;}
  render();
  if(document.documentElement.dataset.design==='v2')window.scrollTo({top: 0, behavior: 'instant'});
  $('#app').focus({preventScroll: true});
  checkLiveMatch();
}
window.addEventListener('hashchange',handleRouteChange);
window.addEventListener('popstate',handleRouteChange);
render();
setupMainTabSwipe();
if (!location.hash || location.hash === '#home') window.scrollTo({top: 0, behavior: 'instant'});
Promise.all(['kadetten','otmar'].map(club=>loadCurrentData(club))).finally(updateClubDot);
loadFcsgData().finally(updateClubDot);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(liveTimer);
  else {
    if (activeClub !== 'fcsg') {setupEnhancements();loadCurrentData();}
    else {loadFcsgData();loadFcsgLive(true);}
    showLiveMatch();
    checkLiveMatch();
  }
});
checkLiveMatch();
