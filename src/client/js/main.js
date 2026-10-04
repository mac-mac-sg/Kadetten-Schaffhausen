/* Start: registriert Ereignisse und baut die erste Ansicht. Muss als letzte App-Datei geladen werden. */
document.querySelector('.dock [data-nav="games"]').addEventListener('click', event => {
  mode = 'list';
  competition = 'Alle';
  if (location.hash === '#season/games') {
    event.preventDefault();
    render();
    $('#app').focus({preventScroll: true});
  }
});
restoreActiveClub();
restoreFcsgData();
document.getElementById('club-switch').addEventListener('click', () => switchClub(activeClub === 'kadetten' ? 'fcsg' : 'kadetten'));
restoreCurrentData();
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({top: 0, behavior: 'instant'});
  $('#app').focus({preventScroll: true});
});
render();
if (!location.hash || location.hash === '#home') window.scrollTo({top: 0, behavior: 'instant'});
loadCurrentData();
loadFcsgData();
window.addEventListener('hashchange', checkLiveMatch);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(liveTimer);
  else {
    if (activeClub === 'kadetten') setupEnhancements();
    else {loadFcsgData();loadFcsgLive(true);}
    showLiveMatch();
    checkLiveMatch();
  }
});
checkLiveMatch();
