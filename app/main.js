import { lessons } from './data/lessons.js';
import { initialState, stages, resultLabels, localDay, dueLessons, finishSession, makeBackup, parseBackup } from './core.js';
import { loadState, saveState } from './storage.js';
import { LessonPlayer } from './player.js';
import { initOffline, isDownloaded, downloadLesson, removeDownload } from './offline.js';
import { icon } from './icons.js';

const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageLabels={understand:'理解',practice:'练句',memorize:'提示背诵',recall:'串背'};
const app=$('#app'),sheet=$('#sheet'),audio=$('#audio');
let state=initialState(),storageError=false,loadFailed=false,importing=false,writeVersion=0,shownTranslations=false,shownSummary=false,focusView=false,loop=false,shadow=false;
let revealed=new Set(),wordRevealed=new Set(),downloads=new Map(),pendingBackup=null,toastTimer,lastTimeSave=0,lastRenderedRoute='';
const player=new LessonPlayer(audio,onPlayback);
function toast(message){const node=$('#toast');node.textContent=message;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,4500);}
function storageWarning(message){storageError=true;$('#save-warning').hidden=false;$('#save-warning').innerHTML=`${escape(message)} <button data-action="retry-save">重试</button> <button data-action="export">导出进度</button>`;}
function persist(){
  if(loadFailed||importing)return;
  const version=++writeVersion;
  saveState(state).then(()=>{if(version===writeVersion){storageError=false;$('#save-warning').hidden=true;}}).catch(error=>storageWarning(error.message));
}
function applySettings(){document.body.classList.toggle('dark',state.settings.theme==='dark');document.documentElement.style.setProperty('--body-size',`${state.settings.fontSize}px`);$('meta[name="theme-color"]').content=state.settings.theme==='dark'?'#172b26':'#f7f8f2';}
function route(){return location.hash.slice(1)||'today';}
function currentLesson(){return lessons.find(l=>l.id===state.active?.lessonId);}
function time(seconds){return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function button(action,label,cls='secondary',extra=''){return `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;}
function topbar(){return `<header class="topbar"><div class="brand"><span class="brand-logo">${icon('book',21)}</span><div>口袋新概念<small>POCKET NEW CONCEPT</small></div></div>${button('settings',icon('settings',20),'icon-button','aria-label="学习设置"')}</header>`;}
function nav(active){return `<nav class="bottom-nav" aria-label="主导航">${[['today','home','今天'],['lessons','book','课文'],['words','leaf','生词']].map(([r,i,t])=>button('navigate',`${icon(i,21)}<span>${t}</span>`,`nav-item ${active===r?'active':''}`,`data-page="${r}" ${active===r?'aria-current="page"':''}`)).join('')}</nav>`;}
function go(page){if(route().startsWith('learn/'))savePosition();player.stop();closeSheet();if(route()===page){render();window.scrollTo(0,0);}else location.hash=page;}
function makeActive(id){
  return {lessonId:id,index:0,stage:'understand',hint:'full',hintsUsed:[],audioTime:0,scrollTop:0,startedAt:new Date().toISOString()};
}
function startLesson(id){
  if(state.active?.lessonId!==id){savePosition();player.stop();state.active=makeActive(id);const weak=state.progress[id]?.weak||[];if(weak.length){state.active.index=Math.max(0,lessons.find(l=>l.id===id).sentences.findIndex(s=>weak.includes(s.id)));state.active.stage='practice';}shownTranslations=false;shownSummary=false;revealed.clear();}
  if(!state.progress[id])state.progress[id]={status:'learning',weak:[]};
  persist();go(`learn/${id}`);
}
function home(){
  const due=dueLessons(state),next=state.active?.lessonId||due[0]||lessons.find(l=>!state.progress[l.id]?.lastResult)?.id||1;
  const lesson=lessons.find(l=>l.id===next),active=state.active?.lessonId===next;
  const words=Object.values(state.words).filter(w=>!w.familiar).length;
  const total=Object.values(state.progress).filter(p=>p.lastResult).length;
  const date=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});
  const m=state.settings.minutes;
  return `<div class="page">${topbar()}<div class="greeting"><div><span class="overline">A LITTLE, EVERY DAY</span><h1>每一程，都有进步。</h1><p>小花，今天也给英语留一点时间。</p></div></div>
  <section class="hero"><div class="hero-art">${icon('train',165)}</div><div class="hero-meta">${icon('headphones',15)} <span>第二册 · LESSON ${String(next).padStart(2,'0')}</span></div><h2>${escape(lesson.title)}</h2><p>${escape(lesson.chineseTitle)}<br>${active?`上次停在第 ${state.active.index+1} 句 · ${stageLabels[state.active.stage]}`:due.includes(next)?'先回忆昨天的内容，再向前一点。':'从理解一句开始，慢慢背熟整篇。'}</p>
  ${button('start',`${icon(active?'play':'arrow',17)} ${active?'继续学习':due.includes(next)?'开始复习':'开始今天的学习'} <span class="push">${icon('arrow',17)}</span>`,'primary',`data-id="${next}"`)}<div class="hero-foot"><span>${lesson.sentences.length} 个句段 · 美音原声</span><span>BOOK TWO / 02</span></div></section>
  <div class="section-head"><h2>这一程的安排</h2><div class="time-choices" aria-label="学习时间">${[20,25,30].map(v=>button('minutes',`${v} 分`,v===m?'selected':'',`data-value="${v}" aria-pressed="${v===m}"`)).join('')}</div></div>
  <section class="session-plan"><div class="plan-step"><span class="step-icon">${icon('repeat',18)}</span><div><h3>${due.length?'温习，再出发':'先听懂一个小故事'}</h3><p>${due.length?`${due.length} 篇课文等你回忆`:'看懂句意，遇到生词随手点开'}</p></div><span class="step-time">约 ${Math.round(m*.2)} 分钟</span></div>
  <div class="plan-step"><span class="step-icon">${icon('book',18)}</span><div><h3>一句一句，慢慢记住</h3><p>听读 · 减少提示 · 串背整篇</p></div><span class="step-time">约 ${Math.round(m*.6)} 分钟</span></div>
  <div class="plan-step"><span class="step-icon">${icon('leaf',18)}</span><div><h3>把记住的带走</h3><p>回忆一遍，标记还不熟的地方</p></div><span class="step-time">约 ${m-Math.round(m*.2)-Math.round(m*.6)} 分钟</span></div></section>
  <div class="stats">${button('navigate',`<span class="stat-top">学习足迹 ${icon('book',17)}</span><strong>${total}</strong><small>/ 3 篇已练习</small>`,'stat','data-page="lessons"')}${button('navigate',`<span class="stat-top">随身生词 ${icon('leaf',17)}</span><strong>${words}</strong><small>个待复习</small>`,'stat','data-page="words"')}</div>
  <p class="gentle-note">${icon('clock',14)} 到站就停，下次接着学。<br></p><p class="gentle-note" style="margin-top:8px;font-size:10px">${escape(date)}</p></div>${nav('today')}`;
}
function library(){
  const due=dueLessons(state);
  return `<div class="page">${topbar()}<div class="page-heading"><span class="overline">YOUR LITTLE LIBRARY</span><h1>一课一课，走得更远。</h1><p>不用赶进度，真正记住才算向前。</p></div><div class="book-banner"><div class="mini-cover"><small>NEW<br>CONCEPT</small><strong>2</strong></div><div><h2>实践与进步</h2><p>Practice and Progress</p><p>前三课 · 个人学习样本</p></div></div>
  <div class="section-head"><h2>我的课文</h2><span class="overline">03 LESSONS</span></div>${lessons.map(l=>{
    const p=state.progress[l.id],download=downloads.get(l.id);
    return `<article class="lesson-card">${button('start',`<span class="lesson-number">${String(l.id).padStart(2,'0')}</span><div><h2 class="lesson-title">${escape(l.title)}</h2><p>${escape(l.chineseTitle)} · ${l.sentences.length} 个句段</p></div><span class="chevron">${icon('chevron',16)}</span>`,'lesson-card-main',`data-id="${l.id}"`)}<div class="lesson-meta"><span class="badge ${due.includes(l.id)?'due':''}">${due.includes(l.id)?'到期复习':p?.lastResult?resultLabels[p.lastResult]:p?'学习中':'未开始'}</span>${button(download==='ready'?'remove-download':'download',`${icon(download==='ready'?'check':'download',14)} ${download==='ready'?'可离线':download==='loading'?'下载中…':download==='error'?'重试下载':'离线保存'}`,'download-button',`data-id="${l.id}" ${download==='loading'?'disabled':''}`)}</div>${p?.dueDate?`<p>下次复习 · ${escape(p.dueDate)}</p>`:''}</article>`;
  }).join('')}<p class="gentle-note">${icon('download',14)} 出发前保存课程，路上弱网也能学。</p></div>${nav('lessons')}`;
}
function wordsPage(){
  const entries=Object.values(state.words).sort((a,b)=>Number(a.familiar)-Number(b.familiar));
  return `<div class="page">${topbar()}<div class="page-heading"><span class="overline">WORDS IN CONTEXT</span><h1>在句子里，记住单词。</h1><p>${entries.length?`${entries.filter(w=>!w.familiar).length} 个待复习 · ${entries.filter(w=>w.familiar).length} 个已熟悉`:'读课文时点一下单词，把想记住的留下来。'}</p></div>${entries.length?entries.map(w=>{
    const lesson=lessons.find(l=>l.id===w.lessonId),entry=lesson.vocabulary.find(v=>v.word===w.word);if(!entry)return '';
    const sentence=lesson.sentences.find(s=>s.id===entry.exampleSentenceId),key=`${w.lessonId}:${w.word}`,show=wordRevealed.has(key);
    return `<article class="word-review"><span class="overline">LESSON ${String(w.lessonId).padStart(2,'0')} ${w.familiar?'· 已熟悉':''}</span><h2>${escape(w.word)}</h2><blockquote>${escape(sentence?.text)}</blockquote>${show?`<p class="meaning">${escape(entry.pos)} ${escape(entry.meaning)}</p><div class="row-actions">${button('word-rate','还不熟','secondary',`data-key="${escape(key)}" data-value="false"`)}${button('word-rate',`${icon('check',16)} 熟悉了`,'secondary',`data-key="${escape(key)}" data-value="true"`)}</div>`:button('word-reveal',`${icon('eye',16)} 想一想，再看释义`,'secondary',`data-key="${escape(key)}"`)}</article>`;
  }).join(''):`<div class="empty"><div class="empty-icon">${icon('leaf',32)}</div><h2>你的生词，慢慢积累</h2><p>不需要一口气记很多。<br>先从今天课文里的一个词开始。</p><div style="margin-top:25px">${button('navigate','去读第一课','primary','data-page="lessons"')}</div></div>`}</div>${nav('words')}`;
}
function isKnown(lesson,word){const normalized=word.toLowerCase().replace(/[’]/g,"'");return lesson.vocabulary.some(v=>v.word.toLowerCase()===normalized||(v.forms||[]).some(f=>f.toLowerCase()===normalized));}
function sentenceText(lesson,sentence){
  const phrases=lesson.vocabulary.flatMap(v=>[v.word,...(v.forms||[])]).filter(w=>w.includes(' ')).sort((a,b)=>b.length-a.length).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const pattern=new RegExp(`\\b(?:${phrases.length?phrases.join('|')+'|':''}[A-Za-z]+(?:['’][A-Za-z]+)*)\\b`,'gi');
  let result='',last=0;for(const match of sentence.text.matchAll(pattern)){result+=escape(sentence.text.slice(last,match.index))+`<button class="word ${isKnown(lesson,match[0])?'known':''}" data-action="word" data-word="${escape(match[0])}" data-sentence="${escape(sentence.id)}">${escape(match[0])}</button>`;last=match.index+match[0].length;}
  return result+escape(sentence.text.slice(last));
}
function sentenceBody(lesson,sentence){
  const a=state.active,hiddenStage=['memorize','recall'].includes(a.stage),level=hiddenStage?a.hint:'full';
  if(level==='full'||revealed.has(sentence.id))return `<div class="sentence-text">${a.stage==='recall'?escape(sentence.text):sentenceText(lesson,sentence)}</div>`;
  if(level==='keywords')return `<div class="sentence-cue">${escape(sentence.cue)}</div>${button('reveal','查看原句','text-button',`data-sentence="${sentence.id}"`)}`;
  return `<div class="hidden-line"><span class="memory-bars" aria-label="英文已隐藏"><i></i><i></i><i></i></span>${button('reveal',`${icon('eye',14)} 提示`,'',`data-sentence="${sentence.id}"`)}</div>`;
}
function recallPassage(lesson){
  const paragraphs=[];
  lesson.sentences.forEach((sentence,index)=>{
    if(index===0||sentence.paragraph!==lesson.sentences[index-1].paragraph)paragraphs.push([]);
    paragraphs.at(-1).push(`<span class="recall-sentence">${escape(sentence.text)}</span>`);
  });
  return `<article class="recall-passage" aria-label="课文完整原文">${paragraphs.map(sentences=>`<p>${sentences.join(' ')}</p>`).join('')}</article>`;
}
function study(){
  const l=currentLesson(),a=state.active;if(!l)return home();
  a.index=Math.min(a.index,l.sentences.length-1);
  const practice=a.stage==='practice'||a.stage==='memorize'||focusView;
  const s=l.sentences[a.index],weak=state.progress[l.id]?.weak||[];
  return `<div class="learn-page"><header class="learn-header">${button('navigate',icon('back',21),'icon-button','data-page="today" aria-label="返回今天"')}<span class="overline">BOOK TWO · YOUR DAILY PRACTICE</span>${button('settings',icon('settings',20),'icon-button','aria-label="学习设置"')}</header>
  <div class="learn-title"><span class="overline">LESSON ${String(l.id).padStart(2,'0')}</span><h1>${escape(l.title)}</h1><p>${escape(l.chineseTitle)}</p></div>
  <div class="stages" role="group" aria-label="学习阶段">${stages.map(stage=>button('stage',stageLabels[stage],stage===a.stage?'active':'',`data-stage="${stage}" aria-pressed="${stage===a.stage}"`)).join('')}</div>
  ${a.stage==='understand'?`<div class="context-toggle">${button('summary',`${icon('book',14)} ${shownSummary?'收起文章大意':'先了解文章大意'}`,'text-button')}${button('translation',shownTranslations?'隐藏译意':'显示译意','text-button')}</div>${shownSummary?`<section class="summary"><span class="overline">文章大意</span>${escape(l.summary)}</section>`:''}`:''}
  ${a.stage==='practice'?'<p class="inline-tip">先听一句，再跟着读。开启“跟读留白”，会给你留出开口的时间。</p>':''}
  ${a.stage==='memorize'?`<div class="hint-levels" aria-label="背诵提示级别">${[['full','完整英文'],['keywords','关键词'],['hidden','隐藏英文']].map(([level,label])=>button('hint',label,level===a.hint?'active':'',`data-level="${level}" aria-pressed="${level===a.hint}"`)).join('')}</div>`:''}
  ${a.stage==='recall'?recallPassage(l):practice?`<div class="focus-label"><span>句段 ${String(a.index+1).padStart(2,'0')} / ${l.sentences.length}</span>${button('weak',`${icon('mark',14)} ${weak.includes(s.id)?'已标记':'标记难句'}`,'text-button',`data-sentence="${s.id}"`)}</div><article class="focus-card">${sentenceBody(l,s)}${shownTranslations?`<p class="translation">${escape(s.translation)}</p>`:''}</article><div class="focus-nav">${button('previous','上一句','','aria-label="上一句"')}${button('translation',shownTranslations?'收起译意':'看句意与解释','','')}${button('next','下一句','','aria-label="下一句"')}</div>${shownTranslations&&s.note?`<p class="inline-tip">${escape(s.note)}</p>`:''}`:
  `<div class="passage">${l.sentences.map((sentence,index)=>`<article id="sentence-${index}" class="sentence ${index===a.index?'current':''} ${index>0&&sentence.paragraph!==l.sentences[index-1].paragraph?'paragraph-start':''}">${button('sentence-play',icon('play',11),'sentence-play',`data-index="${index}" aria-label="播放第 ${index+1} 句"`)}${sentenceBody(l,sentence)}${shownTranslations?`<p class="translation">${escape(sentence.translation)}</p>`:''}<div class="sentence-tools">${sentence.note?button('note','句子解释','',`data-index="${index}"`):''}${button('weak',weak.includes(sentence.id)?'已标记难句':'标记难句',weak.includes(sentence.id)?'marked':'',`data-sentence="${sentence.id}"`)}</div></article>`).join('')}</div>`}
  ${a.stage==='understand'?`<div class="context-toggle">${button('focus',focusView?'展开整篇':'聚焦当前句','text-button')}<span>点击英文单词可查看释义</span></div>`:''}
  <p class="source-note">原文依据个人教材 · 第 ${l.printedPage} 页<br>配套美音 · 译意与提示用于辅助理解</p></div>
  <section class="player-dock" aria-label="音频播放器"><div class="player-status"><span id="player-label">${icon('headphones',12)} 准备好，就从这一句开始</span><span id="player-time">${time(a.audioTime)} / ${time(l.duration)}</span></div><div class="progress-track"><span id="play-progress"></span></div><div class="player-controls">
  ${button('rate',`<strong>${state.settings.rate}×</strong><span>语速</span>`,'small-control')}${button('loop',`${icon('repeat',18)}<span>单句循环</span>`,`small-control ${loop?'active':''}`,`aria-pressed="${loop}"`)}${button('play',icon('play',23),'big-play','id="main-play" aria-label="播放当前句"')}${button('shadow',`${icon('volume',18)}<span>跟读留白</span>`,`small-control ${shadow?'active':''}`,`aria-pressed="${shadow}"`)}${button('play-all',`${icon('headphones',18)}<span>整篇听读</span>`,'small-control')}
  </div><div class="dock-action"><p>${a.stage==='recall'?'按真实回忆情况记录，不需要追求一次背会。':'随时离开，进度会自动保存。'}</p>${button(a.stage==='recall'?'finish':'next-stage',`${a.stage==='recall'?'记录本次背诵':a.stage==='understand'?'开始练句':a.stage==='practice'?'试着背一句':'串背整篇'} ${icon('arrow',15)}`,'primary')}</div></section>`;
}
function render(keepScroll=false){
  const scroll=window.scrollY,r=route();
  if(r.startsWith('learn/')){
    const id=Number(r.split('/')[1]);if(!lessons.some(l=>l.id===id)){location.hash='today';return;}
    if(state.active?.lessonId!==id){state.active=makeActive(id);state.progress[id]??={status:'learning',weak:[]};persist();}
    app.innerHTML=study();player.load(currentLesson());
  }else app.innerHTML=r==='lessons'?library():r==='words'?wordsPage():home();
  applySettings();onPlayback(player.status,player.index);
  if(keepScroll)window.scrollTo(0,scroll);
  else if(r!==lastRenderedRoute){const restored=r.startsWith('learn/')?state.active?.scrollTop||0:0;requestAnimationFrame(()=>window.scrollTo(0,restored));}
  lastRenderedRoute=r;
}
function savePosition(){const a=state.active;if(a&&route()===`learn/${a.lessonId}`){if(player.lesson?.id===a.lessonId&&player.status!=='idle'&&audio.currentTime>0){a.audioTime=audio.currentTime;a.audioMode=player.mode||'sentence';}a.scrollTop=Math.max(0,window.scrollY);persist();}}
function markHint(key){if(state.active?.stage==='memorize'){if(state.active.hintsUsed.length<1000)state.active.hintsUsed.push(key);persist();}}
function setStage(stage){
  if(state.active.stage===stage)return;
  savePosition();player.stop();state.active.stage=stage;state.active.scrollTop=0;shownTranslations=false;shownSummary=false;focusView=false;revealed.clear();
  if(stage==='memorize')state.active.hint='keywords';
  if(stage==='recall'){state.active.hint='full';state.active.hintsUsed=[];}
  persist();render();window.scrollTo(0,0);
}
function onPlayback(status,index){
  if(!route().startsWith('learn/'))return;
  const a=state.active,l=currentLesson();if(!a||!l||player.lesson?.id!==a.lessonId)return;
  if(Number.isInteger(index)&&index!==a.index){a.index=index;if(['practice','memorize'].includes(a.stage))render(true);else document.querySelectorAll('.sentence,.recall-sentence').forEach((el,i)=>el.classList.toggle('current',i===index));}
  const label=$('#player-label'),control=$('#main-play');
  if(label)label.textContent=({playing:player.mode==='all'?'正在整篇播放':`正在播放第 ${a.index+1} 句`,shadow:'轮到你了 · 小声跟读这一句',waiting:'稍停一下，即将重播',paused:'已暂停 · 随时接着学',ended:'听完了，试着自己说一遍',idle:'美音原声 · 点击开始听读',error:'播放失败，请检查网络或离线下载'})[status]||'美音原声';
  if(control){const playing=['playing','shadow','waiting'].includes(status);control.innerHTML=icon(playing?'pause':'play',23);control.setAttribute('aria-label',playing?'暂停播放':'播放当前句');}
  if($('#player-time'))$('#player-time').textContent=`${time(audio.currentTime||a.audioTime||0)} / ${time(l.duration)}`;
  if($('#play-progress'))$('#play-progress').style.width=`${Math.min(100,(audio.currentTime||0)/l.duration*100)}%`;
  if(status==='playing'&&Date.now()-lastTimeSave>2000){a.audioTime=audio.currentTime;a.audioMode=player.mode;persist();lastTimeSave=Date.now();}
}
async function playSentence(index=state.active.index,resumeTime=null){
  const l=currentLesson();player.load(l);state.active.index=index;state.active.audioMode='sentence';markHint(`audio:${l.sentences[index].id}`);persist();
  if(['practice','memorize'].includes(state.active.stage))render(true);
  try{await player.playSentence(index,{loop,shadow,rate:state.settings.rate,resumeTime});}catch(error){toast(error.message||'播放未成功，请再点一次播放。');}
}
function openSheet(content){$('#sheet-body').innerHTML=content;if(!sheet.open)sheet.showModal();}
function closeSheet(){if(sheet.open)sheet.close();}
function sheetHeader(title){return `<div class="sheet-head"><h2>${title}</h2>${button('close',icon('close',19),'icon-button','aria-label="关闭"')}</div>`;}
function settings(){
  openSheet(`${sheetHeader('让学习更顺手')}<div class="setting-row"><h3>正文字号</h3><div class="setting-actions">${[18,20,22,24].map(n=>button('font',`${n}`,state.settings.fontSize===n?'selected':'',`data-value="${n}"`)).join('')}</div></div><div class="setting-row"><h3>阅读外观</h3><div class="setting-actions">${button('theme',`${icon('sun',16)} 日间`,state.settings.theme==='light'?'selected':'','data-value="light"')}${button('theme','夜间',state.settings.theme==='dark'?'selected':'','data-value="dark"')}</div></div><div class="setting-row"><h3>进度备份</h3><div class="setting-actions">${button('export',`${icon('download',15)} 导出进度`)}${button('import',`${icon('upload',15)} 恢复备份`)}</div><p class="sheet-note">备份包含学习进度和生词，不包含音频。换设备或清理浏览器之前，记得保存一份。</p></div><p class="sheet-note">第二册前三课 · 个人学习样本<br>普通浏览器与主屏幕入口的进度可能独立保存。首次使用请固定一个入口。</p>`);
}
function wordSheet(word,sentenceId){
  const l=currentLesson(),s=l.sentences.find(x=>x.id===sentenceId);markHint(`word:${word}`);
  const entry=l.vocabulary.find(v=>v.word.toLowerCase()===word.toLowerCase()||(v.forms||[]).some(f=>f.toLowerCase()===word.toLowerCase()));
  if(!entry){openSheet(`${sheetHeader('随文查词')}<h3 class="dictionary-word">${escape(word)}</h3><p class="sheet-note">这个词暂未收录在首版词表中，可以先结合句意理解。</p><div class="dictionary-example"><p>${escape(s?.text)}</p><small>${escape(s?.translation)}</small></div>`);return;}
  const key=`${l.id}:${entry.word}`,saved=!!state.words[key];
  openSheet(`${sheetHeader('在这一句里')}<h3 class="dictionary-word">${escape(entry.word)}</h3><p class="phonetic">${escape(entry.phonetic||'')} ${escape(entry.pos)}</p><p class="dictionary-meaning">${escape(entry.meaning)}</p><div class="dictionary-example"><p>${escape(s?.text)}</p><small>${escape(s?.translation)}</small></div>${button('play-example',`${icon('volume',16)} 听这个句子`,'secondary',`data-index="${l.sentences.indexOf(s)}"`)}${button('save-word',`${icon(saved?'check':'plus',17)} ${saved?'已加入生词，再点移除':'加入我的生词'}`,'primary',`style="margin-top:16px" data-word="${escape(entry.word)}" data-sentence="${sentenceId}"`)}<p class="sheet-note">先记住它在当前句子中的意思。</p>`);
}
function finishSheet(){player.pause();openSheet(`${sheetHeader('这一次，记住了多少？')}<p class="sheet-note">按自己脱离原文后的回忆情况记录，我们下次接着巩固。</p>${[['forgot','没背出','下次先从卡住的地方开始。'],['prompted','需要提示','能想起一部分，再巩固一次。'],['independent','独立背出','不看原文，也能完整回忆课文。']].map(([value,title,sub])=>button('result',`${icon(value==='independent'?'check':value==='prompted'?'eye':'repeat',21)}<span><strong>${title}</strong><small>${sub}</small></span>${icon('chevron',15)}`,'result-choice',`data-value="${value}"`)).join('')}`);}
function exportProgress(){const blob=new Blob([makeBackup(state)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`口袋新概念-进度-${localDay()}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已生成进度备份，请保存到“文件”。');}
async function refreshDownloads(){await Promise.all(lessons.map(async l=>{try{downloads.set(l.id,await isDownloaded(l)?'ready':'none');}catch{downloads.set(l.id,'none');}}));if(route()==='lessons')render(true);}

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  if(importing)return;
  const {action}=target.dataset,a=state.active,l=currentLesson();
  try{
    if(action==='navigate')go(target.dataset.page);
    else if(action==='start')startLesson(Number(target.dataset.id));
    else if(action==='minutes'){state.settings.minutes=Number(target.dataset.value);persist();render(true);}
    else if(action==='settings')settings();
    else if(action==='close')closeSheet();
    else if(action==='font'){state.settings.fontSize=Number(target.dataset.value);persist();applySettings();settings();}
    else if(action==='theme'){state.settings.theme=target.dataset.value;persist();applySettings();settings();}
    else if(action==='stage')setStage(target.dataset.stage);
    else if(action==='next-stage')setStage(stages[Math.min(stages.indexOf(a.stage)+1,3)]);
    else if(action==='summary'){shownSummary=!shownSummary;render(true);}
    else if(action==='translation'){shownTranslations=!shownTranslations;if(shownTranslations)markHint('translation');render(true);}
    else if(action==='focus'){focusView=!focusView;render(true);}
    else if(action==='hint'){a.hint=target.dataset.level;if(a.hint!=='hidden')markHint(`level:${a.hint}`);revealed.clear();persist();render(true);}
    else if(action==='reveal'){markHint(target.dataset.sentence);revealed.add(target.dataset.sentence);render(true);}
    else if(action==='next'||action==='previous'){player.stop();a.index=Math.max(0,Math.min(l.sentences.length-1,a.index+(action==='next'?1:-1)));a.audioTime=l.sentences[a.index].start;a.audioMode='sentence';persist();render(true);}
    else if(action==='sentence-play'||action==='play-example'){await playSentence(Number(target.dataset.index));}
    else if(action==='play'){if(['playing','shadow','waiting'].includes(player.status)){player.pause();savePosition();}else if(a.audioMode==='all'){markHint('audio:all');await player.playAll(state.settings.rate,a.audioTime);}else await playSentence(a.index,a.audioTime);}
    else if(action==='play-all'){player.load(l);markHint('audio:all');await player.playAll(state.settings.rate).catch(()=>toast('播放失败，请检查网络或重试。'));}
    else if(action==='loop'){loop=!loop;player.stop();render(true);}
    else if(action==='shadow'){shadow=!shadow;player.stop();render(true);}
    else if(action==='rate'){const rates=[.75,1,1.25];state.settings.rate=rates[(rates.indexOf(state.settings.rate)+1)%rates.length];audio.playbackRate=state.settings.rate;player.stop();persist();render(true);}
    else if(action==='weak'){const p=state.progress[l.id];p.weak??=[];const id=target.dataset.sentence;p.weak=p.weak.includes(id)?p.weak.filter(x=>x!==id):[...p.weak,id];persist();render(true);}
    else if(action==='note'){const s=l.sentences[Number(target.dataset.index)];markHint(`note:${s.id}`);openSheet(`${sheetHeader('把这一句读懂')}<div class="dictionary-example"><p>${escape(s.text)}</p><small>${escape(s.translation)}</small></div><p class="sheet-note">${escape(s.note)}</p>`);}
    else if(action==='word')wordSheet(target.dataset.word,target.dataset.sentence);
    else if(action==='save-word'){const key=`${l.id}:${target.dataset.word}`;if(state.words[key])delete state.words[key];else state.words[key]={lessonId:l.id,word:target.dataset.word,familiar:false};persist();wordSheet(target.dataset.word,target.dataset.sentence);}
    else if(action==='word-reveal'){wordRevealed.add(target.dataset.key);render(true);}
    else if(action==='word-rate'){state.words[target.dataset.key].familiar=target.dataset.value==='true';persist();render(true);toast(target.dataset.value==='true'?'记住了，也记住它的用法。':'已保留在待复习生词中。');}
    else if(action==='finish')finishSheet();
    else if(action==='result'){
      try{const lessonId=a.lessonId;state=finishSession(state,target.dataset.value,new Date(),{selfReported:true});player.stop();persist();history.replaceState(null,'','#today');render();openSheet(`<div class="success"><div class="success-mark">${icon('check',30)}</div><h2>今天，又向前一点。</h2><p>已记录：${resultLabels[target.dataset.value]}<br>下次复习：${state.progress[lessonId].dueDate}</p>${button('navigate','回到今天','primary','data-page="today"')}</div>`);}
      catch(error){toast(error.message);}
    }
    else if(action==='download'){
      const lesson=lessons.find(x=>x.id===Number(target.dataset.id));downloads.set(lesson.id,'loading');render(true);
      try{await downloadLesson(lesson);downloads.set(lesson.id,'ready');toast('已保存，这课可以离线学习了。');}catch(error){downloads.set(lesson.id,'error');toast(error.message);}render(true);
    }
    else if(action==='remove-download'){const lesson=lessons.find(x=>x.id===Number(target.dataset.id));openSheet(`${sheetHeader('管理离线课程')}<p class="sheet-note">${escape(lesson.title)} 已保存。移除音频不会删除学习进度。</p>${button('confirm-remove','移除离线音频','secondary',`data-id="${lesson.id}"`)}`);}
    else if(action==='confirm-remove'){const lesson=lessons.find(x=>x.id===Number(target.dataset.id));await removeDownload(lesson);downloads.set(lesson.id,'none');closeSheet();render(true);}
    else if(action==='export')exportProgress();
    else if(action==='import'){$('#backup-file').value='';$('#backup-file').click();}
    else if(action==='confirm-import'){
      if(!pendingBackup)return;
      importing=true;player.stop();
      try{await saveState(pendingBackup);state=pendingBackup;pendingBackup=null;loadFailed=false;storageError=false;$('#save-warning').hidden=true;closeSheet();history.replaceState(null,'','#today');render();toast('备份已恢复。');}finally{importing=false;}
    }
    else if(action==='retry-save'){if(loadFailed){state=await loadState();loadFailed=false;storageError=false;$('#save-warning').hidden=true;render();}else persist();}
  }catch(error){toast(error.message||'操作未完成，请重试。');}
});
$('#backup-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>4_000_000)throw new Error('备份文件太大');pendingBackup=parseBackup(await file.text());openSheet(`${sheetHeader('恢复这份备份？')}<p class="sheet-note">包含 ${Object.keys(pendingBackup.progress).length} 篇课文进度、${Object.keys(pendingBackup.words).length} 个生词、${pendingBackup.sessions.length} 次学习记录。<br>确认后将整体替换当前进度。</p>${button('export','先导出当前进度','secondary','style="width:100%;margin:12px 0"')}${button('confirm-import','确认恢复备份','primary')}`);}catch(error){pendingBackup=null;toast(error.message);}
});
sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)closeSheet();}});
window.addEventListener('hashchange',()=>{player.stop();shownTranslations=false;shownSummary=false;focusView=false;revealed.clear();render();});
window.addEventListener('pagehide',()=>{savePosition();player.pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){savePosition();if(shadow||loop)player.pause();}});
window.addEventListener('scroll',()=>{if(route().startsWith('learn/')&&state.active)state.active.scrollTop=Math.max(0,window.scrollY);},{passive:true});
try{state=await loadState();}catch(error){loadFailed=true;storageWarning(`${error.message} 当前更改暂不覆盖已有记录，请先导出或恢复备份。`);}
applySettings();render();
initOffline().then(()=>refreshDownloads()).catch(()=>{if(route()==='lessons')toast('离线功能未准备好，可以先在线学习。');});
