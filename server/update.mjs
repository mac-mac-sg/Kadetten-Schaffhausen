import {parsePlayerSeason,fetchPlayerSeason} from './shv.mjs';
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const plain=s=>String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
// Article links come from an external feed and end up in href attributes: accept only https links on the club domain.
export function wpLink(value){try{const u=new URL(value);if(u.protocol==='https:'&&['kadettensh.ch','www.kadettensh.ch'].includes(u.hostname)&&!u.username&&!u.password)return u.href}catch{}return 'https://kadettensh.ch/'}
async function get(url,json=false){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Source HTTP '+r.status);return json?r.json():r.text()}
const ids={'508367':'stgallen','508373':'staefa','extra-ehl-20260930-kadetten-csm':'bukarest','extra-ehl-20261006-kadetten-izvidac':'izvidac','extra-ehl-20261013-chambery-kadetten':'chambery'};
export function parseGames(html,old){const result=[];for(const m of html.matchAll(/<tr class="mc-row"([\s\S]*?)<\/tr>/g)){const r=m[1],d=Object.fromEntries([...r.matchAll(/data-([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));if(!/^202[67]-\d\d-\d\dT/.test(d.date))continue;const id=ids[d.gameid]||d.gameid;if(typeof id!=='string'||!/^[\w-]{1,80}$/.test(id))throw Error('Game ID schema changed');const prior=old.find(g=>g.id===id)||{};const score=plain(r.slice(r.indexOf('>')+1)).match(/\b(\d+)\s*:\s*(\d+)\b/);const g={...prior,id,date:d.date.slice(0,10),time:d.date.slice(11,16),home:esc(d.home),away:esc(d.away),league:esc(d.league),venue:esc(d.venue+', '+d.city),image:prior.image||'team.jpg',url:prior.url||'https://kadettensh.ch/matchcenter/'};if(score)g.score=[+score[1],+score[2]];else if(!(prior.date===g.date&&prior.home===g.home&&prior.away===g.away&&prior.league===g.league&&Array.isArray(prior.score)&&prior.score.length===2&&prior.score.every(v=>Number.isInteger(v)&&v>=0))) {delete g.score;delete g.half;}result.push(g)}if(result.length<18||new Set(result.map(g=>g.id)).size!==result.length)throw Error('Incomplete or duplicated fixtures');return result;}
// SHV-confirmed finals remain in the season snapshot after the daily live card expires.
export function mergeConfirmedResults(games,finished=[]) {
 const name=s=>plain(s).replaceAll('&amp;','&').replace(/^TSV /,'').trim().toLowerCase();
 return games.map(g=>{
  const match=finished.find(m=>m.status==='finished'&&m.date===g.date&&m.league===g.league&&name(m.home)===name(g.home)&&name(m.away)===name(g.away)&&Array.isArray(m.score)&&m.score.length===2&&m.score.every(v=>Number.isInteger(v)&&v>=0));
  return match?{...g,score:[...match.score],...(Array.isArray(match.half)&&match.half.every(Number.isInteger)?{half:[...match.half]}:{})}:g;
 });
}
export function parseTables(html){const tables={QHL:[],EHL:[]},records={};let group='QHL';for(const m of html.matchAll(/<tr\s+class="mc-rank-row"([\s\S]*?)<\/tr>/g)){const name=m[1].match(/data-teamname="([^"]+)"/)?.[1];const v=[...m[1].matchAll(/<td>\s*(-?\d+)\s*<\/td>/g)].map(x=>+x[1]);if(!name||v.length!==9)throw Error('Table schema changed');if(v[0]===1&&tables.QHL.length)group='EHL';const [rank,played,w,d,l,gf,ga,diff,pts]=v;if(w+d+l!==played||w*2+d!==pts||gf-ga!==diff)throw Error('Table validation failed');tables[group].push([esc(name),played,gf,ga,pts]);if(group==='QHL')records[esc(name)]=[w,d,l];}if(tables.QHL.length!==10||tables.EHL.length!==4)throw Error('Unexpected table size');return {tables,teamRecords:records};}
// Small embedded batches avoid oversized WordPress responses; transient failures get bounded retries.
export async function fetchNewsPosts(fetchFn=fetch) {
  const posts=[],seen=new Set(),size=20,limit=100;
  for(let page=1;page<=limit;page++) {
    let response,error;
    for(let attempt=0;attempt<3;attempt++) {
      try {
        response=await fetchFn('https://kadettensh.ch/wp-json/wp/v2/posts?after=2026-06-01T00:00:00&per_page='+size+'&page='+page+'&_embed=wp:featuredmedia',{signal:AbortSignal.timeout(25000)});
        if(response.ok)break;
        error=Error('Source HTTP '+response.status);
        if(![429,500,502,503,504].includes(response.status))throw error;
      } catch(e) {error=e;if(response&&!response.ok&&![429,500,502,503,504].includes(response.status))throw e;}
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
    if(!response?.ok)throw error;
    const batch=await response.json();
    if(!Array.isArray(batch)||batch.length>size)throw Error('Invalid news page');
    for(const post of batch){if(!post?.id||seen.has(post.id))throw Error('Duplicated news page');seen.add(post.id);posts.push(post);}
    const pages=Number(response.headers.get('X-WP-TotalPages'));
    if(batch.length<size||Number.isInteger(pages)&&pages>0&&page>=pages)return posts;
  }
  throw Error('News pagination limit');
}
async function news(old,supplied,saveArticle){const posts=supplied||await fetchNewsPosts();if(posts.length<old.length/2)throw Error('Incomplete news');return await Promise.all(posts.map(async p=>{const prior=old.find(x=>x.url===p.link);if(!/^https:\/\/kadettensh\.ch\//.test(p.link))throw Error('Unexpected news URL');const title=plain(p.title.rendered),limit=Math.max(0,24-title.split(' ').length);const image=p._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url||p._embedded?.['wp:featuredmedia']?.[0]?.source_url;const id=prior?.id||String(p.id);let articleVersion=prior?.articleVersion;if(saveArticle){const html=p.content?.rendered;if(p.content?.protected||typeof html!=='string'||!html.trim()||html.length>2000000)throw Error('Full article unavailable');articleVersion=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html))),b=>b.toString(16).padStart(2,'0')).join('');if(articleVersion!==prior?.articleVersion)await saveArticle({id,version:articleVersion,postId:p.id,html,url:wpLink(p.link)})}return {id,articleVersion,postId:p.id,title:esc(title),text:esc(plain(p.excerpt.rendered).split(' ').slice(0,limit).join(' ')+' …'),date:p.date.slice(0,10).split('-').reverse().join('.'),image:(prior?.image&&!/^https?:/.test(prior.image)?prior.image:null)||(/^https:\/\/kadettensh\.ch\//.test(image||'')?image:prior?.image||'team.jpg'),url:wpLink(p.link)};}));}
export async function refresh(previous,supplied={},saveArticle){const next=structuredClone(previous);next.checkedAt=new Date().toISOString();next.status={...previous.status};const jobs=[['players',async()=>{next.playerSeason=parsePlayerSeason(supplied.shvData||await fetchPlayerSeason())}],['games',async()=>{next.games=parseGames(supplied.matchHtml||await get('https://kadettensh.ch/matchcenter/'),previous.games)}],['table',async()=>Object.assign(next,parseTables(supplied.tableHtml||await get('https://kadettensh.ch/')))],['news',async()=>{next.stories=await news(previous.stories,supplied.posts,saveArticle)}]];await Promise.all(jobs.map(async([key,run])=>{try{await run();next.status[key]={ok:true,updatedAt:next.checkedAt}}catch(e){next.status[key]={...previous.status?.[key],ok:false,error:String(e.message)}}}));return next;}
