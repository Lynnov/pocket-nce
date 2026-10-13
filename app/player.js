export class LessonPlayer {
  constructor(audio, onChange=()=>{}, timers={}) {
    this.audio=audio;this.onChange=onChange;this.generation=0;this.status='idle';
    this.setTimer=timers.setTimer||((...args)=>setTimeout(...args));this.clearTimer=timers.clearTimer||(id=>clearTimeout(id));
    this.setMonitor=timers.setMonitor||((...args)=>setInterval(...args));this.clearMonitor=timers.clearMonitor||(id=>clearInterval(id));
    audio.addEventListener('timeupdate',()=>{this.tick();this.onChange(this.status,this.index);});
    audio.addEventListener('ended',()=>this.boundary());
    audio.addEventListener('error',()=>{this.pause();this.emit('error');});
  }
  emit(status){this.status=status;this.onChange(status,this.index);}
  load(lesson){if(this.lesson!==lesson){const changed=this.lesson?.audio!==lesson.audio;this.stop();this.lesson=lesson;if(changed){this.audio.src=lesson.audio;this.audio.load();}}}
  cancel(){this.generation++;this.clearTimer(this.wait);this.clearMonitor(this.monitor);this.wait=null;this.monitor=null;this.end=null;this.audio.pause();}
  pause(){this.cancel();this.emit('paused');}
  stop(){this.cancel();this.index=null;this.emit('idle');}
  async playSentence(index,{loop=false,shadow=false,rate=1,resumeTime=null}={}) {
    if(this.lesson?.alignmentStatus!=='verified')throw new Error('这课的音频还未完成逐句对齐，可先整篇听读。');
    const sentence=this.lesson.sentences[index];
    if(!sentence || !Number.isFinite(sentence.start)||!Number.isFinite(sentence.end)||sentence.end<=sentence.start)throw new Error('这句音频时间尚未对齐');
    this.cancel();this.index=index;this.mode='sentence';this.options={loop,shadow,rate};
    await this.playRange(resumeTime>=sentence.start&&resumeTime<sentence.end-.15?resumeTime:sentence.start,sentence.end,rate);
  }
  async playAll(rate=1,resumeTime=null) {
    this.cancel();this.mode='all';this.index=null;
    const start=this.lesson.audioStart??0,end=this.lesson.audioEnd??this.lesson.duration;
    await this.playRange(resumeTime>=start&&resumeTime<end?resumeTime:start,end,rate);
  }
  async playRange(start,end,rate) {
    this.end=end;this.audio.playbackRate=rate;this.audio.currentTime=start;
    const generation=this.generation;
    try{await this.audio.play();if(generation!==this.generation)return;this.emit('playing');this.monitor=this.setMonitor(()=>this.tick(),40);}
    catch(error){if(generation===this.generation){this.cancel();this.emit('error');}throw error;}
  }
  tick(){
    if(this.status==='playing'&&this.mode==='all'){
      const index=this.lesson.sentences.findIndex(s=>this.audio.currentTime>=s.start&&this.audio.currentTime<s.end);
      if(index>=0)this.index=index;
    }
    if(this.end!==null&&this.status==='playing'&&this.audio.currentTime>=this.end)this.boundary();
  }
  boundary(){
    if(this.end===null)return;
    this.end=null;this.audio.pause();this.clearMonitor(this.monitor);this.monitor=null;
    const {loop,shadow,rate}=this.options||{};
    if(this.mode==='sentence'&&(loop||shadow)){
      const index=this.index,sentence=this.lesson.sentences[index];
      const next=loop?index:index+1;
      if(next<this.lesson.sentences.length){
        const token=this.generation;
        this.emit(shadow?'shadow':'waiting');
        this.wait=this.setTimer(()=>{if(token===this.generation)this.playSentence(next,this.options).catch(()=>{});},shadow?(sentence.end-sentence.start)/rate*1000:450);
        return;
      }
    }
    this.emit('ended');
  }
}
