// Darstellung vor dem ersten Zeichnen setzen (kein Aufblitzen). Gleicher Schlüssel wie js/theme.js.
try {
  var t = localStorage.getItem('v2:app-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
// Schutz vor Einbettung in fremde Seiten (GitHub Pages kann keine Kopfzeile setzen): aus dem Rahmen ausbrechen, sonst Seite ausblenden.
if (window.top !== window.self) {
  try {
    window.top.location.replace(window.location.href);
  } catch (e) {}
  document.documentElement.hidden = true;
}
