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
restoreCurrentData();
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({top: 0, behavior: 'instant'});
  $('#app').focus({preventScroll: true});
});
render();
if (!location.hash || location.hash === '#home') window.scrollTo({top: 0, behavior: 'instant'});
loadCurrentData();
checkUpdateAccess().then(() => { if (resumeOwnerRefresh) manualRefresh(); });
document.getElementById('refresh-data').addEventListener('click', manualRefresh);
window.addEventListener('hashchange', checkLiveMatch);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(liveTimer);
  else {
    setupEnhancements();
    showLiveMatch();
    checkLiveMatch();
  }
});
checkLiveMatch();
