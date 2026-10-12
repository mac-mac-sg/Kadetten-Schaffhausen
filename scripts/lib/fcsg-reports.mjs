// Die KI wählt bestätigte Fakten; ausgegeben werden ausschliesslich deren geprüfte Formulierungen.
import {factsHash} from './preview-sync.mjs';
const VERSION=2;
export function fcsgReportBase(g) {
 if(g.live||!Array.isArray(g.score)||g.score.length!==2||!g.score.every(v=>Number.isInteger(v)&&v>=0))return null;
 const headline=`${g.home} – ${g.away}: ${g.score.join(':')}`;
 const catalog=[];
 const add=(id,text)=>catalog.push({id,text});
 const dated=/^\d{4}-\d{2}-\d{2}$/.test(g.date)?` am ${g.date.split('-').reverse().join('.')}`:'';
 const result=`${g.home} und ${g.away} beenden die Partie${dated} mit ${g.score.join(':')}.`;
 const half=g.half?.length===2&&g.half.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=g.score[i])?`Zur Pause stand es ${g.half.join(':')}.`:'';
 const goals=(g.events||[]).filter(e=>(e.type==='Tor'||e.type==='Eigentor')&&e.player&&typeof e.home==='boolean');
 // Ein korrigierter Endstand darf keinen veralteten oder unvollständigen Torverlauf übernehmen.
 if(goals.filter(e=>e.home).length===g.score[0]&&goals.filter(e=>!e.home).length===g.score[1])goals.forEach((e,i)=>{
  if(!/^\d+(?:\+\d+)?$/.test(String(e.minute)))return;
  add('goal-'+i,`${e.minute}. Minute: ${e.player}${e.type==='Eigentor'?' erzielt ein Eigentor zugunsten von':' trifft für'} ${e.home?g.home:g.away}${e.assist?', vorbereitet von '+e.assist:''}.`);
 });
 for(const [id,label,key,suffix] of [['possession','Ballbesitz','possessionPercentage',' %'],['shots','Gesamtschüsse','totalScoringAtt',''],['on-target','Schüsse aufs Tor','onTargetScoringAtt','']]){
  const a=g.homeStats?.[key],b=g.awayStats?.[key];
  if(Number.isFinite(a)&&a>=0&&Number.isFinite(b)&&b>=0&&(id!=='possession'||a<=100&&b<=100))add(id,`${label}: ${g.home} ${a.toLocaleString('de-CH')}${suffix}, ${g.away} ${b.toLocaleString('de-CH')}${suffix}.`);
 }
 const fallback=catalog.slice(0,3).map(f=>f.text).join(' ')||'Weitere bestätigte Detaildaten sind für diese Partie noch nicht verfügbar.';
 return {headline,paragraphs:[[result,half].filter(Boolean).join(' '),fallback],facts:[result,half,...catalog.map(f=>f.text)].filter(Boolean),catalog};
}
export function fcsgReportMessages(base) {
 return [{role:'system',content:'Wähle die bis zu drei wichtigsten bestätigten Fakten für einen kurzen Fussball-Match-Rückblick. Antworte ausschliesslich mit JSON im Format {"facts":["id","id"]}. Verwende nur IDs der gelieferten Fakten, jede höchstens einmal. Schreibe keinen eigenen Text, keine Zahlen, keinen Titel und keine Erklärung.'},{role:'user',content:JSON.stringify(base.catalog)}];
}
export function selectedFcsgReport(text,base) {
 try {
  const selected=JSON.parse(text);
  if(!Array.isArray(selected.facts)||selected.facts.length<1||selected.facts.length>3||new Set(selected.facts).size!==selected.facts.length)return null;
  const facts=selected.facts.map(id=>base.catalog.find(f=>f.id===id));
  if(facts.some(f=>!f))return null;
  return {headline:base.headline,paragraphs:[base.paragraphs[0],facts.map(f=>f.text).join(' ')]};
 } catch {return null;}
}
export async function syncFcsgReports(bucket,data,{write=null,now=new Date()}={}) {
 if(!data?.games)return {written:0,ki:0};
 let written=0,ki=0,attempts=0;
 for(const g of data.games.filter(g=>g.score&&!g.live).sort((a,b)=>b.date.localeCompare(a.date))) {
  const base=fcsgReportBase(g);if(!base)continue;
  const hash=await factsHash(base),old=g.report,current=old?.version===VERSION&&old.baseHash===hash;
  if(current&&(old.generator==='ki'||!write||(old.aiAttempts||0)>=3||base.catalog.length<2))continue;
  let report={version:VERSION,headline:base.headline,paragraphs:base.paragraphs,generator:'daten',score:g.score,baseHash:hash,generatedAt:now.toISOString(),aiAttempts:current?old.aiAttempts||0:0};
  if(write&&attempts<3&&base.catalog.length>=2){attempts++;report.aiAttempts++;try{const res=await write(fcsgReportMessages(base)),parsed=res.ok?selectedFcsgReport(res.text,base):null;if(parsed){report={...report,...parsed,generator:'ki'};ki++;}}catch{}}
  g.report=report;written++;
 }
 if(written)await bucket.put('fcsg/current.json',JSON.stringify(data));
 return {written,ki};
}
