import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../app/sw.js',import.meta.url),'utf8');
function worker({audio=true}={}){
 const handlers={},bytes=Uint8Array.from({length:100},(_,i)=>i);
 const cachedAudio=new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}});
 const context={URL,Response,fetch:async()=>{throw new Error('offline');},
  caches:{open:async()=>({match:async()=>audio?cachedAudio.clone():undefined}),match:async request=>String(request.url||request).endsWith('index.html')?new Response('<main>cached lesson</main>'):undefined},
  self:{location:{origin:'http://localhost'},addEventListener:(name,fn)=>handlers[name]=fn}};
 vm.runInNewContext(source,context);
 return async(path,range)=>{let response;const request=new Request(`http://localhost/${path}`,range?{headers:{Range:range}}:{});handlers.fetch({request,respondWith:value=>response=value});return response;};
}
test('offline audio responds with exact requested bytes and media headers',async()=>{
 const response=await worker()('audio/lesson-1.mp3','bytes=10-19');
 assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 10-19/100');
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[10,11,12,13,14,15,16,17,18,19]);
});
test('offline suffix range serves the actual file tail',async()=>{
 const response=await worker()('audio/lesson-1.mp3','bytes=-5');
 assert.equal(response.headers.get('content-length'),'5');assert.equal(response.headers.get('content-range'),'bytes 95-99/100');
});
test('invalid media ranges fail instead of returning misleading complete audio',async()=>{
 for(const range of ['bytes=100-200','bytes=50-20','bytes=-0','bytes=','bytes=0-1,5-6']){
  assert.equal((await worker()('audio/lesson-1.mp3',range)).status,416);
 }
});
test('uncached audio fails offline and cached app shell remains readable',async()=>{
 await assert.rejects(()=>worker({audio:false})('audio/lesson-1.mp3'),/offline/);
 const shell=await worker()('index.html');assert.equal(shell.status,200);assert.match(await shell.text(),/cached lesson/);
});
