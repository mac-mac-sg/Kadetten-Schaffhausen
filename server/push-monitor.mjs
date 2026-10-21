import {getLiveMatch,getNationalLiveMatch} from './live.mjs';
import {getFcsgLive} from './fcsg.mjs';
import {PUSH_PREFIX,PUSH_CLUBS,digest} from './push-subscriptions.mjs';
import {sendPush} from './web-push.mjs';
const validScore=s=>Array.isArray(s)&&s.length===2&&s.every(v=>Number.isInteger(v)&&v>=0);
const plain=s=>String(s||'').replaceAll('&amp;','&').replaceAll('&quot;','"').replace(/<[^>]*>/g,'').slice(0,120);
export function pushKickoff(g) {
 if(!/^\d{4}-\d\d-\d\d$/.test(g.date)||!/^\d\d:\d\d$/.test(g.time)||g.confirmed===false)return NaN;
 const stamp=g.date+'T'+g.time+':00',probe=new Date(stamp+'Z');
 const offset=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',timeZoneName:'shortOffset'}).formatToParts(probe).find(p=>p.type==='timeZoneName').value.match(/GMT([+-])(\d+)(?::(\d+))?/);
 return Date.parse(stamp+(offset?offset[1]+offset[2].padStart(2,'0')+':'+(offset[3]||'00'):'Z'));
}
export function pushPhase(g,club) {
 if(g?.status==='finished'||g?.status==='FINISHED')return 'final';
 if(club==='fcsg')return g?.status==='PAUSE'?'half':g?.status==='FIRST HALF'?'first':g?.status==='SECOND HALF'?'second':null;
 const p=String(g?.phase||'').toLowerCase();
 if(/halbzeitpause|^halbzeit$|half.?time|half time break|^pause$/.test(p))return 'half';
 if(/2\.? halbzeit|second half|2nd half/.test(p))return 'second';
 if(/1\.? halbzeit|first half|1st half/.test(p))return 'first';
 return null;
}
export function pushHalfScore(g,club,phase) {
 const score=g.liveScore||g.score;
 if(phase==='half'||(club!=='fcsg'&&phase==='second'&&g.clock==='30:00'))return validScore(score)?score:null;
 if(club==='fcsg')return validScore(g.half)?g.half:null;
 // SHV interval fields can contain incomplete values. Use the full, score-verified goal sequence instead.
 const events=g.details?.events;
 if(!Array.isArray(events)||!validScore(score))return null;
 const goals=events.filter(e=>validScore(e.score)&&Number.isFinite(e.seconds)).sort((a,b)=>a.seconds-b.seconds||Number(a.id)-Number(b.id));
 if(!goals.some(e=>e.seconds>1800)||JSON.stringify(goals.at(-1)?.score)!==JSON.stringify(score))return null;
 return goals.filter(e=>e.seconds<=1800).at(-1)?.score||null;
}
export function advancePushState(previous,fixture,match,club,now) {
 const at=pushKickoff(fixture),next=structuredClone(previous||{events:{}});
 next.events||={};
 next.watchStartedAt??=now;
 const add=(type,score)=>{if(!next.events[type])next.events[type]={at:now,...(score?{score}:{}),home:plain(match?.home||fixture.home),away:plain(match?.away||fixture.away)}};
 if(!fixture.score&&now>=at-30*60000&&now<at-25*60000)add('reminder');
 if(match&&(String(match.id)===String(fixture.id)||(plain(match.home)===plain(fixture.home)&&plain(match.away)===plain(fixture.away)))) {
  const phase=pushPhase(match,club),score=match.liveScore||match.score;
  if(phase==='first'&&((previous?.phase==='waiting'&&previous.watchStartedAt<=at+5*60000)||(!previous?.phase&&now-at<5*60000)))add('start');
  if(phase==='half'||(phase==='second'&&previous?.sawFirst)){const half=pushHalfScore(match,club,phase);if(half)add('half',half)}
  // Baseline an already-finished match without sending a stale final result after activation/deployment.
  if(phase==='final'&&previous?.phase&&previous.phase!=='final'&&(previous.phase!=='waiting'||previous.watchStartedAt<=at+5*60000)&&validScore(score))add('final',score);
  if(phase==='first'||phase==='half')next.sawFirst=true;
  if(phase)next.phase=phase;
 }
 next.phase||='waiting';
 return next;
}
const defaultLive=async club=>club==='fcsg'?(await getFcsgLive()).match:club==='otmar'?await getNationalLiveMatch(40900):await getLiveMatch().then(d=>d.match||d.finished);
export async function monitorPush(env,now=Date.now(),deps={}) {
 if(!env.DATA||!env.PUSH_PRIVATE_JWK||!env.PUSH_PUBLIC_KEY)return;
 const kv=env.DATA,devices=[];
 const today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'});
 const schedules=new Map(await Promise.all(PUSH_CLUBS.map(async club=>{
  const snapshot=await kv.get(club+'/current.json','json');
  return [club,(snapshot?.games||[]).filter(g=>g.date===today&&now>=pushKickoff(g)-31*60000&&now<pushKickoff(g)+5*3600000)];
 })));
 // KV list has a separate quota. Outside match windows, ordinary reads suffice.
 if(![...schedules.values()].some(games=>games.length))return;
 let cursor;
 do{const page=await kv.list({prefix:PUSH_PREFIX,cursor,limit:100});devices.push(...(await Promise.all(page.keys.map(k=>kv.get(k.name,'json').then(device=>device?{key:k.name,...device}:null)))).filter(Boolean));cursor=page.list_complete?null:page.cursor}while(cursor);
 if(!devices.length)return;
 const liveMatches=new Map(await Promise.all(PUSH_CLUBS.map(async club=>{
  if(!devices.some(d=>d.clubs.includes(club)&&d.types.some(t=>t!=='reminder'))||!schedules.get(club).some(g=>now>=pushKickoff(g)-2*60000))return [club,null];
  try{return [club,await (deps.live||defaultLive)(club)]}catch{return [club,null]}
 })));
 for(const club of PUSH_CLUBS) await (async()=>{
  const subscribers=devices.filter(d=>d.clubs.includes(club)&&d.types.length);if(!subscribers.length)return;
  const fixtures=schedules.get(club);
  if(!fixtures.length)return;
  const live=liveMatches.get(club); // Failed sources never advance a phase.
  for(const fixture of fixtures){
   const id=await digest(fixture.date+':'+fixture.id+':'+plain(fixture.home)+':'+plain(fixture.away)),key='push/v2/matches/'+id;
   const previous=await kv.get(key,'json'),state=advancePushState(previous,fixture,live,club,now);
   if(JSON.stringify(previous)!==JSON.stringify(state))await kv.put(key,JSON.stringify(state),{expirationTtl:2*86400});
   for(const [type,event] of Object.entries(state.events)){
    if(now-event.at>5*60000)continue;
    const title={reminder:'In 30 Minuten geht’s los',start:'Das Spiel hat begonnen',half:'Pausenresultat',final:'Endresultat'}[type];
    const url=new URL('https://mac-mac-sg.github.io/Kadetten-Schaffhausen/v2/');url.searchParams.set('club',club);url.hash='#match/'+encodeURIComponent(fixture.id)+'/overview';
    const body=event.home+(event.score?' '+event.score.join(' : ')+' ':' – ')+event.away;
    // Delivery failures are isolated per device; 404/410 subscriptions are removed.
    await Promise.all(subscribers.filter(d=>d.types.includes(type)&&d.createdAt<=event.at).map(async device=>{
     const sentKey='push/v2/sent/'+id+'/'+type+'/'+device.key.slice(PUSH_PREFIX.length);
     if(await kv.get(sentKey))return;
     try {
      const result=await (deps.send||sendPush)(env,device.subscription,{title,body,tag:'v2-'+id+'-'+type,url:url.href});
      if(result.ok)await kv.put(sentKey,'1',{expirationTtl:2*86400});
      else if([404,410].includes(result.status))await kv.delete(device.key);
     }catch{/* Retry only within the event's five-minute freshness window. */}
    }));
   }
  }
 })();
}
