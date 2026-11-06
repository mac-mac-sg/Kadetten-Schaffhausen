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
 root.outerHTML=markup(ctx);
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
window.KADETTEN_COMPANION={markup:game=>{const ctx=context();return ctx?markup({...ctx,game}):''}};
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
