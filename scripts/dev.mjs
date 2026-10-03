import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import worker from '../server/worker.mjs';
const root=resolve('src/client'),dataRoot=resolve('.local-data');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ttf':'font/ttf'};
function contained(root,path){const p=resolve(root,path);if(!p.startsWith(root+sep))throw Error('Invalid path');return p}
const env={
  BUCKET:{
    async get(key){try{const text=await readFile(contained(dataRoot,key),'utf8');return {json:async()=>JSON.parse(text)}}catch(e){if(e.code==='ENOENT')return null;throw e}},
    async put(key,value){const path=contained(dataRoot,key);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,value)}
  },
  ASSETS:{async fetch(request){const url=new URL(request.url);let path=contained(root,decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html');try{if((await stat(path)).isDirectory())path=resolve(path,'index.html');return new Response(await readFile(path),{headers:{'Content-Type':types[extname(path)]||'application/octet-stream'}})}catch(e){return new Response('Not found',{status:404})}}}
};
// Local preview has no owner identity or update secret. Never trust browser-supplied identity headers.
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:3000');
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value&&!key.startsWith('oai-')&&!key.startsWith('x-kadetten-')&&!key.startsWith('cf-access-')&&key!=='cookie')headers.set(key,Array.isArray(value)?value.join(','):value)}
  const parts=[];let bytes=0;for await(const part of req){bytes+=part.length;if(bytes>12000000){res.writeHead(413);res.end();return}parts.push(part)}
  const init={method:req.method,headers};if(!['GET','HEAD'].includes(req.method))init.body=Buffer.concat(parts);
  const response=await worker.fetch(new Request(url,init),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(500);res.end('Local preview error')}});
server.listen(3000,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:3000 (read-only)'));
