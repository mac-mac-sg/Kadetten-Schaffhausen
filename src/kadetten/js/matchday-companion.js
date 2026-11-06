import {matchCenterMarkup,centerBody,centerFeatures,centerTab} from './match-center.js';
import {API_ORIGIN} from './config.js';
import {featureMarkup,qhlFeatureState} from './matchday-features.js';
import {tips,changeTip,myGames,toggleMyGame} from './personal.js';
import {createVotes,myVotes} from './fan-vote.js';
const votes=createVotes({origin:API_ORIGIN}),cache=new Map(),selections=new Map(),expanded=new Set();
let busy=false,message='',messageGame='';
const context=()=>window.KADETTEN_MATCHDAY?.context();
function status(id){
 let entry=cache.get(id);
 if(!entry||!entry.pending&&Date.now()-entry.at>(entry.error?60000:30000)){
   entry={...entry,pending:true,at:Date.now()};cache.set(id,entry);
   votes.status(id).then(value=>{entry.value=value;entry.error=false}).catch(()=>{entry.error=true}).finally(()=>{entry.pending=false;entry.at=Date.now();if(context()?.game?.id===id)refresh()});
 }
 return entry;
}
function markup(ctx){
 const state=qhlFeatureState(ctx);if(!state)return '';
 const id=String(ctx.game.id),entry=state==='finished'?status(id):null;
 return String(featureMarkup(ctx,{tip:tips()[id],visited:myGames().includes(id),vote:entry?.value,error:entry?.error,selected:selections.get(id),mine:myVotes()[id],busy,message:messageGame===id?message:'',voteOpen:expanded.has(id)}));
}
function refresh(){
 const ctx=context(),root=document.getElementById('companion-qhl');if(!root||!ctx)return;
 const focus=document.activeElement?.closest('[data-companion-player],[data-companion-confirm],[data-companion-tip],[data-companion-attendance]');
 const selector=focus?[...focus.attributes].filter(a=>a.name.startsWith('data-companion-')).map(a=>'['+a.name+'="'+CSS.escape(a.value)+'"]').join(''):null;
 root.outerHTML=document.querySelector('.mc-view')?centerFeatures(markup(ctx),centerTab(ctx.tab,!!ctx.live)==='vote'):markup(ctx);
 const subtitle=document.querySelector('.mc-vote-teaser small');if(subtitle)subtitle.textContent=cache.get(String(ctx.game.id))?.value?.open?'Wähle deinen Spieler':'Zum Ergebnis der Fan-Wahl';
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
let renderingSource=false;
window.KADETTEN_COMPANION={markup:game=>{const ctx=context();return ctx&&!renderingSource?markup({...ctx,game}):''},match(game,tab,legacy){
 const ctx=context();let live=ctx?.live?ctx.match:null;
 if(live?.status==='finished')live=null;
 if(ctx?.match?.status==='finished')game={...game,score:ctx.match.score,half:ctx.match.half||game.half};
 const current=centerTab(tab,!!live),features=centerFeatures(markup({...ctx,game}),current==='vote');
 let body='';
 if(current==='ticker')body=window.KADETTEN_MATCHDAY.ticker(game);
 else if(current!=='vote'){
  renderingSource=true;
  try{body=centerBody(legacy(game,current==='stats'?'stats':game.score&&!live?'report':'overview'),current)}finally{renderingSource=false}
 }
 return String(matchCenterMarkup({game,tab,live,stale:ctx.liveError,crest:window.KADETTEN_MATCHDAY.crest,body,features,voteOpen:cache.get(String(game.id))?.value?.open}));
}};
document.addEventListener('click',async e=>{
 if(!e.target.closest('[data-mc-share]'))return;
 const game=context()?.game;if(!game?.score)return;
 const text=game.home+' – '+game.away+' '+game.score.join(':');
 try{if(navigator.share)await navigator.share({title:'Kadetten',text,url:location.href});else{await navigator.clipboard.writeText(text+' '+location.href);const feedback=document.querySelector('[data-mc-feedback]');if(feedback)feedback.textContent='Resultat kopiert.'}}catch{}
});
document.addEventListener('toggle',e=>{
 if(!e.target.matches?.('.companion-vote'))return;
 const id=context()?.game?.id;if(!id)return;
 e.target.open?expanded.add(String(id)):expanded.delete(String(id));
},true);
document.addEventListener('click',async e=>{
 const target=e.target.closest('[data-companion-player],[data-companion-confirm],[data-companion-tip],[data-companion-attendance]');
 if(!target||target.disabled)return;
 const ctx=context(),state=ctx&&qhlFeatureState(ctx);if(!state)return;
 const id=String(ctx.game.id);
 if(target.hasAttribute('data-companion-tip')&&state==='preview'){
  const [team,delta]=target.dataset.companionTip.split(':').map(Number);if(![0,1].includes(team)||![-1,1].includes(delta))return;
  changeTip(id,team,delta);refresh();
 }else if(target.hasAttribute('data-companion-attendance')&&state==='finished'){toggleMyGame(id);refresh()}
 else if(target.dataset.companionPlayer&&state==='finished'&&!busy){selections.set(id,target.dataset.companionPlayer);message='';expanded.add(id);refresh()}
 else if(target.hasAttribute('data-companion-confirm')&&state==='finished'&&!busy){
  const selected=selections.get(id),v=cache.get(id)?.value;
  if(!selected||!v?.open||!v.candidates?.some(c=>String(c.id)===selected)||myVotes()[id])return;
  busy=true;message='';messageGame=id;refresh();
  try{await votes.vote(id,selected);message='Deine Stimme ist gespeichert. Das Ergebnis erscheint nach Wahlende.'}
  catch(error){message=error.message||'Die Stimme konnte nicht gespeichert werden. Bitte erneut versuchen.'}
  finally{busy=false;cache.delete(id);refresh()}
 }
});
// Anpfiff sperrt auch eine bereits geöffnete Tippkarte ohne Navigation.
setInterval(()=>{if(!document.hidden&&document.getElementById('companion-qhl'))refresh()},15000);
