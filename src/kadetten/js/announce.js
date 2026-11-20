// Ansage für Screenreader: ein unsichtbarer Statusbereich, den alle Steuermodule gemeinsam nutzen.
export function announce(text) {
  let live = document.getElementById('announce');
  if (!live) {
    live = Object.assign(document.createElement('p'), {id: 'announce', className: 'sr'});
    live.setAttribute('role', 'status');
    document.body.append(live);
  }
  live.textContent = text;
}
