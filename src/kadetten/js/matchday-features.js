// Die vier übernommenen Companion-Funktionen, eingebettet in das Matchday-Layout.
import {html} from './text.js';
import {hasScore,kickoff,shortTeam} from './logic.js';
import {isOwn,storiesForGame,displayName} from './match.js';
import {SQUAD} from '../data/squad.js';

export function qhlFeatureState({club,game,live},now=Date.now()) {
  if(club!=='kadetten'||game?.league!=='QHL'||!isOwn(game.home)&&!isOwn(game.away)) return null;
  if(live) return null;
  if(hasScore(game)) return 'finished';
  const at=kickoff(game);
  return at!==null&&now<at?'preview':null;
}
const photo = (candidate,data) => {
  const nr=Object.entries(data?.playerSeason?.players||{}).find(([,p])=>p.shvPlayerId!=null&&String(p.shvPlayerId)===String(candidate.id))?.[0];
  return SQUAD.find(p=>String(p.number)===nr);
};
const validCandidates = vote => (Array.isArray(vote?.candidates)?vote.candidates:[]).filter(c=>c&&/^[\w-]{1,80}$/.test(String(c.id))&&typeof c.name==='string');
export function votingMarkup({vote,selected,mine,busy,message,error,data}) {
  if(!vote) return html`<p class="muted" role="status">${error?'Die Fan-Wahl ist derzeit nicht erreichbar. Bitte später erneut öffnen.':'Die Fan-Wahl wird geladen …'}</p>`;
  const candidates=validCandidates(vote);
  if(!candidates.length) return html`<p class="muted" role="status">Die Fan-Wahl öffnet nach Spielende, sobald der bestätigte Spielbericht vorliegt.</p>`;
  if(mine&&vote.open) return html`<p role="status">${message||'Deine Stimme ist gespeichert. Das Ergebnis erscheint nach Wahlende.'}</p>`;
  if(!vote.open) {
    const total=Number.isInteger(vote.total)&&vote.total>=0?vote.total:0;
    return html`<div class="companion-results">${[...candidates].sort((a,b)=>(vote.counts?.[b.id]||0)-(vote.counts?.[a.id]||0)).map(c=>{
      const count=Number.isInteger(vote.counts?.[c.id])?vote.counts[c.id]:0,share=total?Math.min(100,Math.max(0,Math.round(count/total*100))):0;
      return html`<div><span>${displayName(c.name)}${String(mine)===String(c.id)?html` <small>Deine Stimme</small>`:''}</span><strong>${share} %</strong></div>`;
    })}</div><p class="muted">${total} ${total===1?'Stimme':'Stimmen'} · Wahl beendet</p>`;
  }
  const closes=Number.isFinite(vote.closesAt)?new Date(vote.closesAt).toLocaleString('de-CH',{timeZone:'Europe/Zurich',weekday:'short',hour:'2-digit',minute:'2-digit'}):'';
  return html`<div class="companion-candidates">${candidates.map(c=>{
    const player=photo(c,data),chosen=String(selected)===String(c.id),detail=[Number.isInteger(c.goals)?c.goals+' Tore':'',Number.isInteger(c.saves)?c.saves+' Paraden':''].filter(Boolean).join(' · ');
    return html`<button class="companion-player${chosen?' selected':''}" type="button" data-companion-player="${c.id}" aria-pressed="${String(chosen)}"${busy?html` disabled`:''}>${player?html`<img src="assets/players/${player.number}.webp" alt="" width="72" height="88" loading="lazy">`:''}<span><strong>${player?.name||displayName(c.name)}</strong><small>${detail}</small></span><span class="companion-check" aria-hidden="true">${chosen?'✓':'○'}</span></button>`;
  })}</div><button class="button companion-submit" type="button" data-companion-confirm${busy||!candidates.some(c=>String(c.id)===String(selected))?html` disabled`:''}>${busy?'Wird gespeichert …':'Stimme abgeben'}</button><p class="muted" role="status">${message||'Wähle deinen Spieler und bestätige deine Stimme.'}${closes?' Offen bis '+closes+'.':''}</p>`;
}
export function featureMarkup(context,{now=Date.now(),tip=null,visited=false,vote=null,selected=null,mine=null,busy=false,message='',error=false,voteOpen=false}={}) {
  const state=qhlFeatureState(context,now);if(!state)return '';
  const {game,data}=context;
  if(state==='preview') {
    const values=tip||[28,26];
    return html`<section id="companion-qhl" class="content narrow companion-features" aria-labelledby="companion-tip"><section class="stats-block"><h2 id="companion-tip">Dein Tipp</h2><div class="companion-tip">${[game.home,game.away].map((team,i)=>html`<div><span>${shortTeam(team)}</span><div><button type="button" data-companion-tip="${i}:-1" aria-label="${shortTeam(team)} ein Tor weniger"${values[i]===0?html` disabled`:''}>−</button><strong class="companion-tip-value" aria-live="polite">${values[i]}</strong><button type="button" data-companion-tip="${i}:1" aria-label="${shortTeam(team)} ein Tor mehr"${values[i]===99?html` disabled`:''}>+</button></div></div>`)}</div><p class="muted">${tip?'Dein Tipp ist gespeichert.':'Tippe auf + oder −, um deinen Tipp abzugeben.'} Ohne Einsatz, nur auf diesem Gerät. Bis zum Anpfiff änderbar.</p></section></section>`;
  }
  const articles=storiesForGame(data?.stories,game).slice(0,3);
  return html`<section id="companion-qhl" class="content narrow companion-features" aria-label="Rund um dein Spiel">
    ${articles.length?html`<section class="stats-block"><h2>Artikel zum Spiel</h2>${articles.map(s=>html`<a class="related-story" href="#news/${encodeURIComponent(s.id)}"><span>${s.title}<small>${s.date}</small></span><span aria-hidden="true">→</span></a>`)}</section>`:''}
    <details class="stats-block companion-vote"${voteOpen?html` open`:''}><summary>Spieler des Matchs</summary><div class="companion-vote-body">${votingMarkup({vote,selected,mine,busy,message,error,data})}<p class="muted">Inoffizielle Fan-Wahl. Eine Stimme pro Gerät und Spiel.</p></div></details>
    <section class="stats-block"><button class="button companion-attendance" type="button" data-companion-attendance aria-pressed="${String(visited)}">${visited?'✓ Ich war in der Halle':'Ich war in der Halle'}</button><p class="muted">Deine Erinnerung bleibt auf diesem Gerät.</p></section>
  </section>`;
}
