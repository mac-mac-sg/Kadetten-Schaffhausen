// Kurze FCSG-Rückblicke entstehen ausschliesslich im autorisierten Datenlauf.
import {toReport} from '../../server/report-ai.mjs';
import {factsHash} from './preview-sync.mjs';
export function fcsgReportBase(g) {
 if(g.live||!g.score)return null;
 const facts=[`${g.home} – ${g.away}: ${g.score.join(':')} (Endresultat).`];
 if(g.half)facts.push(`Halbzeitstand: ${g.half.join(':')}.`);
 for(const e of g.events||[])if(e.type==='Tor'||e.type==='Eigentor')facts.push(`${e.minute}. Minute: ${e.player}, ${e.type} für ${e.home?g.home:g.away}${e.score&&!e.score.includes(null)?', Spielstand '+e.score.join(':'):''}${e.assist?', Assist '+e.assist:''}.`);
 for(const [label,key] of [['Ballbesitz (%)','possessionPercentage'],['Schüsse','totalScoringAtt'],['Schüsse aufs Tor','onTargetScoringAtt']])if(Number.isFinite(g.homeStats?.[key])&&Number.isFinite(g.awayStats?.[key]))facts.push(`${label}: ${g.homeStats[key]} zu ${g.awayStats[key]} (Heim zuerst).`);
 const headline=`${g.home} – ${g.away}: ${g.score.join(':')}`;
 const paragraphs=[`${g.home} und ${g.away} beenden die Partie mit ${g.score.join(':')}.${g.half?' Zur Pause stand es '+g.half.join(':')+'.':''}`,facts.slice(g.half?2:1).join(' ')||'Weitere bestätigte Detaildaten sind für diese Partie noch nicht verfügbar.'];
 return {headline,paragraphs,facts};
}
export function fcsgReportMessages(base) {
 return [{role:'system',content:'Schreibe einen kurzen Fussball-Match-Rückblick für Fans des FC St.Gallen 1879 in Deutsch mit Schweizer Rechtschreibung. Verwende ausschliesslich die gelieferten Fakten. Erfinde keine Taktik, Stimmung oder Hintergründe. Ergebnis immer Heimteam zuerst. Format: kurze Titelzeile, Leerzeile, genau zwei kurze Absätze mit je zwei bis drei Sätzen. Kein Markdown.'},{role:'user',content:base.facts.join('\n')}];
}
export async function syncFcsgReports(bucket,data,{write=null,now=new Date()}={}) {
 if(!data?.games)return {written:0,ki:0};
 let written=0,ki=0,attempts=0;
 for(const g of data.games.filter(g=>g.score&&!g.live).sort((a,b)=>b.date.localeCompare(a.date))) {
  const base=fcsgReportBase(g),hash=await factsHash(base),old=g.report;
  if(old?.baseHash===hash&&(old.generator==='ki'||!write||(old.aiAttempts||0)>=3))continue;
  let report={headline:base.headline,paragraphs:base.paragraphs,generator:'daten',score:g.score,baseHash:hash,generatedAt:now.toISOString(),aiAttempts:old?.baseHash===hash?old.aiAttempts||0:0};
  if(write&&attempts<3){attempts++;report.aiAttempts++;try{const res=await write(fcsgReportMessages(base)),parsed=res.ok?toReport(res.text,base.headline):null;if(parsed){report={...report,...parsed,generator:'ki'};ki++;}}catch{}}
  if(old?.baseHash===hash&&old.generator==='ki')continue;
  g.report=report;written++;
 }
 if(written)await bucket.put('fcsg/current.json',JSON.stringify(data));
 return {written,ki};
}
