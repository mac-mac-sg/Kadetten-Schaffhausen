// Spielansicht nach der freigegebenen Referenz; Matchday bleibt die übrige Oberfläche.
import {html,raw} from './text.js';
import {hasScore,shortTeam,dayLabel,countdown,kickoff,outcome} from './logic.js';
import {icon} from './icons.js';
export function centerTab(tab,live=false){
 if(tab==='vote')return 'vote';
 if(tab==='stats')return 'stats';
 if(['ticker','live'].includes(tab)||tab==='report'&&live)return 'ticker';
 return 'overview';
}
export function matchCenterMarkup({game,tab='overview',live=null,stale=false,crest=()=>'',body='',features='',voteOpen=false,now=Date.now()}){
 const active=centerTab(tab,!!live),finished=hasScore(game)&&!live,id=encodeURIComponent(game.id);
 const score=live?.score||game.score,result=finished?outcome(game):null;
 const label=live?[live.phase,live.clock].filter(Boolean).join(' · ')||'Live':finished?({S:'S · Sieg',N:'N · Niederlage',U:'U · Unentschieden'}[result]||'Beendet'):countdown(kickoff(game),now);
 const teams=[game.home,game.away];
 if(active==='vote')return html`<section class="mc-view"><div class="mc-back"><a href="#match/${id}/overview">${icon('back')}Zum Spiel</a></div><h1>Spieler des Matchs</h1><p class="mc-context">${shortTeam(game.home)} – ${shortTeam(game.away)}</p>${raw(features)}</section>`;
 return html`<section class="mc-view"><h1 class="mc-sr">${shortTeam(game.home)} – ${shortTeam(game.away)}</h1>
 <div class="mc-back"><a href="#season/games">${icon('back')}Zurück</a>${finished?html`<button type="button" data-mc-share aria-label="Resultat teilen">${icon('share')}</button>`:''}</div>
 <section class="mc-score${live?' is-live':''}" aria-label="${live?'Live-Spielstand':finished?'Endresultat':'Nächstes Spiel'}"><div class="mc-meta"><span>${[dayLabel(game,now),game.league,(game.venue||'').split(',')[0]].filter(Boolean).join(' · ')}</span><span class="mc-pill">${label}</span></div><div class="mc-duel"><span class="mc-team">${raw(crest(teams[0]))}<span>${shortTeam(teams[0])}</span></span><strong class="mc-result">${Array.isArray(score)?score.join(':'):game.time||'–'}</strong><span class="mc-team">${raw(crest(teams[1]))}<span>${shortTeam(teams[1])}</span></span></div>${live?html`<p class="mc-fresh">${stale?'Live-Daten verzögert · letzter bestätigter Stand':'Live · Aktualisierung alle 30 Sekunden'}</p>`:''}</section>
 <nav class="mc-tabs" aria-label="Spielbereich">${[['overview','Übersicht'],['ticker','Ticker'],['stats','Statistik']].map(([key,label])=>html`<a href="#match/${id}/${key}"${key===active?html` aria-current="page"`:''}>${label}</a>`)}</nav>
 ${finished&&active==='overview'&&game.league==='QHL'?html`<a class="mc-vote-teaser" href="#match/${id}/vote"><span class="mc-star">${icon('star')}</span><span><strong>Spieler des Matchs</strong><small>${voteOpen?'Wähle deinen Spieler':'Zum Ergebnis der Fan-Wahl'}</small></span>${icon('go')}</a>`:''}
 <div class="mc-body">${finished&&active==='overview'?html`<h2>Matchbericht</h2><div class="mc-report">${raw(body)}</div>`:raw(body)}</div>${raw(features)}<p class="mc-feedback" role="status" data-mc-feedback></p></section>`;
}
// Bereits von den Matchday-Vorlagen maskiertes HTML; niemals Roh-HTML aus einer API einsetzen.
export function centerBody(source,tab,doc=globalThis.document){
 const t=doc.createElement('template');t.innerHTML=source;
 const content=t.content.querySelector('.live-match-body,.match-recap,.match-preview-content,.content.narrow');
 if(!content)return '';
 content.querySelectorAll('#companion-qhl,.report-history').forEach(n=>n.remove());
 content.querySelectorAll('h1').forEach(n=>{const title=doc.createElement('h3');title.append(...n.childNodes);n.replaceWith(title)});
 return tab==='stats'||content.classList.contains('live-match-body')?content.outerHTML:content.innerHTML;
}
export function centerFeatures(source,voteOnly=false,doc=globalThis.document){
 const t=doc.createElement('template');t.innerHTML=source;
 const root=t.content.querySelector('#companion-qhl');if(!root)return '';
 if(voteOnly){root.querySelectorAll(':scope > :not(.companion-vote)').forEach(n=>n.remove());root.querySelector('.companion-vote')?.setAttribute('open','')}
 else root.querySelector('.companion-vote')?.remove();
 return root.outerHTML;
}
