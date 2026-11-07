// Darstellung vor dem ersten Zeichnen setzen (kein Aufblitzen). Gleicher Schlüssel wie js/theme.js.
try { var t = localStorage.getItem('v2:app-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
