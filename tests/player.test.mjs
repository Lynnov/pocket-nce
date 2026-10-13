import test from 'node:test';
import assert from 'node:assert/strict';
import { LessonPlayer } from '../app/player.js';
class AudioStub extends EventTarget {
  currentTime=0; playbackRate=1; paused=true;
  async play(){this.paused=false;}
  pause(){this.paused=true;}
  load(){}
}
const lesson={id:1,audio:'./audio/lesson-1.mp3',alignmentStatus:'verified',audioStart:10,audioEnd:40,sentences:[{start:10,end:15},{start:16,end:22}]};
function setup(){
  const audio=new AudioStub(),timers=new Map();let seq=0;
  const player=new LessonPlayer(audio,()=>{}, {setTimer:(fn)=>{timers.set(++seq,fn);return seq;},clearTimer:id=>timers.delete(id),setMonitor:()=>1,clearMonitor:()=>{}});
  player.load(lesson);return {audio,player,timers};
}
test('single sentence starts at actual start and stops at boundary',async()=>{
 const {audio,player}=setup();await player.playSentence(0);
 assert.equal(audio.currentTime,10);audio.currentTime=15;audio.dispatchEvent(new Event('timeupdate'));
 assert.equal(audio.paused,true);
});
test('manual pause cancels queued shadow playback',async()=>{
 const {audio,player,timers}=setup();await player.playSentence(0,{shadow:true});
 audio.currentTime=15;audio.dispatchEvent(new Event('timeupdate'));assert.equal(timers.size,1);
 player.pause();assert.equal(timers.size,0);
});
test('switching sentences invalidates queued loop callbacks',async()=>{
 const {audio,player,timers}=setup();await player.playSentence(0,{loop:true});
 audio.currentTime=15;audio.dispatchEvent(new Event('timeupdate'));const stale=[...timers.values()][0];
 await player.playSentence(1);stale();assert.equal(audio.currentTime,16);assert.equal(timers.size,0);player.stop();
});
test('unaligned sentences cannot masquerade as real point reading',async()=>{
 const {player}=setup();player.load({...lesson,alignmentStatus:'unverified'});
 await assert.rejects(()=>player.playSentence(0),/对齐/);
});

test('resume keeps position inside a sentence but rejects a position from another sentence',async()=>{
 const {audio,player}=setup();await player.playSentence(0,{resumeTime:12});
 assert.equal(audio.currentTime,12);player.pause();
 await player.playSentence(1,{resumeTime:12});assert.equal(audio.currentTime,16);
});
test('stop clears old sentence selection before a new lesson is rendered',async()=>{
 const {player}=setup();await player.playSentence(1);player.stop();assert.equal(player.index,null);
});
test('whole playback follows sentence and resumes the saved audio position',async()=>{
 const {audio,player}=setup();await player.playAll(1,18);
 assert.equal(audio.currentTime,18);audio.dispatchEvent(new Event('timeupdate'));assert.equal(player.index,1);
 player.stop();
});
