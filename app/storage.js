import { initialState, parseBackup, makeBackup } from './core.js';
let database;
let queue = Promise.resolve();
function open() {
  if (!database) database=new Promise((resolve,reject)=>{
    const request=indexedDB.open('pocket-nce',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{database=null;reject(new Error('浏览器暂时无法保存进度，请导出备份后重试。'));};
  });
  return database;
}
export async function loadState() {
  const db=await open();
  return new Promise((resolve,reject)=>{
    const request=db.transaction('state').objectStore('state').get('current');
    request.onsuccess=()=>{try {resolve(request.result ? parseBackup(makeBackup(request.result)) : initialState());} catch(e){reject(e);}};
    request.onerror=()=>reject(new Error('无法读取学习进度，请尝试恢复备份。'));
  });
}
export function saveState(state) {
  const snapshot=structuredClone(state);
  const task=queue.catch(()=>{}).then(async()=>{
    const db=await open();
    await new Promise((resolve,reject)=>{
      const transaction=db.transaction('state','readwrite');
      transaction.objectStore('state').put(snapshot,'current');
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(new Error('进度未能保存，请重试或导出备份。'));
      transaction.onabort=()=>reject(new Error('保存被中断，请重试或导出备份。'));
    });
  });
  queue=task;
  return task;
}
