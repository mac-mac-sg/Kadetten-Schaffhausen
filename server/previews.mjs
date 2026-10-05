import {mayUpdate} from './auth.mjs';
import seed from './seed.json' with {type:'json'};
import fcsgSeed from './fcsg-seed.json' with {type:'json'};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const fixtureKey=g=>JSON.stringify([String(g.id),g.home,g.away,g.date,g.time||'',g.league,g.venue||'']);
const key=(club,id)=>`previews/${club}/${id}.json`;
async function fixture(env,club,id){const saved=await env.BUCKET.get(`${club}/current.json`);const data=saved?await saved.json():club==='fcsg'?fcsgSeed:seed;return data.games.find(g=>String(g.id)===id)}
const upcoming=g=>g&&!g.score&&!g.live&&g.date>=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Zurich'});
const plain=(v,min,max)=>typeof v==='string'&&v.length>=min&&v.length<=max&&!/[<>\u0000-\u0008]/.test(v);
export async function previews(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/api/previews'){
  if(request.method!=='POST')return json({error:'POST required'},405);
  if(!await mayUpdate(request,env))return json({error:'Owner authorization required'},403);
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Origin rejected'},403);
  const body=await request.text();if(body.length>100000)return json({error:'Payload too large'},413);
  let batch;try{batch=JSON.parse(body).previews}catch{return json({error:'Invalid JSON'},400)}
  if(!Array.isArray(batch)||!batch.length||batch.length>12)return json({error:'Invalid preview batch'},400);
  const valid=[];
  for(const p of batch){
   if(!p||!['kadetten','fcsg'].includes(p.club)||!plain(p.id,1,80)||!/^[a-zA-Z0-9_-]+$/.test(p.id)||!plain(p.headline,3,160)||!Array.isArray(p.paragraphs)||p.paragraphs.length<2||p.paragraphs.length>3||!p.paragraphs.every(x=>plain(x,30,1800))||!Array.isArray(p.sources)||!p.sources.length||p.sources.length>6||!p.sources.every(s=>plain(s.label,2,100)&&typeof s.url==='string'&&s.url.length<1000&&/^https:\/\//.test(s.url)&&(()=>{try{const u=new URL(s.url);return !u.username&&!u.password}catch{return false}})())||!Number.isFinite(Date.parse(p.generatedAt))||Date.parse(p.generatedAt)>Date.now()+300000||Date.parse(p.generatedAt)<Date.now()-86400000)return json({error:'Invalid preview'},400);
   const g=await fixture(env,p.club,p.id);if(!upcoming(g)||p.fixtureKey!==fixtureKey(g))return json({error:'Fixture changed or finished'},409);
   valid.push({club:p.club,id:p.id,fixtureKey:p.fixtureKey,headline:p.headline,paragraphs:p.paragraphs,sources:p.sources,generatedAt:p.generatedAt});
  }
  for(const p of valid)await env.BUCKET.put(key(p.club,p.id),JSON.stringify(p));
  return json({ok:true,saved:valid.map(p=>({club:p.club,id:p.id}))});
 }
 if(request.method!=='GET')return json({error:'GET required'},405);
 const match=path.match(/^\/api\/previews\/(kadetten|fcsg)\/([a-zA-Z0-9_-]{1,80})$/);if(!match)return json({error:'Invalid preview path'},400);
 const [,club,id]=match,g=await fixture(env,club,id),saved=await env.BUCKET.get(key(club,id));
 if(!upcoming(g)||!saved)return json({error:'Preview unavailable'},404);
 const p=await saved.json();return p.fixtureKey===fixtureKey(g)&&Date.parse(p.generatedAt)>Date.now()-72*3600000?json(p):json({error:'Preview out of date'},404);
}
