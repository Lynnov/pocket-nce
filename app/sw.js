const SHELL='pocket-nce-shell-v5',AUDIO='pocket-nce-audio-v1';
const files=['./','./index.html','./styles.css','./main.js','./core.js','./storage.js','./player.js','./offline.js','./icons.js','./data/lessons.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pocket-nce-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function audioResponse(request){
  const cache=await caches.open(AUDIO),cached=await cache.match(request.url);
  if(!cached)return fetch(request);
  const range=request.headers.get('range');if(!range)return cached;
  const buffer=await cached.arrayBuffer(),size=buffer.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  return new Response(buffer.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('.mp3')){event.respondWith(audioResponse(event.request));return;}
  event.respondWith(fetch(event.request).then(response=>response).catch(async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    return new Response('离线内容尚未准备好',{status:503});
  }));
});
