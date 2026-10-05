import {mayUpdate} from './auth.mjs';
import seed from './seed.json' with {type:'json'};
const reply=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
const identity=g=>JSON.stringify([g.id,g.home,g.away,g.date,g.time||'']);
const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function game(env,id){const saved=await env.BUCKET.get('kadetten/current.json');return (saved?await saved.json():seed).games.find(g=>g.id===id)}
export function programmeMatches(g,text){return !!g&&g.home==='Kadetten Schaffhausen'&&typeof text==='string'&&normal(text).includes(normal(g.home))&&normal(text).includes(normal(g.away).replace(/^(hc|rk|tsv)/,''))&&normal(text).includes(g.date.split('-').reverse().join(''))}
export async function programmes(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/api/programmes'){
  if(request.method!=='POST')return reply({error:'POST required'},405);
  if(!await mayUpdate(request,env))return reply({error:'Owner authorization required'},403);
  const origin=request.headers.get('Origin');if(origin&&origin!==u.origin)return reply({error:'Origin rejected'},403);
  const body=await request.text();if(body.length>12000000)return reply({error:'Payload too large'},413);
  let p;try{p=JSON.parse(body)}catch{return reply({error:'Invalid JSON'},400)}
  if(!p||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id||'')||typeof p.pdfBase64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(p.pdfBase64)||p.pdfBase64.length>11000000||typeof p.titlepageText!=='string'||p.titlepageText.length>20000||typeof p.sourceUrl!=='string'||!/^https:\/\/(www\.)?kadettensh\.ch\/[^?#]+\.pdf(?:\?[^#]*)?$/.test(p.sourceUrl))return reply({error:'Invalid programme'},400);
  const g=await game(env,p.id);if(!programmeMatches(g,p.titlepageText)||p.fixtureKey!==identity(g))return reply({error:'Programme does not match fixture'},409);
  let bytes;try{bytes=Uint8Array.from(atob(p.pdfBase64),c=>c.charCodeAt(0))}catch{return reply({error:'Invalid PDF'},400)}
  if(bytes.length<1000||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||!new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF'))return reply({error:'Invalid PDF'},400);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  await env.BUCKET.put(`kadetten/programmes/${p.id}/${hash}.pdf`,bytes,{httpMetadata:{contentType:'application/pdf'}});
  const metadata={id:p.id,fixtureKey:identity(g),sourceUrl:p.sourceUrl,version:hash,bytes:bytes.length,updatedAt:new Date().toISOString(),home:g.home,away:g.away,date:g.date};
  await env.BUCKET.put(`kadetten/programmes/${p.id}.json`,JSON.stringify(metadata));return reply({ok:true,id:p.id,version:hash});
 }
 if(request.method!=='GET')return reply({error:'GET required'},405);
 const match=u.pathname.match(/^\/api\/programmes\/([a-zA-Z0-9_-]{1,80})(\/pdf)?$/);if(!match)return reply({error:'Invalid programme path'},400);
 const [,id,pdf]=match,g=await game(env,id),saved=await env.BUCKET.get(`kadetten/programmes/${id}.json`);if(!g||!saved)return reply({error:'Programme unavailable'},404);
 const p=await saved.json();if(p.fixtureKey!==identity(g))return reply({error:'Fixture changed'},404);
 if(!pdf)return reply({...p,pdfPath:`/api/programmes/${id}/pdf?v=${p.version}`});
 if(u.searchParams.has('v')&&u.searchParams.get('v')!==p.version)return reply({error:'Version changed'},404);
 const file=await env.BUCKET.get(`kadetten/programmes/${id}/${p.version}.pdf`);if(!file)return reply({error:'PDF unavailable'},404);
 return new Response(file.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="Matchprogramm-${g.date}.pdf"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
