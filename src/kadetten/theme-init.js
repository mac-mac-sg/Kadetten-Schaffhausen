// Matchday-Darstellung mit eigenem Speicher; persönliche v2-Daten bleiben erhalten.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
try {
  const saved = localStorage.getItem('v2:fan-v1-theme') || localStorage.getItem('v2:app-theme');
  const theme = saved === 'light' ? 'light' : 'dark';
  localStorage.setItem('v2:fan-v1-theme', theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]').setAttribute('content',theme==='light'?'#f6f5f0':'#171b18');
  const snapshot=JSON.parse(localStorage.getItem('v2:app-snapshot')||'null');
  if (!localStorage.getItem('v2:kadetten-public-data-v1') && snapshot?.data) localStorage.setItem('v2:kadetten-public-data-v1',JSON.stringify(snapshot.data));
} catch {}
// Bestehende Links und Push-Ziele der Companion App bleiben gültig.
{
 const parts=location.hash.replace(/^#\/?/,'').split('/'),[page,id,tab]=parts;
 let hash;
 if(page==='spiel') hash='#match/'+encodeURIComponent(id||'')+'/'+({bericht:'report',live:'ticker',wahl:'report',vorschau:'overview'}[tab]||'overview');
 else if(page==='team') hash=id?'#player/'+encodeURIComponent(id):'#season/squad';
 else if(page==='saison') hash='#season/'+({tabellen:'table',statistik:'table'}[id]||'games');
 else if(page==='statistik') hash='#season/table';
 else if(page==='verein') hash='#club';
 else if(page==='news'&&location.hash.startsWith('#/')) hash=id?'#news/'+encodeURIComponent(id):'#home';
 else if(!page||page==='ich') hash='#home';
 if(hash) history.replaceState(history.state,'',location.pathname+location.search+hash);
}
