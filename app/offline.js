export const AUDIO_CACHE='pocket-nce-audio-v1';
export async function initOffline(){
  if(!('serviceWorker' in navigator)||!window.isSecureContext)return false;
  await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  return true;
}
export async function isDownloaded(lesson){
  if(!('caches' in window))return false;
  return !!(await (await caches.open(AUDIO_CACHE)).match(new URL(lesson.audio,location.href)));
}
export async function downloadLesson(lesson){
  if(!('caches' in window)||!('serviceWorker' in navigator)||!window.isSecureContext)throw new Error('离线保存需要 HTTPS 或本机 localhost，请使用安全地址打开。');
  await navigator.serviceWorker.ready;
  let response;
  try{response=await fetch(lesson.audio,{cache:'no-store'});}catch{throw new Error('当前无法联网，音频尚未保存，请联网后重试。');}
  if(!response.ok)throw new Error('音频下载失败，请联网重试。');
  const blob=await response.blob();
  if(blob.size<1000)throw new Error('音频文件不完整，请重试。');
  await (await caches.open(AUDIO_CACHE)).put(new URL(lesson.audio,location.href),new Response(blob,{headers:{'Content-Type':'audio/mpeg','Content-Length':String(blob.size)}}));
  if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
}
export async function removeDownload(lesson){if('caches' in window)await (await caches.open(AUDIO_CACHE)).delete(new URL(lesson.audio,location.href));}
