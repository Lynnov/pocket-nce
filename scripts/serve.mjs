import http from 'node:http';
import { stat,readFile } from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../app/',import.meta.url));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const relative=path.relative(root,filename);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403).end();return;}
  const info=await stat(filename);if(!info.isFile()){res.writeHead(404).end();return;}
  const headers={'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  if(path.extname(filename)==='.mp3')headers['Accept-Ranges']='bytes';
  const range=req.headers.range;
  if(range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(range);
   if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   const start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
   const end=match[1]&&match[2]?Math.min(Number(match[2]),info.size-1):info.size-1;
   if(start>=info.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1});
   if(req.method==='HEAD')res.end();else createReadStream(filename,{start,end}).pipe(res);
  }else{res.writeHead(200,{...headers,'Content-Length':info.size});if(req.method==='HEAD')res.end();else createReadStream(filename).pipe(res);}
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('页面或素材不存在');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Pocket NCE preview: http://127.0.0.1:${port}`));
